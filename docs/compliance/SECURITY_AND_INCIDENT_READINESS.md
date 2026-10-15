# CORE — security and incident readiness (2026-10-15)

This extends [SECURITY_BASELINE.md](../SECURITY_BASELINE.md) and [CORE_AGENT_SECURITY_REVIEW.md](../development/CORE_AGENT_SECURITY_REVIEW.md). These are safe local checks and static analysis only; no penetration test or probing of external systems was done.

## Findings

| # | Finding | Severity | Status | Remediation |
|---|---|---|---|---|
| S1 | **Exposed local HTTP server** (assessment below; LAN-reachable; served a Chrome profile with encrypted claude.ai/luma.com cookies). A `python -m http.server 8000` (started 2026-10-13, outside this session) served the repository root on **all interfaces**. `.core-local/*.sqlite` (agent memory, scheduler queue, research and science memory) and `.git/` returned HTTP 200 locally. The machine was on a private LAN (10.0.21.x) | High (exposure); impact assessed Low–Medium (no credentials in `.git/config`; databases hold agent and system records, no visitor data) | **Contained**: process stopped 2026-10-15 with founder approval | Serve only with `--bind 127.0.0.1` (already in AGENTS.md). Future: serve a built public directory, never the repo root. See the incident record below |
| S2 | **Vendored MapLibre 5.7.3: GHSA-jrc7-96c5-q579 (CVE-2026-85061, critical)**, an XSS sanitizer bypass in `DOM.sanitize()` via attribution strings; fixed in **6.4.1** | Critical upstream; **mitigated** in CORE | **Fixed on branch (D090, local commit), not yet deployed**: production still serves 5.7.3 until merge | CSP `script-src 'self' 'sha256-…'` (no `'unsafe-inline'`/`'unsafe-hashes'`) blocks inline event handlers, so script execution is mitigated. HTML injection into attribution from a compromised third-party style (OpenFreeMap) remains possible. CORE's own attributions are static. **Upgrade to ≥ 6.4.1** in a dedicated change: new vendored bundle with licence, SRI and hash updates, then browser regression (major version; founder approval) |
| S3 | `frame-ancestors` cannot be set by `<meta>` CSP, and GitHub Pages sets no headers | Low (no state-changing actions on the site) | Open | Accept for the static prototype; set headers at a future host |
| S4 | Public Git history contains a personal author email (3 commits) | Low (privacy) | Open | Use the GitHub no-reply email going forward; history rewrite not recommended (force-push forbidden) |
| S5 | `innerHTML` used 63 times in `src/`; modules define `esc()` for external values | Medium (XSS surface) | Partially verified (escaping helpers exist; not every call audited) | Targeted review of each `innerHTML` with external data; consider a lint rule |
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
