# Phase 9 — Autonomous Intelligence & Living Civilization: report

Status: **CHECKPOINT (not released) — 2026-10-14.** Implemented and tested locally; not yet deployed, see docs/PHASE_9_CHECKPOINT.md. Baseline `fe8b0fc` (Phase 8). Phase 10 has **not** started.

Architecture and deployment: [PHASE_9_ARCHITECTURE.md](PHASE_9_ARCHITECTURE.md).

## A. Audit (verified, not assumed)

**Confirmed:**

| Item | Value |
| --- | --- |
| Registered profiles | 68 |
| Executable | 24 (17 + 7) before this phase |
| Agents with recorded work | 23 |
| Supervisor | Present |
| Ollama `qwen3:8b` | Available locally |
| `node:sqlite` | Built into Node 22.20, no dependency |

**Found:**
- **Buildings in the walk network.** The Phase 8 pedestrian network was never checked against buildings: **320 OSM walkway segments crossed building footprints**, the likely cause of agents "crossing buildings".
- **Aimless motion.** Avatars wandered randomly with no reason (illustrative motion), which the brief now forbids.
- **Unsafe corridor tools.** Outside their snapshot they return false "0 windows" absence claims or crash.
- **Scheduled refresh.** 2 scheduled runs for 5 slots so far. The 14:30 UTC run **failed**, caused by a time-dependent Phase 3 test (fixed in Phase 8; CI then passed a manual run).

## B. Figures that must not be confused (2026-10-14, from data)

| Quantity | Value |
| --- | --- |
| Registered profiles | **68** |
| Executable agents | **26** = 19 rule-based + 7 model-assisted. Phase 9 implemented two profiles with real tools: the traffic-safety analyst `CORE-TRF-0057` and the flood-risk analyst `CORE-WAT-0055` |
| Operational classes (sum 68) | autonomous operational **8** · executable deterministic specialist **18** · model-assisted **7** · coordination only **22** · registered, not implemented **13** |
| Model-assisted agents | 7, local only (Ollama) |
| Agents with recorded work | **33** (Phase 8: 23; plus the participants of the autonomous missions) |
| Agents running locally now | **0** (the runtime runs only when the owner starts it) |
| Agents running publicly | **0** (static site; recordings only) |
| Verified outcomes in the world | **0** |
| Simulated outcomes | The corridor planting simulation (uncalibrated, Phase 5) and the 7 simulated problems derived from it. No new simulation in Phase 9 |
| Recorded autonomous missions | **5**: 3 road safety × works, 2 flood × works. Each went through 8 stages to human review; 146 recorded messages; 5 local model calls; 66 s wall time and 0.5 s CPU, mostly model time (M1 Max) |
| Human decisions recorded | **0**. All 5 missions await the owner's review |
| Illustrative visual behaviour | Posts (virtual zones, not offices); accelerated trip display, with the factor stated |

## C. Intelligence core

**Organisation:**
- executive (priority) → city coordinator (ownership) → department lead (plan, delegate, consolidate, recommend) → specialists;
- cross-department work goes through the other department's lead (request → delegate, logged);
- the data verifier challenges sources;
- the adversarial reviewer rejects unsupported claims;
- the gateway proposes;
- **only a human decides**.

Tests check the delegation chain, the human-only gates, budgets, deduplication and the priority queue.

**Messages** record sender, recipient, mission, purpose, timestamp, evidence references and outcome. They come from execution, not from templates written for display.

**Memory** (SQLite, local) has four layers: identity, knowledge, episodes and institutional. Promotion runs candidate → verified → reviewed by **another** agent → approved:
- procedures and lessons derived from deterministic records can be approved by that review;
- **world findings need a human**;
- rejected and superseded entries stay;
- events are SHA-256 hash-chained.

The published export holds 77 episodes, 6 approved procedures, 3 approved lessons and 20 findings reviewed by agents but **not approved** (they await a human).

**Recovery:** a simulated crash after a checkpoint resumes and reaches the same findings, and a finished mission is never re-run (tested).

## D. Measured learning

**Procedural learning (department lead, deterministic): demonstrated on an identical task.** Tenderloin safety × works, with empty memory, then after learning from the Mission mission:

| | Before | After |
| --- | --- | --- |
| Failed subtasks | 3 | **0** |
| Tool calls | 7 | **4** |
| Messages | 27 | 24 |
| Accepted findings | 15 | 15 (identical) |
| Decision | Eligible for review | Eligible for review |

The 3 learned procedures followed the full chain candidate → verified → reviewed → approved. Recorded in `data/civ/experiments/learning-*.json`.

**Model lessons (interpreters, `qwen3:8b`, temperature 0): no significant improvement shown.** Three versions are recorded as they are:

