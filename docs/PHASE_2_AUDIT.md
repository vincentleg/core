# Phase 2 audit — San Francisco city intelligence foundation (baseline before Phase 2D)

Audited 2026-10-13 on commit `fa085d0` (Phase 2C). Naming: the founder's brief calls this work "Phase 2". In this repository it follows Phases 2A–2C and is recorded as **Phase 2D**; the requested file names are kept. Findings were checked against code, data and browser runs, not assumed from the brief.

## 1. Existing architecture and working capabilities

The application is static (GitHub Pages compatible), with no backend and no build step except for `corridor.html`.

| Area | Implementation | Status at baseline |
| --- | --- | --- |
| Globe | `index.html`: MapLibre 5.7.3, OpenFreeMap, AWS terrain, local search | Working; audited in Chrome and Firefox |
| San Francisco 3D | `src/sf-world.js`: procedural Golden Gate, Salesforce, Transamerica; OSM landmarks | Working; approximate and labelled |
| Records pilot | `src/sf-data.js`, `scripts/sf-snapshot.mjs`, `src/sf-view.js`: 6 DataSF datasets, SHA-256 manifest, inspector | Working; Folsom/Howard 2nd–11th only |
| Coordination agents | `src/coord.js`, `src/coord-view.js`: six deterministic roles, S0–S4, gateway | Working; infrastructure domain only |
| Synthetic traffic | `src/engine.js`, `src/app.js` → `corridor.html`; `issuePermit` gateway | Working; synthetic and separate |
| Tests | 39 Node tests; 59-check browser audit (CDP / BiDi); 12 negative checks | Passing |

## 2. Real vs approximate vs synthetic data

- **Real (observed or administrative):** DataSF street-use permits, large excavations, moratoria, SFMTA closures, centerlines and intersections. OSM geography.
- **Approximate:** procedural landmarks, AWS terrain, OSM building heights (8 m fallback).
- **Synthetic:** the traffic corridor (`corridor.html`), its demand and its baseline plan.
- **Missing at baseline:** every domain except street works. Trees, buildings, energy, public space and society had no records.

## 3. Provenance, freshness, coverage

- **Provenance:** every snapshot file is SHA-256-checked in Node tests and in the browser.
- **Snapshot date:** 2026-10-13 (Phase 2B).
- **Coverage:** one corridor of 44 segments.
- **Freshness:** refreshing is manual (`node scripts/sf-snapshot.mjs`); there is no scheduled refresh.
- **Moratoria:** current only.
- **Closures:** SFMTA only.

## 4. Agents

Six rule-based roles yield real events, and the trace is replayable and fingerprinted.

**Limits:**

- Single domain.
- No relationship model: links are computed inline.
- No synthesis step and no structured brief.
- The coordination recommendation is review-only on the real data.
- No model-provider abstraction.
- Correctly, nothing is labelled as an LLM.

## 5. Simulation validity

| Model | What it is | Limits |
| --- | --- | --- |
| `core-point-queue-v0` | Synthetic, uncalibrated | Not georeferenced |
| Coordination scheduling | Deterministic scheduling under declared constraints | Not a traffic or cost model |

There is no common simulation interface and no declaration of which domains have no validated model.

## 6. Gateway integrity

Both gateways fail closed and recompute everything:

- `issuePermit` (traffic, synthetic);
- `issueCoordinationProposal` (street works).

Neither authorizes anything. There was no gateway for multidomain conclusions.

## 7. 3D rendering and navigation

Recognizable city, landmarks and Golden Gate; smooth flights, with padding-aware camera fits.

**Observed issues** (confirmed in 2C screenshots):

- **Overlapping panels:** three panels (console, layers, data panel) compete with the map on a 1440 px screen.
- **Dense markers:** 662 permit points at overlapping addresses.
- **Overlapping labels:** landmark labels overlap at the city overview.

## 8. UX and accessibility

- **Strengths:** native buttons and selects, focus outlines, reduced-motion handling for flights, and labelled badges (OBSERVÉ / APPROXIMATIF / SYNTHÉTIQUE).
- **Gaps:**
  - no way to collapse the console;
  - no thematic layer model or time filter;
  - no Escape handling;
  - no clustering;
  - the guided demo covered only street works.

## 9. Performance, security, compatibility

- **Performance:** the coordination run takes about 30 ms in Node. The browser loaded about 430 KB of snapshots lazily.
- **Security:** no secrets or keys. Personal contact data is removed and free text is redacted.
- **Coverage:** headless Chrome 155 and Firefox 122 only; Safari is not automated (owner setting). The investor-laptop frame rate is not measured.
- **Known third-party issue:** MapLibre `_onEaseFrame` is thrown only by camera commands issued programmatically in hidden tabs.

## 10. Technical debt and regression risks

- **Global agent fingerprints** depend on the exact snapshot. Any refresh changes results, which is intended but must be explained.
- **Hard-coded dataset counts in tests:** found and fixed in this phase (6 → manifest-driven).
- **Silent slider snapping:** browser range inputs snap to their step. This caused a browser/Node fingerprint mismatch, found and fixed in this phase by aligning the step.
- **Stale building-permit statuses:** DBI permits stay `issued` without a completion date for years. 540 of the 669 `issued` permits near the corridor are more than 3 years old. Treating `issued` as "under construction" would fabricate activity.
- **Parallel tabs:** browser audits must run sequentially.

## 11. Recommended architecture for multidomain expansion

1. **Domain and dataset registry** (`src/domains.js`): status per domain, schema, normalizer and dedupe key per dataset.
2. **Bounded adapters** (`scripts/city-snapshot.mjs`): corridor CNN or bounding-box queries, frontage distance filters, a merged SHA-256 manifest, and a failure keeps the previous snapshot.
3. **Lightweight local knowledge graph** (`src/graph.js`): stable IDs, provenance, and typed relationships with a basis and an explanation. No graph database.
4. **Simulation interface** (`src/simulation.js`): model registry with version, calibration flag, uncertainty and input digest. Unavailable domains are declared, not simulated.
5. **Multidomain orchestration** (`src/city-agents.js`): eight roles, a Decision Brief and a fail-closed decision gateway, plus a model-provider interface that is not used.
6. **UI by intent:** explore (map), understand (themes), discover and investigate (Investigation tab synced with the map), decide (brief and gateway).

## 12. Implementation priorities (applied in this phase)

1. Integrate at least two new real domains: trees and removal notices, building permits, energy benchmarks, parks, sidewalk widths.
2. Build the graph with an explained basis on every relationship.
3. Deliver one cross-domain investigation (infrastructure + nature + buildings, with energy and public-space context) with three alternatives, an adjustable parameter, adversarial review, a Decision Brief and a gateway.
4. Add thematic layers with honest status, clustering, a time filter, a collapsible console, Escape handling, and a nine-step guided demo.
5. Tests and audits for all of the above, keeping existing behaviour intact.

**Deferred:** society data, air quality and heat, scheduled refresh, panel resizing, and a real model provider.
