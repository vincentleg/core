# Phase 8 — agent civilisation architecture

## Modules (separation required by the brief)

| Concern | Module |
| --- | --- |
| Agent registry, identities, permissions | `src/org.js` (68 frozen profiles, `CORE-XXX-NNNN`) |
| Capabilities, tools | `src/tools.js`, `src/specializations.js` |
| Execution | `src/missions.js` (rule-based), `src/cognitive.js` (model-assisted, local Ollama only) |
| Mission orchestration, queue | `src/task-queue.js` (persistent state machine), `scripts/supervisor.mjs` (local, bounded), `src/scheduler.js` (browser session) |
| Evidence and provenance | Tools' evidence records, `src/data-policy.js`, snapshot manifest checksums |
| Problem registry | `scripts/problems.mjs` → `data/problems/registry.json`, `src/problems-view.js` |
| World positions and zones | `src/agent-population.js` (pure, tested in Node) |
| Animation engine and rendering | `src/agent-motion.js` |
| Agent profile UI | `src/agent-profile.js` |
| Collaboration visualisation, replay | `src/agents-world.js` |
| Activity and event log | Mission logs, `data/operations/log.json` (hash-chained) |
| Data refresh health | `src/civ.js` (`renderHealth`) |
| Security and policy | `src/data-policy.js`, `scripts/csp.mjs`, `.githooks`, `scripts/integrity-check.mjs` |

## Population

**Counts** (from the data, never assumed):

| Category | Count |
| --- | --- |
| Registered profiles | 68 |
| Executable | 24 (17 rule-based, 7 model-assisted) |
| Coordination-only | 29 |
| Unavailable | 15 |
| Agents with recorded work | **23** (union of the 3 model-assisted recordings, 11 rule-based recordings and 37 local operations) |
| Running on the public site | 0 |

**Zones.** There are 13 virtual working domains covering all 28 departments:
- the domains are governance, mobility, infrastructure, environment, energy, risk and public safety, accessibility, planning, public health, water, climate, data verification, and scientific review;
- each zone's territory is a deterministic Voronoi cell of mapped pedestrian nodes within 900 m of the corridor, using farthest-point anchors;
- zones are organisational and **not real offices**; the map says "Zone virtuelle".

**Status.** Each profile gets one primary status, the first that applies in this order: executing, queued, recorded, available, available-local, coordination, unavailable.
- *Executing* and *queued* only come from a live source: session missions, or the local supervisor's `live.json` read on localhost.
- No avatar is ever labelled as working without such a source.

**Filters.** All, executable, recorded work, active, by domain (zone), and by team (lead plus the agents it supervises).

## Motion

| Mode | Source | Disclosure |
| --- | --- | --- |
| **Illustrative** | Seeded walks (`prng(code)`) between nodes of the agent's zone on the OSM pedestrian network: sidewalks, crossings, footways | "ILLUSTRATIF … aucun travail, aucune visite réelle", "·illustr." on tags, profile "illustratif — pas une inspection physique", speed ×4 stated |
| **Replay** | `agents-world.js` drives positions and states from a recorded mission log, with routes on the same network | "RELECTURE", recorded timestamps, playback speed, typed links |
| **Live (local)** | Agents of the task the local supervisor is running stand at that task's segment; queued agents are coloured as queued | "EXÉCUTION LOCALE RÉELLE" / "SUPERVISEUR LOCAL ACTIF"; never fetched on the public site |

**Pedestrian network** (`data/osm/walk-network.json`):
- built from a single Overpass query (`scripts/osm-walk.mjs`), under ODbL with attribution;
- keeps 4,150 ways, i.e. 10,140 nodes and 11,495 edges, the largest connected component;
- excludes indoor ways, building passages and private ways, so routes do not cross buildings or water;
- does not assert accessibility (width, ramps and obstructions are unknown).

**Rendering:**

| Zoom | What is drawn |
| --- | --- |
| < 13.5 | Zone aggregates (count and name) |
| 13.5–15.8 | WebGL figure icons, two walking frames per status colour |
| ≥ 15.8 | Articulated DOM avatars (head, neck, torso with a light core, arms with hands, legs with feet), only for agents in view and capped at 40 (20 on low-end devices); the rest stay WebGL |

- **Avatar motion:** avatars turn to face their direction, have a walking cycle with a body bob, a motion trail, an arrival settle and a selection halo.
- **Animation loop:** a single `requestAnimationFrame` loop, paused when the tab is hidden.

