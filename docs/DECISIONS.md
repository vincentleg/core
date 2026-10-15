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

## D030 — Local open-weight model, approved by the founder

Ollama v0.40.3 (MIT) is installed as a user-local binary; its SHA-256 matched the published digest and it carries Ollama's Apple signature. It listens on 127.0.0.1 only. The model is qwen3:8b (Apache-2.0, Q4_K_M, 5.2 GB), downloaded with the founder's explicit approval on 2026-10-13. The adapter refuses any non-loopback endpoint, so no paid API can be reached.

## D031 — Model-assisted agents: the model chooses and words; code computes and decides

Five specialists (urban planning, environment, energy and infrastructure, scenarios, independent evidence review) let the model choose permitted tools and write structured interpretations.
- **What code does:** every number and every evidence item comes from deterministic tools. Statements must cite evidence ids, must not introduce numbers absent from the cited evidence, and must not use decision language.
- **What the gateway does:** it recomputes every tool call and re-validates every model output. Model content can only add caution, never remove it.
- **Reasoning traces:** Qwen3 thinking is disabled; only action summaries are stored.

## D032 — Learning is proposed, evaluated and approved by a human

The cycle is: gap, authorized source (DataSF metadata API), validation, proposal, before/after evaluation on a staged copy, human approval, promotion with version history, then rollback if needed. Agents cannot approve changes, edit safety-policy documents, or change their own permissions or tools. Freshness-only refreshes with identical content are the only changes that can be promoted without a human, and even those keep a version history. The four Phase 4 proposals were approved by the founder.

## D033 — Browser-independent refresh on GitHub Actions

A free GitHub Actions cron (every 3 hours) collects the sources, re-records the deterministic missions when content changed, runs the tests and the integrity gate, and commits data only. GitHub does not guarantee cron timing and disables scheduled workflows after 60 days without repository activity. No model runs in CI.

## D034 — Security gate blocks commit and push

`scripts/integrity-check.mjs` runs from repository-local hooks (pre-commit; pre-push together with the tests) and has no bypass. False positives get exact, reasoned exceptions in `.integrity-allowlist.json`. This fixes the Phase 3 process error, where a scan reported matches and the commit still ran in the same chained command.

## D035 — Fast mode by default; deep mode preserved

Model-assisted missions route tools deterministically and put the shared context first, so the local runtime reuses the prompt prefix. The same validator and gateway apply as in deep mode. Measured: 1,004 s → 342–371 s, and 23 → 9 calls, on the same event.

## D036 — Typed evidence and deterministic semantic checks

Tool findings carry typed quantities (value, unit, quantity, meaning, scope, nature, date). Statements are rejected for wrong meaning, unit, scope, modelled-as-measured, stale-as-current, unknown places or unhedged causality. Only these classes are claimed.

## D037 — Specializations ≠ profiles; routing with a relevance floor

There are 32 specializations, each executable only through a real runtime; the rest state their gap. A mission team has at most 3 model-assisted specialists, each scoring at least half the best match, plus mandatory reviewers.

## D038 — Exploratory simulation of sidewalk accessibility × tree capacity

`sidewalk-tree-capacity-v1` computes geometric capacity under declared, bounded assumptions. It computes no benefits, is uncalibrated, and is labelled exploratory.

## D039 — Enforced data-eligibility policy; Open-Meteo quarantined

Every source has rights, sensitivity and allowed-use fields. Ineligible sources are neither collected nor accepted as evidence. Open-Meteo's free API is non-commercial only, and paid plans are excluded, so the source is quarantined.

## D040 — Public deployment on GitHub Pages

The site deploys from `main` at the repository root with `.nojekyll`. It is free for public repositories with no metered billing; it suits a project or prototype site and not a commercial SaaS. The public site never contacts a model endpoint and shows recorded real runs.

## D041 — Improve MapLibre rather than switch engines

Globe atmosphere (`sky`), lighting, extrusion gradients, the coverage layer and zoom-dependent density were achievable in MapLibre 5.7.3. Cesium or Three.js would add weight and migration risk without a demonstrated need.

## D042 — Density by zoom thresholds and per-segment aggregation

Each record layer has a visibility zoom. Below it, a per-segment density layer summarises the records. Every record remains clickable at street zoom and listed in the records panel. Measured: 682 → 48 circles at the corridor overview.

## D043 — World-first layout

A compact dock, a layers popover, one right inspector at a time, camera padding that respects the inspector, and the toolbar at the bottom. Camera fixes: padding changes never interrupt flights, and the intro spin stops on any non-spin move.

## D044 — Agent activity shown only from recorded events

The execution graph and the agent contributions are derived from mission logs. The replay re-plays recorded timestamps and is labelled as a replay; no live animation is simulated on the public site.

## D045 — Simulation on the map as per-block aggregates

The model computes counts per block, so the map shows bands and "+N" labels per block, never invented tree coordinates. Comparison maps per-block differences between scenarios.

