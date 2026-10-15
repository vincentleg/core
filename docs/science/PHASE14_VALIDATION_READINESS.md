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
| **Fallback: NYC DOT Automated Traffic Volume Counts (`7ym2-wayt`), segment chosen by the reviewer** | Official publisher; multi-day 15-minute series; statute on use | G0 blocked under FD09 (current official text and portal terms not verified); Canal St (32321) is compromised as a holdout and shows a level shift from 2023-06-07 |
| AI-infrastructure / data-centre energy | Strategic for CORE | No authorized measured dataset in the repository; the energy adapter uses a reported 2024 aggregate only. Not a Phase 14 candidate until metered data with rights exists |

The candidate must not be switched after results are seen.

## NYC fallback — legal basis and coverage (re-checked 2026-10-15; data operations stopped under FD09)

**G0 for NYC: BLOCKED.** Founder rule FD09 (2026-10-15) requires demonstrated authorization before any further access or processing. That authorization is not yet demonstrated.

Official evidence obtained:
- **Local Law 11 of 2012.** Certified true copy (City Clerk; Corporation Counsel certification) from the NYC Council's official Legistar system. §23-502(d) originally said public data sets "shall be made available without any registration requirement, license requirement or restrictions on their use", and the department may require third parties to "explicitly identify the source and version of the public data set, and a description of any modifications". §23-504: no warranty of "completeness, accuracy, content or fitness for any particular purpose".
- **Dataset `7ym2-wayt`.** Metadata from the official portal API: "Automated Traffic Volume Counts", agency NYC DOT, provenance "official", no licence field, rows updated 2026-03-20. Counts are sampled, not year-round, and the number of counted days varies by location.

Evidence that is **not** sufficient:
- **The 2017 amendment.** A certified-format copy of **Local Law 251 of 2017** was obtained only through a third-party site (intro.nyc), and that copy has been deleted. Its text deletes "registration requirement, license requirement or" from §23-502(d), leaving "without any restrictions on their use" plus the same source/version/modification clause. If confirmed, the *use* remains unrestricted but the City may now impose registration or licence conditions on *access*. The earlier note in this file quoted the superseded 2012 wording from an unofficial mirror. That was wrong as a statement of current law and is withdrawn.
- **The current codified Administrative Code** has not been retrieved from an official source.
- **Portal Terms of Use.** The open-data FAQ and overview pages redirect to nyc.gov, which shows no data-licence text. The general nyc.gov Terms of Use say materials are "the property of the City of New York. All rights are reserved" and point to agencies for permission. Whether those terms govern portal datasets is unresolved.
- **Commercial use** (relevant to CORE Business) is not separately addressed by any text retrieved.

To unblock (founder):
1. Obtain the official Legistar copy of LL 251/2017, or the official codified §23-502, and the current NYC Open Data Terms of Use page.
2. Decide whether statute-based reuse is acceptable to CORE.
3. Only then extend `validateCounts` with a statute-based licence value requiring source, version and modification attribution.

Until then, no new query, download or processing of this dataset.

**Disclosure of data already accessed (before FD09, under the statute as then understood).** Two aggregate queries (day-level bin counts per Manhattan location since 2023; daily bins and totals for segment 32321) were run for feasibility. The results were deleted from the local scratchpad, and no data was committed. Only these coverage facts are kept:
- **Segment 32321, Canal St at the Manhattan Bridge, direction EB, 2023 only.**
  - **Complete days (96 bins):** the 21 days from 2023-05-22 (Mon) to 2023-06-11 (Sun).
  - **Partial days:** 2023-05-21 (20 bins, from 19:00) and 2023-06-12 (82 bins, to 20:xx).
  - No WB rows were returned for this segment.
- **Memorial Day, Monday 2023-05-29 (US federal holiday).** It must be excluded *by a calendar rule fixed before sealing*: holidays and their day-type are not comparable to ordinary weekdays. With so few days, one holiday would bias a same-slot mean. Excluding it is a protocol choice, not a data-quality judgement.
- **Quality warning.** From 2023-06-07 the daily totals drop to about 55–60% of the level of the first two weeks (5 of the last 6 complete days). This could be a lane closure, a construction phase, a recorder fault or a real change. It cannot be resolved from the counts alone, and it must be investigated (NYC DOT closures data, recorder notes) before any use.
- **Leakage consequence.** The analyst has seen daily totals for *every* Canal St day. **No Canal St day can serve as an untouched holdout.** If NYC is authorized, the primary segment must be chosen by the reviewer, by a rule fixed in advance, from locations whose volumes nobody on the CORE side has seen (see `docs/pilot/PREREGISTRATION_NYC_v0.md`). Canal St may serve only as a development and dry-run segment.

Comparison with Howard 6th–7th and Folsom/Main: the NYC dataset still offers the strongest *potential* basis (official publisher, multi-day 15-minute series, a statute on use). But rights are not demonstrated under FD09, and the Canal St segment is compromised for holdout. None of the three candidates passes G0 today.

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
