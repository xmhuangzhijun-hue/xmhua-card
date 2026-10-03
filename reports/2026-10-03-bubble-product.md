# Bubble Arena product publication

Issue: #11. Milestone: Browser games portfolio.

- Product: [homepage products](https://huangzhijun.online/#products).
- Play: [blog-hosted game](https://huangzhijun.online/play/bubble-arena/).
- Source: [bubble-arena](https://github.com/xmhuangzhijun-hue/bubble-arena), initial commit `8213f0f3dddfabebc62375c3253bdf6e31179f4d`.
- Runtime files: 2,860,352 bytes. Archive SHA-256: `33a281eb5ccc71b2e81815fa2cd2a3443990d46da574c625aece8032a9b6d142`.

## Evidence and limits

The public repository is independently readable without login. It contains only the game distribution, core test, README, licenses, third-party notices and ignore/line-ending configuration. Twelve core assertions pass; the secret scan reports no leaks. Browser libraries are vendored with their official MIT licenses. Art is generated/repainted rather than extracted from the referenced Flash game.

Product 15 was created once after authenticated duplicate/baseline inspection. All eight preceding products retain all fields and order, and all other public content matches the baseline. The homepage response contains the game card/link. The work page is a separately authored engineering showcase and does not render the CMS product list; it was verified for availability rather than incorrectly required to contain the new card.

All game resources are checked against the uploaded release archive. Git text uses LF; the Windows archive has CRLF conversion, so source equivalence is additionally checked after line-ending normalization. Binary atlas bytes are identical. The canonical trailing-slash redirect retains the room query. Game menu and footer each contain the actual source link.

Existing application versions and adjacent public routes remain available. The static route uses the existing web server; it introduces no new application process, database table or dependency installation. It retains an exact pre-change web-server configuration backup. Backup equality and syntax were verified; an actual rollback was not performed. To reverse, unpublish only product 15 and restore the retained configuration, validate syntax, then reload the existing server. Static files may remain for inspection.

The supported browser tool failed inventory transport and timed out creating the game tab. This release therefore has no new GUI, mobile-touch or separate-physical-network gameplay acceptance. Earlier localhost two-browser joins, ready states, movement, bubbles, pause, results, rematch and cooperation are narrower evidence. PeerJS public signaling and network traversal remain external dependencies.

Only documentation changes are proposed in this blog PR. Application build/type/lint checks were not rerun for these markdown records. Protected-branch review and any outstanding parent PR remain separate from the authorized static/CMS publication.
