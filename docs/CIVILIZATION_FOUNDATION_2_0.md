# CORE — Civilization Foundation 2.0 (consolidation of 2026-10-23)

Branch `foundation/civilization-reset`, base commit `0fff8a3` (SF journey `698a2ca`, foundation `99d66b2`, pre-Explorer baseline `4b3fcb3`). This is a documentation and architecture checkpoint: it changes no runtime code, data, database or infrastructure and authorizes nothing new. Governing rules: Constitution V1.1, FD01–FD11 (`docs/FOUNDER_DECISIONS.md`) and `docs/FOUNDATIONAL_PRODUCT_CONSTITUTION_2026-10-22.md`, including principles 9–14 added in this checkpoint. Phase gaps and sequencing extend `docs/FOUNDATIONAL_RESET_PLAN_2026-10-22.md`; they do not replace it.

**Source note.** The original ten-section Strategic Product Addendum is not stored in the repository. This matrix traces the restatement in the founder's 2026-10-23 "Civilization Foundation 2.0" brief (§§1–11, 15, 18). If the original wording differs, the original prevails and this matrix must be corrected.

**Status vocabulary** (§D): VERIFIED = operational and tested in a recorded checkpoint; IMPLEMENTED = code exists, real-user verification is missing; PROTOTYPE = local, synthetic or illustrative; DOCUMENTED = rule or design only; PLANNED; RESEARCH; BLOCKED. Recorded test results are historical; none was rerun for runtime behaviour in this checkpoint.

## B. Requirements traceability matrix

Phases (R0–R8) are defined in §E. "Const." = product constitution, numbered principle; "Reset" = reset plan.

### A1 — Foundational product positioning

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A1.1 | CORE is a participatory digital Earth linking real geography, human ideas, agents, models, evidence, human decisions and verified outcomes | Const. purpose; `PRODUCT_VISION.md`; `INVESTOR_BRIEF.md` | Globe, SF journey, agents, contribution ledger, hospital pilot | Shared persistent participation; verified outcomes need external records | P0 · R0 | Entry copy and docs say the same thing; no capability presented above its maturity | DOCUMENTED + PROTOTYPE |
| A1.2 | Not merely a map, chatbot, game, dashboard, social network or simulator | Const. purpose | Mission/evidence/decision flow in `src/earth/demo.mjs` | None for docs | P0 · R0 | Positioning text matches §C architecture | DOCUMENTED |
| A1.3 | Four offers: World, Business, Cities, Governments; distinct but connected | Const. "Connected offers" | World (prototype), Business (synthetic hospital twin `src/business/`), Cities/Governments none | Org layer, tenant model, authenticated roles | P2 · R5–R6 | Each offer has its own route, identity and limits label | PROTOTYPE (World, Business); DOCUMENTED (Cities, Governments) |
| A1.4 | Real Earth / CORE World / Hybrid View remain legible | Const. 8; `INVESTOR_BRIEF.md` | Three explicit views on the existing globe | Coverage and quality labels per layer are partial | P0 · R0 | Each view shows provenance, coverage and synthetic markers | VERIFIED (prior checkpoints); labels PARTIAL |
| A1.5 | Kardashev horizon kept as long-term research context, not a capability or human measure | Const. purpose; `CIVILIZATION_RESEARCH.md` | Research page only | — | P3 · — | No UI treats it as progress metric | DOCUMENTED |
| A1.6 | Keep the existing rendering engine and restored holographic identity | Const. 12; Reset | MapLibre globe restored at `4b3fcb3` | — | P0 · R0 | No engine or style replacement in diffs | VERIFIED (branch state) |

