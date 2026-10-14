# CORE — instructions for Claude Code

Read `AGENTS.md`, `PROJECT_STATE.md` and `docs/PHASE_1_REPORT.md` first, then only relevant source files. Phases 1, 2A–2D and 3–7 are closed; **do not start Phase 8 without the founder's explicit request**. For San Francisco work read `docs/PHASE_2A_TECHNICAL_AUDIT.md` and its companion docs.

CORE is building evidence-backed infrastructure decision review. The current application is a static MapLibre globe and a separate synthetic corridor. Agents propose; deterministic code checks proposal eligibility; humans must authorize; nothing controls real infrastructure. “La Trame” is deprecated. CORE is the product; CORE World is temporary wording only. Keep internal IDs and filenames unless a change is necessary.

Current state: Phase 7 closed on 2026-10-14 — see `docs/PHASE_7_REPORT.md` and its companions (architecture, agent civilisation, security review, measurements); `docs/PHASE_5_REPORT.md` for agents, data policy and simulation. Public site: https://vincentleg.github.io/core/ (GitHub Pages from `main`; public mode never contacts a model). Presentation modules: `src/map-style.js`, `src/mission-graph.js`, `src/demo.js`, Phase 7 `src/entry.js` (landing; `#app` skips it), `src/agents-world.js` (avatars and replay of recorded missions only), `src/civ.js`, `src/scheduler.js`. `node scripts/problems.mjs` regenerates `data/problems/registry.json`; after editing the inline script of `index.html` run `node scripts/csp.mjs` (a test checks the CSP hash). Scheduled `city-feed.yml` runs have never been observed — do not claim continuous refresh. Local model (founder-approved): Ollama `qwen3:8b`; `node scripts/cognitive.mjs`. Data policy enforced (`src/data-policy.js`). Measurement: `scripts/perf-audit.mjs`, screenshots `scripts/ui-shots.mjs` (outputs in ignored `test-results/`). Never hand-edit `data/`. Security gate via `.githooks` (never bypass). Tests: `node --test test/*.test.js`, `node --test test/live/*.test.js` (real model), `scripts/browser-audit.mjs` (Chrome).

Rules:
- Preserve current code, Git history and user work. No force push, unrelated refactoring or new phase.
- Existing Phase 1 authorization permits engine/gateway correctness changes. Preserve the point-queue equations, seeded behavior and valid decision thresholds. Invalid/unknown/incomplete evidence must block.
- Free/open tools only; no paid APIs, subscriptions, billing or unnecessary dependencies. Pin external libraries. Do not re-enable Nominatim/Esri without resolving the documented constraints.
- Never commit secrets, credentials, sensitive geographic data, dependencies, raw logs or screenshots. `test-results/phase1/` contains ignored local evidence; compact browser summaries are in docs.
- Edit `src/template.html`, `src/app.js` and `src/engine.js`; regenerate `corridor.html` with `node build.js`, never hand-edit it.
- Validate with `node --test test/*.test.js` and local `python3 -m http.server 8000 --bind 127.0.0.1`. Record actual browser versions, failures and unavailable coverage honestly.
- Keep documentation consistent, PROJECT_STATE.md at 10 lines max, and clearly distinguish geography, assumptions, synthetic traffic, simulation output and validated observations (currently none).
- Work autonomously on routine authorized repairs. Ask only for genuine blockers, security concerns or paid-service requirements. Do not change machine-wide browser settings merely to make a test pass.
- At the end of each phase, update its report/roadmap/state, build, test, inspect staged content, commit and push main without force. Stop before the next phase.

Full historical business/design context is preserved in `HANDOFF.md`; current truth is in `PROJECT_STATE.md` and `docs/PHASE_1_REPORT.md`.
