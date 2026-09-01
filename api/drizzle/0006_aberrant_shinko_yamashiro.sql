ALTER TABLE "articles" ADD COLUMN "source_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_label" text DEFAULT '' NOT NULL;