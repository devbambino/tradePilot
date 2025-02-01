import fs from "fs/promises";
import path from "path";
import {
    stringToUuid,
    UUID,
    getEmbeddingForTest,
    Memory,
    EmbeddingOptions,
} from "@elizaos/core";
import { DrizzleDatabaseAdapter } from "..";

interface EmbeddingCacheEntry {
    textHash: string;
    text: string;
    embedding: number[];
    memoryId?: string;
}

interface EmbeddingCache {
    byHash: { [hash: string]: EmbeddingCacheEntry };
    byMemoryId: { [memoryId: string]: string };
}

export const EMBEDDING_OPTIONS: EmbeddingOptions = {
    model: "text-embedding-3-large",
    endpoint: "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    dimensions: 384,
    isOllama: false,
    provider: "OpenAI",
};

export class MemorySeedManager {
    private readonly CACHE_PATH = path.join(__dirname, "embedding-cache.json");
    private cache: EmbeddingCache = {
        byHash: {},
        byMemoryId: {},
    };

    private readonly MEMORY_SETS = {
        programming: [
            "JavaScript is a versatile programming language used for web development",
            "Python is known for its simplicity and readability in coding",
            "Java remains popular for enterprise application development",
            "TypeScript adds static typing to JavaScript for better development",
            "React is a popular framework for building user interfaces",
            "Test-driven development emphasizes writing tests before implementing features",
            "Agile methodology promotes iterative development and continuous feedback",
        ],
        science: [
            "Quantum physics explores the behavior of matter at atomic scales",
            "Biology studies the structure and function of living organisms",
            "Chemistry investigates the composition of substances",
            "Astronomy examines celestial bodies and phenomena",
            "Geology focuses on Earth's structure and history",
            "Scientific research methodology includes observation, hypothesis testing, and data analysis",
            "Experimental research methods rely on controlled variables and reproducible results",
        ],
        cooking: [
            "Italian cuisine emphasizes fresh ingredients and simple preparation",
            "French cooking techniques form the basis of culinary arts",
            "Asian fusion combines traditional flavors with modern methods",
            "Baking requires precise measurements and temperature control",
            "Mediterranean diet includes olive oil, vegetables, and seafood",
            "Molecular gastronomy applies scientific principles to cooking",
            "Kitchen workflow organization improves cooking efficiency",
        ]
    };

    public readonly AGENT_ID: UUID = stringToUuid(`agent-test`);
    public readonly ROOM_ID: UUID = stringToUuid(`room-test`);
    public readonly USER_ID: UUID = stringToUuid(`user-test`);

    constructor() {
        this.loadEmbeddingCache();
    }

    private generateTextHash(text: string): string {
        return stringToUuid(`text-${text.trim().toLowerCase()}`);
    }

    private async loadEmbeddingCache(): Promise<void> {
        try {
            const cacheData = await fs.readFile(this.CACHE_PATH, "utf-8");
            this.cache = JSON.parse(cacheData);
            this.cache.byHash = this.cache.byHash || {};
            this.cache.byMemoryId = this.cache.byMemoryId || {};
        } catch (error) {
            this.cache = { byHash: {}, byMemoryId: {} };
        }
    }

    private async saveEmbeddingCache(): Promise<void> {
        await fs.writeFile(
            this.CACHE_PATH,
            JSON.stringify(this.cache, null, 2)
        );
    }

    private async getEmbeddingWithCache(
        content: string,
        config: EmbeddingOptions
    ): Promise<number[]> {
        const textHash = this.generateTextHash(content);

        if (this.cache.byHash[textHash]) {
            return this.cache.byHash[textHash].embedding;
        }

        const embedding = await getEmbeddingForTest(content, config);

        this.cache.byHash[textHash] = {
            textHash,
            text: content,
            embedding,
        };

        await this.saveEmbeddingCache();
        return embedding;
    }

    private async addMemoryToCache(
        memoryId: string,
        text: string
    ): Promise<void> {
        const textHash = this.generateTextHash(text);
        this.cache.byMemoryId[memoryId] = textHash;
        if (this.cache.byHash[textHash]) {
            this.cache.byHash[textHash].memoryId = memoryId;
        }
        await this.saveEmbeddingCache();
    }

    private async generateMemoryData(
        content: string,
        config: EmbeddingOptions
    ): Promise<Memory> {
        const contentHash = this.generateTextHash(content);
        const memoryId = stringToUuid(`memory-test-${contentHash}`);

        const embedding = await this.getEmbeddingWithCache(content, config);
        await this.addMemoryToCache(memoryId, content);

        return {
            id: memoryId,
            content: {
                text: content,
                type: "message",
            },
            embedding,
            userId: this.USER_ID,
            agentId: this.AGENT_ID,
            roomId: this.ROOM_ID,
        };
    }

    public getEmbeddingByMemoryId(memoryId: string): number[] | null {
        const textHash = this.cache.byMemoryId[memoryId];
        if (textHash && this.cache.byHash[textHash]) {
            return this.cache.byHash[textHash].embedding;
        }
        return null;
    }

    public getTextByMemoryId(memoryId: string): string | null {
        const textHash = this.cache.byMemoryId[memoryId];
        if (textHash && this.cache.byHash[textHash]) {
            return this.cache.byHash[textHash].text;
        }
        return null;
    }

    public getEmbeddingByText(text: string): number[] | null {
        const textHash = this.generateTextHash(text);
        if (this.cache.byHash[textHash]) {
            return this.cache.byHash[textHash].embedding;
        }
        return null;
    }

    public async createMemories(
        adapter: DrizzleDatabaseAdapter,
        tableName: string,
    ): Promise<Map<string, UUID[]>> {
        const memoryIds = new Map<string, UUID[]>();

        for (const [category, contents] of Object.entries(this.MEMORY_SETS)) {
            const categoryMemories: UUID[] = [];

            for (const content of contents) {
                const memoryData = await this.generateMemoryData(
                    content,
                    EMBEDDING_OPTIONS
                );
                await adapter.createMemory(memoryData, tableName);
                categoryMemories.push(memoryData.id as UUID);
            }

            memoryIds.set(category, categoryMemories);
        }

        return memoryIds;
    }

    public getCacheStats(): {
        totalEntries: number;
        memoryIdsMapped: number;
        cacheSize: number;
    } {
        return {
            totalEntries: Object.keys(this.cache.byHash).length,
            memoryIdsMapped: Object.keys(this.cache.byMemoryId).length,
            cacheSize: JSON.stringify(this.cache).length,
        };
    }

    public async clearCache(): Promise<void> {
        this.cache = { byHash: {}, byMemoryId: {} };
        await this.saveEmbeddingCache();
    }
}
