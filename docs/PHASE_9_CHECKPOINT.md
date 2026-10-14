# Phase 9 — emergency checkpoint (2026-10-14, ~17:15 UTC)

**Paused at the founder's request** (usage limit). Phase 9 is **implemented and tested locally but not released**.

**Where the code is:**
- Branch `phase9-checkpoint` (pushed).
- `main` and the public site still serve Phase 8 (`fe8b0fc` + bot data commit `1f8917d`).
- Not merged to `main` on purpose: a push to `main` deploys GitHub Pages immediately and activates the new hourly cron.

**Do not start Phase 10.**

## 1. Completed and verified (local)

| Area | What | Verified by |
| --- | --- | --- |
| Study-area data | `scripts/civ-snapshot.mjs` → `data/sf9/`: SoMa, Mission, Tenderloin neighbourhoods; 2024 High Injury Network; injury crashes as **aggregate counts only**; SFPUC flood zone (modelled); street-use permits; manifest with SHA-256. Data-policy entries added | `test/phase9.test.js` (checksums, aggregate-only fields) |
| Pedestrian network | `scripts/osm-walk.mjs` (ODbL): 3 neighbourhoods; **320 walkway edges crossing buildings removed**; largest component; compact v2 encoding; `data/osm/buildings-sample.json` for tests | Node test: 75 seeded routes, no point inside 794 buildings |
| Organisation | Traffic-safety (`CORE-TRF-0057`) and flood-risk (`CORE-WAT-0055`) analysts now have real tools. **26 executable** (19 rule-based + 7 model). Five classes summing to 68 in `data/agents/operational.json` (8 autonomous operational, 18 deterministic, 7 model, 22 coordination, 13 not implemented) | Node tests |
| Engine | `src/civ-engine.js`: lifecycle DISCOVERED → … → HUMAN_REVIEW; executive priority queue; city coordinator; lead delegation; cross-department requests; data-freshness challenges; adversarial review; gateway; human-only decisions; budgets, scope and precondition checks; deduplication; emergency stop; checkpoints and recovery | Node tests (hierarchy, gates, recovery after simulated crash, idempotence) |
| Tools | `src/civ-tools.js`: `safety.crash-profile`, `works.area-windows`, `flood.exposure`, `data.freshness`, `review()` | Recorded missions re-validated in tests |
| Memory | `src/civ-memory.js` (`node:sqlite`): identity, knowledge, episodes, institutional; promotion rules (review by another agent; world findings need a human); hash-chained events; export | Node tests |
| Recorded missions | 5 autonomous missions (3 safety × works, 2 flood × works), all at **HUMAN_REVIEW**; 146 messages; 5 model calls; `data/civ/`, `data/memory/export.json` | Node tests |
| Learning | `scripts/learning-experiment.mjs`. **Procedural, identical task:** failures 3 → 0, tool calls 7 → 4, same 15 findings. **Model lessons:** v1/v2/v3 recorded; **no significant effect** (v3: 37.5 % → 33 %) | `data/civ/experiments/learning-*.json`, Node test |
| Movement | `src/agent-motion.js`: posts, trips only for a reason, no random wandering, network-only routes, occlusion by building prisms, distinct walkway nodes for co-location | Chrome audit checks |
| Activity layer | `src/civ-activity.js`: replays recorded missions (RELECTURE), local live events (only newer than the page), Markdown evidence dossier | Chrome audit |
| Interface | Agent card **Mémoire** tab and autonomous missions; 8-step investor demo (`src/demo.js`); data-health refresh panel | Chrome audit |
| Control centre | `scripts/control-server.mjs` + `control.html`: 127.0.0.1, token, Host and Origin checks, allowlisted actions, human decisions, stop and resume, export | Node test (401/403/421/404/400); manual end-to-end with a demonstration memory |
| Refresh strategy | `.github/workflows/city-feed.yml`: hourly retry plus freshness gate (150 min); commit message states the real trigger | YAML parsed; **not yet run in production** |
| Privacy | MapLibre 5.7.3 vendored in `assets/vendor/` (SRI identical to the pinned hash, licence included); no code CDN; `privacy.html` updated | Node test, Chrome audit (no CDN request) |
| Docs | `docs/PHASE_9_REPORT.md`, `docs/PHASE_9_ARCHITECTURE.md` | — |

**Last full checks on this exact code:**

