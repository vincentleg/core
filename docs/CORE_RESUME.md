# CORE — resume checkpoint (2026-10-16)

**Branch:** `v9/product-completion`, created from `v8/civilization-intelligence` (`77e7191`). The latest commit is shown by `git log -1`. Nothing has been merged or deployed.

## Restart locally
```sh
cd <the CORE repository folder> && git switch v9/product-completion
python3 -m http.server 8000 --bind 127.0.0.1
# open http://localhost:8000/world.html
#   (demo: world.html#demo · simulation: world.html#sim=B&play=1 · missions: world.html#problems)
# optional local AI: install Ollama, then `ollama pull qwen3:8b` (about 5 GB, free)
node --test test/*.test.js          # 261/261
node scripts/investigate.mjs --mission mission.sf.mobility --question "What could reduce bus delays on Folsom Street?"
```

**V9 delivered:** see `docs/v9/V9_REPORT.md` for the implemented features, test results (Node 261/261, verify OK, V9 browser audit A–J desktop 80/81 + tour 5/5, phone 78/78), limitations and the demo-readiness verdict. The sections below are the pre-delivery checkpoint, kept for history.

## Implemented and working (checked in a browser or by tests)
- **Languages:**
  - English is the default; English and French are the only languages in the selector.
  - The 8 V8 draft languages are listed as planned but not offered.
  - Central runtime in `src/i18n/i18n.mjs`: `T`, `L` and `AT` pairs, locale number formatting, plurals, live re-render on language change.
- **Translated surfaces:** World (opening section, map layers, panels, missions, agent cards, simulation, contribution, demo, problem registry view), shell navigation, companion, My CORE, Commons Profile, Vault, Labs, Arena, Academy, progress log and TRUST.
- **Opening:**
  - Headline « A parallel world built to solve problems in the real one », with **Launch CORE Demo** as the primary action.
  - Five-step explanation: Real Earth → CORE World → Human + AI → Tested proposals → Real-world review.
  - Views named Real Earth / CORE World / Hybrid View, with a skippable explanation.
- **Demo** (`src/earth/demo.mjs`):
  - Choice of **Autonomous Tour** or **Step by Step**, 15 stages, shared controller.
  - The autonomous tour ran unattended through all 15 stages (~4.5 min) with no page errors.
  - Controls: Previous, Next, Pause/Resume, Restart, Exit; optional narration.
- **Missions:**
  - Problems & missions panel (domains and maturity categories).
  - Mission workspace showing the problem, why it matters, known and unknown facts, the agents working now, the solutions considered, hypotheses, criticism, progress and next steps.
  - Team workspace and inspectable agent cards.
- **Real local intelligence** (`src/intelligence/investigate.mjs`):
  - Six roles: coordinator, evidence researcher, domain analyst, simulation specialist, scientific critic (with verifier and within-noise guard) and synthesis.
  - **Executed with qwen3:8b**: 64 s, every step validated.
  - Shows an explicit "unavailable" state when no local model runs.
- **Traffic:** recorded SUMO traces shown as **3D cars and buses** at city scale, with relief switched off while in use. Scenario cards, a plain-language reading and charts with 95 % intervals.
- **Contributions:** structure (rules or local model, labelled which), edit, then **Keep private** or **Share with mission** after explicit confirmation. Agents then run a form-only evaluation, and My CORE tracks each contribution.
- **Companion:** new typed actions, grounded answers with cited finding IDs, voice only on-device, transcript editable before it runs, Stop speaking.

## Simulated, deterministic, incomplete or broken
- **Agents:** the 501 agents are registered identities driven by a deterministic engine. Only explicitly marked tasks use the local model.
- **SUMO results:** uncalibrated, with synthetic demand. Replays are recorded runs, not live simulation.
- **Not yet translated:**
  - Commons modules `ui-knowledge`, `ui-network`, `ui-more`, `ui-missions`, `network`, `debate`, `kb/*`, `identity` and `vault` error messages;
  - Dialogue (`team`, `room`, `engine`);
  - the avatar studio (`studio.mjs`, `avatar-config`);
  - the `progress.html` body;
  - `report.mjs`;
  - `privacy.html`.
- **Earlier prototype, French only, outside the supported experience:** legacy `index.html` (Intelligence), `world-classic.html`, `corridor.html`, `control.html`.
- **Manifesto:** still the short V8 version. The long 14-chapter version and the investor brief are not written.
- **Audits not yet updated for V9:** V8, V7.2 and V7 journey audits (for example the label "501 registered agents" and the four destinations) and the browser-level French-leak test.
- **Voice:** not verified in a real browser (headless Chrome has no on-device recognition).
- **Firefox:** not verified.
- **Main-app audit:** one check (mission fingerprint) depends on the current time and also fails on the earlier V7.2 commit.

## Known bugs and blockers
- The toast-stays-visible bug was fixed in World. Other pages may have the same toast pattern.
- **Investigation answers:** the local model's text can contain stray characters, and some numbers are presented without their noise caveat. The verifier now flags within-noise claims.
- **Data blockers** (founder decisions): no public traffic counts or signal timing; the Muni GTFS licence was not accepted; the Census API needs a key.

## Next session priorities
1. Finish translation of every remaining surface listed above. Add a browser French-leak audit and a test that switches language with panels open.
2. Write the long-form manifesto (14 chapters, English and French) and `docs/INVESTOR_BRIEF.md`.
3. Update the V7, V7.2 and V8 audits and write the V9 audit covering tests A–J. Capture desktop and mobile screenshots.
4. Polish the demo: camera framing, vehicle readability, narration voices, a mobile layout check.
5. Simplify navigation further: a single Command entry point, with context-sensitive controls only.
6. Agent intelligence: stream investigation steps into the team workspace, persist the mission history, and add a second mission with a real research run.
7. Final readiness pass for the YC and a16z demo.
