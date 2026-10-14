# Phase 10 — Autonomous Planetary Intelligence Network: report

Status: **COMPLETE** (2026-10-14).
- **Branch:** `phase10`, merged into `main` after the release gates; deployment in §P.
- **Progress log:** `docs/PHASE_10_CHECKPOINT.md`.
- **Phase 11 has not been started.**

What "planetary" means here is stated plainly. CORE now runs in **two** operational study areas, on **two** cities' public data. Agents investigate problems, collaborate across the two cities, reuse verified memory and compare interventions. Every result stops at a human. Nothing else on Earth is covered, and the product does not claim otherwise.

## A. Acceptance criteria

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | San Francisco stays fully functional | **met** | SF ids, codes, wording and the 5 Phase 9 recordings unchanged (checkpoints returned as-is); Chrome audit 159/159 incl. every Phase 9 check |
| 2 | Second city with genuine data coverage | **met** | New York: 5 NYC Open Data datasets + OSM network, `data/nyc` (§C) |
| 3 | Reusable city configuration | **met** | `src/cities.js` read by snapshot, tools, engine, motion, map, demo, control centre (§D) |
| 4 | Real automated problem discovery | **met** | 10 problems discovered automatically from the two published snapshots; snapshot comparison run twice on real collections (0 semantic changes, §J); persistent queue |
| 5 | Missions survive a process restart | **met** | Engine and world missions checkpointed in SQLite; crash-and-resume tests (city, world, scheduler `running` → resumed) |
| 6 | Hierarchical delegation across departments | **met** | NYC: manager → lead → specialists, cross-department requests through the civil lead; world: director → two cities' leads → specialists → research leads |
| 7 | At least one recorded cross-city investigation | **met** | `world:road-safety-comparison:…tenderloin…+…east-village…` (§G) |
| 8 | Agents reuse verified institutional memory | **met** | The cross-city director reused 9 verified-and-reviewed findings (6 SF, 3 NYC); supersession with conflict detection (§H) |
| 9 | Additional executable capabilities | **met** | `accessibility.ramps`, `works.near-points`, `decision.interventions`, `comparability.review` (all deterministic, recorded) |
| 10 | Full intervention-comparison workflow | **met** | `decision-safety-works` (Tenderloin): problem, baseline, 3 interventions, assumptions, calculation, trade-offs, 18-case sensitivity, evidence grades, independent review, next step, human checkpoint (§I) |
| 11 | Movement validated in both cities | **met** | Route-vs-building tests in 3 SF + 3 NYC areas (75 routes each); browser: NYC agents walk only on NYC sidewalks (§K) |
| 12 | Local command centre monitors and controls | **met** | Cities and source health, queue/discoveries, memory, resources, allowlisted launches, decisions, stop, dossier (§L) |
| 13 | Investor demo on real recordings | **met** | 9 steps: Earth, two cities, detected problem, hierarchy, investigation, cross-city collaboration, memory, decision analysis, human oversight |
| 14 | No private data or model endpoint exposed | **met** | Collisions aggregated (no ids, times, vehicles, factors); public page never calls NYC APIs or a model; control centre loopback + token |
| 15 | Security and emergency stop pass | **met** | Integrity scan 0 findings (265 files); STOP blocks launches and cycles; agents cannot decide; no process spawned by the server |
| 16 | Public deploy succeeds | see §P | |
| 17 | Metrics are real | **met** | All figures below are read from data or test output; one commit message overstated the test count (§N) |
| 18 | Cost $0 | **met** | Free public APIs (bounded), local Node and Ollama, GitHub Pages; no account, key or billing |

## B. Counts (2026-10-14, from data)

| Item | Count | Source |
| --- | --- | --- |
| Registered profiles | **82** | 68 San Francisco (unchanged) + 12 New York + 2 global |
| Executable | **35**, of which 28 rule-based and 7 model-assisted (local Ollama) | `ORG.counts(buildWorld())` |
| With recorded work | **47** (SF 33, NY 11, global 3) | `data/agents/operational.json` |
| Operational classes | 16 autonomous operational · 25 deterministic specialists · 7 model-assisted · 21 coordination-only · 13 not implemented | same |
| Running locally now | **0** (no process running at report time); runnable locally: 35 | |
| Running publicly | **0**: the public site replays recordings only | |
| Operational cities | **2** (San Francisco, New York); Paris and Tokyo are navigation only | `src/cities.js` |
| Recorded autonomous missions | **12**, all at human review | `data/civ/index.json` |
| Human decisions | **0** | |
| Exploratory models | 2 (sidewalk-tree capacity, Phase 5; safety-works exposure index, Phase 10), both uncalibrated | |
| Field-validated results | **0** | |

