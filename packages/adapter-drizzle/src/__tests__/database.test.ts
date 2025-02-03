import {
    describe,
    expect,
    test,
    beforeAll,
    beforeEach,
    afterEach,
    afterAll,
} from "bun:test";
import { DrizzleDatabaseAdapter } from "../index";
import { elizaLogger, stringToUuid } from "@elizaos/core";
import Docker from "dockerode";
import getPort from "get-port";
import pg from "pg";
import { v4 as uuid } from "uuid";
import { sql } from "drizzle-orm";
import { getEmbeddingForTest } from "@elizaos/core";
import { MemorySeedManager } from "./seed.ts";

const { Client } = pg;

type DatabaseConnection = {
    client: pg.Client;
    adapter: DrizzleDatabaseAdapter;
    docker: Docker;
    container: Docker.Container;
  };

async function createDockerDB(docker: Docker): Promise<string> {
    const port = await getPort({ port: 5432 });
    const image = "pgvector/pgvector:pg16";

    const pullStream = await docker.pull(image);
    await new Promise((resolve, reject) =>
        docker.modem.followProgress(pullStream, (err) =>
            err ? reject(err) : resolve(err)
        )
    );

    const container = await docker.createContainer({
        Image: image,
        Env: [
            "POSTGRES_PASSWORD=postgres",
            "POSTGRES_USER=postgres",
            "POSTGRES_DB=postgres",
        ],
        name: `drizzle-integration-tests-${uuid()}`,
        HostConfig: {
            AutoRemove: true,
            PortBindings: {
                "5432/tcp": [{ HostPort: `${port}` }],
            },
        },
    });

    await container.start();

    return `postgres://postgres:postgres@localhost:${port}/postgres`;
}

async function connectDatabase(): Promise<DatabaseConnection> {
    const docker = new Docker();
    const connectionString = process.env["PG_VECTOR_CONNECTION_STRING"] ?? 
        (await createDockerDB(docker));

    const sleep = 250;
    let timeLeft = 5000;
    let connected = false;
    let lastError: unknown | undefined;
    let client: pg.Client | undefined;
    let container: Docker.Container | undefined;

    // Get the container reference if we created one
    if (!process.env["PG_VECTOR_CONNECTION_STRING"]) {
        const containers = await docker.listContainers();
        container = docker.getContainer(
            containers.find(c => c.Names[0].includes('drizzle-integration-tests'))?.Id!
        );
    }

    do {
        try {
            client = new Client(connectionString);
            await client.connect();
            connected = true;
            break;
        } catch (e) {
            lastError = e;
            await new Promise((resolve) => setTimeout(resolve, sleep));
            timeLeft -= sleep;
        }
    } while (timeLeft > 0);

    if (!connected || !client) {
        elizaLogger.error("Cannot connect to Postgres");
        await client?.end().catch(console.error);
        await container?.stop().catch(console.error);
        throw lastError;
    }

    const adapter = new DrizzleDatabaseAdapter(connectionString);

    return {
        client,
        adapter,
        docker,
        container: container!
    };
}

const parseVectorString = (vectorStr: string): number[] => {
    if (!vectorStr) return [];
    // Remove brackets and split by comma
    return vectorStr.replace(/[[\]]/g, '').split(',').map(Number);
};

