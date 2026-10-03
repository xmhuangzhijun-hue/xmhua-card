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
