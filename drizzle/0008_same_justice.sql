ALTER TABLE "accounts" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_external_idx" ON "accounts" USING btree ("external_source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_external_idx" ON "categories" USING btree ("external_source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_external_idx" ON "labels" USING btree ("external_source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_external_idx" ON "transactions" USING btree ("external_source","external_id");