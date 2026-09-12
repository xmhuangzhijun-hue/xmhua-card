import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";

process.env.DATABASE_URL = `pglite:${await mkdtemp(join(tmpdir(), "xmhua-github-test-"))}`;
const { connectDatabase, closeDatabase } = await import("../db/client.js");
const { publicGithubSnapshot } = await import("../services/github.js");
let db = await connectDatabase();
const setup = `
CREATE TABLE tenants (id serial PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL, owner_token_hash text, active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE site_settings (id serial PRIMARY KEY, tenant_id integer NOT NULL, key text NOT NULL, value jsonb NOT NULL, updated_at timestamptz DEFAULT now(), UNIQUE(tenant_id,key));
CREATE TABLE products (id serial PRIMARY KEY, tenant_id integer NOT NULL, href text NOT NULL, published boolean NOT NULL);
INSERT INTO tenants (slug,name) VALUES ('xmhua','Public'),('other','Other');
INSERT INTO products (tenant_id,href,published) VALUES (1,'https://github.com/owner/visible',true),(1,'https://github.com/owner/draft',false),(2,'https://github.com/owner/visible',true);
`;
for (const statement of setup.split(";").filter(value => value.trim())) await db.execute(sql.raw(statement));
const snapshot = { projects: { "owner/visible": { repo: "owner/visible", syncedAt: "2026-09-12T00:00:00Z" }, "owner/draft": { repo: "owner/draft" } }, failed: ["owner/draft"] };
await db.execute(sql`INSERT INTO site_settings (tenant_id,key,value) VALUES (1,'github-public-snapshot-v1',${JSON.stringify(snapshot)}::jsonb)`);
assert.deepEqual(Object.keys((await publicGithubSnapshot(1)).projects), ["owner/visible"]);
assert.deepEqual((await publicGithubSnapshot(1)).failed, []);
assert.deepEqual((await publicGithubSnapshot(2)).projects, {}, "must not share facts across tenants");
await closeDatabase();
db = await connectDatabase();
assert.equal((await publicGithubSnapshot(1)).projects["owner/visible"]?.syncedAt, "2026-09-12T00:00:00Z", "snapshot survives database reopen");
await closeDatabase();
console.log("GitHub storage regression passed: persistence, published-only and tenant isolation");
