# San Francisco data inventory

Last verified: **2026-10-13** via the Socrata catalog, live SoQL queries and official pages. "Data updated" is the portal's `data_updated_at`. Nothing listed here is integrated yet. Integration in 2B requires a dated, hashed snapshot and a manifest entry.

## DataSF portal facts

- The portal moved: `data.sfgov.org` now redirects to **`https://data.sf.gov`**. API base: `https://data.sf.gov/resource/<id>.json` (SoQL). Dataset page: `https://data.sf.gov/d/<id>`.
- Access is anonymous with throttling. A free app token is optional, but a token in a static site is public. Snapshots should be fetched offline.
- The licence for all DataSF rows below is **ODC Public Domain Dedication and License (PDDL)**, as reported by the catalog, unless noted otherwise.
- **Privacy rule for 2B snapshots:** Street-Use Permits expose `agentphone`, `contact`, `inspector` and `planchecker` columns. Drop personal contact columns before committing. Keep organisation names (`agent`) only where they are needed to show multi-party coordination.

Columns in the table below:

- **Kind:** O = observed record, A = administrative/legal record, M = modelled/derived, E = estimated.
- **Calibration?:** whether the data can calibrate a traffic simulation.

## Core datasets (DataSF)

| Dataset (id) | Provider | Coverage | Update / data updated | Format | Kind | Calibration? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Utility Excavation Permits (`smdf-6c45`) | SF Public Works | Citywide, active or approved and not expired | Daily / 2026-10-13 | SoQL JSON/CSV | A | No (not traffic) | Fields: permit_number, cnn, streetname, cross streets, utility_type, utility_contractor, effective/expiration dates, reason, status |
| Large Utility Excavation Permits (`i926-ujnc`) | SF Public Works (Dig Once program) | ≥1,000 ft², active/approved plus ended within 1 year | Monthly publish, daily change / 2026-10-13 | SoQL | A | No | Purpose field; lat/long |
| Utility Excavation Moratorium Streets (`5wbp-dwzt`) | SF Public Works | Segments paved within the last 5 years (current moratoria only) | Weekly / 2026-10-09 | SoQL | A | No | effectivedate, expirationdate, cnn, limits. No history of expired moratoria. |
| Street-Use Permits (`b6tj-gt35`) | SF Public Works | All street space permits since 1993 (1,232,973 rows; backfilled 2025-01) | Daily / 2026-10-13 | SoQL | A | No | permit_type includes Excavation (343,823), ExcStreet, TempOccup, Emergency, Boring, … Contains personal contact columns (drop them). |
| Active and upcoming street surface permits (`bpc9-7sus`) | SF Public Works | Active or starting within 14 days | Daily / 2026-10-13 | SoQL | A | No | Surface (non-underground) activity |
| Temporary Street Closures (`8x25-yybr`) | SFMTA | SFMTA-permitted closures only (events, Shared Spaces, some construction) | Daily / 2026-10-12 | SoQL | A | No | Excludes closures managed by other departments |
| Traffic Crashes Resulting in Injury (`ubvf-ztfx`) | SFDPH / SFPD | Citywide, 2005-01-01 → 2026-08-31 (66,384 rows) | Quarterly / 2026-10-07 | SoQL | O (police-reported) | Safety outcome, not flow | Replaces Transbase. Parties and victims tables: `8gtc-pjc6`, `nwes-mmgh`. |
| Traffic Crashes Resulting in Fatality (`dau3-4s8f`) | SFDPH | Vision Zero fatality protocol | Quarterly / 2026-09-25 | SoQL | O | No | |
| 2024 High Injury Network (`enwt-3u8m`) | SFDPH | Segments with the highest severe/fatal concentration, 2020–2024 | Historical only / 2026-03-23 | SoQL | M (derived from observed crashes) | No | Several records per street segment; do not sum lengths naively |
| Traffic Signals (`ybh5-27n2`) | SFMTA signal shop | Citywide signal and beacon inventory | Stated quarterly; **data updated 2024-05-31** | SoQL | A | Locations only | Equipment, detection, preemption fields. **No timing.** |
| Streets – Active and Retired (`3psu-pn9h`) | DPW Basemap | Citywide centerlines (CNN), one-way flag, class | Daily / 2026-10-12 | SoQL | A | Network geometry | CNN is the join key across permit, closure and crash data |
| Street Intersections (`gmfx-8h6i`) | City | All intersections (CNN nodes) | Daily / 2026-10-12 | SoQL | A | Network nodes | |
| Speed Limits per Street Segment (`3t7b-gebn`) | SFMTA | Posted limits (mostly >25 mph segments) | As needed / 2026-09-26 | SoQL | A | Free-flow assumption only | Legal limit, not observed speed |
| Speed Limit Compliance (`wytw-dqq4`) | SFMTA / SF Indicators | Selected segments, 2004–2009 | Historical only | SoQL | O (old) | Historical context only | Too old for calibration |
| Building Footprints (`ynuv-fyni`) | City (Technology) | 177,023 footprints, all with `hgt_median_m`, `gnd_min_m` | Daily publish / 2026-10-12 | SoQL / GeoJSON | M (from 2010 Pictometry LiDAR/photogrammetry) | No | Heights reflect 2010; later towers need checking |
| Tall Building Inventory (`5kya-mfst`) | City Administrator | 156 buildings >240 ft (as of 2018) | As needed / 2019-07-11 | SoQL | A | No | Useful to cross-check landmark heights |
| Muni Stops (`i28k-bkz6`) | SFMTA (Trapeze export) | All stops; Folsom has 38 stop records | Weekly / 2026-04-11 | SoQL | A | Transit interaction context | No route-to-stop mapping in this table |
| Transit Only Lanes (`tzh6-6j82`) | SFMTA | Legislated transit lanes | As needed / 2024-01-18 | SoQL | A | No | None on Folsom or Howard (query returned 0) |
| Transit Vehicle Location History (`x344-v6h6`) | SFMTA | AVL positions and speeds | **Stale: data ends 2021-12-31** | SoQL | O | Historical only | Not current |
| SFMTA GTFS (`dni7-qpv3`) | SFMTA | Schedules | Portal copy updated 2022-06-01 (stale) | ZIP | A | Transit schedule | CC0. Current GTFS is published elsewhere by SFMTA/511 (verify in 2B). |
| Bike Volume – Manual Counts (`v4v2-5x7s`) | SFMTA | Selected locations | 2024-01-18 | SoQL | O | Bicycles only | |

