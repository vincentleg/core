# R3 — Authorized scientific evidence readiness, Folsom/Howard (founder review, 2026-10-23)

Branch `foundation/civilization-reset`, built on R2 `0dfc26f`. Research, evidence governance and preparation only: **no scientific validation exists or is claimed.** No dataset was downloaded, no request filed, no agency contacted. Sources were read as public pages and official metadata on 2026-10-23. This report extends the canonical package and does not restate it: `docs/SCIENTIFIC_PILOT_PLAN.md` (gates G0–G4), `docs/pilot/PREREGISTRATION.md`, `docs/pilot/BASELINE_CALIBRATION.md`, `docs/pilot/INDEPENDENT_REVIEW.md`, `docs/science/PHASE14_VALIDATION_READINESS.md`. Machine-readable entries are in `docs/pilot/source-manifest.json` (`sources`, `r3`).

## Decisive finding: the modelled street is being rebuilt

The Folsom-Howard Streetscape Project reconstructs exactly the corridor CORE models.
- **Folsom, 2nd–11th.** The SFMTA 2022 fact sheet states a reduction to 2 general-purpose lanes from 3–4, with a two-way separated bikeway. The [project page](https://www.sfmta.com/projects/folsom-howard-streetscape-project) (update September 2026) reports new signals on Folsom 8th–11th (about 95% complete) and the full corridor about 75% complete, targeting substantial completion in October 2026.
- **Howard.** Design is complete; construction runs 2026–2029.

Consequences:
1. Every count, timing plan and geometry in the existing shortlist (Howard 6th–7th 2015–2018, Folsom Beale–Main 2017) describes a street that no longer exists in that form.
2. CORE's illustrative queue scenario (assumed lanes and timings) is also not a description of the current street.
3. A valid study must pick **one epoch** before seeing results:
   - **Historical (pre-project) study:** pre-project counts, plus timing cards and geometry of the same dates. Scientifically clean, but answers a question about a street that has been replaced.
   - **Post-construction study:** new observations after an agreed stabilisation period, current timing cards and as-built geometry. Relevant, but no such observations exist yet; Howard stays under construction until 2029, which affects Folsom traffic.

   Mixing epochs is a protocol failure, not a calibration choice.

SFMTA pages disagree on some details (transit-lane extent, per-block lanes): the as-built configuration must be verified from records, not assumed.

## 1. Evidence required, by dimension

M = mandatory for calibration; O = optional context. Status uses the R3 vocabulary: AUTHORIZED_AVAILABLE · POTENTIAL_AUTHORIZATION_UNCONFIRMED · RESTRICTED · MISSING · NOT_APPLICABLE.

| Dimension | Need | M/O | Best candidate | Status |
|---|---|---|---|---|
| Intersection geometry | Lanes, turn pockets, bikeway, crossings, stop bars, same epoch as counts | M | DataSF Streets `3psu-pn9h` + Intersections `gmfx-8h6i` (centrelines, PDDL); OSM (ODbL); SFMTA signal inventory diagrams; as-built drawings | Centrelines AUTHORIZED_AVAILABLE but carry no lane geometry; OSM lane tags may predate reconstruction; diagrams and as-builts POTENTIAL_AUTHORIZATION_UNCONFIRMED |
| Vehicle volumes and turning movements | Per approach × movement × 15-min bin, several comparable days | M | SFMTA Intersection / Corridor Counts CSV; SFMTA RAISE reports (Quality Counts) | POTENTIAL_AUTHORIZATION_UNCONFIRMED, pre-project epoch only; post-project MISSING |
| Pedestrian and cyclist movements | Crossing and bikeway volumes per bin, same days | M (multimodal corridor) | SFMTA automated bike counters (a 2019 map lists Folsom 8th–9th); DataSF `7j2t-hunp` locations only | Volumes POTENTIAL_AUTHORIZATION_UNCONFIRMED; locations AUTHORIZED_AVAILABLE; pedestrian volumes MISSING (no official open dataset found) |
| Signal phases and timing plans | Phases, cycle, splits, offsets, coordination, actuation, per period, same epoch | M | SFMTA timing cards by public-records request | POTENTIAL_AUTHORIZATION_UNCONFIRMED (not requested); DataSF Traffic Signals `ybh5-27n2` gives locations only (PDDL) |
| Travel times and delays | Corridor travel time or intersection delay, measured | M for delay claims | SFCTA CMP speeds (INRIX) | RESTRICTED; arterial delay otherwise MISSING |
| Queue lengths | Max/average queue per approach and cycle, observed | M for queue claims | None found | MISSING (would need a separately authorized, privacy-safe field protocol) |
| Observation periods and variability | Day types, peaks, holidays, weather, at least 5 comparable independent days | M | Depends on the count source | MISSING for any one source and epoch |
| Roadworks and operations | Closures, permits, construction phases on observation days | M (exclusion rule) | DataSF Street-Use Permits `b6tj-gt35`, Excavation `i926-ujnc`, Temporary Street Closures `8x25-yybr` | AUTHORIZED_AVAILABLE (PDDL, documented in `docs/DATA_SOURCES.md`); a permit is not proof of work on a given day |
| Collisions | Context for safety discussion only | O | DataSF Traffic Crashes `ubvf-ztfx`, HIN `enwt-3u8m` | AUTHORIZED_AVAILABLE (aggregates); not a delay or efficacy measure |
| Freeway context | — | — | Caltrans PeMS | NOT_APPLICABLE (freeway detectors; account required, excluded by CORE rules) |
| Transit | Bus delay, boarding | O | SFMTA GTFS / regional 511 | Not audited; regional API requires a key (excluded) |

## 2. Source and licence audit

| Source | Coverage (geo / time) | Method | Format / access | Licence or terms | CORE use explicitly authorized? | Limitations | Cost |
|---|---|---|---|---|---|---|---|
| [SFMTA Traffic Counts](https://www.sfmta.com/TrafficCounts) intersection and corridor CSVs | Citywide sample; isolated dates, label 2014–2022, some older | Contractor counts (tube, manual), method per record | CSV on sfmta.com | [sfmta.com terms](https://www.sfmta.com/terms-of-use) (updated 2022-03-29) reserve rights in editorial/creative assets; no data licence | **No** | Pre-project; ADT vs measured mixed; encoding issues; no holdout days (see manifest) | $0 |
| SFMTA RAISE Howard reports (Quality Counts) | Howard 6th–7th, 2018-10-17 | Tube count, one day, WB | PDF | Same terms; vendor tables | **No** | One day; pre-project | $0 |
| [SFMTA signal timing cards](https://sfmta.com/SignalDiagrams) | Per intersection, epoch on request | Official controller timing | Public-records request (Sunshine Ordinance / CPRA) | Disclosure ≠ reuse grant | **Unconfirmed**: ask for written reuse terms in the request | Not yet requested; pre- and post-project cards both needed | Request free; possible duplication cost for paper copies |
| SFMTA signal inventory diagrams | Citywide | Infrastructure records | Web diagrams | No licence; rights reserved by site terms | **No** | SFMTA: not the official timing source; field verification needed | $0 |
| DataSF Streets / Intersections / Traffic Signals (`3psu-pn9h`, `gmfx-8h6i`, `ybh5-27n2`) | Citywide, current | Administrative GIS | Open data portal | ODC-PDDL (DataSF terms default; per-dataset licence recorded) | **Yes** | No lanes, phases or timing | $0 |
| DataSF Bicycle Loop Counters `7j2t-hunp` | Citywide counter locations | GIS points | Open data portal | ODC-PDDL (official metadata read 2026-10-23) | **Yes**, locations only | No counts; metadata freshness inconsistent | $0 |
| SFMTA bike counter volumes | Continuous counters (39 consistently reporting from 2018) | Automated in-road sensors | Dashboard on sfmta.com | No data licence | **No** | Trend indicator per SFMTA; counter survival through reconstruction unknown | $0 |
| [SFCTA CMP](https://www.sfcta.org/reports/congestion-management-program-2025) speeds | CMP network, monthly Tue–Thu, AM/PM peaks | INRIX commercial GPS, floating car backup | Reports, dashboard | Commercial source; no licence | **No** (RESTRICTED) | Segment speeds, not delay/queues | Commercial data not purchasable under $0 rule |
| DataSF permits / closures (`b6tj-gt35`, `i926-ujnc`, `8x25-yybr`) | Corridor, daily | Administrative records | Open data portal | ODC-PDDL | **Yes** | Permit ≠ work performed | $0 |
| OpenStreetMap | Global | Volunteer mapping | Extract | ODbL 1.0 (attribution, share-alike) | **Yes**, with ODbL obligations | Lane tags may lag reconstruction | $0 |
| Caltrans PeMS | California freeways | Loop detectors | Account | Account terms | Excluded (account) | Not the corridor | $0 but excluded |

Publicly accessible is not authorized. No measured table is copied into the repository.

## 3. Calibration requirements (minimum to start, one epoch)

1. Written authorization for processing **and** republication of aggregates (G0), per source, with evidence URL/date and byte hash.
2. As-built geometry for the epoch: lanes, bikeway, crossings, turn restrictions.
3. Timing cards for the same epoch and periods (phases, cycle, splits, offsets, actuation/coordination).
4. Turning-movement counts with pedestrian and bicycle volumes, 15-minute bins, at least 5 comparable independent weekdays, fixed day-type and holiday rules (3 calibration / 1 validation / 1 sealed holdout, as in `PREREGISTRATION.md`).
5. Roadworks/closure screening for each observation day, with exclusion rules fixed before reading the counts.
6. For any delay or queue claim: a measured delay or queue variable on the same days. Counts alone cannot validate delay.
7. A named, competent independent reviewer holding the holdout (G3).

## 4. Protocol additions (what the canonical package lacked)

- **Baseline:** keep the training-days slot mean (`meanBaseline`). For timing scenarios, the baseline is the *observed* operation with the *documented* timing card of that epoch, never CORE's assumed plan.
- **Data quality assessment, before any model:** completeness per bin, duplicates and overlaps, unit checks (ADT vs counted), counter malfunctions, level shifts (as found for NYC Canal St), construction days, daylight-saving transitions, mode coverage, and agreement between overlapping sources. Failures stop the conclusion concerned.
- **Calibration:** bounded, identifiable parameters only (saturation flow, start-up lost time, demand profile), physically constrained, with a fixed search budget recorded before running. No tuning against validation or holdout days.
- **Holdout:** day-level, sealed by the reviewer; one opening; any model change needs a new protocol version and new days.
- **Sensitivity analysis (pre-registered):** demand ±20% and day-to-day range, saturation flow, lost time, pedestrian-phase calls, bike-signal phasing and geometry alternatives. Report which conclusions flip.
- **Uncertainty reporting:** separate measurement error (counter accuracy as documented by the source), day-to-day variation (between independent days), parameter uncertainty and model-structure uncertainty. Intervals only where the sample supports them; with five days, descriptive ranges only. Seeds are not independent days.
- **Scenario comparison:** alternatives are compared only inside the calibrated, validated model and envelope, against the observed baseline, using the same demand days. Any result is labelled "simulated difference under assumptions", with its sensitivity range.
- **Independent review:** checklist in `INDEPENDENT_REVIEW.md`, plus verification that geometry, timings and counts share one epoch.
- **Conditions for a measured-benefit claim** (all required):
  1. A real intervention was implemented under human authority.
  2. It was observed before and after, with a pre-registered design, ideally with comparison sites to separate the effect from trends and from the reconstruction.
  3. The effect was measured on the outcome claimed (delay, queues or safety), not inferred from counts.
  4. Uncertainty is reported.
  5. Independent review approved the claim's exact scope.

  Model output never satisfies these conditions.

**Impossible without real observations:** calibration, holdout error, any statement about current delay or queues, validation of CORE's scenario, and any benefit claim. A software test on synthetic counts is not evidence.

## 5. Missing critical data

Post-reconstruction counts (all modes), current timing cards, as-built geometry, measured delay or queues, pedestrian volumes, and a reuse authorization for any SFMTA measured table. Also no independent reviewer is designated.

## 6. Zero-cost feasibility

| Step | Feasible at $0? | Note |
|---|---|---|
| Source qualification, protocol drafting, synthetic tests | Yes | Done or in place |
| Public-records request for timing cards, as-builts and explicit reuse terms | Yes, likely | Founder must authorize the request (outward-facing action); electronic copies requested to avoid duplication fees |
| Written SFMTA reuse grant for existing count tables | Yes, if granted | Depends on the agency |
| New post-construction counts | Only through existing public programs or volunteers under a separately authorized, privacy-safe aggregate protocol | Paid contractor counts excluded |
| Travel time / delay via commercial speeds | No | INRIX and similar excluded |
| Independent reviewer | Only with a volunteer or academic partner | No fees authorized |

Conclusion: a calibrated Folsom study is not achievable now at $0 without agency records and authorization. The cheapest honest next step is an authorized request, not more modelling.

## 7. Robustness fix (implemented and tested)

Probing with blocked files (request interception, no production service) showed:
- Missing modules were already named by the boot guard, and a missing catalog by the demo launcher.
- **Gaps, now fixed:**
  - A missing `data/intelligence/work.json` produced a false red "could not start" alert, triggered by a benign `ResizeObserver` warning, over a working page. The boot guard now ignores that warning and reports a **degraded start** as a non-blocking status naming the file: "Started with a problem: Published records unavailable: data/intelligence/work.json … reload to retry".
  - The command-bar catalog error now names the file after its one retry.
  - A missing agent registry made the R2 dossier claim an agent was "not in the published registry". Now it says the file could not be loaded and that fields are unavailable, not absent. The same applies to recorded-work files and to My CORE's related-investigation link.

Tests: `test/boot-guard.test.js` (+2), `test/agent-records.test.js` (+1), `test/core-intelligence.test.js` (+1 assertion), and browser `scripts/r3-robustness-browser.mjs` 6/6.

## 8. Recommended next milestone

**R4 — authorized records request (founder action) and epoch decision.**
1. The founder chooses the study epoch (historical or post-construction).
2. The founder approves filing one SFMTA public-records request for Folsom 2nd–11th timing cards (pre- and post-project), as-built signal and lane drawings and any project before/after counts, asking explicitly for reuse and republication terms.
3. Identify a volunteer or academic independent reviewer.
4. Freeze the epoch, site and day-type rules in `PREREGISTRATION.md` before any data arrives.

No CORE code can substitute for these steps.