**Follow mode:**
- smooth centring, with pitch capped at 60° to avoid clipping;
- interrupted by a user drag or wheel;
- "Revenir à la vue précédente" restores the saved camera.

## Profile card

Clicking an avatar, a WebGL figure, a collaborator, a problem's agent or any list entry opens **that agent's** card: an overview, then seven tabs.

| Tab | Content |
| --- | --- |
| Aperçu | ID, domain, specialisation, capability, status, real engine, tools, recorded work, displayed location type, last activity; actions: follow, mission, collaborators, evidence |
| Mission | Current assignment (live or replay, or "Aucune exécution en cours."), assigned problems with severity and investigation state, expected deliverable, missions with dates, fingerprints and decisions, replay links |
| Organisation | Supervisor, supervised agents, collaborators from recorded work, reviewers, escalation path to the gateway and human review |
| Connaissances | Approved sources through its tools, sources actually consulted, knowledge collection and version, missing information, limitations; it states that agents do not retrain |
| Activité | Completed, rejected and pending work, tools used, evidence produced, accepted and rejected statements, disagreements; recommendations: none (humans decide) |
| Déplacement | Displayed position and its type, network provenance, displayed speed, recorded route history during a replay |
| Sécurité | Permission (frozen), no autonomous execution, human approval always, last audit event (hash), prohibited actions |

## Collaboration

Replay links are typed, and each one is traced to a recorded record (tested in Node):

| Link type | Source |
| --- | --- |
| **Disagreement** | `mc.disagreements` |
| **Request** and **evidence transfer** | `mc.requests` fulfilled by another agent |
| **Review** | The review-phase reviewer to the agents whose statements it checked |

The theatre also shows a timeline of recorded event types: mission started, source consulted, specialist consulted, model interpretation, report, decision proposed, human approval required. It places a cursor on that timeline and states the playback speed.

## Problems ↔ agents ↔ missions

`scripts/problems.mjs` enriches each of the 98 problems with:
- a declared severity rule (not validated);
- observation and verification dates;
- related problems on the same segment;
- proposed interventions marked unverified;
- confidence;
- the human decision status ("aucune décision humaine enregistrée");
- the **assigned agents** and **investigation state** taken from `data/operations/log.json`.

**Navigation between them:**
- problems are drawn on the map, and a click opens a card listing the agents;
- an agent's card lists its problems;
- a problem links to its evidence and to the recorded mission fingerprint.

## Local operations (honest continuous work)

`scripts/supervisor.mjs` runs only on the founder's machine and only while the process runs; when the machine sleeps, work stops.

**What it does:**
1. Takes the problem registry in as one task per corridor segment. Intake is idempotent per snapshot.
2. Plans every task: it classifies them and assigns eligible rule-based specialists with the existing planner.
3. Runs each deterministic mission: tools on the verified snapshot only, the gateway, then **awaiting human review** or **needs evidence**.
4. Paces tasks (`--pace-s`), so queued work is visible without faking long runs.

**Persistence:** `.core-local/queue.json` (git-ignored), with every transition hash-chained. A restart resumes: a task left running goes back to assigned.

**Commands:**
- `run`, with `--cycles`/`--interval-min` for periodic bounded runs while the machine is awake;
- `status`, `stop` (emergency), `resume --reviewer human:<name>`, `approve`, `cancel`;
- `--record` publishes the log to `data/operations/log.json`.

**Recorded so far** (from the deterministic engine, on snapshot 2026-10-13T18:25Z):
- 37 investigations: 21 awaiting human review and 16 needing evidence;
- 12 distinct specialists and reviewers involved;
- a Node test re-executes a recorded mission and reproduces its fingerprint.

**Not done in Phase 8:** model-assisted tasks under the supervisor are refused by default (`maxModelCalls = 0`). Live model missions remain `node scripts/cognitive.mjs` (local Ollama), as in Phase 5.

## Knowledge acquisition

Unchanged in substance. Knowledge is a versioned library of documents approved by humans (`scripts/learn.mjs`: discovery and proposals; only `human:` reviewers approve).

The profile states that agents **do not retrain**: retrieval indexes are updated, the model weights are never changed. Source discovery, validation, retrieval, extraction, evidence storage, interpretation, review and update stay separate steps (Phase 4–5 design).
