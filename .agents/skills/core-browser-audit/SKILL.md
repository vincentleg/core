---
name: core-browser-audit
description: Verify CORE browser behavior, accessibility or performance when requested or needed for an affected change. Use isolated browsers and the current public-page scripts; report missing device coverage.
---

# CORE browser audit

The audits are dependency-free Node scripts that drive a browser **you start yourself**. They never install anything.

## Safety (non-negotiable)
- Never attach to a browser you did not start, and never to port 9222 by habit: on the founder's machine that port has been held by a headless Chrome running a profile with real cookies (INC-2026-10-15-01). Pick an unused port and confirm with `lsof -nP -iTCP:<port> -sTCP:LISTEN` that it is free first.
- Fresh, throwaway profile in the session scratchpad for every browser launch; never a personal or repository profile.
- DevTools and the site listen on 127.0.0.1 only: `python3 -m http.server 8000 --bind 127.0.0.1`.
- Stop only the processes you started; delete any `/tmp/core-*` output you created. Nothing from `test-results/` or a profile is ever committed (the integrity gate rejects it).

## Start
```sh
python3 -m http.server 8000 --bind 127.0.0.1 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9241 \
  --remote-debugging-address=127.0.0.1 --user-data-dir="$SCRATCH/chrome" --no-first-run about:blank &
/Applications/Firefox.app/Contents/MacOS/firefox --headless --profile "$SCRATCH/firefox" --no-remote --remote-debugging-port 9243 &
```

## Run (serially: each takes about 3–5 min; parallel runs on a loaded machine cause timing failures)

For **V9.9 public pages**, use `public/` built by `node scripts/build-public.mjs`, served on an unused loopback port (the Phase 2 scripts default to 8790). Reuse the existing Playwright Core through `NODE_PATH` and pinned local axe 4.10.2; do not install browser packages through npx. Read `docs/development/CORE_V9_9_PHASE3_TOOLING_REPORT.md` for locations and `docs/audits/CORE_V9_9_PHASE2_REPORT.md` for evidence/limits.

- Chrome: `node scripts/v99-phase2-accessibility.mjs <output.json> [page.html ...]`; select affected pages rather than repeating the entire matrix.
- Denied storage: `node scripts/v99-phase2-storage.mjs <output.json>`.
- Installed Firefox 122 CDP: `node scripts/v99-phase2-firefox.mjs <output.json>` (fresh disposable profile, port 9243). This does not establish current Firefox acceptance.
- Performance: `node scripts/v99-phase1-performance.mjs <output.json>`; run serially with no other audits and report hardware/network limits.

The table below concerns **legacy internal pages**. Its corridor globals/selectors do not establish V9.9 public acceptance. Never run target-controlled builds or browser code on an unreviewed third-party repository without separately reviewing its execution scope. Follow AGENTS.md for test reuse; no automatic full reruns or delegation.

| Audit | Command | Expect |
|---|---|---|
| Main, Chromium | `node scripts/browser-audit.mjs 9241 "$SCRATCH/out/chrome"` | `RESULTS n`, exit 0 |
| Main, Firefox | `node scripts/browser-audit.mjs 9243 "$SCRATCH/out/firefox" bidi` | same checks, exit 0 |
| Negative paths (Chromium only) | `node scripts/browser-negative-audit.mjs 9241 "$SCRATCH/out/neg"` | 12 PASS |
| Lab | `node scripts/research-browser.mjs 9241 http://127.0.0.1:8000/research.html /tmp/core-research` (output must be under `/tmp/`) | 7 checks, 0 errors, 0 external requests |
| Screenshots | `CORE_CDP_PORT=9241 node scripts/ui-shots.mjs 'http://localhost:8000/index.html#app' "$SCRATCH/shots/d" 1440 900` | `{"errors":[]}` |
| Performance | `CORE_CDP_PORT=9241 node scripts/perf-audit.mjs http://localhost:8000/ "$SCRATCH/out/perf.json"` | compare runs, not absolutes (software WebGL) |

## Reading results
- The main audit disables the cache (CDP) or asks Firefox to bypass it (Firefox 133+). On older Firefox, start a **fresh profile per run**, or results may come from stale files.
- A single failure that passes on rerun is still a finding: look for a race in the code before blaming the audit (example: the activity/replay race fixed in `src/civ-activity.js`).
- Safari/WebKit is not covered: it needs Safari's "Allow Remote Automation", a browser setting only the founder may enable. Say so in the report.
- Report per browser: version, checks passed, failures and what was not run.
