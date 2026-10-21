ALTER TABLE "goals" ALTER COLUMN "type" SET DEFAULT 'savings';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "down_payment_pct" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "interest_rate" numeric(30, 10);--> statement-breakpoint
UPDATE "goals" SET "type" = 'savings' WHERE "type" IN ('emergency', 'retirement', 'custom');--> statement-breakpoint
UPDATE "goals" SET "type" = 'purchase' WHERE "type" IN ('home', 'car');