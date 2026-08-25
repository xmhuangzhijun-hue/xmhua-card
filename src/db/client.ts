import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!database) {
    const client = postgres(connectionString, { prepare: false });
    database = drizzle(client, { schema });
  }
  return database;
}

