import mongoose from "mongoose";
import type { MongooseCache } from "@/types/global";

/**
 * Cached Mongoose connection.
 *
 * In development, Next.js re-imports modules on every hot-reload; without
 * caching this would open a new connection pool on each reload and quickly
 * exhaust the DB's connection limit. We stash the promise on `globalThis` so it
 * survives reloads. The global type is declared in `src/types/global.d.ts`.
 */

const MONGO_DB_NAME = process.env.MONGO_DB_NAME;
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.tjb515h.mongodb.net/${MONGO_DB_NAME}?retryWrites=true&w=majority`;

// Safety guard: refuse to connect to the production database (`oba`) outside of
// a production deploy, so a stray env var can never silently write to prod data
// during validation. The test copy lives in `oba_dev`. Override with
// ALLOW_PRODUCTION_DB=1 if you ever genuinely need to.
const PRODUCTION_DB = "oba";
if (
  process.env.NODE_ENV !== "production" &&
  MONGO_DB_NAME === PRODUCTION_DB &&
  process.env.ALLOW_PRODUCTION_DB !== "1"
) {
  throw new Error(
    `Refusing to connect to production database "${PRODUCTION_DB}" in a non-production environment. ` +
      `Set MONGO_DB_NAME=oba_dev (the restored test copy), or set ALLOW_PRODUCTION_DB=1 to override.`,
  );
}

const fallback: MongooseCache = { conn: null, promise: null };
const cached: MongooseCache = globalThis.mongoose ?? fallback;

if (process.env.NODE_ENV !== "production") {
  globalThis.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
