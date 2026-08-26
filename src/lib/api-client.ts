const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";

export function apiUrl(path: string) {
  if (!path.startsWith("/")) throw new Error("API path must start with a slash");
  return configuredApiBaseUrl ? `${configuredApiBaseUrl}${path}` : path;
}
