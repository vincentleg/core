# Investor demonstration specification (San Francisco)

Target audience: the founder's investor meetings, Sequoia Capital among them. This document specifies the experience only. It implies no relationship with, or endorsement by, any investor. It is a functional, interactive demonstration run from the browser. Each step shows what is real, what is assumed and what is synthetic.

## Honesty contract (non-negotiable)

- Every number on screen is either derived from a dated public snapshot (with a source link) or labelled *hypothèse* or *synthétique*.
- Agent activity is a live or recorded execution trace; nothing is scripted.
- The recommendation is a proposal for **human review**. CORE never executes anything.
- **Never shown as fact:**
  - congestion on Folsom (no observed counts);
  - money saved (no cost data);
  - that the city fails to coordinate (Public Works already runs moratorium and Dig Once processes).
- If the network fails, the demo switches to committed snapshots and says so.

## Flow (about 6–8 minutes)

| # | Beat | What the viewer sees | Real / assumed |
| --- | --- | --- | --- |
| 1 | **Earth** | Existing CORE globe, cinematic but interruptible; source panel available | OSM geography (real); terrain approximate |
| 2 | **Zoom to San Francisco** | Camera flight over the Golden Gate Bridge (procedural model, labelled) into SoMa | Map data real; bridge model procedural from published dimensions |
| 3 | **Problem discovery** | Discovery Agent run (live). Folsom/Howard segments light up by repeat excavation; the 8th–9th block shows 21 permits from 6 parties since 2021 | Observed permit records (counts at snapshot date) |
| 4 | **Evidence** | Evidence panel: moratoria, crashes on HIN segments, closures, Muni stops; caveat "much of Folsom's activity is the planned Streetscape project" | Observed / administrative; caveat explicit |
| 5 | **Prospective decision** | Howard: 35 approved large excavations while the streetscape repaving is pending | Observed + agency project status (dated) |
| 6 | **Alternatives** | Scenario Generator: baseline vs. bundled windows vs. sequence-before-repaving, with assumption sliders (shift ±N days) | Records observed; schedules hypothetical |
| 7 | **Simulation and stress** | Deterministic evaluation: openings, occupation days, moratorium conflicts. Adversarial perturbations flip or keep the conclusion. Optional synthetic lane-closure delay, hatched | Derived + labelled synthetic |
| 8 | **Decision gateway** | `PRÊT POUR REVUE HUMAINE` / `SUSPENDU` / `BLOQUÉ`, with reasons, validity, reversibility and JSON export; reviewer role named | Deterministic rules |
| 9 | **Close** | "What becomes possible with agency data": counts, timing cards, planned-works feeds → calibration (Phase 3) | Roadmap, not product |

**Interaction rules:**

- Any step can be paused and inspected.
- Clicking a number opens its source.
- Clicking a trace line moves the map.
- Cinematic camera moves never hide loading or missing data.

## Screens

Layout and panel behaviour follow [AGENT_WORKSPACE_SPEC.md](AGENT_WORKSPACE_SPEC.md#workspace-layout):

- the map;
- agent activity;
- evidence and sources;
- scenario comparison;
- metrics and charts;
- the gateway.

**Target device:** a desktop laptop with Chrome and Firefox, audited. Mobile gets a read-only layout.

## Readiness checklist for a live meeting

- **Snapshots:** refreshed and committed within 7 days before the meeting, manifest hashes verified by tests.
- **Browser audits:** pass in Chrome and Firefox on the presentation machine. Safari only if the owner enables automation.
- **Recorded fallback:** a recorded trace exists of a full run on the same snapshots.
- **Offline mode:** rehearsed with the network disabled.

## Phase 2B implementation plan

Scope is limited to what this plan lists. LLM, SUMO, calibration and Google tiles are excluded.

1. **Landmark spike (go/no-go).** Pin three.js. Render a procedural Golden Gate Bridge in a MapLibre custom layer at its OSM alignment.
   - Pass: correct placement within ±10 m, no uncaught errors across globe↔city flights and terrain toggles (existing audits), ≥30 fps at the SF overview.
   - Fail: switch to the deck.gl fallback.
2. **Snapshot tooling.** `scripts/sf-snapshot.mjs` (Node built-ins only) fetches CNN-filtered Folsom/Howard subsets from `data.sf.gov`. It drops personal contact columns and writes `data/sf/*.geojson` plus `data/sf/manifest.json` (URL, SoQL, retrieved_at, sha256, licence, rows). Node tests check the manifest, schema and the absence of PII columns. Total size ≤ 5 MB.
3. **SF view.**
   - Camera path Earth → SF → SoMa.
   - Folsom/Howard layers with source and date legends.
   - Corridor DataSF footprints (LiDAR 2010 label).
   - Remaining landmarks as procedural models.
   - The source panel extended.
4. **Coordination engine.** `src/coord.js`, deterministic and dual Node/browser export like `engine.js`:
   - CNN joins, Discovery metrics, scenario generators, evaluation and perturbations.
   - Unit tests with fixtures.
   - Exact replay hashing.
5. **Coordination gateway.** `issueCoordinationProposal`, with the same fail-closed pattern as D012 and negative tests (missing, stale or unhashed snapshot; tampered metrics; unsupported claim). The existing `issuePermit` stays untouched, and its tests keep passing.
6. **Agent runner and trace.** Deterministic agents emit JSON Lines traces. Live run in the browser; record/replay with a "recorded" label. Tests confirm that a replay reproduces the hashes.
7. **Workspace UI.** The six synchronised panels, observed vs. synthetic styling, and offline-snapshot mode.
8. **Validation and docs.**
   - Extend the browser audits: SF flight, landmark, layers, full agent run, gateway states, offline mode, no uncaught errors.
   - Update DATA_SOURCES and a Phase 2B report.
   - Commit and push.

**Acceptance criteria for Phase 2B:**

- All Node tests pass.
- Chrome and Firefox audits pass with no uncaught errors.
- Every displayed metric traces to a snapshot record or a labelled assumption.
- The gateway blocks every negative test.
- There are no paid services, keys or PII in Git.
- The existing corridor and `issuePermit` behaviour are unchanged.
