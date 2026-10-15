# CORE — Creation Of Reborn Earth

CORE builds a parallel 3D Earth in which proposed infrastructure changes can be simulated and stress-tested before people authorize them. The first intended product is coordination of road and utility works. **Agents propose; a deterministic gateway evaluates; humans authorize. CORE applies nothing to real infrastructure.**

This repository currently contains a static prototype, not a calibrated digital twin or production approval system.

The [master roadmap](docs/MASTER_ROADMAP.md) reconciles original commitments with delivered phases 0–11. See the [founder commitment register](docs/FOUNDER_COMMITMENTS.md), [Constitution V1](docs/CONSTITUTION_V1.md), [security baseline](docs/SECURITY_BASELINE.md) and [scientific pilot plan](docs/SCIENTIFIC_PILOT_PLAN.md). Founder decisions FD01–FD08 approve Constitution V1 and scientific priorities; operational choices remain open. Workstream 12 adds a local synthetic participation foundation, without public accounts, a cosmetic phase or real-world intervention. See [avatar vision](docs/product/CORE_AVATAR_VISION.md) and [contribution ledger](docs/product/CONTRIBUTION_IMPACT_LEDGER.md). Run `node scripts/contribution-demo.mjs` for the reproducible synthetic example; it does not change the public site or agent permissions.

## Run locally

Prerequisites: Node.js 22 (validated with 22.20.0), Python 3 (validated with 3.9.6), and a modern browser. No package installation, API key, account, or paid service is required to run the prototype.

```sh
node build.js
node --test test/*.test.js
python3 -m http.server 8000
```

Open http://localhost:8000 for the globe and http://localhost:8000/corridor.html for the simulator. External maps and fonts require internet access. Stop the server with Ctrl+C. Use a WebGL-capable browser for the globe; the corridor uses Canvas 2D.

## Current capabilities

- Phase 11 — scientific intelligence: Civilization → **Science & décisions** opens a blue interactive Tenderloin dossier. Existing deterministic agents propose, critique and revise coordination/deferral interventions against a baseline; four dated DataSF sources are hash-checked, dissent and displacement are retained, and 18 sensitivity cases are reproducible. A verification gate blocks altered or unsupported dossiers; implementation remains blocked pending feasibility, field validation and human authorization. Public content is a recorded rule-based run; parameter changes are explicit browser calculations, with no LLM inference. Local execution: `node scripts/science.mjs --record`; verification: `node scripts/science.mjs --verify`. See [Phase 11 report](docs/PHASE_11_REPORT.md).

