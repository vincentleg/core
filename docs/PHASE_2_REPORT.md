# Phase 2 (2D) — San Francisco city intelligence foundation: report

Status: **COMPLETE on 2026-10-13** for the success criterion: CORE demonstrates one new, evidence-grounded, cross-domain discovery in San Francisco, tests alternatives, and explains a credible human decision. Baseline `fa085d0`. The next phase has **not** started. Audit: [PHASE_2_AUDIT.md](PHASE_2_AUDIT.md). Architecture: [CITY_INTELLIGENCE_ARCHITECTURE.md](CITY_INTELLIGENCE_ARCHITECTURE.md). Sources: [DATA_SOURCE_REGISTRY.md](DATA_SOURCE_REGISTRY.md).

## What was implemented

- **Domain registry** covering 7 domains with honest statuses, and a dataset registry with schema, normalizer and dedupe key (`src/domains.js`).
- **Bounded multidomain adapters** (`scripts/city-snapshot.mjs`), with a merged checksummed manifest. The 2B adapter now preserves other entries.
- **Six new real datasets** integrated:
  - street trees (484);
  - tree removal notices (13);
  - building permits (854 within 40 m);
  - energy benchmarks (92, latest year);
  - parks (3);
  - sidewalk widths (44).
- **Knowledge graph** (`src/graph.js`) with explained relationships per basis, and code-enforced rules: `AFFECTS` is hypothesis-only and every relation needs a reason.
- **Simulation interface** (`src/simulation.js`) with three working deterministic models, one synthetic reference and three declared-unavailable models.
- **Eight-role investigation** (`src/city-agents.js`) with Decision Brief, `issueCityDecision` gateway and model-provider interface (none registered).
- **UI** (`src/city-view.js`, `index.html`, `src/sf-view.js`):
  - Themes panel with status per domain;
  - building-permit clustering and a period filter;
  - Investigation tab with live, paused and replayed runs;
  - three sliders that genuinely recompute;
  - synced map, brief, record inspection for every new dataset, JSON export;
  - collapsible console, Escape handling, nine-step guided demo.
- **Preserved, unchanged in behaviour:** the coordination workspace (now titled "Agents · voirie"), the synthetic traffic corridor and `issuePermit`, the 3D city, landmarks and records.

## The cross-domain discovery (real data, snapshot 2026-10-13)

**Howard Street, 10th → 11th (CNN 7056000)**, with default parameters (tree radius 12 m, building-permit recency 365 days, horizon 60 days):

- **Infrastructure** (observed): 4 excavation permit windows from 3 organisations within 60 days — Pacific Bell, PG&E and Precision Engineering. They overlap in time (rule).
- **Nature** (observed tree positions + derived distances): 4 inventoried street trees within 12 m of the published excavation-permit points. None has a removal notice.
- **Buildings** (observed permits + derived frontage): 2 building permits filed or issued in the last 365 days within 40 m of the block axis.
- **Energy and public space** (context): benchmarked buildings near the block; 12 ft sidewalk (2014 study).
- **Hypothesis:** the works, trees and frontage projects should be examined together before excavation. It is stated as testable claims C1–C3. **No causality or damage is claimed.**

**Alternatives** (deterministic models):

| | R0 reference | R1 coordinated intervention | R2 defer & investigate |
| --- | --- | --- | --- |
| Tree-exposure episodes (proximity indicator) | 12 (each permit separately) | 4 (shared window) | 4 |
| Overlap pairs between organisations | 5 | 5 | 4 |
| Report / delay | 0 | 0 | 15 days, 1 movable permit |
| Constraint violations | 0 | 0 | 0 |
| Evidence completeness | 100 % | **33 %** (missing trench alignment, tree condition, building-works schedule, holder agreement) | 100 % |

**Synthesis and decision.** R2 is recommended because R1 lacks essential evidence. The gateway recomputes everything and returns **ÉLIGIBLE À LA REVUE HUMAINE** (eligible for human review): the relation holds under 5 of 7 perturbations. It is **sensitive** to halving the tree radius (the permit points are geocoded to the address) and to narrowing the frontage to 25 m. Both are disclosed.

