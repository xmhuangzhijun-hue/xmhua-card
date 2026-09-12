# WeChat Local Toolkit portfolio entry

The author requested adding the newly published, sanitized toolkit to the existing personal-blog project section.

- Published through the authenticated CMS as a new product, positioned second. The five existing products retain their relative order and editorial content.
- Copy describes exported-file organization, SQLite, Markdown and evidence-linked local AI review. It names historical wx_key / wechat-decrypt dependencies, links the toolkit repository, and does not claim current automatic key extraction or real-time capture.
- Added exactly one public repository to the reviewed GitHub source mapping. Runtime artifact comparison against the prior API proved that this one mapping line was the only deployed code difference.
- API typecheck, security checks, build, GitHub failure/adoption regressions and persistent snapshot/tenant-isolation regressions passed.
- Candidate API release `20260912T1230Z-wechat-project` passed startup checks; switched back to `20260912T0620Z-github-sync`, verified startup, then restored the candidate. Existing frontend and other services stayed active.
- The new repository's first public GitHub fact was fetched and atomically inserted into only its snapshot entry, preserving other projects and the scheduler's attempt time. A first helper invocation omitted database initialization and failed before any write; initialization was added after source inspection.
- CMS and public API readback confirmed the saved content and order. Public homepage subsequently returned the new card.

## Existing cache limitation

The frontend's ISR log reports a read-only filesystem when persisting regenerated page/fetch caches. The refreshed homepage serves the new card from the running process, but cache persistence across restarts remains a separate deployment configuration issue. No service permissions or frontend release were changed for this content addition.

The runtime addition does not imply that the parent feature branch or this follow-up has been merged to the default source branch.