| Check | Result |
| --- | --- |
| `node --test test/*.test.js` | **109/109** |
| `scripts/browser-audit.mjs` (Chrome 155) | **152/152** |
| `scripts/browser-negative-audit.mjs` | **12/12** |
| `scripts/integrity-check.mjs --all` | **0 findings** |
| `node scripts/csp.mjs --check` | Up to date |

## 2. Partially done / not done

1. **Shared docs not updated:** `PROJECT_STATE.md`, `ROADMAP.md`, `docs/DECISIONS.md` (D059+), `README.md` and `CLAUDE.md` still describe Phase 8. `CLAUDE.md` needs one rule clarified: verified single vendored browser bundles are allowed; dependency directories are not. The report and architecture files exist.
2. **Report sections:** §L (deployment) of `docs/PHASE_9_REPORT.md` is still empty, and the status reads CHECKPOINT.
3. **Not deployed:** no Pages build, no production verification, no public performance measurement.
4. **Hourly cron untested:** it only starts once the workflow is on `main`.
5. **Firefox and Safari:** still unverified (same blockers as Phase 8).

## 3. Known issues and risks

- **No human decision yet:** all 5 missions await the owner's review (`node scripts/civ.mjs decide …` or the control centre).
- **Data and network growth:** published data grows (`data/sf9` ≈ 2 MB, walk network 449 KB, civ recordings ≈ 0.4 MB). Local first load is 4.5 MB uncompressed.
- **Scheduled refresh:** 2 runs for 5 slots so far (one failed on 14:30 UTC because of a test bug, fixed in Phase 8; a manual CI run then passed). The navigation bar may show a stale-data warning until the next collection.
- **Clean branch history:** if `main` receives new bot data commits, merge them into the branch before releasing; regenerated `data/` files may conflict. Re-run the generators rather than hand-editing: `node scripts/agents.mjs --question "…" --segment 7051000` (**never pipe it into `head`**, which stops it mid-write), `node scripts/supervisor.mjs run --fresh --record`, `node scripts/problems.mjs`, `node scripts/civ.mjs record`.

## 4. Exact steps to resume

1. `git fetch && git checkout phase9-checkpoint && git merge origin/main`, regenerating data as in §3 if there are conflicts.
2. Start the local servers: `python3 -m http.server 8000 --bind 127.0.0.1`; headless Chrome on CDP 9222 with the profile in `test-results/`; Ollama is not needed for the checks.
3. Quick checks: `node --test test/*.test.js`, `node scripts/csp.mjs --check`, `node scripts/integrity-check.mjs --all`.
4. Full checks: `node scripts/browser-audit.mjs 9222 test-results/phase9/audit` and `node scripts/browser-negative-audit.mjs 9222 test-results/phase9/neg`. Clear the browser cache first.
5. Update the shared docs listed in §2.1 (keep `PROJECT_STATE.md` at 10 lines or fewer).
6. Merge to `main`, push without force, wait for the Pages build, then verify production:
   - public mode;
   - activity replay labelled RELECTURE;
   - 68 agents;
   - card memory tab;
   - demo 8/8;
   - no CDN request;
   - 0 errors.

   Then fill report §L and set the status to COMPLETE.
7. Check `gh run list --workflow city-feed.yml` for the first hourly gated runs.

## 5. Key commands and files

| Command | Purpose |
| --- | --- |
| `node scripts/civ.mjs run --model --record` | Autonomous missions (local Ollama optional) |
| `node scripts/civ.mjs status` | List missions and memory state |
| `node scripts/civ.mjs decide <id> --reviewer human:<name> --decision approve\|reject\|needs-evidence --record` | Record a human decision |
| `node scripts/control-server.mjs [--memory .core-local/x.sqlite]` | Owner control centre; open the printed URL |
| `node scripts/civ.mjs stop` / `resume --reviewer human:<name>` | Emergency stop and resume |
| `node scripts/learning-experiment.mjs --label=<name>` | Re-run the learning experiment |

**Local state (git-ignored, not committed):** `.core-local/memory.sqlite`, `.core-local/civ-live.json`, `.core-local/queue.json`, `.core-local/STOP`.

**Architectural decisions (to be added to DECISIONS.md):**
- the hierarchy is functional, with cross-department work going through leads;
- memory is local SQLite with human-only world findings;
- procedural learning comes from deterministic records only;
- movement needs a recorded or live reason, on a building-validated network;
- MapLibre is vendored as a single verified bundle;
- refresh uses an hourly cron with a freshness gate;
- the control centre is loopback-only and token-protected.