**Adversarial review earlier changed the outcome.** It found that the initially top-ranked block, Howard 8th → 9th, relied on two trees with 2023 removal notices. The ranking now discounts trees under removal notices, and the brief lists contradictions.

**Defensible conclusion:** a verified co-location in space and time across three domains warrants a human-reviewed field verification before the not-yet-started excavation on Howard 10th–11th. CORE does **not** claim tree damage, energy, emission, cost or traffic effects.

## What the agents really do

Deterministic rules, roughly 185 ms for 81 events in the browser:

- build the graph and score 44 blocks;
- verify checksums, records, dates and geometry;
- form claims and contradictions;
- generate three alternatives;
- run three models;
- apply seven perturbations;
- write the brief;
- recompute it in the gateway.

No language model is used, and the UI says "Fournisseur de modèle de langage : aucun".

## Simulations that actually run

| Model | Use |
| --- | --- |
| `coordination-schedule-v1` | Scheduling under constraints |
| `tree-proximity-exposure-v1` | Proximity count |
| `evidence-completeness-v1` | Required-evidence checklist |

The synthetic point-queue traffic model stays separate and labelled. Energy, ecology and real-traffic models are declared unavailable.

## Domains working vs placeholder

| Status | Domains |
| --- | --- |
| Working (real data) | Infrastructure; buildings |
| Partial | Nature (trees, removals, parks; no canopy or biodiversity); energy (self-reported benchmarks; no grid); public space (2014 sidewalks, parks); events (closures, removal notices; no news) |
| Placeholder | Society (candidate source only); environment indicators (air, heat) identified, not integrated |

## Tests

- **Node:** 51/51 pass: 39 existing plus 12 new in `test/city.test.js` (schema, malformed values, provenance, graph rules, simulation honesty, reproducibility, cross-domain claims, alternatives, recomputation, contradictions, gateway fail-closed on 11 tampering cases, 5 malformed inputs and an unverified snapshot, JSON export round-trip, provider interface). The snapshot test is now manifest-driven.
- **Browser audit**, 73 checks (59 earlier plus 14 new: themes, layers, toggles, time filter, browser = Node investigation, eight roles, map relations, brief sections, gateway parity, alternative switch, JSON export, parameter recompute, guided demo, Escape, console collapse):

  | Browser | Result |
  | --- | --- |
  | Chrome 155 | **73/73**, 0 uncaught errors; negative paths 12/12 |
  | Firefox 122 (BiDi) | **73/73**, 0 uncaught errors (3 handled network messages) |
  | Safari 27.0.1 | Not performed (remote automation disabled) |

- **Memory (Chrome):** the JS heap after GC went from 22 to 23 MB over 6 repeated investigations. The guided demo completed 9/9 steps with no errors.

Summary: [PHASE_2D_BROWSER_RESULTS.json](PHASE_2D_BROWSER_RESULTS.json).

**Fixed during the phase:**

- a slider step silently snapped 365 to 360 days, which broke browser/Node parity;
- contradiction evidence (removal notices) inflated the ranking;
- the gateway blocked an investigation for being uncertain, which it exists to resolve;
- a test hard-coded 6 datasets;
- the 2B adapter would have dropped new manifest entries.

## Known limitations

- **Single corridor:** coverage is the Folsom/Howard corridor only.
- **Distance uncertainty:** permit points are address- or segment-level, so distances are indicative.
- **Building-permit status:** DBI `issued` status is unreliable without recency.
- **Self-reported or old data:** energy is self-reported; sidewalks date from 2014.
- **Snapshot dependence:** the snapshot is static, and refreshing changes results.
- **Coverage:** headless browsers only; Safari and iOS untested; investor-laptop frame rate not measured.
- **Deferred:** panel resizing; society and environment indicators.

## Phase 3 recommendations (not started)

1. **Field-verification loop:** record human verification outcomes (trench alignment, tree condition) as observations that close or invalidate hypotheses.
2. **More environment and accessibility data:** integrate APEZ / HAQR polygons, curb ramps and canopy, and add a construction + accessibility investigation.
3. **Scheduled refresh:** a free CI job with change reports, and city-wide bounded tiling beyond one corridor.
4. **Calibrated traffic:** start only after SFMTA counts and signal timing are obtained.
5. **Optional model provider:** local/open models proposing hypotheses, always recomputed by the gateway.
