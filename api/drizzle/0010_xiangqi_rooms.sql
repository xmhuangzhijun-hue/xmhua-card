CREATE TABLE "xiangqi_rooms" (
	"code" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "xiangqi_rooms_expiry_idx" ON "xiangqi_rooms" USING btree ("expires_at");