# Phase 14 — validation readiness (2026-10-15)

**Status: READY TO SEAL, NOT READY TO RUN.** The software path is in place and tested on invented counts. Data rights, the sealed protocol and the reviewer are not. This summary sits on top of the canonical documents and does not restate them:
- [SCIENTIFIC_PILOT_PLAN.md](../SCIENTIFIC_PILOT_PLAN.md) (gates G0–G4)
- [pilot/PREREGISTRATION.md](../pilot/PREREGISTRATION.md)
- [pilot/BASELINE_CALIBRATION.md](../pilot/BASELINE_CALIBRATION.md)
- [pilot/INDEPENDENT_REVIEW.md](../pilot/INDEPENDENT_REVIEW.md)
- [pilot/source-manifest.json](../pilot/source-manifest.json)

No result exists. Passing software tests is not a validation.

## Claim under test

On one corridor, can a model predict aggregate counts per site × direction × mode × 15-minute bin on held-out days with lower error than the training-days mean?
- **H0:** it cannot.
- **Success means only** "reproduces these observations, in this scope, with these errors". It does not mean causality, a traffic or safety gain, or anything about real signals (O2 remains open).

## Pilot selection

| Candidate | Why | Blocking gap |
|---|---|---|
| **Primary: Howard St 6th–7th, SF** | Located SFMTA RAISE reports; matches the existing SoMa scope | One 2018 tube-count day only; reuse rights UNVERIFIED (SFMTA terms reserve rights; no explicit grant found); no signal timings of the same epoch |
| **Fallback: Folsom / Main (SFMTA counts file)** | Separate published count file | Coverage, epoch, licence and geometric match unverified |
| AI-infrastructure / data-centre energy | Strategic for CORE | No authorized measured dataset in the repository; the energy adapter uses a reported 2024 aggregate only. Not a Phase 14 candidate until metered data with rights exists |

The candidate must not be switched after results are seen.

## Dataset authorization (G0) — BLOCKED

Required before any ingestion is listed in `SCIENTIFIC_PILOT_PLAN §2` and enforced by `validateCounts`:
- licence among PDDL, CC0 or CC-BY, plus an evidence URL and date
- byte hash
- aggregate, non-personal fields only

Publicly accessible does not mean authorized. Paths that cost nothing:
1. A written SFMTA grant for processing and republication.
2. A separately authorized new aggregate count protocol.

No download, contact or collection has been made.

## Protocol, baseline, holdout (G1) — code ready, protocol not sealed

- **Split.** Days, not bins: at least 3 calibration, 1 validation and 1 holdout day. `preregister()` enforces disjoint days and holdout after all other days. Random splitting of adjacent bins is impossible by construction.
- **Baseline.** `meanBaseline()` is the mean of the same slot over calibration days. Any candidate (for example SUMO) must be serialized as a `{kind, table}` model and go through the same path.
- **Metrics.** MAE, WAPE (a ratio; a zero denominator is not evaluable), and bias per direction. Missing predictions are not evaluable, never zero.
- **Thresholds.** Must be fixed in `preregister()` *before* partitioning. `null` gives `NO_PREREGISTERED_THRESHOLD`, never a pass. The earlier "WAPE ≤ 0.20" remains an unratified proposal.
- **Uncertainty.** Report day-to-day variation, measurement error and model variability separately. Seeds are not independent days. With five days, report descriptive results only.

## Leakage prevention and reproducibility

1. The reviewer receives the full authorized package and keeps the holdout. The analyst receives only the `partition()` output, which holds calibration and validation rows plus the holdout commitment hash.
2. Protocol hash, package `payloadSha256`, commit SHA, `node --version` and seeds are recorded in the preregistration before analysis.
3. The analyst freezes the baseline and the candidate (`freeze()`) and sends the frozen records.
4. The reviewer runs `evaluateHoldout()` once and records the output append-only. Any model revision needs a new protocol version and new holdout days.

The code rejects altered protocols and models changed after freezing. The one-time opening of the holdout is a procedural control, held by the reviewer.

## Independent review (G3) — reviewer not designated

The reviewer must be competent and separate from the developer. They check rights, schema, units, exclusions, the split, and a re-computation of the metrics by another method, as in the `INDEPENDENT_REVIEW.md` checklist. CORE agents and `verify()` do not count as independent review.

## Commands (synthetic only today)

```sh
node --test test/pilot-protocol.test.js test/founder-decisions.test.js
node scripts/pilot.mjs --check test/fixtures/pilot-synthetic.json --synthetic-fixture
```
