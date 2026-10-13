# Phase 2C — Real-world agents & coordination intelligence: report

Status: **COMPLETE on 2026-10-13** against the twelve acceptance criteria of the founder's Phase 2C brief, with the limits stated below. Baseline: Phase 2B `8418261`. Phase 3 has **not** started.

## What a user can do now

1. Explore San Francisco in 3D (Phase 2B).
2. Open **Folsom / Howard → Agents · analyse**, then **Lancer les agents**.
3. Watch six deterministic agents process the real DataSF snapshot. The activity log shows each executed step. The map highlights the segment being inspected, then every finding.
4. Select a finding. The camera fits its street segment, and its permits are highlighted by organisation.
5. Compare five scenarios: cards, a metric table, and a schedule chart showing reference vs. scenario windows and SFMTA closures.
6. Inspect the evidence:
   - source records (DataSF API links, and "Inspecter" opens the record);
   - snapshot checksums, parameters and the calculation method;
   - the evidence checks and adversarial tests.
7. Read the coordination gateway's decision: its checks, conditions and the mandatory human review. A JSON dossier can be exported.
8. Pause, resume, and **replay**. A replay is labelled "REJEU" and then verified against a fresh re-execution.

A guided investor flow, **Démo guidée · Terre → recommandation**, runs the same real actions in 8 user-paced steps. Free exploration stays available throughout.

## Implementation

- **`src/coord.js`** (Node and browser, no dependency). It builds a snapshot context with the CNN topology and record index. The six roles are generator functions yielding real events:
  - **Discovery Agent:** inspects each corridor segment group (segment plus its two intersections) for:
    - overlaps between organisations;
    - repeated work (≥ 5 permits by ≥ 2 organisations within 365 days);
    - starts inside a paving moratorium;
    - overlaps with SFMTA closures;
    - upcoming coordination opportunities.
  - **Evidence Agent:** checks for every finding that its records exist, that the snapshot SHA-256 is verified, that dates are consistent, that the geography holds (CNN group membership, point ≤ 75 m from its CNN geometry), and that the organisations are identified. It also counts excluded records (missing dates, inconsistent geometry), which are never filled in.
  - **Scenario Generator:** for valid opportunities, builds the planning set (APPROVED/ACTIVE permits ending after the snapshot), marks fixed permits with their reasons, and emits S0–S4.
  - **Simulation / Evaluation Agent:** computes deterministic metrics per scenario and selects a recommendation by the declared rule.
  - **Adversarial Testing Agent:** applies 7 canonical perturbations (A1–A7).
  - **Decision Gateway:** `issueCoordinationProposal` recomputes everything independently. The traffic `issuePermit` gateway is unchanged.
- **`src/coord-view.js`:** the workspace UI, map layers (`coord-scan`, `coord-findings`, `coord-focus`, `coord-points`), the schedule chart, the decision panel, the dossier export and the guided demo.
- **LLM-ready contracts.** Agents exchange plain JSON: findings, evidence bundles, scenario windows and metrics, adversarial results, proposals. A future language-model agent may propose findings or scenario parameters, but the gateway accepts only proposals that match the deterministic recomputation. **No language model is used, and the UI labels every step "déterministe".**

## Scenarios and metrics

| Scenario | Definition | Kind |
| --- | --- | --- |
| S0 | Independent schedule as permitted | Derived from observed permit dates |
| S1 | Coordinated, chained windows: one occupation, no simultaneous crews | Hypothetical |
| S2 | Shared excavation: maximise overlap between organisations | Hypothetical; compatibility not verified |
| S3 | Rescheduled to remove overlap between organisations | Hypothetical |
| S4 | Sequenced around SFMTA closures | Hypothetical; not applicable without closures |

**Constraints** (declared assumptions, listed in every decision):

- Movable permits shift by ±30 days at most.
- No move may start before snapshot + 7 days.
- Durations are preserved.
- Fixed permits are those already started, active, emergency, or longer than 90 days.
- Renewed permits are excluded.

**Metrics:**

- Overlap pairs and days between organisations.
- Distinct occupation windows and occupied days. These exclude programme permits of more than 90 days, and that assumption is perturbed in A7.
- Organisations and CNNs involved.
- Days in conflict with closures, moratorium starts, and sequencing issues.
- Moved permits and total shift, and constraint violations.

**No cost, emission, traffic, travel-time or excavation-volume figure is computed.**

**Recommendation rule:**

- **Reschedule:** only when a scenario is strictly better on the declared priority order (closure conflicts, moratorium starts, sequencing, distinct windows, occupied days) and worse on none. Inter-organisation overlap is reported but treated as neutral, because sharing a trench and avoiding simultaneous crews pull in opposite directions.
- **Coordination review:** when no reschedule dominates, but at least two organisations have verified overlapping windows within the next 60 days.

## Results on the real snapshot (2026-10-13)

