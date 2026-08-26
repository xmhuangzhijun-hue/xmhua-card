import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = /^(image|video|font)\//i;

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
    if (!ALLOWED_TYPES.test(contentType) && contentType !== "text/css") { response.destroy(); throw new Error(`Blocked content type: ${contentType || "unknown"}`); }
    const rawLength = Array.isArray(response.headers["content-length"]) ? response.headers["content-length"][0] : response.headers["content-length"];
    const declared = Number(rawLength ?? 0);
    if (declared > maxBytes) { response.destroy(); throw new Error("Download exceeds size limit"); }
    const chunks = [];
    let total = 0;
    for await (const chunk of response) {
      const value = Buffer.from(chunk);
      total += value.byteLength;
      if (total > maxBytes) { response.destroy(); throw new Error("Download exceeds size limit"); }
      chunks.push(value);
    }
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.concat(chunks));
    return { url: target.url.toString(), contentType, bytes: total };
  }
  throw new Error("Download failed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , source, destination] = process.argv;
  if (!source || !destination) throw new Error("Usage: node scripts/safe-download.mjs <url> <destination>");
  safeDownload(source, destination)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
