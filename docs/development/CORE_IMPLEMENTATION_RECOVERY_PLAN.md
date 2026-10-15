# CORE — implementation recovery plan (2026-10-15)

Derived from [CORE_FOUNDATIONAL_TRACEABILITY.md](CORE_FOUNDATIONAL_TRACEABILITY.md). CORE's foundational vision is **not complete**. This plan splits work into:
- **Track 1:** requirements confirmed by repository evidence. These may be implemented once authorized.
- **Track 2:** requirements whose intended behaviour exists only in conversations not in the repository. Nothing in Track 2 is built until the founder supplies the source. Speculative civilization behaviour is explicitly **not** started.

FD09 applies throughout: no dataset access, download, processing or transmission without demonstrated authorization.

## Track 1 — confirmed requirements, in priority order

| # | Requirement (traceability row) | Repository source | Needs before work | Done when |
|---|---|---|---|---|
| 1 | Empirical validation (C: calibration, validation) | O5, F3, FC05, FD07, `docs/pilot/` | Founder FD09 rights decision for a dataset; reviewer and thresholds (OP04) | One authorized dataset evaluated once against a sealed protocol; independent reviewer sign-off; failures published |
| 2 | Close the human decision loop (A: missions) | P9/P10 ("0 human decisions") | Founder reviews one recorded mission in the control centre | One recorded `human:` decision with note, memory transitions and an audit trail; no real-world action |
| 3 | Authenticated human authority (B: human authorization) | FC02, FC04, OP02 | OP02 specification: who approves, how identity is proven, TTL and revocation | Approvals tied to verified identities; `human:name` labels rejected for consequential states |
| 4 | `main` protection (F) | FD03, OP01 | OP01 authorization | Ruleset active; a test PR merges only through `core-verify`; feed publishes through PRs |
| 5 | Label-only profiles (A: roles) | P9 §B (47 of 82 non-executable) | Founder choice: implement tools or show these profiles as roadmap | Every profile shown either executes a tested tool or is visibly marked as not implemented |
| 6 | Contributor rights beyond the sandbox (B) | FC19–FC21, IP_AND_ATTRIBUTION | Contribution licence, retention and physical-erasure policy (legal input) | Policy ratified; physical erasure and export tested; still no public accounts without FC14 gates |
| 7 | Anti-manipulation beyond lexical links (B) | Constitution §4, review A2 | None (local) | Tested detection of paraphrased re-entries, or documented acceptance of the lexical limit |
| 8 | Browser coverage (F) | P1, F1 | A machine-level Safari setting needs founder consent | Firefox and Safari audits recorded |
| 9 | Measurement capability for impact (B: measured impact) | FC01, FC20 | A real partner, outcome and authorization (Track 2 item 8) | One preregistered outcome measured from an authorized source |
| 10 | SUMO / EnergyPlus (C) | O5, O6 | Item 1 passes (SUMO); separate authorization (EnergyPlus) | Candidate model beats or fails the frozen baseline on the sealed holdout |

Items 1–4 can proceed in parallel once their founder decisions arrive. Items 5–8 are local engineering. Items 9–10 depend on item 1.

## Track 2 — historical specifications that must be recovered first

These rows stay MISSING or DOCUMENTED ONLY until the founder provides the source (conversation export, brief or decision). For each one, the specific material needed:

| Area (traceability rows) | Exact material needed | Why it blocks |
|---|---|---|
| Autonomous civilization (A: daily behaviour, world-state changes, continuous autonomy) | The founder's definition of "autonomous civilization" and "daily behaviour": agent needs or goals, routines, time model, economy or resources, whether agents act on a **simulated** world and which state they may change, boundaries with the real infrastructure layer, and the hosting expectation (local or always-on, and budget) | Building routines without this risks fabricated activity (P8/P9 rule) and an arbitrary world model |
| Phase briefs | Verbatim founder briefs for Phases 9, 10, 11, 13 and the Grand Consolidation (only one-line summaries exist in reports) | Acceptance criteria beyond the summaries are unknown, so phases can't be declared complete against them |
| Participatory virtual Earth (E) | Specification of who contributes what and where: observation types, location precision, identity level, moderation, and how contributions reach agents or science | Determines schemas, privacy and anti-abuse design |
| Avatars (E) | Intended avatar scope: purely visual, linked to identity, embodied in 3D, interacting with agents | The current minimal demo can't be extended without it |
| CORE Business (B) | Target customers, data they would provide, liability, sovereignty or hosting, pricing model (FC13 wording UNVERIFIED; OP02, OP05) | Drives identity, RBAC and data-separation architecture |
| Constitution origins (B) | Any constitution or anti-Sybil text earlier than V1 (FC14) | V1 is the only baseline; earlier commitments may be lost |
| Phase numbering | The intended Phase 11 sequence and whether a "Phase 12" was ever defined (FC16) | Historical accounting |
| Impact targets (B) | Which real-world outcomes CORE intends to measure, with whom, and the success definition | Without it, "measured impact" stays a prohibition only |
| Tooling | The identity of "Edge Rope" (FC15) | Tooling audit closure |

