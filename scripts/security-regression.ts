import assert from "node:assert/strict";
import { homepageContentSchema } from "../src/lib/content-schema";
import { isAdminCredential } from "../src/server/admin-auth";
import { seedHomepageContent } from "../src/server/seed-content";
import { enforceSignupRateLimit, requireSignupInvite } from "../src/server/signup-guard";
import { safeDownload } from "./safe-download.mjs";

process.env.ADMIN_API_KEY = "regression-admin-key";
assert.equal(isAdminCredential(new Request("http://127.0.0.1/api/admin/tenants", { headers: { host: "127.0.0.1" } })), false);
assert.equal(isAdminCredential(new Request("http://attacker.example/api/admin/tenants", { headers: { authorization: "Bearer regression-admin-key", host: "127.0.0.1" } })), true);

homepageContentSchema.parse(seedHomepageContent);
assert.equal(homepageContentSchema.safeParse({ ...seedHomepageContent, articles: Array.from({ length: 101 }, (_, id) => ({ id, category: "x", title: "x", excerpt: "x", publishedAt: "x", href: "#" })) }).success, false);

process.env.SIGNUP_INVITE_CODE = "regression-invite";
requireSignupInvite("regression-invite");
assert.throws(() => requireSignupInvite("wrong-invite"), /INVALID_INVITE_CODE/);
process.env.SIGNUP_RATE_LIMIT = "1";
const signupRequest = new Request("http://localhost/api/signup");
enforceSignupRateLimit(signupRequest);
assert.throws(() => enforceSignupRateLimit(signupRequest), /SIGNUP_RATE_LIMITED/);

async function verifyDownloadBoundary() {
  await assert.rejects(() => safeDownload("http://127.0.0.1/private", "ignored"), /blocked/);
  await assert.rejects(() => safeDownload("file:///etc/passwd", "ignored"), /HTTP\/HTTPS/);
}

verifyDownloadBoundary()
  .then(() => console.log("security regression checks passed"))
  .catch(error => { console.error(error); process.exitCode = 1; });
