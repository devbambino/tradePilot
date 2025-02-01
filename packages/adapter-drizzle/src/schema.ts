import {
    pgTable,
    uuid,
    timestamp,
    text,
    jsonb,
    boolean,
    integer,
    vector,
} from "drizzle-orm/pg-core";

const getEmbeddingDimension = (
    embeddingProvider: string = "default"
): number => {
    switch (embeddingProvider) {
        case "openai":
            return 1536;
        case "ollama":
            return 1024;
        case "gaianet":
            return 768;
        default:
            return 384;
    }
};

const dimensions = getEmbeddingDimension();

export const accounts = pgTable("accounts", {
    id: uuid("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    name: text("name"),
    username: text("username"),
    email: text("email").notNull(),
    avatarUrl: text("avatarUrl"),
    details: jsonb("details").default({}),
});

export const memories = pgTable("memories", {
    id: uuid("id").primaryKey().notNull(),
    type: text("type").notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    content: jsonb("content").notNull(),
    embedding: vector("embedding", {
        dimensions: dimensions,
    }),
    userId: uuid("userId")
        .references(() => accounts.id)
        .references(() => accounts.id),
    agentId: uuid("agentId")
        .references(() => accounts.id)
        .references(() => accounts.id),
    roomId: uuid("roomId")
        .references(() => rooms.id)
        .references(() => rooms.id),
    unique: boolean("unique").default(true).notNull(),
});

export const rooms = pgTable("rooms", {
    id: uuid("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
});

export const goals = pgTable("goals", {
    id: uuid("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    userId: uuid("userId")
        .references(() => accounts.id)
        .references(() => accounts.id),
    name: text("name"),
    status: text("status"),
    description: text("description"),
    roomId: uuid("roomId")
        .references(() => rooms.id)
        .references(() => rooms.id),
    objectives: jsonb("objectives").default([]).notNull(),
});

export const logs = pgTable("logs", {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    userId: uuid("userId")
        .notNull()
        .references(() => accounts.id)
        .references(() => accounts.id),
    body: jsonb("body").notNull(),
    type: text("type").notNull(),
    roomId: uuid("roomId")
        .notNull()
        .references(() => rooms.id)
        .references(() => rooms.id),
});

export const participants = pgTable("participants", {
    id: uuid("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    userId: uuid("userId")
        .references(() => accounts.id)
        .references(() => accounts.id),
    roomId: uuid("roomId")
        .references(() => rooms.id)
        .references(() => rooms.id),
    userState: text("userState"),
    lastMessageRead: text("last_message_read"),
});

export const relationships = pgTable("relationships", {
    id: uuid("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    userA: uuid("userA")
        .notNull()
        .references(() => accounts.id)
        .references(() => accounts.id),
    userB: uuid("userB")
        .notNull()
        .references(() => accounts.id)
        .references(() => accounts.id),
    status: text("status"),
    userId: uuid("userId")
        .notNull()
        .references(() => accounts.id)
        .references(() => accounts.id),
});

export const knowledges = pgTable("knowledge", {
    id: uuid("id").primaryKey().notNull(),
    agentId: uuid("agentId").references(() => accounts.id),
    content: jsonb("content").notNull(),
    embedding: vector("embedding", {
        dimensions: dimensions,
    }),
    createdAt: timestamp("createdAt", {
        withTimezone: true,
        mode: "date",
    }).defaultNow(),
    isMain: boolean("isMain").default(false),
    originalId: uuid("originalId"),
    chunkIndex: integer("chunkIndex"),
    isShared: boolean("isShared").default(false),
});

export const caches = pgTable("cache", {
    key: text("key").notNull(),
    agentId: text("agentId").notNull(),
    value: jsonb("value").default({}),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
    expiresAt: timestamp("expiresAt", { mode: "date" }),
});
