# Architectural decisions

## D001 — Preserve the static prototype (Phase 0)

Keep the two HTML entry points and dependency-free Node assembly. The current scope does not justify a framework, package manager manifest, server or database. This keeps setup and hosting simple; browser main-thread computation and lack of persistence remain limitations.

## D002 — Preserve deterministic engine behavior

Seeded scenarios, simulation and gateway remain unchanged. Phase 0 adds tests around valid internal inputs without implying scientific validation. Production permit validation needs a separately authorized engine change and negative tests.

## D003 — Human authority is outside the demo

A ready proposal is never an approved instruction. The application exports JSON and has no infrastructure connection or signing implementation. Future workflows must model authorization and evidence expiry explicitly.

## D004 — Commit the generated corridor

Keep `corridor.html` in Git so the site can be served without a build service. Edit template/app/engine sources and regenerate. A test detects source/artifact drift. Avoid generated datasets, caches and browser captures in Git.

## D005 — Preserve GitHub history and visibility

The existing target `vincentleg/core` was public and empty at audit start. Keep it public, configure origin and push main without force, retaining all three original commits. Do not create a second repository, change visibility, activate billing or configure Pages as a side effect.

## D006 — Test with built-in Node tools

Use `node:test` and strict assertions; no new dependency is needed. Short tests cover reproducibility, orchestration and decision states. Browser rendering requires separate checks; Node tests do not certify visual or scientific correctness.

## D007 — Separate current state from historical vision

ROADMAP.md restarts numbering at the requested Foundation Phase 0. HANDOFF.md remains historical context, with a notice directing readers to current state and audit evidence. Existing UI phase labels are historical prototype labels.

## D008 — Minimal browser repairs

Chrome revealed missing HTML doctype, UTF-8 and viewport declarations, plus CSS overriding hidden panels. Add the document envelope, zero body margin and an explicit hidden rule in the source template, then rebuild. Correct the globe introduction to describe the separate synthetic simulation. Do not refactor renderers or engine logic.

## D009 — Provider and licensing gaps stay explicit

No paid service or dependency is introduced. Existing Esri imagery does not satisfy an open-data-only policy and requires replacement/removal in Phase 1. Nominatim usage controls and source provenance are also Phase 1 acceptance items. No license for CORE is invented on behalf of the owner.

## D010 — Pin MapLibre GL JS 5.7.3 to fix the terrain crash

