# Local publishing restored — 2026-10-02

The owner chose local execution under the existing server budget. The website continues hosting the admin, queue, private uploaded assets and receipts. Platform browsers and upload execution now run on the local publishing computer.

## Changes

- Registered a new local worker and saved its token only in private credential storage; previously revoked tokens remain revoked.
- Reused the original local platform sessions without transferring credentials again.
- Restored the existing guarded local launcher and Windows login-startup shortcut.
- Revoked the cloud worker; stopped and disabled the worker, WebSocket and display services. Cloud software and private state were retained for recovery, with no running publisher processes.
- No paid resource changes, application deployment or database migration. The existing production UI derives its mode from the active worker; the API now returns `cloudWorkerId: null` and only the new local worker is active.

## Verified

- Actual local adapter with a fresh temporary private directory: correctly unauthenticated; matching browser, context and bundled scripts initialize.
- Real five-platform queued checks -> local worker -> persisted receipts: Xiaohongshu and WeChat Channels authenticated; Douyin, Bilibili and YouTube unauthenticated. No pending jobs remained.
- Local heartbeat fresh; repeat launcher invocation reports already running instead of creating duplicate work.
- Cloud publisher, WebSocket and display units: inactive, disabled, MainPID zero; no remaining processes for their dedicated account.
- Existing companion and blog services remained active. No unrelated service was stopped or reconfigured.

## Limits

Windows login startup is configured but was not tested by reboot. Automatic approval rejected launching the debugging browser without a detailed reason. The supported browser-tool fallback could not open/read the admin tab. No alternate debugging-browser startup or startup-shortcut execution was attempted. This turn therefore verifies runtime and business receipts, not a fresh complete UI walkthrough. No video was publicly submitted or published.

The computer must remain on and connected while tasks run. Existing cloud-side video asset storage still has its normal capacity limits; moving execution local does not create unlimited upload storage. Only the two existing accounts have validated sessions; the other platforms need the owner's first login.
