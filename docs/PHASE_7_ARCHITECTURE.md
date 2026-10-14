# Phase 7 — architecture

Phase 7 adds no new dependency and no build step. It keeps MapLibre GL 5.7.3, pinned, now loaded with Subresource Integrity. The new code is plain scripts loaded by `index.html`, plus two Node scripts.

## New modules

| File | Size | Role |
| --- | --- | --- |
| `src/entry.js` | 5 KB | Opening experience. NASA Blue Marble raster layer (`natural-earth`) and the wordmark; **ENTER CORE** fades the imagery into the CORE style, reveals a graticule "network" layer, then flies over North America to San Francisco. Also: skip ("Accès direct"), `#app` direct access, once-per-session landing, instant entry with reduced motion, shorter flights on small or low-power devices |
| `src/agents-world.js` | 27 KB | Agent avatars (DOM markers sharing one SVG markup, CSS animation by state, level of detail); corridor street graph and Dijkstra routing; replay of recorded missions; structured messages; mission theatre (play, pause, scrub, speed); agent-follow camera |
| `src/civ.js` | 14 KB | Civilisation views: World Problems Registry, activity dashboard with the session scheduler, data health (snapshot, feeds, GitHub Actions runs) |
| `src/scheduler.js` | 8 KB | Bounded mission queue: states, retries, time budget, hourly limit, human approval, emergency stop, SHA-256 hash-chained audit log. Works in Node and the browser |
| `scripts/problems.mjs` | 7 KB | Builds `data/problems/registry.json` from the verified snapshot and the recorded missions |
| `scripts/csp.mjs` | 2 KB | Writes and checks the Content Security Policy meta tag (inline-script hash) |
| `assets/brand/*.svg` | 2.5 KB | Original wordmark, mark and lockup |

## Changed modules

- `src/org.js`: stable machine IDs (`CORE-<DEPT>-<NNNN>`), derived from the department and the registry order.
- `src/platform.js`: five navigation groups with sub-tabs, `openAgent`, the agent dossier in five sections, the civilisation truth panel and hierarchy table, and https-only links for external feeds.
- `src/camera.js`: view presets, a 75° pitch limit, and a 70° pitch limit above zoom 17.
- `src/data-policy.js`: NASA GIBS and the GitHub API are added, as display and operations sources.
- `index.html`: landing, brand, navigation, camera toolbar, map style, CSP, SRI, avatar and theatre styles.

## Navigation

The five top-level sections are:

| Section | Sub-views | Previous names |
| --- | --- | --- |
| **Monde** | — | World |
| **Civilisation** | Organisation, Problèmes du monde, Activité | Agents (Organisation) |
| **Intelligence** | — | Intelligence |
| **Missions** | Missions, Simulations, Décisions | Missions, Simulations, Décisions |
| **Preuves** | Données & preuves, Santé des données | Data |

No view was removed. Every earlier section id (`agents`, `sims`, `decisions`, `data`, `demo`, …) still works through `CORE_PLATFORM.show(id)` and the hidden `#legacy-sec` buttons used by the audits. The guided demo stays in the left dock.

## Data flow of a replay

```text
data/missions/cognitive/<id>.json (recorded live run: log, toolCalls, evidence, board, responses, requests, disagreements, decision)
   │  buildReplay (pure function, tested in Node)
   ├─ steps: one per recorded tool-call / model-call / report / route event of an agent
   │     location = where the data used by the tool lives
   │        (cited record → its geometry; segment tools → segment; graph.link → feed item;
   │         library, policy and evidence checks → the virtual coordination point)
   │     path = Dijkstra on the corridor graph (44 segments + cross-street connectors flagged approximate)
   ├─ links: recorded disagreements, drawn while the disputing agent reports
   └─ messages: derived from board reports, responses, specialist requests, evidence requests and the gateway decision
   ▼
frame(t): avatar position and state from the step active at t; route line for the selected agent; theatre clock = latest recorded time reached
```

**Pacing.** The recorded order is kept: a step never starts before a step recorded more than 50 ms earlier. Events recorded together may play together. Recorded gaps are compressed (÷40, 0.18–2.2 s) and walks take 0.8–4 s. The banner states both points.

## Street graph

- **Nodes:** the endpoints of the 44 corridor segments (snapshot `corridor.geojson`).
- **Edges:** the segment geometry itself.
- **Cross-street connectors:** the snapshot has no cross streets, so mutually-nearest Folsom/Howard nodes within 240 m are linked by straight lines. Such paths are flagged *approximate* in the avatar tooltip and the dossier.
- **On-network test:** an endpoint counts as on the network within 30 m of a street line.
- **Effect:** walks follow the street centrelines and never cross blocks, except on the flagged connectors.

## Content Security Policy

Delivered as a `<meta>` tag, because GitHub Pages cannot set headers. See [PHASE_7_SECURITY_REVIEW.md](PHASE_7_SECURITY_REVIEW.md).

## Trade-offs

- **DOM markers instead of a WebGL humanoid layer:**
  - accessible: buttons, focus, labels;
  - cheap at this scale: ≤ 24 markers measured at about 60 fps;
  - no new library.

  A custom WebGL layer (instanced meshes) would be needed for hundreds of agents.
- **Landing imagery limited to zoom ≤ 8:** the natural Earth is only an opening view, and the CORE style takes over. No satellite imagery is used at city zoom; that is unchanged since Phase 1.
- **Scheduler is per session in the browser:** it never runs on a timer, and the public site has no server. A persistent scheduler would need a free runner (GitHub Actions), and the unobserved cron must be solved first.