The 12 recorded missions break down as follows:
- 5 San Francisco missions from Phase 9.
- 5 New York missions.
- 1 decision-analysis mission.
- 1 cross-city mission.

The New York safety lead is the only New York profile without recorded work. It is a coordination-only supervisor.

## C. Second city: New York

- **Choice.** New York was chosen because NYC Open Data offers keyless, geolocated, documented datasets that match the San Francisco workflows.
- **Study area.** Three 2020 NTAs: Chinatown-Two Bridges, Lower East Side and East Village.
- **Snapshot.** `scripts/nyc-snapshot.mjs` writes `data/nyc`, with a manifest listing URLs, retrieval times and SHA-256 hashes.

| Dataset | Use | Nature |
| --- | --- | --- |
| 2020 NTAs `9nt8-h7nd` | Study-area boundaries | Official |
| VZV Priority Corridors `36nr-7fbp` | Designated network, split per NTA (7 pieces) | Administrative designation; method differs from SF's HIN |
| Motor Vehicle Collisions `h9gi-nx95` | **Counts only**, by corridor piece × NTA × fatal/injury × pedestrian | Police-reported; no severity class; 5 years ending 2026-06-11 (125-day lag) |
| Street Closures by Block `i6b5-j7bu` | Works windows (116 closures) | Authorisations, no holder; the permits dataset has no geometry |
| Pedestrian Ramp Locations `ufzp-rrqu` | 3,713 measured ramps | Surveys 2017–2019 |

- **Network.** `scripts/osm-walk.mjs --city new-york` keeps 15,792 nodes and 18,376 edges. It removed 197 edges that crossed one of 7,760 buildings, then kept the largest component.
- **Licence.** The NYC Open Data Law places no restriction on use and requires attribution of source, version and modifications. This was verified through search summaries only, because the codified text page refused access. Every data-policy entry says "re-read before commercial use".
- **Not integrated:**
  - stormwater flood maps (published as files only);
  - geolocated permits;
  - trees;
  - costs.

**Data-quality defect found and fixed during the phase**
- **The defect.** A 145 m piece of the East Houston corridor lies next to the FDR Drive. The 20 m spatial join attached collisions on that elevated highway to it.
- **The fix.** Collisions recorded on limited-access roadways (FDR Drive, bridges, tunnels, expressways) are now excluded. There were 250 such collisions in the bbox, and the manifest counts them.
- **The effect.** East Village went from 475 to 456 collisions and from 4 to 2 fatal ones.
- **The re-run.** New York was re-snapshotted. Mission ids outside SF now carry the snapshot time, so a corrected snapshot produces new missions; only missions on the current snapshots are published.

## D. City configuration (`src/cities.js`)

Each city declares:
- its status, view and study area (data directory, walk network, building sample);
- its labels, sources (with their nature and freshness budget) and domain statuses;
- its mission types, agent prefix and jurisdiction statement;
- its simulations, its unavailable domains and its motion settings.

That one declaration feeds every layer:

| Layer | Uses |
| --- | --- |
| `civ-tools` | labels |
| `civ-engine` | the city engine |
| `civ-runtime` | all operational cities |
| `osm-walk` | the city's network |
| `agent-motion` | one network per city |
| `map-style` | coverage |
| `city-layer` | study-area layers |
| `cities-view` | the cities panel |
| Demo and control centre | the city list |

Adding a city means a snapshot script with the same schema, a config entry and its profiles.

## E. Organisation (`ORG.buildWorld()`)

San Francisco's 68 profiles and codes are unchanged. The 14 new profiles each have an implemented tool or a real coordination role:

| Code | Profile | Tools |
| --- | --- | --- |
| CORE-DIR-0069 | Global road-safety director | `mission.plan` |
| CORE-RES-0070 | Global methodology reviewer (independent) | `comparability.review` |
| CORE-CTY-0071 | New York coordination | `mission.plan` |
| 0072–0076 | NY leads: mobility, civil, public space, research, safety | coordination |
| CORE-TRF-0077 | NY traffic-safety analyst | `safety.crash-profile` |
| CORE-CIV-0078 | NY works analyst | `works.area-windows`, `works.near-points` |
| CORE-PUB-0079 | NY ramp-accessibility analyst | `accessibility.ramps` |
| CORE-RES-0080 | NY evidence verifier (independent) | `data.freshness` |
| CORE-SAF-0081 | NY adversarial reviewer (independent) | `adversarial.review` |
| CORE-SAF-0082 | NY decision gateway | `decision.gateway` |

