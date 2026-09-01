CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "tenants" ("slug", "name") VALUES ('hooosberg', '湖森堡 AI') ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_key_unique";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "tenant_id" integer;--> statement-breakpoint
ALTER TABLE "directory_links" ADD COLUMN "tenant_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tenant_id" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "tenant_id" integer;--> statement-breakpoint
ALTER TABLE "social_links" ADD COLUMN "tenant_id" integer;--> statement-breakpoint
UPDATE "articles" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'hooosberg');--> statement-breakpoint
UPDATE "directory_links" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'hooosberg');--> statement-breakpoint
UPDATE "products" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'hooosberg');--> statement-breakpoint
UPDATE "site_settings" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'hooosberg');--> statement-breakpoint
UPDATE "social_links" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'hooosberg');--> statement-breakpoint
ALTER TABLE "articles" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "directory_links" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "social_links" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_links" ADD CONSTRAINT "directory_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_tenant_sort_idx" ON "articles" USING btree ("tenant_id","sort_order");--> statement-breakpoint
CREATE INDEX "directory_links_tenant_sort_idx" ON "directory_links" USING btree ("tenant_id","sort_order");--> statement-breakpoint
CREATE INDEX "products_tenant_sort_idx" ON "products" USING btree ("tenant_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_tenant_key_uidx" ON "site_settings" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE INDEX "social_links_tenant_sort_idx" ON "social_links" USING btree ("tenant_id","sort_order");
