# CORE V8 — Civilization Intelligence: delivery report (2026-10-16)

**Branch:** `v8/civilization-intelligence` (local), based on V7.2 (`af1395f`).
- Nothing was pushed, merged, deployed or published.
- Cost: $0. No account, API key, paid service or external AI.
- The approved V7.2 design is kept. Additions follow the brief: simulation layer, companion, participation, four-destination shell, progress, report, manifesto, demo, vehicle.

## Launch locally
```sh
cd <the CORE repository folder> && git switch v8/civilization-intelligence
python3 -m http.server 8000 --bind 127.0.0.1
# http://localhost:8000/world.html                      CORE World (English by default; language picker in the bar)
# http://localhost:8000/world.html#sim=B                recorded SUMO simulation, scenario B (actuated signals)
# http://localhost:8000/demo.html                       « Experience CORE », 12 acts, about 4 minutes
# http://localhost:8000/progress.html  report.html#mission=mission.sf.mobility  manifesto.html
```
- **Companion:** the search button in the bar, or Cmd/Ctrl-K.
- **At street level** (« Humain »): W/A/S/D to move, Shift to run, Space to jump, V for the vehicle, E to talk to an agent.

## The central loop, as delivered
1. **Discover:** globe → city → street.
2. **Understand:** mission panel with dated findings and declared gaps.
3. **Investigate:** agents' typed work, plus an optional local model with validated proposals.
4. **Simulate:** recorded SUMO runs.
5. **Compare:** scenario panel with 95 % intervals and a noise rule.
6. **Collaborate:** team session, or « I noticed something ».
7. **Review:** form-only evaluation by agents; no human reviewer exists yet.
8. **Propose:** 20-section report, a « proposal for consideration ».
9. **Verify impact:** progress page. Verified real-world impact is **0** and cannot be raised by simulations.

## IMPLEMENTED AND VERIFIED
| Phase | What | Evidence |
|---|---|---|
| 0 | Audit, checkpoint, verified backup at V8 start | `core-all-branches-20261016T192759Z.bundle`; baseline 246/246 |
| 1 | **Shared local reasoning pool:**<br>• 1 worker, budgets, typed JSON-schema jobs (gaps / hypothesis / critique / synthesis);<br>• validation of cited ids and a semantic verifier;<br>• outputs labelled « proposition non revue »;<br>• role-based agents (11 team roles) and geographic directors (North America, Bay Area);<br>• headless worker `scripts/civ-worker.mjs` | Real qwen3:8b run: 4 jobs validated, 1 rejected. `test/civilization.test.js`, `test/intelligence.test.js` |
| 2 | **Agents drawn on the validated OSM pedestrian network:**<br>• standing agents spread over walkway nodes;<br>• moves follow Dijkstra paths;<br>• avatar collisions with building footprints (`blocked()` was referenced in V7 but never defined, so the avatar could walk through buildings: fixed);<br>• agent bumping;<br>• talk range with hysteresis (6 m to start, 12 m to keep);<br>• card in the order: who I am → what I work on → what I found → talk → view simulation;<br>• jump (Space) | V8 audit step 6: 23 agents within 250 m, **0 inside a building**. A raw position was inside one before the fix |
| 3 | **Companion (voice or text):**<br>• the 11 required typed actions, plus share/delete flagged confirm-only and never performed;<br>• deterministic EN/FR parsing, every parameter validated, links built only from validated values, nothing evaluated;<br>• microphone only with on-device `SpeechRecognition` (`processLocally`), never the server-backed `webkitSpeechRecognition`; explicit press, visible indicator, one phrase;<br>• spoken answers off by default and only with local voices | `test/v8.test.js` (parsing, injection, confirm-only). Audit step 3: a typed command plays scenario B; headless Chrome offers no on-device recognition, so the microphone stays off |
| 4 | **SUMO 1.27.1 mobility on the real OSM SoMa network:**<br>• 5 scenarios × 5 seeds, 15-configuration search, verdict;<br>• recorded traces for all 5 scenarios | Earlier commits `f333567`, `95fd35b`; `data/mobility/manifest.json` |
| 5 | **Reversible scenario layer:**<br>• real Folsom lanes re-allocated in red (bus) or violet (bike), never green; actuated signals for B;<br>• 20-second replay of the recorded vehicles (×12), with MapLibre points at city scale and instanced 3D cars and buses at street level;<br>• panel: status, 95 % intervals, noise rule, buses arrived, model limits, search, verdict, reproduce command;<br>• one fixed camera for before/after; removable | Audit step 4: aligned camera, 24 frames in 4 s, reversible. Found and fixed: switching scenario did not stop a running replay |
| 6 | **Participation:**<br>• « I noticed something » → CORE structures it (type, title, mission, related findings, what is missing, personal-data warning) → the team dialogue opens pre-filled → private (encrypted vault) or shared **with consent** → deterministic form evaluation (source, unsourced numbers, overclaims, personal data, relation to findings) → My CORE tracker with stages;<br>• nothing is accepted automatically | Audit steps 7–8; `test/v8.test.js` participation |
| 7 | **Simplified shell:**<br>• Explore / Create / Together / My CORE;<br>• discreet companion, language, Progress, Manifesto, Experience CORE, TRUST | Audit step 1 |
| 8 | **10 languages:**<br>• English default and reference; Arabic right-to-left; English fallback per key;<br>• every non-English string is marked `draft-unreviewed` | Audit step 2; i18n test |
| 8 | **Progress page:**<br>• 7 separate dimensions, no composite score; verified impact 0;<br>• **Kardashev K ≈ 0.731 (2024; 0.726–0.735 for ±10 % on energy)**: 20.26 TW from U.S. EIA public-domain World energy consumption;<br>• formula, conversion, caveats and licence shown; trend chart with band, hover and table | Audit step 9; progress test |
| 9 | **Report:**<br>• `report.html#mission=` builds 20 sections for each of the 11 missions;<br>• « Proposition soumise à examen », never a recommendation; print stylesheet;<br>• `scripts/report-pdf.mjs` prints through your own headless Chrome (`CORE_CDP_PORT`, 9222 refused) | 7-page PDF produced for mobility. Audit step 10; report test |
| 9 | **Manifesto:** original text, ten principles, English reference and French | Audit step 11 |
| 10 | **« Experience CORE »:**<br>• 12 acts, 11 × 20 s + 9 s ≈ 3 min 49 s;<br>• start, pause, next, exit; Space, →, Esc;<br>• ends on « A parallel world to help humanity improve the real one. » | Audit step 12 |
| + | **Prototype vehicle (V):**<br>• capped at 9 m/s;<br>• stopped by building footprints and agents;<br>• labelled a toy, not a traffic simulation | Audit step 6; vehicle test |

