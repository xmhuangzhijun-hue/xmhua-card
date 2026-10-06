# Douyin endpoint reference

OpenCLI by jackwener and contributors, Copyright 2025 jackwener, Apache-2.0.
Source: https://github.com/jackwener/opencli/tree/24136945847afbfad266c6c46a8cd335377f9112/clis/douyin
License: [OPENCLI-LICENSE](OPENCLI-LICENSE).

The local Python adapter refers to OpenCLI profile.js, videos.js, delete.js and
_shared/browser-fetch.js for creator endpoints and browser-authenticated fetching.
Modified/reimplemented for the existing Patchright environment and private saved
sessions. No extension, OpenCLI package or background service is installed.

Differences: exact string aweme_id only (never rounded numeric item_id), full
pagination with fail-closed completeness checks, owner and caption revalidation,
private expiring previews, per-video durable no-replay receipt, one POST only,
no positional UI selection and no fallback after ambiguous deletion. The write
endpoint may change; a rejected/empty response is unknown, never success.