async function cleanDatabase(client: pg.Client) {
    try {
        await client.query('DROP TABLE IF EXISTS relationships CASCADE');
        await client.query('DROP TABLE IF EXISTS participants CASCADE');
        await client.query('DROP TABLE IF EXISTS logs CASCADE');
        await client.query('DROP TABLE IF EXISTS goals CASCADE');
        await client.query('DROP TABLE IF EXISTS memories CASCADE');
        await client.query('DROP TABLE IF EXISTS rooms CASCADE');
        await client.query('DROP TABLE IF EXISTS accounts CASCADE');
        await client.query('DROP TABLE IF EXISTS cache CASCADE');
        await client.query('DROP EXTENSION IF EXISTS vector CASCADE');
        await client.query('DROP SCHEMA IF EXISTS extensions CASCADE');
        await client.query("DROP TABLE IF EXISTS __drizzle_migrations");
        elizaLogger.success("Database cleanup completed successfully");
    } catch (error) {
        elizaLogger.error(
            `Database cleanup failed: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        throw error;
    }
}

async function stopContainers(client: pg.Client, docker: Docker) {
    try {
        // First end the client connection
        await client?.end().catch(error => {
            elizaLogger.error(`Failed to close client: ${error instanceof Error ? error.message : "Unknown error"}`);
        });

        // Get all containers with our test prefix
        const containers = await docker.listContainers({
            all: true, // Include stopped containers
            filters: {
                name: ['drizzle-integration-tests']
            }
        });

        // Stop all matching containers
        await Promise.all(
            containers.map(async containerInfo => {
                const container = docker.getContainer(containerInfo.Id);
                try {
                    await container.stop();
                    elizaLogger.success(`Stopped container: ${containerInfo.Id.substring(0, 12)}`);
                } catch (error) {
                    // If container is already stopped, that's fine
                    if (error instanceof Error && !error.message.includes('container already stopped')) {
                        elizaLogger.error(
                            `Failed to stop container ${containerInfo.Id.substring(0, 12)}: ${error.message}`
                        );
                    }
                }
            })
        );
    } catch (error) {
        elizaLogger.error(
            `Container cleanup failed: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        throw error;
    }
}

const initializeDatabase = async (client: pg.Client) => {
    try {
        await client.query(`
            ALTER DATABASE postgres SET app.use_openai_embedding = 'true';
            ALTER DATABASE postgres SET app.use_ollama_embedding = 'false';
        `);

        await client.query("CREATE EXTENSION IF NOT EXISTS vector");

        const { rows: vectorExt } = await client.query(`
            SELECT * FROM pg_extension WHERE extname = 'vector'
        `);
        elizaLogger.info("Vector extension status:", {
            isInstalled: vectorExt.length > 0,
        });

        const { rows: searchPath } = await client.query("SHOW search_path");
        elizaLogger.info("Search path:", {
            searchPath: searchPath[0].search_path,
        });
    } catch (error) {
        elizaLogger.error(
            `Database initialization failed: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        throw error;
    }
};

describe("DrizzleDatabaseAdapter - Vector Extension Validation", () => {
    describe("Schema and Extension Management", () => {
        let adapter: DrizzleDatabaseAdapter;
        let client: pg.Client;
        let docker: Docker;

        beforeEach(async () => {
            ({ client, adapter, docker } = await connectDatabase());
            await initializeDatabase(client);
        });

        afterEach(async () => {
            await stopContainers(client, docker);
        });

        test("should initialize with vector extension", async () => {
            elizaLogger.info("Testing vector extension initialization...");
            try {
                await adapter.init();

                const { rows } = await client.query(`
                    SELECT 1 FROM pg_extension WHERE extname = 'vector'
                `);
                expect(rows.length).toBe(1);
                elizaLogger.success("Vector extension verified successfully");
            } catch (error) {
                elizaLogger.error(
                    `Vector extension test failed: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
                throw error;
            }
        });

        test("should handle missing rooms table", async () => {
            try {
                // First initialize adapter which should create the rooms table
                await adapter.init();

                const id = stringToUuid("test-room");

                // Try creating new room
                await adapter.createRoom(id);

                // Try getting room
                const roomId = await adapter.getRoom(id);
                expect(roomId).toEqual(id);

                elizaLogger.success("Rooms table verified successfully");
            } catch (error) {
                elizaLogger.error(
                    `Rooms table test failed: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
                throw error;
            }
        });

        test("should not reapply schema when everything exists", async () => {
            elizaLogger.info("Testing schema reapplication prevention...");
            try {
                // First initialization
                await adapter.init();

                // Get table count after first initialization
                const { rows: firstCount } = await client.query(`
                    SELECT count(*) FROM information_schema.tables 
                    WHERE table_schema = 'public'
                `);

                // Second initialization
                await adapter.init();

                // Get table count after second initialization
                const { rows: secondCount } = await client.query(`
                    SELECT count(*) FROM information_schema.tables 
                    WHERE table_schema = 'public'
                `);

                // Verify counts are the same
                expect(firstCount[0].count).toEqual(secondCount[0].count);
                elizaLogger.success("Verified schema was not reapplied");
            } catch (error) {
                elizaLogger.error(
                    `Schema reapplication test failed: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
                throw error;
            }
        });
    });
});


