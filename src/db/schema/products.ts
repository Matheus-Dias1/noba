import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import { suppliers } from "./suppliers";

/**
 * Products — direct port of the Mongo Product collection, minus the embedded
 * conversions (now a child table) and plus processing options + supplier links.
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  defaultUnit: text("default_unit").notNull(),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Product unit conversions — ported from the Mongo embedded `conversions` array.
 * `one_default_equals` of `unit` == 1 default unit.
 */
export const productConversions = pgTable("product_conversions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  unit: text("unit").notNull(),
  oneDefaultEquals: numeric("one_default_equals", { precision: 18, scale: 6 }).notNull(),
});

/**
 * Product processing options — e.g. "cortado", "descascado". Created per-product
 * on the product edit page. An order line can reference one of these.
 */
export const productProcessings = pgTable("product_processings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

/**
 * Product ↔ Supplier many-to-many join.
 */
export const productSuppliers = pgTable(
  "product_suppliers",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.supplierId] }),
  }),
);
