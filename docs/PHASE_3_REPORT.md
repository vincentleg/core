# Phase 3 — Agent organization, city intelligence and professional platform: report

Status: **COMPLETE on 2026-10-13** as a working vertical slice, with the deferred items listed below. Baseline `628c66f`. Phase 4 has **not** started. Audit: [PHASE_3_AUDIT.md](PHASE_3_AUDIT.md).

## Facts requested by the founder

| Item | Actual value |
| --- | --- |
| Registered agent profiles | **60**: 1 global coordinator, 1 San Francisco manager, 28 department leads, 29 specialists, 1 governance gateway |
| Executable agents | **16** (deterministic tools); 29 coordination-only; **15 unavailable** (no tool or no data, reason shown) |
| Language-model agents | **0** |
| Concurrent execution limit | **3** tasks per mission (bounded worker pool); 4,000 ms timeout per task; 1 retry |
| Real model integration | **Not operational.** No local runtime on the Mac (M1 Max, 32 GB). The provider-independent interface (`src/llm.js`: Ollama or OpenAI-compatible local server) and its claim validator are implemented and tested with stubs. Setup: `node scripts/llm-check.mjs`. Nothing was installed. |
| Knowledge sources | 6 registered sources, 18 approved versioned documents (`data/knowledge/library.json`); retrieval, freshness, contradiction detection, human-only approval |
| City news and feed sources | **10 official sources**: DataSF street-use permits, building permits, tree-removal notices, SFMTA closures; USGS earthquakes; NWS alerts; Legistar (stale); SFMTA blog, SF Public Works and SFPUC RSS (SFPUC stale). 148 items indexed on 2026-10-13. |
| Refresh mechanism | Node collector `scripts/city-feed.mjs` (manual, `--force`, or `--watch N` while the process runs), with per-source minimum intervals of 5–60 min. In-browser refresh of the 6 CORS sources every 15/30/60 min **only while the app is open**. **No background scheduler is installed.** |
| Working end-to-end missions | Event → mission → specialists → gateway, recorded for 10 feed suggestions plus 1 question (`data/missions/`); live in the browser with identical fingerprints |

## What was built

- **Organization** (`src/org.js`, `data/agents/registry.json`):
  - hierarchy: global → city → 28 departments → specialists → independent verification and governance;
  - every profile has id, scope, department, role (competency label, with an explicit no-credential disclaimer), specialization, competencies, knowledge references, allowed tools, permission, supervisor, execution mode, mission history, evaluation history, knowledge version, status and budget;
  - indexes by id, department, tool and domain support large registries; profiles are frozen.
- **Executable tools** (`src/tools.js`): 12 specialist tools over verified data, plus the independent evidence verifier, the adversarial reviewer and the gateway.
  - **Infrastructure and buildings:** work windows, telecom works, building frontage.
  - **Nature, energy, public space:** street trees, energy benchmarks, sidewalks.
  - **Resilience and civic:** seismic context, weather alerts, civic records.
  - **Methods:** graph linking, cross-domain investigation, knowledge retrieval.
  - Findings are typed observed, reported, derived, hypothesis or simulated, and every evidence reference must resolve. An absence claim cites the verified dataset that was queried.
- **Missions** (`src/missions.js`):
  - **States:** received → planning → assigned → running → reviewing → needs-human-review, needs-evidence or rejected; also cancelled or failed.
  - **Task states:** queued, running, succeeded, failed, retrying, timed-out, cancelled, denied.
  - **Planning:** the manager plans and recruits, with permission checks before each tool, without adding facts; every synthesis statement cites findings.
  - **Review and gateway:** disagreement detection and adversarial review. The mission gateway recomputes the mission from its origin, hashes the submitted content, verifies every evidence reference and rejects unvalidated model claims. Corridor missions consult `issueCityDecision`.
- **Knowledge** (`src/knowledge.js`): approved documents only; TF-IDF retrieval; freshness windows; contradiction detection.
  - **Contradictions:** numeric with tolerance, for example Golden Gate span 1,280 m official vs 1,283 m measured on OSM, compatible; or categorical.
  - **Updates:** agents may propose; only `human:` reviewers approve, creating a new version. Proposals touching permissions or safety rules from agents are rejected.
- **Competency evaluations** (`src/evals.js`, `data/agents/evaluations.json`): 14 checkable cases, 14/14 passing, stamped with the knowledge-library version and re-runnable from an agent's profile.
- **City Intelligence** (`src/feeds.js`, `scripts/city-feed.mjs`, `data/feeds/`). The pipeline runs:

  source registry → bounded requests → normalization → in-batch and cross-run deduplication with revisions → verification (HTTPS, official host, date, registered source) → classification (domains; kinds such as observation, public notice, proposal, approved decision, ongoing project, prediction, announcement) → geolocation (corridor link observed by CNN or derived ≤ 60 m) → temporal index → graph linking (`GR.linkFeedItems`) → deterministic mission suggestions, deduplicated by key.

  Source health covers last success, errors, freshness, staleness and coverage gaps. Civic items are metadata only, classified by official status and never ranked.
- **Professional platform** (`index.html`, `src/platform.js`):
  - top navigation: Monde, Intelligence urbaine, Agents, Missions, Simulations, Décisions, Données & preuves;
  - neutral surfaces, IBM Plex typography, reduced glow; the CORE/Tron look is kept inside the map;
  - every section is functional; unavailable models and agents are marked.