**Handling.** Supplied material is stored verbatim under `docs/history/` with date and provenance. It is then added to FOUNDER_COMMITMENTS as a new FC row, marked RECOVERED (not retroactively ratified), and the traceability matrix is updated before any implementation.

## Not started, by design

- Civilization routines, needs, economies or a simulated world model (Track 2).
- Public accounts, submissions or Business features (FC14 and OP02 gates).
- Any real-infrastructure adapter (Constitution §5; G4 disabled).
- Any new dataset access (FD09).

## Reconstructed specification V0.1 (founder input, 2026-10-15) — reconciliation

Stored word for word in [docs/history/2026-10-15_CORE_FOUNDATIONAL_SPEC_v0.1.md](../history/2026-10-15_CORE_FOUNDATIONAL_SPEC_v0.1.md). Its own status is **DRAFT, not ratified**, and it is a reconstruction written today, not an original brief. It therefore gives founder *direction*. It does not replace the Track 2 historical sources (its §15 says the same). Constitution V1 and FD01–FD09 stay in force until the founder ratifies otherwise.

### Agreements: V0.1 confirms what the audit and governance already state
- **§5 (civilization):** a persistent *simulated* world state that agents perceive and change within defined permissions is now a founder-stated requirement. It confirms traceability rows A "world-state changes" and "daily behaviour". Their details remain OPEN (§5 "still requiring founder specification"), so they stay MISSING and nothing is built (Track 2).
- **§5 (displayed profession):** "A displayed profession must not imply that the agent possesses the corresponding executable capability." This makes Track 1 item 5 (47 label-only profiles) a founder-backed requirement.
- **§7 (memory):** human-approved findings protected; rewording a rejection must not bypass review; lexical detection is only an initial safeguard. This matches the two fixes on this branch and Track 1 item 7.
- **§9, §11:** FD09; NYC G0 blocked; the NYC preregistration is unsealed; previously inspected observations are not holdout evidence. All match the current state.
- **§13:** the counts 14/11/6/3/6/4 = 44 match the reconciled matrix.
- **§14:** the acceptance principle matches the audit's evidence rule.

### Conflicts and differences — OPEN, FOUNDER DECISION REQUIRED
| # | V0.1 | Ratified repository text | Decision needed |
|---|---|---|---|
| R1 | Two systems: **CORE Business** and **CORE World**, where World is "the accessible, participatory civilizational platform" with its own governance | Constitution V1 §1 and FD02/FC13: **Civilization is the priority**, Business is the future professional offer, **World is an optional, distant B2C extension**; WS12 adds "CORE Public" for participation | Is V0.1 "World" the same as V1 "Civilization" plus "Public"? Does World's priority change? Until decided, V1 wording and priority apply |
| R2 | Initial Business opportunity: **AI and data-centre infrastructure efficiency** | No data-centre code or dataset; Phase 14 pilot is traffic counts; the readiness doc excluded a data-centre pilot for lack of authorized metered data | Should the Phase 14 pilot target data-centre efficiency instead? It would need a dataset whose rights pass FD09 |
| R3 | Avatar "can evolve through verified participation and contributions" | FC19: optional pseudonymous avatar, **no ranking of human value**; the sandbox has demo badges only | Confirm that evolution must not become ranking; reputation mechanics are not ratified (as V0.1 says) |
| R4 | Silent on: provisional proprietary code (FD05), minimal tooling (FD08), anti-Sybil protection **as a precondition** to public contributions (V1 §6) | Ratified in FD05, FD08 and V1 §6 | Omission is read as *not revoking* them; confirm |
| R5 | §15 asks for the briefs of "Phase 12 if defined" and Phase 14 | No Phase 12 exists in the repository (FC16); Phase 14 has no stored brief | Supply the briefs, or state that they do not exist |

### New candidate requirements in V0.1 (not added to the 44-row matrix until ratified)
- **Conflict-of-interest handling** (§8): only one reviewer-checklist line exists (`docs/pilot/INDEPENDENT_REVIEW.md`); no code. It would be DOCUMENTED ONLY.
- **Virtual Earth showing five epistemic categories** (§3: real observation, model, simulated scenario, unverified proposal, measured impact): current UI labels distinguish synthetic, recorded and local-live, and the science pages label hypotheses. No unified five-category legend exists, and "measured impact" has no instance. It would be PARTIAL.
- **Measured-outcome tracking for Business clients** (§2): none. It would be MISSING (depends on R2 and Track 2 "impact targets").

Track 1 priorities are unchanged. Track 2 stays blocked on the original briefs and on the OPEN items in V0.1 §§2, 4, 5, 10, 15 and R1–R5.