### A2 — Visual multi-agent command center

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A2.1 | Geographic placement of agents | `PHASE_8_AGENT_ARCHITECTURE.md` | Agents layer on globe (`src/earth/agents-layer.mjs`, `agents3d.mjs`); positions labeled visualisation | Place record in a shared schema | P1 · R2 | Each placed agent links to its place and mission record | PROTOTYPE; R2 location inspector (`docs/R2_AGENT_COMMAND_CENTER.md`) |
| A2.2 | Persistent identities | Traceability 2026-10-15 §A | `src/org.js` registry with machine IDs; SQLite identity memory (local) | Durable server identity; only part of profiles executable | P1 · R2 | Identity stable across builds; card shows role, sponsor, tools, budget | VERIFIED (registry, local) |
| A2.3 | Visible missions and statuses bound to recorded state or labeled demo state | Const. 9 | Hash-chained event log; demo copy "nothing drawn without a recorded event" | Uniform status vocabulary across views; demo-state badge | P1 · R2 | Test: every rendered status resolves to an event ID or carries a demo label | IMPLEMENTED (R2): every displayed status names its source; browser replays labelled, not live |
| A2.4 | Agent-to-agent collaboration, tools and evidence trails | Phase 8–10 reports | Typed collaboration links, delegation messages, gateways | Readable timeline for nontechnical users | P1 · R2 | One mission shows who did what, with which tool and evidence | PROTOTYPE; R2 shows recorded tool executions, rejections and evidence per agent |
| A2.5 | Bird's-eye navigation and local inspection | Phase 6–8 reports | Camera presets, zone view, agent cards | — | P1 · R2 | Keyboard path to the same information | VERIFIED (prior browser audits) |
| A2.6 | Human-to-agent interaction without technical commands | `AGENT_WORKSPACE_SPEC.md` | Agent cards, dialogue module (`src/dialogue/`) | Guarded, scoped conversations persisted per user | P1 · R2 | Plain-language question returns a sourced, scoped answer or a refusal | PROTOTYPE |
| A2.7 | Human supervision and approval of consequential actions | Const. 2, 4; `AUTHORITY_POLICY.md` | Fail-closed gateways; human review mandatory | Authenticated signer role beyond founder | P0 · R0 | No path reaches "transmitted" without signed human mandate | VERIFIED (gateway tests); signer PARTIAL |
| A2.8 | Civic / scientific / business / institutional agent separation | Const. 9, 11 | Business agents in hospital twin labeled synthetic | Class field and sponsor disclosure in registry | P1 · R2 | Registry rejects an agent without class and sponsor | DOCUMENTED |
| A2.9 | On-demand, bounded execution; no thousands of resident agents | Const. 9; Reset | Bounded scheduler and supervisor | Budget accounting per mission | P0 · R2 | Scheduler test caps concurrency and budget | VERIFIED (scheduler tests) |

### A3 — Idea-to-scenario experience

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A3.1 | Idea → location → problem → structured draft | `PHASE_1_SF_EXPERIENCE.md` | SF journey stop 3, private browser draft | Location picker beyond the example; structured fields | P1 · R1 | Draft records place, problem, claim type and consent | PROTOTYPE |
| A3.2 | Authorized evidence search and missing-information list | FD09; `DATA_SOURCES.md` | Recorded SF evidence; evidence gaps shown | Search limited to registered sources; gap list per draft | P1 · R1/R3 | Unknown or unlicensed source blocks the step | PROTOTYPE |
| A3.3 | Agent analysis and simulation feasibility check | Phase 13 report | Recorded agent investigation (predates the idea) | Analysis of the user's own draft; feasibility rule set | P1 · R3 | Feasibility result names required inputs and whether they exist | DOCUMENTED |
| A3.4 | Scenario comparison with uncertainty and limitations | Phase 1 SF doc | Queue scenarios, browser worker, exported report | Calibration (A4) | P1 · R3 | Each output shows assumptions and "uncalibrated" label | PROTOTYPE |
| A3.5 | Explicit lifecycle states, Draft → Impact measured / Rejected | Const. "Authority and lifecycle" | Local stages in `src/contrib/contributions.mjs` (`stageOf`) | Server workflow, actor per transition, external records for final three states | P1 · R1 | State machine test: illegal transitions refused; final three need external proof | IMPLEMENTED, local (R1, `docs/R1_CONTRIBUTION_LIFECYCLE.md`); server workflow PLANNED |
| A3.6 | Privacy and consent at each transition | Const. 7; `PRIVACY_AND_REGULATORY_READINESS.md` | Private-by-default drafts; sharing helper refuses demo drafts; crisis guard | Server consent records, retention, deletion | P1 · R1 | Consent stored per transition; delete removes draft and derived copies | PROTOTYPE |
| A3.7 | Keep and extend the SF demonstration, do not rebuild it | Phase 1 SF doc | `698a2ca`, `0fff8a3` | Post-CSS full browser rerun | P0 · R0 | 22/22 browser checks rerun green on current commit | IMPLEMENTED (rerun pending) |

