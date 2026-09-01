ALTER TABLE "articles" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "articles" SET "slug" = 'note-' || "id" WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_tenant_slug_uidx" ON "articles" USING btree ("tenant_id","slug");
