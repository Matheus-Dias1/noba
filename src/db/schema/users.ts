import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Users — direct port of the Mongo User collection.
 * `password_hash` holds a bcrypt hash; `admin` gates login (admin-only).
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
