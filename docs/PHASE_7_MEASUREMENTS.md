# Phase 7 — measurements

All figures come from the commands below, run on 2026-10-14 (UTC) on the development machine (Apple M1 Max, macOS) against `python3 -m http.server 8000 --bind 127.0.0.1`. The browser was Chrome 155.0.8059.40 in headless mode with software rendering, a 1440×900 viewport and the cache disabled. Headless frame rates are capped at 60 and are only comparable between runs on this setup, not with a real GPU.

## First load and city view (`scripts/perf-audit.mjs http://localhost:8000/ <out.json>`)

| Metric | Before (`805e249`) | After (Phase 7) | Note |
| --- | --- | --- | --- |
| Time to platform ready | 995 ms | 973 ms | Within run-to-run noise |
| Transferred on first load | 2,786 KB / 63 requests | 3,237 KB / 104 requests | +451 KB / +41 requests, mostly NASA Blue Marble tiles (JPEG, zoom ≤ 3) for the opening Earth, plus 4 new scripts and 3 SVG files |
| JS heap after GC | 23 MB | 24 MB | |
| Orbit frame rate (corridor) | 60 fps | 60 fps | Display cap |
| Rendered circle markers, zoom-14 overview | 48 | 49 | +1 is the virtual coordination point |
| Rendered circle markers, zoom 15.6 | 511 | 512 | Same |
| Sidewalk simulation recompute | 2.3 ms | 2.3 ms | Unchanged model, fingerprint `929b8be4d02e6efc` |
| Uncaught errors | 0 | 0 | |

The raw JSON files are in the ignored folder `test-results/phase7/` (`perf-before.json`, `perf-after.json`).

## Agents in the world (ad-hoc probe through CDP, the same Chrome)

| Scenario | Result |
| --- | --- |
| Street view, no avatars | 60.2 fps |
| Flagship replay, 5 avatars animating, zoom 16.5 | 59.7 fps |
| All 24 executable profiles shown (illustrative rest positions) while the camera orbits | 59.8 fps |
| Replay plan build (33 steps, routes and messages) | 0.2 ms |
| Replay length at ×1: flagship mission (242 s recorded) / event mission (342 s) / Phase 4 deep mission (1,084 s) | ≈ 31 s / 81 s / 118 s |

Avatars are one shared SVG markup per DOM marker, animated with CSS only. They are hidden below zoom 11.5, shrink and drop their labels below 14.6, and pause their animations when the tab is hidden. They are also static when the visitor prefers reduced motion. The replay loop runs only while a replay is playing.

## Tests

| Suite | Result |
| --- | --- |
| `node --test test/*.test.js` | 93/93 (87 earlier + 6 Phase 7) |
| `scripts/browser-audit.mjs 9222 …` (Chrome 155) | 136/136 (117 earlier, one of them adapted to the five-section navigation, plus 19 Phase 7 checks) |
| `scripts/browser-negative-audit.mjs` (Chrome 155) | 12/12 |
| `scripts/integrity-check.mjs --all` | 0 findings (153 files) |
| Firefox 122 (headless, BiDi) | Not run: no remote listener after 30 s, both inside and outside the tool sandbox (`sandbox_extension_issue_file_to_process … Operation not permitted`, `RenderCompositorSWGL failed`) |
| Safari | Not run: needs `safaridriver --enable` (a machine-wide setting, deliberately not changed) |
| Mobile 390×844 (Chrome emulation) | Landing, entry, replay: no horizontal overflow; one panel at a time |
