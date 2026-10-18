# CORE V9.5 production release — 2026-10-18

- Approved commit: `0bc533ec312d882b40eccd252131dac509c7fd20`.
- GitHub: `origin/v9.5/living-city` synchronized to that exact commit.
- Promoted validated Preview `dpl_CHxL6oKGEymUSPvBpndZRQ55gueJ` into production `dpl_B1jhaBJgAHnXVrPi2XvjNDt1qsNU` (Ready).
- Production: https://creationofrebornearth.com ; existing CORE project and aliases preserved. No environment or domain configuration changes.
- Required pre-push verification passed automatically; no additional full audit launched.
- Focused production Chrome smoke passed: homepage Explore automatically reveals humanoids; 500 represented (249 rendered at sampled viewport); movement on adjacent pedestrian edges; ten actual completed tasks and 490 idle identities; edited scenario calculation; deterministically verified report; six-scene interactive tour. No JavaScript exceptions.
- Five served runtime/data files match the approved commit byte-for-byte. Served homepage HTML matches the validated public build artifact; its sole source difference is the existing production CSP removal of the localhost analysis endpoint.
- Outputs remain explicitly exploratory and uncalibrated; no measured real-world impact claimed. One bounded browser worker, no continuous hosted computation.
- Evidence (local/ignored): `test-results/v95-production/{production-smoke.json,artifact-match.json,html-match.json,deployment.txt,push.log}`.
- All five existing uncommitted checkpoint documents preserved byte-for-byte. No CORE HQ or application code changes.
- No production smoke failures. Broader browser/device testing intentionally omitted.
