# Douyin deletion MCP — 2026-10-06

## Scope

Add deletion to the existing local MCP; owner selected Douyin first. Four new tools alongside six existing ones. No cloud deployments, new dependencies/services, worker restarts, config edits, Cookie export or actual video deletion.

## Evidence and design

- Existing SAU uploader/CLI has no published-video delete action.
- OpenCLI commit `24136945847afbfad266c6c46a8cd335377f9112` documents creator profile, paginated works, and browser-authenticated deletion. The installed browser runtime is sufficient; no additional extension/install required. Attribution/license included in scripts/publishing/THIRD_PARTY.md.
- Live saved-session browser read reached the creator management screen and returned one owned work. Its visible delete action opened a confirmation popover only after **all further requests were aborted**. No final confirmation was clicked. The popover has no dialog role, so a generic dialog locator was invalid; the final adapter does not rely on it.
- Subsequent live reads returned no works, with the same authenticated profile. Cause is unknown; this is not evidence of a deletion performed by this implementation. No POST to the delete endpoint was issued during development.
- Exact string aweme_id is mandatory: the API also returns a numeric item_id which loses precision inside JS. Never use it or a list index to choose a target.
- Preview binds account/ID/caption/creation time and expires after 15 minutes. Execution revalidates, persists a per-video receipt before spawning, then performs at most one deletion POST. New plan IDs cannot bypass the receipt.
- Deletion needs platform status_code=0 plus authenticated same-owner complete-list absence. Failed/empty responses, incomplete/cyclic pagination or interrupted readback are unknown, never successful. Read-only refresh reports absence separately without overwriting causal uncertainty.

## Verification

`python -B -m unittest discover -s scripts/publishing -p 'test_*.py'`

24 tests: 14 new deletion tests and 10 previous MCP/CLI/QR tests. Coverage includes missing approval before I/O, unsupported platforms, numeric precision, missing targets, preview expiration, durable pre-write state, crash/no replay across new plans, complete pagination, unchanged owner/caption, malformed response, one write without fallback, and unknown readback.

Real official MCP SDK initialize/tools/list using the registered command exposed 10 tools; deletion has destructive annotations and default false approval. Unapproved publish and delete rejected. `publisher_list_videos` read the live authenticated account without writes; existing `publisher_status` still returned the live worker and accounts.

## Limits and recovery

Live deletion was not authorized and was not tested. The write endpoint comes from upstream and may be retired or require changed parameters; an uncertain result stops for inspection without UI fallback. No claims of five-platform deletion or verified production deletion. Current host tool catalog still needs MCP connection reload to discover the new tools.

To withdraw the new entry points, restore the exact task files from the previous commit and restart only the MCP connection. Keep private deletion receipts; they prevent unsafe replay. Do not reset unrelated work or modify the saved account sessions.
