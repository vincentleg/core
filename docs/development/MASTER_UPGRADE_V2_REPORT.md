# CORE — Master Upgrade V2: delivery report (2026-10-15)

**Branch:** `upgrade/v2-hardening`, local only, based on `consolidation/phase9-13` at `98a90e2` (PR #3).
- Nothing was pushed, merged or deployed.
- No GitHub setting, credential or production data was changed.
- No third-party tool was installed.

## Baseline verified at start
- PR #3 is open, head `98a90e2`. `core-verify` succeeded on its push and PR runs; the only step, "Verify history, snapshots, CSP and affected runtime", passed.
- `main` was 1 commit ahead (bot data refresh `830784f`); it is now 2 ahead (`93d68fc`). Both are data only, and the trial merge is clean.
- `main` and production still serve MapLibre 5.7.3, which is vulnerable to GHSA-jrc7-96c5-q579.

## Security
| Item | Result |
|---|---|
| Incident INC-2026-10-15-01 | Re-checked read-only. Still open: firewall off; `python3` allowed incoming connections; the Chrome profile is still in the repository and held by an **orphaned headless Chrome (PID 30675, DevTools port 9222)** (correction to the earlier "in use" note). Other all-interface listeners outside CORE: 8765, 3101, 8080. Founder checklist F1–F7 is in `docs/compliance/SECURITY_AND_INCIDENT_READINESS.md`, all OPEN. Contained, not resolved |
| Repository integrity | The gate and `.gitignore` now reject `.sqlite`/`.db`, `.core-local/` and Chrome profile stores at any path (`b4cae03`, with a test). No private file is tracked |
| HTML sinks (S5) | 72 `innerHTML` assignments classified; no confirmed injection. The corridor `esc()` did not escape `'` and threw on `null`: fixed, and all 19 escapers are now tested (`9afcab1`) |
| Script safety | `ui-shots.mjs` and `perf-audit.mjs` hard-coded port 9222, the orphaned Chrome holding the profile with real claude.ai/luma.com cookies. They now take `CORE_CDP_PORT` |
| Dependencies | GitHub advisories: 0 affecting `maplibre-gl@6.11.2`. Actions are pinned by SHA |
| MapLibre | Deployment and rollback plan added to D090; not executed |
| Local endpoints in the CSP | Ollama (`127.0.0.1:11434`) and `127.0.0.1:8080` are probed only when the page runs on localhost (`P.local`). Status: NEEDS REVIEW (hardening option: a separate CSP for the public build) |

## Reliability and tests
- **Real bug fixed (`01906b5`):** a stopped activity playback could, 1.5–4 s later, send replay participants back to their posts and clear a mission replay's dimming. Found as a load-dependent audit failure; deterministic regression test with stubbed timers.
- **Audit robustness (`afa95a7`):** positive render checks wait at most 20 s for slow renderers, and the negative check stays immediate.
- **Audit robustness (pending commit):** the main audit disables the browser cache. Before this, runs after an edit could test stale files; Firefox 122 needs a fresh profile per run instead.
- **Audit robustness:** the level-of-detail check uses the same bounded wait as the other render checks.
- **Node tests:** 177 → 181 (escapers, replay race, review-state style, database/profile gate).

## Browsers (MapLibre 6.11.2, final code, fresh profiles)
| Engine | Main audit | Other |
|---|---|---|
| Chromium 155 (CDP) | **162/162** | Negative 12/12 (twice); lab 7/7, 0 errors, 0 external requests |
| Firefox 122 (WebDriver BiDi) | **Unstable, unresolved.** 159/159 once (before the layout and status changes). Then 161/162: one uncaught `InternalError: Promise rejection value is a non-unwrappable cross-compartment wrapper` with no source or stack. Then twice 117/162: at the replay step the map was blank and the level-of-detail check failed. In the run that passed, the camera was over New York at that step; in the failing runs it was over San Francisco with nothing drawn | Root cause **not established**. Candidates: software-WebGL exhaustion in headless Firefox 122, tile throttling after many runs, an unhandled page promise rejection that Firefox cannot report. Not re-run further, to avoid loading third-party tiles repeatedly. Firefox 122 is out of date on this machine |
| Safari / WebKit | **Not run** | Needs Safari "Allow Remote Automation" (founder setting), or the founder-approved Playwright WebKit download |

## UX and design
- **Layout guard:** floating panels overlapped at 390, 820, 1280 and 1440 px. For example, the Population bar covered the "Couches & légende" button and the city panel. A priority rule (inspector > Explorer > Activity > Population) removes every overlap at 5 viewports; three audit checks guard it.
- **Status honesty:** "ÉLIGIBLE / PRÊT POUR REVUE HUMAINE" and the corridor's "✓ PRÊT POUR SIGNATURE" used the green "check passed" style. They now use a neutral cyan `info` style, with a test. `src/coord.js` keeps its event status, because changing it would alter recorded fingerprints.
- **Contrast (computed):** every text/background pair measured is at least 5.88:1; text drawn on the map was not measured.
- **Documents:** `docs/DESIGN.md` (tokens, layout, the existing status vocabulary, motion, accessibility, design debt) and `docs/USER_FLOWS.md` (nine implemented flows mapped to the audit checks).

## Performance (Chromium headless, same machine, 2 runs each; compare, not absolute)
| | `main` (5.7.3) | Branch (6.11.2) |
|---|---|---|
| Ready (ms) | 1279 / 1057 | 1148 / 768 |
| Transferred | 5024 KB | 5188 KB (+3 %) |
| Requests | 121–122 | 122 |
| JS heap | 50 MB | 44 MB |
| Orbit FPS | 58.5–58.8 | 59.8 |

No optimisation was applied: nothing measured justified one.

## Tools and skills
The full matrix (27 candidates) is in `docs/development/CLAUDE_TOOLING_AUDIT.md`.
- **Installed (third-party):** none.
- **Adopted:** one CORE-authored project skill, `.claude/skills/core-browser-audit/`.
- **Adapted, principles only:** Superpowers, Agent Skills, Matt Pocock Skills, Karpathy guidelines, Awesome DESIGN.md (format only), LottieFiles motion principles.
- **Experiments needing founder approval:** Cloudflare security-audit skill (its full mode uses subagents) and Playwright for WebKit.
- **Deferred:** Anthropic Skills, Ponytail, Diagram Design, Graphify, Taste Skill, UI UX Pro Max, img2threejs, Motion, Lottie, Hyperframes.
- **Rejected:** Caveman (proxy, CLI telemetry), Impeccable (calls its own server), Humanizer (hides AI use), Claude-Mem, `npx skills` as an install path (telemetry by default), GSAP (licence), Remotion (company licence), Claude Motion Skill, Katana (crawler; its link to the screenshot is unverified).

## Not done, and why
- Safari/WebKit and screen-reader runs need a founder setting or approval.
- No `CHANGELOG.md`, `TASKS.md`, `ENV.md` or `PRD.md`: they would duplicate `PROJECT_STATE.md`, `ROADMAP.md`, the consolidation register and `docs/PRODUCT_VISION.md`. The only environment variables are optional (`CORE_CDP_PORT`, CI's `CORE_VERIFY_BASE`).
- No token consolidation or visual redesign; the debt is listed in `docs/DESIGN.md`.
- The city-feed PR workflow was already designed and stays inactive (OP01).

## Scientific integrity
- No change to `src/engine.js`, the gateways, recorded data, fingerprints, evidence validation or human-authorization logic.
- The only status change makes pending states look less final, never more.
- The Node suite, including determinism and fingerprint tests, passes.