- MapLibre GL JS 6.11.2 (self-hosted ES module) globe with OpenFreeMap streets, extruded buildings, city navigation, and local search. Satellite is disabled; terrain is approximate (not survey data).
- San Francisco: cinematic arrival, neighbourhood navigation, procedural Golden Gate Bridge, Salesforce and Transamerica models (labelled approximate), OSM landmarks, and a Folsom/Howard pilot view of dated DataSF public records (permits, large excavations, paving moratoria, closures) with per-record provenance and checksums. Refresh with `node scripts/sf-snapshot.mjs`.
- City intelligence (Folsom / Howard → Investigation, Thèmes): a registry of seven domains with honest status, six additional real DataSF datasets (street trees, tree removal notices, building permits, energy benchmarks, parks, sidewalk widths), a local knowledge graph and an eight-role deterministic investigation that finds a cross-domain co-location, compares three alternatives with adjustable parameters, reviews itself adversarially and writes a Decision Brief checked by a fail-closed gateway. Refresh new domains with `node scripts/city-snapshot.mjs`.
- Professional platform (top navigation): City Intelligence from 17 registered official and open-data sources (16 active), with scheduled GitHub Actions collection and an hourly retry configured (scheduled trigger observed; the 150-minute freshness gate may skip collection; timing is not guaranteed) or manually with `node scripts/city-feed.mjs`; the original San Francisco organization of 68 agent profiles: 24 executable (17 rule-based, 7 model-assisted on a local open-weight model — Ollama `qwen3:8b`, see `node scripts/llm-check.mjs`), 29 coordination-only, 15 declared unavailable; deterministic missions and model-assisted collaborations (`node scripts/cognitive.mjs`) with recomputing gateways; versioned, role-specific knowledge with human-approved learning (`node scripts/learn.mjs`); decisions and evidence views; 3D camera controls. The model only chooses permitted tools and words validated interpretations: it never computes numbers or decides.
- Phase 10 — multi-city investigations: San Francisco and New York operational (Paris and Tokyo navigation only), 82 agent profiles, NYC safety × works and pedestrian-ramp investigations, decision dossiers, cross-city methodology review and reviewed memory reuse, snapshot-change discovery, a bounded local scheduler (`node scripts/civd.mjs`) and local control centre (no process spawning), plus a 9-step demo. Commands: `node scripts/civ.mjs decision <city> <nhood>` and `node scripts/civ.mjs world <city>/<nhood> <city>/<nhood> [--fresh]`. Twelve published mission recordings require HUMAN_REVIEW; public agents replay recordings, with no live execution or model calls. Phase 10 was released at `a25169c` (`phase10-release`).
- Phase 9 — autonomous intelligence: a hierarchical mission engine (`node scripts/civ.mjs run|status|decide`), local four-layer SQLite memory with reviewed promotion, measured procedural learning (`scripts/learning-experiment.mjs`), road-safety × works and flood × works investigations in SoMa, Mission and Tenderloin (`scripts/civ-snapshot.mjs`), a building-validated pedestrian network, purposeful agent movement with an activity replay, a local control centre (`node scripts/control-server.mjs`) and an 8-step investor demo. Everything on the public site is recorded; nothing runs live there.
- Phase 8 — observable civilisation: the original 68 agent profiles visible in 13 virtual working zones (filters by status, domain, team); clicking any agent opens its own profile card (overview, mission, organisation, knowledge, activity, movement, safety); illustrative walks on the OpenStreetMap pedestrian network (`node scripts/osm-walk.mjs`, ODbL), recorded replays and live local execution, always labelled; problems on the map linked to agents and investigations; a bounded local supervisor (`node scripts/supervisor.mjs run|status|stop`) with a persistent hash-chained queue and human-only approval; data-refresh health; self-hosted fonts and a [privacy notice](privacy.html).
- Phase 7 — The Living Civilization: original CORE brand and an ENTER CORE landing (NASA Blue Marble Earth → holographic CORE Earth → San Francisco; `#app` skips it); five sections (Monde, Civilisation, Intelligence, Missions, Preuves); camera view presets; holographic agent avatars that replay the recorded real missions on the corridor street network (labelled replay, never live on the public site); agent dossiers with machine IDs (`CORE-PUB-0049`); a World Problems Registry built by `node scripts/problems.mjs` (observed / potential risk / hypothesis / simulated); a bounded session scheduler with human approval and a hash-chained audit log; data health with the real GitHub Actions history; CSP and SRI (`node scripts/csp.mjs`).
- Street-works agent workspace (Folsom / Howard → Agents · voirie): six deterministic agents analyse the real records (overlaps, repeated work, moratoria, closures, coordination opportunities), compare five scheduling scenarios and submit proposals to a coordination gateway that recomputes everything; recommendations are conditional and always require human review. Pause, verified replay and a guided demo are included.
- A separate synthetic five-intersection corridor with seeded traffic, heuristic builder agents, six stress cases, and robust refinement. The corridor uses no LLM; no autonomous infrastructure integration exists.
- A deterministic permit proposal with assumptions, tested results and mandatory human signature text. Changing a scenario reevaluates the proposal; there is no actual signing or execution service.

