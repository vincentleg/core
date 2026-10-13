# Agent architecture and workspace specification

Design written in Phase 2A; **implemented in Phase 2C** (see [PHASE_2C_REPORT.md](PHASE_2C_REPORT.md)). Differences from this design: traces are kept in memory and exportable as a JSON dossier rather than committed JSON Lines files; fingerprints use FNV-1a (non-cryptographic) instead of SHA-256 for outputs; the gateway states are `PRÊT POUR REVUE HUMAINE` / `SUSPENDU` / `BLOQUÉ`; the recommendation is either a dominating reschedule or a coordination review (D019). Core rule: **every line shown in the workspace comes from an actual execution trace.** Traces are recorded or live, and nothing is scripted or invented. Deterministic computations, model-generated text (if ever added) and human actions are typed differently and displayed differently.

## Principles

1. **Agents propose; deterministic code decides eligibility; humans authorize.** CORE never acts on infrastructure.
2. **First implementation: agents are deterministic programs** (rule-based queries, scoring, scheduling and perturbation) with no LLM. They are called "agents" because each has a role, tools, inputs, outputs and a failure state. The UI labels them "agent déterministe".
3. **Optional language-model steps later** may only:
   - summarise or explain evidence already in the bundle;
   - propose scenario parameters that the deterministic validator accepts or rejects.

   They may never compute metrics or decide eligibility. They require a free/local or explicitly approved provider and a backend or offline run, and are labelled `kind: "llm"` with model name and version.
4. **Every input dataset is a dated snapshot** with URL, query, retrieval time, SHA-256 hash, licence and row count. Missing, stale or unhashed evidence makes dependent steps fail closed.

## Execution trace (JSON Lines)

```json
{"run_id":"2026-…-a1b2","seq":12,"t":"2026-…Z","agent":"evidence","kind":"deterministic",
 "step":"join_permits_moratoria","tool":"coord.joinByCnn",
 "inputs":[{"ref":"snapshot:excavation@sha256:…"},{"ref":"snapshot:moratorium@sha256:…"}],
 "output":{"ref":"artifact:overlaps@sha256:…","summary":{"permits":474,"segments":84}},
 "status":"ok","duration_ms":41}
```

**Field rules:**

- `kind` is one of `deterministic` | `llm` | `human` | `system`.
- `status` is one of `ok` | `blocked` | `failed` | `cancelled`.
- Outputs are content-addressed. A replay must reproduce the hashes of every deterministic step, the same principle as gateway D012.

**Live and recorded runs:**

- A **live run** executes in the browser on committed snapshots.
- A **recorded run** is a trace file captured from a real execution and labelled "exécution enregistrée le <date>".
- The workspace never synthesises trace lines.

## Agents

### Discovery Agent

| Aspect | Specification |
| --- | --- |
| Inputs | Snapshots: excavation permits, street-use permits, moratoria, closures, injury crashes, HIN, centerlines (CNN) |
| Tools | `discover.rankSegments` (counts per CNN, distinct agents, moratorium overlaps, crash and HIN co-location) |
| Outputs | Ranked candidate problems: segment, metric values, contributing record IDs |
| Evidence requirements | Every metric links to dataset IDs and record IDs; window and filters stated |
| Failure states | Snapshot missing or older than its freshness limit → `blocked`; CNN join coverage below threshold → `failed` with coverage figure |
| Log | One trace line per query and ranking step |

### Evidence Agent

| Aspect | Specification |
| --- | --- |
| Inputs | Selected candidate; snapshots; project status sources (manually captured, dated quotes with URL) |
| Tools | `evidence.bundle`, `evidence.checkFreshness`, `evidence.classify` (observed / administrative / modelled / assumption) |
| Outputs | Evidence bundle: claims, each with source refs, kind and caveats (e.g. "includes planned capital project") |
| Evidence requirements | No claim without a ref; known confounders attached |
| Failure states | An unsupported claim, unknown licence or stale source → that claim is `blocked` and the bundle is marked incomplete |
| Log | One line per claim added or blocked |

### Scenario Generator

