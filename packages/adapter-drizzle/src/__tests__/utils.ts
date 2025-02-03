import { DrizzleDatabaseAdapter } from "../index";
import { elizaLogger } from "@elizaos/core";
import Docker from "dockerode";
import getPort from "get-port";
import pg from "pg";
import { v4 as uuid } from "uuid";

const { Client } = pg;

export type DatabaseConnection = {
    client: pg.Client;
    adapter: DrizzleDatabaseAdapter;
    docker: Docker;
    container: Docker.Container;
};

export async function createDockerDB(docker: Docker): Promise<string> {
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

export async function connectDatabase(): Promise<DatabaseConnection> {
    const docker = new Docker();
    const connectionString =
        process.env["PG_VECTOR_CONNECTION_STRING"] ??
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
            containers.find((c) =>
                c.Names[0].includes("drizzle-integration-tests")
            )?.Id!
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
        container: container!,
    };
}

export const parseVectorString = (vectorStr: string): number[] => {
    if (!vectorStr) return [];
    // Remove brackets and split by comma
    return vectorStr.replace(/[[\]]/g, "").split(",").map(Number);
};

export async function cleanDatabase(client: pg.Client) {
    try {
        await client.query("DROP TABLE IF EXISTS relationships CASCADE");
        await client.query("DROP TABLE IF EXISTS participants CASCADE");
        await client.query("DROP TABLE IF EXISTS logs CASCADE");
        await client.query("DROP TABLE IF EXISTS goals CASCADE");
        await client.query("DROP TABLE IF EXISTS memories CASCADE");
        await client.query("DROP TABLE IF EXISTS rooms CASCADE");
        await client.query("DROP TABLE IF EXISTS accounts CASCADE");
        await client.query("DROP TABLE IF EXISTS cache CASCADE");
        await client.query("DROP EXTENSION IF EXISTS vector CASCADE");
        await client.query("DROP SCHEMA IF EXISTS extensions CASCADE");
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

export async function stopContainers(client: pg.Client, docker: Docker) {
    try {
        // First, terminate all existing connections except our current one
        await client.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid()
            AND datname = current_database()
        `);

        // Wait a bit for connections to terminate
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Now end our client connection
        await client.end();

        // Get all containers with our test prefix
        const containers = await docker.listContainers({
            all: true,
            filters: {
                name: ["drizzle-integration-tests"],
            },
        });

        // Stop all matching containers
        await Promise.all(
            containers.map(async (containerInfo) => {
                const container = docker.getContainer(containerInfo.Id);
                try {
                    // Force stop to ensure it terminates
                    await container.stop({ t: 5 });
                    elizaLogger.success(
                        `Stopped container: ${containerInfo.Id.substring(
                            0,
                            12
                        )}`
                    );
                } catch (error) {
                    if (
                        error instanceof Error &&
                        !error.message.includes("container already stopped")
                    ) {
                        elizaLogger.error(
                            `Failed to stop container ${containerInfo.Id.substring(
                                0,
                                12
                            )}: ${error.message}`
                        );
                    }
                }
            })
        );

        // Wait for containers to fully stop
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
        elizaLogger.error(
            `Container cleanup failed: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
        throw error;
    }
}

export const initializeDatabase = async (client: pg.Client) => {
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