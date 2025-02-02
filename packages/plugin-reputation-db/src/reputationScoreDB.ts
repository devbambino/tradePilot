import { Pool } from "pg";
import { Database } from "better-sqlite3";
import { ScoreProvider } from "./adapters/scoreProvider";
import { v4 as uuidv4 } from "uuid";

export class ReputationDB {
    private pool: Pool | null = null;
    private sqliteDb: Database | null = null;
    public adapters: Map<string, ScoreProvider> = new Map();

    constructor(connectionString?: string, providers: { [key: string]: ScoreProvider } = {}) {
        if (connectionString) {
            this.pool = new Pool({ connectionString });
        } else {
            const sqlite3 = require("better-sqlite3");
            this.sqliteDb = new sqlite3("reputation.db");
            this.initializeSqliteSchema();
        }

        // Register adapters
        Object.entries(providers).forEach(([key, adapter]) => {
            this.adapters.set(key, adapter);
        });
    }

    private initializeSqliteSchema() {
        if (!this.sqliteDb) return;
        this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS scores (
            id TEXT PRIMARY KEY,
            identifier TEXT NOT NULL,
            provider TEXT NOT NULL,
            score REAL NOT NULL,
            last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(identifier, provider)
        );
    `);
    }

    public async query(sql: string, params: any[] = []) {
        if (this.pool) {
            return this.pool.query(sql, params);
        } else if (this.sqliteDb) {
            const stmt = this.sqliteDb.prepare(sql);
            if (sql.trim().toLowerCase().startsWith("select")) {
                return { rows: stmt.all(params) };
            } else {
                stmt.run(params);
                return { rows: [] };
            }
        }
        throw new Error("No database connection available");
    }

    async getScore(provider: string, identifier: string, refresh = false): Promise<number> {
        if (!this.adapters.has(provider)) {
            throw new Error(`Provider ${provider} not registered`);
        }
        if (!refresh) {
            console.log('getScore step 3')

            const result = await this.query(
                `SELECT score FROM scores WHERE identifier = $1 AND provider = $2`,
                [identifier, provider]
            );

            console.log('getScore step 4',result)

            if (result.rows.length > 0) {
                return result.rows[0].score; // ✅ Use cached score if available
            }
        }

        // If refresh is true or score is not found, fetch from adapter
        const adapter = this.adapters.get(provider)!;
        const score = await adapter.getScore(identifier, refresh);

        const id = require("uuid").v4();


        await this.query(
            `
                    INSERT INTO scores (identifier, provider, score, last_updated)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (identifier, provider) DO UPDATE
                    SET score = EXCLUDED.score, last_updated = CURRENT_TIMESTAMP`,
            [identifier, provider, score]
        );
        return score;
    }

    /**
     * Refresh scores for a specific user across multiple providers.
     */
    async refreshScoresForUser(providers: string[], user: { twitterHandle?: string; walletAddress?: string }) {
        for (const provider of providers) {
            let identifier: string | undefined;

            if (provider === "twitter" && user.twitterHandle) {
                identifier = user.twitterHandle;
            } else if (provider === "givPower" && user.walletAddress) {
                identifier = user.walletAddress;
            }

            if (identifier) {
                await this.getScore(provider, identifier, true);
            }
        }
    }



    /**
     * Close DB connection.
     */
    async closeConnection() {
        if (this.pool) {
            await this.pool.end();
        }
        if (this.sqliteDb) {
            this.sqliteDb.close();
        }
    }
}
