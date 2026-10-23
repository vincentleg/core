# CORE V3 — The Living Earth: delivery report (2026-10-15)

**Branch:** `upgrade/v2-hardening`, local, on top of the 10 V2 commits.
- Nothing was pushed, merged or deployed.
- No billing, account system, cloud resource, paid tool or new dependency was added.
- Constitution V1 and FD01–FD10 are unchanged.

## 1. What was implemented (verified)
| Area | Result | Evidence |
|---|---|---|
| V2 stabilization | V2 state confirmed: 10 commits, clean tree, no sensitive files, PR #3 mergeable, `main` 2 bot data commits ahead | `git`, `gh` |
| Security (incident) | Orphaned debug Chrome stopped; the cookie-bearing profile moved unread out of the repository; an exposed `http.server` stopped; local backup script and first verified backup | Commit `7d30c4e`; incident record |
| Firefox | Controlled isolated probe: Firefox 122 renders correctly (no context loss, no map error, zone layer drawn). The audit failure appears only late in the long sequence | Probe output (§4) |
| Foundation modules | Coordinates, safety, dialogue, contributions, geo policy, entitlements | `500fc44`, `test/world.test.js` |
| Vertical slice | `world.html`: ENTER CORE → 5 avatars and customisation → flight → avatar on Folsom St with third/first person, keyboard, touch, collision, realistic radius, one real agent, one real observed problem, conversation, local contribution, history, no-avatar mode | `42e983c`, `scripts/world-audit.mjs` |
| Documentation | Architecture, technology evaluation, threat model, economic model, decision register, DESIGN.md section, privacy draft | `6bb8547` |

## 2. What was researched (not implemented)
- Rendering engines: Three.js, Cesium, 3D Tiles, deck.gl and WebGPU.
- Data sources: Overture, PMTiles, photogrammetry and Google 3D tiles (rejected).
- Avatar formats: VRM.

See [TECHNOLOGY_EVALUATION.md](TECHNOLOGY_EVALUATION.md).

## 3. What remains conceptual
- Accounts, server and moderation queue.
- Public contributions, which Constitution art. 6 forbids without anti-Sybil protection.
- Voting and rankings.
- Model-based conversations in World.
- Multi-agent collaboration visible in World.
- Institutional workspaces and billing.
- 3D rigged avatars, textures and shader dissolve.
- Terrain following.
- Multi-city streaming, and real-time presence of other humans.

## 4. Testing report
| Suite | Result |
|---|---|
| Node (`node --test test/*.test.js`) | **189/189** (181 at the start of V3; +1 backup plan, +7 World modules and economics) |
| Integrity (`--all`) | **0 findings**, 391 files |
| World audit, Chromium 155 (`scripts/world-audit.mjs`) | **30/30**: style accepted, landmarks and CSP, onboarding, customisation, arrival, honest labels, human vs agent figure, walking 2.8 m in 2 s, turning 46° in 0.5 s, reveal of buildings/ground/band, roads clipped to the radius, radius 0 restores the hologram, collision, first/third person, proximity, agent card, problem pathway, grounded conversation, threat refusal, injection and PII handling, ephemeral memory, local contribution, only GET requests to two hosts, no-avatar mode, mobile and reduced motion, no uncaught errors |
| Main audit, Chromium 155 (`index.html` gained one link) | **162/162** (under load average ≈ 16) |
| Firefox 122 | Not re-run on V3. Isolated probe: map, zone layer and replay render correctly; no context loss in about 80 s. The long-audit failure remains **unresolved**: it appears only after about 8 minutes of continuous automated use |
| Safari / WebKit | **Not run** (needs founder approval for a setting or download) |
| Accessibility | Keyboard-only and no-avatar paths covered by the audit; reduced motion emulated; screen readers **not tested** |

**Rendering benchmark** (headless Chromium 155 on this Mac, software GL, vsync-capped; a 5 s walk from the spawn point; compare runs, not absolutes; GPU time, texture memory and battery cannot be measured headless):

| Radius | Quality | FPS | Frame p95 | Reveal update mean / p95 | Buildings shown realistic |
|---|---|---|---|---|---|
| 0 m | high | 60.0 | 16.7 ms | 2.4 / 35.3 ms | 0 |
| 10 m | high | 60.0 | 16.7 ms | 2.6 / 36.1 ms | 1 |
| 25 m | high | 59.8 | 16.8 ms | 2.4 / 32.8 ms | 4 |
| 50 m | high | 60.0 | 16.8 ms | 1.6 / 20.0 ms | 5 |
| 10 m | economical | 60.0 | 16.8 ms | 1.7 / 21.1 ms | 1 |

Two optimizations, each measured before and after:
- throttling the cache refresh;
- a bounding-box pre-filter.

Together they cut the reveal p95 from about 50 ms to 20–36 ms. The remainder is MapLibre's `querySourceFeatures`. Next step: run it in idle time, off the frame loop.

**Regressions found and fixed during V3:**
- Two invalid style expressions silently produced an empty world. The page now shows style errors, and the audit asserts the style loaded.
- A camera-flight race blocked arrival.
- Whole roads were revealed instead of the radius; they are now clipped.
- Mobile controls overlapped the joystick.

## 5. What is blocked or needs approval
See [DECISION_REGISTER.md](DECISION_REGISTER.md) §B and §C.
- **Release priority:** production still serves MapLibre 5.7.3 (GHSA-jrc7-96c5-q579) until PR #3 is merged and deployed.
- **Proposed amendments:**
  - A1: the visual Earth as the central experience, which conflicts with Constitution art. 1 and the FD10 R1 priority;
  - A2: visual work that exposes evidence (art. 8).
- **Publication:** any merge of this branch would publish `world.html`, labelled prototype, with contributions kept local. That needs a decision.
- **Incident founder actions:** firewall, session sign-out, passwords, other listeners, router check.

## 6. What it costs
- **This work:** no spend. No paid service, account or dependency was added.
- **Runtime:** map tiles from OpenFreeMap (free, no SLA) and CORE's own static files.
- **Operating model:** the exploratory scenarios in [ECONOMIC_MODEL.md](ECONOMIC_MODEL.md) range from −€16k/month (conservative) to +€313k/month (optimistic). Every input is a hypothesis.

## 7. Recommended next steps
1. Founder: approve the release of the V2 security fixes (MapLibre 6.11.2) separately from V3, and complete incident actions F1, F2, F4.
2. Decide amendments A1 and A2, and whether `world.html` may ship with a merge.
3. Run the Three.js/VRM experiment (pinned, vendored, benchmarked on the same route): one rigged avatar and textured buildings within the radius.
4. Move the building-cache refresh off the frame loop, and measure on a real phone.
5. Run the four validation experiments in ECONOMIC_MODEL. Measure inference cost per conversation before enabling any model in World.
6. Design accounts and anti-Sybil measures before any public contribution (Constitution art. 6).
