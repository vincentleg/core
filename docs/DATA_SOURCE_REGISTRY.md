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
