# CORE V4 — the human civilization layer: delivery report (2026-10-15)

**Branch:** `upgrade/v2-hardening`, local.
- No push, merge, deploy, public launch, payment, account, cloud resource, paid tool or new dependency.
- Constitution V1 and FD01–FD10 are unchanged.

## 1. V3 verification and outstanding risks
- **V3 claims verified:** branch, `world.html`, modules, 189/189 tests, PR #3 open with the MapLibre fix, `main` ahead by data commits only.
- **Outstanding risks:**
  - production still serves MapLibre 5.7.3 until PR #3 is merged and deployed (release priority, kept separate from V2–V4);
  - incident actions F1, F2, F4–F6 (firewall, sessions, passwords, listeners, router) are still open;
  - the Firefox long-session failure is unresolved; Safari and screen readers were not tested.

## 2. What was delivered
| # | Deliverable | Kind | Where |
|---|---|---|---|
| 2 | Constitutional amendments P1–P15, A1–A2 | Proposal (nothing in force) | `docs/v4/CONSTITUTIONAL_AMENDMENTS_PROPOSED.md` |
| 3 | V4 architecture: shared models, pillars, child safety, news-for-education design, human-empowerment map, institutional integration, recognition | Proposal + status per item | `docs/v4/ARCHITECTURE.md` |
| 4 | CORE Identity | **Implemented, local** | `src/civic/identity.mjs`, `commons.html` → Profil |
| 5 | CORE Idea Vault | **Implemented, local** (encrypted, chained versions, permissions, local publication) | `src/civic/vault.mjs` → Coffre à idées |
| 6 | CORE Labs | **Implemented, local** (deterministic checklist, revisions, contests) | `src/civic/labs.mjs` → Labs |
| 7 | CORE Arena | **Demo** (one fictional challenge; user as judge beside labelled fictional sheets) | `src/civic/arena.mjs` → Arène |
| 8 | CORE Academy | **Demo** (teacher mode, fictional learners, lesson on a real record) | `src/civic/academy.mjs` → Académie |
| 9 | CORE Continuity | Research (bibliography to verify, framework) | `docs/v4/CONTINUITY.md` |
| 10 | CORE Global Progress | **Implemented, local** (8 virtual counts, 2 sourced Earth indicators, Kardashev teaching tool) | `src/civic/progress.mjs` → Progrès |
| 11 | Threat model | Design + coded controls | `docs/v4/THREAT_MODEL.md` |
| 12 | Economic update | Hypotheses as tested code | `docs/v4/ECONOMIC_UPDATE.md`, `scripts/lib/economics.mjs` |
| 13 | Tests and performance | See §3 | — |
| 14 | Decision register | — | `docs/v4/DECISION_REGISTER.md` |

**The user journey that works end to end, locally:**
1. Enter CORE World and choose an avatar.
2. Meet agent CORE-PUB-0036 and open the real Folsom sidewalk problem.
3. Follow "Développer une idée en privé" to the encrypted vault, where the idea is pre-linked to the problem.
4. Save a version, then authorise Labs and read the checklist.
5. Revise; the new version is chained to the previous one and the checklist improves.
6. Contest an analysis, which is routed to a human.
7. Publish locally with a licence and attribution.
8. Judge in the fictional Arena, try the Academy lesson in teacher mode, and see the progress indicators.

## 3. Tests
| Suite | Result |
|---|---|
| Node | **195/195** (189 at V3; +6 for the V4 modules) |
| Integrity (`--all`) | **0 findings**, 410 files |
| Commons audit, Chromium 155 | **30/30**: identity, vault (ciphertext-only storage, chain), labs (permission, checklist, revision improves, contest), arena (fictional, sealed, closed vote), academy (teacher-demo), progress (sources, no score), mobile, GET-only, no errors |
| World audit, Chromium 155 | **30/30**, unchanged V3 behaviour, plus the vault link. Benchmark: 60 fps at 0–50 m; reveal update mean 1.5–2.5 ms, p95 19–37 ms |
| Accessibility probe (labels, names, landmarks) | All 6 Commons tabs and World: one `main`, one `h1`, `lang=fr`, no positive tabindex, every button named. **Fixed:** 10 Arena justification fields and the Academy open answer had no accessible label; now 0 unlabelled. Screen readers not run |
| Firefox, Safari, screen readers | **Not run** in V4 |

## 4. What remains a hypothesis, blocked or conceptual
- **Hypotheses:** age ranges, prices, school contract value, conversion, cost per user, and all economic scenarios.
- **Blocked** (decision register R1–R8):
  - release of the security fix;
  - pushing and publishing;
  - accounts, servers and timestamp services;
  - any real minor or school;
  - legal review of the vault and of child safety;
  - news sources;
  - incident actions.
- **Conceptual:** public voting, public rankings, collaboration in the vault, model-assisted Labs, real classrooms, live education news, Continuity dependency maps, institutional workspaces.

## 5. Commits (V4)
See `git log --oneline 7e172cb..HEAD`.
