# Phase 6 — World 2.0, visible intelligence, investor-grade experience: report

Status: **COMPLETE on 2026-10-14**, with the limitations in §F. Baseline `03202c2`. Phase 7 has **not** started.

## 0. Audit and baseline (verified, not assumed)

| Phase 5 claim | Verified on `03202c2` |
| --- | --- |
| 83 Node tests | 83/83 |
| 68 profiles: 17 rule-based executable, 7 model-assisted | Exact (`ORG.counts`); 29 coordination-only, 15 unavailable |
| 101 Chrome checks | 101/101 at the start of the phase |
| Scheduled refresh | **Still not observed**: only 4 manual `workflow_dispatch` runs exist; no `schedule` run after the 03:17 UTC slot as of 04:16 UTC. The workflow is active |
| Public site | Serving `03202c2` |

**Reproduced issues** (screenshots `scripts/ui-shots.mjs`, kept in ignored `test-results/phase6/`):

| Finding | Reproduced? |
| --- | --- |
| A: four panels covering most of the city view | Yes |
| B: uniform blue buildings | Yes |
| C: small, dark globe | Yes |
| D: agent activity unreadable | Yes |
| E: simulation shown only as coloured lines | Yes |
| F: 9-step text-heavy guide | Yes, plus a separate 8-step list |
| G: "N enregistrements à cet endroit" | Yes. It counted every record whose symbol touched a ±6 px box, which is hundreds of metres at low zoom and the whole length of a segment line |
| G: "sommes SHA-256 vérifiées" read as accuracy | Yes |
| G: ambiguous permit dates | Yes |
| G: camera toolbar clipped by the layers panel ("Vu…") | Yes |
| G: public site shows recorded, not live, missions | Correct behaviour, now explained everywhere |

**Bugs found during the work and fixed:**
1. Programmatic camera moves made during the intro globe spin were overridden by the spin (centre moved −6°). This is pre-existing, and could put the city in the ocean.
2. My first padding animation cancelled camera flights.
3. Asynchronous re-renders overwrote the dossier, and redrew the simulation overlay after the user had left the view.
4. The Missions tab state leaked from the demo into rule-based missions.

## A. Product changes

- **World:**
  - the globe fills the first screen (viewport-based size);
  - atmosphere through the MapLibre 5 `sky`;
  - distinct land and water palette; quieter mixed-case labels;
  - a **coverage layer**: San Francisco "Pilote opérationnel"; Paris and Tokyo "Navigation seulement". Nothing else is claimed;
  - the synthetic-corridor marker is hidden at planetary zoom.
- **City:**
  - height-ramped building materials with vertical gradient and directional light;
  - park tint; minor roads dimmed, major roads emphasised;
  - building provenance unchanged (OSM; 8 m default height, labelled).
- **Markers:**
  - every record layer appears from a readable zoom: excavations 14, permits, closures and energy 14.5, moratoria and removals 15, trees 15.5, intersections 16;
  - smaller symbols; hover cursor;
  - a **per-segment record-density layer** below zoom 14.5;
  - a legend with each layer's visibility zoom.

  No record is removed; all stay clickable at street zoom and in the records panel.
- **Interface:**
  - a compact left dock (statement, search, cities, pilot, demo) with optional details, collapsed by default;
  - layers and legend as a popover; one right inspector at a time (`--insp-w`);
  - the camera keeps its focus clear of the inspector (padding), and the camera toolbar sits at the bottom centre;
  - the attribution collapses after load; status line, focus rings, wrapping badges;
  - mobile: one bottom sheet at a time, centred toolbar, demo card in place of panels.
- **Agents:**
  - explainer "Comment fonctionnent les agents CORE";
  - status filter (all / model-assisted / rule-based / unavailable) on the hierarchy;
  - profiles add authorized data sources (through tools) and **recorded contributions**: tool calls, evidence produced, accepted statements, rejected outputs with reasons, disputes made and received, collaborators.
