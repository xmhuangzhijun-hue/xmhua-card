# Publishing login progress verification

## Failure and first break

The owner supplied an authenticated Xiaohongshu creator-page screenshot while the admin showed pending login. Read-only inspection found the local session saved at 18:29 +08 and a successful authentication report at 18:30. The worker was online. This differs from the earlier missing-browser/static-resource failure: authentication succeeded, but the frontend did not distinguish queueing, active login, session validation and completion. Repeated clicks created additional account tasks.

## Change and checks

- Account controls now render queued/running status and disable duplicate login/check actions until completion. POST responses update state immediately, followed by regular refreshes.
- The API serializes enqueue transactions using a worker-row lock and suppresses pending account tasks for each requested platform. Publish request idempotency remains unchanged.
- API typecheck, security regression, publishing regression (including simultaneous different-request-ID submissions and running-task deduplication), frontend lint/typecheck and the Linux production build passed.
- Candidate API initially failed its fixed 3-second health probe. Logs showed normal successful startup after 9 seconds; production still pointed at the retained release. Continued only after checking actual state, with bounded readiness polling. Sequential API and frontend candidate probes then passed.
- Release 20261002T1035Z-login-progress is active for API and frontend. Retained 20260930T1608Z-video services were healthy and served the authenticated admin immediately before the switch. No database migration or dependency changes were needed.
- Live browser showed a disabled account button with queued/running progress and a successful Channels account with a re-login button. Live account receipts confirm Xiaohongshu and Channels authentication. One redundant queued Xiaohongshu login was cancelled; another had started in the meantime and was deliberately left running.

## Limits

Final same-path verification: the already-running legacy duplicate failed at 18:39 and temporarily replaced Xiaohongshu's account flag with unauthenticated. A fresh check of the unchanged saved session completed at 18:40:45 +08 with authenticated=true, without scanning or changing cookies. At 18:41 the actual production admin rendered both Xiaohongshu and Channels as 已登录, with 重新登录 buttons. No queued/running account tasks remained. A 390px viewport had no horizontal page overflow. The screenshot is retained in the local task's outputs; it is excluded from the public repository.

Login success does not establish successful video publishing. No social content was published. Douyin, Bilibili and YouTube remain unverified. The worker still runs locally; cloud-only execution remains pending server capacity/connectivity resolution. Earlier autostart execution acceptance also remains unverified.