All traffic demand, corridor geometry and corridor buildings are synthetic. Simulated gains are not measured real-world improvements. Real map coverage and heights are incomplete; missing building heights use an 8 m display fallback.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html` | Independent globe and external map sources |
| `src/engine.js` | Deterministic traffic, builders, adversaries and permit rules |
| `src/app.js` | Corridor rendering and browser orchestration |
| `src/template.html` | Corridor HTML/CSS and build placeholders |
| `build.js` → `corridor.html` | Dependency-free assembly; never edit the generated file directly |
| `src/sf-world.js`, `src/sf-view.js`, `src/sf-data.js` | San Francisco landmarks, pilot view/inspector, record normalization |
| `src/coord.js`, `src/coord-view.js` | Deterministic coordination agents and gateway; agent workspace UI |
| `src/domains.js`, `src/graph.js`, `src/simulation.js`, `src/city-agents.js`, `src/city-view.js` | Domain registry, knowledge graph, simulation interface, multidomain investigation and UI |
| `data/sf/` | Dated DataSF snapshots + manifest (checksums, URLs) |
| `test/` | Node built-in tests; simulation, build and SF data/landmark checks |
| `docs/` | Architecture, vision, decisions, sources, phase reports and San Francisco Phase 2A specs |
| `scripts/` | Optional dependency-free browser audits against an isolated browser |

Follow [AGENTS.md](AGENTS.md) and load context needed for the task: [PROJECT_STATE.md](PROJECT_STATE.md) for current status, [master roadmap](docs/MASTER_ROADMAP.md) for authorized planning. [HANDOFF.md](HANDOFF.md) is historical context; its phase numbering and performance claims are not current acceptance evidence.

## Validation and limitations

Phases 0–10 are closed; Phase 10 production was verified at `a25169c` (`phase10-release`). Phase 11 scientific intelligence is released at `088ebe4` (`phase11-release`), with production Chrome checks 10/10 passed — see the [Phase 11 report](docs/PHASE_11_REPORT.md). Final Phase 11 Node integration: 130/130; scoped local Chrome dossier audit: 10/10. The Node and local Chrome results are recorded development checks; the separate production audit verified the deployed workflow with zero model/NYC requests and zero console errors. Historical Phase 10 checkpoint: Node 121/121; Chrome 159/159; negative audit 12/12. Firefox and Safari remain unverified. A scheduled trigger was observed at 2026-10-15 00:50:55 UTC, with collection skipped by the freshness gate; reliable hourly cadence remains unverified. Phase 13 is authorized and adds the laboratory described below; Phase 14 remains proposed.

Release preparation (2026-10-14) directly verified [NYC Administrative Code § 23-502(d)](https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-204577): public datasets are made available without use restrictions; the City may require source, version and modification attribution. The five NYC snapshot manifest entries include providers, source URLs, retrieval dates and modification notes.

Providers and licenses are listed in [DATA_SOURCES.md](docs/DATA_SOURCES.md). Esri imagery requests are disabled because usage rights are unresolved; Nominatim requests are also disabled. No paid services or billing have been configured. CORE code is provisionally proprietary under FD05; no open-source project license is granted. Public visibility provides no confidentiality; third-party code/data retain their own licenses. See [IP and attribution](docs/IP_AND_ATTRIBUTION.md).

## GitHub

Canonical repository: https://github.com/vincentleg/core (existing public repository; visibility preserved). Production: https://vincentleg.github.io/core/. `main` contains the application and its generated corridor; GitHub Pages publishes branch `main`, directory `/`, with `.nojekyll`. Deployment evidence is recorded separately from local test results.

For integration/release validation, stage intended changes and run `node scripts/verify.mjs`. It checks integrity/CSP and the Node suite without dependencies. Pre-push reuses a passing proof for the identical runtime tree and Node version for up to 24 hours; markdown-only pushes retain security scanning without repeating application tests. GitHub CI validates a fresh checkout independently. Snapshots default to explicitly historical replay; `--current-data` on the science/civilization CLI fails closed on stale or unclassified collection dates. Collection freshness does not prove observation freshness or scientific validity.


### Phase 13 — bounded scientific research

Open [the scientific laboratory](research.html): reproduce an entirely synthetic Howard queue experiment or a historical, sourced 2024 energy-accounting exercise; compare a baseline and two variants, adjust a stress factor, inspect dissent/sources and trace a fictional WS12 contribution. Calculations execute locally in the browser; no live LLM, public account, calibrated traffic model or measured field benefit. CLI: `node scripts/research.mjs --record` or `node scripts/research.mjs --question examples/research/energy-question.json`. Reuses CORE council roles, knowledge retrieval and private SQLite findings/history. Optional local prose adapter: `--ollama`, never verified evidence. See [Phase 13 report](docs/PHASE_13_REPORT.md) and [tool decisions](docs/PHASE_13_TOOLING.md).
