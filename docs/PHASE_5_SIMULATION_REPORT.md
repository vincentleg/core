# Phase 5 — simulation framework and the new cross-domain model

## Framework

A CORE simulation declares the following, in `src/sim-sidewalk.js` (MODEL) and `src/simulation.js` (registry):
- id and version, geographic scope, input datasets with their ids, units, assumptions;
- parameters with bounds, units and the basis of each value;
- applicability limits, calibration status, and the evidence needed for operational use;
- what is **not** computed.

Runs are deterministic and fingerprinted (`verify()` recomputes the fingerprint). Sensitivity is one parameter at a time at its bounds. Out-of-domain parameters are refused.

## `sidewalk-tree-capacity-v1`: accessibility × urban forestry × works coordination

**Status:** exploratory, uncalibrated. It runs in Node and in the browser, with the same fingerprint (`929b8be4d02e6efc` at default parameters on the 2026-10-13 snapshot).

**Question:** on each corridor block, how many additional street-tree positions fit while keeping an accessible pedestrian through-zone, and which must wait for scheduled excavations?

**Data (public, ODC-PDDL):**
- DataSF sidewalk widths (4g86-grxu, 2014 study, with Better Streets Plan classes);
- street-tree inventory (tkzw-k3nq);
- street-use permits (b6tj-gt35);
- street geometry (3psu-pn9h).

| Parameter | Default | Range | Basis |
| --- | --- | --- | --- |
| basinWidthFt | 3 ft | 3–6 | Most frequent plot size in the corridor inventory (3x3) |
| clearPathMinFt | 4 ft | 4–8 | US Access Board PROWAG (2023): 4 ft (1.2 m) minimum pedestrian access route |
| spacingFt | 25 ft | 15–40 | Assumption (to confirm with SF Public Works) |
| usableFrontageShare | 0.6 | 0.3–0.9 | Assumption: no driveway, curb or utility data |
| avoidWorksDays | 120 d | 0–365 | Declared coordination rule |

## Results at default parameters (2026-10-13 snapshot)

- **Observed:** 18 of 44 blocks (all on Folsom) have a 2014 sidewalk width below the minimum of their Better Streets Plan class; 38 are below the recommended width.
- **Modelled:** 93 additional positions. 39 fall where excavations are scheduled within 120 days, leaving 54 plantable now.
- **Alternatives:**
  - A1 (3 ft basins, no deferral): 93 positions.
  - A2 (5 ft basins with a 6 ft comfort path): 24 positions, and 23 blocks without a sufficient path.
  - A3 (3 ft basins, deferring for works): 54 plantable now.
- **Sensitivity:**
  - spacing 15 → 40 ft gives 339 → 22 positions;
  - usable share 0.3 → 0.9 gives 11 → 271;
  - an 8 ft path makes 23 blocks insufficient.

  The result is an order of magnitude for prioritising field surveys, not a planting capacity.
- **Not computed:** canopy, heat, carbon, stormwater, health or economic value.
- **Needed for operational use:** current sidewalk survey, underground utility plans (access-restricted), driveway and stop inventory, soil volume, SF Public Works validation.

## Interaction

The **Simulations** view has sliders for every parameter, a live recompute, totals, the alternatives and sensitivity tables, a per-block table citing source records, map colouring (plantable, deferred, path insufficient), re-verification and JSON export. Agents can request runs (`simulation_requests`, `parameter_proposals`), which code recomputes. The cognitive gateway uses the replayed simulation as the deterministic basis of corridor-wide missions.

## Other models

`coordination-schedule-v1`, `tree-proximity-exposure-v1` and `evidence-completeness-v1` keep their previous behaviour. Energy, ecology and real-traffic models stay declared **unavailable**.
