import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

/** Interactive-login cost. Roughly 100ms on the deployment target. */
const params = { N: 16384, r: 8, p: 1 };
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, keyLength, params);
  return `scrypt$${params.N}$${params.r}$${params.p}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts as [string, string, string, string, string, string];
  const options = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
  if (!Number.isFinite(options.N) || !Number.isFinite(options.r) || !Number.isFinite(options.p)) return false;
  const expected = Buffer.from(rawKey, "base64");
  const derived = await scryptAsync(password, Buffer.from(rawSalt, "base64"), expected.length, options);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Login must take about the same time whether or not the username exists,
 * otherwise response timing enumerates accounts.
 */
export async function burnPasswordTime() {
  await scryptAsync("no-such-account", randomBytes(16), keyLength, params);
}
