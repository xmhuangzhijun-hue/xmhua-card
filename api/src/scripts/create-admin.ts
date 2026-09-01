/**
 * Creates or resets a console account.
 *
 * The password is read from ADMIN_PASSWORD so it never appears in shell history
 * or in a process listing. Only its scrypt hash is stored.
 *
 *   ADMIN_USERNAME=xmhua ADMIN_PASSWORD=... npm run admin:create
 */
import { eq } from "drizzle-orm";
import { closeDatabase, connectDatabase } from "../db/client.js";
import { adminSessions, adminUsers } from "../db/schema.js";
import { env } from "../env.js";
import { hashPassword } from "../lib/password.js";
import { requireTenant } from "../services/tenant.js";

const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || username;

if (!username) throw new Error("ADMIN_USERNAME is required");
if (!password || password.length < 10) throw new Error("ADMIN_PASSWORD is required and must be at least 10 characters");

const db = await connectDatabase();
const tenant = await requireTenant(process.env.ADMIN_TENANT ?? env.defaultTenant);
const passwordHash = await hashPassword(password);

const existing = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
if (existing[0]) {
  await db.update(adminUsers)
    .set({ passwordHash, active: true, tenantId: tenant.id, displayName: displayName!, updatedAt: new Date() })
    .where(eq(adminUsers.id, existing[0].id));
  // Any session issued against the previous password must stop working.
  await db.delete(adminSessions).where(eq(adminSessions.userId, existing[0].id));
  console.log(`password reset for "${username}" on tenant ${tenant.slug}; existing sessions revoked`);
} else {
  await db.insert(adminUsers).values({ tenantId: tenant.id, username, displayName: displayName!, passwordHash });
  console.log(`admin "${username}" created on tenant ${tenant.slug}`);
}

await closeDatabase();
