# Local publishing MCP acceptance

The owner requested direct publishing tools for Codex. Added a stdio facade with six tools over the existing local CLI. No public HTTP port, cloud browser, additional background service, dependency upgrade or test publication was introduced. The available official MCP SDK was reused.

Verified:

- Six facade tests cover preview without network, default publication rejection, changed-file rejection, stable plan identity, rights validation and stale-success state distinct from missing authorization.
- Existing CLI tests prove unknown submission is not replayed and changed content under the same request ID is rejected; existing QR tests still pass.
- A real SDK client initialized the server, discovered all six tools, called the rejected-default publication path without submitting anything, and read live account state over MCP.
- Codex registered the enabled `blog_publisher` stdio entry. The same saved command/arguments were used for the protocol probe. The client timeout accommodates the bounded upload command.

Limits: the current Codex conversation's tool catalog does not hot-load this entry during the active turn. Reload the connection/client before natural-language use. No video was publicly posted; a real authorized video still needs platform result verification. The real status probe observed an existing login task and did not interrupt or duplicate it.

Registration note: a full semantic comparison around `codex mcp add` detected a non-entry delta, with no retained before snapshot sufficient to attribute it to the CLI or concurrent edits. No whole-file rollback was attempted. The following timeout-only edit was independently checked to preserve every other then-current setting; the existing MCP names, approval policy and sandbox setting were read back. Do not claim whole-file preservation across the initial CLI operation.

Rollback: remove only the `blog_publisher` MCP entry. The browser worker, platform sessions and blog services are independent and remain available. No cloud release was changed.
