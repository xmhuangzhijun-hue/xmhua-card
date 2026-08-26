# Security Policy

## Supported versions

Security fixes are applied to the latest version of the `master` branch. Users
running an older commit or fork must update their own deployment.

## Reporting a vulnerability

Please do not disclose vulnerability details in a public issue, pull request,
discussion, or Discord message.

Use GitHub's private
[Report a vulnerability](https://github.com/xmhuangzhijun-hue/xmhua-card/security/advisories/new)
form instead. Include, when available:

- A clear description of the vulnerability and its potential impact
- The affected files, dependencies, configuration, or commit
- Steps to reproduce the issue or a minimal proof of concept
- Any suggested mitigation or fix

We will acknowledge the report as soon as practical, investigate it, and
coordinate with you before any public disclosure.

If the private form is unavailable, open a public issue containing only a
request for a private contact method. Do not include reproduction details.

## Scope

Security reports may cover:

- Code and dependencies shipped on the `master` branch
- Helper and synchronization scripts under `scripts/`
- Repository configuration or defaults that could make deployments insecure
- AI-agent instructions that introduce a concrete security vulnerability

Third-party services, vulnerabilities in unrelated websites, and automated
audit output without a demonstrated impact are outside this project's scope.

## Responsible use

This template is intended for authorized development, migration, recovery, and
learning. See [Not Intended For](README.md#not-intended-for) for prohibited
uses. Reports about abuse or copied content should not include sensitive
security details in public channels.
