# Architectural decisions

## D001 — Preserve the static prototype (Phase 0)

Keep the two HTML entry points and dependency-free Node assembly. The current scope does not justify a framework, package manager manifest, server or database. This keeps setup and hosting simple; browser main-thread computation and lack of persistence remain limitations.

## D002 — Preserve deterministic engine behavior

Seeded scenarios, simulation and gateway remain unchanged. Phase 0 adds tests around valid internal inputs without implying scientific validation. Production permit validation needs a separately authorized engine change and negative tests.

## D003 — Human authority is outside the demo

A ready proposal is never an approved instruction. The application exports JSON and has no infrastructure connection or signing implementation. Future workflows must model authorization and evidence expiry explicitly.

## D004 — Commit the generated corridor

Keep `corridor.html` in Git so the site can be served without a build service. Edit template/app/engine sources and regenerate. A test detects source/artifact drift. Avoid generated datasets, caches and browser captures in Git.

## D005 — Preserve GitHub history and visibility

The existing target `vincentleg/core` was public and empty at audit start. Keep it public, configure origin and push main without force, retaining all three original commits. Do not create a second repository, change visibility, activate billing or configure Pages as a side effect.

## D006 — Test with built-in Node tools

Use `node:test` and strict assertions; no new dependency is needed. Short tests cover reproducibility, orchestration and decision states. Browser rendering requires separate checks; Node tests do not certify visual or scientific correctness.

## D007 — Separate current state from historical vision

ROADMAP.md restarts numbering at the requested Foundation Phase 0. HANDOFF.md remains historical context, with a notice directing readers to current state and audit evidence. Existing UI phase labels are historical prototype labels.

## D008 — Minimal browser repairs

Chrome revealed missing HTML doctype, UTF-8 and viewport declarations, plus CSS overriding hidden panels. Add the document envelope, zero body margin and an explicit hidden rule in the source template, then rebuild. Correct the globe introduction to describe the separate synthetic simulation. Do not refactor renderers or engine logic.

## D009 — Provider and licensing gaps stay explicit

No paid service or dependency is introduced. Existing Esri imagery does not satisfy an open-data-only policy and requires replacement/removal in Phase 1. Nominatim usage controls and source provenance are also Phase 1 acceptance items. No license for CORE is invented on behalf of the owner.

## D010 — Pin MapLibre GL JS 5.7.3 to fix the terrain crash

Chrome terrain/navigation crashed inside MapLibre 5.6.0 (`_updateRetainedTiles` indexing four children when `children()` returns one overscaled tile; also `_getOverscaledTileIDFromLngLatZoom` when enabling terrain at globe zoom, after which the render task queue stayed wedged). Upstream fixed these in 5.7.0 (#6011) and 5.7.2 (#6388); 5.7.3 adds a related tile-retention fix. A 12-step reproduction produced 12 uncaught errors on 5.6.0 and none on 5.7.3. The patch release within 5.x was chosen over the latest version to limit behavioral change; JS and CSS stay pinned to the same version on unpkg. 5.7.x also fires `load` after a TileJSON failure, so the globe no longer lets its usage hint overwrite a source-failure warning.

## D011 — Audit Firefox through WebDriver BiDi

Firefox 122 exposes only WebDriver BiDi on its remote port in a fresh profile, which explains the earlier CDP timeouts. `scripts/browser-audit.mjs` keeps the same steps behind a small CDP/BiDi adapter using Node's built-in WebSocket; no Selenium, Playwright or other dependency was added. BiDi viewport changes set size only (no mobile/touch emulation). Audits open a fresh tab or session so errors buffered by earlier pages cannot leak into results.

## D012 — Bind permit evidence to the plan by deterministic replay

The Phase 1 contract validator accepted evidence whose plan had been swapped or whose numbers were fabricated but self-consistent. Because the engine is deterministic, `issuePermit` now re-runs the six-case stress test (about 15 ms) for the submitted plan and dependencies and blocks unless every baseline and plan delay matches. Equations, seeds and decision thresholds are unchanged; the threshold rule is exposed as the pure `permitState` for direct tests. This is integrity against the in-repository engine, not authentication of people, data provenance or signatures.
