# Phase 7 — agent civilisation: what is real, what is replayed, what is illustrative

## Categories shown to visitors

The Organisation panel, "Ce que vous voyez dans le monde", computes these counts from the registry and the loaded data:

| Category | Count (2026-10-14) | Meaning |
| --- | --- | --- |
| Registered profiles | 68 | Identities in `data/agents/registry.json` |
| Executable | **24** = 17 rule-based + 7 model-assisted (22 specialists + the deterministic mission coordinator and decision gateway) | Have permitted tools. Model-assisted ones need local Ollama (`qwen3:8b`) |
| Coordination-only | 29 | Global, city and department leads (not executable) |
| Unavailable | 15 | Missing data or tool; shown as such |
| Currently executing | Live count; **0 on the public site** | Tasks running in this browser session (rule-based missions, scheduler jobs) |
| Participants of recorded missions | 8 distinct agents across 3 recorded live runs | From `data/missions/cognitive/index.json` |
| Avatars on the map | Flagship participants, **waiting**; or a **replay**; or every executable profile at **illustrative** rest positions (explicit toggle) | Each avatar says which of these it is |

*Correction to the Phase 7 brief:* the brief mentioned 31 executable agents. The registry has **24** (17 + 7).

## Machine identifiers

`CORE-<DEPT>-<NNNN>`: a three-letter department code (`DEPT_CODE` in `src/org.js`) and the profile's position in the registry. The IDs are deterministic, unique (68/68) and persisted in `data/agents/registry.json`.

| ID | Profile |
| --- | --- |
| `CORE-CMD-0001` | Global coordination |
| `CORE-CTY-0002` | San Francisco mission coordinator |
| `CORE-PUB-0049` | Accessibility analyst |
| `CORE-FOR-0050` | Urban-forestry analyst |
| `CORE-SIM-0048` | Scenario analyst |
| `CORE-RES-0052` | Independent evidence reviewer |
| `CORE-SEC-0051` | Data-policy reviewer |
| `CORE-SAF-0068` | Decision gateway |

## Hierarchy and permissions

| Level | Profiles | Permission | Actual behaviour |
| --- | --- | --- | --- |
| CORE Command | Global coordination (coordination-only); decision gateway (executable) | govern | Common policy. The gateway recomputes every tool and re-validates every statement, and can only make a decision *more* cautious |
| Mission coordinator | San Francisco coordination (executable) | propose | Deterministic routing of a mission to specialists; no decision |
| Domain directors | 28 department leads | propose | Coordination profiles only; not executable |
| Specialists | 22 executable of 37 | read / analyze / review | Run permitted tools; model-assisted ones interpret validated evidence and never compute numbers |

Permissions are fixed in the registry, and no agent can raise its own. Every decision ends in mandatory human review. Nothing authorizes or executes a real-world action.

## Avatar states and their source

| State | Shown when | Source |
| --- | --- | --- |
| `idle` | No step is active | No execution, or between recorded steps |
| `walking` | Moving to the location of the data a tool used | Representation of a recorded tool call; disclosed as "pas une inspection physique" |
| `investigating` | A tool call is shown | Recorded `tool-call` event (tool name, place, recorded time in the tooltip) |
| `reasoning` | A model call is shown | Recorded `model-call` event (tokens and duration in the log) |
| `reporting` | A report is shown | Recorded `report` event |
| `routing` | A routing event is shown | Recorded `route` event |
| `collaborating` | Two agents linked by an amber line | A recorded **disagreement** (`mc.disagreements`) |

No state exists without a recorded event behind it. The Node test `replay: strict recorded order…` checks every replay step against the mission log. The Chrome audit checks that the visible avatars are exactly the mission's recorded participants.

## Structured messages

Each message has these fields: sender (machine ID), recipient, mission ID, recorded time, task, evidence references, result, confidence and supervisor decision. Messages are derived, not generated:

- one report per agent and phase, from the accepted and rejected board statements;
- each recorded response: agree, dispute or precision;
- each specialist request and each evidence request, fulfilled or unfulfillable;
- the gateway decision, addressed to human review.

Their number is checked in Node. The flagship mission yields 24 messages; nothing in them was written for the display.

## Flagship mission

The flagship is `cognitive-fast:5975b8035035`, a real local run on 2026-10-14 at 03:34 UTC: qwen3:8b, 7 model calls, 16 tool calls (9 cached), 242 s. Its question: *"Where can the Folsom / Howard corridor take more street trees without reducing the accessible pedestrian path, and which should wait for planned works?"*

| Agent | Role in the run |
| --- | --- |
| `CORE-PUB-0049` | Investigates, deliberates, revises |
| `CORE-FOR-0050` | Investigates and disputes A1 ("E1 is simulated, not validated") |
| `CORE-SIM-0048` | Scenario |
| `CORE-RES-0052` | Review |
| `CORE-SEC-0051` | Data-policy check |

The gateway decision is **PREUVES SUPPLÉMENTAIRES REQUISES** (more evidence required). The two other recorded runs (an event mission and the Phase 4 deep mission) can be replayed from the same panel.

## Limits

- **Movement:**
  - represents where the data lives; nobody inspects the street;
  - tools that use the knowledge library, the policy register or evidence checks have no location, so they take place at a "poste de coordination virtuel", labelled as virtual;
  - cross-street legs are approximate (the snapshot has no cross-street geometry).
- **No live execution on the public site:** model-assisted missions run only on a machine with Ollama (`node scripts/cognitive.mjs`). Rule-based missions run in the visitor's browser.
- **No faces, no personal traits:** avatars are generic humanoid outlines. Their machine IDs are not people.
