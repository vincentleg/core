# Phase 2B — San Francisco digital twin foundation: report

Status: **COMPLETE on 2026-10-13** against the Phase 2B acceptance criteria in the founder's Phase 2B brief, with the coverage limits below. Baseline: Phase 2A `63c878d`. The next phase has **not** started.

**Scope note.** The founder's Phase 2B brief scoped this phase to the San Francisco world foundation:

- 3D city, Golden Gate Bridge, landmarks;
- the real-data pipeline;
- a Folsom/Howard pilot view with record inspection.

The Phase 2A plan also listed a deterministic coordination engine, a coordination gateway, traced agents and the synchronized agent workspace. Those items are **not implemented** and remain planned (ROADMAP Phase 2C). Space for the agent workspace is reserved: an "Agents · à venir" tab, disabled.

## Delivered

- **San Francisco world** (`index.html`, `src/sf-world.js`, `src/sf-view.js`):
  - **Cinematic arrival:** a 9 s Earth → San Francisco flight to a downtown skyline view.
  - **Navigation:** 11 neighbourhood and landmark destinations. Local search covers SF places, landmarks and street names, with no network geocoder.
  - **Terrain:** hillshade at city zoom (≥ 10).
  - **Base map:** OSM streets, buildings and coastline through the existing OpenFreeMap style.
- **Golden Gate Bridge**, a procedural model in native MapLibre fill-extrusions:
  - two towers with portal struts, piers, anchorages, the deck, 2 main cables (496 segments) and 248 suspenders;
  - dimensions published by the Golden Gate Bridge District: 227 m towers, 1,280 m main span, 343 m side spans, 67 m clearance, 27 m deck, 50 ft suspender spacing;
  - placed on the OSM tower positions, which measure **1,283.0 m** apart against the official 1,280 m (+0.23 %);
  - cables are drawn about 3.5× their real diameter for legibility, and this is disclosed.
- **Landmarks:**
  - Salesforce Tower (rounded plan, tapered crown) and Transamerica Pyramid (stepped pyramid and spire) are procedural silhouettes on OSM footprints and heights.
  - Ferry Building (clock tower), Coit Tower and City Hall (dome) use existing OSM building parts.
  - Each is labelled "modèle procédural" or "géométrie OSM" on the map and in the inspector.
  - OSM parts replaced by a procedural model are hidden at runtime by zone, since OpenMapTiles feature IDs follow no single OSM-id encoding. Fort Point and the Ferry Building are protected by the zone criteria and tests.
- **Data pipeline** `scripts/sf-snapshot.mjs`, Node built-ins only, normalization in `src/sf-data.js`:
  - **Contents:** 6 dated snapshots from `data.sf.gov` (ODC-PDDL), totalling about 430 KB:
    - 44 Folsom/Howard centerline segments (2nd → 11th, by CNN topology);
    - 46 intersections;
    - 662 street-works permits (Excavation, ExcStreet, StrtImprov, Boring, Emergency; approved since 2021-01-01);
    - 23 large excavations;
    - 71 paving moratorium records;
    - 19 SFMTA closures.
  - **Manifest:** request URL, retrieval time, raw-response SHA-256, output SHA-256, licence, counts and dropped rows.
  - **Personal data:** contact columns are removed (`agentphone`, `contact`, `inspector`, `planchecker`, …). Emails and phone numbers inside free text are redacted. Permit holders are kept only when they are clearly organisations; one possible personal name is masked.
  - **No invented data:** rows without geometry or identifiers are dropped and counted (0 this run).
  - **CNN ids** are normalised across datasets (`"24583000.0"` → `"24583000"`).
- **Folsom/Howard pilot view:**
  - Corridor, intersections, permits by status (Streetscape-project permits outlined), large excavations, moratoria and closures.
  - Freshness line, and SHA-256 checks re-run in the browser.
  - Street and status filters, layer toggles with counts.
  - Click inspection lists every record at a point. Each record shows its fields, the "permit ≠ proof of work" caveat, links to the dataset page and the record's DataSF API query, retrieval time, licence and checksum status.
- **Interface:**
  - dark navy/cyan/amber panels;
  - OBSERVÉ / APPROXIMATIF / SYNTHÉTIQUE badges;
  - the synthetic agent demo relabelled as such;
  - a mobile bottom sheet;
  - tile failures shown in a separate status indicator so they never erase user feedback.

## Defects found and fixed during the phase

