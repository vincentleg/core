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
| **Recommended fallback: NYC DOT Automated Traffic Volume Counts, Canal St EB at Manhattan Bridge (segment 32321)** | See the section below: 21 complete days, statutory reuse terms, inside the existing NYC study area | Validator licence allowlist, official text of the statute, quality and method review |
| AI-infrastructure / data-centre energy | Strategic for CORE | No authorized measured dataset in the repository; the energy adapter uses a reported 2024 aggregate only. Not a Phase 14 candidate until metered data with rights exists |

The candidate must not be switched after results are seen.

## Fallback with verifiable reuse terms — NYC Automated Traffic Volume Counts

Checked on 2026-10-15 using metadata plus one bounded aggregate query. The query was public, returned day-level row counts only, and stays in the local scratchpad; nothing was committed.

- **Source.** NYC Open Data `7ym2-wayt`, publisher NYC DOT, provenance "official". Automated traffic recorders; `Vol` per 15-minute interval by LION segment and direction. Rows last updated 2026-03-20. The metadata names no licence.
- **Reuse terms.** NYC Admin. Code §23-502(d): public data sets are available "without any registration requirement, license requirement or restrictions on their use". The department may require identification of source, version and modifications. §23-504: the City gives no warranty of accuracy or fitness. The text was read from an unofficial mirror (nycadmincode.readthedocs.io). It matches the Phase 10 record in `docs/DATA_SOURCES.md`, but the official codified text still has to be confirmed.
- **Coverage.** Since 2023, 86 Manhattan segment-directions are present, 50 of them with at least 5 complete days (96 bins) and 42 with at least 7. The best fit for CORE is **Canal St EB at the Manhattan Bridge, segment 32321**: 21 complete days between 2023-05-21 and 2023-06-12. It sits in the Chinatown–Two Bridges study area already used in Phase 10. Long series also exist at the University Heights Bridge (39 days) and West End Ave at W 60th–61st (28 days).
- **Fit to the protocol.**
  - Mapping: `site` = segment, `direction` = EB/WB/NB/SB, `mode` = `motor_vehicle`, 15-minute bins.
  - Local times carry no offset, so EDT −04:00 must be applied and recorded as a transformation.
  - A preregistered split such as weeks 1–2 for calibration, a validation day, and the last week as holdout is possible without mixing adjacent bins.
  - The claim stays count prediction. No signal timings are needed or implied.
- **Comparison with Howard 6th–7th and Folsom/Main.**
  - Howard: one 2018 day, reuse rights unverified.
  - Folsom/Main: coverage and rights unverified.
  - NYC: about 21 days, a statutory no-restriction clause, an official publisher, and an existing CORE study area. It is the only candidate where G0 can plausibly pass without contacting an agency.
  - Limits: count quality and tube method, holidays (Memorial Day 2023-05-29 inside the window must be excluded *before* sealing), a 2023 epoch, and one segment only.
- **What still blocks it.**
  1. `validateCounts` accepts only PDDL, CC0 and CC-BY. Adding a statute-based value (for example `NYC-OPEN-DATA-LAW`) with mandatory source, version and modification attribution is a rights decision for the founder, not made here.
  2. Confirm the official codified text.
  3. Reviewer and thresholds (OP04).

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
