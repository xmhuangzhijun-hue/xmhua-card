/**
 * Image uploads for the console (QR codes, icons).
 *
 * Only real raster images are accepted, decided by magic bytes rather than by the
 * declared content type or the client filename. SVG is refused on purpose: it can
 * carry script and would be served from the site's own origin.
 *
 * Stored names are the SHA-256 of the bytes, so uploading the same image twice is
 * idempotent, the served URL can be cached forever, and a client-supplied filename
 * never reaches the filesystem.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { env } from "../env.js";
import { ApiError, badRequest } from "./http.js";

const maxBytes = 2 * 1024 * 1024;

const signatures: { extension: string; mime: string; matches: (bytes: Uint8Array) => boolean }[] = [
  {
    extension: "png",
    mime: "image/png",
    matches: bytes => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte),
  },
  {
    extension: "jpg",
    mime: "image/jpeg",
    matches: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    extension: "webp",
    mime: "image/webp",
    matches: bytes =>
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  },
];

export type StoredUpload = { path: string; bytes: number; mime: string };

export async function storeImage(file: File): Promise<StoredUpload> {
  if (file.size > maxBytes) throw new ApiError(413, "FILE_TOO_LARGE");
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (buffer.byteLength === 0) throw badRequest("FILE_EMPTY");
  if (buffer.byteLength > maxBytes) throw new ApiError(413, "FILE_TOO_LARGE");

  const signature = signatures.find(candidate => candidate.matches(buffer));
  if (!signature) throw badRequest("UNSUPPORTED_IMAGE_TYPE");

  const digest = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
  const name = `${digest}.${signature.extension}`;

  await mkdir(env.uploadDir, { recursive: true });
  const target = join(env.uploadDir, name);
  // Content-addressed: if the identical file is already stored, keep the existing one.
  const existing = await stat(target).catch(() => null);
  if (!existing) await writeFile(target, buffer, { flag: "wx" }).catch(async error => {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  });

  return { path: `${env.uploadPublicPath}/${name}`, bytes: buffer.byteLength, mime: signature.mime };
}

export async function listImages() {
  await mkdir(env.uploadDir, { recursive: true });
  const names = await readdir(env.uploadDir);
  const files = await Promise.all(names
    .filter(name => /^[0-9a-f]{32}\.(png|jpg|webp)$/.test(name))
    .map(async name => {
      const info = await stat(join(env.uploadDir, name));
      return { path: `${env.uploadPublicPath}/${name}`, bytes: info.size, uploadedAt: info.mtime.toISOString() };
    }));
  return files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Only content-addressed names are removable, so no path can escape the directory. */
export async function deleteImage(name: string) {
  if (!/^[0-9a-f]{32}\.(png|jpg|webp)$/.test(name)) throw badRequest("INVALID_ASSET_NAME");
  await unlink(join(env.uploadDir, name)).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}

/** Reads a stored image for serving. Only content-addressed names resolve. */
export async function readImage(name: string) {
  const match = /^([0-9a-f]{32})\.(png|jpg|webp)$/.exec(name);
  if (!match) throw badRequest("INVALID_ASSET_NAME");
  const extension = match[2] as "png" | "jpg" | "webp";
  const mime = signatures.find(candidate => candidate.extension === extension)!.mime;
  const bytes = await readFile(join(env.uploadDir, name)).catch(error => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  });
  if (!bytes) return null;
  return { bytes, mime };
}
