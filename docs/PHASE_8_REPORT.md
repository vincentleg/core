# Phase 8 — The Living Civilization (observable, controlled): report

Status: **COMPLETE on 2026-10-14**, with the limitations in §L. Baseline `725261d`, fast-forwarded to `fa438f7` (the first scheduled refresh). Phase 9 has **not** started.

Companion documents: [audit](PHASE_8_AUDIT.md), [agent architecture](PHASE_8_AGENT_ARCHITECTURE.md), [security review](PHASE_8_SECURITY_REVIEW.md), [performance](PHASE_8_PERFORMANCE.md).

## A. Key figures (from data, 2026-10-14)

| Quantity | Value |
| --- | --- |
| Registered profiles | **68** |
| Executable | **24** (17 rule-based, 7 model-assisted) |
| Actively executing on the public site | **0** (on the founder's machine, only while `scripts/supervisor.mjs` runs) |
| Discoverable in the world | **68 / 68** (filters: all, executable, recorded work, active, domain, team) |
| Agents with recorded work | **23** (Phase 7 reported 8, which counted only model-assisted recordings) |
| Recorded work items | 3 model-assisted missions, 11 rule-based missions, 37 local operations (deterministic) |
| Motion | **Illustrative** by default (labelled); **recorded** in replay; **live** only from the local supervisor |
| Cost | **$0** |

## B. The four founder issues

| Issue | Root cause (see the audit) | Fix |
| --- | --- | --- |
| 1. Clicking an agent did not open a useful profile | The click opened the whole Organisation panel, with the dossier below the fold | A floating **agent card**, opened by any avatar, WebGL figure, collaborator or problem link, with overview and 7 tabs. Audited: **every rendered avatar opens its own card**; WebGL figure clicks too |
| 2. Only about five agents visible | The default showed only the flagship mission's participants | **All 68** are shown by default, distributed in **13 virtual working zones**. Zone aggregates at city zoom, WebGL figures in the corridor, articulated avatars up close |
| 3. Agents static, in a line | Idle meant standing; rest positions were on consecutive segments of one street | Seeded **illustrative walks** on the OSM sidewalk, crossing and footway network (10,140 nodes) inside each zone. Walking cycle, turning, bob, trail, arrival. Audited: 2-D spread and positions changing |
| 4. No sense of activity or organisation | No operations layer, no problem ↔ agent links | **Local supervisor** with a persistent queue and recorded operations. Problems on the map linked to agents and investigations. Typed collaboration links and a timeline in replay. Civilisation dashboard from data |

## C. Agent profile

Seven tabs, detailed in [PHASE_8_AGENT_ARCHITECTURE.md](PHASE_8_AGENT_ARCHITECTURE.md):

| Tab | Content |
| --- | --- |
| Aperçu | ID, domain, specialisation, capability, status, real engine, tools, recorded work, location type, last activity; follow, mission, collaborators and evidence actions |
| Mission | Current assignment or "Aucune exécution en cours.", assigned problems, deliverable, missions with fingerprints and replay |
| Organisation | Supervisor, supervised agents, collaborators, reviewers, escalation |
| Connaissances | Approved and consulted sources, collection, missing information; "agents do not retrain" |
| Activité | Completed and pending work, tools, evidence, accepted and rejected statements, disagreements |
| Déplacement | Position type, network, speed, recorded routes, follow and return |
| Sécurité | Permission, prohibited actions, human approval, last audit hash |

Empty states are explicit, and nothing is invented.

## D. Movement

| Mode | Source | Label |
| --- | --- | --- |
| Illustrative | Seeded routes on mapped pedestrian ways within virtual zones, ×4 speed | "ILLUSTRATIF … aucun travail, aucune visite réelle", "·illustr." |
| Replay | Recorded logs; routes now also on the OSM pedestrian network | "RELECTURE", recorded times, playback speed |
| Live (local only) | `.core-local/live.json` from the supervisor | "SUPERVISEUR LOCAL ACTIF" / "EXÉCUTION LOCALE RÉELLE" |

**Follow mode:** smooth centring, pitch capped at 60°, interrupted by a user drag, returns to the previous camera. In the audit the agent stayed under 25 m from the centre and the zoom was restored.

## E. Collaboration

During a replay, links are typed (disagreement, request, evidence transfer, review), and each is traced in Node tests to a recorded `disagreements`, `requests` or `board` entry. A timeline shows the recorded event types and the theatre lists the derived structured messages. In the flagship replay that means 15 links and 36 timeline events.

## F. Operations (local, bounded, honest)

`scripts/supervisor.mjs`:
- **Pipeline:** intake from the problem registry (one task per segment, idempotent per snapshot), planning (classify, assign), deterministic mission, gateway, **human review**.
- **Controls:** state machine (`src/task-queue.js`), SHA-256 hash-chained events, resumable, time budget, attempts, concurrency 1, pacing, no network, no shell, no model, a **single-writer lock**, emergency `stop`, and `resume`/`approve` only by `human:<name>`.
- **Demonstrated on 2026-10-14:**
  - a run with 3 s pacing showed 12 agents as *queued* in the browser;
  - `stop` cancelled 33 pending tasks and was recorded in the chain, which still verifies;
  - a second supervisor and a non-human resume were refused.
- **Recorded:** 37 deterministic investigations (21 awaiting human review, 16 needing evidence) in `data/operations/log.json`. A Node test re-executes one and **reproduces its fingerprint**.

## G. World Problems Registry

All 98 problems now carry:
- a declared severity rule (not validated);
- observation and verification dates;
- related problems;
- interventions marked unverified;
- confidence;
- the human decision status (none recorded);
- assigned agents and investigation state from recorded operations: 69 awaiting human review, 26 needing evidence, 3 open questions with no CORE tool.

Problems are drawn on the map (zoom ≥ 14, colour by status), and problem ↔ agent ↔ evidence navigation works in both directions.

## H. Interface

- **Map first:** a compact **Population** bar with filters, the motion mode and the problems switch; the legend appears on hover.
- **Cards:** floating agent and problem cards that close the workspace instead of covering the city.
- **Civilisation dashboard:** registered, executable, running, queued, recorded, agents with work, domains, **0 verified outcomes**, 98 unresolved problems.
- **Kept from Phase 7:** the landing, ENTER CORE, five sections and camera presets.
- **Mobile:** cards become bottom sheets.

## I. Data refresh

**Diagnosis:**
- The configuration is valid: active workflow on `main`, Actions enabled.
- **2 scheduled runs observed for 4 slots**:
  - 08:41 UTC: success, about 2 h 24 min late;
  - 14:30 UTC: **failed**, about 2 h 13 min late.
- The cause of the failure is a **latent time-dependent bug in a Phase 3 test**. It assumed all sources were last attempted at the same moment, which stopped being true once real scheduled runs became staggered. The test was fixed to check each source's own interval.

**Interface:** the data-health view now shows:
- scheduled runs observed against cron slots;
- trigger type of the last success (scheduled or manual);
- last attempt;
- data age, with a **stale warning beyond 6 h**, also shown in the navigation bar.

**Not claimed:** reliable 3-hourly refresh is **not** claimed; GitHub cron is best-effort.

## J. Privacy and security

See [PHASE_8_SECURITY_REVIEW.md](PHASE_8_SECURITY_REVIEW.md).

- **Fonts:** self-hosted (OFL), so no Google requests.
- **Privacy notice:** `privacy.html` describes actual behaviour; no compliance claim.
- **CSP:** `font-src 'self'`.
- **OSM network:** under ODbL, entered in the data policy.
- **Agent security controls:** all tested.
- **Fixed:** the emergency-stop race.
- **MapLibre:** stays on unpkg with SRI, because repository rules forbid committing dependencies. That is the founder's decision.

## K. Tests, browsers, performance

| Check | Result |
| --- | --- |
| Node | **100/100** (93 + 7 Phase 8) |
| Chrome 155 audit | **146/146** (136 earlier, 4 of them adapted to the new design, plus 10 Phase 8 checks) |
| Negative audit | **12/12** |
| Firefox 122 | **Blocked**: headless start fails on macOS 27.0.1 (`sandbox_extension_issue_file_to_process … Operation not permitted`, no remote listener after 30 s, also outside the tool sandbox) |
| Safari | **Not run**: needs `safaridriver --enable`, a machine-wide setting not changed |

**Manual procedure for Firefox and Safari:**
1. Run `python3 -m http.server 8000 --bind 127.0.0.1`.
2. Open http://localhost:8000/#app.
3. Click "Pilote San Francisco".
4. In the Population bar, select "Tous (68)" and zoom to the street.
5. Click several avatars; each must open its own card.
6. Follow an agent, then "Revenir à la vue précédente".
7. Civilisation → "Relire dans le monde".
8. Tick "Problèmes" and click a problem, then an agent in the card.
9. Check the console for errors.

**Bug found by the audit and fixed:** a filter click in the Organisation view started an asynchronous re-render that finished after the visitor had moved to Missions, and overwrote that view. The Organisation and Problems renders now abort when the visitor has left.

**Performance:** the full population adds no measurable frame-rate cost in any view (medians of 3 runs). Phase 7's DOM approach gave 17 fps at the mission view with 24 avatars. Heap is stable over repeated navigation and listeners do not accumulate. See [PHASE_8_PERFORMANCE.md](PHASE_8_PERFORMANCE.md).

## L. Limitations

- **Illustrative motion:** most motion is illustrative by necessity, since only 23 agents have recorded work and nothing runs on the public site. It is labelled everywhere.
- **Zones:** virtual working domains placed on the map for navigation. Their location has no meaning.
- **Pedestrian network:** mapped geometry, not surveyed accessibility; routes outside the bounding box are not possible.
- **Supervisor:**
  - runs rule-based investigations only (no model tasks by default);
  - continuous operation needs the machine awake and the process running;
  - recorded operations are published only by a human commit.
- **Verified outcomes:** none (0). Problems are unresolved, and no human decision is recorded.
- **Browsers:** Firefox and Safari are unverified.
- **Hosting and privacy:** the public site remains on GitHub Pages (non-commercial); MapLibre is still on a third-party CDN.
- **Scheduled refresh:** unreliable timing, and its first failure was caused by a test bug that is now fixed. CI confirmation is pending the next run (§M).

## M. Deployment

Recorded after the push, below.

## N. Phase 9 recommendations

1. **Live local missions made visible:** let the supervisor run *approved* model-assisted tasks (bounded `maxModelCalls`, human gate) and publish their recordings, so more agents gain real history.
2. **Second operational domain** with a defensible method and data, for example traffic safety from public collision data with a privacy review.
3. **Reliable refresh at $0:** add a free secondary trigger, such as the supervisor dispatching the workflow when the published data is older than 6 h (labelled manual), and keep the cron.
4. **Founder decision on vendoring MapLibre** (privacy) and a trademark search.
5. **Browser coverage:** run Firefox on another machine and a manual Safari pass using the procedure in §K.
6. **Human review UI:** let a named reviewer close a task (`approve`) from a local page, recorded in the chain.