- **Missing suspenders.** MapLibre's GeoJSON simplification silently dropped the 1.1 m suspender polygons. Fixed with `tolerance: 0` on the landmark source; the audit now checks parts.
- **Bridge sinking under 3D relief.** The Terrarium bathymetry is about −132 m under the main span with 1.4× exaggeration, so the deck sagged into the strait. Bridge parts are now offset by the terrain value at their centroid when relief is on.
- **Transient tile fetch failures overwrote status messages.** These came from abandoned or failed requests during fast flights (search feedback was lost in audits). They now use a separate indicator. Source-level failures, such as a blocked TileJSON, still warn in the main message, as the negative audit verifies.
- **Wrong corridor membership in a test.** A CNN string mismatch between datasets made 221 permits fail a corridor-membership test even though the API had matched them correctly. Fixed by normalisation.
- **Fragile OSM-id exclusion.** The first approach hid replaced OSM features by hard-coded IDs, which missed Transamerica's id encoding. It was replaced by runtime zone detection.

## Acceptance

| Criterion | Evidence |
| --- | --- |
| 1. Global map remains functional | All Phase 1 globe, terrain, search, mobile and corridor checks still pass (Chrome and Firefox) |
| 2. Cinematic fly-to to SF | Audit: arrival inside the SF bounds at zoom 14.1, pitch > 60 |
| 3. Buildings, streets, coastline, terrain visible | Audit: building, road and water features rendered; hillshade loaded at city zoom. Screenshots reviewed. |
| 4. Golden Gate recognizable | Audit: towers within 30 m of the OSM positions; cables, suspenders and deck rendered; OSM duplicates hidden. Screenshots reviewed in both browsers. |
| 5. Pilot shows genuine sourced records | Audit: 6/6 checksums verified in the browser; parsed counts equal the manifest; more than 20 permits rendered on the corridor |
| 6. User can inspect records | Audit: a real click on a permit shows the observed record, its provenance, the dataset link and the DataSF API record link |
| 7. Synthetic vs observed distinguished | Badges, inspector labels, source panel; synthetic demo relabelled; audit check |
| 8. Simulation and gateway tests pass | `node --test test/*.test.js`: **29 passed, 0 failed** (21 earlier + 8 new). `corridor.html` rebuild unchanged. |
| 9. No paid service or API | None. No API key, no new runtime dependency; three.js not introduced. |
| 10. Committed and pushed | See the commit `feat: build San Francisco digital twin foundation` |

**Browser runs** (2026-10-13; fresh isolated headless profiles, run sequentially):

| Browser | Result |
| --- | --- |
| Chrome 155.0.8059.40 | 42/42 checks, 0 uncaught errors; negative paths 12/12 |
| Firefox 122.0 (WebDriver BiDi) | 42/42 checks, 0 uncaught errors |
| Safari 27.0.1 | **NOT PERFORMED** (remote automation disabled; owner setting) |

Summary: [PHASE_2B_BROWSER_RESULTS.json](PHASE_2B_BROWSER_RESULTS.json). Raw logs and screenshots are in ignored `test-results/phase2b/`.

**Log notes:**

- **Run-to-run variation.** Transient tile-fetch warnings vary between runs: 0 to 8 in Chrome. In Firefox, BiDi serializes map error events without details, so their origin cannot be attributed: 3 to 47 per run, plus AbortErrors.
- **One earlier Firefox run failed a check.** It passed 41/42 because one terrain tile's CORS/network failure message was counted as an uncaught JavaScript error. It was a network failure that MapLibre handled, not a page exception. The audit now reports such stackless network messages separately, and the final Firefox run passed 42/42.
- **Additional fix:** a privacy scan before committing found 4 email addresses and 5 phone numbers inside free-text permit purposes. Free-text fields are now redacted ("[courriel masqué]", "[téléphone masqué]"), and the tests scan every snapshot string for contact patterns.

## Known limits and risks

- **Not survey geometry.**
  - The landmark models are approximations from published dimensions and OSM.
  - OSM heights are community-mapped.
  - DataSF LiDAR footprints (2010) are not used yet.
  - The suspender and strut layout is stylised.
- **Permit records are administrative.** A permit is not proof of excavation. Many Folsom records belong to the planned Folsom-Howard Streetscape project. The moratorium dataset lists current moratoria only.
- **Snapshot age.** The snapshot is dated 2026-10-13. It must be refreshed with `node scripts/sf-snapshot.mjs`, and records go stale.
- **Rendering and camera.**
  - The OSM bridge roads still draw flat at water level under the deck, as in the 2D map.
  - MapLibre 5.7.3 can throw `this._onEaseFrame is not a function` when camera commands are issued programmatically while a tab is hidden during the intro spin. This was seen only in parallel automated tabs; user input paths, tab switching and sequential audits were clean.
- **Coverage gaps.**
  - Coverage is headless only, on an old Firefox, with software GL. Safari and iOS are untested; there is no physical phone.
  - The camera smoothness and frame rate on the investor laptop were **not measured**.
- **Traffic.** Traffic remains synthetic and uncalibrated. No coordination metrics, agents or gateway decisions on real data exist yet (Phase 2C).

**Next phase readiness:** technically unblocked. Phase 2C starts only on the founder's explicit request.
