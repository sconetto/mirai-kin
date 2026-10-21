ALTER TABLE "recurring_transactions" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_transactions_external_idx" ON "recurring_transactions" USING btree ("external_source","external_id");