# Channels session and receipt incident — 2026-10-07

## Observed before changes
- Local worker online. Prior account check succeeded at 2026-10-06T06:53:23Z.
- Two Channels publication jobs ended needs_attention with generic upload-unconfirmed messages. Latest job f5f55e64-3cb6-4b0c-ab29-ed3a8d152664, request 96d3c0c4-6687-4991-9ce6-ce72e6acf0bc. Earlier job 18123ba4-3fcc-447c-a084-dd2d3dad8ace.
- A read-only browser using the saved Channels session navigated to the content list and was redirected to /login.html. Current stored session is rejected; this does NOT establish the exact failure stage of either historical publication.
- Worker discarded subprocess stdout/stderr. Upstream catches exceptions, so historical error details cannot be recovered. No duplicate video upload or publication was attempted.

## Local changes
Cached Channels success must be under five minutes old; a later failed job invalidates prior success. This is a conservative freshness rule, not a claim about platform cookie lifetime. A stale check stops CLI publication before the asset upload/job write and returns ACCOUNT_CHECK_REQUIRED. Check saved sessions first, then log in only if needed.

The existing upstream setup already checks the session at publication time. A thin wrapper now records allowlisted phases and outcome codes against the existing pending job ID, privately and atomically; no exception strings, URLs, titles, cookies or account data are recorded. MCP jobs reads the safe receipt. Nonzero upstream returns cannot be marked completed.

Existing MCP host processes need connection reload for updated status/receipt formatting. CLI and worker action children read updated files on their next invocation. No worker restart, installation, cloud release or resource change.

## Verification and limits
32 isolated tests pass, covering stale account rejection before asset upload, failure invalidation/recovery, sanitized diagnostics, nonzero results, MCP error mapping, original publication no-replay and deletion safeguards. Wrappers installed successfully against actual upstream classes without running a publish action. Fresh real status changed from cached success to needs_check, then reported a negative check after the login attempt. Platform content/draft inspection and successful publication remain unverified.

## Recovery action / audit
MCP login timed out with unknown outcome after 420 seconds. Queue was independently read before and after, showing no new login task; this was evidence for a single CLI recovery attempt. CLI created login job a79f0f4e-e846-4d69-a0c5-2e589b8baffd, request 1d902d55-a63e-4e5f-99c8-8c0eabe85347. User was asked to complete scanning. By 2026-10-06T16:16:10Z, account check was negative and queue empty; authorization was not restored.

Execution sequencing defect: a chained shell command continued to CLI login after the second planned audit record was rejected as a duplicate trajectory. This was an agent error, not successful admission. No retrospective planned approval is claimed. Future external commands must be separate calls after checking accepted record result, never unconditional shell continuation. The original login request was authorized by the task; no content was published or deleted.

## Continue
Read this exact login receipt and account state before any new login request. Owner authentication is still needed. Once restored, read platform content and drafts for the earlier attempts; do not resubmit their video or create a new plan to bypass uncertainty. Keep incident open until the real user path is verified.