### A4 — Simulation-informed planning

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A4.1 | Simulation informs, never controls decisions | Const. 10, 4 | Gateways refuse unsupported proposals | — | P0 · R0 | No code path from simulation output to external action | VERIFIED (gateway tests) |
| A4.2 | Record inputs, observations, assumptions, baseline, limits, calibration, alternatives, uncertainty, reproducibility | Const. 10; Phase 11/13 reports | Hash-checked bundles, sensitivity, dissent (Phase 11/13) | Uniform `simulation` record (Reset contracts) | P1 · R3 | Schema validation rejects a scenario missing any field | PARTIAL |
| A4.3 | Calibration, holdout, independent review before gains | `docs/pilot/`; `science/PHASE14_VALIDATION_READINESS.md` | Preregistration drafts only | Authorized counts and signal plans; external reviewer | P1 · R3 | Holdout error displayed before any benefit; reviewer is not CORE or its model | BLOCKED (data rights, reviewer); R3: corridor under reconstruction, epoch choice and records request needed (`docs/R3_EVIDENCE_READINESS.md`) |
| A4.4 | SF traffic scenarios stay illustrative | Phase 1 SF doc | Labels in tour and report | — | P0 · R0 | Copy test for "illustrative / uncalibrated" | VERIFIED (focused tests) |
| A4.5 | Model self-assessment ≠ independent validation | Const. 10; AGENTS.md | Deterministic verifiers in code | — | P0 · R0 | Review record distinguishes internal check from independent review | DOCUMENTED |

### A5 — Civilization participation

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A5.1 | Optional human identities and persistent avatars | `product/CORE_AVATAR_VISION.md`; Const. 14 | Local avatar config (`src/earth/avatar-config.mjs`); founder account only | Civic account with RLS, consent, deletion | P2 · R4 | Account optional; every function reachable without avatar | PROTOTYPE (local) |
| A5.2 | Contribution history answering the nine "what happened to my proposal" questions | `product/CONTRIBUTION_IMPACT_LEDGER.md` | My CORE shows local draft and "not reviewed" | Reviewer, evidence, simulation and decision links per proposal | P1 · R1 | My CORE answers each question or says "none yet" | PROTOTYPE |
| A5.3 | Public/private proposals, collaboration, discussion | `product/CORE_PUBLIC_PARTICIPATION.md` | Civic commons modules (`src/civic/`), local only | Moderation, anti-abuse, appeals before any public posting | P2 · R4 | Nothing public until moderation and appeal paths exist | PROTOTYPE / BLOCKED (public) |
| A5.4 | Challenges, tournaments, achievements, trophies for contributions only | Const. "Authority and lifecycle", 6, 14 | Fictional arena (`src/civic/arena.mjs`) | Published criteria, anti-Sybil, appeal | P3 · R7 | Achievements reference a contribution ID, never a person score | PROTOTYPE |
| A5.5 | No social scoring, popularity science, coercive gamification, premium civic authority | Const. 1, 6, 14 | — | — | P0 · all | Review checklist on every participation change | DOCUMENTED |
| A5.6 | Never fabricate progress or impact | Const. 3, 5 | Labels; final states unreachable locally | — | P0 · all | Final three states require external evidence ID | VERIFIED (local stage rules) |
| A5.7 | Proof of personhood (World ID) only after separate review | Const. "Connected offers", 14 | None | Privacy, accessibility, dependency review | P3 · — | Not integrated this phase | BLOCKED (by decision) |

