# CORE V7.2 — Living Agent Civilization Engine: continuation checkpoint (2026-10-16)

**Status:** paused at the founder's request (usage limit).
- Nothing was pushed, merged or deployed. Cost: $0. No account, key or paid service.
- Branch `v72/agent-civilization` was created from `v7/living-earth` (`c16425d`). Work commit: `334816b`.
- Backups are in `~/CORE-backups/git/` (git bundles of all branches).

## 1. The V7.2 brief, condensed (keep this vision)
- **Purpose:** turn V7 Living Earth into an observable, interactive civilisation of specialised agents. The **approved V7 design is frozen**: Earth, typography, colours, navigation, panels, avatar creator. Only these may be added: agent holograms, the Real/Agent/Hybrid switch, nameplates, mission overlays, agent and team panels, and the global network overlay.
- **Three layers on the same coordinates:** REAL (V7, unchanged), AGENTS (holographic computational layer: agents, missions, teams, collaboration, research zones, network), HYBRID (humans and agents together). They are orthogonal to the Planet/Region/City/Human scales.
- **Hierarchy:**
  1. CORE Global Intelligence (coordination, no unchecked authority);
  2. Global Assembly and councils (geographic, thematic, mission): deliberation artefacts that preserve dissent, and never count as human consent;
  3. city direction (San Francisco first), which can never override review or human authorisation;
  4. specialist teams (19+ domains, extensible);
  5. operational agents. Each agent has an id, name, city, specialty, affiliation, supervisor, mission, tasks, capabilities, data permissions, memory, confidence, collaborations, position, status, escalation rules and review state. Every agent is inspectable.
- **Scale:** at least 500 distinct San Francisco agents, scalable to 1k–10k. Three concepts are kept distinct: *registered* identities, *simulated* agents (state and movement from a deterministic engine), and *reasoning* agents (model-assisted, bounded concurrency). Never imply that all agents reason.
- **Runtime:** a mission state machine (OBSERVE → FORMULATE → RETRIEVE → ANALYZE → REQUEST_REVIEW → COLLABORATE → HYPOTHESES → SIMULATE → CRITIQUE → REVISE → DOSSIER → HUMAN_REVIEW → RECOMMENDATION → MONITOR). It includes:
  - typed messages, delegation and an event queue;
  - a bounded scheduler with retries, failure and cancellation;
  - review gates and resource limits;
  - persistence and recovery with no duplicates;
  - clear labels separating simulated output from model output.
- **Flagship:** San Francisco housing affordability and urban resilience, grounded in dated public data, with:
  - competing hypotheses;
  - a review process and a human entry point;
  - a dossier stating what is and isn't established.

  The sidewalk problem stays as a regression test.
- **Street level:** holographic humanoid agents (translucent, cyan rim, role marker, walk/idle/talk/inspect animations, level of detail, reduced motion). The person can walk to an agent, open its identity and mission, talk, ask a specialist, and see traceable agent-to-agent exchanges.
- **Multi-agent dialogue:** a team research mode. Specialists answer from records; an evidence agent checks dates; a review agent flags unsupported claims; a coordinator summarises without erasing dissent. Inference budgets are bounded, cancellation works, and the mode states honestly when it is limited.
- **Planet scale:** a network overlay (hubs, populations, missions, cross-city links). Only San Francisco is "active"; others appear as planned or partial, never as falsely active.
- **Humans:** propose, add evidence, ask, challenge, join, follow, and see how ideas were considered. Private-by-default vault, explicit consent before sharing, no popularity-based truth, no rank-based civic power.
- **Rules:**
  - $0, no keys or accounts;
  - no push, deploy or merge without authorisation;
  - FD09 data rules;
  - no fabricated facts, experts, participation or outcomes;
  - measure performance; never claim 60 fps unless measured.
- **Final delivery format:** IMPLEMENTED AND VERIFIED / IMPLEMENTED BUT NOT VERIFIED / SIMULATED / NOT IMPLEMENTED, together with:
  - branch and commit;
  - agent counts (registered / visually active / reasoning);
  - an agent-to-agent communication example;
  - commands, tests, performance figures, screenshots;
  - limitations and any optional services needing approval.

## 2. Audit result (Phase 1)
- The original agent civilisation was **not deleted**; V7 had disconnected it from the new World. It still drives `index.html` (CORE Intelligence), through:
  - `src/org.js` (registry v1: 68 agents = 1 global coordinator + 67 San Francisco agents, 28 departments, supervisors, permissions, tools);
  - `src/civ-engine.js` (Node mission engine, Phase 9);
  - `src/civ-memory.js` (SQLite agent memory);
  - `src/civ-world.js` (cross-city investigations);
  - `src/civ-activity.js` and `src/agent-motion.js` (replay of recorded missions);
  - `src/scheduler.js` and `src/task-queue.js` (hash-chained queues);
  - `src/missions.js`;
  - data: `data/agents/registry.json` and `data/civ/missions/*.json` (18 recorded missions, San Francisco and New York).
