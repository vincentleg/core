# CORE — instructions for Claude Code

Read `AGENTS.md`, `PROJECT_STATE.md` and `docs/PHASE_1_REPORT.md` first, then only relevant source files. Phases 1, 2A–2D, 3 and 4 are closed; **do not start Phase 5 without the founder's explicit request**. For San Francisco work read `docs/PHASE_2A_TECHNICAL_AUDIT.md` and its companion docs.

CORE is building evidence-backed infrastructure decision review. The current application is a static MapLibre globe and a separate synthetic corridor. Agents propose; deterministic code checks proposal eligibility; humans must authorize; nothing controls real infrastructure. “La Trame” is deprecated. CORE is the product; CORE World is temporary wording only. Keep internal IDs and filenames unless a change is necessary.

Current state: Phase 4 (model-assisted agents, evaluated learning, living City Intelligence) closed on 2026-10-13 — see `docs/PHASE_4_REPORT.md`. A local model is installed with the founder's approval (Ollama user binary `~/.local/ollama/ollama`, model `qwen3:8b`, loopback only); 16 rule-based agents work without it, 5 model-assisted agents need it. The model never computes numbers or decides; `issueCognitiveDecision` recomputes tools and re-validates outputs. Data scripts: `sf-snapshot.mjs`, `city-snapshot.mjs`, `city-feed.mjs` (also GitHub Actions every 3 h), `agents.mjs`, `cognitive.mjs` (live model, ~18 min), `learn.mjs` (proposals; only `human:` reviewers approve); never hand-edit `data/`. Security gate: `git config core.hooksPath .githooks` (pre-commit/pre-push run `scripts/integrity-check.mjs`; never bypass, use reasoned exceptions in `.integrity-allowlist.json`). Tests: `node --test test/*.test.js` (mocks), `node --test test/live/*.test.js` (real model). Browser audits: `scripts/browser-audit.mjs` (Chrome CDP, Firefox `bidi`, sequential).

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
