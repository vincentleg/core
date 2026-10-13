# CORE — handoff to Claude Code (2026-10-12)

> **Resolved:** Claude Code completed Phase 1 from this checkpoint. MapLibre was pinned to 5.7.3 (D010), Firefox now runs over WebDriver BiDi (D011) and evidence is bound to its plan (D012). Current truth: [PHASE_1_REPORT.md](PHASE_1_REPORT.md). The rest of this file is the historical handoff record.

## Mission and exact stopping point

The founder stopped Codex during Phase 1 because of remaining credits. Preserve and finish the current work; **do not restart Phase 1 and do not start Phase 2**. This commit is a handoff checkpoint, not a Phase 1 acceptance or production release. Latest user-requested commit message: `chore: prepare Claude Code handoff` (supersedes the earlier Phase 1 feature-commit message for this checkpoint).

CORE (Creation Of Reborn Earth) aims to provide a parallel 3D Earth where agents propose and stress-test physical infrastructure changes before qualified humans authorize implementation. The first intended commercial problem is coordinating road and utility works to avoid repeated excavation and unnecessary closures. Traffic signals are the current demonstration. The long-term vision includes buildings/energy, water, subsurface assets, planetary coordination and spatial/XR interfaces; eventual beyond-Earth infrastructure is an aspiration. None of this implies an existing calibrated planetary twin, business validation or real-world execution capability.

The product differentiator is evidence-linked decision review: proposals, explicit assumptions and validity, adversarial scenarios, deterministic eligibility, human authorization and eventually observed outcomes/recalibration. Approval rate is not a success metric. No infrastructure actuator or actual signing service exists. Historical business/pitch context remains in `HANDOFF.md`; treat its claims, dates, gains and old phase numbers as historical, not freshly verified facts.

**Naming:** “La Trame” is deprecated. CORE remains the product. “CORE World” is only a provisional reference, not permanent branding. Visible application labels were updated. Historical documents and internal DOM IDs such as `trame`/`l-trame` remain to avoid unnecessary renaming.

## Repository and architecture

Workspace: `/Users/vincentgppm/core`. Canonical public repository: https://github.com/vincentleg/core. Branch `main`, origin `https://github.com/vincentleg/core.git`, tracking `origin/main`. No backend, account system, package manifest, npm install, framework, database, LLM service or paid dependency.

- `index.html`: independent MapLibre GL JS 5.6.0 globe, inline CSS/JS, OpenFreeMap tiles/glyphs, city navigation and map controls. Buildings use geographic footprints and approximate heights. The pilot marker only navigates to the separate synthetic page.
- `src/engine.js`: shared Node/browser point-queue simulator, seeded scenarios, heuristic builders, stress tests, robust refinement and deterministic Passerelle. Exports CommonJS or `globalThis.CORE`.
- `src/app.js`: custom 3D projection onto Canvas 2D, live traffic, camera, controls, main-thread asynchronous agents and permit display.
- `src/template.html` + engine/app → `corridor.html` through `node build.js`. Generated HTML is committed; never hand-edit it.
- `test/engine.test.js`, `test/build.test.js`, `test/integrity.test.js`: dependency-free Node tests.
- `scripts/browser-audit.mjs`: new optional CDP audit, using Node's built-in WebSocket/fetch and an already-running isolated browser. Driver behavior in Firefox needs attention; this is not yet a passing cross-browser gate.
- `docs/`: architecture, vision, decisions, sources, Phase 0 audit, partial Phase 1 report and this handoff.
- `test-results/phase1/`: ignored local copies of browser JSON logs and PNG captures. They are intentionally not committed; the compact `docs/PHASE_1_BROWSER_RESULTS.json` preserves results in Git.

## Relevant history and completed Phase 0

Original commits retained: `f079aa5` (prototype), `7824682` (Claude rules/roadmap), `5c99cfe` (historical handoff/agent rules).
Phase 0 baseline: **`56884e690027291080911d469c3bb59bfdac3509`**, `chore: establish CORE project foundation`, pushed and verified on GitHub.

Phase 0 audited the initially clean repository and existing empty/public GitHub target, configured origin, preserved history, added documentation/ignore rules and six Node tests without dependencies. It confirmed globe/SoMa and the synthetic agent-permit-concert flow in Chrome, corrected the corridor HTML envelope (UTF-8, doctype, viewport, margins and hidden panels) and made the globe introduction honest. It recorded a NaN-permit vulnerability, provider gaps and incomplete browser coverage. No Pages deployment or CORE source-license grant was established.

At the start of this handoff, local HEAD and origin/main still pointed to the Phase 0 baseline; all Phase 1 changes were uncommitted. The handoff commit contains these changes and documentation, with its hash recorded in the final delivery message. Run `git log -2 --oneline`, `git status --short --branch` and `git rev-parse HEAD origin/main` to confirm checkout/push status rather than assuming the checkpoint completed Phase 1.

## Phase 1 changes already implemented

### Gateway and simulation integrity