### A6 — CORE Business

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A6.1 | Verified organization profiles and geographic discovery | Const. "Connected offers" | None | Verification method; org record; tenant isolation | P2 · R5 | Unverified orgs cannot display a verified marker | DOCUMENTED |
| A6.2 | Company agents clearly sponsored | Const. 11 | Hospital agents labeled synthetic (`src/business/labels.mjs`) | Sponsor field in registry (A2.8) | P2 · R5 | Every business agent card names sponsor | PROTOTYPE |
| A6.3 | Showcases, showrooms, operational simulations, permissioned research | Reset business row | the founder-private project, founder workspace | Consent model for customer research | P2 · R5 | Pilot runs only on synthetic or consented data | PROTOTYPE |
| A6.4 | Payments cannot buy credibility or civic influence | Const. 6, 11 | — | — | P0 · all | Business data model has no field affecting civic ranking or review | DOCUMENTED |
| A6.5 | Pricing hypothetical; billing inactive | Const. "Connected offers" | No billing code | — | P3 · R8 | No payment dependency or endpoint in repo | VERIFIED (no billing in tree) |

### A7 — Spatial intelligence research

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A7.1 | Research watch: spatial AI, world models, digital twins, neural scenes, open renderers | Const. 12; §F register | None | Evidence register entries with sources | P3 · — | Register entries complete per §F fields | RESEARCH |
| A7.2 | No new rendering experiments, photogrammetry, asset purchases, Explorer 2.0 revival | Const. 12; Reset | Rejected commits archived off-branch | — | P0 · all | Diff review excludes them | VERIFIED (branch ancestry) |
| A7.3 | Seven-gate adoption review | Const. 12 | — | — | P3 · — | Signed review record before any dependency | DOCUMENTED |
| A7.4 | Generated world ≠ verified geography | Const. 8, 12 | Procedural façades labeled | — | P0 · all | Label test on any generated content | VERIFIED (existing labels) |

### A8 — Investor positioning

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A8.1 | Positioning statement kept as hypothesis | §F; Reset investor section | `INVESTOR_BRIEF.md` | Real user comprehension evidence | P2 · — | Brief labels it hypothesis | DOCUMENTED |
| A8.2 | Evidence register with URL, author, date, verified quote, interpretation, relevance, capability, status | Const. 13; §F | — | Source verification (public lookup) | P2 · — | No row reaches "verified" without URL and checked quote | DOCUMENTED (all rows unverified) |
| A8.3 | No implied endorsement, investment, traction, customers, partners or revenue | Const. 13; `INVESTOR_BRIEF.md` header | — | — | P0 · all | Brief header and register state none exist | VERIFIED (docs) |

### A9 — Execution order

| ID | Requirement | Doc coverage | Implementation coverage | Missing / dependencies / constraints | Priority · phase | Acceptance criteria | Status |
|---|---|---|---|---|---|---|---|
| A9.1 | P0 integrity → P1 participation, agent orchestration, science → P2 community, Business, Cities → P3 experiences, commercial | §E | — | Founder approval per phase | — | One phase at a time; stop at criterion | DOCUMENTED |
| A9.2 | Next smallest demonstrable milestone named | §G | — | Founder choice | — | Founder approves one option | DOCUMENTED |

### A10 — Non-negotiable constraints

| ID | Requirement | Existing equivalent (not duplicated) | Status |
|---|---|---|---|
| A10.1 | $0 additional budget; no paid APIs, subscriptions, billing | AGENTS.md "Outils/données libres"; Const. "Connected offers" | VERIFIED (no paid dependency added) |
| A10.2 | Authorized data only; stop when unclear | FD09; AGENTS.md | VERIFIED (no data fetched) |
| A10.3 | Human authority; no autonomous intervention | Const. 2, 4; V1.1 | VERIFIED (gateway tests) |
| A10.4 | Scientific honesty; no fabricated claims | Const. 3; AGENTS.md "Afficher ce qui est synthétique" | DOCUMENTED |
| A10.5 | Civic equality; no scoring of human worth | Const. 1, 6 | DOCUMENTED |
| A10.6 | Privacy, security, RLS, tenant isolation; no production DB or infra changes | Const. 7; `SECURITY_BASELINE.md`; `scripts/account/rls-check.sql` | VERIFIED (founder RLS tests); no infra touched |
| A10.7 | No push, deploy, destructive Git, unrelated changes | AGENTS.md | VERIFIED (this checkpoint) |
| A10.8 | Preserve SF journey and visual identity | Const. 12; Phase 1 SF doc | VERIFIED (no runtime change) |

