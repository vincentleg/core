# Phase 10 — rolling checkpoint

Branch: `phase10`. `main` serves the verified Phase 9 release (tag `phase9-release` = `84f356c`; `main` = `d5b52bf`). Do not merge `phase10` into `main` until the Phase 10 release gates pass.

## Stage status

| Stage | Status | Evidence |
| --- | --- | --- |
| A — city architecture + second city | **done** | `src/cities.js`; `scripts/nyc-snapshot.mjs` → `data/nyc`; `scripts/osm-walk.mjs --city new-york` → `data/osm/nyc-*` (197 edges crossing buildings removed); NYC entries in `src/data-policy.js`. Node 109/109 |
| B — multi-city organisation + engine | in progress | `ORG.buildWorld()` (82 profiles, SF codes unchanged); new tools `accessibility.ramps`, `works.near-points`, `decision.interventions` |
| C — discovery + persistent scheduler + memory supersession | pending | |
| D — decision intelligence | tool done (`decision.interventions`); workflow pending | |
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
