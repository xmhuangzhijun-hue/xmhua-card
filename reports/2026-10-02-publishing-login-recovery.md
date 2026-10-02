# Publishing login recovery

Before recovery, the worker process was absent, lastSeen was 2026-10-02T05:56:20.748Z and no new login jobs existed. Every platform login button is disabled when the worker is offline.

Restarting the existing worker restored the online indicator and enabled all five buttons. Clicking Xiaohongshu produced a real running login task, followed by needs_attention without a window. Directly launching the same pinned Patchright Chromium channel reproduced a missing executable error. Upstream Xiaohongshu's login and upload paths use the bundled Chromium channel independently of the configured system Chrome. The earlier unauthenticated checks never exercised those paths.

The owner approved current-user Windows login autostart. The Startup shortcut invokes the existing launcher without credentials in its command; invoking the launcher again leaves the current worker unchanged. Actual reboot acceptance is not claimed.

The missing runtime comes from the official Playwright CDN's Chrome for Testing 145.0.7632.6 Windows artifact, expected length 181196793 and HTTPS response MD5 d2889c5c2fadbd9d2271d512a063cac9. Slow default transfer prompted segmented retrieval of that same artifact. ZIP integrity and checksum must pass before extraction; runtime and visible login verification are required before declaring recovery complete.

No account credentials were entered and no social video publication was requested. Existing failed login receipts remain visible; no failed publication was replayed.

## Final verification

The official artifact passed length, MD5 and ZIP-integrity checks. Matching Chromium 145.0.7632.6 launched successfully. Actual login exposed the next initialization failure: the private state root lacked upstream `utils/stealth.min.js`. A blank browser-context probe reproduced FileNotFoundError without using an account or external platform. Only `utils.base_social_media.BASE_DIR` now points at the upstream resource root; the global conf.BASE_DIR remains private for cookies and logs. The identical context probe then passed.

At 2026-10-02 17:04 +08:00, the production admin login button created a new Xiaohongshu task, the worker launched a visible Chrome window with the expected platform login title, and the task remained running for the owner to scan. Account authentication itself is not claimed.

The Windows Startup shortcut was saved and the underlying guarded launcher was verified against an already-running worker. Automatic approval rejected the separate shortcut-execution test with “blocked by policy”; actual Windows-login autostart remains unverified. No workaround was used for that rejected test.
