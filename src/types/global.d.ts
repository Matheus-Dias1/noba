import type mongoose from "mongoose";

/**
 * Shape of the cached Mongoose connection stored on `globalThis` so it survives
 * Next.js dev hot-reloads (see `src/lib/db.ts`).
 */
export type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseCache | undefined;
}
