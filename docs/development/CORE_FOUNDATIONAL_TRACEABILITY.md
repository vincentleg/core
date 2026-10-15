# CORE — foundational traceability, Phases 9–14 (audit of 2026-10-15)

Branch `consolidation/phase9-13` @ `5f20d09` + this audit. Evidence = code, tests, recorded data, live local state and GitHub runs examined in this pass. A test proves the behaviour it asserts, nothing more.

**Status vocabulary:**
- VERIFIED COMPLETE: the stated scope is implemented, tested and observed.
- PARTIAL: some of the intended behaviour exists.
- PROTOTYPE: works locally or synthetically, not as a product.
- DOCUMENTED ONLY
- MISSING
- BLOCKED: waits on an external or founder decision.
- SUPERSEDED

**Sources:**
- FC = `docs/FOUNDER_COMMITMENTS.md`
- FD/OP = `docs/FOUNDER_DECISIONS.md`
- O/F/L = `docs/MASTER_ROADMAP.md`
- Pn = `docs/PHASE_n_REPORT.md`

**Foundational** means CORE's purpose fails without it (Constitution V1, FC01–FC26).

## A. Autonomous civilization (P9, P10)

| Requirement | Source | Implementation | Test | Demonstrated behaviour | Status | Remaining work |
|---|---|---|---|---|---|---|
| Persistent identities | P7–P10, FC12 | `src/org.js` registry: 82 profiles with machine IDs, role, department, competencies, tools, permission, budget; identity layer in `src/civ-memory.js` | phase7/8/9/10 tests | Profiles are stable across builds; identity rows are stored per agent | **VERIFIED COMPLETE** (registry and identity records) | — |
| Distinct roles and professions | P3, P9 | 82 distinct roles in 29 departments. Execution modes: 28 deterministic, 7 local-model, **34 coordination-only, 13 unavailable** | phase3/9 tests | Only 35 of 82 profiles can execute a tool | **PARTIAL** | 47 profiles are labels without executable behaviour |
| Hierarchies and relationships | P9 §C | `supervisor` on 79/82 profiles; executive → coordinator → lead → specialist; cross-department requests go through leads | phase9 delegation-chain tests | Recorded delegation messages (146 in P9) | **VERIFIED COMPLETE** (organizational) | No social or peer relationships beyond mission roles |
| Persistent memory | P9, P10, FC12 | SQLite identity/knowledge/episodes/institutional layers, hash-chained events, checkpoints | phase9/10; supersession and related-rejection tests (this branch) | Local memory: 423 events, 30 findings reviewed but none approved, 6 procedures, 3 lessons | **VERIFIED COMPLETE** (local) | Local and editable by the owner, not anchored (FC09) |
| Learning or adaptation | P4, P9 | `src/learning.js` (evaluated, human-approved knowledge); procedural lessons from deterministic failures | phase4/9 tests | Procedures stop repeated failing delegations. Model lessons: **no significant effect** (P9 §K) | **PARTIAL** | Only procedural learning is shown; small samples; no adaptation of strategies or goals |
| Missions and decision-making | P9, P10 | `src/civ-engine.js`: 8 stages to HUMAN_REVIEW, budgets, retries, gateway; `src/civ-world.js` cross-city | phase9/10 | Recorded missions in `data/civ`; **0 human decisions ever recorded** | **PARTIAL** | Agents *propose* only (by design). The decision loop has never been closed by a human |
| Autonomous daily behaviour | Vision ("living civilization") | **None.** Motion modes are `post` (illustrative fixed position), `travel` (replay of a recorded mission) and `live` (local run started by the owner) | phase8 motion tests | Agents idle at posts unless replaying work | **MISSING** | No schedules, needs or routines; must not be faked (P8/P9 "no fabricated activity") |
| Spatially constrained movement along streets | P8, P9 | `src/agent-population.js` shortest path on the OSM pedestrian graph (validated for buildings in P9); `src/agent-motion.js` | phase8/9 routing tests | Walks follow the network in 3 SF neighbourhoods plus NY areas; display is accelerated and says so | **VERIFIED COMPLETE** (within covered networks) | Coverage is local only; OSM does not assert accessibility |
| Interactions with other agents | P9 §C | Typed messages from execution (request, delegate, challenge, review) | phase9 | 146 recorded messages (P9); replayed with links | **PARTIAL** | Exchanges are mission-bound and rule-based, not open-ended dialogue |
| Observable world-state changes | Vision | Agents write only their own records (`data/civ`, memory export) through an explicit owner `--record`. City data changes come from the feed collector, not from agents | phase10 "publication stays explicit" | No agent action changes any world model | **MISSING** (no simulated world state); intentionally absent for the real world | Needs a simulated world model with state that agent proposals act on, kept separate from real infrastructure |
| Human oversight and safety | FC02, FD04 | STOP file, human-only decisions (`human:` pattern), authority gate, budgets, control centre with token, Host and Origin checks | founder-decisions, phase10 control-centre tests | STOP and refusal paths tested | **VERIFIED COMPLETE** (local), PARTIAL as governance | `human:name` is a label, not authentication (OP02) |
| Continuous autonomy | P9 §K | `scripts/civd.mjs` bounded scheduler, only when the owner runs it | phase10 scheduler test | "Agents running publicly: 0; locally: 0 unless started" (P9 §B) | **PROTOTYPE** | No hosted runtime; it stops when the machine sleeps |

