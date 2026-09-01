import { and, eq, gt, lt } from "drizzle-orm";
import { getDatabase } from "../db/client.js";
import { adminSessions, adminUsers } from "../db/schema.js";
import { unauthorized } from "../lib/http.js";
import { burnPasswordTime, hashPassword, verifyPassword } from "../lib/password.js";
import { createSessionToken, hashSessionToken, sessionExpiry } from "../lib/session.js";

export type AdminIdentity = {
  kind: "session" | "api-key";
  userId: number | null;
  username: string;
  tenantId: number | null;
};

export async function login(username: string, password: string) {
  const db = getDatabase();
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  const user = rows[0];
  if (!user || !user.active) {
    // Spend the same work as a real verification so a missing account is not faster.
    await burnPasswordTime();
    throw unauthorized("INVALID_CREDENTIALS");
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw unauthorized("INVALID_CREDENTIALS");

  const { token, tokenHash } = createSessionToken();
  const expiresAt = sessionExpiry();
  await db.insert(adminSessions).values({ userId: user.id, tokenHash, expiresAt });
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));

  return { token, expiresAt, user };
}

export async function resolveSession(token: string): Promise<AdminIdentity | null> {
  const db = getDatabase();
  const rows = await db
    .select({ user: adminUsers, session: adminSessions })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.tokenHash, hashSessionToken(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.user.active) return null;
  return { kind: "session", userId: row.user.id, username: row.user.username, tenantId: row.user.tenantId };
}

export async function logout(token: string) {
  await getDatabase().delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(token)));
}

export async function changePassword(userId: number, currentPassword: string, nextPassword: string) {
  const db = getDatabase();
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw unauthorized("INVALID_CREDENTIALS");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) throw unauthorized("INVALID_CREDENTIALS");
  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(nextPassword), updatedAt: new Date() })
    .where(eq(adminUsers.id, userId));
  // Every other session is invalidated so a stolen cookie dies with the old password.
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}

export async function createAdminUser(input: {
  tenantId: number;
  username: string;
  password: string;
  displayName?: string;
}) {
  return getDatabase()
    .insert(adminUsers)
    .values({
      tenantId: input.tenantId,
      username: input.username,
      displayName: input.displayName ?? input.username,
      passwordHash: await hashPassword(input.password),
    })
    .returning();
}
