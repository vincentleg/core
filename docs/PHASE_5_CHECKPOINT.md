# Phase 5 — checkpoint (WIP, stopped at the founder's request, 2026-10-14)

## Done (in code, 83/83 Node tests passing with mock model)
- Baseline audit facts reproduced: deep cognitive mission 1004 s, 23 model calls, ~78.7k tokens, 13.8 tok/s, 11.5 GB peak (test-results/phase5, ignored).
- Fast mode (`src/cognitive.js`): deterministic tool routing, shared prompt prefix (prefix reuse verified), compact prompts, revisions only when disputed, content-addressed model cache (`--cache`). Live: 342–371 s, 9 calls (2.7× faster) on the same event.
- Semantic validator `src/semantic.js` + typed quantities in tools: meaning, unit, scope, modelled-vs-measured, temporal, geography, causality. Eval 32/32 (tuned) and 20/20 (held-out, same author). Catches all 4 Phase 4 "depth" errors.
- Specialization catalog + router `src/specializations.js` (32 specs, 17 domains); new profiles: accessibility, urban forestry (model-assisted), data-policy reviewer (deterministic). Specialist/simulation requests and abstention.
- Simulation `src/sim-sidewalk.js` (sidewalk accessibility × tree capacity × works; exploratory, uncalibrated) with alternatives, sensitivity, verify; interactive UI in Simulations view.
- Data policy `src/data-policy.js` enforced (collector + evidence); Open-Meteo quarantined (non-commercial API terms).
- Dossier `src/dossier.js` + UI/export; guided demo section; public mode (no localhost probe on public site); `.nojekyll`.
- Recorded live fast missions in `data/missions/cognitive/` (event 26EXC-05114; planning question).

## Unfinished / blockers
- The last planning recording ran before a tool change (variant runs no longer repeat corridor context): re-record it (`node scripts/cognitive.mjs --mode fast --planning "…"`), then check its gateway replay.
- Browser audit not re-run (nav now has a "demo" section: update the Phase 3 nav check). Firefox hang unresolved.
- GitHub Pages NOT enabled yet; no public URL. Plan: Pages from `main` root (free, public repo; not for commercial SaaS — documented risk).
- First scheduled cron run (03:17 UTC) not yet verified.
- Docs not written: PHASE_5_BASELINE_AUDIT, DATA_POLICY, AGENT_ARCHITECTURE, EVALUATIONS, SIMULATION_REPORT, DEPLOYMENT, REPORT; ROADMAP/DECISIONS.

## Resume
1. Re-record planning mission; run `node --test test/*.test.js`.
2. Update browser audit nav check; run Chrome audit.
3. Enable Pages (`gh api -X POST repos/vincentleg/core/pages -f "source[branch]=main" -f "source[path]=/"`), verify URL.
4. Check `gh run list --workflow city-feed.yml` for an `schedule` event.
5. Write Phase 5 docs and final report.