## D046 — One investor demo, data-driven

Nine steps, each with a camera move and one takeaway computed from the loaded data. It replaces the two earlier guides.

## D047 — Natural Earth only as an opening view

The landing uses NASA Blue Marble (GIBS, open data, acknowledged) up to zoom 8. ENTER CORE fades it into the CORE style. City views keep the existing open map data; satellite imagery stays disabled.

## D048 — Five navigation groups, no removed views

The groups are Monde, Civilisation, Intelligence, Missions and Preuves. Earlier sections become sub-tabs and stay reachable programmatically, so audits and links keep working.

## D049 — Avatars only from recorded events

An avatar state must come from a recorded log event, or the avatar is labelled waiting or illustrative. Movement represents where the data a tool used is located; it is never presented as a physical inspection.

## D050 — Messages are derived, never generated

Structured messages are computed from recorded board reports, responses, requests and the gateway decision. No text is written for display.

## D051 — Session scheduler, human approval, hash-chained audit

The scheduler never runs on a timer. Approval and reset need a `human:` reviewer. The audit log is SHA-256 hash-chained.

## D052 — Meta CSP with SRI on GitHub Pages

A CSP meta tag is generated by script, with the inline script hashed and the quarantined source excluded. MapLibre carries SRI. Header-only protections are out of reach on GitHub Pages and recorded as a limitation.

## D053 — The whole registered population is visible, with honest statuses

All 68 profiles are shown in 13 virtual working zones. A status of executing or queued only comes from a live source (session or local supervisor). Every other avatar is labelled by its real capability and recorded history.

## D054 — Three motion sources, always labelled

Motion is illustrative (seeded walks on mapped OSM pedestrian ways, ×4 speed), replay (driven by recorded logs) or live (from the local supervisor only). Illustrative motion never produces events, findings or messages.

## D055 — WebGL for crowds, DOM only up close

Zone aggregates are drawn below zoom 13.5, WebGL figures up to 15.8, then articulated DOM avatars only in view, capped at 40 (20 on low-end devices). This replaces the Phase 7 DOM-only approach (17 fps with 24 avatars).

## D056 — OSM pedestrian network as an ODbL snapshot

A single bounded Overpass query keeps only pedestrian geometry and drops indoor, building-passage and private ways. The result is published as a derived ODbL database with attribution; accessibility is not asserted.

## D057 — Local supervisor: single writer, deterministic, human-gated

The supervisor uses a persistent hash-chained queue, has no network, shell or model access by default, uses a lock file and an emergency STOP file, and lets only humans complete or resume. Operations are published only by a human commit.

## D058 — Fonts self-hosted; MapLibre stays on CDN with SRI pending the founder's decision

Self-hosting the fonts removes Google requests (privacy). Vendoring MapLibre would contradict the repository rule against committing dependencies, so it is left to the founder.

## D059 — Functional hierarchy for missions

Missions follow a hierarchy: the CORE executive sets priority, the city coordinator assigns ownership, and a department lead plans, delegates and consolidates the work. Cross-department work goes through the other department's lead. A data verifier challenges sources and an adversarial reviewer rejects unsupported claims. The gateway proposes a decision; only a human decides.

## D060 — Local SQLite memory in four layers

Memory has four layers: identity, knowledge, episodes and institutional. Promotion requires review by an agent other than the author. World findings are approved only by a human. Events are hash-chained. The database stays local (`.core-local/`); only an export is published.

## D061 — Learning from deterministic records only

Leads learn procedures from recorded failures. Model interpreters receive approved lessons that quote validator rejections. Learning never changes permissions, policies, code or model weights.

## D062 — Movement needs a reason

Agents stay at their posts unless a recorded replay or live local work gives them a reason to move. Routes run on the OSM pedestrian network after removing edges that cross building footprints. Occlusion is computed from building prisms.

## D063 — MapLibre vendored as a single verified bundle

MapLibre is now vendored, replacing the CDN decision of D058 at the founder's Phase 9 request. A single pinned browser bundle carries SRI and its licence in `assets/vendor/`. Dependency directories remain forbidden.

## D064 — Hourly retry with a freshness gate

GitHub cron is best-effort, so an hourly retry was added. Scheduled runs only collect when the data is at least 150 minutes old. Commit messages state the real trigger.

## D065 — Local control centre

The control centre binds to the loopback interface only and uses a token. It refuses foreign Host and Origin headers and accepts only allowlisted actions. Human decisions require `human:<name>`. The public `control.html` page is inert.

## D066 — New York as the second operational city

New York is the second operational city, with three Manhattan NTAs as its study area. NYC Open Data is keyless and geolocated, and its law places no restriction on use (attribution of source, version and modifications). The codified text has not been re-read directly, so commercial use waits for that confirmation.

## D067 — Declarative city configuration

Every subsystem reads the city from `src/cities.js`. San Francisco ids, codes, wording and recordings are kept unchanged. Other cities' mission ids carry the snapshot time.

## D068 — No decorative agents