Chrome terrain/navigation crashed inside MapLibre 5.6.0 (`_updateRetainedTiles` indexing four children when `children()` returns one overscaled tile; also `_getOverscaledTileIDFromLngLatZoom` when enabling terrain at globe zoom, after which the render task queue stayed wedged). Upstream fixed these in 5.7.0 (#6011) and 5.7.2 (#6388); 5.7.3 adds a related tile-retention fix. A 12-step reproduction produced 12 uncaught errors on 5.6.0 and none on 5.7.3. The patch release within 5.x was chosen over the latest version to limit behavioral change; JS and CSS stay pinned to the same version on unpkg. 5.7.x also fires `load` after a TileJSON failure, so the globe no longer lets its usage hint overwrite a source-failure warning.

## D011 — Audit Firefox through WebDriver BiDi

Firefox 122 exposes only WebDriver BiDi on its remote port in a fresh profile, which explains the earlier CDP timeouts. `scripts/browser-audit.mjs` keeps the same steps behind a small CDP/BiDi adapter using Node's built-in WebSocket; no Selenium, Playwright or other dependency was added. BiDi viewport changes set size only (no mobile/touch emulation). Audits open a fresh tab or session so errors buffered by earlier pages cannot leak into results.

## D012 — Bind permit evidence to the plan by deterministic replay

The Phase 1 contract validator accepted evidence whose plan had been swapped or whose numbers were fabricated but self-consistent. Because the engine is deterministic, `issuePermit` now re-runs the six-case stress test (about 15 ms) for the submitted plan and dependencies and blocks unless every baseline and plan delay matches. Equations, seeds and decision thresholds are unchanged; the threshold rule is exposed as the pure `permitState` for direct tests. This is integrity against the in-repository engine, not authentication of people, data provenance or signatures.

## D013 — San Francisco pilot starts with works coordination, not congestion

Phase 2A found observed, public-domain DataSF records of excavation permits, paving moratoria, closures and injury crashes, but no public current counts, measured arterial speeds or signal timing for Folsom. The first SF demonstration therefore analyses coordination of street works on Folsom (2nd–11th) with Howard as the prospective case, using deterministic metrics on dated snapshots. Traffic simulation of real streets stays synthetic and labelled until counts and timing are obtained. MapLibre/OpenFreeMap remain the renderer; Google Photorealistic 3D Tiles and Cesium ion are not activated because of billing and commercial-use terms. See docs/PHASE_2A_TECHNICAL_AUDIT.md.

## D014 — Native procedural landmarks instead of three.js

The Golden Gate Bridge, Salesforce Tower and Transamerica Pyramid are generated as GeoJSON fill-extrusions (`src/sf-world.js`) from published dimensions and OSM positions. This works with the globe, terrain and existing audits, adds no dependency, and keeps geometry testable in Node, so the three.js spike was unnecessary. Thin parts need `tolerance: 0` on the GeoJSON source; with 3D relief, bridge parts are offset by the terrain value (Bay bathymetry) at their centroid. Models are labelled approximate.

## D015 — Hide replaced OSM parts by zone, not by id

OpenMapTiles feature ids do not follow one OSM-id encoding (Golden Gate parts ×10+0, Transamerica parts ×10+2), so hard-coded ids missed buildings. Replaced OSM parts are detected at runtime from loaded tiles inside per-landmark zones with height criteria that keep unrelated buildings (e.g. Fort Point, Ferry Building), and filtered out of the building layer.

## D016 — Commit small, normalized public-domain snapshots

Folsom/Howard DataSF records are committed as normalized GeoJSON (~430 KB) with a manifest of URLs, timestamps and SHA-256 checksums, so the static site works offline from APIs and evidence is reproducible. Raw responses are not stored. Personal contact columns are removed, emails and phone numbers embedded in free text are redacted, and permit holders are kept only when clearly organisations. Missing geometry is dropped and counted, never inferred.

## D017 — Tile failures do not overwrite status feedback

Transient tile fetch failures during fast flights previously replaced the status message with a source warning. Tile-level errors now set a separate "tuiles partielles" indicator that clears when the map settles; source-level failures (TileJSON, style) still warn in the main message. Hillshade loads from zoom 10 by default so terrain is visible in cities without global tile traffic.

## D018 — Deterministic agents first, LLM-ready contracts

The six Phase 2C roles are rule-based generators in `src/coord.js`; nothing is labelled or presented as a language model. Each yields real execution events and exchanges plain JSON (findings, evidence bundles, scenario windows/metrics, adversarial results, proposals). A future model may propose findings or parameters, but the coordination gateway only accepts proposals that equal its deterministic recomputation from the verified snapshot.

## D019 — Recommendation rule: dominance for reschedules, review otherwise

A reschedule is recommended only if strictly better on the declared priority order (closure conflicts, moratorium starts, sequencing, distinct occupation windows, occupied days) and worse on none; overlap between organisations is reported but neutral because trench sharing and crew separation conflict. Otherwise, verified overlaps between at least two organisations within 60 days yield a coordination-review recommendation with the scenario comparison attached. Programme permits (> 90 days) are excluded from occupation metrics, an assumption tested by perturbation A7. On the 2026-10-13 snapshot no reschedule dominates; two reviews are ready and one is suspended.

## D020 — Real execution, paced display, labelled replay

The workspace advances the generator one event at a time; pacing only delays display, pause stops execution, and replay re-renders the recorded trace labelled "REJEU" and is verified by re-execution (identical trace fingerprint). Browser and Node runs on the same snapshot must produce the same result fingerprint (audited).

## D021 — Registry-driven multidomain data, bounded and honest

Domains and datasets are declared in `src/domains.js` with an explicit status (working, partial, candidate, unavailable) and per-dataset schema, normalizer and dedupe key. Adapters query only the corridor (CNN lists, bounding box, recency) and filter by frontage distance; failures keep the previous snapshot. DBI `issued` status is not treated as active construction without recency (540 of 669 corridor permits are over 3 years old without completion).

## D022 — Local knowledge graph with explained bases

A lightweight in-memory graph (no graph database) links entities with typed relationships whose basis is observed, derived, rule or hypothesis and whose reason is mandatory. `AFFECTS` is hypothesis-only; contradictions are explicit (`CONTRADICTED_BY`). The graph is rebuilt deterministically from the verified snapshot.

## D023 — Recommend investigation when intervention evidence is missing

The cross-domain synthesis recommends the coordinated intervention only when its essential evidence is complete; otherwise it recommends defer-and-investigate. The gateway requires interventions to survive every perturbation and investigations a majority, disclosing sensitivities. Proximity is reported as an indicator; no damage, energy, emission, cost or traffic effect is modelled.

## D024 — Contradicting evidence lowers rank

Trees under a public removal notice do not count towards ranking a cross-domain finding; the brief lists them as contradictions. This changed the discovery from Howard 8th–9th to Howard 10th–11th.

## D025 — Agents are identities over executable tools, not simulated scale

The registry holds 60 profiles: 16 are executable deterministic tools, 29 coordinate, 15 are unavailable with a stated data or tool gap. Roles are competency labels with an explicit no-credential disclaimer. Permissions are fixed per profile and checked before every tool call; profiles are frozen. Scale is supported by indexes and lazy activation (only recruited agents run, 3 at a time), not by generating inert records.

## D026 — Missions recompute; managers coordinate without factual authority

A mission's conclusion only aggregates specialist findings with citations. The mission gateway hashes the submitted content, recomputes the mission from its origin, verifies every evidence reference and rejects unvalidated model claims; corridor missions defer to `issueCityDecision`. Nothing is authorized or executed.

## D027 — Official sources only; honest scheduling

City Intelligence uses official public feeds and APIs (DataSF, USGS, NWS, Legistar, agency RSS) with per-source rate limits. Stale sources (Legistar API, SFPUC RSS) are shown as stale. Refresh runs only while the Node watch process or the browser app is running; no background scheduler is claimed. Civic items are metadata, classified by official status, never ranked; they never auto-trigger missions.

## D028 — Local model optional, never authoritative

`src/llm.js` defines local providers (Ollama, OpenAI-compatible) and a validator: every model sentence must cite findings and add no unsourced number. No runtime is installed on the founder's Mac, so no model runs; installing one requires the founder's approval.

## D029 — Professional shell around a Tron-style map

The application chrome uses neutral surfaces and IBM Plex typography with seven functional sections; the CORE/Tron visual language stays inside the 3D map. Camera controls add orbit, keyboard, reset and help; MapLibre remains target-centred (no roll or 6-DoF free flight).
