import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — used for `drizzle-kit generate` (create migration SQL
 * from schema diffs) and `drizzle-kit migrate` (apply them).
 *
 * Uses the DIRECT (non-pooled) connection string for migrations, since Neon's
 * pooled endpoint can't run DDL reliably.
 */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "",
  },
});
