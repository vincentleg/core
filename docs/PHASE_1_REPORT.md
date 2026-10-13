# Phase 1 — partial report / handoff checkpoint

Status: **IN PROGRESS, NOT ACCEPTED**. Development stopped at the founder's explicit request to hand off to Claude Code. Baseline: `56884e690027291080911d469c3bb59bfdac3509`. All current code is preserved in the handoff commit; do not restart.

Implemented: fail-closed evidence validation and safe blocked envelope; complete six-case stress/dependency contract; scenario isolation; bounded/cancellable agent searches; error recovery and stale-permit clearing; frame-time stepping and reduced DOM/redraw work; CORE World provisional wording; visible source/fallback/synthetic disclosures; local-only search; disabled Esri; map input guards and mobile layout changes. No paid services or dependencies added. See [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md) for exact behavior and commands.

| Acceptance item | Evidence / state |
| --- | --- |
| Invalid required numeric evidence never ready | Passing adversarial Node tests; final security/edge-case review still needed |
| Existing deterministic simulation behavior | Existing tests pass; five baseline scenarios matched Phase 0 exactly in a one-off comparison |
| Provenance visible/documented | Implemented; terrain regional terms remain explicitly uncertain |
| Available browser tests | Chrome attempted; Firefox partial; Safari automation unavailable |
| Globe/corridor workflows functional | 22 Chrome functional assertions pass, but uncaught MapLibre terrain/navigation exception remains |
| No paid dependencies/services | None introduced |
| Build/tests | Build succeeds; **19 tests pass, 0 fail**; diff whitespace check passes |
| Clean committed tree | Verify after handoff commit/push; not a Phase 1 completion claim |

Browser runs: Chrome 155.0.8059.40 (22 functional passes, overall FAIL on uncaught errors); Firefox 122.0 (13 initial passes, corridor controller timeout, later retry 0 passes due map-ready timeout); Safari 27.0.1 (NOT PERFORMED: remote automation disabled). Chrome mobile viewport 390×844 tested; no physical mobile validation. Structured results: [PHASE_1_BROWSER_RESULTS.json](PHASE_1_BROWSER_RESULTS.json). Full local evidence: ignored `test-results/phase1/`.

Main unresolved defect: MapLibre 5.6.0 `_updateRetainedTiles` reads `.key` on undefined after terrain/navigation toggles. Restoring separate hillshade/terrain sources did not fix it. Firefox CDP navigation/context handling needs diagnosis, and later visual/error-path checks are incomplete. Simulation remains synthetic/noncalibrated; the gateway is an internal contract validator without evidence authentication or real human signatures.

**Phase 2 readiness: not yet ready.** Resolve/restrict the unstable map path, finish available browser validation and final integrity/provenance review, then explicitly close Phase 1. Do not implement real streets during the handoff.
