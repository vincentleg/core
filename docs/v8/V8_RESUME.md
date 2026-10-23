# CORE V8 — resume file (2026-10-16)

**State:** all V8 phases (0–10) delivered and committed on `v8/civilization-intelligence`, plus the prototype vehicle. Nothing pushed, merged or deployed. Report: `docs/v8/V8_REPORT.md`.

## To resume
1. `git switch v8/civilization-intelligence && git log --oneline af1395f..HEAD`.
2. Run `node --test test/*.test.js`. Expected 262/262.
3. Start a server:
   - `python3 -m http.server 8000 --bind 127.0.0.1`;
   - then the audits, with your own headless Chrome on a non-9222 port and a fresh profile:
     `CORE_BASE=http://127.0.0.1:8000/ node scripts/v8-journey-audit.mjs <port> <out> [390 844]`.
   - Expected: 34/34 desktop, 29/29 phone.
4. Mobility data:
   - Re-create a Python venv with `eclipse-sumo==1.27.1 sumo-data==1.27.1 pyproj==3.6.1`.
   - Then run the `reproduce` command in `data/mobility/manifest.json`. The earlier venv lived in a session scratchpad that no longer exists.
5. Energy data: `node scripts/progress-energy.mjs --fetch` (U.S. EIA bulk file, public domain; stops on any non-public-domain series).

## Open items (in priority order)
- **Main-app audit:** check « browser mission equals the recorded Node mission (fingerprint) » fails on V7.2 `af1395f` too. It is time-dependent and predates V8. Decide whether to re-record `data/missions` (`scripts/agents.mjs`) or make the check date-pinned.
- **Firefox:** smoke not run in this environment (launch fails inside the sandboxed shell). Run `.core-local/v8/pw/smoke.mjs` (git-ignored) outside the sandbox, or the V7 procedure.
- **Translations:** page bodies remain French. Non-English shell strings are unreviewed drafts. Native review is needed before any public use.
- **Voice:** on-device speech recognition has not been exercised in a real browser.
- **Founder decisions** (unchanged):
  - Census API key;
  - Muni GTFS licence;
  - hosted accounts;
  - publication;
  - avatar `.glb` licence;
  - the `AGENTS.md` « pas de phase cosmétique » wording versus this brief.