A city receives only the profiles its integrated data can exercise; New York has 12. Global roles exist only where cross-city work executes: one domain director and one methodology reviewer.

## D069 — Comparability review before comparison

Cross-city work declares, metric by metric, what is comparable, what is comparable with reservations and what is not. This happens before any figure is shown side by side, and no city ranking is produced.

## D070 — Exploratory decision index

Interventions are compared on an uncalibrated exposure index: crash rate × works-days. The analysis includes sensitivity and evidence grades. No cost or benefit is computed until cost data is integrated. Modelled outputs must say so, or the reviewer rejects them.

## D071 — Snapshot-diff discovery and a persistent queue

Discovery compares a fresh local snapshot with the published one; row order is ignored. Signals are hypotheses for triage, not findings. The queue lives in SQLite and survives a crash. Publishing a new snapshot remains a human commit, and the control centre never spawns a process.

## D072 — Supersession and conflicts in memory

A newer snapshot supersedes older findings of the same problem. Old entries are kept and linked to their successor, and changed numbers are logged as conflicts. Reuse only takes entries that are verified, reviewed or approved and not superseded.

## D073 — Limited-access roadways are excluded from the crash join

In New York, collisions recorded on the FDR Drive, bridges, tunnels or expressways are not attributed to surface pedestrian corridors, even within 20 m. The exclusions are counted in the manifest.


## D074 — Consolidation preserves commitments without retroactive ratification

The current founder mandate authorizes consolidation only. MASTER_ROADMAP maps original O, rebased F and delivered L numbering; FOUNDER_COMMITMENTS records provenance and unknown approvals. GOVERNANCE_DRAFT remains unratified. No Phase 12 or external intervention is authorized.

## D075 — Shared integrity and explicit historical/current snapshot modes

The Node runtime now checks raw source hashes, metadata and filesystem boundaries through scripts/lib/snapshot.mjs. Historical replay remains supported and labelled; --current-data rejects stale/unclassified source collection dates against existing city budgets. Collection freshness does not certify observation recency or causal validity.

## D076 — Fresh read-only CI and exact-runtime local verification reuse

core-verify covers push and PR with pinned existing actions and no write permission. Per-commit added-line security checks remain; Markdown-only changes avoid application tests. Runtime/data changes need full validation or a matching local proof no older than 24 h, bound to code/data/tests/config, Node and platform. CI does not trust that local cache. This supersedes the blanket full-suite pre-push behavior described in D034; no server protection is silently enabled.

## D077 — Hash-based CSP on the synthetic corridor

A shared build assembler emits hashes for the two existing inline scripts, denies network connections and preserves the rendered interface. The integrity gate compares assembly in memory rather than rebuilding files. No traffic-engine logic or authorization threshold changes.


## D078 — Founder-approved directions and Constitution V1, scoped ratification

The founder message FOUNDER DECISIONS IMPLEMENTATION (2026-10-14 Pacific) approves FD01–FD08. CONSTITUTION_V1 is the approved principles baseline; detailed governance proposals and OP01–OP06 remain open. D074 describes the earlier unratified consolidation, not current ratification. The 17 commitments and O/F/L histories remain traceable; missing historical approvals are not invented. PROJECT_STATE is the sole current project-status document. No Phase 12 or field action authorized.

## D079 — Local workflow approval never authorizes external execution

Control-server POST actions are explicitly allowlisted through authority.mjs; external and unknown actions fail closed, even with a forged reviewer label. The owner token protects local access, not professional identity. Existing local reviews remain records; no real-world adapter, authenticated approval system or activation switch is added. Constitutional anti-manipulation prerequisites apply before public contribution features.

## D080 — Rehearse the protected-main data flow before any remote switch

Keep city-feed.yml byte-identical and its schedule/outputs working. Add a manual read-only rehearsal and strict generated-JSON candidate inspection; no remote write, PR or auto-merge. Inactive publication-tail example documents unique branches, normal pushes and human-reviewed PRs. Main is still unprotected and Actions PR creation disabled at inspection. OP01 must approve exact repository settings and human-review latency; no bypass or stronger token introduced. Free public-repository capability does not establish the user's exact billing plan.

## D081 — Provisional proprietary code with distinct third-party rights

FD05 selects provisional proprietary CORE code, no open-source project LICENSE. Public GitHub is not confidentiality; retained third-party licenses and data attribution remain applicable. Free static prototype hosting is retained; future commercial Business hosting, brand/domain and legal questions require separate qualified review.

## D082 — Pilot preparation is not calibration or legal clearance

FD06/FD07 authorize a reproducible preparation package, conditional SF corridor shortlist, normalized aggregate-count schema and fixture-tested metrics/gates. SFMTA counts are accessible but reuse rights, compatible timings and independent-day holdout are not qualified. No measured payload redistributed or normalized as cleared input; no simulator installed. Synthetic fixture opt-in is explicit. Input validation/replay is not independent scientific validation or real-world efficacy.
