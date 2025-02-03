import {
    type Account,
    type Actor,
    DatabaseAdapter,
    EmbeddingProvider,
    type GoalStatus,
    type Participant,
    type RAGKnowledgeItem,
    elizaLogger,
    getEmbeddingConfig,
    type Goal,
    type IDatabaseCacheAdapter,
    type Memory,
    type Relationship,
    type UUID,
} from "@elizaos/core";
import { and, eq, gte, lte, sql, desc, inArray, or, cosineDistance, gt } from "drizzle-orm";
import {
    accounts,
    goals,
    logs,
    memories,
    participants,
    relationships,
    rooms,
    knowledges,
    caches,
} from "./schema";
import { drizzle, BunSQLDatabase } from "drizzle-orm/bun-sql";
import { v4 as uuid } from "uuid";
import { runMigrations } from "./migrations";
import { Pool } from "pg";

export class DrizzleDatabaseAdapter
    extends DatabaseAdapter<BunSQLDatabase>
    implements IDatabaseCacheAdapter
{
    private databaseUrl: string;
    constructor(
        databaseUrl: string,
        circuitBreakerConfig?: {
            failureThreshold?: number;
            resetTimeout?: number;
            halfOpenMaxAttempts?: number;
        }
    ) {
        super({
            failureThreshold: circuitBreakerConfig?.failureThreshold ?? 5,
            resetTimeout: circuitBreakerConfig?.resetTimeout ?? 60000,
            halfOpenMaxAttempts: circuitBreakerConfig?.halfOpenMaxAttempts ?? 3,
        });

        this.databaseUrl = databaseUrl;
        this.db = drizzle(databaseUrl);
    }

    async init(): Promise<void> {
        try {
            elizaLogger.info("init () STARTING");
            const embeddingConfig = getEmbeddingConfig();
            elizaLogger.info("init () EMBEDDING CONFIG", embeddingConfig);
            if (embeddingConfig.provider === EmbeddingProvider.OpenAI) {
                await this.db.execute(sql`SET app.use_openai_embedding = 'true'`);
                await this.db.execute(sql`SET app.use_ollama_embedding = 'false'`);
                await this.db.execute(sql`SET app.use_gaianet_embedding = 'false'`);
            } else if (embeddingConfig.provider === EmbeddingProvider.Ollama) {
                await this.db.execute(sql`SET app.use_openai_embedding = 'false'`);
                await this.db.execute(sql`SET app.use_ollama_embedding = 'true'`);
                await this.db.execute(sql`SET app.use_gaianet_embedding = 'false'`);
            } else if (embeddingConfig.provider === EmbeddingProvider.GaiaNet) {
                await this.db.execute(sql`SET app.use_openai_embedding = 'false'`);
                await this.db.execute(sql`SET app.use_ollama_embedding = 'false'`);
                await this.db.execute(sql`SET app.use_gaianet_embedding = 'true'`);
            } else {
                await this.db.execute(sql`SET app.use_openai_embedding = 'false'`);
                await this.db.execute(sql`SET app.use_ollama_embedding = 'false'`);
                await this.db.execute(sql`SET app.use_gaianet_embedding = 'false'`);
            }

            const exists: boolean = await this.checkTable();

            elizaLogger.info("####### exists", exists);

            if (!exists || !(await this.validateVectorSetup())) {
                elizaLogger.info("####### running migrations");
                const pool = new Pool({
                    connectionString: this.databaseUrl,
                });
                await runMigrations(pool);
            }
        } catch (error) {
            elizaLogger.error("Failed to initialize database:", error);
            throw error;
        }
    }

    private async checkTable(): Promise<boolean> {
        try {
            const result = await this.db.execute<{
                to_regclass: string | null;
            }>(sql`
                SELECT to_regclass('public.rooms') as to_regclass
            `);
            return Boolean(result[0]?.to_regclass);
        } catch (error) {
            elizaLogger.error("### checkTable() error ###", error);
            return false;
        }
    }

    private async validateVectorSetup(): Promise<boolean> {
        try {
            const vectorExt = await this.db.execute(sql`
                SELECT * FROM pg_extension WHERE extname = 'vector'
            `);
            
            const hasVector = vectorExt?.length > 0;
            
            if (!hasVector) {
                elizaLogger.warn("Vector extension not found");
                return false;
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error validating vector setup:", error);
            return false;
        }
    }

    async close(): Promise<void> {
        try {
            // For Bun SQL we just need to close the main connection
            if (this.db && (this.db as any).client) {
                await (this.db as any).client.close();
            }
        } catch (error) {
            elizaLogger.error("Failed to close database connection:", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    async getAccountById(userId: UUID): Promise<Account | null> {
        try {
            const result = await this.db
                .select()
                .from(accounts)
                .where(eq(accounts.id, userId))
                .limit(1);

            if (result.length === 0) return null;

            const account = result[0];

            return {
                id: account.id as UUID,
                name: account.name ?? "",
                username: account.username ?? "",
                email: account.email ?? "",
                avatarUrl: account.avatarUrl ?? "",
                details: account.details ?? {},
            };
        } catch (error) {
            elizaLogger.error("Failed to get account by ID:", {
                error: error instanceof Error ? error.message : String(error),
                userId,
            });
            throw error;
        }
    }

    async createAccount(account: Account): Promise<boolean> {
        try {
            const accountId = account.id ?? uuid();

            await this.db.insert(accounts).values({
                id: accountId,
                name: account.name ?? null,
                username: account.username ?? null,
                email: account.email ?? "",
                avatarUrl: account.avatarUrl ?? null,
                details: account.details ?? {},
            });

            elizaLogger.debug("Account created successfully:", {
                accountId,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error creating account:", {
                error: error instanceof Error ? error.message : String(error),
                accountId: account.id,
            });
            return false;
        }
    }

    async getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId?: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]> {
        if (!params.tableName) throw new Error("tableName is required");
        if (!params.roomId) throw new Error("roomId is required");

        try {
            const conditions = [
                eq(memories.type, params.tableName),
                eq(memories.roomId, params.roomId),
            ];

            if (params.start) {
                conditions.push(
                    gte(memories.createdAt, new Date(params.start))
                );
            }

            if (params.end) {
                conditions.push(lte(memories.createdAt, new Date(params.end)));
            }

            if (params.unique) {
                conditions.push(eq(memories.unique, true));
            }

            if (params.agentId) {
                conditions.push(eq(memories.agentId, params.agentId));
            }

            const query = this.db
                .select()
                .from(memories)
                .where(and(...conditions))
                .orderBy(desc(memories.createdAt));

            const rows = params.count
                ? await query.limit(params.count)
                : await query;

            elizaLogger.debug("Fetching memories:", {
                roomId: params.roomId,
                tableName: params.tableName,
                unique: params.unique,
                agentId: params.agentId,
                timeRange:
                    params.start || params.end
                        ? {
                              start: params.start
                                  ? new Date(params.start).toISOString()
                                  : undefined,
                              end: params.end
                                  ? new Date(params.end).toISOString()
                                  : undefined,
                          }
                        : undefined,
                limit: params.count,
            });

            return rows.map((row) => ({
                id: row.id as UUID,
                type: row.type,
                createdAt: row.createdAt ? row.createdAt.getTime() : Date.now(),
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                embedding: row.embedding ?? undefined,
                userId: row.userId as UUID,
                agentId: row.agentId as UUID,
                roomId: row.roomId as UUID,
                unique: row.unique,
            }));
        } catch (error) {
            elizaLogger.error("Failed to fetch memories:", {
                error: error instanceof Error ? error.message : String(error),
                params,
            });
            throw error;
        }
    }

    async getMemoriesByRoomIds(params: {
        roomIds: UUID[];
        agentId?: UUID;
        tableName: string;
        limit?: number;
    }): Promise<Memory[]> {
        try {
            if (params.roomIds.length === 0) return [];

            const conditions = [
                eq(memories.type, params.tableName),
                inArray(memories.roomId, params.roomIds),
            ];

            if (params.agentId) {
                conditions.push(eq(memories.agentId, params.agentId));
            }

            const query = this.db
                .select()
                .from(memories)
                .where(and(...conditions))
                .orderBy(desc(memories.createdAt));

            const rows = params.limit
                ? await query.limit(params.limit)
                : await query;

            return rows.map((row) => ({
                id: row.id as UUID,
                createdAt: row.createdAt ? row.createdAt.getTime() : Date.now(),
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                embedding: row.embedding,
                userId: row.userId as UUID,
                agentId: row.agentId as UUID,
                roomId: row.roomId as UUID,
                unique: row.unique,
            })) as Memory[];
        } catch (error) {
            elizaLogger.error("Error in getMemoriesByRoomIds:", {
                error: error instanceof Error ? error.message : String(error),
                roomIds: params.roomIds,
                tableName: params.tableName,
            });
            throw error;
        }
    }

    async getMemoryById(id: UUID): Promise<Memory | null> {
        try {
            const result = await this.db
                .select()
                .from(memories)
                .where(eq(memories.id, id))
                .limit(1);

            if (result.length === 0) return null;

            const row = result[0];
            return {
                id: row.id as UUID,
                createdAt: row.createdAt ? row.createdAt.getTime() : Date.now(),
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                embedding: row.embedding ?? undefined,
                userId: row.userId as UUID,
                agentId: row.agentId as UUID,
                roomId: row.roomId as UUID,
                unique: row.unique,
            };
        } catch (error) {
            elizaLogger.error("Error in getMemoryById:", error);
            throw error;
        }
    }

    async getMemoriesByIds(
        memoryIds: UUID[],
        tableName?: string
    ): Promise<Memory[]> {
        if (memoryIds.length === 0) return [];

        try {
            const conditions = [inArray(memories.id, memoryIds)];

            if (tableName) {
                conditions.push(eq(memories.type, tableName));
            }

            const rows = await this.db
                .select()
                .from(memories)
                .where(and(...conditions))
                .orderBy(desc(memories.createdAt));

            return rows.map((row) => ({
                id: row.id as UUID,
                createdAt: row.createdAt ? row.createdAt.getTime() : Date.now(),
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                embedding: row.embedding ?? undefined,
                userId: row.userId as UUID,
                agentId: row.agentId as UUID,
                roomId: row.roomId as UUID,
                unique: row.unique,
            }));
        } catch (error) {
            elizaLogger.error("Failed to fetch memories by IDs:", {
                error: error instanceof Error ? error.message : String(error),
                memoryIds,
                tableName,
            });
            throw error;
        }
    }

    async getCachedEmbeddings(params: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
        try {
            const results = await this.db.execute<{
                embedding: number[];
                levenshtein_score: number;
            }>(sql`
                WITH content_text AS (
                    SELECT 
                        embedding,
                        content#>>'{text}' as content_text
                    FROM memories 
                    WHERE type = ${params.query_table_name}
                )
                SELECT 
                    embedding,
                    levenshtein(${params.query_input}, content_text) as levenshtein_score
                FROM content_text
                WHERE content_text IS NOT NULL
                AND levenshtein(${params.query_input}, content_text) <= ${params.query_threshold}
                ORDER BY levenshtein_score
                LIMIT ${params.query_match_count}
            `);
    
            return results
                .map(row => ({
                    embedding: Array.isArray(row.embedding) ? row.embedding : 
                             typeof row.embedding === 'string' ? JSON.parse(row.embedding) : [],
                    levenshtein_score: Number(row.levenshtein_score)
                }))
                .filter(row => Array.isArray(row.embedding));
        } catch (error) {
            elizaLogger.error("Error in getCachedEmbeddings:", error);
            throw error;
        }
    }

    async log(params: {
        body: { [key: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void> {
        try {
            const logId = uuid();

            elizaLogger.debug("Creating log entry:", {
                logId,
                type: params.type,
                roomId: params.roomId,
                userId: params.userId,
                bodyKeys: Object.keys(params.body),
            });

            await this.db.insert(logs).values({
                body: params.body,
                userId: params.userId,
                roomId: params.roomId,
                type: params.type,
            });
        } catch (error) {
            elizaLogger.error("Failed to create log entry:", {
                error: error instanceof Error ? error.message : String(error),
                type: params.type,
                roomId: params.roomId,
                userId: params.userId,
            });
            throw error;
        }
    }

    async getActorDetails(params: { roomId: UUID }): Promise<Actor[]> {
        if (!params.roomId) {
            throw new Error("roomId is required");
        }

        try {
            const result = await this.db
                .select({
                    id: accounts.id,
                    name: accounts.name,
                    username: accounts.username,
                    details: accounts.details,
                })
                .from(participants)
                .leftJoin(accounts, eq(participants.userId, accounts.id))
                .where(eq(participants.roomId, params.roomId))
                .orderBy(accounts.name);

            elizaLogger.debug("Retrieved actor details:", {
                roomId: params.roomId,
                actorCount: result.length,
            });

            return result.map((row) => {
                try {
                    const details =
                        typeof row.details === "string"
                            ? JSON.parse(row.details)
                            : row.details || {};

                    return {
                        id: row.id as UUID,
                        name: row.name ?? "",
                        username: row.username ?? "",
                        details: {
                            tagline: details.tagline ?? "",
                            summary: details.summary ?? "",
                            quote: details.quote ?? "",
                        },
                    };
                } catch (error) {
                    elizaLogger.warn("Failed to parse actor details:", {
                        actorId: row.id,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });

                    return {
                        id: row.id as UUID,
                        name: row.name ?? "",
                        username: row.username ?? "",
                        details: {
                            tagline: "",
                            summary: "",
                            quote: "",
                        },
                    };
                }
            });
        } catch (error) {
            elizaLogger.error("Failed to fetch actor details:", {
                roomId: params.roomId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    async searchMemories(params: {
        tableName: string;
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]> {
        try {
            return await this.searchMemoriesByEmbedding(params.embedding, {
                match_threshold: params.match_threshold,
                count: params.match_count,
                agentId: params.agentId,
                roomId: params.roomId,
                unique: params.unique,
                tableName: params.tableName,
            });
        } catch (error) {
            elizaLogger.error("Failed to search memories:", {
                error: error instanceof Error ? error.message : String(error),
                tableName: params.tableName,
                agentId: params.agentId,
                roomId: params.roomId,
            });
            throw error;
        }
    }

    async updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void> {
        try {
            await this.db
                .update(goals)
                .set({ status: params.status })
                .where(eq(goals.id, params.goalId));

            elizaLogger.debug("Updated goal status:", {
                goalId: params.goalId,
                newStatus: params.status,
            });
        } catch (error) {
            elizaLogger.error("Failed to update goal status:", {
                error: error instanceof Error ? error.message : String(error),
                goalId: params.goalId,
                status: params.status,
            });
            throw error;
        }
    }

    async searchMemoriesByEmbedding(
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            roomId?: UUID;
            agentId?: UUID;
            unique?: boolean;
            tableName: string;
        }
    ): Promise<Memory[]> {
        try {
            // Ensure vector is properly formatted
            const cleanVector = embedding.map((n) => {
                if (!Number.isFinite(n)) return 0;
                // Limit precision to avoid floating point issues
                return Number(n.toFixed(6));
            });

            const similarity = sql<number>`1 - (${cosineDistance(memories.embedding, cleanVector)})`;
            
            const conditions = [eq(memories.type, params.tableName)];
    
            if (params.unique) {
                conditions.push(eq(memories.unique, true));
            }
            if (params.agentId) {
                conditions.push(eq(memories.agentId, params.agentId));
            }
            if (params.roomId) {
                conditions.push(eq(memories.roomId, params.roomId));
            }
    
            if (params.match_threshold) {
                conditions.push(gte(similarity, params.match_threshold));
            }
    
            const results = await this.db
                .select({
                    id: memories.id,
                    type: memories.type,
                    createdAt: memories.createdAt,
                    content: memories.content,
                    embedding: memories.embedding,
                    userId: memories.userId,
                    agentId: memories.agentId,
                    roomId: memories.roomId,
                    unique: memories.unique,
                    similarity: similarity,
                })
                .from(memories)
                .where(and(...conditions))
                .orderBy(desc(similarity))
                .limit(params.count ?? 10);
    
            return results.map(row => ({
                id: row.id as UUID,
                type: row.type,
                createdAt: row.createdAt ? row.createdAt.getTime() : Date.now(),
                content: typeof row.content === "string" 
                    ? JSON.parse(row.content) 
                    : row.content,
                embedding: row.embedding ?? undefined,
                userId: row.userId as UUID,
                agentId: row.agentId as UUID,
                roomId: row.roomId as UUID,
                unique: row.unique,
                similarity: row.similarity,
            }));
        } catch (error) {
            elizaLogger.error("Failed to search memories by embedding:", {
                error: error instanceof Error ? error.message : String(error),
                vectorLength: embedding.length,
                tableName: params.tableName,
                roomId: params.roomId,
                agentId: params.agentId,
            });
            throw error;
        }
    }

    async createMemory(
        memory: Memory,
        tableName: string,
        unique?: boolean
    ): Promise<void> {
        try {
            elizaLogger.info("DrizzleAdapter createMemory:", {
                memoryId: memory.id,
                embeddingLength: memory.embedding?.length,
                contentLength: memory.content?.text?.length,
            });

            let isUnique = true;
            if (memory.embedding) {
                elizaLogger.info("Searching for similar memories:");
                const similarMemories = await this.searchMemoriesByEmbedding(
                    memory.embedding,
                    {
                        tableName,
                        roomId: memory.roomId,
                        match_threshold: 0.95,
                        count: 1,
                    }
                );
                isUnique = similarMemories.length === 0;
            }

            elizaLogger.info("Inserting memory:");

            await this.db.insert(memories).values([
                {
                    id: memory.id ?? uuid(),
                    type: tableName,
                    content: memory.content as any,
                    embedding: memory.embedding,
                    userId: memory.userId,
                    roomId: memory.roomId,
                    agentId: memory.agentId,
                    unique: memory.unique ?? isUnique,
                    createdAt: memory.createdAt
                        ? new Date(memory.createdAt)
                        : new Date(),
                },
            ]);
        } catch (error) {
            elizaLogger.debug("$$$$$errrrrror:", error);
            elizaLogger.error("Failed to create memory:", {
                error: error instanceof Error ? error.message : String(error),
                memoryId: memory.id,
                tableName,
                roomId: memory.roomId,
            });
            throw error;
        }
    }

    async removeMemory(memoryId: UUID, tableName: string): Promise<void> {
        try {
            await this.db
                .delete(memories)
                .where(
                    and(eq(memories.id, memoryId), eq(memories.type, tableName))
                );

            elizaLogger.debug("Memory removed successfully:", {
                memoryId,
                tableName,
            });
        } catch (error) {
            elizaLogger.info("ERROR?????????????", error);
            elizaLogger.error("Failed to remove memory:", {
                error: error instanceof Error ? error.message : String(error),
                memoryId,
                tableName,
            });
            throw error;
        }
    }

    async removeAllMemories(roomId: UUID, tableName: string): Promise<void> {
        try {
            await this.db
                .delete(memories)
                .where(
                    and(
                        eq(memories.roomId, roomId),
                        eq(memories.type, tableName)
                    )
                );

            elizaLogger.debug("All memories removed successfully:", {
                roomId,
                tableName,
            });
        } catch (error) {
            elizaLogger.error("Failed to remove all memories:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
                tableName,
            });
            throw error;
        }
    }

    async countMemories(
        roomId: UUID,
        unique = true,
        tableName = ""
    ): Promise<number> {
        if (!tableName) throw new Error("tableName is required");

        try {
            const conditions = [
                eq(memories.roomId, roomId),
                eq(memories.type, tableName),
            ];

            if (unique) {
                conditions.push(eq(memories.unique, true));
            }

            const result = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(memories)
                .where(and(...conditions));

            return Number(result[0]?.count ?? 0);
        } catch (error) {
            elizaLogger.error("Failed to count memories:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
                tableName,
                unique,
            });
            throw error;
        }
    }

    async getGoals(params: {
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]> {
        try {
            const conditions = [eq(goals.roomId, params.roomId)];

            if (params.userId) {
                conditions.push(eq(goals.userId, params.userId));
            }

            if (params.onlyInProgress) {
                conditions.push(eq(goals.status, "IN_PROGRESS" as GoalStatus));
            }

            const query = this.db
                .select()
                .from(goals)
                .where(and(...conditions))
                .orderBy(desc(goals.createdAt));

            const result = await (params.count
                ? query.limit(params.count)
                : query);

            return result.map((row) => ({
                id: row.id as UUID,
                roomId: row.roomId as UUID,
                userId: row.userId as UUID,
                name: row.name ?? "",
                status: (row.status ?? "NOT_STARTED") as GoalStatus,
                description: row.description ?? "",
                objectives: row.objectives as any[],
                createdAt: row.createdAt?.getTime() ?? Date.now(),
            }));
        } catch (error) {
            elizaLogger.error("Failed to get goals:", {
                error: error instanceof Error ? error.message : String(error),
                roomId: params.roomId,
                userId: params.userId,
                onlyInProgress: params.onlyInProgress,
            });
            throw error;
        }
    }

    async updateGoal(goal: Goal): Promise<void> {
        try {
            await this.db
                .update(goals)
                .set({
                    name: goal.name,
                    status: goal.status,
                    objectives: goal.objectives,
                })
                .where(eq(goals.id, goal.id as string));
        } catch (error) {
            elizaLogger.error("Failed to update goal:", {
                error: error instanceof Error ? error.message : String(error),
                goalId: goal.id,
                status: goal.status,
            });
            throw error;
        }
    }

    async createGoal(goal: Goal): Promise<void> {
        try {
            await this.db.insert(goals).values({
                id: goal.id ?? uuid(),
                roomId: goal.roomId,
                userId: goal.userId,
                name: goal.name,
                status: goal.status,
                objectives: goal.objectives,
            });
        } catch (error) {
            elizaLogger.error("Failed to create goal:", {
                error: error instanceof Error ? error.message : String(error),
                goalId: goal.id,
            });
            throw error;
        }
    }

    async removeGoal(goalId: UUID): Promise<void> {
        if (!goalId) throw new Error("Goal ID is required");

        try {
            await this.db.delete(goals).where(eq(goals.id, goalId));

            elizaLogger.debug("Goal removal attempt:", {
                goalId,
                removed: true,
            });
        } catch (error) {
            elizaLogger.error("Failed to remove goal:", {
                error: error instanceof Error ? error.message : String(error),
                goalId,
            });
            throw error;
        }
    }

    async removeAllGoals(roomId: UUID): Promise<void> {
        try {
            await this.db.delete(goals).where(eq(goals.roomId, roomId));
        } catch (error) {
            elizaLogger.error("Failed to remove all goals:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
            });
            throw error;
        }
    }

    async getRoom(roomId: UUID): Promise<UUID | null> {
        try {
            const result = await this.db
                .select({
                    id: rooms.id,
                })
                .from(rooms)
                .where(eq(rooms.id, roomId))
                .limit(1);

            return (result[0]?.id as UUID) ?? null;
        } catch (error) {
            elizaLogger.error("Failed to get room:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
            });
            throw error;
        }
    }

    async createRoom(roomId?: UUID): Promise<UUID> {
        try {
            const id = roomId ?? uuid();

            await this.db.insert(rooms).values([
                {
                    id: id as string,
                },
            ]);

            return id as UUID;
        } catch (error) {
            elizaLogger.error("Failed to create room:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
            });
            throw error;
        }
    }

    async removeRoom(roomId: UUID): Promise<void> {
        try {
            await this.db.delete(rooms).where(eq(rooms.id, roomId));
        } catch (error) {
            elizaLogger.error("Failed to remove room:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
            });
            throw error;
        }
    }

    async getRoomsForParticipant(userId: UUID): Promise<UUID[]> {
        const result = await this.db
            .select({ roomId: participants.roomId })
            .from(participants)
            .where(eq(participants.userId, userId));

        return result.map((row) => row.roomId as UUID);
    }

    async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
        const result = await this.db
            .selectDistinct({ roomId: participants.roomId })
            .from(participants)
            .where(inArray(participants.userId, userIds));

        return result.map((row) => row.roomId as UUID);
    }

    async addParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        try {
            await this.db.insert(participants).values({
                id: uuid(),
                userId,
                roomId,
            });
            return true;
        } catch (error) {
            console.log("Error adding participant", error);
            return false;
        }
    }

    async removeParticipant(userId: UUID, roomId: UUID): Promise<boolean> {
        try {
            const result = await this.db
                .delete(participants)
                .where(
                    and(
                        eq(participants.userId, userId),
                        eq(participants.roomId, roomId)
                    )
                )
                .returning();

            return result.length > 0;
        } catch (error) {
            elizaLogger.error("Failed to remove participant:", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                roomId,
            });
            throw error;
        }
    }

    async getParticipantsForAccount(userId: UUID): Promise<Participant[]> {
        try {
            const result = await this.db
                .select({
                    id: participants.id,
                    userId: participants.userId,
                    roomId: participants.roomId,
                    lastMessageRead: participants.lastMessageRead,
                })
                .from(participants)
                .where(eq(participants.userId, userId));

            const account = await this.getAccountById(userId);

            return result.map((row) => ({
                id: row.id as UUID,
                account: account!,
            }));
        } catch (error) {
            elizaLogger.error("Failed to get participants for account:", {
                error: error instanceof Error ? error.message : String(error),
                userId,
            });
            throw error;
        }
    }

    async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
        try {
            const result = await this.db
                .select({ userId: participants.userId })
                .from(participants)
                .where(eq(participants.roomId, roomId));

            return result.map((row) => row.userId as UUID);
        } catch (error) {
            elizaLogger.error("Failed to get participants for room:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
            });
            throw error;
        }
    }

    async getParticipantUserState(
        roomId: UUID,
        userId: UUID
    ): Promise<"FOLLOWED" | "MUTED" | null> {
        try {
            const result = await this.db
                .select({ userState: participants.userState })
                .from(participants)
                .where(
                    and(
                        eq(participants.roomId, roomId),
                        eq(participants.userId, userId)
                    )
                )
                .limit(1);

            return (
                (result[0]?.userState as "FOLLOWED" | "MUTED" | null) ?? null
            );
        } catch (error) {
            elizaLogger.error("Failed to get participant user state:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
                userId,
            });
            throw error;
        }
    }

    async setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null
    ): Promise<void> {
        try {
            await this.db
                .update(participants)
                .set({ userState: state })
                .where(
                    and(
                        eq(participants.roomId, roomId),
                        eq(participants.userId, userId)
                    )
                );
        } catch (error) {
            elizaLogger.error("Failed to set participant user state:", {
                error: error instanceof Error ? error.message : String(error),
                roomId,
                userId,
                state,
            });
            throw error;
        }
    }

    async createRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<boolean> {
        try {
            const relationshipId = uuid();
            await this.db.insert(relationships).values({
                id: relationshipId,
                userA: params.userA,
                userB: params.userB,
                userId: params.userA,
            });

            elizaLogger.debug("Relationship created successfully:", {
                relationshipId,
                userA: params.userA,
                userB: params.userB,
            });

            return true;
        } catch (error) {
            if ((error as { code?: string }).code === "23505") {
                // Unique violation
                elizaLogger.warn("Relationship already exists:", {
                    userA: params.userA,
                    userB: params.userB,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                return false;
            }

            elizaLogger.error("Failed to create relationship:", {
                error: error instanceof Error ? error.message : String(error),
                userA: params.userA,
                userB: params.userB,
            });
            return false;
        }
    }

    async getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null> {
        try {
            const result = await this.db
                .select()
                .from(relationships)
                .where(
                    or(
                        and(
                            eq(relationships.userA, params.userA),
                            eq(relationships.userB, params.userB)
                        ),
                        and(
                            eq(relationships.userA, params.userB),
                            eq(relationships.userB, params.userA)
                        )
                    )
                )
                .limit(1);

            if (result.length > 0) {
                return result[0] as unknown as Relationship;
            }

            elizaLogger.debug("No relationship found between users:", {
                userA: params.userA,
                userB: params.userB,
            });
            return null;
        } catch (error) {
            elizaLogger.error("Error fetching relationship:", {
                error: error instanceof Error ? error.message : String(error),
                userA: params.userA,
                userB: params.userB,
            });
            throw error;
        }
    }

    async getRelationships(params: { userId: UUID }): Promise<Relationship[]> {
        try {
            const result = await this.db
                .select()
                .from(relationships)
                .where(
                    or(
                        eq(relationships.userA, params.userId),
                        eq(relationships.userB, params.userId)
                    )
                )
                .orderBy(desc(relationships.createdAt));

            elizaLogger.debug("Retrieved relationships:", {
                userId: params.userId,
                count: result.length,
            });

            return result as unknown as Relationship[];
        } catch (error) {
            elizaLogger.error("Failed to fetch relationships:", {
                error: error instanceof Error ? error.message : String(error),
                userId: params.userId,
            });
            throw error;
        }
    }

    async getKnowledge(params: {
        id?: UUID;
        agentId: UUID;
        limit?: number;
        query?: string;
    }): Promise<RAGKnowledgeItem[]> {
        try {
            let conditions = [
                or(
                    eq(knowledges.agentId, params.agentId),
                    eq(knowledges.isShared, true)
                ),
            ];

            if (params.id) {
                conditions.push(eq(knowledges.id, params.id));
            }

            const query = this.db
                .select()
                .from(knowledges)
                .where(and(...conditions))
                .orderBy(desc(knowledges.createdAt));

            const result = await (params.limit
                ? query.limit(params.limit)
                : query);

            return result.map((row) => ({
                id: row.id as UUID,
                agentId: row.agentId as UUID,
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                embedding: row.embedding
                    ? new Float32Array(row.embedding)
                    : undefined,
                createdAt: row.createdAt?.getTime(),
            }));
        } catch (error) {
            elizaLogger.error("Failed to get knowledge:", {
                error: error instanceof Error ? error.message : String(error),
                id: params.id,
                agentId: params.agentId,
                limit: params.limit,
            });
            throw error;
        }
    }

    async searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array;
        match_threshold: number;
        match_count: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]> {
        try {
            const cacheKey = `embedding_${params.agentId}_${params.searchText}`;

            const cachedResult = await this.getCache({
                key: cacheKey,
                agentId: params.agentId,
            });

            if (cachedResult) {
                return JSON.parse(cachedResult);
            }

            const vectorStr = params.embedding.toString();

            const result = await this.db.execute<Record<string, unknown>>(sql`
                WITH vector_scores AS (
                    SELECT id,
                        1 - (embedding <-> ${vectorStr}::vector) as vector_score
                    FROM knowledge
                    WHERE ("agentId" IS NULL AND "isShared" = true) OR "agentId" = ${
                        params.agentId
                    }
                    AND embedding IS NOT NULL
                ),
                keyword_matches AS (
                    SELECT id,
                    CASE
                        WHEN content->>'text' ILIKE ${`%${
                            params.searchText || ""
                        }%`} THEN 3.0
                        ELSE 1.0
                    END *
                    CASE
                        WHEN (content->'metadata'->>'isChunk')::boolean = true THEN 1.5
                        WHEN (content->'metadata'->>'isMain')::boolean = true THEN 1.2
                        ELSE 1.0
                    END as keyword_score
                    FROM knowledge
                    WHERE ("agentId" IS NULL AND "isShared" = true) OR "agentId" = ${
                        params.agentId
                    }
                )
                SELECT k.*,
                    v.vector_score,
                    kw.keyword_score,
                    (v.vector_score * kw.keyword_score) as combined_score
                FROM knowledge k
                JOIN vector_scores v ON k.id = v.id
                LEFT JOIN keyword_matches kw ON k.id = kw.id
                WHERE ("agentId" IS NULL AND "isShared" = true) OR k."agentId" = ${
                    params.agentId
                }
                AND (
                    v.vector_score >= ${params.match_threshold}
                    OR (kw.keyword_score > 1.0 AND v.vector_score >= 0.3)
                )
                ORDER BY combined_score DESC
                LIMIT ${params.match_count}
            `);

            const mappedResults = result.map((row: any) => ({
                id: row.id as UUID,
                agentId: row.agentId as UUID,
                content:
                    typeof row.content === "string"
                        ? JSON.parse(row.content)
                        : row.content,
                embedding: row.embedding
                    ? new Float32Array(
                          row.embedding.slice(1, -1).split(",").map(Number)
                      )
                    : undefined,
                createdAt: row.createdAt?.getTime(),
                similarity: row.combined_score,
            }));

            await this.setCache({
                key: cacheKey,
                agentId: params.agentId,
                value: JSON.stringify(mappedResults),
            });

            return mappedResults;
        } catch (error) {
            elizaLogger.error("Error in searchKnowledge:", {
                error: error instanceof Error ? error.message : String(error),
                agentId: params.agentId,
                searchText: params.searchText,
            });
            throw error;
        }
    }

    async createKnowledge(knowledge: RAGKnowledgeItem): Promise<void> {
        await this.db.transaction(async (tx) => {
            try {
                const metadata = knowledge.content.metadata || {};

                // If this is a chunk, use createKnowledgeChunk
                if (metadata.isChunk && metadata.originalId) {
                    await this.createKnowledgeChunk({
                        id: knowledge.id,
                        originalId: metadata.originalId,
                        agentId: metadata.isShared ? null : knowledge.agentId,
                        content: knowledge.content,
                        embedding: knowledge.embedding,
                        chunkIndex: metadata.chunkIndex || 0,
                        isShared: metadata.isShared || false,
                        createdAt: knowledge.createdAt || Date.now(),
                    });
                } else {
                    // This is a main knowledge item
                    await tx.insert(knowledges).values({
                        id: knowledge.id,
                        agentId: metadata.isShared ? null : knowledge.agentId,
                        content: knowledge.content,
                        embedding: knowledge.embedding
                            ? Array.from(knowledge.embedding)
                            : null,
                        createdAt: new Date(knowledge.createdAt || Date.now()),
                        isMain: true,
                        originalId: null,
                        chunkIndex: null,
                        isShared: metadata.isShared || false,
                    });
                }
            } catch (error) {
                elizaLogger.error("Failed to create knowledge:", error);
                throw error;
            }
        });
    }

    private async createKnowledgeChunk(params: {
        id: UUID;
        originalId: UUID;
        agentId: UUID | null;
        content: any;
        embedding: Float32Array | undefined | null;
        chunkIndex: number;
        isShared: boolean;
        createdAt: number;
    }): Promise<void> {
        const embedding = params.embedding
            ? Array.from(params.embedding)
            : null;

        const patternId = `${params.originalId}-chunk-${params.chunkIndex}`;
        const contentWithPatternId = {
            ...params.content,
            metadata: {
                ...params.content.metadata,
                patternId,
            },
        };

        await this.db.insert(knowledges).values({
            id: params.id,
            agentId: params.agentId,
            content: contentWithPatternId,
            embedding: embedding,
            createdAt: new Date(params.createdAt),
            isMain: false,
            originalId: params.originalId,
            chunkIndex: params.chunkIndex,
            isShared: params.isShared,
        });
    }

    async removeKnowledge(id: UUID): Promise<void> {
        try {
            await this.db.delete(knowledges).where(eq(knowledges.id, id));
        } catch (error) {
            elizaLogger.error("Failed to remove knowledge:", {
                error: error instanceof Error ? error.message : String(error),
                id,
            });
            throw error;
        }
    }

    async clearKnowledge(agentId: UUID, shared?: boolean): Promise<void> {
        try {
            await this.db
                .delete(knowledges)
                .where(eq(knowledges.agentId, agentId));
        } catch (error) {
            elizaLogger.error("Failed to clear knowledge:", {
                error: error instanceof Error ? error.message : String(error),
                agentId,
                shared,
            });
            throw error;
        }
    }

    async getCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<string | undefined> {
        try {
            const result = await this.db
                .select()
                .from(caches)
                .where(
                    and(
                        eq(caches.agentId, params.agentId),
                        eq(caches.key, params.key)
                    )
                );
            return result[0]?.value as string | undefined;
        } catch (error) {
            elizaLogger.error("Failed to get cache:", {
                error: error instanceof Error ? error.message : String(error),
                agentId: params.agentId,
                key: params.key,
            });
            throw error;
        }
    }

    async setCache(params: {
        agentId: UUID;
        key: string;
        value: string;
    }): Promise<boolean> {
        try {
            await this.db
                .insert(caches)
                .values({
                    key: params.key,
                    agentId: params.agentId,
                    value: params.value,
                    createdAt: new Date(),
                })
                .onConflictDoUpdate({
                    target: [caches.key, caches.agentId],
                    set: {
                        value: params.value,
                        createdAt: new Date(),
                    },
                });
            return true;
        } catch (error) {
            elizaLogger.error("Error setting cache", {
                error: error instanceof Error ? error.message : String(error),
                key: params.key,
                agentId: params.agentId,
            });
            return false;
        }
    }

    async deleteCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<boolean> {
        try {
            await this.db
                .delete(caches)
                .where(
                    and(
                        eq(caches.agentId, params.agentId),
                        eq(caches.key, params.key)
                    )
                );
            return true;
        } catch (error) {
            elizaLogger.error("Error deleting cache", {
                error: error instanceof Error ? error.message : String(error),
                key: params.key,
                agentId: params.agentId,
            });
            return false;
        }
    }
}