- **Missions:**
  - tabs first; the active mission first;
  - **recorded execution graph** (`src/mission-graph.js`): agents × recorded time, with tool calls, model calls, accepted and rejected statements, routing and disputes, all taken from the mission log;
  - replay of the recorded timeline, labelled "relecture… aucun appel au modèle".
- **Simulations:**
  - the sidewalk / tree / roadworks model is drawn on the map **per block**: a band scaled by plantable positions, a "+N" label, amber dashes for deferral, the permit points that cause it, red where the path is insufficient. Counts per block, never invented tree coordinates;
  - comparison mode maps the difference against A0–A3 (green more, red fewer);
  - record markers are hidden while a scenario is shown and restored afterwards;
  - "Scénario hypothétique — modèle exploratoire non calibré" badge.
- **Demo 2.0** (`src/demo.js`, replaces both guides):
  - 9 steps: world, city, problem, agents, discovery, evidence, alternatives, challenge, decision;
  - each step has a camera move, **one takeaway computed from the loaded data**, optional details, previous / next / exit, arrow keys and Escape;
  - the closing step states what is real, simulated, recorded and unavailable.
- **Data trust:**
  - SHA-256 is now "intégrité des fichiers vérifiée … ne prouve pas l'exactitude de la source" ("fichier intact");
  - permit dates read "Approuvé le (date administrative)", "Début / Fin prévu(e) (permis)";
  - feed items show "publié par la source", "période prévue", "collecté par CORE";
  - every timestamp carries UTC; the nav bar says "Registres collectés … · veille collectée …";
  - the click inspector states the true query scope, for example "± 6 px ≈ 32 m à ce zoom ; un tronçon couvre tout son linéaire";
  - City Intelligence says whether the last refresh was manual or scheduled;
  - the data policy adds commercial use, attribution, retention and scope for every source.

## B. Technical architecture

**No new dependency or engine.** MapLibre GL 5.7.3 is kept; a Cesium or Three.js switch was not justified, because the globe, sky, extrusions and lighting were achievable in the existing stack.

**New modules** (plain scripts, no build step), about 33 KB:

| Module | Role |
| --- | --- |
| `src/map-style.js` | Coverage layer, density tuning, legend, layout padding |
| `src/mission-graph.js` | Recorded execution graph and replay |
| `src/demo.js` | Demo 2.0 |

**Data flow is unchanged:** snapshots, feeds, missions and simulation are as in Phase 5. The simulation overlay is derived from `CORE_SIM_SIDEWALK.run` in the browser.

**Trade-off:** density control relies on zoom thresholds and per-segment aggregation, not on clustering every source. Clustering would have required rewriting the record sources and their filters, at the risk of breaking the audited inspector.

## C. Verification

| Check | Result |
| --- | --- |
| `node --test test/*.test.js` (mock model for model-assisted logic) | **87/87**: 83 earlier plus 4 Phase 6 (graph from recorded events only, honest coverage, demo integrity, layout and camera guards) |
| `scripts/browser-audit.mjs`, Chrome 155 headless, local | **117/117**: 103 earlier checks, adapted where the UI intentionally changed, plus **14 Phase 6 checks** |
| Error-path audit (`browser-negative-audit.mjs`) | **12/12** |
| Firefox 122 | Not run: headless startup hangs (no BiDi listener after 30 s), as in Phases 4–5 |
| Safari 27 | Not run: `safaridriver` requires enabling remote automation, a machine-wide setting that was not changed |
| Responsive | Screenshots at 1440×900 and 390×844 reviewed: one sheet at a time on mobile, no horizontal page overflow; the nav scrolls horizontally |
| Production | See §H |

The 14 Phase 6 checks cover:
- only San Francisco operational;
- zoom thresholds and the density layer;
- the legend;
- the per-block simulation with its badge;
- markers hidden during the simulation and restored after;
- per-block differences in comparison mode;
- inspector padding;
- the agent filter;
- profile contributions;
- the graph built only from recorded events;
- the labelled replay;
- demo navigation;
- dates and scope labels.

