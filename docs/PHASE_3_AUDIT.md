# Phase 3 audit — agents, city intelligence and platform (baseline before Phase 3)

Audited 2026-10-13 on commit `628c66f` (Phase 2D). Read: CLAUDE.md, PROJECT_STATE.md, ROADMAP.md, docs/CLAUDE_HANDOFF.md, docs/PHASE_2_REPORT.md, docs/CITY_INTELLIGENCE_ARCHITECTURE.md, and the code and tests. The baseline had 51 Node tests passing and the 73-check browser audit passing in Chrome and Firefox.

## What the existing "agents" actually execute

None of them is an independent intelligent agent. Each is a deterministic function inside a generator, run in sequence by one process. There are no model, memory, goals or tools of their own.

**Multidomain investigation (`src/city-agents.js`):**

| Role | What it actually executes |
| --- | --- |
| Discovery | `GR.buildCityGraph` + `blockSignals` over 44 segments; filters segments with 3 key domains; ranks by organisations, exposed trees without removal notice, recent building permits |
| Evidence | Checks SHA-256 verification flags; `evidenceChecks` (records exist, permit dates ordered, permit point ≤ 75 m from its CNN, organisations present) |
| Cross-domain reasoning | Builds claims C1–C3 from counts; adds NEAR (tree↔permit), AFFECTS (hypothesis) and CONTRADICTED_BY relations; lists contradictions with regexes over descriptions |
| Scenario generation | `alternatives`: R0 permit windows, R1 = coordination engine scenario S2, R2 = defer movable windows to snapshot + 21 days |
| Evaluation | `simulation.run` with coordination-schedule-v1, tree-proximity-exposure-v1 and evidence-completeness-v1 |
| Adversarial review | Re-runs `holds()` under 7 parameter perturbations; static list of missing evidence |
| Synthesis | `synthesize`: template text filled from computed values; recommends R2 if R1 lacks evidence |
| Gateway | `issueCityDecision`: re-runs the whole pipeline and compares the outputs |

**Coordination (`src/coord.js`):** six analogous sequential functions (discovery, evidence, scenario, evaluation, adversarial, gateway).

**Consequence for Phase 3.** These roles are kept as tools. The new organization wraps executable code in agent identities, with explicit tools and permissions, bounded execution and auditable missions. It does not claim intelligence beyond what the code does.

## Baseline gaps addressed in Phase 3

- **Agents:** no registry, hierarchy, permissions, budgets, knowledge collections, evaluations or mission orchestration.
- **City awareness:** no ingestion of news or official feeds, no source health, no scheduling statement.
- **Language models:** no interface. Hardware probe: Apple M1 Max, 32 GB RAM, 404 GB free. **No runtime installed** (Ollama, llama.cpp, LM Studio, MLX absent). No model was downloaded: the founder did not approve a software installation.
- **Interface:** game-like typography (Oxanium, glow, uppercase tracking), with no platform navigation.
- **Camera:** MapLibre defaults plus fixed flights. No orbit, reset or keyboard rotation; no help.

## Public source verification (2026-10-13)

| Source | Status |
| --- | --- |
| USGS FDSN and GeoJSON feeds | Reachable, public domain, CORS |
| NWS alerts (zone CAZ006) | Reachable, CORS; 0 active alerts at collection |
| DataSF | CORS |
| Legistar `webapi.legistar.com/v1/sfgov` | Reachable but **stale**: newest matters last modified 2018–2021; recent filters return nothing |
| SFMTA blog RSS | Current |
| SF Public Works RSS | Current |
| SFPUC RSS | **Stale** (newest item May 2024) |
| sf.gov RSS, SF Planning RSS | 404 |
| Licensed news | Not integrated |

## Decisions taken from this audit

- **Rules first:** deterministic tools remain authoritative. An LLM interface exists but no LLM is used.
- **Honest roster:** register 60 profiles (28 departments, 16 executable, 15 unavailable with stated gaps, 29 coordination-only), not thousands of inert records.
- **Collection:** a Node collector covers all sources; a rate-limited browser refresh covers the CORS sources while the app is open. No background scheduler is installed, and this is stated in the UI.
- **Event-to-mission integration:** link real items to corridor segments (observed CNN or derived ≤ 60 m), suggest missions deterministically, and run them through specialists to the gateways.
- **Interface:** a professional shell with seven sections; the Tron style stays only inside the 3D map. Camera controls with orbit, keyboard and help; 6-DoF free flight documented as not supported by MapLibre.