## Other sources

| Source | URL | Provider | Coverage / update | Access and terms | Kind | Calibration use |
| --- | --- | --- | --- | --- | --- | --- |
| SFMTA Traffic Count Data 1993–2015 | https://www.sfmta.com/sites/default/files/reports/2016/SFMTA%20Traffic%20Count%20Data%201993-2015%20with%20cover%20sheet.pdf | SFMTA | Segment 24-h volumes, some peaks; ends 2015 | Public PDF; licence not stated | O (old) | Historical prior only; would need PDF extraction and age disclosure |
| Signal timing cards | https://sfmta.com/SignalDiagrams (says diagrams are not official timing) | SFMTA | Per intersection | **Not published.** Public records request (Sunshine Ordinance; 10 days, extendable 14) | A | Required for any signal calibration; open request needed |
| 511 SF Bay Open Data: Traffic Events, WZDx work zones, tolls; transit feeds | https://511.org/open-data/traffic | MTC 511 | Bay Area highways and major events; WZDx closures | Free registration token (name, email); **60 requests/hour** default; data agreement PDF not reviewed (open) | A/O | Work-zone context; no arterial speed API (speed is a map layer only) |
| Caltrans PeMS | https://pems.dot.ca.gov/ | Caltrans | 39,000+ detectors, statewide freeway system; 10+ years archive | Free account, approval 1–2 business days; terms not reviewed | O | Freeway approaches only (US-101, I-80, I-280), **not Folsom** |
| SFCTA Congestion Management Program 2025 | https://www.sfcta.org/reports/congestion-management-program-2025 | SFCTA | Biennial arterial/freeway speed monitoring; 2025 report | Public PDF reports; dashboard at congestion.sfcta.org; raw speed licensing unknown (open) | O (aggregated) | Context and validation targets if segment values are published; no raw feed found |
| SF Scorecards: congestion | https://sfgov.org/scorecards/congestion | City | Citywide arterial/freeway peak speeds | Chart download | O (aggregate) | Citywide context only |
| SFMTA Folsom-Howard Streetscape Project | https://www.sfmta.com/projects/folsom-howard-streetscape-project | SFMTA | Project status (Sept 2026 update) | Public page | A (agency-reported) | Timeline context, not data |
| OpenStreetMap | https://www.openstreetmap.org/copyright (Overpass: https://overpass-api.de) | OSM contributors | Global, continuous | ODbL; Overpass needs an identifying User-Agent and fair use | O (crowd) | Network geometry for SUMO import (later) |
| Overture Maps | https://docs.overturemaps.org/attribution/ | Overture Maps Foundation | Global, periodic releases | Buildings and transportation ODbL; Places mixed permissive | M/O | Alternative geometry |
| AWS Terrain Tiles | https://registry.opendata.aws/terrain-tiles/ | Mapzen / AWS | Global composite | Source-specific attribution | M | Visual terrain only |
| Golden Gate Bridge statistics | https://www.goldengate.org/bridge/history-research/statistics-data/design-construction-stats/ | GGBHTD | Static facts | Public page | A | Landmark model dimensions |

## Gaps

**Blocking traffic calibration on surface streets:**

1. No current vehicle counts or turning movements for Folsom or Howard were found.
2. No signal timing has been published.
3. No open measured arterial speeds by segment were found. CMP raw data status is unknown.

Consequence: any 2B traffic simulation of Folsom stays **synthetic and labelled**. Coordination-of-works analysis does not need traffic data and can rest on observed records.

To close the gaps (owner decision):

- File an SFMTA records request for Folsom/Howard timing cards and recent counts.
- Ask SFCTA about CMP segment data.
- Commission manual counts (cost; not allowed without approval).
