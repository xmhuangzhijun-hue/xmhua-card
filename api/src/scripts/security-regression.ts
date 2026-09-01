/**
 * Security regressions for the content API. Runs without a database.
 */
import assert from "node:assert/strict";
import seedData from "../seed-data.json" with { type: "json" };
import { siteSettingsSchema, articleInputSchema, socialLinkInputSchema } from "../lib/content-schema.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { buildSessionCookie, createSessionToken, hashSessionToken, readSessionToken, sessionCookieName } from "../lib/session.js";
import { enforceSignupRateLimit, enforceValidSignupAttempt, requireSignupInvite } from "../lib/signup-guard.js";
import { isLive } from "../services/content.js";

// --- passwords -------------------------------------------------------------

const hash = await hashPassword("correct horse battery staple");
assert.match(hash, /^scrypt\$/, "password must be stored as a scrypt hash");
assert.ok(!hash.includes("correct horse"), "plaintext must never appear in the stored hash");
assert.equal(await verifyPassword("correct horse battery staple", hash), true);
assert.equal(await verifyPassword("Correct horse battery staple", hash), false);
assert.equal(await verifyPassword("", hash), false);
assert.equal(await verifyPassword("anything", "not-a-hash"), false);

const second = await hashPassword("correct horse battery staple");
assert.notEqual(hash, second, "each hash must use a fresh salt");

// --- sessions --------------------------------------------------------------

const { token, tokenHash } = createSessionToken();
assert.equal(hashSessionToken(token), tokenHash);
assert.ok(!tokenHash.includes(token), "only the hash of a session token may be stored");

const cookie = buildSessionCookie(token, new Date(Date.now() + 60_000));
assert.match(cookie, /HttpOnly/, "session cookie must be HttpOnly");
assert.match(cookie, /SameSite=Lax/, "session cookie must set SameSite");
assert.equal(readSessionToken(`${sessionCookieName}=${token}`), token);
assert.equal(readSessionToken("other=1"), null);
assert.equal(readSessionToken(undefined), null);

// --- signup guard ----------------------------------------------------------

process.env.SIGNUP_INVITE_CODE = "regression-invite";
requireSignupInvite("regression-invite");
assert.throws(() => requireSignupInvite("wrong-invite"), /INVALID_INVITE_CODE/);

process.env.SIGNUP_RATE_LIMIT = "1";
process.env.TRUST_PROXY_HEADERS = "false";
// A wrong invite must be rejected before it can consume the shared quota.
for (let attempt = 0; attempt < 10; attempt += 1) {
  assert.throws(() => enforceValidSignupAttempt(undefined, `wrong-${attempt}`), /INVALID_INVITE_CODE/);
}
enforceValidSignupAttempt(undefined, "regression-invite");
assert.throws(() => enforceSignupRateLimit(undefined), /SIGNUP_RATE_LIMITED/);

// --- content validation ----------------------------------------------------

siteSettingsSchema.parse(seedData.settings);
assert.equal(articleInputSchema.safeParse({ ...seedData.articles[0], slug: "Not A Slug" }).success, false);
assert.equal(articleInputSchema.safeParse({ ...seedData.articles[0], publishedAt: "yesterday" }).success, false);
assert.equal(articleInputSchema.safeParse({ ...seedData.articles[0], body: "x".repeat(100_001) }).success, false);
assert.equal(socialLinkInputSchema.safeParse({ icon: "/i.svg", label: "X", handle: "x", href: "#" }).success, true);

// --- placeholder links never reach the public site -------------------------

assert.equal(isLive("#"), false);
assert.equal(isLive("  "), false);
assert.equal(isLive(""), false);
assert.equal(isLive("https://example.com"), true);
assert.equal(isLive("/notes"), true);

console.log("api security regression checks passed");
