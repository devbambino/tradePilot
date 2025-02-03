import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: "postgres://postgres:postgres@localhost:5432/eliza",
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
    prefix: "timestamp",
  },
  breakpoints: true,
});
