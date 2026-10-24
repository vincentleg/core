# CORE — R15 V1 production release, 2026-10-23
Worktree `.core-local/worktrees/v9.8/.core-local/worktrees/r12-release`, sanitized `release/r10-public`; release commit `85718d6` (R14) pushed to origin (fast-forward from `0c5f3d4`, pre-push integrity scan 0 findings); no merge into main; private project store untouched.
Production: https://creationofrebornearth.com (www.creationofrebornearth.com → 308 to apex), existing Vercel project `core`, deployment `dpl_AUzAHcoxKygDdKwfLJajnnYsL9Zo` (core-qs03hl04x-vincentleg.vercel.app), CLI deploy of `public/` built from `85718d6`; previous production `dpl_5aEdvgQWWNANJCAAqiHXAkHhsWjk` kept for rollback.
Release correspondence: all 204 published files byte-identical (SHA-256) between local `public/` and live; `integrity-check --all` 849 files, 0 findings.
Live verification: R12 six pages + eight-step autonomous demo + CORE World handoff and R13 journeys (Earth layers, mission, contribution → My CORE → review request, nine pages, menu, language persistence) passed desktop and mobile against production.
Private isolation live: 14 pages, 0 requests to localhost/127.0.0.1/.core-local/private paths, 0 page errors; third-party hosts only openfreemap, NASA GIBS, s3.amazonaws.com; internal pages, docs, scripts, state, .env and .vercel return 404; security headers present; published CSP has no local-model endpoint.
R14 QA (recorded): 13 pages × 3 viewports, 0 overflow/errors/sampled contrast failures; evidence `.core-local/evidence/r14/`.
Known, non-blocking: initial-render layout shift on dialogue/report/My CORE; Earth page ~7 MB; some 20–23 px text links; plans detail English-only; translations are model-written drafts.
Risks: Safari/WebKit not tested (founder waived); deleted-branch cached objects still need host purge; third-party tile/imagery availability.
Next: none authorized; any further phase requires founder authorization.
