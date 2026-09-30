CREATE TABLE publish_workers (
 id text PRIMARY KEY, tenant_id integer NOT NULL REFERENCES tenants(id),
 name text NOT NULL, token_hash text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true,
 last_seen timestamptz, accounts jsonb NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE publish_assets (
 id text PRIMARY KEY, tenant_id integer NOT NULL REFERENCES tenants(id),
 name text NOT NULL, size integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE publish_jobs (
 id text PRIMARY KEY, tenant_id integer NOT NULL REFERENCES tenants(id),
 worker_id text NOT NULL REFERENCES publish_workers(id), request_id text NOT NULL,
 platform text NOT NULL, kind text NOT NULL, state text NOT NULL DEFAULT 'queued',
 message text NOT NULL DEFAULT '', payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX publish_jobs_request_platform ON publish_jobs (tenant_id, request_id, platform);
