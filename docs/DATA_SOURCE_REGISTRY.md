# CORE data source registry (San Francisco city laboratory)

Machine-readable registry: `src/domains.js` (domains, dataset specs, schemas, normalizers). Integrated snapshots live in `data/sf/` with `manifest.json` (request URL, retrieval time, raw and output SHA-256, row counts, rejections, duplicates, licence). Verified against the DataSF catalog and live SoQL on **2026-10-13**.

All DataSF datasets below are published under the **ODC Public Domain Dedication and License (PDDL)**. API base: `https://data.sf.gov/resource/<id>.json`; dataset page: `https://data.sf.gov/d/<id>`.

## Integrated datasets

| Domain | Dataset (id) | Provider | Update | Geometry / time | Corridor query | Kept (raw) | Quality notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Infrastructure | Streets (3psu-pn9h) | DPW Basemap | Daily | Line / — | Folsom + Howard, CNN chain 2nd → 11th | 44 (99) | Administrative geometry |
| Infrastructure | Street Intersections (gmfx-8h6i) | City | Daily | Point / — | Corridor nodes | 46 (92) | — |
| Infrastructure | Street-Use Permits (b6tj-gt35) | Public Works | Daily | Point / start–end | Corridor CNNs, work types, since 2021 | 662 (662) | A permit is not proof of work; contacts removed |
| Infrastructure | Large Utility Excavation Permits (i926-ujnc) | Public Works | Monthly | Point / start–end | Corridor CNNs | 23 (23) | — |
| Infrastructure | Utility Excavation Moratorium Streets (5wbp-dwzt) | Public Works | Weekly | Point or segment / dates | Corridor CNNs | 71 (71) | Current moratoria only |
| Events | Temporary Street Closures (8x25-yybr) | SFMTA | Daily | Line / dates | Corridor CNNs | 19 (19) | SFMTA permits only |
| **Nature** | **Street Tree Inventory (tkzw-k3nq)** | Public Works | Daily | Point / planted date (often missing) | `cnn` in corridor (zero-padded in source) | **484 (497)** | 13 rows rejected (missing latitude); inventory, not field-verified |
| **Nature / Events** | **Street Tree Removal Notifications (qrwx-q4gg)** | Public Works | Daily | Point / posted date | `treeid` of corridor trees | **13 (13)** | A notice does not confirm removal; site text redacted for contacts |
| **Buildings** | **Building Permits (i98e-djp9)** | DBI | Multiple times/hour | Point (address) / filed, issued, completed | Bounding box, active status or completed within 12 months, filed since 2016; ≤ 40 m from corridor axis | **854 (11,028)** | `issued` often never closed (540 of 669 more than 3 years old): recency rule required |
| **Energy** | **Existing Buildings Energy Performance Ordinance Report (96ck-qcfe)** | SF Environment | Monthly | Point / benchmark year | Bounding box, latest year, ≤ 60 m | **92 (5,000)** | Self-reported benchmarks; query limit reached but ordered newest first (latest year complete) |
| **Nature / Public space** | **Recreation and Parks Properties (gtr9-ntp6)** | Rec & Parks | Weekly | Centroid point / — | All properties, ≤ 200 m | **3 (255)** | Victoria Manalo Draves Park, Eugene Friend Rec Center, Howard & Langton Mini Park |
| **Public space** | **Sidewalk Widths (4g86-grxu)** | SFMTA (AECOM 2014) | As needed | Line / 2014 | Corridor CNNs | **44 (44)** | 2014 study |

Bold rows are the new Phase 2D domains. New real domains beyond roadworks: nature (trees, removals, parks), buildings (permits), energy (benchmarks) and public space (sidewalks, parks).

## Identified, not integrated

| Domain | Candidate | Reason |
| --- | --- | --- |
| Environment | Air Pollutant Exposure Zone (t65d-x6p8), HAQR Priority Green Infrastructure Zones (nn26-kuy2) | Polygons only, no measurements; deferred to keep the release safe |
| Society | Analysis Neighborhoods (j2bu-swwd) | Boundaries only; no aggregated indicators integrated; never individual data |
| Land use / parcels | San Francisco Land Use (c5ge-t6pj), Parcels (acdm-wktn) | Large; needs bounded geometry queries |
| Energy (municipal) | Municipal Energy Benchmarking (bfhx-j6n5) | City-owned buildings only |
| Accessibility | Curb Ramps (ch9w-7kih) | Candidate for a construction + accessibility investigation |
| Events / news | — | No verified feed; news would be a lead, never a fact |

## Rules