describe("Memory Operations with Vector", () => {
    let adapter: DrizzleDatabaseAdapter;
    let client: pg.Client;
    let docker: Docker;

    beforeAll(async () => {
        ({ adapter, client, docker } = await connectDatabase());
        await adapter.init();

        const seedManager = new MemorySeedManager();
        await seedManager.createMemories();

        // Create necessary account and room first
        await adapter.createAccount({
            id: agentId,
            name: "Agent Test",
            username: "agent-test",
            email: "agent-test@test.com",
        });

        await adapter.createRoom(roomId);
        await adapter.addParticipant(agentId, roomId);
    });

    afterAll(async () => {
        await cleanDatabase(client);
        await stopContainers(client, docker);
    });

    test("should create and retrieve memory with vector embedding", async () => {
        const content = "This is a test memory about cats and dogs";
        const dimensions = 384;
        const embedding = await getEmbeddingForTest(content, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: dimensions,
            isOllama: false,
            provider: "OpenAI",
        });

     
        // Create memory
        await adapter.createMemory({
            id: memoryId,
            content: { 
                text: content,
                type: "message" 
            },
            embedding: embedding,
            userId: agentId,
            agentId: agentId,
            roomId: roomId,
            createdAt: Date.now(),
            unique: true
        }, TEST_TABLE);
     
        const memory = await adapter.getMemoryById(memoryId);

        // Verify memory and embedding
        expect(memory).toBeDefined();
        const parsedEmbedding = typeof memory?.embedding === 'string' ? parseVectorString(memory.embedding) : memory?.embedding;
        expect(Array.isArray(parsedEmbedding)).toBe(true);
        expect(parsedEmbedding).toHaveLength(dimensions);
        expect(memory?.content?.text).toEqual(content);
     });

     test("should create and retrieve memory with vector embedding", async () => {
        const testMemoryId = stringToUuid('memory-test-2');
        const content = "The quick brown fox jumps over the lazy dog";
        const dimensions = 384;
        const embedding = await getEmbeddingForTest(content, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: dimensions,
            isOllama: false,
            provider: "OpenAI",
        });
     
        // Create memory
        await adapter.createMemory({
            id: testMemoryId,
            content: { 
                text: content,
                type: "message" 
            },
            embedding: embedding,
            userId: agentId,
            agentId: agentId,
            roomId: roomId,
            createdAt: Date.now(),
            unique: true
        }, TEST_TABLE);
     
        // Search by embedding and verify
        const results = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.8,
            count: 1
        });
     
        expect(results).toHaveLength(1);
        expect(results[0].similarity).toBeGreaterThanOrEqual(0.8);
        expect(results[0].content.text).toBe(content);
        expect(results[0].embedding).toEqual(embedding);
        expect(results[0].roomId).toBe(roomId);
        expect(results[0].agentId).toBe(agentId);
     });

     test("should handle invalid embedding dimensions", async () => {
        const wrongDimensionEmbedding = new Array(100).fill(0.1);
     
        const [{ get_embedding_dimension: embeddingDimension }] = await adapter.db.execute(
            sql`SELECT get_embedding_dimension()`
        );
        
        const memoryWithWrongDimension = {
            id: memoryId,
            content: { 
                text: "This is a test memory with wrong dimensions",
                type: "message" 
            },
            embedding: wrongDimensionEmbedding,
            userId: agentId,
            agentId: agentId,
            roomId: roomId,
            createdAt: Date.now(),
            unique: true
        };
     
        try {
            await adapter.createMemory(memoryWithWrongDimension, TEST_TABLE);
        } catch (error) {
            expect(error).toBeDefined();
            expect((error as Error).message).toBe(`different vector dimensions ${embeddingDimension} and ${wrongDimensionEmbedding.length}`);
        }
     });
});