**Verdict:** CORE has an *organization of agents with real tools, memory and recorded investigations*. It is **not yet an autonomous civilization**: there is no daily life, no world state that agents change, no continuous runtime, and most profiles cannot execute.

## B. Constitutional fundamentals — code vs document

| Principle | Source | Enforced in code | Only described | Status |
|---|---|---|---|---|
| Business and World as distinct layers | FC13, FC22, FD02 | Boundary only: no B2B data path; `authorizesRealWorld:false` | Business (identity, RBAC, signatures) and World exist only as text; priorities fixed by FD10 R1/R2 (Civilization first; World the long-term participatory interface; Business potential AI-infrastructure efficiency) | **DOCUMENTED ONLY** (both layers) |
| Accessible public participation | FC19, WS12 | Synthetic contribution sandbox (`scripts/lib/contributions.mjs`), static accessible lab page | No public submission, accounts or moderation | **PROTOTYPE** |
| Transparent scientific proposals | FC01, P11, P13 | Dossiers with sources, hashes, dissent and limits; `research.html` | — | **VERIFIED COMPLETE** (bounded adapters) |
| Evidence verification | FC03 | Gateways recompute; pinned hashes; fail-closed tests | — | **VERIFIED COMPLETE** (deterministic checks); not field verification |
| Independent review | FD07, G3 | Code requires a reviewer step only for the pilot holdout (procedural) | Reviewer not designated; agent "review" is not independent | **BLOCKED** (OP04) |
| Human authorization | FC02, FD04 | Human-only transitions and decisions; authority gate | Authentication of humans | **PARTIAL** (label, not identity) |
| Contributor attribution and rights | FC19–21, IP_AND_ATTRIBUTION | Attribution fields, consent flags, correction, withdrawal, logical erasure in the sandbox (tests "correction hides prior publication", "withdrawal/deletion") | Licensing of contributions, physical erasure, succession, commercial reuse terms | **PROTOTYPE** (synthetic sandbox only) |
| Privacy | CONSTITUTION §6, `src/data-policy.js` | Data policy enforced on feeds; private-by-default contributions; fingerprints exclude private coordinates; private SQLite modes; FD09 rule | Retention and residency policy | **PARTIAL** |
| Revision and rejection histories | FC21 | Memory history arrays, superseded/rejected kept; contribution revisions and objections; reworded-rejection links (this branch) | — | **VERIFIED COMPLETE** (local) |
| Measured, not invented, impact | FC01, FC20 | Impact states disabled; `efficacyValidated:false`; synthetic labels | — | **PARTIAL**: the ban on invented impact is enforced; **no measurement capability and 0 measured impacts** |
| Protection against agent manipulation of trusted knowledge | Constitution §4 | Findings approved only by humans; agents cannot retire approved findings; rejected successors refused; related rejections flagged (this branch) | Paraphrase detection beyond lexical; OS isolation | **PARTIAL** (strong locally) |

## C. Science (P11–P14)

| Requirement | Source | Implementation / test | Status | Remaining |
|---|---|---|---|---|
| Reproducible baseline + interventions, dissent, sensitivity | P11, P13 | `src/science.js`, `src/research.js`; phase11/13 tests; CI and production checks | **VERIFIED COMPLETE** (synthetic traffic, reported energy) | — |
| Calibration before claimed gains | O5, F3, FC05 | `scripts/lib/pilot.mjs` preregister/partition/freeze/evaluate; synthetic tests | **PROTOTYPE**; G0 **BLOCKED** | Authorized data, sealed protocol, reviewer |
| Empirical validation on real data | Phase 14 | Draft `docs/pilot/PREREGISTRATION_NYC_v0.md` | **BLOCKED** (FD09 rights, OP04) | Phase 14B plan |
| SUMO simulator | O5 | None | **MISSING** (deferred until data) | After baseline |
| EnergyPlus | O6, FC07 | None | **MISSING** (deferred) | Separate authorization |
| Real-signal optimization; any intersection worldwide | O2, O3 | None (Paris/Tokyo navigation only) | **MISSING** | After calibrated pilot |
| Kardashev as one research axis | FC24 | `src/research.js` SI-guarded Sagan index, `civilizationRank:null` | **VERIFIED COMPLETE** (bounded calculation) | Expert review |
| Multi-axis progress (peace, freedom, ecology…) | FC25 | `docs/CIVILIZATION_RESEARCH.md` | **DOCUMENTED ONLY** | Indicators and sources |

## D. City Intelligence and infrastructure

