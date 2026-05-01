ALTER TABLE "clients" ALTER COLUMN "illnesses" SET DATA TYPE integer USING illnesses::integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "telegram" text;--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "email";