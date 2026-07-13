import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { clientUnits } from "./client-units";
import { suppliers } from "./suppliers";

/**
 * Contacts — people at a given client unit OR supplier.
 *
 * Polymorphic: `client_unit_id` XOR `supplier_id` (exactly one is set).
 * Replaces the old `client_contacts` table so suppliers share the same model.
 */
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  clientUnitId: integer("client_unit_id").references(() => clientUnits.id, {
    onDelete: "cascade",
  }),
  supplierId: integer("supplier_id").references(() => suppliers.id, {
    onDelete: "cascade",
  }),
  name: text("name"),
  role: text("role"), // cargo
  phone: text("phone"),
  email: text("email"),
});
