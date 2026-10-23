# CORE V9.9 — handoff to Codex (2026-10-20)

Written by Claude Code at an emergency stop (usage limit). Facts below come from commands run in this session; anything
not verified is marked so. Previous checkpoint: `docs/CORE_RESUME_CHECKPOINT.md` (written before this session's last
commits; this file supersedes it where they differ).

## A. Git and environment

| Item | Value |
|---|---|
| Repository | `~/core` (main checkout) |
| Worktree | `~/core/.core-local/worktrees/v9.8` (the V9.9 work lives here; there is **no** `worktrees/v9.9` directory) |
| Branch | `v9.9/multilingual-text-first`, branched from V9.8.1 `c885a78` |
| HEAD before this handoff | `c54b97c` |
| Handoff checkpoint commit | the commit that adds this file (see `git log -1`) |
| Pushed / deployed | **No / No.** All V9.9 commits are local only |
| Production | V9.8.1, commit `a89f60d`, Vercel deployment `dpl_Bvw6QKRGg18SLwwrnQ5LAHiuBWzZ` (unchanged) |
| `main` | 19 automated data-refresh commits not merged into this branch, intentionally (examine before any merge) |
| Untouched | CORE HQ `~/core-genesis`; Beta Lab `beta-lab/v9.7-baseline` (`6a4a309`) |
| Local servers | `127.0.0.1:8790` (python http.server on `public/`) started by this session, stopped at handoff. `127.0.0.1:8788` belongs to the founder; leave it alone |

V9.9 commits (oldest first): `c6b6c7e` i18n runtime and voice removal · `fdd6307` dictionaries and i18n tooling ·
`1ac82df` English default outside browsers, on-device voice input restored · `9d9133e` six-language manifesto, privacy
page, language commands · `a95a00b` crisis safety response, crawl coverage · `c54b97c` mixing fixes, mobile selector ·
handoff commit (WCAG contrast and target-size fixes and these two documents).

## B. Completed work

| Area | What was done | Main files | Tested | Works | Limits |
|---|---|---|---|---|---|
| Six-language runtime | `en, fr, es, de, zh-CN, pt`; dictionaries keyed by English source text, `{n}` templates, lazy load, persistence in `localStorage core.lang`, browser-only detection (Node stays English) | `src/i18n/i18n.mjs`, `src/i18n/locales/*.json`, `src/shell/nav.mjs` | unit tests + real-browser crawl | yes | translations are **model-written, not professionally reviewed**; labelled as such where shown as long text |
| Dictionary coverage | 2,611/2,611 catalogued strings in each of es/de/zh-CN/pt; test checks coverage, empties, placeholder and markup parity | `scripts/i18n/{extract,crawl,batches}.mjs`, `catalog.json`, `crawled.json`, `test/v8.test.js` | yes | yes | catalog only knows strings that go through `T()/t()/L()/AT()` or crawled static HTML; strings in data files bypass it (see C) |
| Language mixing | Real-browser crawl reported 0 untranslated strings, 0 page errors in es/de/zh-CN/pt. Fixed: scenario bus clause, EIA caveats, report source label, mic label | `src/earth/scenarios.mjs`, `src/progress/page.mjs`, `src/report/report.mjs` | yes | yes | the crawl exercises the main journeys only; heuristic scan, not exhaustive |
| Long-form manifesto | Full es/de/zh-CN/pt texts, lazy-loaded, status line says model translation with French as reference, CJK reading time | `src/manifesto/long-*.mjs`, `src/manifesto/manifesto.mjs` | parse check (16 chapters, 10 principles, 1 coda per language) + browser screenshot (zh-CN) | yes | not reviewed by a human translator |
| Language commands | "change language to Spanish", "Sprache Deutsch", "切换到中文" etc.; unsupported languages get an accurate message | `src/voice/actions.mjs`, `src/voice/companion.mjs` | unit test | yes | — |
| Text-only AI | No speech output anywhere (no `speechSynthesis`, no audio) | test scans published files | unit test | yes | — |
| Voice input | On-device browser `SpeechRecognition` with `processLocally` only; mic button hidden unless supported; starts only on press; transcript goes into the text field | `src/ui/dictation.mjs`, `src/intelligence/core/ui.mjs`, `src/voice/companion.mjs`, `world.html`; `Permissions-Policy microphone=(self)` | static tests only | **not verified with a real microphone or physical device** | Chrome-only in practice; Safari/Firefox show no mic |
| Crisis safety (audit check 90) | Self-harm / immediate-danger wording in six languages → fixed human-written message with emergency numbers and national crisis lines, before any routing, map move, model call or history; labelled "Fixed safety message (no model)" | `src/intelligence/core/safety.mjs`, `core/engine.mjs`, `core/ui.mjs`, `src/voice/companion.mjs`, `src/dialogue/engine.mjs`, `test/core-intelligence.test.js` | unit test (6 languages, no model call, no map move, false-positive cases) | yes | pattern-based; phone numbers checked by web search on 2026-10-20 (China 12356, Mexico 800 911 2000, Portugal 808 24 24 24; others from knowledge) — **founder must review before release** |
| Privacy page | Rewritten to match real behaviour (Vercel hosting, browser storage keys, optional on-device AI and voice, opt-in Photon, third parties, no cookies/analytics), six language sections, stays script-free (`script-src 'none'`); app links go to `privacy.html#<lang>` | `privacy.html`, `src/i18n/i18n.mjs` (`apply()`), `scripts/browser-audit.mjs`, `scripts/i18n/crawl.mjs` | test 246 + browser load | yes | **not legal advice, no legal review**; contact is the GitHub repo only (founder decision needed) |
| Mobile language selector | 76 → 100 px; full names fit at 360/390 px | `src/ui/living-earth.css` | browser measurement + screenshot | yes | — |
| Accessibility | axe-core 4.10.2 (WCAG 2.0/2.1/2.2 A+AA rules), 11 pages × en/de/zh-CN × desktop/mobile: fixed dialogue contrast (3 colours) and report TOC target size → **no violations** | `src/dialogue/room.css`, `src/report/report.css` | yes (automated) | yes | automated rules only; no screen-reader or keyboard walkthrough this session |
| Navigation / Explorer | Not changed this session (globe-first homepage, no SF auto-fly, compact bar preserved) | — | regression loads only | no errors observed | V9.9 journey audit not rerun |

