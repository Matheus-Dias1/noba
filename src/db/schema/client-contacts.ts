import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { clientUnits } from "./client-units";

/**
 * Client contacts — people at a given unit.
 */
export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientUnitId: integer("client_unit_id")
    .notNull()
    .references(() => clientUnits.id, { onDelete: "cascade" }),
  name: text("name"),
  role: text("role"), // cargo
  phone: text("phone"),
  email: text("email"),
});
