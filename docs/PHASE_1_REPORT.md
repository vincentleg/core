# Phase 1 — Prototype reliability & data honesty: closing report

Status: **CLOSED on 2026-10-12** with the coverage limits below. Baseline: Phase 0 `56884e690027291080911d469c3bb59bfdac3509`; Codex handoff checkpoint `9ac9670`. Phase 1 was resumed from that checkpoint by Claude Code, not restarted. Phase 2 has **not** started.

## Delivered

From the Codex checkpoint (unchanged, see [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md)): fail-closed evidence contract and safe blocked envelope; complete six-case stress/dependency contract; scenario isolation; bounded, cancellable agents; error recovery and stale-permit clearing; frame-time stepping; visible source, fallback and synthetic disclosures; local-only search (Nominatim off); Esri disabled; map input guards; provisional CORE World wording.

Completed at closure:

- **Map crash fixed.** MapLibre 5.6.0 crashed in `_updateRetainedTiles` (`.key`) and, when terrain was enabled at globe zoom, in `_getOverscaledTileIDFromLngLatZoom` (`.wrap`), after which every frame threw “already running”. These are upstream bugs fixed in 5.7.0 (#6011) and 5.7.2 (#6388). Pinned **5.7.3** (JS and CSS). Same 12-step terrain/navigation sequence: 12 uncaught errors on 5.6.0, 0 on 5.7.3. The original `.key` sequence (full audit) also ran clean. See [D010](DECISIONS.md).
- **Source-failure warning kept.** 5.7.x fires `load` after a TileJSON failure; the usage hint no longer overwrites “source cartographique indisponible”.
- **Mobile globe layout.** At 360×640 and 390×844 the status bar, attribution, console and layer panel no longer overlap. Zoom/pitch buttons are hidden below 640 px; touch gestures remain available.
- **Permit evidence bound to its plan.** A mutation fuzz (1,536 cases) showed a swapped plan, or fabricated but self-consistent numbers, could still reach “prêt pour signature”. `issuePermit` now re-runs the deterministic stress test and blocks on any mismatch. Thresholds are unchanged and exposed as the pure `permitState` ([D012](DECISIONS.md)). Simulation output is still identical to Phase 0 across five scenarios × two plans.
- **Browser harness.** Firefox exposes WebDriver BiDi, not CDP, which caused the earlier timeouts. `scripts/browser-audit.mjs` now drives Chrome (CDP) or Firefox (BiDi) with the same steps and no dependency ([D011](DECISIONS.md)). Audits use fresh tabs. New `scripts/browser-negative-audit.mjs` covers degraded paths in Chrome.

## Acceptance (ROADMAP Phase 1)

| Criterion | Evidence |
| --- | --- |
| Desktop Chrome / Firefox / Safari and mobile checks recorded | Chrome 155.0.8059.40: 24/24 checks, 0 uncaught errors. Firefox 122.0: 24/24, 0 uncaught errors. Safari 27.0.1: **not performed** because WebDriver needs “Allow remote automation”, an owner setting left unchanged. Mobile: Chrome with mobile emulation at 390×844 (audit) and 360×640 (layout overlap check); Firefox at 390×844 (size only); screenshots reviewed visually. No physical phone or iOS. |
| Source / date / fallback labels visible | Source panel: OSM/OpenMapTiles/ODbL, unknown observation dates, 8 m / 0 m fallbacks, terrain credits, synthetic simulation, “observations validées : aucune”. |
| Nominatim compliant or disabled | Disabled; local search only. Negative inputs (`999, 999`, markup) rejected in both browsers. |
| Non-open imagery resolved | Esri removed; satellite control disabled with an explanation. |
| Permit inputs fail closed with negative tests | 21 Node tests, including NaN/∞/missing/sparse/duplicate/unknown cases, dependency mismatch, swapped plan and fabricated numbers. |
| Empty / failed agent runs recover | Cancel, injected failure and hidden-tab abort each clear the proposal, block the permit and restore controls (both browsers; hidden tab in Chrome). |
| All tests pass | `node build.js` OK; `node --test test/*.test.js`: **21 passed, 0 failed**; `git diff --check` clean. |

Negative-path audit, Chrome, 12/12: blocked map engine shows a message and the corridor stays reachable; blocked tiles/terrain show the unavailable-source warning; rapid terrain/building toggles during flights; hidden tab aborts agents and visible tab resumes; clipboard rejection shows selectable permit JSON. No uncaught errors.

Logs from the closing runs contain only expected entries:

- headless GPU performance warnings;
- a MapLibre notice that fog is unsupported on the globe with terrain;
- 3 transient OpenFreeMap tile fetch failures in Chrome, handled by the map's error path;
- the deliberate `INJECTED_AUDIT_FAILURE`.

Structured results, including the historical 5.6.0 runs: [PHASE_1_BROWSER_RESULTS.json](PHASE_1_BROWSER_RESULTS.json). Raw logs and screenshots stay in ignored `test-results/phase1/`.

## Known limits carried forward

- Coverage is headless only, with an old Firefox (122). Safari, iOS, physical devices and current Firefox are unverified. Rendering used software GL.
- Terrain is approximate, and regional licence obligations are linked, not certified. Map data dates are unknown. Google Fonts are not pinned.
- The gateway proves consistency with this repository's engine only. There is no identity, real signature, evidence expiry or audit storage. Without a `world` argument, the twist cross-check is skipped (the app always passes one).
- Traffic, geometry and baseline plan are synthetic and uncalibrated. Agents run on the main thread.
- GitHub Pages deployment and the CORE source licence remain owner decisions.

**Phase 2 readiness:** technically unblocked, but it requires the founder's explicit start. Nothing in this report starts it.
