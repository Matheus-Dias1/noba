import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Suppliers — vendors that sell products. Linked to products many-to-many
 * via `product_suppliers`.
 */
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  phone: text("phone"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
