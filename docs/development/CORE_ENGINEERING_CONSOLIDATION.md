# CORE — engineering consolidation, Phases 9–13 (2026-10-15)

Scope: the founder's "Grand Consolidation Program" mandate, on branch `consolidation/phase9-13` from `903ea98`. No phase is reopened, no dependency added, nothing pushed or deployed. The commitment-by-commitment status is in [CORE_CONSOLIDATION_REGISTER.md](CORE_CONSOLIDATION_REGISTER.md).

## Delivered

### P0 — memory supersession could weaken human-approved knowledge (fixed)

- **Defect.** Both engines (`src/civ-engine.js`, `src/civ-world.js`) superseded older findings in status `verified`, `reviewed` *or* `approved` when a newer snapshot produced a successor. The supersession ran as an agent identity (the evidence verifier), and the successor was only agent-reviewed. `src/civ-memory.js` `supersede()` checked neither who performed it nor the successor's status.
- **Consequence.** A finding that only a human may approve could be retired by an agent, with an unreviewed claim taking its place. A rejected entry could also be passed as a successor. This contradicts Constitution V1 §§4–5, FC03 and the memory module's own rule "findings are approved only by a human".
- **Fix.**
  - `supersede()` now refuses `rejected`/`superseded` successors, and refuses to retire an `approved` finding unless `by` matches `human:<name>`.
  - Both engines skip approved findings and record a visible conflict, "remplacement en attente de décision humaine", instead of failing or acting silently.
  - Verified and reviewed entries are superseded as before.
- **Regression test.** `test/phase10.test.js`: "agents never retire a human-approved finding, and rejected entries never replace knowledge".
- **Impact on recorded data: none.** No recorded memory contains human approvals ("no human decision yet", Phase 9/10 reports).

### P1 — Phase 14 experimental scaffolding (new, synthetic-tested)

The preregistration and baseline documents (`docs/pilot/`) described a day-based split, a sealed holdout, a training-days-mean baseline and threshold verdicts, but no code enforced them. `scripts/lib/pilot.mjs` adds these functions, with no dependency:

| Function | Guarantee |
|---|---|
| `preregister(plan)` | Disjoint YYYY-MM-DD day sets; holdout strictly after every calibration/validation day; thresholds limited to `maxWape` and `maxAbsBias`, or explicitly `null`; SHA-256 protocol hash. |
| `partition(pkg, protocol)` | Re-runs `validateCounts` (fixtures refused without the explicit flag); rejects altered protocols and rows on unplanned days; **returns calibration and validation rows plus only a count and commitment hash for the holdout**. |
| `meanBaseline(rows)` | Per site/direction/mode/start-time/duration mean over calibration days only. |
| `freeze(model, partition)` | Binds the model hash to the protocol and the holdout commitment before opening. |
| `evaluateHoldout(pkg, protocol, frozen[])` | Requires a frozen baseline next to any candidate. Rejects models changed after freezing or frozen on other data. A missing prediction gives `NOT_EVALUABLE`, never zero. Reports MAE, WAPE and bias per direction. Verdict is `WITHIN_THRESHOLDS`, `FAILED_THRESHOLDS` or `NO_PREREGISTERED_THRESHOLD`. Output flags stay `calibrated`, `independentReview`, `efficacyValidated` and `authorizesRealWorld` = false. |

Tests are in `test/pilot-protocol.test.js` (3 tests, invented counts only), including a deliberately failing holdout to show that negative results are reported.

**Limit, stated plainly.** The library detects protocol drift and changes to a model after it is frozen. It cannot stop an analyst who opens the raw package. Sealing therefore also needs the escrow procedure in `docs/science/PHASE14_VALIDATION_READINESS.md`: the reviewer holds the full file, and the analyst receives only `partition()` output. Opening the holdout only once is a recorded, append-only procedure, not something the code can enforce.

## Decisions (no installation)

| Topic | Evidence | Decision |
|---|---|---|
| DuckDB / Polars | `data/` is 10 MB across 85 files (largest 1.1 MB); private SQLite 19 MB; built-in `node:sqlite`; no `package.json`; pilot input capped at 100,000 rows and 8 MiB | **Not adopted.** No volume or query bottleneck exists. Revisit only if an authorized dataset exceeds the pilot caps; then use one tool behind `scripts/lib/`, not both. |
| SUMO | Not in PATH; G0 (rights) and G1 (sealed protocol) blocked; the baseline must be beaten first | **Deferred.** Minimum useful integration once G0/G1 pass: pinned SUMO version and checksum, a `netconvert` network from the qualified geometry and epoch, demand from calibration days only, fixed seeds, and output written as a `{kind, table}` model so it goes through the same `freeze`/`evaluateHoldout` path as the baseline. |
| EnergyPlus | Not in PATH; no building input or validation dataset in the repository; FC07 is a separate authorization | **Deferred.** Not needed for the Phase 14 pilot. Reconsider only with a named building, metered data under verified rights, and a reviewer. |
| Ruflo / orchestration frameworks | Existing council (`src/science.js`), bounded scheduler (`scripts/civd.mjs`), STOP and checkpoints | **Not reopened.** No concrete deficiency found. |
| Performance | Full suite 170 tests in 9.5 s wall-clock (slowest test 3.9 s) | **No optimization.** Below any threshold worth added complexity. |

## Verification

The verification results are recorded in the final report and PROJECT_STATE after `node scripts/verify.mjs`. No browser test was run: no browser-visible file changed.