| Version | Rejection rate before → after | What it taught us |
| --- | --- | --- |
| v1, generic lesson | 3/8 (37.5 %) → 3/5 (60 %) | The lesson did not name the pattern the model actually used ("en raison de"), and was scoped to one agent |
| v2, lessons quote the rejected pattern and are shared | 3/8 → 2/9 (22 %) | Two flaws: lessons kept accumulating during the test runs, and the validator wrongly flagged "chantiers **approuvés**" as decision language |
| v3, lessons frozen and validator fixed | 3/8 → 3/9 (33 %) | **No meaningful effect** on this sample (3 tasks) |

The model-learning mechanism exists and is safe. A demonstrated benefit would need more tasks; that is not claimed.

## E. New cross-domain workflows (real data, executed)

| Workflow | Data | Agents | Computation | Recommendation | Review |
| --- | --- | --- | --- | --- | --- |
| **Road safety × street works** (SoMa, Mission, Tenderloin) | Injury crashes, **aggregate counts only**, 2021-09-01 → 2026-08-31 (`ubvf-ztfx`); 2024 High Injury Network; street-use permits | Mobility lead, traffic-safety analyst, works analyst (through the civil lead), data verifier, reviewer, gateway, plus broad candidates | Crashes by HIN segment, by severity and pedestrian involvement, rate per km per year; joined with permits within 120 days. Example: Tenderloin, **70 HIN segments with crashes and planned works, 20 with a severe or fatal crash** | Before works, ask SFMTA and Public Works to check the temporary pedestrian and cycle plan on the top segments. Labelled **hypothesis**; "no effect of works on crashes is demonstrated" | Adversarial review: all findings resolve; the recommendation is acceptable; the freshness challenge (crash data ends 44 days before the snapshot) is listed as a caveat |
| **Flood risk × street works** (SoMa, Mission) | SFPUC 100-year storm flood risk zone, 2022, **modelled**; permits; NWS alerts | Water lead, flood-risk analyst, weather-alerts analyst (through the climate lead), works analyst, verifier, reviewer | Point-in-polygon of planned permits in the modelled zone; HIN segments crossing it (Mission: 5 permits, 3 excavations, 44 HIN segments; Tenderloin: 0, a recorded negative result, so not a problem) | Check trench protection and stormwater handling. Hypothesis: modelled zone; "no damage is predicted or demonstrated" | Same; the "modelled, not observed" challenge is listed |

**Evidence dossiers:** a Markdown dossier can be downloaded from the activity layer and from the demo's last step. It covers question, organisation, subtasks, accepted and rejected findings, caveats, assumptions, recommendation, validated model statements, every exchange, sources and the decision state.

## F. Movement and geography (user-reported defect)

- **Network:** 3 neighbourhoods; walkways crossing buildings removed (320); largest component only; **no off-network legs**.
- **Building test:** a Node test samples 75 seeded routes across 3 test areas (SoMa, Mission, Tenderloin) every ~1 m against 794 OSM building footprints, and finds **no point inside a building**.
- **Reasons only:** agents move only for a recorded reason, a replay or live local work, and otherwise stay at valid posts. The Chrome audit checks that travellers follow network nodes and everyone else is at their post.
- **Labelled states:**
  - trip to the evidence location;
  - work at the location;
  - coordination at the post;
  - replay;
  - live (local);
  - at the post.
- **Visuals:** walking cycle, facing direction, accelerated trips with the stated factor.
- **Occlusion:** agents behind 3D buildings are faded, using exact camera-ray against building-prism geometry; MapLibre's own query covers only footprints.
- **Co-location:** co-located agents stand on distinct walkway nodes, never on geometric offsets.

## G. Interface

**Civilisation Activity Layer:** replays the recorded autonomous missions message by message. A specialist walks to the evidence, works and reports; typed links show who talks to whom. The feed is labelled **RELECTURE** and, locally, **EN DIRECT (local)**, but only for events newer than the page (a stale local file is never shown as live).

**Agent card:** gains a **Mémoire** tab (identity version, knowledge, episodes, institutional entries with their promotion history), the operational class, and autonomous missions with every participant clickable.

**Investor walkthrough (8 steps):** Earth → pilot → real problem → lead assembles its team → recorded investigation replayed → evidence and challenges → recommendation with limits → human review (states that no human decision has been taken; dossier download).

## H. Owner control centre (local)

`node scripts/control-server.mjs`:
- binds **127.0.0.1**, with a random token in the URL fragment;
- refuses foreign Host headers (DNS rebinding) and Origins;
- serves a static allowlist only, so no path traversal;
- accepts allowlisted actions only;
- caps JSON bodies at 8 KB;
- requires `human:<name>` for decisions and for lifting a stop.

**Functions:** start a problem or a team, monitor stages, subtasks and exchanges, inspect findings and memory, decide, **emergency stop**, export recordings.