## D. Performance

**Method:** `scripts/perf-audit.mjs` (Chrome 155 headless, software rendering, 1440×900, cache disabled). Results are in [PHASE_6_MEASUREMENTS.json](PHASE_6_MEASUREMENTS.json).

| Metric | Before | After |
| --- | --- | --- |
| Rendered circle markers, corridor overview (zoom 14) | **682** (Phase 5 production) | **48** (−93 %) |
| Rendered circle markers at street zoom (15.6) | 557 | 511 (records intentionally visible) |
| Orbit frame rate at the corridor | 41.7 fps | 60 fps (display cap) |
| Time to platform ready (local) | 564 ms | 771–793 ms |
| Transferred on first load (local) | 2,734 KB / 60 requests | 2,785 KB / 63 requests |
| JS heap after GC | 21 MB | 21 MB |
| Sidewalk simulation recompute | 2.3 ms | 2.3 ms |

- **Why ready time rose (+0.2 s):** three more scripts and the coverage layer. That is acceptable but measured.
- **Frame rate:** headless software rendering, comparable between runs only.

## E. Security and cost

- **Integrity:** the scan (`scripts/integrity-check.mjs --all` and hooks on commit and push) reports 0 findings. No secret or endpoint is in the client. The public site never contacts a model (public mode, verified).
- **Data:** no new source, no new data. Open-Meteo stays quarantined. Every source now records commercial use, attribution, retention and scope.
- **Hosting:** GitHub Pages, unchanged and free for public repositories, with no metered billing. Its terms forbid commercial SaaS and online-business hosting, so it suits this prototype showcase, not a commercial launch.
- **Cost:** no paid service, plan, tile, geocoder or API. Map tiles are OpenFreeMap (OSM, free); terrain is AWS Terrain Tiles (open). **$0.**

## F. Limitations (honest)

- **Scheduled refresh unproven:** no `schedule` run of `city-feed.yml` has been observed since its creation, despite an active workflow and valid cron. Only manual runs are proven, so continuous refresh is **not** claimed.
- **Recorded, not live, model use:** model-assisted missions on the public site are recorded real runs. Live runs need local Ollama.
- **Simulation:** uncalibrated. Two assumptions (spacing, usable frontage) dominate; the sidewalk widths date from 2014.
- **Data and map coverage:** no satellite imagery (rights unverified), no building materials data (styling is presentational), no shadows (MapLibre has none for extrusions).
- **Browsers and accessibility:** Firefox and Safari not verified; no formal accessibility audit (keyboard focus, labels and reduced motion were handled, but there was no screen-reader test).
- **Clustering:** applied to building permits only. Other layers use zoom thresholds and segment density.
- **Old code kept:** the earlier `city-view` guide code remains in the source, unreachable from the interface.

## G. Phase 7 recommendations

1. **Make refresh observable and reliable:** diagnose the missing cron runs (possibly re-create the schedule, or add a free heartbeat), and show refresh health in the UI.
2. **Reach a second browser:** fix Firefox automation on another machine; manual Safari pass.
3. **Field-calibrated simulation:** obtain current sidewalk, curb, driveway and utility-clearance data (authorized sources) to move `sidewalk-tree-capacity` from exploratory to validated for one district.
4. **Agent depth:** live fast-mode tests in CI-local runs, independent adversarial semantic sets, and per-agent evaluation dashboards.
5. **Commercial-grade hosting plan:** select an eligible hosting option before any commercial use; GitHub Pages remains for the public showcase.

## H. Deployment

- **Repository:** https://github.com/vincentleg/core (branch `main`)
- **Public site:** https://vincentleg.github.io/core/
- **Commit and production verification:** recorded in the commit that publishes this report; see the final project state.
