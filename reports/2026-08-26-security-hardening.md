# Security hardening verification — 2026-08-26

Incident: `INC-20260826-002`
Change: `CHG-20260826-003`

## Root cause

`LOCAL_OWNER_ACCESS` treated a hostname parsed from the request URL as proof that the caller was local. Host-derived request data is attacker-controlled or proxy-controlled and is not an authentication factor.

## Resolution

- Removed the bypass; administrator and tenant routes always require a valid Bearer credential.
- Added signup invitation, rate, tenant, body, field and array boundaries.
- Added secure response headers, loopback-only Docker defaults and a bounded asset downloader.
- Replaced the vulnerable nested esbuild while preserving stable Drizzle versions.

## Evidence

- Before: unauthenticated administrator requests returned 200 while local-owner mode was enabled, including with forged Host values.
- After: ordinary unauthenticated and forged-loopback-Host requests both returned 401; the registered administrator credential returned 200.
- PostgreSQL probe save/read and original-value restore/read both returned 200 and matched expected values.
- `npm run security:check`, `npm run check`, `npm audit --audit-level=moderate`, `npm run db:generate`, `docker compose config`, and redacted gitleaks scanning passed.
- Browser checks confirmed the homepage baseline, invitation field, and administrator credential field.

## Remaining deployment boundary

The built-in signup limiter is process-local. Multi-instance public deployments require a shared edge/gateway limiter and ongoing abuse monitoring.
