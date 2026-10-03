CREATE TABLE "gomoku_rooms" (
  "code" text PRIMARY KEY NOT NULL,
  "state" jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "creator_token_hash" text NOT NULL,
  "black_token_hash" text NOT NULL,
  "white_token_hash" text,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "gomoku_rooms_creator_token_hash_unique" UNIQUE("creator_token_hash")
);
--> statement-breakpoint
CREATE INDEX "gomoku_rooms_expiry_idx" ON "gomoku_rooms" USING btree ("expires_at");
