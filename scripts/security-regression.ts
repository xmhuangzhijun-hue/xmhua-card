import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { homepageContentSchema } from "../src/lib/content-schema";
import { isAdminCredential } from "../src/server/admin-auth";
import { seedHomepageContent } from "../src/server/seed-content";
import { enforceValidSignupAttempt, requireSignupInvite } from "../src/server/signup-guard";
import { blockedAddress, safeDownload } from "./safe-download.mjs";

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
for (let attempt = 0; attempt < 10; attempt += 1) assert.throws(() => enforceValidSignupAttempt(signupRequest, `wrong-${attempt}`), /INVALID_INVITE_CODE/);
enforceValidSignupAttempt(signupRequest, "regression-invite");
assert.throws(() => enforceValidSignupAttempt(signupRequest, "regression-invite"), /SIGNUP_RATE_LIMITED/);

async function verifyDownloadBoundary() {
  await assert.rejects(() => safeDownload("http://127.0.0.1/private", "ignored"), /blocked/);
  await assert.rejects(() => safeDownload("file:///etc/passwd", "ignored"), /HTTP\/HTTPS/);
  assert.equal(blockedAddress("::ffff:127.0.0.1"), true);
  assert.equal(blockedAddress("::ffff:7f00:1"), true);
  assert.equal(blockedAddress("::ffff:169.254.169.254"), true);
  assert.equal(blockedAddress("192.0.2.1"), true);
  assert.equal(blockedAddress("198.51.100.1"), true);
  assert.equal(blockedAddress("203.0.113.1"), true);
  assert.equal(blockedAddress("192.1.1.1"), false);
  assert.equal(blockedAddress("198.51.101.1"), false);
  assert.equal(blockedAddress("203.0.114.1"), false);

  const directory = await mkdtemp(join(tmpdir(), "xmhua-safe-download-"));
  const destination = join(directory, "asset.png");
  let connectedAddress = "";
  const fakeRequest = async (target: { address: string }) => {
    connectedAddress = target.address;
    const response = Readable.from([Buffer.from("png")]) as Readable & { statusCode: number; headers: Record<string, string> };
    response.statusCode = 200;
    response.headers = { "content-type": "image/png", "content-length": "3" };
    return response;
  };
  try {
    const result = await safeDownload("https://assets.example/image.png", destination, {
      resolver: async () => [{ address: "93.184.216.34", family: 4 }],
      request: fakeRequest,
    });
    assert.equal(connectedAddress, "93.184.216.34");
    assert.equal(result.bytes, 3);
    assert.equal((await readFile(destination)).toString(), "png");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const cli = spawnSync(process.execPath, [join(process.cwd(), "scripts", "safe-download.mjs"), "file:///etc/passwd", destination], { encoding: "utf8" });
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /Only HTTP\/HTTPS URLs are allowed/);
}

verifyDownloadBoundary()
  .then(() => console.log("security regression checks passed"))
  .catch(error => { console.error(error); process.exitCode = 1; });
