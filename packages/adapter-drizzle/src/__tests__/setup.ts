import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { config } from "dotenv";

// Load test environment variables
config({ path: ".env.test" });

import { DrizzleDatabaseAdapter } from "../index";
import { getEmbeddingConfig, getEmbeddingForTest } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { sql } from "drizzle-orm";
import { v4 as uuid } from 'uuid';

let drizzleAdapter: DrizzleDatabaseAdapter;
let userId: UUID;
let agentId: UUID;
let roomId: UUID;

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || " ";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || " ";

// beforeAll(async () => {
//     drizzleAdapter = new DrizzleDatabaseAdapter(TEST_DATABASE_URL);
    
//     await drizzleAdapter.init();

//     // Create test users
//     userId = uuid() as UUID;
//     agentId = uuid() as UUID;
//     roomId = uuid() as UUID;

//     // Create user account
//     await drizzleAdapter.createAccount({
//         id: userId,
//         name: "test-user",
//         username: "test-user",
//         email: "test@test.com"
//     });

//     // Create agent account  
//     await drizzleAdapter.createAccount({
//         id: agentId,
//         name: "test-agent",
//         username: "test-agent",
//         email: "agent@test.com"
//     });

//     // Create test room
//     await drizzleAdapter.createRoom(roomId);
// });

// beforeEach(async () => {
//     // Clear any test data before each test
//     await drizzleAdapter.db.execute(sql`DELETE FROM memories WHERE TRUE`);
//     await drizzleAdapter.db.execute(sql`DELETE FROM knowledge WHERE TRUE`);
// });

// afterAll(async () => {
//     await drizzleAdapter.close();
// });

// // Helper function to generate test embedding
// const generateTestEmbedding = async (text: string) => {
//     const embeddingConfig = getEmbeddingConfig();
//     return await getEmbeddingForTest(text, {
//         model: 'text-embedding-3-large',
//         endpoint: 'https://api.openai.com/v1', 
//         apiKey: process.env.OPENAI_API_KEY!,
//         dimensions: embeddingConfig.dimensions,
//         isOllama: false,
//         provider: 'OpenAI'
//     });
// }

export {
    drizzleAdapter,
    userId,
    agentId,
    roomId,
    generateTestEmbedding
};