# CORE — security and incident readiness (2026-10-15)

This extends [SECURITY_BASELINE.md](../SECURITY_BASELINE.md) and [CORE_AGENT_SECURITY_REVIEW.md](../development/CORE_AGENT_SECURITY_REVIEW.md). These are safe local checks and static analysis only; no penetration test or probing of external systems was done.

## Findings

| # | Finding | Severity | Status | Remediation |
|---|---|---|---|---|
| S1 | **Exposed local HTTP server** (assessment below; LAN-reachable; served a Chrome profile with encrypted claude.ai/luma.com cookies). A `python -m http.server 8000` (started 2026-10-13, outside this session) served the repository root on **all interfaces**. `.core-local/*.sqlite` (agent memory, scheduler queue, research and science memory) and `.git/` returned HTTP 200 locally. The machine was on a private LAN (10.0.21.x) | High (exposure); impact assessed Low–Medium (no credentials in `.git/config`; databases hold agent and system records, no visitor data) | **Contained**: process stopped 2026-10-15 with founder approval | Serve only with `--bind 127.0.0.1` (already in AGENTS.md). Future: serve a built public directory, never the repo root. See the incident record below |
| S2 | **Vendored MapLibre 5.7.3: GHSA-jrc7-96c5-q579 (CVE-2026-85061, critical)**, an XSS sanitizer bypass in `DOM.sanitize()` via attribution strings; fixed in **6.4.1** | Critical upstream; **mitigated** in CORE | **Fixed and deployed 2026-10-15**: hotfix PR #4 (`22ce0d2`), merged as `8a96312` on `main`; core-verify and Pages succeeded; production serves 6.11.2 (files byte-identical to `main`, 5.7.3 paths return 404, map loads with no exception or CSP violation) | CSP `script-src 'self' 'sha256-…'` (no `'unsafe-inline'`/`'unsafe-hashes'`) blocks inline event handlers, so script execution is mitigated. HTML injection into attribution from a compromised third-party style (OpenFreeMap) remains possible. CORE's own attributions are static. **Upgrade to ≥ 6.4.1** in a dedicated change: new vendored bundle with licence, SRI and hash updates, then browser regression (major version; founder approval) |
| S3 | `frame-ancestors` cannot be set by `<meta>` CSP, and GitHub Pages sets no headers | Low (no state-changing actions on the site) | Open | Accept for the static prototype; set headers at a future host |
| S4 | Public Git history contains a personal author email (3 commits) | Low (privacy) | Open | Use the GitHub no-reply email going forward; history rewrite not recommended (force-push forbidden) |
| S5 | HTML sinks: 72 `innerHTML` assignments (61 in 17 `src/` modules, 11 in `control.html`); no `outerHTML`/`insertAdjacentHTML`; `research-view.js` uses none | Medium (XSS surface) → **Low after review** | **Reviewed 2026-10-15** (classification below). No confirmed injection. One defect fixed: the corridor `esc()` did not escape `'` | All 19 escapers are now tested; keep `esc()`/`safeUrl()` for every external string or URL |
| S6 | Local control centre | Low | Verified | 127.0.0.1 bind, token, Host/Origin checks, CSP, `nosniff` (agent security review) |
| S7 | Secrets | Low | Verified | Integrity scanner in hooks; Claude deny rules for `.env*`, `*.pem`, `*.key`; no secrets found (0 findings, 363 files) |
| S8 | Dependency inventory | Low | Verified | No `package.json`; the only third-party code is vendored MapLibre (S2) and self-hosted fonts |
| S9 | Backups and recovery of `.core-local` | Medium (local data loss) | Not designed | Define a backup scope consistent with the retention design (DATA_PROCESSING_INVENTORY) |
| S10 | Rate limiting, CSRF, CORS, uploads, SSRF | — | N/A today (no server application, no uploads; collectors call fixed allowlisted URLs) | Required before any CORE World or Business server |

## Incident record — INC-2026-10-15-01 (assessment updated 2026-10-15)

