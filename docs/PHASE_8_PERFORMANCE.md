# Phase 8 — performance

**Setup:**
- machine: Apple M1 Max, macOS 27.0.1;
- browser: Chrome 155.0.8059.40, headless with software rendering, 1440×900, cache disabled;
- server: `python3 -m http.server 8000 --bind 127.0.0.1`, which serves files uncompressed;
- headless frame rates are capped at 60 and are noisy, so the population figures below are **medians of 3 runs** measured in the same session.

The raw files are in the ignored folder `test-results/phase8/` (`perf-before.json`, `perf-after.json`, `perf8.json`).

## Full population vs no agents (same view, same session; `test-results/phase8/perf8.mjs`)

| View (orbiting) | No agents | All 68 profiles | Articulated DOM avatars | Rendering at that zoom |
| --- | --- | --- | --- | --- |
| City, zoom 12.6 | 60.2 fps | 60.1 fps | 0 | 13 zone aggregates |
| Mission corridor, zoom 14.2 | 20.1 fps | 24.5 fps | 0 | 68 WebGL figures |
| Street, zoom 16.3 | 35.1 fps | 41.4 fps | 40 (cap) | DOM avatars in view, figures elsewhere |

- **No measurable cost:** showing the full population costs no measurable frame rate; differences in either direction are within run-to-run noise.
- **The map dominates:** the low fps at the mission view comes from the map itself (3D buildings and terrain in software rendering), not from the agents.
- **Phase 7 comparison:** Phase 7's DOM-only approach gave **17.4 fps** at the mission view with only 24 avatars.

## First load (`scripts/perf-audit.mjs`)

| Metric | Before (Phase 7, this session) | After (Phase 8) | Note |
| --- | --- | --- | --- |
| Platform ready | 1,281 ms | 1,070 ms | Noise range |
| Transferred (local, uncompressed) | 3,254 KB / 104 requests | 3,585 KB / 111 requests | +400 KB pedestrian network, loaded only once the city is reached (111 KB compressed on GitHub Pages); fonts now self-hosted (~72 KB) instead of Google Fonts |
| JS heap after GC | 24 MB | 28 MB | 68 agents, network graph (10,140 nodes), zones |
| Orbit fps (perf-audit view) | 59.8 | 60 | |
| Circles at zoom-14 overview | 49 | 49 | |
| Simulation recompute | 2.3 ms | 2.3 ms | |

## Engine costs

- **Pedestrian graph build:** 11 ms (Node).
- **Route:** a 2.1 km route takes 9 ms (binary-heap Dijkstra).
- **Zone layout:** 5 ms.
- **Replay plan:** under 1 ms.
- **Update rates:**
  - WebGL figures are updated at about 9 Hz (13.5 ≤ zoom < 15.8) or 4 Hz (zoom ≥ 15.8);
  - DOM avatars every frame (≤ 40 on desktop, ≤ 20 on small or low-power devices; only those in view);
  - no per-agent updates below zoom 13.5.
- **Animation loop:** stops when the tab is hidden and restarts on return; reduced motion freezes all motion.

## Leaks and listeners

- **Heap:** after 8 cycles of navigating every section, opening and closing a profile and starting and stopping a replay, the heap goes from 31 MB to 32 MB after forced GC.
- **Map listeners:** over 6 heavy navigation cycles, the counts grow once (+1 `click`, +2 `mousemove`/`mouseout`, from the problems layer created on first use) and stay flat afterwards. No duplicated listeners accumulate.

## Mobile

At 390×844 (Chrome emulation), there is no horizontal overflow. The profile card becomes a bottom sheet, and the dock, population bar and replay bar hide while it is open.