**Tested end to end on 2026-10-14 (demonstration memory):**
- the water team's 2 missions ran to human review;
- a `human:` decision was recorded;
- the stop blocked new starts;
- only a human name lifted it.

**Security tests:** tokenless call → 401, foreign Origin → 403, foreign Host → 421, traversal → 404, non-human decision → 400.

## I. Refresh, privacy, cost

- **Refresh:**
  - **Diagnosis:** valid configuration; GitHub's best-effort scheduler delays runs (about 2 h 20 min) and drops slots (3 of 5); one failure came from a test bug, since fixed.
  - **Strategy at $0:** 3-hourly cron plus an hourly retry, with a **freshness gate** (scheduled runs collect only when data is at least 150 min old).
  - **Labels and interface:** data commits state their real trigger. Data health shows last collection and its real trigger, last attempt, failures, age, and a stale warning beyond 6 h.
  - **Not claimed:** strict 3-hourly refresh.
- **Privacy and supply chain:** MapLibre 5.7.3 is **self-hosted** (single vendored bundle with its licence and SRI matching the hash confirmed on two CDNs). `CLAUDE.md` now permits verified single bundles, not dependency directories. Fonts are self-hosted, so the public page makes **no request to any code CDN**. Crash data is stored as aggregates only. The privacy notice is updated; no compliance is claimed.
- **Cost:** **$0**. Local model, free GitHub Pages and Actions, public data.

## J. Tests, browsers, performance

| Check | Result |
| --- | --- |
| Node | **109/109** (100 + 9 Phase 9) |
| Chrome 155 audit | **152/152** (146 earlier, several adapted to the new semantics, plus Phase 9 checks: activity feed only from records, occlusion, memory tab, demo honesty, no CDN request, purposeful movement, walking cycle) |
| Negative audit | **12/12** (engine-blocked case now blocks the self-hosted bundle) |
| Integrity scan | 0 findings (196 files) |
| Firefox / Safari | Not run: same blockers as Phase 8 (Firefox 122 fails at headless start on macOS 27.0.1; Safari needs a machine-wide setting). Manual procedure in `docs/PHASE_8_REPORT.md` §K |

**Performance** (medians of 3 runs, same session, headless software rendering):

| View | Map only | All 68 agents + activity replay |
| --- | --- | --- |
| City | 60.1 fps | 60.1 fps |
| Mission | 14.8 fps | 18.8 fps (map-dominated) |
| Street | 37.3 fps | 44.3 fps |

- **Occlusion:** 3 ms per pass, run twice a second.
- **Heap:** 41 → 42 MB over 8 heavy navigation cycles.
- **Ready time:** 671 ms locally.
- **First load:** 4,532 KB locally, uncompressed, up from 3,585 KB. MapLibre is now served locally, the walk network covers 3 neighbourhoods, plus the recordings.
- **Fixed regression:** the population and link sources were re-uploaded every frame even when nothing changed, which kept the map rendering continuously. They now update only on change.

## K. Limitations (honest)

- **No human decision yet:** 5 missions await review, and **no verified outcome exists**.
- **Learning:**
  - only procedural learning is demonstrated;
  - model lessons showed no significant effect;
  - samples are small.
- **Two workflows only** beyond the corridor, in 3 neighbourhoods. The recommendations are hypotheses for city staff, not validated interventions.
- **Data caveats:** crash data lags (data ends 2026-08-31); the HIN is an administrative designation; the flood zone is modelled.
- **Autonomy is local and bounded:**
  - it stops when the machine sleeps;
  - no continuous background compute exists publicly;
  - recorded concurrency is 2 missions (4 maximum allowed, not load-tested beyond 2).
- **Movement:**
  - the network covers 3 neighbourhoods;
  - OSM geometry does not assert accessibility;
  - accelerated display;
  - occlusion depends on rendered tiles.
- **Browsers:** Firefox and Safari are still unverified.
- **Refresh:** GitHub cron remains best-effort; the hourly retry is untested in production at the time of writing.
- **Legal:** trademark clearance not done; GitHub Pages is for a non-commercial prototype only.

## L. Deployment

Recorded after the push (below).

## M. Phase 10 recommendations

1. **Human review in the control centre:** the owner reviews the 5 pending missions, so that approved findings enter institutional memory (first verified outcomes, if any).
2. **A third workflow with field validation:** for example a pedestrian-safety follow-up with SFMTA open data on implemented projects (`qwp2-sism` Vision Zero projects).
3. **Model-learning study at adequate scale:** 20 or more comparable tasks, frozen lessons, pre-registered metrics.
4. **Supervisor scheduling:** a local scheduled run (macOS `launchd`, owner opt-in) of `civ.mjs run`, with health shown on the site from recordings.
5. **Second browser:** a Firefox run on another machine; a manual Safari pass.