| Question | Finding | Evidence | Certainty |
|---|---|---|---|
| Binding | All interfaces (`*:8000`); command `python -m http.server 8000` with **no `--bind`** | `lsof` and `ps` before the process was stopped | Established |
| Reachable from other devices? | **Yes, from the local network**: macOS application firewall **disabled** (state 0), stealth off, and `/usr/bin/python3` listed as "Allow incoming connections"; active interface `en0` on a private 10.0.21.x network; no other interface | `socketfilterfw`, `ifconfig` | Established for the LAN |
| Reachable from the internet? | Only if the router forwards port 8000; private 10.x addressing behind NAT is the usual case | Router config not inspected (outside the authorized local scope) | **Unknown** |
| Duration | Process start 2026-10-13 13:45 (local) → stopped 2026-10-15 | `ps` lstart | Established |
| Access logs | **None found.** `http.server` logs to its terminal's stderr; no `nohup.out`; no matching shell history; firewall disabled, so no firewall log | Searches of history, home, repo | Logs absent: **access by other devices cannot be confirmed or excluded** |
| Origin | Probably an agent or manual run following an **unbound instruction**: the README still said `python3 -m http.server 8000`, and local Codex session logs contain the unbound form (8 occurrences, 2026-10-12 and 2026-10-14 sessions) alongside the bound form | `README.md:16` (fixed), `~/.codex/sessions` (grep counts only) | Probable, not proven |
| Sensitive paths exposed | The whole repository working tree, including: `.core-local/` (agent memory, research and science memory, scheduler queue, `live.json`, backups including `backup/memory*.sqlite`, `backups/claude-tooling-2026-10-15/` with copies of `AGENTS.md`, `CLAUDE.md` and **user-level Claude settings**, verification proofs, watch snapshots); `.git/` (full history, public anyway); **`test-results/phase4/chrome-profile/`, a Chrome profile containing cookies for `claude.ai` and `luma.com`, plus `Login Data`, `History` and `Web Data` stores** | `find` (names only), SQLite counts and hostnames only | Established |
| Secrets or credentials in exposed paths | No API keys or `.env`/key files found; no credentials in `.git/config`. **Browser session cookies (claude.ai, luma.com) were exposed**; all 10 are stored **encrypted** (Chrome macOS `v10`, key in the login Keychain), with no plaintext values. `Login Data` (saved passwords, if any) is also Keychain-encrypted; its contents were not read | Cookie table prefix check only | Established (encryption); whether passwords exist: not checked |
| Profile status | The profile is **in use now** by a running Chrome instance (renderers started from 01:25 today; databases locked) | `ps`, locked SQLite | Established |

**Assessment.** Exposure to the LAN for about 2 days is established. Whether anyone accessed it is **unknown**. Stolen encrypted cookie databases are not directly usable without the Mac's Keychain key, which lowers but does not remove the risk.

**Recommended containment (founder actions, not done here):**
1. Sign out of **all sessions** on claude.ai (account settings) and on luma.com, then sign in again. This invalidates any copied session tokens.
2. Change any password saved in that Chrome profile, if passwords were saved there.
3. Move the Chrome profile **out of the repository** (for example under `~/Library/Application Support/`) once the browser using it is closed, and use a throwaway profile for audits (the scripts already require isolated profiles).
4. Enable the macOS firewall (System Settings → Network → Firewall), or at least remove the "allow incoming" rule for `python3`.
5. Optionally review the router for port forwarding on 8000.

API-key rotation is not warranted by the evidence: no keys were found in served paths.

**Done in this pass:**
- The server was stopped earlier.
- `README.md` now uses `--bind 127.0.0.1`.
- A regression test (`test/consolidation.test.js`) fails if any tracked instruction serves with `http.server` unbound.

## S5 classification — HTML sinks (review 2026-10-15)

Method: every sink was listed by script, every `${…}` interpolation inside it was extracted, and each unescaped one was traced to its source. This is a manual code review, not a penetration test.

| Class | Sinks | Finding |
|---|---|---|
| Static markup or fixed constants (`LEGEND`, `GROUPS`, `D.DOMAINS`, `W.PLACES`, `TABS`, status labels) | ~25 | Not exploitable |
| External strings (DataSF/NYC/USGS/NWS snapshots, live browser feed items, GitHub API runs, recorded missions, agent registry) | ~35 | All pass through `esc()`; every link built from external data goes through `safeUrl()` (https only) or is built by CORE code with `encodeURIComponent` |
| Numbers | many | Counts, engine outputs, or fields coerced with `num()` at snapshot time (e.g. `site_eui`, `width_ft`) |
| `control.html` (local control centre, served only on 127.0.0.1 with a token) | 11 | All external strings escaped |

- **CONFIRMED and fixed:** `src/app.js` `esc()` did not escape `'` and threw on `null`. No single-quoted attribute received external data, so no exploit path was found; aligned anyway, with a test covering all escapers (`test/consolidation.test.js`).
- **POTENTIAL (defence in depth):** a few `href` values from first-party manifests (`d.page`) use `esc()` without `safeUrl()`. Those values are written by CORE's own snapshot scripts; the CSP (no `'unsafe-inline'`) also blocks `javascript:` URLs.
- **NOT APPLICABLE:** no server-side rendering, no user-generated HTML, no stored visitor content.

## Current state check — 2026-10-15, later the same day (local, read-only)

