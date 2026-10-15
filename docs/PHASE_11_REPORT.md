# Phase 11 — Scientific intelligence

## Acceptance criteria and implemented vertical slice

| Criterion | Implementation |
| --- | --- |
| Concrete scientific mission | SF Tenderloin, dated HIN × injury-collision aggregates × approved work windows; baseline 50,836.6 exploratory index units across 70 segments at 120 days |
| Distinct agents propose, critique, revise | Existing mobility lead, works specialist, adversarial reviewer and evidence verifier execute bounded deterministic role policies; five contributions with reply links and retained dissent D3; governance gateway remains independent |
| Evidence provenance | Four existing DataSF PDDL snapshot sources; SHA-256 of raw source bytes, collection dates, providers, source links and transformations; references resolved by existing city tools |
| Baseline and competing interventions | I0 authorized schedule; I2 partial coordination at an explicit 0–100% feasibility assumption; I3 deferral with displaced burden conserved and explicitly ineligible for recommendation |
| Reproducibility and constraints | 18 bounded sensitivity combinations (3 horizons × 2 severity weights × 3 feasibility fractions); strict parameters, source mission independently recomputed, entire dossier compared and fingerprinted; implementation always BLOCKED |
| Interactive decision dossier | Civilization → Science & décisions: premium-blue problem/debate/laboratory/evidence/field-protocol sections, responsive layout, labelled controls, keyboard focus, tables and JSON export |
| Honest runtime | Public replay of real deterministic local execution; explicit browser recomputation mode; 0 model calls; no representation of live inference or real-world execution |

## Architecture and reproduction

- `src/science.js`: portable scientific orchestration and fail-closed verification, reusing `src/civ-tools.js`, source engine mission and the existing role registry. Role policies rank a proposal, counterpropose partial coordination, challenge displaced load, inspect evidence and revise the recommendation. They do not claim general reasoning or autonomous discovery of new science.
- `scripts/science.mjs`: local runner reuses `createRuntime`, the existing decision engine, STOP and SQLite checkpoint API. Its isolated `.core-local/science.sqlite` preserves other live memory. Existing scheduler/control centre remain unchanged; this slice is explicitly invoked, not a new scheduled workflow.
- `src/science-view.js` / `src/science.css`: lazy source loading, fresh verification before display/export, bounded interactive recomputation, explicit replay/local-browser labels, no model endpoint. Missing/altered evidence hides the dossier and export behind a BLOCKED alert.
- `data/science/sf-traffic.json`: generated local recording, including its source mission. Regenerate with `node scripts/science.mjs --record`; reproduce with `node scripts/science.mjs --verify`. No hand-edited data.
- Moteur `src/engine.js`, traffic equations, existing permit gateway and Phase 10 workflows are unchanged. No new dependencies or data collection.

## Scientific interpretation and limitations

The objective is an evidence-backed **feasibility study**, not optimized or calibrated real traffic. The reused index is historical reported injury collisions/km/year × authorized permit-days, not expected collisions, measured congestion, safety benefit or cost. Overlapping permit-days can double count administrative occupation; a feasibility fraction tests that modelling choice rather than asserting observed occupancy. I3 shifts burden beyond the horizon and is excluded without verified catch-up capacity. I2 remains conditional on engineering and administrative feasibility. All implementation is blocked; human review eligibility verifies dossier consistency, not real-world efficacy.

Observations are dated administrative records; assumptions, projections and modelled outcomes are labelled. The dossier retains uncertainty and disagreement. Its field protocol requires agency confirmation, preregistered metrics and safety constraints, baseline/control observations, confounder review, human-authorized pilot with stop rules and follow-up beyond the horizon, and publication of null/negative results. No observed counts, calibrated simulator, causal estimate, real approval, field trial or measured improvement exists. Source hashes prove byte integrity, not truth or cryptographic publisher authenticity.

## Validation

- Initial targeted tests: 8/8 passed; subsequent changes add a hand-calculated overlap/emergency fixture, included in final integration below.
- Scoped local Chrome audit: 10/10 passed, zero console errors; desktop and 390px mobile screenshots inspected. Includes genuine parameter changes, retained dissent, source links, interactive gate and tampered-recording rejection. Existing local model-status probes are metadata only; the science workflow makes no inference requests.
- Final Node integration: **130/130 passed**, including 9 Phase 11 tests and a hand-calculated 1 km/100-collision/overlapping-permit fixture (I0 120, partial I2 100, urgent work retained at 60, displaced load 60). Only one final full suite was run. CSP check passed; inline application code was not changed. Staged integrity/security scan: 15 files, zero findings; whitespace check passed. No local databases, raw logs, credentials or browser artifacts staged. Release evidence follows below.
- Local browser evidence: `/tmp/core-phase11-browser-local.json` and sibling desktop/mobile PNGs (ignored, not published).
- Licences: four previously approved DataSF PDDL sources reused and attributed; aggregates only for crashes; no personal contacts, new providers, dependencies, accounts or paid services. Existing unrelated source limitations remain in `docs/DATA_SOURCES.md`.
- Firefox, Safari, assistive-technology testing and field efficacy remain unverified. Static source age is displayed; no live monitoring claim.

## Deployment

Pending verified Phase 11 production deployment. Tag only after production checks pass. Phase 12 is not authorized.
