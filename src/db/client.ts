import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Postgres connection (Neon serverless driver, HTTP transport) via Drizzle.
 *
 * HTTP-based, no persistent connection pool — serverless-friendly. The schema
 * import gives Drizzle the full table graph for typed queries.
 *
 * Set `DATABASE_URL` to the Neon pooled connection string (`.../neon`). Use
 * `DATABASE_URL_DIRECT` for migrations (see drizzle.config.ts) since Neon's
 * pooled endpoint can't run DDL reliably.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail loud rather than silently connecting to nothing.
  throw new Error("DATABASE_URL environment variable is required for Postgres");
}

const sql = neon(connectionString);
export const db = drizzle({ client: sql, schema });
