# EXP-20261007-001
Cached successful login is evidence at check time, not evidence at publication time. Current saved session redirected to login; original upload failure remains unknown because diagnostics were discarded. Preserve unknown outcomes and check platform state before re-uploading. Never derive historical causes from a later symptom alone.

Implementation: codex_publish.account_state and action_diagnostics.Diagnostics. Verification: 32 isolated tests plus current-session read-only navigation. User-visible recovery remains pending owner login. Audit lesson: planned-event rejection must stop dependent execution; separate tool calls enforce the gate.
