# San Francisco 3D architecture

Verified 2026-10-13 unless marked otherwise. CORE rules apply: free/open tools only, no billing account, no exposed keys, pinned libraries, and GitHub Pages compatibility where practical.

## 1. Options compared

| Option | Coverage and quality | Cost and access (verified) | Licence and terms | Fit |
| --- | --- | --- | --- | --- |
| **MapLibre GL JS** (in use, 6.11.2 since D090; 5.7.3 before) | Global vector globe, terrain, fill-extrusion, custom WebGL layers. No photogrammetry. | Free, no key | BSD-3-Clause | **Primary renderer.** Already integrated and audited in two browsers. |
| **OpenFreeMap** (in use) | OSM-derived planet vector tiles to z14 (overzoomed beyond); weekly planet build (2026-10-11 in use) | Free, keyless, no request limits stated; **no SLA** | Attribution to OpenFreeMap / OpenMapTiles / OSM required; MIT software, ODbL data | **Primary base map.** Self-hostable later if the SLA matters. |
| **OpenStreetMap** (via the tiles above, Overpass for extracts) | SF landmarks mapped with heights: Transamerica `height=260`, `roof:shape=pyramidal`; Salesforce `height=326`; Coit `height=64`, `man_made=tower`; City Hall `building:part`, `height=30`. Golden Gate Bridge mapped as deck ways plus `man_made=bridge` relation 21407754 (`bridge:structure=suspension`). | Free; Overpass requires an identifying User-Agent (a 406 without one was observed) and was intermittently overloaded | ODbL | Geometry source for alignment, not visual detail. |
| **Overture Maps** | Global buildings, transportation and places (GeoParquet releases) | Free downloads | Buildings and transportation are ODbL; Places is mixed CDLA-2.0 / Apache / CC0 | Optional alternative building source. No advantage over DataSF inside SF. |
| **deck.gl** | GPU data layers; Tile3DLayer, SimpleMesh/Scenegraph layers | Free | MIT | **Fallback renderer.** 9.1 (2025-01-21) works with the MapLibre v5 globe; 9.4 (2026-09-05) adds `@deck.gl/maplibre` and Tile3DLayer on GlobeView. |
| **CesiumJS** | Best-in-class 3D Tiles and terrain engine | Free library | Apache-2.0 | Strong engine, but not adopted here. Without Cesium ion it needs self-built terrain and raster imagery (it does not consume our vector tiles). That is a rewrite of the working globe. |
| **Cesium ion / Cesium OSM Buildings** | 350 M+ OSM buildings, quarterly updates | Community plan: "personal and non-commercial use"; companies with >$50K revenue or >$50K raised need a paid plan; exploratory commercial evaluation allowed | Cesium ion ToS; © OSM contributors | **Not adopted.** Investor use is commercial and funding status is unknown. |
| **Google Photorealistic 3D Tiles** | Photogrammetric SF, including a recognizable Golden Gate Bridge (widely published; not rendered here) | **Billing must be enabled** on the Cloud project. Enterprise SKU: 1,000 free events/month, then $6.00 per 1,000 (0–100k). 10,000 root-tileset queries/day; 3-hour sessions. | No caching/prefetch; visualization only (no extraction or derivation); aggregated on-screen attribution; Google data must be identified in hybrid scenes; promotional videos ≤30 s | **Future option only.** It conflicts with the no-billing rule. Needs explicit founder approval, a quota cap and a backend-free key restriction review. |
| **Google Maps 3D (Maps JavaScript API)** | Photorealistic maps product | Same Google Maps Platform billing-account requirement (verified on Get Started) | Google Maps terms | Same status as above. Pricing for the 3D Maps SKU was not checked separately. |
| **Mapbox, ArcGIS, commercial twins** | Not evaluated in detail | Assumed to require accounts and tokens | Proprietary | Excluded by policy; not researched further. |

## 2. Recommendation

**Primary: the existing MapLibre stack, extended.**

- **Renderer, base map and terrain:** MapLibre GL JS 6.11.2 (D090), OpenFreeMap vector tiles and AWS Terrarium terrain.
- **SF data layers:** native MapLibre GeoJSON sources fed from dated snapshots (permits, moratoria, closures, crashes, signals, corridor geometry).
- **Landmarks:** one new pinned dependency, three.js (MIT), used in a MapLibre custom layer. It draws CORE-authored procedural models (section 4). It loads only near San Francisco at zoom ≥ 12.

**Fallback: deck.gl standalone.**

- **Rendering:** GlobeView, an MVT layer on the same OpenFreeMap tiles and SimpleMesh landmarks.
- **Same data and licences:** it stays all-MIT/BSD on the same data. Use it if the three.js custom layer cannot be made stable with MapLibre's globe or terrain.

**Future paid option, not activated: Google Photorealistic 3D Tiles.** Add it through deck.gl Tile3DLayer or CesiumJS, behind a separate founder decision and billing approval. If ever used, CORE overlays must stay visually distinct, and Google attribution must stay unobscured.

**Not recommended:**

- **Rebuilding Google Earth.** Photogrammetric capture and reconstruction are out of scope.
- **Switching to CesiumJS now.** It discards audited work for an engine whose best content (ion) is licence-restricted for CORE.

