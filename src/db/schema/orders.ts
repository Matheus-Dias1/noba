import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { batches } from "./batches";
import { clientUnits } from "./client-units";
import { products } from "./products";
import { productProcessings } from "./products";

export const orderStatus = pgEnum("order_status", ["active", "cancelled"]);

/**
 * Orders — one client unit's request within a batch.
 *
 * Changes vs Mongo:
 * - `client_unit_id` FK replaces the messy `client` string
 * - `client_snapshot` keeps the original display string (safety / audit)
 * - `observation` captures the non-name junk ("CARGA DORIVAL", etc.)
 * - `status` enum captures "PEDIDO CANCELADO"
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id")
    .notNull()
    .references(() => batches.id, { onDelete: "cascade" }),
  clientUnitId: integer("client_unit_id").references(() => clientUnits.id, {
    onDelete: "set null",
  }),
  clientSnapshot: text("client_snapshot"), // original client string (denormalized, for audit)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  deliverAt: timestamp("deliver_at", { withTimezone: true }).notNull(),
  observation: text("observation"),
  status: orderStatus("status").notNull().default("active"),
  archived: boolean("archived").notNull().default(false),
});

/**
 * Order items — one line per product in an order.
 *
 * Changes vs Mongo:
 * - real FK to products (was an ObjectId ref)
 * - `processing_id` lets a line request a specific processing option
 */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  processingId: integer("processing_id").references(() => productProcessings.id, {
    onDelete: "set null",
  }),
});
