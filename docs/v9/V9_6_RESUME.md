# CORE V9.6 — STOP checkpoint

Founder stopped development to conserve credits. No new tests, builds, audits, research or deployments may run until explicitly resumed. Read [the complete V9.6 objectives and acceptance contract](V9_6_OBJECTIVES.md) before continuing. CORE HQ remains frozen.

## Git and preservation

- Branch: `v9.6/agent-intelligence`.
- Baseline/parent before this checkpoint: `0bc533ec312d882b40eccd252131dac509c7fd20` (V9.5 production).
- WIP commit: the commit containing this file. Resolve its exact SHA with `git log -1 --format=%H -- docs/v9/V9_6_RESUME.md`; no self-referential SHA is embedded in its own commit.
- All unfinished source/data/document changes are included in the WIP checkpoint. Existing checkpoint documents and PROJECT_STATE were preserved byte-for-byte, including their previously uncommitted contents; their inclusion in the WIP commit does not validate or rewrite them.
- Local ignored SQLite databases, caches, logs and evidence remain in `.core-local/intelligence/` and `test-results/v96*`; do not publish or delete them. They are not in GitHub. Production was not modified and no V9.6 deployment exists.
- Push intentionally omitted: existing pre-push hook would launch new full verification for this changed runtime. The STOP instruction forbids starting tests; hooks must not be bypassed. Authentication worked for V9.5, but that is not authorization to bypass this gate.

## Implemented and demonstrated

- One orchestration framework: pinned LangGraph.js 1.5.1 plus official SQLite checkpointer 1.1.0. Installed only under `scripts/intelligence/`; package lock retained. Native SQLite dependency was built locally.
- Reuses CORE `src/llm.js`. Actual existing loopback Ollama `qwen3:8b` (Q4_K_M) ran real inference. A direct model probe selected a discovery action; investigations made actual model-selected tool calls, retrieved external DataSF aggregates, delegated distinct identity tasks and persisted evidence-linked specialist outputs.
- LangGraph model/action loop, persistent SQLite registry/tasks/checkpoints/events/memory, shared findings, parent/child delegation and bounded worker CLI. Role/tool authorization, numerical/citation guards, local-only endpoints, redirect rejection and disabled cloud tracing are implemented.
- Exactly 500 persistent stable existing IDs, 12 domains, central planner/domain supervisors/specialist roles, geographic responsibility, mission, tools and bounded memory/history. One actual worker capacity, never 500 models. No continuously hosted worker or public job endpoint.
- Verified Census municipal boundaries and ODbL pedestrian snapshots for 16 municipalities: SF, Oakland, Berkeley, Richmond, Alameda, San Leandro, Hayward, Fremont, San Mateo, Redwood City, Palo Alto, Mountain View, Sunnyvale, Santa Clara, San Jose, Daly City. 26,023 nodes, 28,750 edges, 121 building-crossing edges removed. Approximately 600 m municipal study windows plus existing SF network, NOT full city street coverage. Allocation uses square-root official land area with SF evidence multiplier, not population claims.
- Walker start-node support fixes clustering in targeted numerical tests: 500 distinct valid starts across 16 responsibilities; adjacent-edge movement assertions pass. Humanoid renderer reuses existing visuals and expands regional visibility; mobile samples identities across regions.
- Minimal existing-drawer integration for authentic saved investigation/model/tool/delegation records and selected-agent inspection. No site redesign. Browser experience of V9.6 has NOT been verified.
- Numerical scenario tool calls existing V9.5 fluid queue model; uncalibrated, all traffic inputs assumptions. No real-world gain claimed.

## Incomplete / broken / unverified

**V9.6 acceptance is NOT achieved. No complete seven-role autonomous investigation has been demonstrated.**

The interrupted latest investigation is `504d0eea-231f-49b1-92a6-8ad79e504c92`:
- Last SQLite record at STOP: status `working` (STALE after shutdown), 31 logical model calls, 102,935 recorded tokens. Planner waiting; discovery completed; geography executing/interrupted. No completed evidence/quantitative/reviewer/reporter tasks or final report yet. No worker is actually running after shutdown.
- Earlier experimental runs `809f33f0-7329-4e44-b2b8-152febc3842f` and a second run are retained in SQLite with actual schema/loop/budget failures. Never present these as successful.
- Failures found and fixes saved: argument string schema replaced by object; role-specific delegation permissions; duplicate calls rejected; actual tool feedback persisted; comma-separated numeric claims normalized; roster kept before shared findings rather than truncated away; mismatch feedback identifies correct role; full-response provider timeout added. Some fixes were applied while earlier processes were running, so saved runs span code versions.
- Long/repetitive local inference, invalid delegation identities and numerical claim rejection remain practical concerns. Current 48-call budget may exhaust before seven-role completion. Do not reset counters or manufacture completion. Inspect the real records before deciding whether a clean new acceptance run is appropriate.
- Earlier event IDs were call-derived; interrupted/resumed attempts can share IDs and lack complete attempt/usage accounting. Latest source uses unique event UUIDs. Interrupted token usage is unknown. Do not claim complete token/latency accounting for old experimental runs.
- Need finish/review interruption handling, schema validation and resource/context bounds. CLI worker lock survives abrupt interruption. Old DB statuses may say working while worker is offline.
- `data/intelligence/work.json` currently contains the last PUBLISHED failed/unfinished run, not necessarily latest SQLite state. Do not manually relabel it completed. Publish genuine final output only after inspecting it.
- Latest public UI and protected Preview unverified. `public/` was rebuilt once before STOP and may be stale; no deployment occurred.
- Broad Bay Area operational datasets, systematic candidate discovery/priority scoring, permitted news feeds and measured traffic inputs are absent. Current external tools are bounded SF DataSF source refreshes plus authorized existing snapshots. Census/OSM coverage is geometry, not a regionwide problem inventory.
- Supervisors are represented and executable in architecture, but no full hierarchical seven-role investigation has completed. Not all 500 identities have performed work; eligibility is not activity.
- Numerical report gate checks reference existence and numbers, not full semantic truth; independent review and human authorization remain required. Scenario outputs are exploratory.

