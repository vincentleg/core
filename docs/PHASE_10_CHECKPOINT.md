# Phase 10 — rolling checkpoint

Branch: `phase10`. `main` serves the verified Phase 9 release (tag `phase9-release` = `84f356c`; `main` = `d5b52bf`). Do not merge `phase10` into `main` until the Phase 10 release gates pass.

## Stage status

| Stage | Status | Evidence |
| --- | --- | --- |
| A — city architecture + second city | **done** | `src/cities.js`; `scripts/nyc-snapshot.mjs` → `data/nyc`; `scripts/osm-walk.mjs --city new-york` → `data/osm/nyc-*` (197 edges crossing buildings removed); NYC entries in `src/data-policy.js`. Node 109/109 |
| B — multi-city organisation + engine | **done** | `ORG.buildWorld()` (82 profiles, SF codes unchanged); engine per city (`createEngine({city})`); NYC workflows `safety-works`, `ramps-works`; `src/civ-world.js` cross-city mission (director → both cities → methodology review → human; memory reuse; restart-safe); runtime/CLI/control server multi-city. Recorded: 5 SF (unchanged), 5 NYC, 1 decision, 1 world mission — all at HUMAN_REVIEW, no human decision |
| C — discovery + persistent scheduler + memory supersession | **done** | `src/civ-discovery.js` (snapshot diff, dedupe, priority); `scripts/civd.mjs` (SQLite queue, crash recovery, budgets, STOP, triage, follow-ups after human decisions; `--publish` → `data/civ/discovery.json`); memory `supersede` + conflicts. First real diffs (SF 3 h, NYC 17 min apart): **0 changes** — re-run later |
| D — decision intelligence | **done** | `decision-safety-works` (SF Tenderloin): I0–I3, 18-case sensitivity, evidence grades, review, human checkpoint. Index exploratory, uncalibrated; no costs |
| E — UI multi-city, motion per city, command centre, demo | pending | |
| G — validation, docs, release | pending | |

## Key facts (verified)

- **Second city: New York**, study area Chinatown-Two Bridges, Lower East Side, East Village. NYC Open Data Law: no use restriction; attribution of source, version and modifications.

  | Source | Dataset | Notes |
  | --- | --- | --- |
  | Collisions | `h9gi-nx95` | Aggregated; 5-year window ending 2026-06-11, a 125-day lag |
  | Priority corridors | `36nr-7fbp` | Split per neighbourhood, so 7 pieces |
  | Street closures for construction | `i6b5-j7bu` | The permits dataset has no geometry |
  | Pedestrian ramps | `ufzp-rrqu` | Surveys from 2017–2019 |

- **Not integrated in NYC:** flood (stormwater maps are files only), geolocated permits, trees, costs.
- **Comparability caveats for the cross-city mission:**
  - NYC collisions have no injury-severity class, so only fatal counts are comparable;
  - the corridor designations differ (SF HIN vs NYC VZV);
  - works data differs (permits vs closures);
  - crash assignment differs (key-based vs a 20 m spatial join);
  - the time windows differ.

## Resume

1. `git checkout phase10`.
2. Run `node --test test/*.test.js`.
3. Continue with the first pending stage above.
