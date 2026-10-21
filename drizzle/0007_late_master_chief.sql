ALTER TABLE "accounts" ADD COLUMN "ownership_type" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "asset_subtype" text;