- **Run size:** 150 events. Result fingerprint `ed44b98b4c248b03` (FNV-1a, non-cryptographic). Identical across repeated Node runs and in Chrome and Firefox.
- **50 potential findings:**

  | Type | Count |
  | --- | --- |
  | Coordination opportunities | 3 |
  | Closure conflicts | 6 |
  | Overlaps between organisations | 21 |
  | Starts during a moratorium | 9 |
  | Repeated work | 11 |

  All evidence bundles passed. Records lacking dates or consistent geometry were excluded and counted.
- **Gateway decisions:**

  | Segment | Decision | Basis |
  | --- | --- | --- |
  | Howard 8th → 9th | **PRÊT POUR REVUE HUMAINE** (coordination review) | CableCom, R & S Construction Management and Precision Engineering: 8 verified overlaps within 60 days; robust under A1–A7 |
  | Howard 10th → 11th | **PRÊT POUR REVUE HUMAINE** (coordination review) | Pacific Bell, PG&E and Precision Engineering: 5 overlaps |
  | Howard 4th → 5th | **SUSPENDU** | The overlap exists only against a 3-year programme permit, so it fails A7 |

- **No reschedule is recommended on the real data.** The movable windows are already concurrent with other organisations' windows. Moving them reduces overlap only by lengthening occupation (Howard 8th–9th, S1: 8 → 6 overlap pairs, but 39 → 62 occupied days), and the 7-day notice prevents earlier starts. This is the system's real answer, not a limitation hidden by the demo. A fixture test shows the reschedule path recommends a closure-avoiding schedule when the data supports it.

## Acceptance

| Criterion | Evidence |
| --- | --- |
| 1. Agents process real SF records | The pipeline reads the Phase 2B DataSF snapshot (662 permits, 71 moratoria, 19 closures, 44 segments); tests assert that every cited record exists |
| 2. Findings reproducible | Same fingerprint and trace across runs; the browser run equals the Node run (audit check) |
| 3. Map responds to execution | `coord-scan` follows inspected segments during the run; findings, camera fit and organisation-coloured permits are audited |
| 4. Workspace shows actual operations | Every log line is a yielded event; pause halts the generator (audited); replay labelled and verified |
| 5. Multiple scenarios genuinely evaluated | 5 scenarios per opportunity under constraints; tests check constraints and the fixture outcomes |
| 6. Metrics have provenance | Per-metric definitions (tooltips), OBSERVÉ-derived vs HYPOTHÉTIQUE badges, parameters, method, records, checksums |
| 7. Gateway blocks unsupported recommendations | 20+ rejection cases tested: missing/extra fields, unknown segment or record, altered dates/organisations/checksums, unverified snapshot, wrong geography, tampered metrics/mode/adversarial results, invalid parameters, constraint-violating or fixed-moving schedules |
| 8. Human approval mandatory | Every decision has `authorizes: false` and the human-review text; there is no approve button |
| 9. Existing functionality intact | **39 Node tests pass.** Chrome and Firefox **59/59** (all Phase 1/2B checks plus 17 new); Chrome negative paths 12/12; `issuePermit` unchanged; `corridor.html` rebuild unchanged |
| 10. Browser only, no paid service | Static files; no key, API, backend or new dependency |

**Browser runs** (2026-10-13; fresh headless profiles, sequential):

| Browser | Result |
| --- | --- |
| Chrome 155.0.8059.40 | 59/59 checks, 0 uncaught errors; negative paths 12/12 |
| Firefox 122.0 (BiDi) | 59/59 checks, 0 uncaught errors |
| Safari 27.0.1 | **NOT PERFORMED** (remote automation disabled) |

Summary: [PHASE_2C_BROWSER_RESULTS.json](PHASE_2C_BROWSER_RESULTS.json).

## Limits

- **Administrative records only.** Permit dates are authorized windows, not work performed. Statuses don't verify completion. The moratorium dataset is current-only, and closures cover SFMTA permits only.
- **Declared parameters, not municipal rules.** Shift bounds, notice, the programme threshold and the horizon are assumptions. Scenario outcomes are hypothetical, and trench sharing requires engineering compatibility that CORE does not verify.
- **Scope of the analysis.** Spatial relations use CNN topology on the 2nd–11th corridor only. Adjacent-block coordination and other streets are not analysed.
- **Fingerprints are not authentication.** They're non-cryptographic determinism checks, not proof of record authenticity. Snapshot authenticity rests on the SHA-256 manifest of public data.
- **Snapshot age.** Results reflect the 2026-10-13 snapshot. A refresh changes the findings. The UI shows the snapshot date.
- **Coverage and performance gaps.** Coverage is headless only (old Firefox, no Safari or iOS). Frame rate and smoothness on the investor laptop were not measured.

**Phase 3 readiness:** technically unblocked. Calibration still needs observed counts and signal timing (SFMTA records request). Phase 3 starts only on the founder's explicit request.
