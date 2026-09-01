/**
 * Local-only PostgreSQL for development and verification.
 *
 * PGlite is a real PostgreSQL build running in-process, exposed here over a TCP
 * socket so the application connects with the same `postgres://` URL and the same
 * driver it uses in production. Nothing is installed system-wide; deleting the
 * data directory removes every trace.
 *
 * Never point production at this. It binds to loopback only.
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const dataDir = process.env.DEV_DB_DIR ?? "./.dev-postgres";
const port = Number.parseInt(process.env.DEV_DB_PORT ?? "54329", 10);

mkdirSync(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });
// PGlite is single-writer and its socket bridge interleaves messages when more
// than one connection is live, so keep it at one and point the API at it with
// DB_POOL_MAX=1. Production talks to real PostgreSQL and uses a normal pool.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 1 });
await server.start();

console.log(`dev postgres listening on postgres://postgres@127.0.0.1:${port}/postgres (data: ${dataDir})`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void server.stop().then(() => db.close()).then(() => process.exit(0));
  });
}