The SF scenario evaluator also gained `decision.interventions`. No decorative profile was created.

## F. Engine (`src/civ-engine.js`, one engine per city)

- `createEngine({ city })` resolves every role inside that city's organisation. A workflow declares the cities it runs in; asking for an unavailable workflow is refused.
- **New York workflows.**
  - `safety-works`, worded with New York definitions.
  - `ramps-works`: ramps exceeding declared thresholds within 30 m of active or upcoming closures. The ramp analyst asks the works analyst through the civil lead.
- **Isolation.** San Francisco agents never execute New York work, and the tests prove it.
- **Inputs.** Tools that need upstream inputs (`works.near-points`, `decision.interventions`) are only reached through dependencies, never by broad delegation.

## G. Cross-city investigation (`src/civ-world.js`)

The mission compares Tenderloin (SF) with East Village (NY). Its lifecycle:
DISCOVERED → ASSIGNED → MEMORY_CONSULTED → INVESTIGATING → METHODOLOGY_REVIEW → EVIDENCE_VALIDATION → PROPOSED_DECISION → HUMAN_REVIEW.

The chain recorded 24 messages and 7 subtasks:
1. Coordinator → global director.
2. Director → institutional memory (9 entries reused).
3. Director → both mobility leads.
4. Each lead → traffic specialist, who goes through the civil lead to the works analyst.
5. Director → methodology reviewer.
6. Director → both research leads → evidence verifiers.
7. Both adversarial reviewers.
8. Gateways → human.

**The methodology reviewer's verdicts, issued before any comparison:**

| Metric | Verdict |
| --- | --- |
| Injury-or-fatal crashes (5 years) | comparable with reservations (different police reporting systems) |
| Fatal crashes | comparable with reservations (very small numbers) |
| Severe injuries | **not comparable** (NYC has no severity class) |
| Designated network and per-km rates | **not comparable**, descriptive only (HIN vs VZV) |
| Crash-to-segment assignment | **not comparable** without recomputation (CNN key vs 20 m join) |
| Works | **not comparable** (permits vs closures) |
| Period | comparable (overlap ≥ 90 %) |

**Descriptive juxtaposition, each figure on its own city's definition:**
- Tenderloin: 399 crashes on 14.45 km of HIN (8 fatal).
- East Village: 456 collisions on 4.54 km of VZV corridors (2 fatal).

No city is judged safer.

**Recommendation (hypothesis):** compare only injury-or-fatal and fatal counts, then obtain a common severity classification and recompute the assignment the same way in both cities.

## H. Memory: reuse, supersession, conflicts

- **Reuse.**
  - The director reads, per city, the verified/reviewed/approved findings of the same problem on any snapshot; superseded entries are excluded.
  - It cites the entry ids in a `memory-read` message.
  - Recorded: 9 entries reused (6 SF, 3 NY).
- **Supersession.**
  - `verified` and `reviewed` entries can now be superseded, in addition to `approved` ones.
  - `memory.supersede(old, new)` links both entries and keeps the old one.
  - When the numbers change it records a `memory-conflict` event, and `memory.conflicts()` lists them.
  - City missions on a newer snapshot supersede the older findings of the same problem; the cross-city mission does the same for its findings.
  - A test proves this on a newer snapshot: supersession, the successor link and a conflict, with the hash chain still intact.
- **Bug during development, recorded honestly.**
  - The first world-supersession code linked an old, still-valid finding to the wrong successor and recorded a false conflict. This was never published.
  - The local memory was restored from the Phase 9 backup and every Phase 10 run was replayed with the fixed code. The faulty database is kept under `.core-local/backup/dev-bug/`.
- **Published memory** (`data/memory/export.json`): 39 entries (6 procedures and 3 lessons approved from deterministic records; 30 findings reviewed, none approved, because no human has decided). The chain is intact (423 events).

## I. Decision intelligence (`decision.interventions`, mission `civ:decision-safety-works:tenderloin@2026-10-14`)

