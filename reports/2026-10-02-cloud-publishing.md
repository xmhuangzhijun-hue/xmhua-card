# Cloud publishing acceptance — 2026-10-02

## User-visible result

The admin now selects the cloud publishing service. The Windows helper was stopped, its startup shortcut disabled, and its worker registration revoked. The cloud service was restarted, then the real admin queued fresh checks: Xiaohongshu and WeChat Channels both returned authenticated and displayed 已登录. The other three accounts are honestly unauthenticated until their owner completes platform login.

The production noVNC iframe connects over the blog's HTTPS session. Anonymous desktop access returns 401 and a request without the allowed WebSocket Origin returns 403. The backend regression additionally covers missing configuration, another tenant and a revoked cloud worker. Display and WebSocket listeners bind only loopback.

## Verification

- API typecheck, security regression and build; publishing regression covering auth, tenant isolation, idempotency, receipt ownership and no automatic replay: PASS.
- Frontend lint/typecheck and 69-page Linux production build: PASS.
- Actual cloud adapter: empty private account rejected, matching Chromium/context and bundled init script initialize: PASS, including the final navigation wrapper.
- Actual admin -> cloud queue -> upstream check -> persisted receipt -> refreshed account label: PASS for the two migrated accounts, after local shutdown and cloud restart.
- Production iframe root-relative WebSocket URL: connected. The first relative URL doubled its prefix and failed; fixed before final acceptance.
- Real 2,295-byte MP4 uploaded through the admin file input. The cloud worker's authenticated download produced the original SHA-256 `2642c56a6c0749f3f29944ab8848d14ce35ddd49365358c0fd18a02fa4d73f17`. The exact test file, temporary copy and database row were removed. No publish task was created.
- Dedicated service account, private session permissions, enabled systemd units, manual worker restart, live heartbeat and revoked local registration verified.

## Runtime decisions and recovery

Pinned social-auto-upload revision `0012d2c355f88f683cc38dde2a2db209e14091bc`, Patchright 1.58.2, Chromium 145.0.7632.6 (revision 1208), noVNC 1.6.0, websockify 0.13.0 and biliup-cli 1.2.11. Reused the host's existing outbound route for YouTube only; did not alter that service. Server-side video storage and worker session storage remain separate and private.

Official Linux wheels were downloaded with the normal pip resolver and installed offline after slow remote downloads. A first Xiaohongshu check exceeded the upstream navigation budget on this constrained host. Read-only diagnosis reached HTTP 200 at the creator upload route, with an upload control and no login box; the cloud-only 90-second navigation limit then passed the original queue path. No authenticated flag was edited by hand.

API release `20261002T1130Z-cloud-publisher`, web release `20261002T1150Z-cloud-publisher`. Retained prior login-progress API/web and the immediately preceding web release. Candidate startup probes passed; worker recovery was exercised by a real restart followed by fresh authenticated checks. Prior web artifacts were archived and checksum-verified before removing unused old releases; an active old release and retained API dependency release were excluded. Original private local account files remain available for an explicitly chosen rollback, with their worker token revoked.

## Limits

No real social video was submitted or published. Multi-platform submission, platform review and public URLs remain unverified without owner-selected content. Douyin, Bilibili and YouTube require initial account authorization. The small cloud host has constrained memory and disk; cold login/checks can take minutes, and large uploads may be rejected by the existing free-space guards. Automatic service startup is configured; no full host reboot was performed. Source changes remain on the feature PR, with protected-branch review preserved.
