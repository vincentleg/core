# CORE V7 — San Francisco rendering benchmark (2026-10-15)

**Setup:**
- **Location:** Folsom Street, between 5th and Falmouth (the recorded sidewalk problem).
- **Browser:** headless Chromium 155 on this Mac (Metal through ANGLE). Rendering is vsync-capped at 60 fps, so 60 fps means "at the cap".
- **Viewport:** 1440×900, cache disabled.
- **Tool:** a dependency-free CDP harness in the session scratchpad; its screenshots are listed in the V7 report.

| | **A. MapLibre + open data (selected)** | **B. CesiumJS without Cesium ion** | **C. Licensed photorealistic 3D tiles** |
|---|---|---|---|
| Data | OpenFreeMap (OSM) vectors, NASA GIBS imagery, USGS relief (high quality), DataSF records | NASA GIBS imagery only. Terrain and OSM Buildings are ion assets, unusable for $0 commercially | Google Photorealistic 3D Tiles |
| Ready (first visit) | 1.0 s (high) / 0.5 s (balanced) | 3.0 s | not run |
| Transfer, planet → city → human | 11.4 MB (high) / 5.8 MB (balanced) | 8.1 MB for planet → city, of which 7.9 MB is the Cesium library and workers | — |
| Frame rate (planet / region / city / human) | 60 / 60 / 60 / 60 | 60 / 60 / 60 / — | — |
| JS heap at street level | ≈ 45–51 MB | ≈ 24 MB (nothing to draw) | — |
| 3D street layer cost | 1.0–1.2 ms per frame (buildings, trees, avatar, agent, shadows) | — | — |
| Realism | Real street geometry and building footprints/heights, procedural façades, real tree positions, sun shadows, relief, atmosphere. **Not photorealistic.** | Blurred imagery at city scale, no buildings, no relief | Photorealistic, if licensed |
| Geographic accuracy | OSM geometry; façades and colours are conventions (labelled in "Ce que vous voyez") | imagery only | high |
| Commercial licensing at $0 | yes (attribution) | yes for the engine; no for ion data | **no: billing account required** |
| Cost at 100k users | static plus self-hosted tiles (to quote) | same, plus a 3D Tiles pipeline to build | usage-billed |

**Decision.** Option A. It is the only option that gives real geography down to street level at $0 with commercial rights.

The 3D street layer is isolated in `src/earth/scene3d.mjs`, a MapLibre custom layer. A licensed 3D Tiles source could be added later without touching the rest of the product.

**Do not call V7's city photorealistic.** It is a real-geometry city with procedural materials.

**Found while benchmarking:**
- MapLibre stops drawing fill-extrusions above zoom 20, which is the human camera range. V7 therefore draws street-scale buildings in three.js at every quality level.
- Relief tiles were the largest item in the transfer (8.3 MB). They are now capped at zoom 12 and only enabled in "Haute" quality.
- The relief override is `world.html?quality=high|balanced|low`. "Équilibrée" is the default on touch and low-memory devices.

**Not measured:**
- real phones and real GPUs: all figures come from this Mac's headless browser;
- Safari itself: Playwright's WebKit 26.6 build was smoke-tested instead (V7 report);
- long-session memory growth.
