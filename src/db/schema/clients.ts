import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Clients — a company. Replaces the messy `order.client` string.
 * One client (EMPRESA EXEMPLO) → many client_units (FILIAL 1, FILIAL 2, ...).
 */
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // normalized display name, e.g. "EMPRESA EXEMPLO"
  legalName: text("legal_name"), // razão social
  cnpj: text("cnpj"), // CNPJ of the company (nullable — enriched over time)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  archived: boolean("archived").notNull().default(false),
});