## C. Incomplete work

- **90-point audit document not written** (`docs/audits/CORE_V9_9_90_POINT_RELEASE_AUDIT.md` does not exist). Only check 90 was implemented. Evidence gathered but not recorded: per-page CSP (strict, no `unsafe-eval`; world allows `wasm-unsafe-eval` for WebLLM), Vercel headers (nosniff, no-referrer, XFO DENY, HSTS, Permissions-Policy), CI `verify.yml` pinned by SHA with `contents: read`, pre-commit integrity scan, `.gitignore` for secrets and DBs, `backend/schema.sql` = readiness only, not deployed.
- **Tooling inventory not written** (no installs this session; see E).
- **Release readiness report not written.** `PROJECT_STATE.md` and `docs/CORE_RESUME_CHECKPOINT.md` not updated for the last commits.
- **`node scripts/verify.mjs` not run on V9.9.** `scripts/browser-audit.mjs` and `scripts/v9-journey-audit.mjs` not rerun.
- Performance profiling (P4) not done.
- Translations are model-written; no professional review. Strings that come from `data/` without passing through `T()`/`AT()` can still appear in English; only the crawled journeys are proven clean.
- Privacy page: no legal review, no business contact. Crisis phone numbers need founder review.
- Voice input never tested with a real microphone.
- `test/intelligence.test.mjs` fails because `@langchain/langgraph` is not installed in `scripts/intelligence` (pre-existing, environmental).
- Known pre-existing permission gap (from `docs/development/CLAUDE_TOOLING_AUDIT.md`): `: >> corridor.html` not blocked by `.claude/settings.json`.
- No critical security bug is known, but no formal audit has been completed, so none can be ruled out.

## D. Tests and verification

| Check | Result |
|---|---|
| `node --test test/*.test.js` | **307/307 pass** (last run after `a95a00b`/`c54b97c` changes; the final CSS-only contrast/target fixes were not followed by a suite run) |
| `test/intelligence.test.mjs` | fails (missing `@langchain/langgraph`, environmental, pre-existing) |
| `node scripts/verify.mjs` | **not run** |
| Real-browser i18n crawl (`scripts/i18n/crawl.mjs --report`) | es, de, zh-CN, pt: 0 missing strings, 0 page errors |
| Six-language regression (scratch script, Chrome headless) | 132 loads (11 pages × 6 languages × 1440×900 and 390×844): no horizontal overflow, no page errors, one known false positive (the French word "agents") |
| axe-core accessibility | 66 loads (11 pages × en/de/zh-CN × desktop/mobile): no violations after fixes |
| Chinese rendering | screenshots of world and manifesto (zh-CN, mobile): glyphs render, no missing characters |
| Integrity pre-commit scan | 0 findings on every commit |
| Not executed | physical devices, real microphone, Safari/Firefox, screen readers, performance profiling, production smoke tests |

