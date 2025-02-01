import {
    describe,
    expect,
    test,
    beforeEach,
    afterEach,
} from "bun:test";
import { DrizzleDatabaseAdapter } from "../index";
import { elizaLogger, stringToUuid } from "@elizaos/core";
import Docker from "dockerode";
import pg from "pg";
import {
    connectDatabase,
    initializeDatabase,
    cleanDatabase,
    stopContainers,
} from "./utils.ts";

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
            await cleanDatabase(client);
            // Wait for cleanup to complete
            await new Promise((resolve) => setTimeout(resolve, 500));
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
