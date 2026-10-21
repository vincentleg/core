# V9.8 local navigation correction

Local uncommitted correction on baseline `ffdba0b`; no commit, push or deployment. CORE HQ and Beta Lab unchanged.

## Cause and scope

`scripts/intelligence-server.mjs` rejected every request marked `Sec-Fetch-Site: cross-site` or `same-site`, including top-level homepage navigation without an Origin header. A request with no Origin and no cross-site metadata already worked. The 403 was reproduced against the running server before restarting it with the correction; the new regression test also failed before the fix.

The exception covers only GET navigation (`Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`) to `/` or `/world.html`. The exact loopback Host/port check, exact matching Origin when present, API Fetch Metadata checks, session token, static file allowlist and loopback binding remain enforced. `localhost` and `127.0.0.1` each work as their own origin; cross-origin API access between them stays refused.

Open **http://127.0.0.1:8788/** in Safari; **http://localhost:8788/** also works. The V9.8 server was restarted locally to load the fix.

## New validation

- `node --test test/intelligence-server.test.js test/core-intelligence.test.js`: 25 passing tests, including navigation without Origin, both local hosts, JavaScript/voice assets, authenticated plan and transcription routing, and rejected origins, hosts, subframes and unauthorized API calls.
- Actual homepage HTTP response: 200 HTML, including cross-site navigation metadata.
- Installed WebKit: both local homepages and `/world.html` returned 200; JavaScript engine loaded; status returned 200; unauthorized plan and voice calls returned 403; navigation from an intercepted foreign page returned 200 with `Sec-Fetch-Site: cross-site` and no Origin.
- Actual local Qwen plan and Whisper transcription endpoints returned 200 using the existing synthetic Folsom audio fixture; no physical microphone recording.
- `git diff --check`: passed.

Local evidence: `.core-local/evidence/v98/origin-fix/targeted.tap`, `webkit.json`, `api.json`. These files stay ignored and local. Earlier release results in PROJECT_STATE are historical, not rerun here.

Physical Safari/microphone and the full release suite were not tested. WebKit recorded external NASA/elevation tile access-control errors after the additional world-page navigation; external map services were not changed by this correction.