**Conflicts found.** None between the addendum and earlier founder decisions. One tension is recorded rather than resolved: the addendum asks for "persistent avatars" and "global community" while V1.1/FD rules forbid public opening in the current phase. Resolution: those items stay in R4/R7 behind the public-opening gate.

## C. Consolidated product architecture

The four offers are products built on one shared stack. Layers reuse existing modules; nothing new is proposed as infrastructure.

| Layer | Responsibility | Existing reusable components | Gap before scale |
|---|---|---|---|
| Spatial | Globe, places, coordinates, overlays, Real/World/Hybrid | MapLibre globe, `src/earth/`, `src/city-layer.js`, `src/cities.js`, `data/urban/` | Per-layer coverage/quality labels; `place` record |
| Human | Accounts, avatars, contributions, consent | `src/me/`, `src/contrib/`, `src/civic/`, `scripts/account/` (founder RLS) | Civic account, consent store, deletion |
| Agent | Identity, class, sponsor, mission, tools, scope, budget, audit | `src/org.js`, `src/scheduler.js`, `src/civ-memory.js`, `src/tools.js`, gateways | Class/sponsor fields; uniform status vocabulary |
| Scientific | Evidence, assumptions, models, scenarios, calibration, review | `src/engine.js`, `src/science.js`, `src/research.js`, `src/urban/`, `docs/pilot/` | Common `simulation` and `review` records; calibrated pilot |
| Governance | Authorization, moderation, decisions, appeals, transparency | Gateways, `AUTHORITY_POLICY.md`, hash-chained audit | Moderation, appeal, signer roles |
| Organization | Businesses, cities, institutions, verified orgs | `src/business/` (synthetic), founder workspace | Org record, verification, tenant isolation |
| Experience | Exploration, guided demo, missions, education, optional games | `world.html`, `src/earth/demo.mjs`, `src/civic/academy.mjs`, arena | Status-bound agent HUD; text parity |
| Commercial | Future premium and enterprise | Plans/Business descriptions | Billing intentionally absent |

**How the offers connect.** World, Business, Cities and Governments read the same `place`, `evidence`, `simulation`, `review` and `decision` records (contracts listed in the reset plan). They differ in who may create records (tenant/role), which agent class acts (civic, business, institutional), and who signs decisions. Scientific and governance layers are shared and cannot be configured per paying tenant, which enforces Const. 11 structurally. Storage enforces scope (RLS), not the UI.

**Agent OS data flow.** Human or event → mission record → bounded scheduler assigns agents by class and scope → tools run through gateways → events appended to hash-chained log → globe/Hybrid HUD renders only from events (or a labeled demo script) → human reviewer decides → decision record. No step skips the log.

## D. Capability maturity inventory

Based on branch code and recorded checkpoints; nothing was rerun at runtime in this pass.