- **Camera** (`src/camera.js`):
  - pivot ±20°, tilt, zoom, north, reference view;
  - continuous 360° orbit around the centre or the selected item, stopped by any user gesture; reduced motion gives a single step;
  - keyboard W/A/S/D, Q/E, R/F, +/−, O, N, 0 (skipped while typing; no double zoom on the map);
  - maximum pitch raised to 85°;
  - a help panel documents mouse, trackpad, touch and the target-centred limits (no roll or 6-DoF free flight).

  The Earth → San Francisco flight is preserved.

## End-to-end example (real data)

1. **Event.** The official DataSF item **"Excavation 26EXC-05185 — Howard St (10th / 11th)"**, approved 2026-10-06 (Pacific Bell), is collected.
2. **Location.** It is linked to Howard 10th → 11th (observed CNN) and becomes a graph Event.
3. **Suggestion.** The collector suggests mission `corridor:7056000`.
4. **Plan.** The manager recruits 10 executable specialists: civil, telecom, forestry, housing, energy, public space, climate, data science, simulation and regulatory. It lists 12 relevant unavailable profiles (geotechnical, grid, water, transit, traffic, biodiversity, air quality and others), each with its data gap.
5. **Execution.** Tasks run 3 at a time, about 280–380 ms per mission in the browser.
6. **Findings.** All are sourced: 4 excavation windows from 3 organisations; 5 overlaps; 1 telecom holder; 4 of 18 trees within 12 m; 2 recent building permits (2 possibly interior, a disagreement); 4 self-reported energy benchmarks; 12 ft sidewalk (2014); no active NWS alert; investigation R0/R1/R2 with a hypothesis; knowledge notes.
7. **Gateway.** The cross-domain gateway returns **ÉLIGIBLE À LA REVUE HUMAINE**: a coordinated field verification (R2), never an authorization.
8. **Seismic counter-example.** The **M3.32 earthquake** 93 km from the corridor becomes a resilience mission that concludes **PREUVES SUPPLÉMENTAIRES REQUISES** (no structural or geotechnical data).

## Tests and audits

- **Node:** 61/61 pass, including 10 new tests in `test/phase3.test.js`: registry, knowledge, feeds, the real event-to-mission chain matching the recorded fingerprint, seismic honesty, permission denial, timeout with retry, flaky recovery, cancellation, gateway tampering, the LLM validator, and evaluations.
- **Browser audit**, 93 checks: the 73 earlier ones plus 20 Phase 3 checks (sections, City Intelligence, live refresh and rate limit, stale sources, org chart, profile, browser mission equals the Node fingerprint, workspace, map highlight, cancellation, decisions, data, simulations, orbit, gesture stop, keyboard, reset, help).

  | Browser | Result |
  | --- | --- |
  | Chrome 155 (CDP) | **93/93**, 0 uncaught errors; negative paths 12/12 |
  | Firefox 122 (BiDi) | **93/93**, 0 uncaught errors (1 handled network message) |
  | Safari | Not performed (remote automation disabled) |

  Summary: [PHASE_3_BROWSER_RESULTS.json](PHASE_3_BROWSER_RESULTS.json).

**Bugs found and fixed during the phase:**

- **Feed parsing and dates:** RSS and DataSF multi-address duplicates counted as changes; closure start dates were used as publication dates (negative freshness).
- **Legistar request:** a filter that hid the API's staleness.
- **Department mapping:** department domains didn't match the feed vocabulary, so no seismic specialist was recruited.
- **Tool code:** a tool read `.events` from the wrong object.
- **Absence claims:** they cited no evidence, so the gateway rejected valid missions.
- **Mission identity:** display-only fields changed it, breaking browser↔Node parity.
- **Gateway trust:** it trusted a claimed fingerprint instead of hashing the submitted content.
- **Async tools:** asynchronous tools crashed the orchestrator.
- **Memory:** unbounded session mission history.
- **Privacy:** the SFPUC RSS feed carried staff email addresses in item text; feed titles and summaries now redact emails and phone numbers before storage (tested).

## Resource and performance observations (Chrome 155 headless, M1 Max)

- **Load:** platform ready about 0.5–0.8 s after navigation (map tiles continue afterwards); 2.2 MB transferred on first load, including MapLibre, fonts, snapshots, feeds and knowledge.
- **Mission time:** about 280–380 ms in the browser and about 350 ms in Node for a 10-specialist corridor mission (the cross-domain investigation dominates, about 160–220 ms). A seismic mission takes about 5 ms.
- **Memory:** JS heap after GC went from 9 MB to 20 MB after 30 consecutive missions, bounded by the 20-mission session cap.
- **Repository data:** about 0.9 MB of new Phase 3 data (missions 620 KB, feeds 220 KB, agents 60 KB, knowledge 16 KB).

## Deferred and not claimed

- **LLM:** no LLM reasoning, pending founder approval to install a local runtime (about 4.7 GB for qwen2.5:7b-instruct).
- **Agent scale:** no thousands of agents and no autonomous agents. Profiles beyond the 16 executable ones are registered with stated gaps.
- **Background refresh:** none. A free CI cron could commit snapshots; it is not configured, to avoid automatic commits.
- **News:** no licensed news. Legistar's public API is stale, and sf.gov and SF Planning provide no RSS.
- **Narrow automation:** missions auto-suggest only from DataSF, USGS and NWS items; civic and agency news never auto-trigger missions.
- **Camera:** no 6-DoF free flight or roll; MapLibre's camera is target-centred.
- **UI:** no resizable panels. The left console keeps some earlier styling.
- **Coverage:** Safari, iOS and physical devices untested.

**Phase 4 readiness:** possible next steps are installing a local model with founder approval, field-verification feedback, background refresh via CI, and more data domains. Phase 4 starts only on explicit request.
