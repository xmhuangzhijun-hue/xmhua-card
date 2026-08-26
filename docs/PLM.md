# Product lifecycle management

This repository uses a lightweight but strict product lifecycle. GitHub Issues are the demand and defect record, Pull Requests are the controlled implementation record, milestones are the release scope, and Releases are the immutable delivery receipt.

## Lifecycle

| Stage | Required record | Exit criteria | Status label |
| --- | --- | --- | --- |
| Intake | Issue form with observable problem or desired outcome | Reproducible or decision-ready | `status: needs triage` |
| Triage | Owner, priority, type, affected area, target milestone | Founder accepts, defers, or closes | `status: accepted` or `status: backlog` |
| Planned | Milestone with explicit scope | Acceptance criteria and dependencies are clear | `status: planned` |
| In progress | Linked branch and draft/active PR | Implementation and required records complete | `status: in progress` |
| Verification | PR evidence for tests, security, API, database, and UI paths as applicable | CI passes, CODEOWNER approves, discussions resolve | `status: ready for release` |
| Released | Signed-off merge and version tag | GitHub Release and changelog published | `status: released` |
| Observed | Issue/incident follow-up | No recurrence or follow-up work is scheduled | Issue closed or next Issue linked |

## Classification

Every accepted Issue has exactly one priority and one target milestone:

- `priority: P0` — active compromise, data loss, or production-wide outage; interrupt current work.
- `priority: P1` — security boundary, authentication, release-blocking regression, or major user path failure.
- `priority: P2` — normal product defect or committed feature.
- `priority: P3` — improvement, cleanup, or research without a committed delivery date.

Use existing type labels such as `bug`, `enhancement`, and `documentation`. Security exploit details stay in a private advisory; a public Issue may track only sanitized remediation work.

## Release planning

- Overall product releases use semantic `vMAJOR.MINOR.PATCH` tags.
- Frontend and backend component versions may advance independently, but the milestone states which component versions compose the overall release.
- Milestone scope freezes before release. New work moves to a later milestone unless the founder marks it release-blocking.
- Every release requires `CHANGELOG.md`, `docs/DEVELOPMENT_LOG.md`, passing CI, and a generated GitHub Release.
- A release-blocking P0/P1 Issue cannot be silently deferred; the founder records the disposition in the Issue.

## Pull request contract

Each Pull Request must link its Issue, identify the milestone, describe user-visible and API/data effects, include verification receipts, and state rollback or forward-fix guidance. Changes to authentication, tenant isolation, downloads, dependencies, CI, database schema, or repository governance require explicit security-impact notes.

No green check alone proves completion. The evidence must match the affected user path, and database-dependent claims must distinguish code completion from a real PostgreSQL write/read verification.

## Access review

The founder reviews collaborator access after each release and removes permissions that are no longer needed. `admin` remains founder-only; `maintain` is not part of the normal contributor path. Contributors can always participate through Issues, forks, and Pull Requests without repository write access.