**Problem:** works planned on the most crash-affected HIN segments of the Tenderloin.

**Calculation (modelled, exploratory, uncalibrated).** For each segment: its injury-crash rate (per km per year, over 5 years) × the authorised works-days within the horizon. The index is summed over all segments.

| Option | Index | Effect | Authorisations | Organisations |
| --- | --- | --- | --- | --- |
| I0 status quo | 50,836.6 | — | 0 | 0 |
| I1 pedestrian-plan review on the 5 most exposed segments | 50,836.6 | covers 20 % of the index (does not reduce it) | 7 | 3 |
| I2 coordinate overlapping windows (days counted once) | 47,486.9 | −7 % | 36 | 10 |
| I3 defer non-urgent works on the 5 most exposed segments | 40,713.6 | −20 % | 7 | 3 |

- **Sensitivity.** 18 combinations (top N 3/5/10 × horizon 60/120/180 days × all/severe weighting). I3 reduces the index most in **18/18** of them.
- **Evidence grades.**
  - crashes B, HIN B, permits B (in New York, closures would be C);
  - model C: no relation between works-days and crashes is established.
- **Trade-offs.** I3 moves 7 authorisations from 3 organisations; I2 assumes simultaneous works can share an occupation.
- **Not computed:** costs, because no cost data is integrated.
- **Review.** The adversarial review rejected nothing. The rule is visible: modelled figures must say "modélisé".
- **Proposed next step.** Apply I1, then ask SFMTA and SF Public Works to study the feasibility of I2 and I3.
- **Human checkpoint.** The gateway sets "ÉLIGIBLE À LA REVUE HUMAINE" and authorises nothing.

## J. Discovery and persistent scheduler

- **Discovery on the published snapshots.** Every workflow is scanned against every neighbourhood of every city, and only real signals become problems. It found 10: SF 5 and NY 5 (3 ramps, 2 safety).
- **Snapshot comparison** (`src/civ-discovery.js`). The scheduler fetches a fresh "watch" snapshot into `.core-local/watch/` and compares it with the published one. It detects:
  - new or ended works on designated segments;
  - changed works windows;
  - crash data whose window moved;
  - and it ignores row order.

  Signals are deduplicated by a stable key, prioritised, and treated as hypotheses for triage.
- **Real runs.**
  - SF baseline 16:09 → watch 19:18 and 20:36; NY 19:25 → 20:36.
  - **0 semantic changes** in both cities. File hashes differed only because the APIs return rows in a different order; this was verified field by field.
  - The detectors are proven on a derived newer snapshot in the tests.
- **`scripts/civd.mjs`**, with its core in `scripts/lib/civd-core.mjs`:
  - a SQLite queue;
  - crash recovery (`running` items are resumed from checkpoints);
  - budgets: at most 4 collections per city per day and 4 missions per cycle;
  - STOP stops all work;
  - triage by the city coordinator;
  - follow-ups after human decisions;
  - `--publish` writes `data/civ/discovery.json`.
- **Publication** of a new snapshot remains a human commit.

## K. Movement in both cities

- Each operational city has its own validated network and zone layout. An agent's post is in its own city (global roles keep their San Francisco posts), and it only ever walks on that network.
- New York replays send NY specialists to the cited ramp or corridor along New York sidewalks.
- **Tests:** 75 seeded routes in each of 3 SF and 3 NY areas never enter a building footprint.
- **Browser:**
  - NY posts are on the NY network;
  - SF agents never enter New York;
  - NY movers' whole paths stay inside New York.

## L. Interface

- **Map.**
  - New York destination and coverage label; New York search aliases.
  - `src/city-layer.js` draws:
    - the NTA outlines, with one label each;
    - the corridors, coloured by collisions per km per year;
    - the closures;
    - the flagged ramps, loaded lazily at zoom ≥ 15.
  - Every popup states its source, date and nature.
  - The header shows the city in view and its snapshot time.
- **Replay.** The camera follows the mission's city. A labelled San Francisco ↔ New York arc shows while a cross-city mission replays. Dossiers include the decision, comparability and memory sections.
- **"Villes & enquêtes"** (Civilisation tab) shows:
  - cities and their sources;
  - the cross-city investigation;
  - the decision analysis;
  - the discovery report.
