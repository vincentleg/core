# Phase 7 — The Living Civilization: report

Status: **COMPLETE on 2026-10-14**, with the limitations in §G. Baseline `805e249`. Phase 8 has **not** started.

Companion documents: [architecture](PHASE_7_ARCHITECTURE.md), [agent civilisation](PHASE_7_AGENT_CIVILIZATION.md), [security review](PHASE_7_SECURITY_REVIEW.md), [measurements](PHASE_7_MEASUREMENTS.md).

## 0. Audit and baseline (verified, not assumed)

| Claim | Verified on `805e249` |
| --- | --- |
| Node tests | 87/87 |
| Chrome audit | 117/117 (Chrome 155); negative audit 12/12 |
| Production | Serving `805e249` |
| Executable agents | **24** (17 rule-based + 7 model-assisted), not the 31 stated in the brief. 68 registered, 29 coordination-only, 15 unavailable |
| Scheduled refresh | `city-feed.yml` is active and has a valid cron, but has **never** run on schedule. Only 4 manual runs exist (2026-10-14 01:24–01:44 UTC); the 03:17 UTC slot was missed (checked again at 05:28 UTC) |
| Performance baseline | Ready 995 ms; 2,786 KB / 63 requests; heap 23 MB; 60 fps; 48 circles at zoom 14 |

## A. What changed

1. **Brand and entry:**
   - original SVG wordmark (`assets/brand/`): the "O" is a planet with an orbit and a satellite point, under the tagline *Creation of Reborn Earth*;
   - landing over the natural Earth (NASA Blue Marble via GIBS, open data, acknowledged);
   - **ENTER CORE** fades the natural imagery into the holographic CORE Earth, reveals a digital network, then flies to North America and San Francisco;
   - "Accès direct" skip, `#app` direct link, once per session, instant with reduced motion, shorter on mobile and low-power devices.
2. **Navigation:**
   - five sections: **Monde, Civilisation, Intelligence, Missions, Preuves**;
   - simulations and decisions are sub-views of Missions; organisation, problems and activity of Civilisation; data and health of Preuves;
   - nothing removed: every earlier view is still reachable.
3. **Camera:**
   - compact toolbar with views (globe, city, SoMa neighbourhood, Howard 8th–9th street, mission corridor), rotate, orbit, north, reset;
   - agent-follow from the dossier;
   - pitch limited to 75°, and to 70° above zoom 17 (no extreme ground-level angles).
4. **City style:** dimmer road glow, two building material families, sparser street labels.
5. **Agents in the world:**
   - holographic humanoid avatars (head, torso, arms, legs, no face) with idle, walking, investigating, reasoning, reporting, routing and collaborating animations;
   - every state is tied to a recorded event, or the avatar is labelled waiting or illustrative;
   - level of detail by zoom; paused when the tab is hidden.
6. **Living mission replay:**
   - the three recorded live missions replay on the map;
   - agents walk the corridor street network to where the data their tools used is located;
   - an amber line marks a recorded disagreement;
   - a theatre bar (play, pause, scrub, speed, recorded clock) with the banner *RELECTURE — exécution réelle enregistrée … pas une inspection physique*;
   - structured messages derived from the log.
7. **Agent dossiers:**
   - machine IDs (`CORE-PUB-0049` …);
   - five sections: current work, accountability (reporting chain, permission, gateway, human review), identity, knowledge and history;
   - honest empty states ("aucune exécution en cours").
8. **Hierarchy:** CORE Command → mission coordinator → domain directors → specialists, with permissions read from the registry.
9. **World Problems Registry** (`scripts/problems.mjs` → `data/problems/registry.json`, 98 entries):
   - 18 observed (sidewalk below the Better Streets Plan minimum, 2014 widths);
   - 50 potential risks (deterministic permit overlaps, closures, moratoria, repeated works, coordination opportunities);
   - 7 simulated (planting deferred by works);
   - 23 hypotheses (questions agents raised that no CORE source answers);
   - 10 domains listed as "no evidence integrated".
10. **Activity and scheduler:**
    - honest counts, including 0 running;
    - a bounded session scheduler: states, 2 attempts, time budget, hourly limit, human-only approval, emergency stop, SHA-256 hash-chained audit log;
    - nothing runs on a timer.
11. **Data health:** snapshot integrity per dataset, feed sources (last success or error, freshness), and the real GitHub Actions history read live. It says "Aucune exécution planifiée observée" instead of claiming continuous refresh.
12. **Security:**
    - CSP (no inline script except one hashed; quarantined Open-Meteo blocked);
    - SRI on MapLibre;
    - feed links restricted to https.

## B. Visitor walkthrough

