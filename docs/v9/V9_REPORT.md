# CORE V9 — Product completion report

Branch `v9/product-completion` (created from `v8/civilization-intelligence`, `77e7191`). Local prototype: nothing has been merged, deployed or published. All dates are 2026-10-16.

## A. What was implemented
- **Purpose-first opening.**
  - The headline reads « A parallel world built to solve problems in the real one ».
  - **Launch CORE Demo** is the primary action. A five-step explanation follows: Real Earth → CORE World → Human + AI → tested proposals → real-world review.
  - Real Earth, CORE World and Hybrid View are explained, and the explanation can be skipped.
- **Languages.**
  - English is the default everywhere, with a complete French translation, through one runtime (`src/i18n/i18n.mjs`).
  - Every supported page re-renders live when the language changes, including open panels, the demo, the simulation, Knowledge answers, Dialogue, the report and the manifesto.
  - Eight more languages are listed as planned, not offered.
- **Missions and agents.**
  - 11 San Francisco missions built from dated public data: findings computed by code, declared gaps, competing hypotheses.
  - Each mission has a workspace, a team view and inspectable agent cards.
  - About 500 registered agent identities, driven by a deterministic engine and labelled as such.
- **Real local reasoning.** `src/intelligence/investigate.mjs` runs six roles:
  - coordinator, domain analyst and synthesis are **local-model inference** (Ollama, qwen3:8b, loopback only);
  - the evidence researcher and simulation specialist are **deterministic tools**;
  - the scientific critic combines model objections with a **deterministic verifier and within-noise guard**.
  - Every step shows its provenance and status. Without a model, the UI says « Local AI reasoning is unavailable. Recorded research and deterministic tools remain accessible. »
- **Traffic.** Recorded SUMO runs are replayed as 3D cars and buses at city scale. The panel shows scenario cards, a plain-language reading and 95 % intervals, and carries the label « Recorded SUMO simulation — synthetic demand, uncalibrated model ».
- **Demo.**
  - 15 stages, available as an autonomous tour or step by step.
  - Controls: Previous / Next / Pause / Restart / Exit, plus optional narration.
  - The tour pauses when the user interacts with the map.
- **Contribution.**
  - The user notices something, then structures it with rules or the local model (the UI shows which) and edits it.
  - They then choose **Keep private** or **Share with mission**. Sharing requires explicit consent.
  - Agents run a form-only evaluation, and My CORE tracks the contribution.
- **Companion.** Typed actions and grounded answers that cite finding ids. Voice works only with on-device recognition; typed input is always available.
- **Knowledge, Dialogue and Commons.**
  - Cited Knowledge answers, refusals and validator messages are bilingual, and Knowledge now understands English questions.
  - The Dialogue room and mission team session, Labs, Arena, Academy, network, debate, continuity, institutions and TRUST are all bilingual.
  - The avatar studio, Progress page (with Kardashev formula and uncertainty), 20-section mission report and privacy notice are bilingual.
- **Manifesto and brief.**
  - **The CORE Manifesto**: 14 chapters, about 3,160 English words, with a full French translation, contents and the ten working principles.
  - `docs/INVESTOR_BRIEF.md`: no invented traction, and business models labelled as hypotheses.
- **Bugs fixed during V9.** A toast that never cleared. Mission team session and mission report showing raw bilingual objects. French leakage of contribution states, recorded confidence levels and expert tags. On phones, the demo controls were outside the viewport; they are now sticky.

## B. Validation (recorded in `.core-local/v9/audit/`, not committed)
- **Node test suite:** 261/261. `node scripts/verify.mjs` passed: full suite, integrity and CSP, fresh runtime proof.
- **V9 browser audit** (`scripts/v9-journey-audit.mjs`, headless Chrome 155, CDP port 9251, local server 127.0.0.1:8017), covering tests A–J:
  - **Desktop 1440×900:** 80/81. The one failure was an audit timing bug in the tour check: it read the last stage's status before it was written. It was fixed and re-verified by the tour-only run below.
  - **Tour only, desktop:** 5/5.
    - The autonomous tour went through **all 15 stages unattended in 262 s**.
    - Every stage reported its scene as ready, with no fallback, and the tour ended on its conclusion.
    - No page errors, and no network hosts beyond self, map tiles, NASA GIBS, terrain tiles and loopback Ollama.
  - **Phone 390×844:** 78/78 (tour skipped).
- **Local reasoning (test E):**
  - It ran in the browser with qwen3:8b in **67 s**, producing 7 steps.
  - Model steps show « local model (qwen3:8b) » and deterministic steps show « deterministic tool ».
  - The evidence step cites finding ids, and the simulation step reads the recorded results (e.g. S0 car 182±4 s).
  - The answer is labelled « Draft answer — unreviewed, written by the local model ».
- **Language (test B):**
  - The French-leak detector passed on every World panel and on 21 pages or sections, in English.
  - Switching to French with the demo, a mission or the simulation open updates them, and switching back restores English.
  - The manifesto, report and Knowledge answers are in French when French is selected.