| Requirement | Source | Implementation / evidence | Status |
|---|---|---|---|
| Real public sources with provenance | P2–P10 | Dated, hashed SF/NY snapshots; feed collector with state | **VERIFIED COMPLETE** (collection and provenance) |
| Scheduled refresh | P4, FC26 | Cron configured; about 25% of triggers delivered; last scheduled publication 2026-10-14 22:37Z | **PARTIAL** (best-effort, not continuous) |
| Second city / planetary network | P10 | NY operational; Paris and Tokyo navigation only | **PARTIAL** |
| Real infrastructure action | O2, O4, G4 | None; authority gate blocks it | **BLOCKED** by design (constitution) |

## E. CORE World, virtual Earth, avatars

| Requirement | Source | Implementation | Status |
|---|---|---|---|
| Explorable Earth | P1, P6, P7 | MapLibre globe, cinematic flights, SF/NY 3D | **VERIFIED COMPLETE** as a visual context (P6/P7 browser checks, Chromium only) |
| Participatory virtual Earth (place-based contributions) | WS12, FC19 | Sandbox schema with private location by default; no public map submission | **PROTOTYPE** |
| Personal avatars | FC19 | Text and hexagon demo avatar; no 3D avatar, accounts or customization | **PROTOTYPE** (minimal) |
| CORE World B2C / XR | MASTER_ROADMAP | — | **DOCUMENTED ONLY** (optional, distant by FD02) |

## F. Security, data rights, operations

| Requirement | Status | Evidence |
|---|---|---|
| Secrets and integrity gate, no bypass | **VERIFIED COMPLETE** | `.githooks`, `scripts/integrity-check.mjs`, tests |
| Data rights per source (FD09) | **PARTIAL** | `docs/DATA_SOURCES.md`; NYC ATR blocked; SF counts unverified |
| `main` protection | **BLOCKED** (OP01) | Live API: unprotected; proposal ready |
| Test isolation from owner state | **VERIFIED COMPLETE** (defect fixed in this audit) | The scheduler test overwrote `.core-local/civd-status.json`, which the control centre shows as real activity. Isolated queues now report next to themselves; the test asserts the owner's file is untouched. The owner's current file still holds test output until the next real run. Every test that writes `.core-local` was reviewed: the others work in temporary directories (`process.chdir(mkdtemp)`) or per-process files that they remove |
| Known vulnerabilities in vendored code | **PARTIAL** | MapLibre 5.7.3 is affected by GHSA-jrc7-96c5-q579 (critical XSS sanitizer bypass, fixed in 6.4.1). Mitigated by the CSP (no inline handlers); upgrade pending founder approval; `docs/compliance/SECURITY_AND_INCIDENT_READINESS.md` S2 |
| Browsers beyond Chromium | **MISSING** | Firefox/Safari never verified |

## Commitments that cannot be recovered from repository evidence

Please provide the source material (exported conversation or briefs) for these:
1. **Verbatim founder briefs for Phases 9, 10, 11, 13 and the "Grand Consolidation".** Reports cite them only in summary ("Founder's Phase 9 brief ($0, no fake activity, human control)"), so acceptance criteria beyond those summaries are unknown.
2. **The original constitution and anti-Sybil texts** (FC14). Only V1 (2026-10-14) exists.
3. **The definition of "autonomous civilization" and "autonomous daily behaviour"**: needs, routines, economy, whether agents should change a simulated world.
4. **The participatory virtual Earth specification**: who contributes what, where, with which identity, and the moderation model.
5. **The CORE Business offer**: customers, data, liability, pricing (FC13 wording UNVERIFIED; OP02, OP05).
6. **The historical Phase 11 sequence and any "Phase 12"** (FC16; none exist in the repository).
7. **Tooling decisions from conversations** (Edge Rope identity; FC15 origins).
8. **Measured-impact targets**: which real outcomes CORE intends to measure, and with whom.

## Summary

**Counting rule.** Each of the 44 rows has exactly one primary status, the first bold label; qualifiers in parentheses are not counted. Row "Calibration before claimed gains" counts as PROTOTYPE, and its G0 is also BLOCKED.

Reconciled 2026-10-15. Changes from the first count:
- "Contributor attribution and rights" carried a dual label; it is now PROTOTYPE.
- "Measured, not invented, impact" moves from VERIFIED COMPLETE to PARTIAL: only the ban is implemented.
- "Test isolation" uses the vocabulary: VERIFIED COMPLETE after the fix.

| Status | Rows |
|---|---|
| Verified complete | 14 |
| Partial | 12 |
| Prototype | 6 |
| Documented only | 3 |
| Missing | 6 |
| Blocked | 4 |
| **Total** | **45** |

No foundational *civilization* or *validation* requirement is complete. The verified rows are infrastructure for truthfulness (identities, memory, provenance, gates, honest labels), not the civilization or the empirical results themselves.

Compliance, privacy, security and launch readiness: [`docs/compliance/`](../compliance/CORE_COMPLIANCE_AUDIT.md). Founder rulings R1–R5 on the reconstructed spec V0.1: FD10.