## Test results (this Mac, 2026-10-16)
| Check | Result |
|---|---|
| Node tests / `node scripts/verify.mjs` | **262/262** (+16 V8 tests in `test/v8.test.js`) · **full verification passed** (CSP, integrity 550 files, `git diff --check`) |
| **V8 journey** (`scripts/v8-journey-audit.mjs`), 1440×900 / 390×844 | **34/34** / **29/29**. The phone run skips the 5 street-level checks; the street-level 3D view also works on phones but is audited on desktop |
| V7.2 journey | **26/26** / **26/26** |
| V7 journey | **27/27** / **27/27** |
| Commons · V6 journey · classic World · negative paths | **35/35** · **17/17** · **34/34** · **12/12** |
| Main app (`browser-audit.mjs`) | **161/162**. The failing check (browser mission fingerprint vs the recorded Node mission) **also fails on the V7.2 commit `af1395f` today**: it predates V8 and depends on time. Not fixed here |
| Playwright 1.63.0 **WebKit** smoke (7 pages × 1440×900 / 390×844) | **14/14**, 0 page errors |
| **Firefox** | **not run**: the Playwright Firefox build exits at launch in this sandboxed shell (« Could not find profile folder »). The sandbox was not relaxed |

Audit metrics (headless Chromium, vsync-capped):
- World ready in 1.3–1.5 s;
- street level at 60 fps with holograms and the vehicle.

## SIMULATED OR DEMONSTRATION-ONLY
- **SUMO results:** uncalibrated. Demand, signal plans and the bus line are synthetic. « Promising » never means « recommended ». Replays are recordings (seed 1), not live simulation.
- **Agents:** deterministic engine identities. Their positions on walkways are a drawing of virtual work points.
- **Evaluation of contributions:** checks form, not truth. No human reviewer exists; every dossier waits for human review.
- **Companion:**
  - parsing is a fixed pattern list (English/French);
  - other languages fall back to English commands;
  - voice depends on the browser offering on-device recognition (not verified on a real browser here).
- **Translations:** the shell and key World controls are translated. Page bodies (missions, panels, report) remain French. Every non-English string is a model draft, unreviewed.
- **Vehicle:** a toy.

## NOT IMPLEMENTED / LIMITS
- **Not available to the model:**
  - no traffic counts;
  - no signal timings;
  - Muni GTFS licence not accepted (founder decision);
  - Census API key needed (founder decision, from V7.2).
- **Golden Gate SUMO:** not simulated. The companion can fly there.
- **Kardashev:**
  - one source (EIA);
  - ±10 % is a stated CORE assumption, not an EIA error bar;
  - OWID primary energy was not used because the Energy Institute's third-party terms are unverified (FD09).
- **Not tested:**
  - Safari itself, real phones and GPUs;
  - screen readers;
  - on-device speech recognition in a real browser;
  - long sessions.
- **Scratchpad:** the earlier SUMO Python environment lived in a session scratchpad that is no longer available. Re-create it as `manifest.json` → `reproduce` describes (`eclipse-sumo==1.27.1`, `sumo-data==1.27.1`, `pyproj==3.6.1`).
- **Founder decisions** (all from earlier versions, nothing activated):
  - Census key;
  - GTFS licence;
  - hosted accounts;
  - publishing the branches;
  - the avatar `.glb` licence question;
  - the `AGENTS.md` « pas de phase cosmétique » wording versus this brief.