Languages tested in the browser: all six (regression), es/de/zh-CN/pt (crawl), en/de/zh-CN (axe).

## E. Plugins, skills, repositories and MCP connectors

Nothing was installed into the project or into Claude Code during V9.9. Statuses:

| Tool | Status | Notes |
|---|---|---|
| Playwright (library, `playwright-core`) | INSTALLED AND VERIFIED | `~/core/.core-local/v8/pw/node_modules` (pre-existing); used with `NODE_PATH=…` and Chrome at `/Applications/Google Chrome.app`; no credentials |
| `core-browser-audit` project skill | INSTALLED BUT NOT TESTED this session | `.claude/skills/core-browser-audit` (pre-existing) |
| `.claude/settings.json` allow/deny rules | INSTALLED AND VERIFIED (2026-10-15 audit) | see `docs/development/CLAUDE_TOOLING_AUDIT.md` |
| axe-core 4.10.2 | INSTALLED AND VERIFIED, temporary | Claude session scratchpad only (temporary directory outside the repo, installed with `--ignore-scripts`, MPL-2.0), not in the repo; reinstall the same way if needed |
| Playwright MCP | EVALUATED ONLY, deferred | tooling audit 2026-10-15 |
| Context7 MCP | EVALUATED ONLY, deferred | hosted; sends queries off-machine |
| Firecrawl MCP | REJECTED | paid API key |
| Perplexity MCP | REJECTED | paid metered API |
| Claude-Mem, OmniRoute, Ruflo | REJECTED | hooks/router/multi-agent conflict with `CLAUDE.md` rules |
| Superpowers, Karpathy-inspired skills, Vibewise, Council of High Intelligence, Claude Octopus, Oh My Claude Code, `affaan-m/ECC`, Agent Skills, Cloudflare security audit skill, Chrome DevTools MCP, Vercel MCP, Supabase, GitHub MCP, Bloxks, Graphify, ScrapeGraphAI, PostHog, Composio, Video-Use, Whisper, ffmpeg, Remotion, Hyperframes, Higgsfield, Edits, Apify, yt-dlp, Resend, Notion | NOT INSTALLED, not evaluated in V9.9 | `CLAUDE.md` requires founder approval for MCP servers, plugins and hooks; paid/credentialed services are forbidden by `AGENTS.md` |
| Vercel CLI | used for the V9.8.1 deploy (pre-existing, authenticated by the founder) | not used in V9.9 |

## F. Security and compliance audit

The 90-point audit **was not performed** as a recorded audit. Completed: 0 of 90 formally recorded; check 90 (crisis
response) implemented and tested (would be FIXED). Passed / open / not applicable / needs review: **not determined**.
No critical or high-severity finding is currently known; this is not an audit result.

## G. Next actions for Codex

- **P0:** read this file; `git status`; confirm branch `v9.9/multilingual-text-first` and that HEAD contains the handoff commit; run `node --test test/*.test.js` once (expect 307 pass).
- **P1:** founder review of model translations (or label them clearly, as now); extend `T()`/`AT()` coverage to any remaining data-file strings found by `node scripts/i18n/crawl.mjs --report <lang>` on more journeys; real-device check of voice input.
- **P2:** write `docs/audits/CORE_V9_9_90_POINT_RELEASE_AUDIT.md` (checks 1–90, evidence-based statuses; many are N/A for a static site with no production DB); founder review of crisis numbers in `src/intelligence/core/safety.mjs` and of `privacy.html` (contact, legal).
- **P3:** `node scripts/verify.mjs`; `scripts/browser-audit.mjs`; `scripts/v9-journey-audit.mjs`; performance profile (bundle sizes, load without WebGPU); keyboard and screen-reader pass.
- **P4:** tooling inventory document (evaluate only; install nothing without founder approval); release readiness report; update `PROJECT_STATE.md` (≤10 lines) and `docs/CORE_RESUME_CHECKPOINT.md`; then ask the founder for push/deploy approval.

Read first: `AGENTS.md`, `CLAUDE.md`, this file, `docs/CORE_RESUME_CHECKPOINT.md`, `PROJECT_STATE.md`,
`src/i18n/i18n.mjs`, `src/intelligence/core/safety.mjs`, `docs/development/CLAUDE_TOOLING_AUDIT.md`.

Commands: tests `node --test test/*.test.js`; build `node scripts/build-public.mjs` (rebuilds the WebLLM vendor bundle,
SHA-256 checked); serve `cd public && python3 -m http.server 8790 --bind 127.0.0.1` then `http://127.0.0.1:8790/world.html`;
i18n `node scripts/i18n/extract.mjs` then translate missing keys (each locale file is sorted, one entry per line).