| Capability | Maturity | Evidence / limit |
|---|---|---|
| Holographic globe, SF views, Real/World/Hybrid | VERIFIED AND OPERATIONAL (local) | Phase 6–11 audits, `restored-explorer.png`; Safari and physical mobile untested |
| Deterministic engine, gateways, fail-closed proof checks | VERIFIED AND OPERATIONAL | 354/354 recorded at `698a2ca`; not rerun for docs |
| Agent registry, bounded scheduler, hash-chained audit | VERIFIED AND OPERATIONAL (local) | Phase 7–10 tests; only part of profiles executable |
| SF seven-stop human–AI journey | IMPLEMENTED BUT NOT VERIFIED (current commit) | 22/22 browser before final CSS; post-fix rerun timed out |
| Founder email-link sign-in and private workspace | IMPLEMENTED BUT NOT VERIFIED | Real inbox sign-in pending |
| Local contributions, My CORE history, avatar | PROTOTYPE / ILLUSTRATIVE | Browser-local only |
| Queue scenarios for Folsom/Howard | PROTOTYPE / ILLUSTRATIVE | Assumed demand and signals; uncalibrated |
| the founder-private project | PROTOTYPE / ILLUSTRATIVE | No customer |
| Fictional arena, civic commons | PROTOTYPE / ILLUSTRATIVE | Local; no moderation |
| Six-language interface | IMPLEMENTED BUT NOT VERIFIED | Some translations lack qualified review |
| Lifecycle server workflow, civic accounts | DOCUMENTED ONLY | Const. lifecycle; reset contracts |
| Agent class/sponsor separation, status-bound HUD | DOCUMENTED ONLY | Const. 9 |
| Business verified orgs, Cities, Governments | PLANNED | No partner |
| World models, neural scenes, generated worlds | RESEARCH ONLY | §F |
| Calibrated traffic pilot, measured impact | BLOCKED | Data rights, observed counts, independent reviewer |
| Public participation, transmission to authorities, billing, World ID | BLOCKED | Public-opening gate, mandates, founder decisions |

**Observed inconsistency (not fixed; runtime frozen).** `src/earth/demo.mjs` says "501 registered agent identities" in one stop and "510 registered agents" in another. One is wrong; correcting it is a runtime copy change that needs approval.

## E. Prioritized engineering roadmap

Each phase is separately authorized and stops at its criterion. $0 = existing local/static resources at prototype scale.

| Phase | User value | Reuse | Required changes | Dependencies | Security / science | $0 | Acceptance and tests | Risks | Stop condition |
|---|---|---|---|---|---|---|---|---|---|
| R0 · P0 Foundation integrity | Trustworthy current demo | Branch, verify suite, browser audit | Rerun browser journey on current commit; fix 501/510 copy if approved | None | Keep all gates | Yes | 22/22 browser + `verify.mjs` green on HEAD | Headless timeouts | Green rerun recorded |
| R1 · P1 Contribution lifecycle | A visitor can follow one idea end to end | `src/contrib/`, My CORE, SF journey | State machine module with actor, proof and consent per transition; local only | R0 | Final three states need external IDs; consent per step | Yes | Unit tests for every legal/illegal transition; My CORE answers the nine questions | Over-promising "submitted" | Local lifecycle passes tests; no backend |
| R2 · P1 Visual agent orchestration | Non-technical users see what agents really did | Registry, event log, agents layer, cards | Status vocabulary; demo-state badge; class/sponsor fields; mission timeline in Hybrid View | R0 | Status must resolve to event or demo label | Yes | Test that rendered statuses map to events; keyboard/text parity | Visual clutter, perf | One SF mission fully legible |
| R3 · P1 Scientific credibility | Scenarios people can trust | Phase 13 runner, `docs/pilot/`, urban worker | Common `simulation`/`review` record; feasibility check; calibration once data authorized | Authorized counts/signal plans (FD09), external reviewer | Preregistration, holdout, independent review | Yes for code; data conditional | Schema validation; holdout error shown before any gain | Data rights not obtainable | Blocked → stop and report |
| R4 · P2 CORE World community | Shared, safe participation | `src/civic/`, account handler, RLS | Civic accounts, moderation, appeals, deletion | R1, founder decision on public opening | RLS, abuse limits, privacy review | Prototype only | Isolation and refusal tests; privacy review signed | Personal data, abuse | Founder gate not lifted |
| R5 · P2 Business pilot | Credible sponsored layer | `src/business/`, founder workspace | Org record, verification marker, sponsor disclosure | R2 class fields | Tenant isolation; no civic influence fields | Yes locally | RLS tests; copy review | Implied partnership | Synthetic pilot reviewed |
| R6 · P2 Cities pilot | Evidence-aware municipal workflow | SF dossier, scenario reports | Resident intake prototype; no transmission | R1, R3 | No impersonation; no government transmission | Conditional | Reviewer-gate and data tests | Data rights, implied partnership | Design reviewed |
| R7 · P3 Civilization experiences | Optional engagement | Arena, avatar config, academy | Achievements tied to contribution IDs | R4 | Anti-Sybil, appeals, accessibility | Yes locally | Manipulation and accessibility tests | Coercive incentives | Founder review |
| R8 · P3 Commercial readiness | Readiness dossier | Plans descriptions | Pricing research and consent review only | Demand evidence | No billing | Yes | Document only | Unvalidated demand | Dossier delivered |

