ALTER TABLE "social_links" ADD COLUMN "kind" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "social_links" ADD COLUMN "qr_asset" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "social_links" ADD COLUMN "note" text DEFAULT '' NOT NULL;