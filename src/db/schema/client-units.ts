import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { clients } from "./clients";

/**
 * Client units — a delivery location / branch within a client.
 * Carries the address. Orders link to a specific unit.
 */
export const clientUnits = pgTable("client_units", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "FRIGORIFICO", "UBERABA", "SEDE"
  cnpj: text("cnpj"), // unit-level CNPJ (may differ from the company's)
  street: text("street"),
  number: text("number"),
  neighborhood: text("neighborhood"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  complement: text("complement"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  archived: boolean("archived").notNull().default(false),
});
