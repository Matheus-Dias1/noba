import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Batches — a numbered group of orders over a date window.
 *
 * Unlike the Mongo version, there is NO denormalized `orders[]` array here —
 * batch membership is derived from `orders.batch_id` (fixes the drift bug
 * §10 #4 permanently).
 */
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