- **Investor demo.** 9 steps on recorded missions; "replay" and "not live" are stated, and no human decision is invented.
- **Local command centre** (`node scripts/control-server.mjs`, loopback and token):
  - source health per city (age vs budget);
  - persistent queue and last discovery cycle;
  - memory by status, and conflicts;
  - resources (RSS, CPU, $0);
  - allowlisted launches: decision analysis (SF neighbourhoods), cross-city comparison (two neighbourhoods of two operational cities), discovery cycle;
  - human decisions, stop/resume, export, and a per-mission dossier.

  The server never starts a process: snapshot collection stays a CLI action.

## M. Security, privacy, cost

- **Collisions:** counts only. Tests assert the exact row keys and the absence of collision ids, vehicle types, contributing factors and times.
- **Public page:**
  - reads published snapshots only, and never calls NYC Open Data;
  - contacts a model only in local mode;
  - CSP regenerated.
- **Control centre:**
  - loopback, token, and Host/Origin checks;
  - cities and neighbourhoods allowlisted from `src/cities.js`;
  - an agent id cannot decide; STOP returns 423;
  - no `child_process` in the server (test).
- **Integrity scan:** 0 findings over 265 files; the hooks were never bypassed.
- **Cost:** $0.

## N. Tests, browsers, performance

| Check | Result |
| --- | --- |
| Node | **121/121** (109 + 12 Phase 10) |
| Chrome 155 audit | **159/159** (Phase 9 checks generalised to 82 profiles and per-city networks, plus 7 Phase 10 checks) |
| Negative audit | **12/12** |
| Integrity scan | 0 findings (265 files) |
| Firefox / Safari | Not run (same blockers as Phase 8/9) |

Correction: commit `6fb03e0`'s message says "122/122"; the real count at that commit was **121/121**. It is pushed, so it is recorded here rather than rewritten.

**Performance** (medians of 3 headless runs, software rendering; Phase 9 in brackets):

| View | Map only | All agents + replay |
| --- | --- | --- |
| SF city | 60.0 | 60.1 (60.1) |
| SF mission | 13.6 | 18.1 (18.8) |
| SF street | 35.2 | 43.2 (44.3) |
| NY district | 51.5 | 49.9 |
| NY street | 59.0 | 59.4 |

- **Ready time:** 788 ms (671 ms in Phase 9).
- **First load:** 4,905 KB uncompressed, up 373 KB (+8 %), mostly the New York walk network loaded for motion.
- **Heap:** 48 → 46 MB over 8 heavy cycles.

## O. Limitations and unverified items

1. **No human decision.** All 12 missions await review, and no recommendation has been validated in the field.
2. **No real change discovered yet.** Snapshot comparison found 0 changes in two real runs; its detectors are proven only on derived data.
3. **NYC licence.** The codified text was not read directly; re-read it before commercial use.
4. **NYC data.**
   - No severity class.
   - The 20 m spatial join is CORE's choice, with limited-access roadways excluded.
   - Closures are not permits.
   - Ramp surveys date from 2017–2019; landing units are assumed to be inches.
   - Urgent works are not identifiable, so I3 cannot be evaluated in New York.
5. **Decision index.** Exploratory and uncalibrated; no cost or benefit is quantified.
6. **Reviewer rule.** Negative findings that cite no evidence are rejected (1 case in Chinatown). This is correct under the rule, but a negative result should cite what was examined.
7. **Coverage.** The New York study area has 3 neighbourhoods; flood risk is not integrated there.
8. **Model.** The local model is used only for San Francisco interpretations (Phase 9); New York missions are rule-based.
9. **Browsers.** Firefox and Safari are not verified.
10. **Scheduled refresh.** The hourly retry on GitHub has not been observed running yet.
11. **Snapshot files.** They are not byte-stable across collections, because API row order varies. Sorting rows would make hashes comparable.

## P. Deployment

Filled after the merge to `main` and verification of GitHub Pages; see `docs/PHASE_10_CHECKPOINT.md`.

## Q. Recommendations (Phase 11 needs an explicit request)

1. A human review of the 12 pending missions in the control centre; that is the first real test of the approval and follow-up path.
2. A common severity classification, and recomputed crash assignment, before any quantitative cross-city comparison.
3. Sorted snapshot rows, and a daily scheduled `civd --fetch` on the owner's machine to observe real changes.
4. Negative findings should cite the examined records.
5. NYC permits (non-geolocated), joined via LION segments; New York stormwater flood maps if a tabular version appears.
