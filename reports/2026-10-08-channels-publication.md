# Channels publication recurrence — 2026-10-08

## Read-only diagnosis before changes

Owner reports repeated failure after the prior login-state repair. Worker online, queue empty. Later login checks succeeded at October 7 23:35 and October 8 00:15. They do not prove current authorization, but the later failed uploads progressed beyond login.

| Job | Local final time | Evidence |
| --- | --- | --- |
| ad2c6e62-4863-47de-9967-cd17e8d88253 | Oct 7 23:50:50 | submit/upstream_failed |
| 17b36887-6db8-435a-8f75-2895c2222b10 | Oct 8 00:02:20 | fill_form/upstream_failed |
| da721f1f-8849-4b19-9b2d-b52564a257db | Oct 8 00:31:43 | worker interrupted; last phase fill_form/running |

Related publication log records owner-completed identity verification for episode 1, followed by submit failure; episode 2 waited around ten minutes in form preparation. Source prepare_video_for_publish waits for the identity-verification dialog to disappear before filling text. Broad receipts do not prove every precise failure cause. The owner's reported verification success is retained, not dismissed as a missed scan.

Pinned upstream submit_publish removes .mask/.common-dialog nodes, forces DOM clicks after click errors, retries submission up to twenty times, and treats leaving the editor/button disappearance as success. These are evidenced handling defects, not proof of the original platform rejection reason. Worker logs show restarts/connectivity warnings but have no timestamps; they cannot be attributed to the 00:31 interruption. OS boot was October 6; no matching reboot event was returned for that window.

Browser inventory found an existing Channels editor tab. Binding that exact tab was explicitly blocked by browser site-safety policy. No alternate surface, raw CDP, browser script or authenticated endpoint was used to retrieve the blocked page. Asked owner for the visible prompt; response pending. No publication, login or account refresh was attempted.

## Local changes

The local channels_submission adapter replaces only submission. It requires the editor and a visible enabled button; one normal click, no DOM removal, forced click or retry. Owner verification remains intact before/after the click. Returning success requires exact title text visible on the content-list route; navigation elsewhere/button disappearance remain unconfirmed. A matching list entry does not prove moderation/public visibility or globally unique content identity.

Diagnostics separate verification, title, description and short title. Allowlisted codes retain verification_timeout, submit_not_ready and submit_unconfirmed without raw exception text. Worker children load the change for the next authorized job; existing MCP connections need reload for the extended diagnostic allowlist. No service/config changes, upstream edits or cloud cost increase.

## Verification and limits

49 tests pass with the MCP interpreter: no repeated timed-out click, disabled/wrong-page refusal, no click before verification, false-success rejection, list evidence, specific safe errors, and existing publication/deletion/session regressions.

Initial full-suite run used the browser virtualenv: 38 tests passed, MCP module import failed because that environment has no MCP SDK. Using the existing MCP interpreter passed all 49 without installation. Pinned-upstream binding separately passed without browser/network. Initial binding probe had a temporary log cleanup failure due to upstream open handlers; closing them in the corrected harness produced exit 0.

Live publication recovery is **unverified**. These changes protect submission and attribution, not establish why verification stayed open or platform submission failed. Current visible prompt and content/draft records are needed before posting. Preserve existing request IDs; no new plan to replay uncertain jobs. Browser-policy refusal prevents live readback this turn.
