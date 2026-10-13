# San Francisco pilot corridor selection

Data retrieved **2026-10-13** from `data.sf.gov` (queries at the end). Counts are observed administrative or police records, not traffic measurements. A high permit or crash count is evidence of activity or harm. It does not prove congestion, waste or wrongdoing.

## Candidates

The window is 2021-01-01 → 2026-10-13 unless stated. Name matching is approximate where noted.

| Corridor | Excavation permits (segments, agents) | Segments with ≥10 permits | Current moratorium records | 2024 HIN segment records | Signals in inventory | SFMTA closures | Observed traffic counts / timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Folsom St** | 474 (84, 26) | 12 | 47 | 202 | 35 | 18 (13 special events, 5 special traffic permits) | None public |
| **Howard St** (paired) | 325 (45, 24) | 12 | 1 | 111 | 22 | 4 | None public |
| Mission St | 883 (150, 36) | 25 | 67 | 277¹ | 66¹ | 33¹ | None public |
| Geary Blvd | 419 (140, 25) | 3 | 0 | 175¹ | 63¹ | 0 | None public |
| 3rd St | 471 (136, 33) | 6 | 3 | 153 | 68 | 0 | None public |
| Van Ness Ave | 147 (86, 14) | 0 | 15¹ | 46¹ | 46¹ | 12¹ | None public |

¹ The `LIKE` street-name match can include similarly named streets (Mission Bay, Geary St, South Van Ness). These figures are indicative; 2B must filter by CNN.

**Additional verified context:**

- **Citywide rank:**
  - Mission (883) and Folsom (474) are the top two streets for excavation permits since 2021.
  - For injury crashes with the street as primary road, the 2021+ order is Mission 831, Market 486, 3rd 388, Folsom 261.
- **Folsom injury crashes**, as primary or secondary road: 84 (2021), 77, 82, 84, 85 (2025), 68 (2026 to 31 Aug).
- **Folsom repeat excavation hot spots:**

  | Segment | Permits | Agents |
  | --- | --- | --- |
  | 8th–9th | 21 | 6 |
  | Eugenia–Cortland | 21 | 3 |
  | 17th–18th | 16 | 7 |
  | 4th–5th | 12 | 5 |
  | 6th–Harriet | 11 | 4 |

- **Permits under moratorium:** 16 Folsom permits started on a CNN segment while a current paving moratorium was active, across 8 segments. Exemptions can apply, and the moratorium table lists only current moratoria. **This is not evidence of a violation.**
- **Who holds the permits:** the top permit agents on Folsom are PG&E (185), Mitchell Engineering (92), CableCom (32), J. Flores Construction (28) and the SF Water Department (21). The leading stated purposes include the Folsom Streetscape project, Transbay Folsom improvements, stormwater work and pothole repair. **Much of the activity is planned capital work**, not uncoordinated digging.
- **Project status:**
  - SFMTA reports the Folsom Streetscape (8th–11th) ~95 % complete and the full corridor ~75 %, with substantial completion targeted for October 2026 (agency self-report).
  - Howard Streetscape design is complete; contractor selection is pending, and no start date is announced.
  - Howard has **35 approved large (≥1,000 ft²) excavation permits**, the second-highest street citywide.
- **Transit:** Folsom has 38 Muni stop records. Neither street has a legislated transit-only lane.

## Scoring

Scale: 1 = weak, 3 = strong.

| Criterion | Folsom (+Howard) | Mission | Geary | 3rd |
| --- | --- | --- | --- | --- |
| Accessible observed data | 3 (permits, moratoria, closures, crashes) | 3 | 2 (no moratorium/closure records) | 2 |
| Identifiable, evidenced problem | 3 (repeat multi-agent excavation; HIN) | 3 | 2 | 2 |
| Simulation scope | 3 (≈1.5 mi SoMa grid, pairs with Howard) | 1 (long, transit-dominant) | 1 (long, BRT project) | 2 |
| Visual storytelling | 3 (SoMa towers near Salesforce/Transbay; a live before/after project) | 2 | 2 | 2 |
| Measurable outcome | 3 (permit and occupation counts are observable going forward) | 2 | 2 | 2 |
| Feasibility and continuity | 3 (existing pilot marker is SoMa; Phase 2 roadmap names Folsom) | 2 | 2 | 2 |
| **Total** | **18** | 13 | 11 | 12 |

## Selection

**Pilot: Folsom Street, 2nd St → 11th St (SoMa), with Howard Street 2nd → 11th as the paired prospective corridor.**

- **Problem statement:** *"Repeated excavation by multiple parties on the same blocks, and how future works could be coordinated around paving moratoria."* Every element is shown from observed public records.
- **Folsom (retrospective):** shows what happened.
- **Howard (prospective):** shows a decision that still exists. Large approved excavations exist while the streetscape repaving has not started.
- **Signal-timing simulation:** remains the separate synthetic demo until counts and timing are obtained.

**Verified facts:** every figure above was observed in public datasets on 2026-10-13.

**Assumptions:**

- Rescheduling or bundling windows (for example ±60 days) are hypothetical parameters, not agency policy.
- Excavation permit counts are a proxy for street openings. A permit may cover multiple openings or none.

**Risks:**

- The Folsom numbers are dominated by an intentional capital project. The demo must say so, or it misleads.
- CNN matching across datasets needs validation.
- Permits are not proof that work happened.
- Public Works coordination processes, such as its own Dig Once and moratorium review, already exist. CORE must not imply the city lacks coordination.

**Open questions:**

- Exemption rules for moratorium streets.
- Whether planned (not yet permitted) utility work is publicly available.
- Interest from SF Public Works / SFMTA in reviewing outputs.

## Reproducible queries

Base URL `https://data.sf.gov/resource/<id>.json`, parameter `$query`:

```sql
-- b6tj-gt35: excavation permits per street since 2021
SELECT streetname, count(*) AS n WHERE permit_type='Excavation' AND approved_date >= '2021-01-01' GROUP BY streetname ORDER BY n DESC
-- b6tj-gt35: segments with >=10 permits
SELECT cnn, count(*) AS n WHERE permit_type='Excavation' AND streetname='FOLSOM ST' AND approved_date >= '2021-01-01' GROUP BY cnn HAVING count(*) >= 10
-- 5wbp-dwzt: current moratoria
SELECT cnn, limits, effectivedate, expirationdate WHERE streetname like '%FOLSOM%'
-- ubvf-ztfx: injury crashes by year
SELECT accident_year, count(*) AS n WHERE primary_rd='FOLSOM ST' OR secondary_rd='FOLSOM ST' GROUP BY accident_year
-- i926-ujnc: approved large excavations
SELECT street_name, count(*) AS n WHERE permit_status='APPROVED' GROUP BY street_name ORDER BY n DESC
```

The moratorium overlap was computed client-side: a permit counts when its `permit_start_date` (falling back to `approved_date`) lies within [`effectivedate`, `expirationdate`] of a moratorium record with the same `cnn`.
