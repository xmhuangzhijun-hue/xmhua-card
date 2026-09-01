import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDatabase, connectDatabase } from "./client.js";

const db = await connectDatabase();
// Both drivers accept the same migrator shape.
await migrate(db as never, { migrationsFolder: "./drizzle" });
console.log("migrations applied");
await closeDatabase();
