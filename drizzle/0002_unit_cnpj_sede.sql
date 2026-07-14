-- Add CNPJ column to client_units + rename PRINCIPAL → SEDE
ALTER TABLE "client_units" ADD COLUMN "cnpj" text;
--> statement-breakpoint
UPDATE "client_units" SET "name" = 'SEDE' WHERE "name" = 'PRINCIPAL';