## F. Investor and technology evidence register

No external source was fetched in this checkpoint, so **no row is verified and no quotation is recorded**. Entries are research leads to verify with a public documentation lookup before any use.

| # | Reference (from brief) | Source URL | Author / org | Date | Verified quote | CORE interpretation (hypothesis) | Relevance | Existing CORE capability | Status |
|---|---|---|---|---|---|---|---|---|---|
| F1 | a16z Games themes (AI-native experiences, visual agent interfaces) | not recorded | a16z | — | none | Visual interfaces may make agent work legible | A2 positioning | Agents layer, cards (prototype) | UNVERIFIED |
| F2 | a16z Speedrun | not recorded | a16z | — | none | Possible accelerator fit; no application or acceptance | A8 | — | UNVERIFIED |
| F3 | World Labs (spatial intelligence / world models) | not recorded | World Labs | — | none | Research reference only (Const. 12) | A7 | None | UNVERIFIED |
| F4 | "Atlas" (named in brief; exact project unidentified) | not recorded | unknown | — | none | Cannot be interpreted until identified | A7 | None | UNVERIFIED — identity unclear |
| F5 | Open-source geographic renderers | not recorded | various | — | none | Already uses MapLibre (vendored) | A7 | Globe | UNVERIFIED (category) |
| F6 | Y Combinator | not recorded | YC | — | none | No endorsement or application implied | A8 | — | UNVERIFIED |
| F7 | Spatial computing / digital twins market | not recorded | — | — | none | Market hypothesis | A8 | SF twin, hospital twin (synthetic) | UNVERIFIED |

Positioning hypothesis (not a market conclusion): "CORE is a participatory digital Earth where humans and AI agents collaborate to investigate real-world problems, simulate possible solutions and support evidence-based human decisions." Existing prototype vs. verified capability: see §D. Traction, customers, partners, revenue: none.

## G. Founder decision memo — next milestone

All three options are $0, local, reuse existing code and leave the SF journey intact.

1. **R1 · local contribution lifecycle.** Turn the private SF draft into a tested state machine with actor, consent and proof per transition, and make My CORE answer "what happened to my proposal?" truthfully. Value: the core civic promise becomes demonstrable. Risk: low (local only).
2. **R2 · status-bound agent HUD for one SF mission.** Show, in Hybrid View, each agent's real recorded task, tool, evidence and status, with demo states badged. Value: the most visible "visual agent OS" step and the strongest demo moment. Risk: medium (UI performance, mobile layout).
3. **R3 · authorized traffic evidence request.** Identify official SFMTA/DataSF count and signal-timing sources and their terms, without downloading, and prepare preregistration updates. Value: unblocks credibility. Risk: may end blocked on rights; little visible progress.

**Recommendation: option 1 (R1), preceded by the R0 browser rerun.** It is the smallest milestone that completes the idea → scenario → human decision story with honest states, it is the foundation both R2 (statuses reference lifecycle records) and R4 (accounts) depend on, and it has no data-rights dependency. Acceptance: transition tests pass, illegal transitions are refused, the three final states are unreachable without an external evidence ID, and My CORE shows every lifecycle question with "none yet" where applicable.

## H. Change report

See the commit that introduces this file: modified `docs/FOUNDATIONAL_PRODUCT_CONSTITUTION_2026-10-22.md` (principles 9–14), added this file, updated pointers in `docs/FOUNDATIONAL_RESET_PLAN_2026-10-22.md` and `PROJECT_STATE.md`. No runtime, data, build output, dependency or infrastructure change. Not pushed, not deployed. Remaining risks: original addendum text absent from the repo; evidence register entirely unverified; SF browser journey not rerun on `0fff8a3`; founder live sign-in untested; 501/510 agent count copy inconsistency.