## 3. Modelling the entire city

| Layer | Source | Treatment | Status |
| --- | --- | --- | --- |
| Streets, water, parks, names | OpenFreeMap (OSM) | Existing CORE style | Verified working (Phase 1) |
| Buildings (all SF) | OpenFreeMap `building` layer, from OSM, whose SF heights came largely from a 2016 import of city LiDAR heights (CC0) | Existing fill-extrusion with an 8 m fallback | The import is documented on the OSM wiki and mailing lists. **Open question:** the current share of SF buildings with OSM heights, measured in 2B. |
| Buildings (corridor, high fidelity) | DataSF Building Footprints `ynuv-fyni`: 177,023 footprints, all with `hgt_median_m`; masses from 2010 Pictometry LiDAR/photogrammetry; ODC-PDDL | Corridor-limited GeoJSON snapshot extruded from `gnd_min_m` + `hgt_median_m`, labelled "LiDAR 2010" | Verified. The data is from 2010; newer towers may be missing or wrong. |
| Terrain | AWS Terrain Tiles (US coverage from USGS 3DEP per upstream attribution) | Existing optional relief | Approximate, not survey grade |
| Landmarks | Procedural models (section 4) | three.js custom layer | To build in 2B |
| Whole-city custom tiles | DataSF footprints → PMTiles (`pmtiles` JS is BSD-3-Clause) | **Deferred.** Static range requests work on Pages, but the file size and the rule against committing generated datasets need a decision. | Open question |

Performance budget for 2B: ≤ 2 MB of new JS (three.js module), ≤ 5 MB of committed corridor snapshots, and 30 fps on the investor laptop at the SF overview. This is to be measured, not assumed.

## 4. Golden Gate Bridge and landmarks

**Finding.** Flat extrusions cannot represent a suspension bridge. OSM carries the Golden Gate deck as `highway` ways with `layer=1` and a `man_made=bridge` relation. Tower and cable geometry in OSM could not be confirmed: Overpass was overloaded during this audit (open question). Recognizable bridges therefore need **dedicated 3D models**.

**Recommended solution: CORE-authored parametric models.** Generate geometry in code from published factual dimensions and place it on the OSM bridge alignment. Code and model stay CORE-owned, so no third-party asset licence is involved.

Golden Gate Bridge, per the Golden Gate Bridge District's design statistics (verified):

| Dimension | Value |
| --- | --- |
| Total length | 2,737 m |
| Main span (tower to tower) | 1,280 m |
| Side spans | 343 m each |
| Tower height above water | 227 m |
| Tower height above roadway | 152 m |
| Clearance above mean higher high water | 67 m |
| Deck width | 27 m |
| Main cables | 0.92 m diameter |

The model is: two portal towers, two catenary main cables, suspenders at a regular stylised interval and the deck. It is labelled "modèle procédural CORE, dimensions publiées, non relevé".

| Landmark | Approach | Data status |
| --- | --- | --- |
| Bay Bridge (west suspension + east SAS) | Same parametric approach | **Open:** official Caltrans / Bay Bridge dimensions to be sourced in 2B |
| Transamerica Pyramid | Procedural pyramid at OSM footprint, 260 m | OSM height and roof shape verified |
| Salesforce Tower | Extrusion with a rounded crown, 326 m | OSM height verified |
| Coit Tower | Cylinder, 64 m | OSM verified |
| City Hall | OSM building parts + procedural dome | Dome height to source |
| Ferry Building | Extrusion + clock tower | Ferry Building found only as named nodes in this query (open); clock tower height to source |

**Third-party models** (Sketchfab, government CAD, museum scans):

- None were downloaded or evaluated asset by asset.
- Each requires a per-asset licence check (commercial use, attribution, derivatives) before any use. Google tiles content must never be traced into models.

## 5. Backend boundary

| Feature | Static Pages | Needs backend or offline tooling |
| --- | --- | --- |
| Globe, SF layers, landmarks, workspace replay | Yes | |
| Dated data snapshots | Yes (committed small GeoJSON + manifest) | Snapshot refresh is an offline Node script; scheduled refresh would need CI |
| Live DataSF queries in the browser | Possible (public, anonymous, throttled) | |
| 511 traffic events, WZDx, GTFS-RT | | Token must not ship to clients, so use an offline snapshot or a backend |
| LLM-backed agent steps | | A backend, or a local/offline run whose trace is committed |
| SUMO simulation | | Offline CLI only |
| Google 3D tiles | | Billing account (excluded) |

## 6. Risks and open questions

- **Risks:**
  - three.js custom-layer behaviour under globe→Mercator transition and terrain. The 2B first task is a spike with a pass/fail check.
  - OpenFreeMap availability with no SLA. Mitigation: a self-hosting path exists, plus an offline snapshot mode for the demo.
  - Investors comparing against photorealistic products. Mitigation: show functional evidence, not imitation.
- **Open questions:**
  - Approve three.js as the single new runtime dependency?
  - Should whole-city PMTiles be hosted, and where?
  - Pursue Google tiles under a capped billing account?
  - Bay Bridge, City Hall dome and Ferry Building tower dimensions.