- **V7.2 reuses** the 68 profiles verbatim (same ids, codes, tools, supervisors, execution modes) and extends them. The Phase 9 Node engine and SQLite memory were not ported to the browser.

## 3. What was implemented (commit `334816b`)

| Area | Files | Status |
|---|---|---|
| Housing evidence snapshot (FD09-checked licences) | `scripts/housing-snapshot.mjs` → `data/sf-housing/`:<br>• `pipeline.geojson` — DataSF aaxw-2cb8, PDDL, 190 projects, no sponsors or addresses<br>• `production-by-year.json` and `production-by-neighborhood.json` — xdht-4php, US Government public domain<br>• `evictions-agg.json` — 5cei-gny5, PDDL, **counts only**<br>• `neighborhoods.geojson` — j2bu-swwd, 41 neighbourhoods, simplified<br>• `manifest.json` (URLs, dates, SHA-256) | IMPLEMENTED AND VERIFIED. The **Census ACS API now requires a key**: not used; recorded as a gap in the manifest |
| Registry: 508 agents | `scripts/agents-civilization.mjs` → `data/agents/sf-civilization.json`:<br>• global 1, assembly 1, councils 7, city 1, team leads 34, agents 464;<br>• **501 in San Francisco**, 68 kept from v1, 440 generated;<br>• 34 departments (28 original + food, education, AI infrastructure, ethics, resilience, inequality);<br>• role-based names (no human names), 41 neighbourhoods;<br>• virtual posts and hubs: the flagship teams' hubs sit on Folsom Street sidewalk points;<br>• capabilities, data permissions, escalation rules, council membership | IMPLEMENTED AND VERIFIED (all supervisors resolve; names unique) |
| Analyses (cited findings) | `src/civilization/analyses.mjs` | IMPLEMENTED AND VERIFIED (ad hoc runs). Housing findings:<br>• completions −38.2 % (2016–20 vs 2021–25);<br>• 37.6 % of completions affordable;<br>• pipeline 190 projects / 10,100 affordable units;<br>• 41.5 % of those units in 3 neighbourhoods;<br>• eviction notices 2,091 → low of 778 (2020) → 1,495 (2025);<br>• 5 of 95 study-area projects (68 units) in the 2022 storm flood zone.<br>Plus 5 declared gaps, 3 competing hypotheses H1–H3 and 4 dissents. Background findings: energy, high-injury network and crashes, street trees, data freshness, sidewalk regression |
| Mission plans | `src/civilization/missions.mjs` | IMPLEMENTED. 10 missions:<br>• the flagship, with a 23-task graph over all stages: the rent-burden retrieval **really fails** (key needed) and escalates; SIMULATE is honestly "not run, no calibrated model"; it ends at HUMAN_REVIEW;<br>• 5 background missions;<br>• 4 declared data-gap missions (AI compute, food, schools, water);<br>• **record-by-record audits:** real checks per record — pipeline dates and units, record quality, flood zone, affordable mix, energy declarations, crashes on the high-injury network, tree records, problem records;<br>• periodic **council sessions** |
| Runtime | `src/civilization/runtime.mjs` | IMPLEMENTED AND VERIFIED in Node (scratch simulation, 1,200 s):<br>• deterministic (identical hash across runs); hash-chain `verify()` passes;<br>• `serialize`/`restore` round-trip passes;<br>• flagship reaches awaiting-human at t ≈ 278 s;<br>• 30–79 agents busy at once, about 190 distinct agents worked;<br>• typed messages: request, evidence, analysis, challenge, alternative, review-request, review, dossier-update, escalate, status, human-input;<br>• `cancel()` and `submitHumanInput()` (consent required) exist |
| Browser client | `src/civilization/client.mjs` | IMPLEMENTED: Web Locks single writer, 4 Hz ticks, paused when the tab is hidden, pause and ×1/×4/×16, `localStorage` key `core.civ.v72` (1,200 events kept). The clock only advances while CORE is open. Multi-tab behaviour NOT VERIFIED |
| Agent Earth overlay | `src/earth/agents-layer.mjs` | IMPLEMENTED AND VISUALLY CHECKED (Chromium):<br>• holographic restyle of the same map;<br>• 501 agent dots coloured by activity, team hubs, collaboration links;<br>• planet network: San Francisco active, New York "partial (recorded missions, registry not loaded)", inter-city arc |
| Panels | `src/earth/civ-panels.mjs` | IMPLEMENTED AND VISUALLY CHECKED (mission, activity). Agent and event panels NOT VERIFIED visually. All values escaped |
| World integration | `world.html`, `src/earth/app.mjs`, `earth.css` | IMPLEMENTED:<br>• Réel/Agents/Hybride switch with persistence;<br>• Activité button;<br>• the opening journey lands on the flagship mission in Hybrid;<br>• deep links `#layer=`, `#mission=`, `#agent=`;<br>• nearest-agent talk (E) opens the agent panel;<br>• compact nameplates (6 nearest within 25 m);<br>• follow agent / follow mission |
| Street holograms | `src/earth/avatar3d.mjs` (`hologramMaterial`, `buildHologram`, `bakedHologramGeometry`), `src/earth/agents3d.mjs` | IMPLEMENTED AND VISUALLY CHECKED (a council session of six leads on the Folsom sidewalk; 60 fps headless with 9 near and 18 far agents). Near agents: animated by real activity (≤ 12 within 60 m); far agents: instanced idle bake (≤ 220 within 350 m) |
| V7 regression fix | `app.mjs` | With relief on ("Haute" quality) the street 3D layer was hidden under the terrain. Relief is now switched off at human scale and restored on leaving. VERIFIED visually |

