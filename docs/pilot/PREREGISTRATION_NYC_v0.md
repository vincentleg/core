# Phase 14B — preregistration draft v0 (NYC automated counts) — NOT SEALED, NOT EXECUTABLE

Status: draft for founder and reviewer. **G0 is blocked under FD09**: current official reuse terms are not demonstrated (see `docs/science/PHASE14_VALIDATION_READINESS.md`). Nothing below authorizes access to the data. The thresholds are **PROVISIONAL**, proposed by the developer's agent and not ratified. This is not a scientific validation.

## 1. Fields to fill and seal (protocol hash = `preregister()` output)

| Field | Value now | Filled by |
|---|---|---|
| Protocol id | `nyc-atr-weekday-v1` | founder/reviewer |
| Question | Does a training-days same-slot mean predict held-out weekday 15-min counts on one segment-direction within the thresholds; does any candidate beat it? | fixed |
| H0 / H1 | H0: a candidate does not reduce holdout WAPE versus the baseline by ≥ 10% relative. H1: it does, with bias within the threshold | fixed |
| Dataset | NYC Open Data `7ym2-wayt`, NYC DOT; export date, byte SHA-256 and `rowsUpdatedAt` recorded at ingestion | reviewer |
| Rights evidence | Official §23-502 text and NYC Open Data terms (URLs and retrieval dates); FD09 approval reference | founder |
| Segment-direction | Chosen by the rule in §2, **not** 32321 | reviewer |
| Unit | segment × direction × 15-min slot (`site`=segment id, `mode`=`motor_vehicle`) | fixed |
| Time zone | America/New_York with explicit offset per row (EDT −04:00 / EST −05:00); recorded as a transformation | fixed |
| Day eligibility | Mon–Fri; 96 bins; not a US federal holiday or the day after Thanksgiving; no closure on the segment in NYC DOT closure records for that day | fixed |
| Split | §3 | fixed |
| Baseline | `meanBaseline()` over calibration days | fixed |
| Candidates | None committed yet; any must be frozen with `freeze()` before the holdout opens | analyst |
| Metrics | MAE, WAPE (ratio), bias = Σ(p − y)/Σy; per-holdout-day WAPE reported | fixed |
| Thresholds | §4 (PROVISIONAL) | reviewer ratifies |
| Code | commit SHA, `node --version`, `scripts/lib/pilot.mjs` hash | reviewer |
| Seeds | n/a (deterministic baseline); a stochastic candidate must declare seeds | analyst |

## 2. Segment selection rule (reviewer applies, before anyone sees volumes)

From Manhattan segment-directions with counts in 2023 or later, keep those with **≥ 12 eligible weekdays inside one campaign of ≤ 6 consecutive weeks**. Exclude segment 32321, whose volumes have been seen. Choose the one with the most eligible weekdays; on a tie, take the lowest segment id, then EB/NB before WB/SB. The reviewer runs this on day-level bin *counts* only (no `vol`) and records the result. If no location qualifies, the protocol fails G1; the rule is not relaxed after seeing the data.

## 3. Split boundaries

Eligible weekdays are sorted chronologically:
- **Holdout:** the last 3 days, untouched.
- **Validation:** the day before them.
- **Calibration:** all earlier days (at least 8).

`preregister()` enforces that the sets are disjoint and that the holdout comes last. The reviewer keeps the holdout rows; the analyst receives only `partition()` output.

## 4. Thresholds — PROVISIONAL, to be ratified or replaced before sealing

| Rule | Value | Rationale (assumption, reviewer to check) |
|---|---|---|
| Baseline adequacy | holdout WAPE ≤ **0.20** and \|bias\| ≤ **0.10** (`preregister({ thresholds: { maxWape: 0.2, maxAbsBias: 0.1 } })`) | Same-slot weekday counts on an arterial are assumed to vary on the order of 10–20% day to day. A baseline worse than 0.20 suggests unstable data or a regime change, and is reported as such, not tuned away |
| Candidate superiority | candidate WAPE ≤ **0.90 ×** baseline WAPE **and** \|bias\| ≤ 0.10; otherwise H0 retained | A gain below 10% relative is not distinguishable from day-to-day noise with 3 holdout days. Applied by the reviewer from the two `evaluateHoldout` results |
| Not evaluable | any missing slot, zero denominator, or fewer than 3 eligible holdout days | Never counted as a pass |

With 3 holdout days, results are descriptive. No confidence interval, seasonality or causal claim is made.

## 5. Independent reviewer instructions

Apply the checklist in [INDEPENDENT_REVIEW.md](INDEPENDENT_REVIEW.md) in full. Specific steps:
1. Confirm the FD09 rights evidence from official sources only, before any download. Record URLs, dates and the exact terms (use, attribution, commercial).
2. Download the export yourself and record the byte SHA-256. Apply §2 using bin counts only. Build the package (`validateCounts` must return `VALIDATED_INPUT`).
3. Fill §1 and the thresholds, then run `preregister()` and record `protocolSha256` in a dated, signed note. From here on, changes require a new protocol version.
4. Run `partition()`. Send the analyst only calibration and validation rows plus the holdout commitment. Keep the package.
5. Receive the frozen records (`freeze()`), and verify their `protocolSha256` and `holdoutCommitment`.
6. Run `evaluateHoldout()` **once**. Record the full output append-only, including failures.
7. Recompute MAE and WAPE for at least one holdout day by an independent method, such as a spreadsheet or another language. Check the level-shift warning (§ readiness) against closure records.
8. Approve only the scope "reproduces these held-out weekday counts on this segment with these errors". No traffic or safety benefit, signal claim or generalization.
