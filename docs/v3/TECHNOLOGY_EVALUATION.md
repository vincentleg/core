# CORE V3 — technology evaluation (2026-10-15, timeboxed)

**Method:**
- Repository identity, licence, last push and archived flag come from the GitHub API, which received public repository names only.
- Capabilities come from probes in CORE's own pages, for the tools CORE already uses.
- Everything else comes from each project's public documentation, cited as such and **not re-measured** here.
- Nothing was installed.
- Recommendation scale: ADOPT, ADAPT, EXPERIMENT, DEFER, REJECT.

## Rendering engines

| Candidate | Source · licence · last push | Cost | Fit for CORE | Risks | Recommendation |
|---|---|---|---|---|---|
| MapLibre GL JS 6.11.2 | `maplibre/maplibre-gl-js` · BSD-3-Clause · 2026-10-15 | Free | **Already vendored.** Probed: `distance`/`within` filters work, per-building `feature-state` works, an eye-level camera exists (`calculateCameraOptionsFromCameraLngLatAltRotation`), max pitch up to 100°. The whole prototype runs on it with no new dependency | No real 3D materials or textures on extrusions; no skeletal characters | **ADOPT** (already in place) |
| Three.js | `mrdoob/three.js` · MIT · 2026-10-15 | Free | Rigged glTF avatars, PBR materials, shader dissolve for the reveal band. Can render inside MapLibre as a custom layer | New dependency (several hundred KB minified; size not measured here); custom-layer camera sync is work; WebGL2 only for us | **EXPERIMENT**: next step for 3D avatars and textured near-field buildings, pinned and vendored after review |
| three-geospatial | `takram-design-engineering/three-geospatial` · MIT · 2026-05-27 | Free | Atmosphere and geospatial helpers for Three.js | Smaller project; last push 5 months ago | DEFER |
| CesiumJS | `CesiumGS/cesium` · Apache-2.0 · 2026-10-15 | Library free; Cesium ion streaming (terrain, OSM Buildings) is a hosted service with account plans | True 3D globe, 3D Tiles, terrain | A second engine beside MapLibre; ion needs an account and token (`AGENTS.md`: no key or account) | DEFER (revisit if 3D Tiles become central) |
| 3DTilesRendererJS | `NASA-AMMOS/3DTilesRendererJS` · Apache-2.0 · 2026-10-08 | Free | Streams OGC 3D Tiles into Three.js | Needs a 3D Tiles source with a usable licence | EXPERIMENT with Three.js, if a licensed tileset exists |
| deck.gl | `visgl/deck.gl` · MIT · 2026-10-15 | Free | Data-visualization layers over MapLibre | Overlaps what CORE already draws | DEFER |
| WebGPU | W3C spec (`gpuweb/gpuweb`) | Free | Future performance | Uneven browser support; MapLibre is WebGL2 | DEFER |

## Data

| Candidate | Licence (per provider documentation) | Fit | Risks | Recommendation |
|---|---|---|---|---|
| OpenStreetMap via OpenFreeMap | ODbL 1.0 (data); OpenFreeMap: free hosting with no SLA | Already used; footprints, heights, roads | Heights and coverage vary; no SLA | **ADOPT** (in use), with attribution |
| Overture Maps (buildings, places, transportation) | Mixed by theme (CDLA-Permissive-2.0 and ODbL for OSM-derived parts), **to be verified per theme before use** | Richer building attributes at global scale | Large GeoParquet downloads; needs a tiling pipeline and licence review per theme (FD09) | EXPERIMENT after FD09 review |
| PMTiles (self-hosted tiles) | `protomaps/PMTiles` (BSD-3-Clause per project) | Lets CORE host its own tiles on static hosting and remove the third-party dependency | Storage/bandwidth cost at scale | EXPERIMENT (reduces OpenFreeMap risk) |
| Public elevation (Terrarium tiles already in `index.html`) | Mapzen/AWS Open Data attribution | Terrain for World | Extra requests | ADAPT later (terrain-following avatar) |
| Google Photorealistic 3D Tiles / Maps | Google Maps Platform terms (key, billing, display restrictions) | Photorealism | Paid, key required, restrictive terms; scraping forbidden | **REJECT** (AGENTS.md, FD09) |
| Licensed photogrammetry (municipal or commercial) | Contract-specific | True realism for a pilot city | Cost and licence; needs founder approval | DEFER until a licensed source and budget exist |

## Avatars

| Candidate | Source · licence | Fit | Recommendation |
|---|---|---|---|
| Inline SVG presets (implemented) | CORE code | Zero dependency, accessible, fast; 2D billboard | **ADOPT for the prototype** |
| VRM avatars via `pixiv/three-vrm` | MIT · 2026-10-02 | Open avatar format, expressions and rigging in Three.js | EXPERIMENT with Three.js |
| Third-party avatar services and asset stores | Service terms vary; some require accounts, and their availability changes | — | DEFER: no external account or asset licence without review |

## Decision
- The prototype stays on MapLibre alone, with **no new dependency**.
- The next measurable experiment is a pinned, vendored Three.js custom layer that renders one glTF/VRM avatar and textured buildings within the radius, benchmarked against the current SVG/feature-state approach on the same route.
