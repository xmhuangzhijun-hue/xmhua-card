import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { blockedAddress, safeDownload } from "./safe-download.mjs";

// Authentication, signup and content-schema regressions moved to api/ with the
// backend they cover. See api/src/scripts/security-regression.ts.

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
