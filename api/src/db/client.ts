import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, requireDatabaseUrl } from "../env.js";
import * as schema from "./schema.js";

type Database = ReturnType<typeof drizzlePostgres<typeof schema>>;

let connection: ReturnType<typeof postgres> | null = null;
let database: Database | null = null;
let closePglite: (() => Promise<void>) | null = null;

/** Local development can point at an in-process PGlite directory instead of a server. */
const pglitePrefix = "pglite:";

export async function connectDatabase() {
  if (database) return database;
  const url = requireDatabaseUrl();

  if (url.startsWith(pglitePrefix)) {
    // Dev only. Imported dynamically so production never loads the WASM build,
    // and running in-process avoids the socket bridge entirely.
    const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
    ]);
    const client = await PGlite.create({ dataDir: url.slice(pglitePrefix.length) });
    closePglite = () => client.close();
    database = drizzlePglite(client, { schema }) as unknown as Database;
    return database;
  }

  connection = postgres(url, { prepare: false, max: env.databasePoolMax });
  database = drizzlePostgres(connection, { schema });
  return database;
}

/** Synchronous accessor for request handlers. `connectDatabase` runs at startup. */
export function getDatabase() {
  if (!database) throw new Error("Database is not connected. Call connectDatabase() first.");
  return database;
}

export async function closeDatabase() {
  if (connection) await connection.end({ timeout: 5 });
  if (closePglite) await closePglite();
  connection = null;
  closePglite = null;
  database = null;
}

export type { Database };
