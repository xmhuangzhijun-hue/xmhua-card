import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = /^(image|video|font)\//i;

function blockedAddress(address) {
  if (address === "::1" || address === "::" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (!isIP(address)) return true;
  const octets = address.split(".").map(Number);
  if (octets.length !== 4) return false;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function assertPublicHttpUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP/HTTPS URLs are allowed");
  if (url.username || url.password) throw new Error("URL credentials are not allowed");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => blockedAddress(address))) throw new Error("Private, local, metadata, or non-routable targets are blocked");
  return url;
}

export async function safeDownload(source, destination, options = {}) {
  const maxBytes = Math.min(options.maxBytes ?? MAX_BYTES, MAX_BYTES);
  let url = await assertPublicHttpUrl(source);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Unsafe or excessive redirect chain");
      url = await assertPublicHttpUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`Download failed with HTTP ${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
    if (!ALLOWED_TYPES.test(contentType) && contentType !== "text/css") throw new Error(`Blocked content type: ${contentType || "unknown"}`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new Error("Download exceeds size limit");
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error("Download exceeds size limit"); }
      chunks.push(value);
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.concat(chunks));
    return { url: url.toString(), contentType, bytes: total };
  }
  throw new Error("Download failed");
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const [, , source, destination] = process.argv;
  if (!source || !destination) throw new Error("Usage: node scripts/safe-download.mjs <url> <destination>");
  safeDownload(source, destination)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
