# CORE — instructions for Claude Code

Read `AGENTS.md`, `PROJECT_STATE.md` and `docs/PHASE_1_REPORT.md` first, then only relevant source files. Phases 1 and 2A–2D are closed; **do not start Phase 3 without the founder's explicit request**. For San Francisco work read `docs/PHASE_2A_TECHNICAL_AUDIT.md` and its companion docs.

CORE is building evidence-backed infrastructure decision review. The current application is a static MapLibre globe and a separate synthetic corridor. Agents propose; deterministic code checks proposal eligibility; humans must authorize; nothing controls real infrastructure. “La Trame” is deprecated. CORE is the product; CORE World is temporary wording only. Keep internal IDs and filenames unless a change is necessary.

Current state: Phase 2D (multidomain city intelligence) closed on 2026-10-13 — see `docs/PHASE_2_REPORT.md`, `docs/PHASE_2_AUDIT.md`, `docs/CITY_INTELLIGENCE_ARCHITECTURE.md`, `docs/DATA_SOURCE_REGISTRY.md`. All agents are deterministic (no LLM; no provider registered). Snapshots in `data/sf` are refreshed with `node scripts/sf-snapshot.mjs` then `node scripts/city-snapshot.mjs` (never hand-edit). Gateways: `issuePermit` (synthetic traffic), `issueCoordinationProposal` (street works), `issueCityDecision` (multidomain) — all fail closed, none authorizes. Browser audits: `scripts/browser-audit.mjs` (Chrome CDP, Firefox `bidi`, from repo root, sequentially), `scripts/browser-negative-audit.mjs`. Safari automation requires the owner's setting. 51 Node tests pass.

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
