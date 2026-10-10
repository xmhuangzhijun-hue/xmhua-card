# Channels guardrails
- test_codex_publish.py: stale Channels checks cause no asset upload or job write; prior uncertain submissions are never replayed.
- test_action_diagnostics.py: failures invalidate cached success; fresh checks recover; diagnostics exclude secrets and nonzero exits cannot report completion.
- test_publishing_mcp.py: ACCOUNT_CHECK_REQUIRED becomes actionable needs_check without reflecting unknown fields.
- Existing destructive-action and publication approval tests remain passing.
- Verify with python -B -m unittest discover -s scripts/publishing -p 'test_*.py'. No live publication is part of this suite.
