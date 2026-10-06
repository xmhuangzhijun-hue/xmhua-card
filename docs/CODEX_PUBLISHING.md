# Publishing from Codex

The local worker owns saved browser sessions. Codex submits jobs through the same authenticated administrator API as the dashboard. A successful platform login is reused until the platform invalidates it; a saved file alone does not prove the session still works. Keep the computer on and connected while a job runs.

`scripts/publishing/codex_publish.py` supports `status`, `check`, `login`, and `publish`. Supply `--config`, `--username`, and `--admin-secret-file` pointing to the registered private configuration and credentials. Never put actual cookies, tokens or passwords in command arguments or this repository.

1. Start the existing local worker and call `status`.
2. Call `check --platforms xiaohongshu tencent` to verify saved sessions. A negative account check is a nonzero exit, even when the check task itself completed.
3. Only call `login --platforms PLATFORM` when a saved session is unavailable/invalid. The owner completes scanning, SMS or Google verification. Never solve or bypass a security challenge.
4. For publication, obtain the actual file, platforms, final text and publication authorization from the user. Create a JSON plan with a fresh UUID `requestId`, local MP4 `file`, `platforms`, `title`, optional `description`, `tags`, `category`, and `original: true` only when rights are established.
5. `publish --plan PLAN` validates and previews without signing in or uploading. `publish --plan PLAN --confirm-publish` uploads and queues the authorized publication. Use the same plan and requestId when inspecting an interrupted attempt. A private fingerprint and submission journal prevent automatic replay and reject reuse with changed content.
6. Read platform receipts. `submitted` means the upload program finished, not that moderation passed or a public URL is verified. Exit 3 means still pending/unknown: inspect first, do not create another requestId to retry blindly.

The per-user Windows Task Scheduler host uses interactive logon and limited privileges so login windows appear on the owner's desktop. A one-minute recovery trigger and IgnoreNew instance policy restore an exited worker without launching a second live instance; restart-on-failure alone was insufficient in the actual recovery test. `managed_worker.py` writes only private UTF-8 logs; worker process identity is written after acquiring the profile lock. No cloud browser or new paid service is required.

No video has been publicly posted solely to validate this command entry.

## Local MCP connection

`scripts/publishing/publishing_mcp.py` is a stdio server using the official Python MCP SDK. It reuses the existing CLI and its no-replay submission journal. Optional dependencies are in `scripts/publishing/requirements-mcp.txt`; use a separate interpreter/environment from the browser worker.

Register it with `codex mcp add blog_publisher -- /absolute/path/to/python -B /absolute/path/to/publishing_mcp.py --config /private/worker.json --username ADMIN --admin-secret-file /private/admin-password.txt`. These arguments are file references, never secret values. Set `startup_timeout_sec = 20` and `tool_timeout_sec = 600` under its MCP table. Restart the MCP connection/client to load new tools. This local connection has no public URL or listening network port. Removal is `codex mcp remove blog_publisher`; it leaves the worker and saved sessions intact.

| Tool | Behavior |
| --- | --- |
| `publisher_status` | Read connectivity and account state; an old successful check is `needs_check`, not an expired login. |
| `publisher_check_accounts` | Queue saved-session checks, without opening a new login. |
| `publisher_login_account` | Request the existing owner-completed local login flow when necessary. |
| `publisher_prepare_video` | Validate the explicit local MP4 and content, save a private immutable preview plan with a file hash; no upload. |
| `publisher_publish` | With user-authorized `approved=true`, upload and submit the prepared plan. Retain its plan ID for uncertain outcomes. |
| `publisher_jobs` | Read recent task receipts or filter by plan/request ID. |

The host agent interprets the user's intent and authorization. The tool's boolean approval parameter is a guard against accidental default execution, not independent proof of human consent. The user can authorize concrete content and destinations in the original instruction; do not ask them to repeat that authorization. A new preview ID is not permission to retry an uncertain upload. The tool never reports platform moderation or public visibility as proven merely because an uploader exited successfully.

Suggested prompt: “Use blog_publisher to prepare this MP4 for Xiaohongshu and Bilibili with the following title and description. I own the publication rights. Show me the preview.” After concrete publication authorization, the agent can submit that exact plan and read its receipts. Account verification and CAPTCHA remain user actions when platforms require them.