## Changed files

- `scripts/intelligence/{package.json,package-lock.json,provider.mjs,registry.mjs,tools.mjs,runtime.mjs,run.mjs,geography.mjs}`
- `src/urban/{app.mjs,city.mjs,movement.mjs,intelligence-view.mjs}`
- `data/intelligence/{regions.json,walk-network.json,work.json}`
- `test/intelligence.test.mjs`
- `docs/DATA_SOURCES.md`, `docs/v9/V9_6_WORKER.md`, this resume file and `V9_6_OBJECTIVES.md`.
- Pre-existing saved documents: `PROJECT_STATE.md`, V9_3_CHECKPOINT, V9_4_CHECKPOINT/DEPLOYMENT, V9_5_CHECKPOINT/DEPLOYMENT. They were not edited during V9.6. Read their historical claims in context.

## Configuration / resources

- Ollama endpoint `http://127.0.0.1:11434`, model `qwen3:8b`, existing local model reused. Also supports explicitly configured local OpenAI-compatible provider via CLI.
- No API keys required; no paid service, new model download or hosted worker enabled. No credentials in public output.
- Optional CLI flags: `--provider`, `--model`, `--endpoint`; no required application environment variables. `LANGSMITH_TRACING` and `LANGCHAIN_TRACING_V2` are forcibly disabled by the runtime.
- Current source limits: 1 serial worker; 48 model calls/run; 16 tasks; depth 3; 12 turns/specialist; 24 planner turns; 130,000 recorded tokens; 15-minute session; 60-second inference response; bounded source response sizes. Limits were adjusted during debugging; preserve recorded actual counters and unknown usage.
- Public website displays recorded local output only; no browser-to-model access or continuously running backend. Private memories/conversation context/DBs excluded from static build. Review exporter sanitization before publication.

## Checks ALREADY completed (do not rerun during STOP)

- Latest focused `node --test test/intelligence.test.mjs test/urban.test.js`: **8 passed, 0 failed**, evidence `test-results/v96-targeted.txt`.
- Tests cover 500 unique regional starts and graph movement; provider endpoint restrictions; numerical/citation rejection; reproducible actual calculations; injected-failure checkpoint resume/delegation/tool records. The provider in the protocol unit fixture is explicitly SCRIPTED TEST ONLY, never evidence of intelligent behavior.
- Syntax checks passed for touched runtime/tools/app files at respective edits. `git diff --check` passed before later edits.
- One `node scripts/build-public.mjs` completed: 163 files / 13.0 MB. It was before the latest saved snapshot; NOT final release validation.
- No V9.6 browser smoke, full release verification, Preview verification or production deployment.

## Exact next steps after explicit resumption

1. Read objectives, this note and saved records only; do not restart a repo audit. Confirm stopped-worker/lock status and current WIP branch. Preserve every checkpoint and ignored DB/cache.
2. Review latest runtime boundaries and actual interrupted run. Correct resume/attempt accounting and any remaining role/context feedback issues before spending model calls. Keep strict finite limits and truthful failure states.
3. Resume the same saved investigation if its remaining budget permits, or explicitly record why a fresh, previously untested question is needed. Demonstrate distinct planner/discovery/evidence/geography/quantitative/reviewer/reporter execution, actual external retrieval, numerical scenario tools, reviewer rejection/correction capability, sourced final report and durable restart. Do not claim completion from the existing failed runs.
4. Inspect and explicitly publish the genuine completed output; retain failures and unknown usage. Confirm 500 updated regional registry records and no private-memory export.
5. Run only necessary focused tests and a short browser check: regional automatic humanoids, selection of actual work, adjacent street movement, numerical tool/report and legacy V9.5 journey. Validate public snapshot timestamps/offline status. Preserve commercial pages/manifesto.
6. Only then address bounded candidate discovery/ranking and additional permitted Bay Area data as resources allow, clearly distinguishing unsupported coverage.
7. Required repository release checks once, commit, protected Vercel Preview and verify it. Do not bypass hooks, enable paid infrastructure or promote production without founder approval.

## Resume commands (only after authorization)

```sh
cd ~/core
git status --short
git log -1 --format=%H -- docs/v9/V9_6_RESUME.md
# Dependencies are already installed locally. On another checkout only:
npm ci --prefix scripts/intelligence
# Confirm PID 45156 is no longer a CORE worker before removing its stale lock:
ps -p 45156 -o pid,comm
# Only after confirming that the saved process stopped:
python3 -c "from pathlib import Path; p=Path('.core-local/intelligence/worker.lock'); assert p.read_text()=='45156'; p.unlink()"
node scripts/intelligence/run.mjs --resume 504d0eea-231f-49b1-92a6-8ad79e504c92
# Add --publish only after consciously approving this research run for the public snapshot.
# Focused checks when resumed implementation warrants them:
node --test test/intelligence.test.mjs test/urban.test.js
```

Local SQLite state and cached source responses are not in GitHub. A fresh checkout cannot resume that run without securely transferring `.core-local/intelligence/` from this machine. Otherwise start a new real question with `--question`; do not fabricate the lost execution history.
