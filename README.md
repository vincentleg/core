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

- MapLibre GL JS 5.6.0 globe with OpenFreeMap streets, extruded buildings, city navigation, and Nominatim search. Existing satellite and terrain switches remain experimental.
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
| `docs/` | Architecture, vision, decisions, sources and Phase 0 audit |

Read [PROJECT_STATE.md](PROJECT_STATE.md), [ROADMAP.md](ROADMAP.md) and [AGENTS.md](AGENTS.md) before changing code. [HANDOFF.md](HANDOFF.md) is historical context; its phase numbering and performance claims are not current acceptance evidence.

## Validation and limitations

Phase 0 adds six passing tests; no automated test suite existed at the initial revision. Chrome desktop inspection confirms globe/SoMa buildings and the corridor agent/permit flow. See [the audit](docs/PHASE_0_AUDIT.md) for browser coverage and unresolved issues, including Nominatim policy gaps, Esri terms, input validation and uncalibrated traffic.

Providers and licenses are listed in [DATA_SOURCES.md](docs/DATA_SOURCES.md). Existing Esri imagery is not open data and is not approved for production use. No paid services or billing have been configured. CORE itself has no repository license grant yet; do not infer one from public visibility or third-party licenses.

## GitHub

Canonical repository: https://github.com/vincentleg/core (existing public repository; visibility preserved). `main` contains the application and its generated corridor. GitHub Pages deployment is a separate step: if enabled, use branch `main`, directory `/`, with `.nojekyll`. This audit does not claim a live Pages deployment.