## 4. Not done / incomplete / broken (priority order for next session)
1. **NOT VERIFIED:** the screenshot after the last nameplate/brightness tweak (`scratchpad v72/shots/t3-1.png`) was not reviewed. Check holograms are readable and plates don't overlap.
2. **Multi-agent dialogue (brief §11): NOT IMPLEMENTED.** `dialogue.html#mission=<id>&agent=<id>` links exist but `src/dialogue/room.mjs` ignores `mission`/`agent`. To build:
   - a team mode that routes questions to specialists, answering from `missions.findings` with citations (reuse the `src/intelligence/` verifier for optional local-model rewording);
   - "consult another specialist";
   - showing the runtime's mission messages;
   - `intent=propose` → private vault save (existing flow) plus an **explicit consent** checkbox calling `submitHumanInput()`. The runtime runs in the writer tab; the Dialogue page needs `CIV.start()` and must handle being a reader (submit via the writer, or make the Dialogue the writer when no World tab is open).
3. **Tests NOT WRITTEN:** add `test/civilization.test.js` covering:
   - registry ≥ 500 SF agents, valid supervisors and councils;
   - analyses numbers against the snapshot;
   - runtime determinism, hash verify, restore without duplicates, cancel, human input requires consent, audit tallies;
   - no agent level grants approval.

   Also extend `scripts/v7-journey-audit.mjs` into the brief's 20-step V7.2 journey, and update `test/trust.test.js`/`test/v7.test.js` if needed. Not run since these changes: `node scripts/verify.mjs`, the browser audits (V7 journey, Commons, V6 journey), and the WebKit/Firefox smoke tests. **The Node suite passed 239/239** at commit time.
4. **Debug flags to remove:** `?nociv` and `?nocrowd` in `src/earth/app.mjs`. The renderer getter added to `scene3d.mjs` can stay.
5. **Mon CORE:** show followed missions (`core.follow.v1`) and human inputs. TRUST: add the keys `core.civ.v72`, `core.world.layer` and `core.follow.v1` to the list in `src/civic/ui-journey.mjs`.
6. **Planet-scale check:** the network overlay is only visible at zoom < 9 in Agents/Hybrid; verify on the globe (projection change). A Global Assembly entry point exists only as text in the Activity panel.
7. **Performance:** measure 500-agent city scale and street scale with full and reduced budgets (frame time, memory, `localStorage` size ≈ 0.6–1.3 MB); test mobile; check long-session memory (marker churn).
8. Integrate Labs, Knowledge and Arena with missions (cite mission findings), and the Academy (the housing mission as a lesson).
9. Write `docs/v7/V7_2_REPORT.md` in the brief's final delivery format.

## 5. Known risks and limitations
- **Agents are not reasoning models.** All work is coded computation on dated public data; this is stated in every panel (`HONESTY` in `civ-panels.mjs`). Reasoning agents supported concurrently: **1** (the optional local model through `src/intelligence/`, not yet wired into missions).
- **Movement:** travel is accelerated (25 m/s) and posts and meeting points are virtual, as the UI must state (the "Ce que vous voyez" panel was updated). Audit targets for pipeline projects are lot points, often inside blocks, so street-level agents there are hidden by buildings.
- **Persistence:** `localStorage` limits mean only the last 1,200 events are kept; the hash chain verifies the retained window. A runtime version or mission-set change resets the saved state.
- **Data:** no rent, income, zoning or transit data, because the Census API needs a key (founder decision). The flood join only covers the SoMa/Mission/Tenderloin study area. Eviction notices are aggregated and are not evictions.
- **Python dev server:** connection resets on cold loads; the boot guard handles it.
- **New York:** recorded missions only; its agent registry is not loaded.

## 6. Commands
```sh
cd <the CORE repository folder> && git switch v72/agent-civilization
python3 -m http.server 8000 --bind 127.0.0.1      # open http://localhost:8000/world.html
# Agent Earth directly: http://localhost:8000/world.html#layer=agents&mission=mission.sf.housing-resilience
node --test test/*.test.js                          # 239/239 at checkpoint
node scripts/housing-snapshot.mjs                   # re-fetch the housing evidence (network, DataSF only)
node scripts/agents-civilization.mjs                # regenerate the registry (deterministic)
CORE_BASE=http://127.0.0.1:8000/ node scripts/v7-journey-audit.mjs <cdp-port> <out>   # own headless Chrome only
```
To reset the agent runtime in a browser, run `localStorage.removeItem('core.civ.v72')` in the console.