| Item | State observed | Evidence |
|---|---|---|
| Repository server on port 8000 | Not running unbound; only a `--bind 127.0.0.1` server started for this audit | `lsof` |
| macOS application firewall | **Still disabled**; `/usr/bin/python3` still "Allow incoming connections" | `socketfilterfw` |
| Chrome profile `test-results/phase4/chrome-profile/` | **Still inside the repository** and still in use. **Correction:** the process using it is not an interactive browser. It is an orphaned **headless Chrome (PID 30675) started 2026-10-13 17:36 with `--remote-debugging-port=9222`** (bound to 127.0.0.1). Any local process can drive it through that port, including reading its cookies | `ps`, `lsof` |
| Other listeners on **all interfaces** (not CORE, out of scope, not touched) | `python -m http.server 8765` serving another project's build output from a Claude scratchpad since 2026-10-09; `next-server` on 3101 (`vincent-portfolio`) since 2026-10-11; Apple WebDriver HTTP service on 8080 since 2026-10-12 (does not answer HTTP on localhost) | `lsof`, `ps` |
| Session invalidation (claude.ai, luma.com), password changes, router check | **Cannot be verified from this machine by an agent**; treated as OPEN | — |
| Commit protection | Since `b4cae03` (local branch), the integrity gate rejects `.sqlite`/`.db`, `.core-local/` and Chrome profile stores at any path, and `.gitignore` excludes them | `test/phase4.test.js` |

### Founder action checklist (status = what an agent could verify)

| # | Action | Status |
|---|---|---|
| F1 | Sign out of all sessions on claude.ai and luma.com, then sign in again | OPEN (not verifiable by an agent) |
| F2 | Change any password saved in the exposed profile, if any | OPEN (contents of `Login Data` deliberately not read) |
| F3 | Stop the orphaned headless Chrome (PID 30675, DevTools port 9222), then move `test-results/phase4/chrome-profile/` out of the repository or delete it | **DONE 2026-10-15 (V3 session, authorized by the V3 mission):** process stopped with SIGTERM; profile (513 MB, contents not read) moved to `~/CORE-quarantine/2026-10-15-INC-chrome-profile` (mode 700) as evidence. Deleting it later is the founder's choice |
| F4 | Turn on the macOS firewall; remove the "allow incoming" rule for `python3` | OPEN (firewall state 0) |
| F5 | Decide on the other all-interface servers | PARTLY DONE. The orphaned `python -m http.server 8765` (another session's build folder, 5 days old) was stopped. Still listening on all interfaces, left alone because they belong to other software or may be in use: `next-server` 3101 (`npm run start --port 3101`, vincent-portfolio; restart it with `-H 127.0.0.1`); Apple WebDriver service 8080 (disable Safari's "Allow Remote Automation" if unused); ControlCenter 5000/7000 (AirPlay Receiver: System Settings → General → AirDrop & Handoff); Chaos V-Ray Swarm 24267 and VRLService 30304 (quit them when not rendering). A Codex-owned headless Chrome (localhost 9330, `/tmp` profile) is localhost-only and was left for its owner |
| F6 | Optionally check the router for port forwarding to this Mac | OPEN (router not inspected) |
| F7 | Define a backup scope for `.core-local/` (S9) | **DONE (procedure + first backup)**: `node scripts/backup-local.mjs` copies the 4 SQLite databases with `sqlite3 .backup` plus JSON state into `~/CORE-backups/<UTC>/` (mode 700, outside the repo, never transmitted). First backup 2026-10-15 17:42 UTC, 48 files, `integrity_check` ok on all 4 databases. Restore steps are in the script header. Schedule and off-machine copy: founder decision |

The incident is **contained, not resolved**: the server is stopped, but whether data was accessed remains unknown, and F1–F4 are pending.

## Incident-response framework (draft; untested)

| Step | Action | Owner (to be decided) |
|---|---|---|
| Detect | Integrity hooks, CI failures, GitHub security alerts, advisory checks for vendored code, anomaly reports | Founder (sole operator today) |
| Contain | Stop processes and services, revoke tokens, `.core-local/STOP` for agents, disable workflows | Founder |
| Preserve evidence | Copy logs and state *before* cleanup; record timestamps and hashes | Founder |
| Investigate | Scope, data categories, affected people, timeline | Founder; external expert if personal data |
| Notify | Supervisory authority within the applicable deadline (e.g. GDPR 72 h, if applicable) and affected people where required; providers (GitHub) | Founder + counsel |
| Recover | Patch, restore from a clean state, verify integrity | Founder |
| Review | Post-incident note in `docs/`, preventive control, test | Founder |

**Readiness:** documented only. No exercise has been run, and responsibilities beyond the founder are undecided. **Not operationally ready.**
