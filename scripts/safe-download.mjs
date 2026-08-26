import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 20 * 1024 * 1024;
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_ROOT = resolve(REPOSITORY_ROOT, "public", "sites");

const ALLOWED_FORMATS = new Map([
  ["image/png", { extensions: [".png"], signature: value => value.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) }],
  ["image/jpeg", { extensions: [".jpg", ".jpeg"], signature: value => value.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) }],
  ["image/gif", { extensions: [".gif"], signature: value => value.subarray(0, 6).toString("ascii") === "GIF87a" || value.subarray(0, 6).toString("ascii") === "GIF89a" }],
  ["image/webp", { extensions: [".webp"], signature: value => value.subarray(0, 4).toString("ascii") === "RIFF" && value.subarray(8, 12).toString("ascii") === "WEBP" }],
  ["image/avif", { extensions: [".avif"], signature: value => value.subarray(4, 8).toString("ascii") === "ftyp" && /avi[fs]/u.test(value.subarray(8, 32).toString("ascii")) }],
  ["image/bmp", { extensions: [".bmp"], signature: value => value.subarray(0, 2).toString("ascii") === "BM" }],
  ["image/x-icon", { extensions: [".ico"], signature: value => value.subarray(0, 4).equals(Buffer.from("00000100", "hex")) }],
  ["image/vnd.microsoft.icon", { extensions: [".ico"], signature: value => value.subarray(0, 4).equals(Buffer.from("00000100", "hex")) }],
  ["video/mp4", { extensions: [".mp4"], signature: value => value.subarray(4, 8).toString("ascii") === "ftyp" }],
  ["video/quicktime", { extensions: [".mov"], signature: value => value.subarray(4, 8).toString("ascii") === "ftyp" }],
  ["video/webm", { extensions: [".webm"], signature: value => value.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex")) }],
  ["font/woff", { extensions: [".woff"], signature: value => value.subarray(0, 4).toString("ascii") === "wOFF" }],
  ["font/woff2", { extensions: [".woff2"], signature: value => value.subarray(0, 4).toString("ascii") === "wOF2" }],
  ["font/ttf", { extensions: [".ttf"], signature: value => value.subarray(0, 4).equals(Buffer.from("00010000", "hex")) || value.subarray(0, 4).toString("ascii") === "true" }],
  ["font/otf", { extensions: [".otf"], signature: value => value.subarray(0, 4).toString("ascii") === "OTTO" }],
]);

function confinedDestination(destination) {
  const target = resolve(REPOSITORY_ROOT, destination);
  const pathFromRoot = relative(ASSET_ROOT, target);
  if (!pathFromRoot || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
    throw new Error("Destination must be a file under public/sites");
  }
  return target;
}

function validatePayload(contentType, destination, payload) {
  const format = ALLOWED_FORMATS.get(contentType.toLowerCase());
  if (!format) throw new Error(`Blocked content type: ${contentType || "unknown"}`);
  const extension = extname(destination).toLowerCase();
  if (!format.extensions.includes(extension)) throw new Error(`File extension ${extension || "(none)"} does not match ${contentType}`);
  if (!format.signature(payload)) throw new Error(`File signature does not match ${contentType}`);
}

function mappedIpv4(address) {
  const value = address.toLowerCase();
  if (!value.startsWith("::ffff:")) return null;
  const suffix = value.slice(7);
  if (isIP(suffix) === 4) return suffix;
  const words = suffix.split(":");
  if (words.length !== 2 || words.some(word => !/^[0-9a-f]{1,4}$/u.test(word))) return null;
  const high = Number.parseInt(words[0], 16);
  const low = Number.parseInt(words[1], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function blockedAddress(address) {
  const mapped = mappedIpv4(address);
  if (mapped) return blockedAddress(mapped);
  const family = isIP(address);
  if (!family) return true;
  if (family === 6) {
    const value = address.toLowerCase();
    const first = Number.parseInt(value.split(":", 1)[0] || "0", 16);
    return first < 0x2000 || first > 0x3fff || value.startsWith("2001:db8:");
  }
  const octets = address.split(".").map(Number);
  const [a, b, c] = octets;
  return a === 0 || a === 10 || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && ((b === 0 && (c === 0 || c === 2)) || b === 168))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

async function resolvePublicHttpUrl(value, resolver = lookup) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP/HTTPS URLs are allowed");
  if (url.username || url.password) throw new Error("URL credentials are not allowed");
  const addresses = await resolver(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => blockedAddress(address))) throw new Error("Private, local, metadata, or non-routable targets are blocked");
  return { url, address: addresses[0].address, family: addresses[0].family };
}

