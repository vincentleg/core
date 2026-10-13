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

- MapLibre GL JS 5.7.3 globe with OpenFreeMap streets, extruded buildings, city navigation, and local pilot-city/coordinate search. Satellite is disabled; optional terrain is approximate (not survey data).
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
| `test/` | Node built-in tests; bounded simulation and build checks |
| `docs/` | Architecture, vision, decisions, sources, phase reports and San Francisco Phase 2A specs |
| `scripts/` | Optional dependency-free browser audits against an isolated browser |

Read [PROJECT_STATE.md](PROJECT_STATE.md), [ROADMAP.md](ROADMAP.md) and [AGENTS.md](AGENTS.md) before changing code. [HANDOFF.md](HANDOFF.md) is historical context; its phase numbering and performance claims are not current acceptance evidence.

## Validation and limitations

Phase 0 established the repository; Phase 1 (prototype reliability and data honesty) is closed — see the [Phase 1 report](docs/PHASE_1_REPORT.md). All 21 Node tests pass. Headless Chrome 155 and Firefox 122 pass the browser audits with no uncaught errors; Safari, physical phones and current Firefox were not tested. Optional audits: `scripts/browser-audit.mjs` (CDP or WebDriver BiDi) and `scripts/browser-negative-audit.mjs` (Chrome). Phase 2A (San Francisco technical discovery) is documented in [the Phase 2A audit](docs/PHASE_2A_TECHNICAL_AUDIT.md); Phase 2B implementation has not started.

Providers and licenses are listed in [DATA_SOURCES.md](docs/DATA_SOURCES.md). Esri imagery requests are disabled because usage rights are unresolved; Nominatim requests are also disabled. No paid services or billing have been configured. CORE itself has no repository license grant yet; do not infer one from public visibility or third-party licenses.

## GitHub

Canonical repository: https://github.com/vincentleg/core (existing public repository; visibility preserved). `main` contains the application and its generated corridor. GitHub Pages deployment is a separate step: if enabled, use branch `main`, directory `/`, with `.nojekyll`. This audit does not claim a live Pages deployment.
