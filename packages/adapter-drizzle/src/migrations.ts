import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { elizaLogger } from "@elizaos/core";

export async function runMigrations(pgPool: Pool): Promise<void> {
    try {
        const db = drizzle(pgPool);
        await migrate(db, {
            migrationsFolder: path.resolve(__dirname, "../drizzle/migrations"),
        });
        elizaLogger.info("Migrations completed successfully!");
    } catch (error) {
        elizaLogger.error("Failed to run database migrations:", error);
        throw error;
    }
}