function requestPinned(target) {
  const transport = target.url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const request = transport(target.url, {
      autoSelectFamily: false,
      headers: { "user-agent": "xmhua-card-safe-download/1.0" },
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
    }, resolve);
    request.setTimeout(30_000, () => request.destroy(new Error("Download timed out")));
    request.on("error", reject);
    request.end();
  });
}

export async function safeDownload(source, destination, options = {}) {
  const outputPath = confinedDestination(destination);
  const maxBytes = Math.min(options.maxBytes ?? MAX_BYTES, MAX_BYTES);
  const resolver = options.resolver ?? lookup;
  const request = options.request ?? requestPinned;
  let target = await resolvePublicHttpUrl(source, resolver);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await request(target);
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400) {
      const location = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
      response.resume();
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Unsafe or excessive redirect chain");
      target = await resolvePublicHttpUrl(new URL(location, target.url).toString(), resolver);
      continue;
    }
    if (status < 200 || status >= 300) { response.resume(); throw new Error(`Download failed with HTTP ${status}`); }
    const rawContentType = Array.isArray(response.headers["content-type"]) ? response.headers["content-type"][0] : response.headers["content-type"];
    const contentType = rawContentType?.split(";", 1)[0].trim() ?? "";
    if (!ALLOWED_FORMATS.has(contentType.toLowerCase())) { response.destroy(); throw new Error(`Blocked content type: ${contentType || "unknown"}`); }
    const rawLength = Array.isArray(response.headers["content-length"]) ? response.headers["content-length"][0] : response.headers["content-length"];
    const declared = Number(rawLength ?? 0);
    if (rawLength !== undefined && (!Number.isSafeInteger(declared) || declared < 0)) { response.destroy(); throw new Error("Invalid content length"); }
    if (declared > maxBytes) { response.destroy(); throw new Error("Download exceeds size limit"); }
    const chunks = [];
    let total = 0;
    for await (const chunk of response) {
      const value = Buffer.from(chunk);
      total += value.byteLength;
      if (total > maxBytes) { response.destroy(); throw new Error("Download exceeds size limit"); }
      chunks.push(value);
    }
    const payload = Buffer.concat(chunks);
    validatePayload(contentType, outputPath, payload);
    await mkdir(ASSET_ROOT, { recursive: true });
    await mkdir(dirname(outputPath), { recursive: true });
    const [realRepositoryRoot, realAssetRoot, realParent] = await Promise.all([realpath(REPOSITORY_ROOT), realpath(ASSET_ROOT), realpath(dirname(outputPath))]);
    if (relative(realRepositoryRoot, realAssetRoot) !== `public${sep}sites`) throw new Error("Asset root escapes the repository through a symbolic link");
    const parentFromRoot = relative(realAssetRoot, realParent);
    if (parentFromRoot === ".." || parentFromRoot.startsWith(`..${sep}`)) throw new Error("Destination escapes public/sites through a symbolic link");
    await writeFile(outputPath, payload, { flag: "wx" });
    return { url: target.url.toString(), contentType, bytes: total };
  }
  throw new Error("Download failed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , source, destination] = process.argv;
  if (!source || !destination) throw new Error("Usage: node scripts/safe-download.mjs <url> <public/sites/... destination>");
  safeDownload(source, destination)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
