# Phase 8 — rapid audit (2026-10-14)

Baseline: `725261d` (Phase 7), fast-forwarded to `fa438f7`, the commit created by the first scheduled data refresh.

## Verified counts

| Quantity | Value | Source |
| --- | --- | --- |
| Registered profiles | 68 | `ORG.counts(buildRegistry())` |
| Rule-based executable | 17 | Same; includes the mission coordinator and the decision gateway |
| Model-assisted executable | 7 | Same; needs local Ollama `qwen3:8b` |
| Coordination-only / unavailable | 29 / 15 | Same |
| Participants in recorded model-assisted missions | 8 | `data/missions/cognitive/index.json` (3 recordings) |
| Participants in recorded rule-based missions | 15 | `data/missions/index.json` (11 recordings) |
| **Distinct agents with any recorded work** | **23** | Union of both. Phase 7 reported only the 8 model-assisted participants; corrected here |
| Agents executing on the public site | 0 | Static site, no model endpoint (public mode) |

## Why only about five avatars appeared

1. **Default population.** `agents-world.js → arrive()` showed only the participants of the flagship recording (5 agents). Every other profile had no avatar unless "Afficher tous les exécutables" was pressed. That control sat deep in the Organisation panel and showed the 24 executables, never all 68.
2. **Level of detail.** Avatars were hidden below zoom 11.5 and shrunk without labels below 14.6, so the default city view (zoom 12.6) showed small figures.
3. **No aggregate layer.** There was no clustering or count at district zoom, so a large population had no representation when zoomed out.

## Why clicks seemed not to open a profile

The avatar click called `openAgent → show('agents')`. That re-rendered the whole Organisation workspace: truth panel, KPIs, model status, explainer, hierarchy table, department tree. The agent's dossier came **last** (`#ag-profile`), below the fold of a 420 px panel. The click worked, but the visitor saw a generic organisation panel. There was no agent-specific floating card, no tabs, and no collaborator, mission or evidence navigation.

## Why agents looked static and lined up

- **Idle meant standing.** Outside a replay, avatars only "breathed"; no motion source existed for non-executing agents.
- **One straight line.** `idleLayout()` placed agents on the segments nearest the coordination point. Those are consecutive blocks of the same street, four per block, so the agents stood in a line.
- **Replay stays short and local.** Most tool calls of the flagship recording use the knowledge library or policy checks, which have no location. Those agents walk to the virtual coordination point and stay there; only one sidewalk record produces a real walk.
- **Sliding, not walking.** The figures did not turn to face their direction of travel, and the walking cycle only swung the limbs.

## Scheduled refresh (Phases 5–7 open issue)

- **Configuration:** the workflow is `active`, on the default branch `main`; Actions is enabled with all actions allowed; the repository is public and not a fork.
- **Observed runs:** the first `schedule` run happened on **2026-10-14 at 08:41 UTC**. It succeeded (all steps, including tests and the integrity gate) and pushed commit `fa438f7`. It is roughly 2 h 24 min after the 06:17 slot, so it was delayed.
- **Missed slots:** 03:17, 09:17 and 12:17 UTC (checked at 14:00 UTC). So **1 of 4** slots since creation (03:17, 06:17, 09:17, 12:17 UTC) produced a run.
- **Conclusion:** the schedule works, but it is sparse and delayed. That matches GitHub's documented best-effort cron (delays and dropped events under load). Continuous 3-hourly refresh **cannot be claimed**; the interface must show the real history and the data age.

## Other findings

- **Third-party requests:** fonts (Google Fonts) and MapLibre (unpkg) load from third-party CDNs, which disclose visitor IP addresses (Phase 7 legal checklist, item 1).
- **No local operations layer:** the session scheduler only runs in the browser, so rule-based agents have no persistent, recorded workload beyond the 11 recorded missions.
- **Problems are not linked to agents:** the problems registry (98 entries) has no assigned agents, investigation status or map layer.

**Update at 14:40 UTC.** A second scheduled run started at 14:30 UTC, about 2 h 13 min after the 12:17 slot, and **failed** in the Tests step. The cause was a latent time-dependent bug in `test/phase3.test.js`. The test assumed every feed source had last been attempted at the time of the last successful update. Real scheduled runs are staggered, so a source with a 3–6 h interval that was last tried at 08:41 is legitimately due within the test's +61 min window, and 11 sources were due instead of 10. The test was fixed in Phase 8 to check each source's own interval, with the same rule as `dueSources`.