1. The Earth appears in natural colours with **CORE — Creation of Reborn Earth**, one sentence on what CORE is, and **ENTER CORE**.
2. ENTER CORE turns the planet into the digital CORE Earth, with a network grid, then flies over North America down to San Francisco.
3. In the city, the participants of the flagship recorded mission wait at the "poste de coordination virtuel" on the Folsom / Howard corridor.
4. **Civilisation → Organisation** says what is real: 68 profiles, 24 executable, 0 running on the public site, 8 agents in recorded missions. "Relire dans le monde" starts the replay.
5. During the replay, agents walk the corridor:
   - the accessibility analyst investigates sidewalk record 8562, cited by the simulation evidence;
   - the forestry analyst disputes the accessibility analyst (amber line);
   - reviewers check evidence;
   - the gateway asks for more evidence.

   The messages panel lists each derived message.
6. Clicking an avatar opens its dossier. "Suivre dans le monde" follows it.
7. **Civilisation → Problèmes du monde** lists problems by knowledge type, with evidence links and gaps. **Activité** shows the scheduler. **Preuves → Santé des données** shows data freshness and the real refresh history.

## C. Agent civilisation

See [PHASE_7_AGENT_CIVILIZATION.md](PHASE_7_AGENT_CIVILIZATION.md): categories and counts, IDs, hierarchy and permissions, the state-to-event mapping, message derivation, and limits. **No collaboration, message or movement is invented:**
- the Node test checks every replay step against the mission log, and the message count against the recorded responses and requests;
- the Chrome audit checks that the visible avatars are exactly the recorded participants.

## D. Security and cost

See [PHASE_7_SECURITY_REVIEW.md](PHASE_7_SECURITY_REVIEW.md).

- **Scan:** integrity scan 0 findings; hooks active and never bypassed.
- **Fixed:** one DOM-injection hardening (feed link schemes).
- **CSP:** feasible as a meta tag and deployed.
- **Legal-risk checklist:** recorded with open items (fonts and IP disclosure, trademark, hosting terms). No compliance claim is made.
- **New external services:** NASA GIBS (open, acknowledged) and the GitHub public API (read-only, unauthenticated). Both are recorded in `src/data-policy.js`. **Cost: $0.**

## E. Tests and performance

| Check | Result |
| --- | --- |
| Node | **93/93** (87 + 6 Phase 7: machine IDs, scheduler, problems registry, replay truthfulness, CSP/SRI, entry/brand/policy) |
| Chrome 155 audit | **136/136** (117 earlier + 19 Phase 7) |
| Negative audit | **12/12** |
| Firefox 122 | Not run: headless start fails (no listener after 30 s), also outside the tool sandbox |
| Safari | Not run: would require enabling remote automation (machine-wide) |
| Ready time | 995 → 973 ms |
| First load | 2,786 → 3,237 KB (+451 KB, mostly NASA opening tiles) |
| Frame rate | 60 fps with 5 replaying avatars and with all 24 shown during orbit |

Details: [PHASE_7_MEASUREMENTS.md](PHASE_7_MEASUREMENTS.md).

## F. Deployment

See the deployment notes appended below (§H), recorded after the push.

## G. Limitations (honest)

- **Scheduled refresh still unobserved:** no `schedule` run has happened since the workflow was created.
  - Possible causes, none confirmed: GitHub drops or delays cron events under load; new schedules may need time or a further push to register.
  - Nothing was manufactured; the data-health view shows the real history.
- **Second browser:** Firefox and Safari still unverified.
- **Movement is representational:**
  - cross-street legs are approximate (no cross-street geometry in the snapshot);
  - tools without a location run at a labelled virtual coordination point.
- **Replay only on the public site:** live model-assisted missions run only with local Ollama.
- **Recorded participants are few:** 8 agents took part in recorded missions, so most executable profiles have no history yet; their dossiers say so.
- **Opening imagery:** low resolution by design (Blue Marble, zoom ≤ 8). City views keep the CORE style; no satellite imagery is used.
- **Privacy and CSP:**
  - `style-src 'unsafe-inline'` remains; no header-based security (GitHub Pages);
  - fonts and MapLibre come from third-party CDNs (privacy item in the review).
- **Not done:** no formal accessibility audit or screen-reader test.

## H. Phase 8 recommendations

1. **Make refresh real:** diagnose the missing cron (re-register the schedule, or use a free external trigger of `workflow_dispatch`), then show the first scheduled run in data health.
2. **Live public missions without a paid model:** keep the public site recorded, and add a reproducible "record a new mission" workflow on the founder's machine, with automatic publication of the recording.
3. **Second city or second corridor:** to prove the problem registry and agent replay generalize.
4. **Privacy hardening:** self-host fonts and MapLibre, drop `style-src 'unsafe-inline'`, add a privacy notice.
5. **Browser coverage:** a Firefox run on another machine, and a manual Safari pass.
6. **Richer geography:** import cross-street geometry so agent routes need no approximation.
