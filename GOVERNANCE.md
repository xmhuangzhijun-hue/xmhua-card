# Project governance

## Ownership and founder control

`xmhua-card` is owned by the personal GitHub account `xmhuangzhijun-hue`. Repository ownership must not be transferred without the founder's explicit, out-of-band confirmation.

The founder is the only repository administrator and the required CODEOWNER for every change. Collaborators receive the minimum role needed for their current responsibility:

| Role | Intended use | May merge or change settings |
| --- | --- | --- |
| Triage | Classify Issues and Pull Requests, apply labels, manage milestones | No |
| Write | Implement accepted work through branches and Pull Requests | No direct merge to protected `master` |
| Maintain | Not granted by default | Not granted |
| Admin | Founder only | Yes |

New contributors normally begin through a fork or the `triage` role. A role increase requires sustained contributions, a documented reason, and founder approval. Inactivity, compromised accounts, or scope completion may result in access removal.

## Decision rights

- The founder owns product direction, release approval, security boundaries, collaborator roles, repository settings, and final merge decisions.
- Contributors may propose and implement changes but do not speak for the project without explicit delegation.
- Security vulnerabilities are reported privately through GitHub Security Advisories.
- Material architectural decisions are recorded in the relevant Issue or Pull Request; accepted product work must belong to a milestone.

## Change control

- `master` is protected and accepts changes only through Pull Requests.
- Required CI and contribution-governance checks must pass.
- The founder's CODEOWNER approval is required, stale approvals are dismissed after new commits, and all review conversations must be resolved.
- Force pushes and branch deletion are disabled.
- Direct emergency changes must still produce an Issue or incident record, verification evidence, a development-log entry, and a follow-up review.

The operational lifecycle is defined in [`docs/PLM.md`](docs/PLM.md).

## Continuity

The repository, release credentials, domains, deployment accounts, and production secrets remain under founder-controlled accounts. No collaborator should be the sole holder of a critical credential or deployment path. Recovery and ownership changes require explicit founder action; ordinary collaboration never implies ownership transfer.