- **Bounded queries:** CNN lists, bounding boxes and recency windows. No whole-city downloads into the browser.
- **Validation:** schema validation per dataset. Rejected rows are counted by reason, and duplicates are counted.
- **Privacy:** personal contact columns are removed, emails and phones in free text are redacted, and permit holders are kept only when they are clearly organisations.
- **Failure handling:** a failed fetch keeps the previous snapshot and exits non-zero. Synthetic substitution is forbidden.
- **Refresh:** run `node scripts/sf-snapshot.mjs` then `node scripts/city-snapshot.mjs`. Tests verify checksums. Refreshing changes findings and fingerprints, and the brief shows the snapshot date.

## City Intelligence feed sources (Phase 3, `src/feeds.js`)

Verified 2026-10-13. Items keep source, URL, publication date, retrieval date, first/last seen, revision and verification status. Stored in `data/feeds/items.json`, with health in `data/feeds/state.json`.

| Source | Kind of items | Access | Minimum interval | Status 2026-10-13 |
| --- | --- | --- | --- | --- |
| DataSF Street-Use Permits (b6tj-gt35), corridor, 30 days | approved decisions / ongoing | Node + browser | 15 min | 7 items |
| DataSF Building Permits (i98e-djp9), corridor box, 30 days | proposals / approved decisions | Node + browser | 15 min | 92 items |
| DataSF Tree Removal Notifications (qrwx-q4gg), corridor box, 90 days | public notices | Node + browser | 30 min | 4 items |
| DataSF Temporary Street Closures (8x25-yybr), corridor, upcoming | approved decisions / proposals | Node + browser | 30 min | 3 items |
| USGS FDSN, ≤ 100 km, 30 days, M ≥ 2.5 (public domain) | observations | Node + browser | 5 min | 7 items |
| NWS alerts, zone CAZ006 (public domain) | predictions | Node + browser | 10 min | 0 active |
| Legistar web API (sfgov) | metadata only | Node | 60 min | **stale** (newest 2020) |
| SFMTA blog RSS | announcements | Node | 60 min | current |
| SF Public Works RSS | announcements | Node | 60 min | current |
| SFPUC RSS | announcements | Node | 60 min | **stale** (newest 2024) |

Not available: sf.gov and SF Planning RSS (404), licensed news (not integrated).

## Phase 4 changes to City Intelligence sources (verified 2026-10-13)

17 sources are registered, 16 of them active. Every item keeps: source, URL, publication date, retrieval date, first and last seen, revision, kind, verification status, geography (coordinates, or an address only, or none) and a confidence level with its limitation.

| Source | Category | Kind of items | Access · interval | Confidence and limits |
| --- | --- | --- | --- | --- |
| DataSF Planning project records (qvu5-m3a2), 30 days, `record_type = PRJ` | urbanism | proposals / approved decisions | Node + browser · 60 min | High. A submission is not an approval. Applicant and planner names are never requested; addresses are not geocoded (street-level link only). |
| DataSF 311 cases (vw6y-z8j6), South of Market, 7 days | society | statistics (aggregated counts by category) | Node + browser · 6 h | Medium. Public reports, not verified incidents; no individual records collected. |
| DataSF business registrations (g8m3-pdis), South of Market, 30 days | economy | statistic (one count) | Node + browser · 24 h | Medium. A registration is not an opening; no names collected. |
| SF Recreation & Parks news (RSS) | environment / events | announcements | Node · 2 h | Medium. Agency communication about its own projects. |
| SF Fire Department news (RSS) | public safety | announcements | Node · 2 h | Medium. Administrative notices, not an incident feed; `http://` links upgraded to HTTPS. |
| CAISO Today's Outlook fuel mix (CSV) | energy | observation (grid-reported) | Node · 60 min | High. Statewide balancing area, not San Francisco specific. |
| Open-Meteo air quality (CAMS model), SoMa | environment | prediction (modelled) | Node + browser · 60 min | Low. Model output, not a sensor measurement (registered open data, CC BY 4.0). |
| Legistar web API (sfgov) | administration | — | **retired** | The public API has held no matter newer than 2020; historical items are kept and labelled. |
| SFPUC RSS | infrastructure | announcements | Node · 24 h | Low. Not updated since May 2024. |

**Statement kinds** keep facts separate from statements:
- observation, statistic;
- public notice, proposal, approved decision, ongoing or completed work;
- prediction;
- agency announcement;
- commentary, opinion, allegation. Allegations are never treated as facts and never trigger missions.

**Scheduled refresh:** `.github/workflows/city-feed.yml` (GitHub Actions, every 3 hours; see docs/PHASE_4_REPORT.md for verified status).

**Not integrated:**
- sf.gov, the Mayor's office, SF Planning, SF Environment and sfbos.org RSS (404 or timeout);
- Department of Emergency Management RSS (empty);
- Muni and BART alerts (require API keys);
- individual 311, police or fire incident records (privacy);
- licensed press.