- Added finite-number, plan, scenario, closure, budget and seed checks. Core simulation equations, nominal demand, heuristic algorithms and decision thresholds remain unchanged.
- Stress results now carry `dependencies: { model: 'core-point-queue-v0', twists: [...] }`; every row carries ordered `caseId` 0–5 and its effective `twists` in addition to label/base/plan/ratio.
- Gateway requires all six canonical stress rows, known model/twist dependencies, exact case labels, finite nonnegative delays bounded by the 2,700 s simulation horizon, positive baseline, finite bounded ratio, internally consistent gain/worst summary, valid timing arrays and optional current-world twist match. Unknown contract fields are rejected on plan/root/rows/dependencies/world as implemented; review the full validator before extending its schema.
- It snapshots inputs with `structuredClone` before validation, catches invalid input errors and returns a safe `BLOQUÉ` envelope: null plan/action/gains, empty tests, no usable proposal. Valid degraded/no-gain/ready decisions retain the previous thresholds. This validates an internal data contract, not the authenticity of arbitrary externally supplied evidence.
- Plan arrays and scenario closures are isolated; `makeScenario` no longer shares closure objects with TWISTS. Unknown twists and malformed scenario arrivals reject early.
- Search budget 1–5,000, refinement 1–1,000, candidate count 1–30, periodic yielding and AbortSignal cancellation. These bounds protect the prototype; no worker pool was added.
- Node tests cover NaN, infinities, missing/undefined/null/string/negative values, impossible timings, incomplete/sparse/duplicate stress cases, dependency mismatch, isolation, cancellation and normal states. Old test fixtures were upgraded to the complete evidence contract rather than allowing incomplete evidence through.

### UI, performance and naming

- Added cancel control and try/catch/finally recovery. Starting a run clears stale results; failure/cancel removes any usable proposal and restores controls. Changing a scenario passes its twists to the gateway.
- Background visibility stops the canvas animation callback and aborts ongoing agents; foreground resumes rendering. Static frames skip expensive redraw; HUD DOM updates are throttled to 250 ms. Live stepping now accumulates elapsed frame time with a cap instead of assuming a fixed frame rate. Full rAF scheduling still exists while visible.
- Returning to globe cancels camera tween; labels clarify simulated delay and approach service counts (“Passages aux feux”), not unique vehicles. Invalid-permit UI avoids dereferencing a null plan.
- CORE / CORE World visible names, no redesign. Explicit statement that validated traffic observations are absent; assumptions and synthetic results remain visible.

### Geographic data and provider decisions

- Added visible expandable source/limitations panel: OSM/OpenFreeMap/OpenMapTiles, ODbL link, unknown observation dates, missing-height 8 m and base 0 m fallbacks, synthetic-vs-geographic separation, terrain exaggeration and provider links.
- Removed Nominatim network requests. The static app cannot guarantee its aggregate service-wide rate limit. Search now handles the three pilot cities and latitude/longitude locally, rejects unsupported addresses and out-of-range coordinates, and sends no search text externally. This intentional reduction is documented; do not silently re-enable the public endpoint.
- Removed Esri raster source and left the satellite control disabled with an explanation; rights are unverified and imagery is not open data.
- Terrain stays optional, with linked source-specific credits and explicit uncertainty. It is not globally certified compliant or survey-grade. Hillshade is off initially to avoid unused tile traffic. Separate `hill`/`dem` sources were restored after a shared-source experiment; **this did not resolve the MapLibre runtime error below**.
- Numeric map expressions now handle missing/non-numeric properties; buttons wait for map load; failed map startup keeps the corridor link usable; source errors show a status message. Mobile box-sizing/scroll constraints and attribution contrast improved; later mobile adjustments received automated layout checks but not a full final visual review.

## Validation actually performed

- Final lightweight handoff run: `node --test test/*.test.js`: **19 passed, 0 failed**. `node build.js`: success (58,689 JS string characters reported, not UTF-8 byte size). `git diff --check`: passed.
- A direct comparison against the Phase 0 engine via `git show 56884e6:src/engine.js` matched baseline-plan numeric results exactly across normal, roadwork, rain, concert and peak+rain scenarios. This was a one-off check, not a committed baseline test.
- Chrome **155.0.8059.40**, isolated headless profile: latest audit passed 22 functional assertions (globe, three cities, buildings on/off, terrain toggle, disabled satellite, local search valid/invalid, 390×844 layout, corridor, cancel, 3,030-evaluation run ready, concert suspension/recovery, closure dependencies, pause, comparison, injected failure recovery). Overall audit **FAILED** its final no-uncaught-exceptions assertion.
- Firefox **122.0** installed, isolated headless profile: initial audit passed 13 map/search/mobile-map assertions and captured no JS exceptions, then the CDP controller timed out waiting for corridor app after navigation. A separate reattached runtime inspection showed the corridor loaded and `CORE`/`__CORE_APP` existed. Retry on the later code timed out at initial map-ready check with 0 assertions; do not call Firefox fully validated. Old browser version; not a current-version compatibility guarantee.
- Safari **27.0.1** installed; `safaridriver` could not create a session because “Allow remote automation” is disabled. **Tests not performed**. Do not enable global browser settings without the owner's action.
- Chrome initial screenshots were visually inspected for map, mobile map and suspended corridor. Final mobile/terrain screenshots exist locally but final visual coverage is incomplete. No physical phone or iOS Safari validation.
- `docs/PHASE_1_BROWSER_RESULTS.json` gives per-run checks, exception summaries and warning counts. The deliberate `INJECTED_AUDIT_FAILURE` console.error tests failure recovery; distinguish it from uncaught MapLibre failures.

