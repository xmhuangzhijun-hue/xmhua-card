# Channels repeated account-check failure — 2026-10-07 evening

## Before modification
Owner reported the publishing assistant window was visibly logged in while two checks failed. Actual MCP worker online, queue empty. Login job 6b6f06aa-dec3-4d40-a5c0-2016489ba354 completed at 22:45:39; checks at 22:51 and 22:55 reported unverified. Saved account file still had 18:01:56 modification time (not refreshed by 22:45 login). Two unexpired cookies and local storage were present; expiration metadata does not prove server acceptance.

A read-only reproduction with the same saved state and original upload-deep-link navigation reached /login.html with a QR frame. Browser inventory connector failed, so the owner's visible window was not directly inspected. Do not claim that visible-window login is invalid or that its credentials were imported.

Source evidence: cookie_auth opens the upload deep link and treats absence of a login redirect/QR within 8 seconds as success; it never requires positive authenticated content or saves the refreshed context. Explicit login can take the already-valid branch and skip scanning/saving. Upstream open_upload_page itself documents that the upload deep link can render an empty shell and instead enters the homepage first. Earlier actual publish diagnostics distinguish one attempt reaching submit and another failing session_check; no blind repeat publication.

## Narrow local adapter change
Add channels_session.py only in the local wrapper, leaving the pinned upstream checkout untouched. All three alias paths (CLI check, upstream setup and uploader validation) use a homepage check requiring an authenticated route plus visible publish button or same-site editor file control. A login path/QR overrides positive markers, and blank shells time out as unconfirmed. Authenticated checks atomically refresh existing private state including IndexedDB. A collection/write failure preserves the original. Login completion uses the same positive evidence instead of URL/absence inference.

40 isolated tests pass, covering blank-page false success, positive home/editor evidence, QR/login rejection, atomic refresh and preservation on collection failure; previous publication/deletion/MCP safeguards remain. No user video uploaded, no cloud resource changes, no browser/security settings changed. Saved-state refresh is authorized account maintenance; no cookie values are exposed.

## Remaining verification
Actual worker check d40625a6-7284-4ce6-9aa9-d81ba8c567b7 is the first use of the new adapter. Its outcome and independent reopen verification are appended below. Current full-session lifetime and platform publication are not inferred from code tests.

## Real worker receipts

- 23:09:56: old saved state rejected by the new homepage/positive-evidence check (d40625a6-7284-4ce6-9aa9-d81ba8c567b7). This does not recover already-invalid state.
- 23:14:23: a single login request bf4ca313-7daf-4c86-9a3a-0e595dde4733 was queued. The owner initially saw no window; the process was headed and was still preparing the login flow. The owner subsequently reported login completed. No second login was issued.
- 23:16:53: login completed with positive validation; private saved-state mtime advanced to 23:16:48. No secrets inspected or exported.
- 23:18:00: independent worker check cd36d83a-2a13-4edd-8d4d-18cb21173581 / e41d0397-c15a-4bcc-8672-ad421360cb09 completed with valid login, without another scan. Saved-state mtime advanced to 23:17:55. This proves immediate cross-process reuse and refresh, not indefinite authorization.
- 23:25:19: delayed independent check 3d3aab3d-40f6-4446-af15-1ebb3e7d26c0 / 80e94179-49ab-497e-91fa-f97f998b2080 returned valid; private file refreshed at 23:25:13, over seven minutes after the preceding save and over eight minutes after owner login. No additional scan. The earlier immediate/several-minute symptom did not recur in this observation window.
- Authentication reuse acceptance passed; overnight/Windows-reboot behavior and actual publication remain unverified. No video publication was attempted. Previous submit-stage uncertainty remains unresolved. Server-side revocation can still require future owner authorization; no permanent-login claim.
