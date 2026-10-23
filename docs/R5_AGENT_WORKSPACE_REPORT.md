# R5 — agent intelligence experience (local)

`world.html#mission=mission.sf.mobility` now joins the mission panel to `data/intelligence/work.json`. The visible summary gives the recorded run, its completion date, actual agent/task/tool counts, finding count, human-review state and a button opening the existing full investigation. Its detailed view already shows task events, agent capabilities, collaborations, source provenance and uncertainty. Other missions state that no published investigation is linked; a load failure names the failed file. The browser replay remains distinct from the recorded run and from later local contributions.

No new execution, data source, dependency or always-on worker was added. The work is read-only and remains exploratory, with no human authorization or calibrated traffic claim. R3 evidence dependencies remain open.

Verification: `node --test test/agent-records.test.js test/discovery.test.js` (11/11), isolated Chrome desktop 1440×900/mobile 390×844 via `scripts/r5-mission-browser.mjs` (16/16), and full `node scripts/verify.mjs` (378/378; integrity 0 findings). Screenshots and gate log: `.core-local/evidence/r5-mission/` (ignored). Safari, Firefox, physical devices and screen readers were not checked.
