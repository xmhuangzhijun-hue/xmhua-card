# Frosted material refinement

Change: CHG-20260912-001. Public CSS only; accepted layout preserved.

Candidate: 20260911T1845Z-glass
Artifact SHA256: 64b2d9906362b941163aa2da3b850920b7c2b01ea2b511855447dc1c2f149a23
Rollback: 20260911T1735Z-observatory

Validation: production build (81 generation tasks), diff check; real browser dark/light project cards and 390px mobile layout. Project description expanded=true. Computed desktop blur 16px, mobile 10px, no document horizontal overflow. Reading paper rgb(255,255,255), backdrop-filter none. Native fallback and reduced-transparency rules included; no extra animation or dependencies.

Deployment succeeded: rollback and candidate restart probes passed; four services active. Public browser confirms 16px blur, alpha .86/.74 material and project expansion=true. No new console-code behavior introduced. Browser viewport restored.
