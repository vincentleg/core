# Phase 2A — San Francisco digital twin: technical audit

Status: **discovery only**, completed 2026-10-13. No application code, dataset, model or dependency was added. Phase 2B has not started. Baseline: Phase 1 closure commit `53d1b8e`.

Companion documents:

- [SF_3D_ARCHITECTURE.md](SF_3D_ARCHITECTURE.md): mapping stack, whole-city model, landmarks.
- [SF_DATA_INVENTORY.md](SF_DATA_INVENTORY.md): verified datasets and their limits.
- [SF_PILOT_CORRIDOR.md](SF_PILOT_CORRIDOR.md): corridor comparison and selection.
- [AGENT_WORKSPACE_SPEC.md](AGENT_WORKSPACE_SPEC.md): agents, traces, gateway.
- [SEQUOIA_DEMO_SPEC.md](SEQUOIA_DEMO_SPEC.md): the investor walkthrough.

## Method

Every claim marked **verified** was checked on 2026-10-13 against an official page or a live public API:

- **Official pages:** Google Maps Platform, Cesium, OpenFreeMap, Overture, deck.gl, SUMO, 511, Caltrans PeMS, SFMTA and the Golden Gate Bridge District.
- **DataSF:** the Socrata catalog and SoQL queries on `data.sf.gov`.
- **OpenStreetMap:** Overpass API queries.

Everything else is labelled an assumption or an open question. Counts are reproducible with the queries listed in the corridor document. They change daily because several sources update daily.

## 1. Existing architecture: reuse or modify

| Component | Today | Phase 2B verdict |
| --- | --- | --- |
| `index.html` globe | MapLibre GL JS 5.7.3 (pinned), OpenFreeMap vector tiles, AWS Terrarium terrain, fill-extrusion buildings, local search, source panel | **Reuse and extend.** Keep the engine, style and provenance panel. Add SF data layers, a landmark layer and the workspace panels. This becomes the main investor surface. |
| `src/engine.js` point-queue simulator and agents | Synthetic five-intersection corridor, seeded demand, stress tests, robust refinement | **Preserve unchanged.** Folsom has no public counts or timing, so it cannot be calibrated now. It stays the labelled signal-timing demonstration. It may later show a clearly synthetic lane-closure delay. |
| `issuePermit` gateway | Deterministic, fail-closed, evidence replay-bound to the plan (D012) | **Preserve unchanged.** A new coordination gateway follows the same pattern: complete contract, structured-clone snapshot, deterministic replay, blocked envelope, human signature. It is a separate function, not an edit. |
| `src/app.js` / `corridor.html` | Canvas 2D synthetic corridor UI | **Reuse as is.** Linked from the SF view as "synthetic signal demo". No rewrite. |
| `build.js`, Node tests | Dependency-free assembly and tests | **Reuse.** New modules get `node:test` suites. The engine/gateway pattern carries over. |
| `scripts/browser-audit*.mjs` | CDP and WebDriver BiDi audits | **Reuse.** Extend with SF checks. |
| `docs/DATA_SOURCES.md` | Provider inventory | **Extend.** SF datasets join it when they are actually integrated. |

**Constraints found in the code:**

1. The globe has no data layer, model layer or panel system yet.
2. All agents are seeded heuristics on the main thread, with no LLM and no trace log.
3. `corridor.html` geometry is synthetic and not georeferenced.
4. There is no data-snapshot tooling, and no way to fetch, hash and date public data.

None of these blocks Phase 2B.

## 2. Key findings

**Verified facts**

- **San Francisco:**
  - DataSF publishes daily-updated, public-domain (ODC-PDDL) records of utility excavation permits, 5-year paving moratorium streets, street-use permits, temporary street closures, injury crashes, the 2024 High Injury Network, the signal inventory, street centerlines and 177,023 building footprints with LiDAR-derived heights.
  - The portal redirects `data.sfgov.org` to **`data.sf.gov`**.
  - No open dataset of current vehicle counts, measured arterial speeds or signal timing was found:
    - SFMTA says signal timing cards are obtainable by public records request.
    - Its published vehicle counts end in 2015 (PDF).
- **3D mapping providers:**
  - Google Photorealistic 3D Tiles require a billing-enabled Cloud project; it is an Enterprise SKU with 1,000 free monthly events.
  - Cesium ion's free plan is limited to personal, non-commercial use and evaluation.
  - OpenFreeMap is free and keyless, with no SLA and a weekly planet build (2026-10-11 in use); vector tiles go up to zoom 14.
  - deck.gl 9.1+ supports the MapLibre v5 globe; 9.4 renders Tile3DLayer on GlobeView.
- **Folsom Street:**
  - Since 2021-01-01 it has had 474 excavation permits on 84 segments from 26 agents, the second-highest street citywide.
  - 12 segments had at least 10 permits each.
  - The SFMTA/Public Works Folsom Streetscape is reported ~95 % complete (8th–11th), with substantial completion targeted for October 2026.
  - Howard Street's design is complete, but no construction contractor has been selected. It has 35 approved large excavation permits.

**Assumptions**

- A coordination-of-works problem built on observed permit records is a stronger first demonstration than congestion. Congestion cannot be shown without counts or timing.
- Rescheduling feasibility is an assumption the demo must state openly, for example "a permit could move ±N days". It is not a fact about any agency's constraints.

**Technical risks**

- The landmark rendering path (three.js custom layer under MapLibre globe/terrain) is unproven in this repository.
- OpenFreeMap has no SLA.
- Socrata anonymous throttling.
- Data schema drift.
- Permit counts conflate planned capital work with uncoordinated digging.

**Open questions** (owner decisions)

- Will the founder pursue Google tiles under a separately approved billing account?
- Should records requests be filed with SFMTA for Folsom/Howard counts and timing cards?
- What is CORE's funding status? It determines Cesium ion Community eligibility.

## 3. Recommendation summary

1. **Mapping stack:** stay on MapLibre + OpenFreeMap + AWS terrain. Add three.js (MIT, pinned) only for procedural landmark models. Fallback: standalone deck.gl GlobeView. Google Photorealistic 3D Tiles are a documented, not-activated future option.
2. **First problem:** coordination of street excavation on **Folsom Street (SoMa, 2nd–11th)**, with **Howard Street** as the paired prospective case. All evidence comes from observed public permit, moratorium, closure and crash records.
3. **Agents:** deterministic tools with an explicit, replayable JSON trace. Any later LLM step is optional and labelled. Shown runs are real recorded or live executions, never scripted logs.
4. **Hosting:** static GitHub Pages with dated, hashed data snapshots. A backend is required only for live LLM agents, protected API tokens (511) or scheduled refresh.

Phase 2B scope and acceptance criteria are in [ROADMAP.md](../ROADMAP.md) and [SEQUOIA_DEMO_SPEC.md](SEQUOIA_DEMO_SPEC.md#phase-2b-implementation-plan).
