-- Rename client_contacts → contacts (unified for client units + suppliers)
-- Old table is empty (no contacts were imported), so a clean drop+create is safe.

DROP TABLE IF EXISTS "client_contacts";

CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_unit_id" integer,
	"supplier_id" integer,
	"name" text,
	"role" text,
	"phone" text,
	"email" text
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_unit_id_client_units_id_fk" FOREIGN KEY ("client_unit_id") REFERENCES "public"."client_units"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;
