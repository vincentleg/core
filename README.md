# CORE — Creation Of Reborn Earth

CORE builds a parallel 3D Earth in which proposed infrastructure changes can be simulated and stress-tested before people authorize them. The first intended product is coordination of road and utility works. **Agents propose; a deterministic gateway evaluates; humans authorize. CORE applies nothing to real infrastructure.**

This repository currently contains a static prototype, not a calibrated digital twin or production approval system.

## Run locally

Prerequisites: Node.js 22 (validated with 22.20.0), Python 3 (validated with 3.9.6), and a modern browser. No package installation, API key, account, or paid service is required to run the prototype.

```sh
node build.js
node --test test/*.test.js
python3 -m http.server 8000
```

Open http://localhost:8000 for the globe and http://localhost:8000/corridor.html for the simulator. External maps and fonts require internet access. Stop the server with Ctrl+C. Use a WebGL-capable browser for the globe; the corridor uses Canvas 2D.

## Current capabilities

- MapLibre GL JS 5.7.3 globe with OpenFreeMap streets, extruded buildings, city navigation, and local search. Satellite is disabled; terrain is approximate (not survey data).
- San Francisco: cinematic arrival, neighbourhood navigation, procedural Golden Gate Bridge, Salesforce and Transamerica models (labelled approximate), OSM landmarks, and a Folsom/Howard pilot view of dated DataSF public records (permits, large excavations, paving moratoria, closures) with per-record provenance and checksums. Refresh with `node scripts/sf-snapshot.mjs`.
- City intelligence (Folsom / Howard → Investigation, Thèmes): a registry of seven domains with honest status, six additional real DataSF datasets (street trees, tree removal notices, building permits, energy benchmarks, parks, sidewalk widths), a local knowledge graph and an eight-role deterministic investigation that finds a cross-domain co-location, compares three alternatives with adjustable parameters, reviews itself adversarially and writes a Decision Brief checked by a fail-closed gateway. Refresh new domains with `node scripts/city-snapshot.mjs`.
- Professional platform (top navigation): City Intelligence from 17 registered official and open-data sources (16 active), refreshed every 3 h by GitHub Actions or manually with `node scripts/city-feed.mjs`; an organization of 65 agent profiles: 16 rule-based executable specialists, 5 model-assisted specialists that run on a local open-weight model (Ollama `qwen3:8b`, see `node scripts/llm-check.mjs`), 15 declared unavailable; deterministic missions and model-assisted collaborations (`node scripts/cognitive.mjs`) with recomputing gateways; versioned, role-specific knowledge with human-approved learning (`node scripts/learn.mjs`); decisions and evidence views; 3D camera controls. The model only chooses permitted tools and words validated interpretations: it never computes numbers or decides.
- Street-works agent workspace (Folsom / Howard → Agents · voirie): six deterministic agents analyse the real records (overlaps, repeated work, moratoria, closures, coordination opportunities), compare five scheduling scenarios and submit proposals to a coordination gateway that recomputes everything; recommendations are conditional and always require human review. Pause, verified replay and a guided demo are included.
- A separate synthetic five-intersection corridor with seeded traffic, heuristic builder agents, six stress cases, and robust refinement. No LLM or autonomous infrastructure integration exists.
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

Read [PROJECT_STATE.md](PROJECT_STATE.md), [ROADMAP.md](ROADMAP.md) and [AGENTS.md](AGENTS.md) before changing code. [HANDOFF.md](HANDOFF.md) is historical context; its phase numbering and performance claims are not current acceptance evidence.

## Validation and limitations

Phases 0–6 are complete — latest: [Phase 6 report](docs/PHASE_6_REPORT.md). **Public site: https://vincentleg.github.io/core/** (immersive globe with honest coverage, San Francisco 3D pilot, 9-step guided demo, recorded real model-assisted missions with their execution graph, interactive simulation drawn on the map, decision dossiers).

Providers and licenses are listed in [DATA_SOURCES.md](docs/DATA_SOURCES.md). Esri imagery requests are disabled because usage rights are unresolved; Nominatim requests are also disabled. No paid services or billing have been configured. CORE itself has no repository license grant yet; do not infer one from public visibility or third-party licenses.

## GitHub

Canonical repository: https://github.com/vincentleg/core (existing public repository; visibility preserved). `main` contains the application and its generated corridor. GitHub Pages deployment is a separate step: if enabled, use branch `main`, directory `/`, with `.nojekyll`. This audit does not claim a live Pages deployment.