## Exact unfinished tasks / known bugs

1. **Highest active runtime defect:** Chrome terrain/navigation sequence still produces `Uncaught TypeError: Cannot read properties of undefined (reading 'key')` in MapLibre 5.6.0 `_updateRetainedTiles` → `update` → `_updateSources` → `_render` (minified line 45, column 71005). Last run log: `test-results/phase1/core-phase1-chrome-final.json`. Both shared and restored separate DEM sources encountered it. Do not claim the second configuration fixed it. Isolate terrain activation/deactivation/city-flight sequence; choose a minimal fix or explicitly disable unstable terrain if necessary. Do not upgrade dependencies without a demonstrated need and pinned version.
2. Repair/understand Firefox CDP context handling. `scripts/browser-audit.mjs` now resets Runtime after corridor navigation, but the retry stopped earlier, so that change is unvalidated. A clean attach or BiDi/manual approach may be preferable. Preserve browser failures in the report.
3. Re-review gateway schema for edge cases and valid-input compatibility. Nineteen tests pass, but this is not a security certification. Add targeted regressions only when warranted; preserve finite valid behavior, require complete evidence and reject unknown dependencies. Never accept a ready state from unknown evidence.
4. Complete final visual checks (desktop and narrow/mobile), negative network paths, copy-permit fallback, visibility/cancellation, rapid toggles and camera interactions as relevant. No excessive repeated 3,030-run loops; the prior full runs already establish core transitions.
5. Safari requires owner to enable Settings → Developer → Allow remote automation for WebDriver, or manual inspection. Record unavailable testing accurately rather than block all independent progress.
6. Finish data/architecture/README consistency and Phase 1 report after fixes. Terrain regional licensing is only reviewed through upstream attribution documentation; exact location/source obligations remain uncertain. Current source panel links all credits but is not a blanket compliance claim.
7. Phase 1 acceptance is **not satisfied** because browser reliability remains unresolved. No Phase 2 geographic adapter, real street simulation, calibration, SUMO integration or real signing has been started.

## Commands and audit artifacts

```sh
cd /Users/vincentgppm/core
node build.js
node --test test/*.test.js
python3 -m http.server 8000 --bind 127.0.0.1
# Open http://localhost:8000/ and /corridor.html
```

Optional browser audit (requires browser running separately; no npm installation):

```sh
# Use a NEW temporary profile, never a personal profile.
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 --user-data-dir=/private/tmp/core-claude-chrome --no-first-run about:blank
node scripts/browser-audit.mjs 9222 /private/tmp/core-claude-audit
# Firefox 122 exposed CDP on 9223, but script compatibility remains unresolved:
"/Applications/Firefox.app/Contents/MacOS/firefox" --headless --no-remote --profile /private/tmp/core-claude-firefox --remote-debugging-port 9223 about:blank
```

Browser audit performs networked map loads and one bounded full simulation per browser. Logs/screenshots go to the supplied output prefix; keep them outside Git or under ignored test-results. Existing evidence was copied out of /private/tmp to `test-results/phase1/` before handoff. Sanitized summaries are committed so remote-only continuation retains the findings. Temporary audit browsers/server are stopped at handoff where possible.

## Engineering rules and continuation order

Read `CLAUDE.md`, `AGENTS.md`, `PROJECT_STATE.md`, this file, `docs/PHASE_1_REPORT.md`, then only the relevant code. Do not reread historical context unnecessarily. The current Phase 1 user request explicitly authorizes gateway/engine correctness changes, while preserving simulation equations and valid behavior.

Work autonomously on routine authorized fixes. Preserve history and unfinished work. No force push, no unrelated refactor, no paid API/subscription/cloud dependency, no credentials or raw sensitive datasets in Git. Use free/open tools; external runtime libraries stay version-pinned on unpkg. No extra dependency is currently needed. Never edit corridor.html by hand. Keep PROJECT_STATE at 10 lines max. Do not claim synthetic traffic is measured/calibrated or ready-for-signature is human-approved. CORE never operates infrastructure.

Resume with the MapLibre exception and browser harness, not a new architecture. Then rerun only affected checks, complete the Phase 1 acceptance report, build, review staged content, commit and push. The original intended completion message remains `feat: harden CORE world foundation and permit integrity` for the eventual remaining Phase 1 completion, if still appropriate. Stop before Phase 2.
