# Phase 0 audit — 2026-10-12

## Scope and repository

Initial local main: `5c99cfe`, clean working tree, three commits, no remotes and no other local branches. The target https://github.com/vincentleg/core already existed, public with no default branch/ref; authenticated GitHub inspection and `git ls-remote` confirmed an empty remote. Existing visibility and history are preserved; no repository creation or force push is needed. Publication is accepted only after the remote main hash matches the final local commit (recorded in the delivery report).

All requested project files were read. There was no package manifest, dependency installation step, CI workflow or versioned automated test suite. Historical HANDOFF simulation results were not treated as current verification.

## Changes

Added architecture, vision, decisions, source inventory, this audit, six built-in Node tests and ignore rules. Updated setup, mandatory engineering rules and delivery phases; historical HANDOFF content retained with a notice. The engine and app JavaScript remain byte-for-byte unchanged from the initial revision.

Browser inspection found corridor mojibake and quirks mode caused by a missing HTML document envelope, plus CSS overriding hidden panels. The template now declares doctype, French language, UTF-8 and viewport; body margins are reset and hidden panels stay hidden. `corridor.html` was regenerated, never hand-edited. The globe introduction now accurately describes the separate synthetic simulation.

## Executed validation

- Node 22.20.0 / Python 3.9.6 on macOS. `node build.js` succeeds; initial build reproduced the existing artifact exactly; final generated artifact matches amended sources.
- `node --test test/*.test.js`: **6 passed, 0 failed**. Covers script parsing, exact assembly, seeded evaluation without input mutation, bounded deterministic search/refinement, valid-input permit thresholds and reference stress comparison.
- `node --check` on engine, app and build script passed. `git diff --check` passed.
- Served using `python3 -m http.server 8000 --bind 127.0.0.1`; inspected Chrome headless through a temporary isolated profile and screenshots, without adding a browser dependency to the project.
- Visually inspected the real-data globe, SoMa streets/extruded buildings and synthetic corridor. Satellite/terrain controls accept activation; their imagery quality, accuracy and terrain interactions remain unverified.
- Ran one full browser agent flow before the HTML repair and one regression flow after it. Each reported 3,030 candidate/stress evaluations, a ready-for-signature proposal and 68% nominal **synthetic** delay reduction; the concert twist changed the permit to SUSPENDU. No claim of real-world improvement follows.
- After repair: UTF-8, CSS1Compat, hidden globe panel and correct accented permit state confirmed. No uncaught JavaScript exception captured. Browser warnings remain: GPU buffer performance warning and “Expected value to be of type number, but found null instead.” First visit requested absent favicon.ico (404).
- Reviewed tracked paths and scanned all 16 historical blobs plus working files for common private-key/token/credential patterns: no matches. Largest reviewed file after edits was approximately 50.4 KB. No dependency trees, datasets or screenshots added. Pattern scanning is not a guarantee against every possible secret. Existing founder contact information and Git author metadata are public project attribution, not credentials.

## Open findings and validation limits

| Priority | Finding | Required follow-up |
| --- | --- | --- |
| High | `issuePermit` trusts evidence: a direct NaN ratio/gain probe returns ready for signature; missing/empty fields can throw. | Explicitly authorize engine hardening in Phase 1; require complete finite consistent evidence and valid plan/scenario inputs, with fail-closed tests. No external actuator exists today. |
| High | Traffic/geometry/reference plans are synthetic and uncalibrated; agents are heuristics. | Preserve disclosures; obtain observed data and validate a simulator before any decision-grade claim. |
| High | Nominatim busy flag only serializes a single tab; no temporal/global rate limit, cache or switchable endpoint. | Resolve provider policy requirements or disable public search before wider release. See DATA_SOURCES.md. |
| High | Existing Esri layer is not open data and usage rights are unresolved. | Remove/replace with an acceptable free/open source before production; no billing or keys. |
| Medium | Globe lacks source timestamps and visible 8 m height-fallback disclosure; terrain attribution not fully audited. | Display provenance/unknown values and complete source-specific attribution. |
| Medium | Browser warning for null numeric map attributes. | Identify exact source/expression and add appropriate data guards without hiding failures. |
| Medium | Agent UI lacks failure recovery; empty candidate pools are not guarded; work runs on main thread. | Add bounded error/cancel handling and responsiveness verification when authorized. |
| Medium | No actual signature, evidence-expiry enforcement, identity, audit storage or real-world monitoring. | Treat permit as a local proposal; design authenticated review only in a separately scoped phase. |
| Medium | `vehicles`/live passed count represent service events across approaches; time advancement depends on frame rate. | Clarify metric labels and timing before calibration. |
| Pending | Firefox, Safari, mobile/touch, clipboard fallback, live geocoding, Paris/Tokyo and degraded-network behavior. | Complete explicit browser matrix in Phase 1. Chrome screenshots alone do not certify compatibility. |
| Pending | GitHub Pages deployment and CORE source-license selection. | Owner can decide separately; GitHub code publication does not imply a live site or open-source license. |

## Phase 1 recommendation

Authorize a bounded reliability phase: first reject malformed/absent permit evidence with tests; resolve provider policy/open-data gaps; show data provenance and synthetic/fallback labels; handle UI failures and map warnings; validate desktop Chrome/Firefox/Safari and mobile. Preserve existing valid-input behavior. Stop before integrating real Folsom Street geometry; that is Phase 2 in the revised roadmap.