describe("Advanced Vector Memory Operations", () => {
    // Test data constants
    const TEST_TABLE = 'test_memories';
    const MEMORY_SETS = {
        programming: [
            "JavaScript is a versatile programming language used for web development",
            "Python is known for its simplicity and readability in coding",
            "Java remains popular for enterprise application development",
            "TypeScript adds static typing to JavaScript for better development",
            "React is a popular framework for building user interfaces"
        ],
        science: [
            "Quantum physics explores the behavior of matter at atomic scales",
            "Biology studies the structure and function of living organisms",
            "Chemistry investigates the composition of substances",
            "Astronomy examines celestial bodies and phenomena",
            "Geology focuses on Earth's structure and history"
        ],
        cooking: [
            "Italian cuisine emphasizes fresh ingredients and simple preparation",
            "French cooking techniques form the basis of culinary arts",
            "Asian fusion combines traditional flavors with modern methods",
            "Baking requires precise measurements and temperature control",
            "Mediterranean diet includes olive oil, vegetables, and seafood"
        ]
    };
    const memoryIds = new Map<string, string[]>();

    // Helper function to create memory with embedding
    async function createMemoryWithContent(content: string, category: string): Promise<string> {
        const memoryId = stringToUuid(`memory-${category}-${Date.now()}`);
        const embedding = await getEmbeddingForTest(content, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: 384,
            isOllama: false,
            provider: "OpenAI"
        });

        await adapter.createMemory({
            id: memoryId,
            content: { 
                text: content,
                type: "message" 
            },
            embedding,
            userId: agentId,
            agentId: agentId,
            roomId: roomId,
            createdAt: Date.now(),
            unique: true
        }, TEST_TABLE);

        return memoryId;
    }

    // Setup test environment
    beforeAll(async () => {
        ({ adapter, client, docker } = await connectDatabase());
        await adapter.init();

        // Create test account and room
        await adapter.createAccount({
            id: agentId,
            name: "Agent Test",
            username: "agent-test",
            email: "agent-test@test.com",
        });

        await adapter.createRoom(roomId);
        await adapter.addParticipant(agentId, roomId);

        // Create memories for each category
        for (const [category, contents] of Object.entries(MEMORY_SETS)) {
            const ids = await Promise.all(
                contents.map(content => createMemoryWithContent(content, category))
            );
            memoryIds.set(category, ids);
        }

        elizaLogger.success("Test environment setup completed");
    });

    // Cleanup after tests
    afterAll(async () => {
        await cleanDatabase(client);
        await stopContainers(client, docker);
    });

    test("should find similar memories within same context", async () => {
        const queryContent = "How do programming languages like JavaScript and Python compare?";
        const embedding = await getEmbeddingForTest(queryContent, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: 384,
            isOllama: false,
            provider: "OpenAI"
        });

        const results = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.7,
            count: 3
        });

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].similarity).toBeGreaterThan(0.7);
        expect(results.some(r => r.content.text.includes("JavaScript"))).toBe(true);
        expect(results.some(r => r.content.text.includes("Python"))).toBe(true);
    });

    test("should effectively filter cross-context searches", async () => {
        const queryContent = "What are the best programming frameworks for web development?";
        const embedding = await getEmbeddingForTest(queryContent, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: 384,
            isOllama: false,
            provider: "OpenAI"
        });

        const results = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.75,
            count: 5
        });

        // Should find programming-related memories but not cooking or science
        expect(results.every(r => !r.content.text.toLowerCase().includes("cuisine"))).toBe(true);
        expect(results.every(r => !r.content.text.toLowerCase().includes("physics"))).toBe(true);
    });

    test("should handle threshold-based filtering accurately", async () => {
        const queryContent = "Tell me about web development and user interfaces";
        const embedding = await getEmbeddingForTest(queryContent, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: 384,
            isOllama: false,
            provider: "OpenAI"
        });

        // Test with different thresholds
        const highThresholdResults = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.9,
            count: 5
        });

        const lowThresholdResults = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.6,
            count: 5
        });

        expect(highThresholdResults.length).toBeLessThan(lowThresholdResults.length);
        expect(highThresholdResults.every(r => r.similarity >= 0.9)).toBe(true);
    });

    test("should return paginated results for large-scale searches", async () => {
        const queryContent = "Tell me about science and research";
        const embedding = await getEmbeddingForTest(queryContent, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: 384,
            isOllama: false,
            provider: "OpenAI"
        });

        const firstPage = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.6,
            count: 2
        });

        const secondPage = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.6,
            count: 2,
            offset: 2
        });

        expect(firstPage.length).toBe(2);
        expect(secondPage.length).toBe(2);
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    test("should handle complex multi-context search scenarios", async () => {
        const queryContent = "How does scientific research methodology compare to programming best practices?";
        const embedding = await getEmbeddingForTest(queryContent, {
            model: "text-embedding-3-large",
            endpoint: "https://api.openai.com/v1",
            apiKey: process.env.OPENAI_API_KEY,
            dimensions: 384,
            isOllama: false,
            provider: "OpenAI"
        });

        const results = await adapter.searchMemoriesByEmbedding(embedding, {
            tableName: TEST_TABLE,
            roomId: roomId,
            agentId: agentId,
            match_threshold: 0.65,
            count: 6
        });

        // Should find both programming and science related memories
        const hasScience = results.some(r => 
            r.content.text.toLowerCase().includes("science") || 
            r.content.text.toLowerCase().includes("research")
        );
        const hasProgramming = results.some(r => 
            r.content.text.toLowerCase().includes("programming") || 
            r.content.text.toLowerCase().includes("development")
        );

        expect(hasScience && hasProgramming).toBe(true);
        expect(results.length).toBeGreaterThan(3);
    });
});
