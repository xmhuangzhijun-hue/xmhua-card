# Guardrails

- Failed login returns safe BackendHTTPError at admin_login, closes the session and issues no upload/job request; test_codex_publish.py regression.
- MCP retains HTTP status/operation, drops untrusted response fields; test_publishing_mcp.py regression.
- Original publication no-replay and exact-plan authorization tests retained.
- Runtime maintenance checked exact three approved temporary files, regular paths, sizes and fuser absence; live DB and newest staging file preserved. No wildcard deletion.
- Disk retention is still an operational follow-up; shallow HTTP health is insufficient. Actual MCP status plus jobs and queued checks are the acceptance path.

- test_account_queue_uses_cli_core_without_child_or_stdout_mutation exercises the real CLI core with a fake API: one queue write, no Popen, no global argv/stdout changes. Fresh stdio MCP queue response: 4.65 seconds.
