# Phase 10 — checkpoint (saved on founder request, 2026-10-14)

**Branch:** `phase10`; the commit SHA is in the final report and `git log -1 phase10`. **`main` is untouched**: it holds the Phase 9 release (`d5b52bf`, tag `phase9-release` = `84f356c`) and is deployed on GitHub Pages. Do not merge until the gates below pass.

## Phase 9
Released and verified in production (see `docs/PHASE_9_REPORT.md` §L).

## Phase 10: done (committed on `phase10`)

| Area | What exists |
| --- | --- |
| City configuration | `src/cities.js`: SF and NY operational, Paris and Tokyo navigation only |
| New York data | `scripts/nyc-snapshot.mjs` → `data/nyc`; collisions on limited-access roadways (FDR, bridges, tunnels) excluded from the 20 m join; NYC network `data/osm/nyc-*`; `src/data-policy.js` entries |
| Organisation | `ORG.buildWorld()`: 82 profiles, SF codes unchanged, 14 new |
| Tools (`src/civ-tools.js`) | City labels; `accessibility.ramps`, `works.near-points`, `decision.interventions` |
| Engine | `createEngine({city})`; `ramps-works`; `decision-safety-works` |
| Cross-city | `src/civ-world.js`: methodology review, memory reuse, supersession, episodes, restart-safe |
| Memory | `src/civ-memory.js`: `supersede` and `conflicts` |
| Discovery | `src/civ-discovery.js`: snapshot diff, including changed works windows, row order ignored |
| Scheduler | `scripts/civd.mjs` with `scripts/lib/civd-core.mjs` |
| Runtime and CLI | Multi-city; `node scripts/civ.mjs decision <city> <nhood>` and `node scripts/civ.mjs world <c>/<nh> <c>/<nh> [--fresh]` |
| Map and motion | `src/city-layer.js` (NYC layers); motion per city (`src/agent-motion.js`); replay arc and camera (`src/civ-activity.js`) |
| Views and demo | `src/cities-view.js` (tab "Villes & enquêtes"); 9-step demo (`src/demo.js`) |
| Command centre | `control.html` and `scripts/control-server.mjs` (`--queue`; never spawns a process) |
| Recordings | 12 missions in `data/civ` (5 SF, 5 NY, decision, world), all HUMAN_REVIEW; `data/civ/discovery.json`; `data/memory/export.json` |
| Tests | `test/phase10.test.js` (12) |
| Documentation | `docs/DATA_SOURCES.md` (NYC) |

## Docs written last, uncommitted until this checkpoint commit

- `docs/PHASE_10_REPORT.md`: complete, except §P (deployment).
- `docs/DECISIONS.md`: D066–D073.
- `PROJECT_STATE.md`: Phase 10 state.
- `ROADMAP.md`: Phase 10 row.

## Test results (actual)

| Check | Result |
| --- | --- |
| Node | 121/121 |
| Chrome audit | 159/159 (`scripts/browser-audit.mjs`) |
| Negative audit | 12/12 |
| Integrity scan (`--all`) | 0 findings (265 files) |
| Perf | Ready 788 ms; first load 4,905 KB; NY street 59 fps (`test-results/phase10/`, ignored) |

**Known count error:** the message of commit `6fb03e0` says "122/122"; the real result was 121/121. The report records the correction.

## Remaining tasks (in order)

1. Update `README.md`: Phase 10 line and test counts.
2. Update `CLAUDE.md`:
   - "Phases … 3–10 closed; do not start Phase 11";
   - current state: Phase 10 modules and commands.
3. Run `node --test test/*.test.js` and `node scripts/csp.mjs --check`, then commit on `phase10`.
4. Release gate:
   1. Fast-forward `main` to `phase10`: `git checkout main && git merge --ff-only phase10 && git push origin main`. No force.
   2. Wait for Pages, then verify https://vincentleg.github.io/core/ with headless Chrome:
      - 82 agents;
      - NYC layers;
      - demo 9/9;
      - 0 requests to `cityofnewyork` or a model;
      - 0 errors.
   3. Tag `phase10-release`.
5. Fill §P of the report and `PROJECT_STATE.md`, then commit and push `main`. Stop there: no Phase 11.

## Risks and notes

- **Local state** (git-ignored, never commit):
  - `.core-local/memory.sqlite` is the live memory;
  - `.core-local/backup/memory-phase9.sqlite` is the Phase 9 backup;
  - `.core-local/backup/dev-bug/` holds the faulty memory from a supersession bug that was fixed and never published;
  - `.core-local/civd.sqlite` is the queue;
  - `.core-local/watch/` holds the watch snapshots.
- **Snapshot comparisons:** two real runs found 0 semantic changes; the SHA differences came only from API row order.
- **Collection budget:** at most 4 collections per city per day; 2 have been used today.
- **CI:** `.github/workflows/city-feed.yml` runs the Node tests. Phase 10 tests bind 127.0.0.1 and use `node:sqlite` (Node 22).
- **Not verified:** the NYC licence's codified text; Firefox and Safari; the hourly cron.

## Resume

1. `cd ~/core && git checkout phase10 && git status`
2. `python3 -m http.server 8000 --bind 127.0.0.1 &`
3. Chrome headless on CDP 9222 (for the audits only).
4. Then start at remaining task 1.
