# Phase 5 — urban intelligence, multi-agent reasoning, simulation and public deployment: report

Status: **COMPLETE on 2026-10-14**, with the limitations below. It was interrupted once by the founder (checkpoint `d8df15f`) and resumed. Phase 6 has **not** started. Details: [baseline audit](PHASE_5_BASELINE_AUDIT.md), [data policy](PHASE_5_DATA_POLICY.md), [agent architecture](PHASE_5_AGENT_ARCHITECTURE.md), [evaluations](PHASE_5_EVALUATIONS.md), [simulation](PHASE_5_SIMULATION_REPORT.md), [deployment](PHASE_5_DEPLOYMENT.md).

## 1. Implemented

- **Fast model-assisted missions:** deterministic tool routing, shared cached prompt prefix, compact prompts, revisions only when disputed, content-addressed model cache. Deep mode is preserved.
- **Deterministic semantic validation and typed evidence quantities:** meaning, unit, scope, modelled vs. measured, temporal, geography, causality. Adversarial evaluation sets.
- **Organization:** 32 specializations across 17 domains, routing with a relevance floor. 2 new model-assisted specialists (accessibility, urban forestry) and a deterministic data-eligibility reviewer. Agents can request specialists, request simulations, abstain, dispute, revise and propose parameters.
- **New cross-domain simulation** `sidewalk-tree-capacity-v1` (accessibility × urban forestry × works): interactive, reproducible, with sensitivity analysis.
- **Enforced public-data eligibility policy:** Open-Meteo quarantined; exclusions recorded.
- **Scientific decision dossiers:** validated and exportable (Markdown/JSON).
- **Interface:** public mode (no localhost probe), guided 8-step investor demo, Simulations, Agents and Data views.
- **Public deployment** on GitHub Pages.

## 2. Designed or deferred

- Independent adversarial semantic cases (both current sets are by the same author).
- Live-model tests for fast mode (only recorded live runs exist).
- Calibration data for the simulation.
- Firefox and Safari verification.
- A verified **scheduled** (cron) run.
- Commercial hosting, if CORE becomes a service.

## 3. Registered vs. executing

| Profiles | Count |
| --- | --- |
| Registered | 68 |
| Executable | **24**: 17 rule-based, plus **7 model-assisted** that need local Ollama |
| Coordination-only | 29 |
| Unavailable, with gap | 15 |

## 4. Model-assisted capabilities

qwen3:8b on Ollama, local and loopback only.
- **The model can:** interpret evidence, dispute, request evidence, specialists and simulations, propose parameters, abstain, and choose tools (deep mode).
- **The model never:** computes numbers, decides or authorizes.

## 5–6. Performance (live, same machine, same event 26EXC-05114)

| | Wall | Model calls | Tokens | Peak model memory |
| --- | --- | --- | --- | --- |
| Before: deep mode (Phase 4 pipeline, re-measured) | **1,004 s** | 23 | 78,673 | 11.5 GB |
| After: fast mode, benchmark | **371 s** | 9 | 28,763 | 6.5 GB |
| After: fast mode, recorded | **342 s** | 9 | 21,749 | 9.5 GB |
| New planning mission, fast | **242 s** | 7 | 12,271 | 7.4 GB |

- **Speed-up:** **2.7–2.9×**.
- **Prefix reuse verified:** prompt evaluation dropped from 14.7 s to 1.8 s for the following agents.
- **Remaining limit:** generation at about 14 tokens/s under JSON-grammar decoding, roughly 30–40 s per call. The public site therefore serves recorded runs instantly.

## 7. Semantic evaluation

- Tuned set **32/32**; held-out set **20/20**.
- On the real Phase 4 recording: all 4 "depth" misreadings and 3 causal overstatements are rejected, with 0 false positives after fixing 10 found on real data.
- The checks cover the listed error classes only.

## 8. Working simulations

- `sidewalk-tree-capacity-v1` (new, exploratory, in browser and Node).
- `coordination-schedule-v1`, `tree-proximity-exposure-v1`, `evidence-completeness-v1`.
- Energy, ecology and real traffic are declared unavailable.

## 9–10. Data, security, privacy, licences

- All sources are in the enforced policy.
- Open-Meteo is quarantined: its free API is non-commercial only.
- CAISO is used with attribution.
- 311 and business data are aggregate only.
- Integrity scan: 0 findings across all tracked files; hooks block commit and push; no secrets anywhere; the public bundle contains no endpoint or credential.

## 11. Tests and browsers

- **Node:** 83/83 (mock model).
- **Live:** 5/5 in Phase 4 (deep), plus 3 real fast-mode recordings with consistent gateway replays.
- **Chrome 155:** 101/101 local; negative paths 12/12; public-site smoke test passes.
- **Firefox 122:** hangs at startup, not run. **Safari:** not tested.

## 12. GitHub Actions

- `city-feed.yml`: 4 manual runs succeeded on 2026-10-14.
- **No scheduled (cron) execution has been observed yet:** none at 03:47 UTC, after the 03:17 slot. GitHub does not guarantee cron start times.
- Therefore 24/7 refresh is **not claimed**.

## 13–15. Public deployment

- **URL:** **https://vincentleg.github.io/core/**. GitHub Pages from `main`, HTTPS enforced, rebuilt automatically on every push (verified build "built").
- **Free-tier assessment:** free for public repositories; no metered billing; soft limits. It may not host a commercial SaaS or business, so it suits a project or prototype showcase. See [deployment](PHASE_5_DEPLOYMENT.md).
- **$0:** no payment method, paid plan or paid API was used.

## 16. Limitations

- Model semantics are only partly machine-checked; human review stays mandatory.
- Local model only: about 4–6 min per mission; the public site shows recorded runs.
- The simulation is uncalibrated, and its two assumptions (spacing, usable frontage) dominate the result.
- Sidewalk data dates from 2014.
- Planning addresses are not geocoded.
- Firefox and Safari are untested; the cron schedule is unverified.

## 17. Phase 6 recommendations (not started)

1. Verify the cron schedule over 24 h, and add a heartbeat badge.
2. Write independent adversarial semantic sets, and add live fast-mode tests to CI-local runs.
3. Add current sidewalk, curb and driveway data (field survey or authorized sources) to calibrate the simulation.
4. Try a faster local inference setup (smaller schema, speculative decoding) and measure it.
5. Pick a hosting plan suited to commercial use before any commercial launch.
6. Fix the Firefox automation hang on another machine.
