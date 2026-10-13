# CORE — instructions for Claude Code

Continue autonomously from the preserved Phase 1 work. Read `AGENTS.md`, `PROJECT_STATE.md`, `docs/CLAUDE_HANDOFF.md` and `docs/PHASE_1_REPORT.md` first, then only relevant source files. The founder explicitly requested this handoff; **do not restart Phase 1, do not start Phase 2, and do not mistake a checkpoint commit for acceptance**.

CORE is building evidence-backed infrastructure decision review. The current application is a static MapLibre globe and a separate synthetic corridor. Agents propose; deterministic code checks proposal eligibility; humans must authorize; nothing controls real infrastructure. “La Trame” is deprecated. CORE is the product; CORE World is temporary wording only. Keep internal IDs and filenames unless a change is necessary.

Immediate task: diagnose the Chrome MapLibre 5.6.0 `_updateRetainedTiles` undefined `.key` exception during terrain/navigation; finish available browser validation, then close Phase 1. Firefox CDP harness currently times out across contexts; Safari automation requires the owner's browser setting. Node suite currently has 19 passing tests. See handoff evidence; do not repeatedly run full simulations unnecessarily.

Rules:
- Preserve current code, Git history and user work. No force push, unrelated refactoring or new phase.
- Existing Phase 1 authorization permits engine/gateway correctness changes. Preserve the point-queue equations, seeded behavior and valid decision thresholds. Invalid/unknown/incomplete evidence must block.
- Free/open tools only; no paid APIs, subscriptions, billing or unnecessary dependencies. Pin external libraries. Do not re-enable Nominatim/Esri without resolving the documented constraints.
- Never commit secrets, credentials, sensitive geographic data, dependencies, raw logs or screenshots. `test-results/phase1/` contains ignored local evidence; compact browser summaries are in docs.
- Edit `src/template.html`, `src/app.js` and `src/engine.js`; regenerate `corridor.html` with `node build.js`, never hand-edit it.
- Validate with `node --test test/*.test.js` and local `python3 -m http.server 8000 --bind 127.0.0.1`. Record actual browser versions, failures and unavailable coverage honestly.
- Keep documentation consistent, PROJECT_STATE.md at 10 lines max, and clearly distinguish geography, assumptions, synthetic traffic, simulation output and validated observations (currently none).
- Work autonomously on routine authorized repairs. Ask only for genuine blockers, security concerns or paid-service requirements. Do not change machine-wide browser settings merely to make a test pass.
- When Phase 1 really passes, update its report/roadmap/state, build, test, inspect staged content, commit and push main without force. Original requested completion message: `feat: harden CORE world foundation and permit integrity`. Stop before Phase 2.

Full historical business/design context is preserved in `HANDOFF.md`; current truth is in the new handoff and reports.