## C. Known limitations (honest status)
- **No calibration.** Simulations use synthetic demand and are uncalibrated. No public traffic counts or signal timing were found, and the Muni GTFS licence was not accepted.
- **Mostly deterministic agents.** Only explicitly marked steps use a model. Local inference needs Ollama, qwen3:8b (about 5 GB) and a capable computer.
- **No reviewers or institutions.** No verified human reviewer, institution or partner exists. **Verified real-world impact: 0.**
- **Coverage gaps.**
  - Voice has not been verified in a real (non-headless) browser. Firefox and Safari have not been verified.
  - The legacy pages (`index.html` Intelligence, `world-classic.html`, `corridor.html`, `control.html`, `research.html`) remain French-only archives outside the supported experience.
- **Phone layout.** At 390 px the TRUST label is clipped at the right edge of the top bar. The audit found no hidden primary action or horizontal scroll.
- **Untranslated data and agent text.**
  - The recorded French text of the problem registry and SUMO files is shown in English through CORE's own mapping. Any string not covered is marked « (original in French) ».
  - The local model's free text can contain stray characters.
- **Older audits.** The V7, V7.2 and V8 journey audits encode the pre-V9 interface (French default, 10 languages) and are superseded by the V9 audit. They are not part of `verify.mjs`.

## D. Is it ready for a live investor demonstration?
**Yes, as an honest local prototype demo** on the founder's machine:
- local server;
- Ollama running with qwen3:8b for the live investigation;
- Chrome.

It is **not ready** for a public or remote demo, because it is not deployed, and any claim of calibration, autonomy, adoption or impact would be false.

Before going live, rehearse once on the presenting machine: check that Ollama is running, and allow about 1 minute for the investigation. If the model is unavailable, the product states it, and the recorded research path still works.

## E. Restart
```sh
cd ~/core && git switch v9/product-completion && git pull
python3 -m http.server 8000 --bind 127.0.0.1      # then open http://localhost:8000/world.html
ollama serve & ollama pull qwen3:8b                # optional, free, local: enables the live investigation
node --test test/*.test.js                         # 261/261
node scripts/verify.mjs                            # stage runtime changes first
# browser audit (dedicated headless Chrome with --remote-debugging-port=9251; never 9222):
CORE_BASE=http://127.0.0.1:8000/ node scripts/v9-journey-audit.mjs 9251 /tmp/core-v9 1440 900
CORE_BASE=http://127.0.0.1:8000/ node scripts/v9-journey-audit.mjs 9251 /tmp/core-v9-phone 390 844 --skip-tour
```
**Demo entry points:**
- `world.html#demo` — autonomous tour or step by step;
- `world.html#problems`;
- `world.html#investigate=mission.sf.mobility`;
- `world.html#sim=B&play=1`;
- `world.html#contribute`;
- `report.html#mission=mission.sf.mobility`;
- `manifesto.html`.

## F. V9.2 — autonomous demo and hero fixes
- **Autoplay root cause.** The autonomous tour advanced only when nothing interfered. Three faults made a real user stall:
  - the autonomous panel still showed a **Next** button, with no sign of automatic progress;
  - any pointer-down on the map **paused the tour indefinitely** until « Resume » was clicked;
  - each stage's scene actions (`await st.run(E)`) were **not time-boxed**, so a camera flight that never resolved (for example, map animation suspended in a background tab) meant the auto-advance timer was never armed.

  In addition, `demo.mjs` was imported without a version, so a browser could keep a stale cached copy: Python's server sends no cache headers.

  Fixes, all in the existing controller (`src/earth/demo.mjs`, `app.mjs`):
  - autonomous mode has no Previous/Next; it shows a live « Next stage in N s » countdown, Pause/Resume, Restart and Exit;
  - map interaction pauses the tour briefly, and it resumes on its own after 8 s;
  - stage actions are raced against the stage timeout;
  - the module is imported as `demo.mjs?v=9.2`;
  - the final stage offers « Replay » and « Explore CORE ».
- **Real-path test.** `scripts/v9-autoplay-test.mjs`:
  - fresh session;
  - **trusted mouse clicks** on the visible « Launch Demo » button and the autonomous option;
  - then no click, key or programmatic stage change.

  Result: stages 1→15 advanced by themselves in 258 s and reached the conclusion with Replay and Explore. The manual mode stayed on stage 1 for 25 s and advanced one stage on Next. No page errors.

  A separate probe confirmed that a map drag pauses the tour and that it resumes and advances without any click.
- **Hero.**
  - Headline « CORE — Creation Of Reborn Earth », followed by the statement, the mission subtitle (Kardashev Type I, then one day Type II) and the supporting sentence.
  - Actions: « Launch Demo », « Explore CORE », « Read Our Manifesto ». The French versions are as specified.
  - The prototype note now states that the Kardashev goal is a long-term aspiration, neither guaranteed nor imminent.
  - Checked in the browser in English and French.
- **If a browser still shows the old behaviour:** reload once with Cmd+Shift+R. The page itself may be cached.
