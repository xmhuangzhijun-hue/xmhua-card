import { Hono } from "hono";
import { z } from "zod";
import { parseBody, unauthorized } from "../lib/http.js";
import { buildClearedSessionCookie, buildSessionCookie, readSessionToken } from "../lib/session.js";
import { changePassword, login, logout, resolveSession } from "../services/auth.js";
import { requireAdmin } from "../middleware/auth.js";

export const authRoutes = new Hono();

const credentialsSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  nextPassword: z.string().min(10, "password must be at least 10 characters").max(200),
});

authRoutes.post("/login", async context => {
  const body = await parseBody(context, credentialsSchema);
  const { token, expiresAt, user } = await login(body.username, body.password);
  context.header("Set-Cookie", buildSessionCookie(token, expiresAt));
  return context.json({
    data: { username: user.username, displayName: user.displayName, expiresAt: expiresAt.toISOString() },
  });
});

authRoutes.post("/logout", async context => {
  const token = readSessionToken(context.req.header("cookie"));
  if (token) await logout(token);
  context.header("Set-Cookie", buildClearedSessionCookie());
  return context.json({ data: { ok: true } });
});

authRoutes.get("/me", async context => {
  const token = readSessionToken(context.req.header("cookie"));
  const identity = token ? await resolveSession(token) : null;
  if (!identity) throw unauthorized();
  return context.json({ data: identity });
});

authRoutes.post("/password", requireAdmin, async context => {
  const identity = context.get("identity");
  if (identity.userId === null) throw unauthorized("PASSWORD_REQUIRES_USER_SESSION");
  const body = await parseBody(context, passwordChangeSchema);
  await changePassword(identity.userId, body.currentPassword, body.nextPassword);
  context.header("Set-Cookie", buildClearedSessionCookie());
  return context.json({ data: { ok: true, reauthenticate: true } });
});