| Aspect | Specification |
| --- | --- |
| Inputs | Evidence bundle; explicit assumption parameters (e.g. allowed shift ±N days, exclusion of emergency permits) |
| Tools | `scenario.bundleWindows` (align future works on a segment into shared windows), `scenario.sequenceBeforeRepaving` (Howard: pull works before the moratorium starts) |
| Outputs | 2–5 alternatives plus the observed baseline, each a full schedule with its parameters |
| Evidence requirements | Each alternative lists the assumptions it depends on |
| Failure states | Infeasible parameters (e.g. moving an emergency permit) → alternative rejected with reason |
| Log | Parameters, rejected alternatives and reasons |

### Simulation Agent

| Aspect | Specification |
| --- | --- |
| Inputs | Baseline and alternatives |
| Tools | `coord.evaluate` (deterministic): street-opening episodes per segment, permit-days of occupation, moratorium conflicts, work-zone days on HIN segments, days overlapping SFMTA event closures, Muni-stop-adjacent work days. Optional and separately labelled: existing point-queue engine for a **synthetic** lane-closure delay illustration. Later and offline: SUMO. |
| Outputs | Metrics table per alternative; all values derived from observed records plus stated assumptions |
| Evidence requirements | Metric definitions versioned; replay reproduces values exactly |
| Failure states | Non-finite values or schema violations → `failed`; synthetic metrics can never be labelled observed (type-enforced) |
| Log | One line per evaluation, with input and output hashes |

### Adversarial Testing Agent

| Aspect | Specification |
| --- | --- |
| Inputs | Best alternatives and metric functions |
| Tools | `adversary.perturb` (shift limits, ±20 % permit durations, emergency share, dropping a dataset, CNN mis-match injection, later-arriving permits) |
| Outputs | Robustness table: which conclusions survive which perturbations |
| Evidence requirements | Fixed, enumerated perturbation set (like the six canonical stress cases) |
| Failure states | A conclusion flipping under a canonical perturbation → recommendation `SUSPENDU` |
| Log | One line per perturbation case |

### Decision Gateway (deterministic, not an agent)

| Aspect | Specification |
| --- | --- |
| Inputs | Evidence bundle, alternative, metrics and robustness table, with hashes |
| Rules | Complete contract; all snapshots hashed, dated and licensed; deterministic replay matches; no unsupported claims; improvement on the primary metric under all canonical perturbations; no moratorium conflict introduced |
| Outputs | `PRÊT POUR REVUE HUMAINE` / `SUSPENDU` / `BLOQUÉ` with reasons, assumptions, validity and reversibility. A human reviewer role is named, and no signature is ever simulated. |
| Failure states | Any invalid, unknown or incomplete evidence → `BLOQUÉ` (safe envelope, no recommendation) |
| Implementation | New `issueCoordinationProposal` beside the existing `issuePermit`. The existing gateway, equations and thresholds stay unchanged. |

## Workspace layout

Desktop: map on the left at about 60 %, workspace on the right at about 40 %. Mobile: map on top, tabs below.

1. **Main 3D map.**
   - Folsom/Howard segments are coloured by the selected metric.
   - Permits, moratoria and closures appear as layers. The selected segment is highlighted.
   - Every layer's legend shows its source and snapshot date.
2. **Agent activity panel.** Trace lines are grouped by agent, with `kind` badges (déterministe / LLM / humain) and status. A replay control steps through the trace and moves the map.
3. **Evidence and sources.**
   - Claims with clickable source refs, open in a new tab on `data.sf.gov`.
   - Snapshot hash, date and licence.
   - Caveats in amber.
4. **Scenario comparison.** Baseline and alternatives side by side, with their assumptions listed.
5. **Metrics and charts.** Bar or step charts of openings and occupation days per alternative, plus a robustness matrix. Observed-derived values are solid; synthetic values are hatched and labelled.
6. **Decision gateway.** State, reasons and a copyable JSON proposal. The human-review requirement is visible, and there is no approve button that implies execution.

The map and panels are synchronised: selecting a segment, trace line or alternative updates the other views through a single state object, following `__CORE_APP`.
