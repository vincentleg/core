# CORE — security and incident readiness (2026-10-15)

This extends [SECURITY_BASELINE.md](../SECURITY_BASELINE.md) and [CORE_AGENT_SECURITY_REVIEW.md](../development/CORE_AGENT_SECURITY_REVIEW.md). These are safe local checks and static analysis only; no penetration test or probing of external systems was done.

## Findings

| # | Finding | Severity | Status | Remediation |
|---|---|---|---|---|
| S1 | **Exposed local HTTP server.** A `python -m http.server 8000` (started 2026-10-13, outside this session) served the repository root on **all interfaces**. `.core-local/*.sqlite` (agent memory, scheduler queue, research and science memory) and `.git/` returned HTTP 200 locally. The machine was on a private LAN (10.0.21.x) | High (exposure); impact assessed Low–Medium (no credentials in `.git/config`; databases hold agent and system records, no visitor data) | **Contained**: process stopped 2026-10-15 with founder approval | Serve only with `--bind 127.0.0.1` (already in AGENTS.md). Future: serve a built public directory, never the repo root. See the incident record below |
| S2 | **Vendored MapLibre 5.7.3: GHSA-jrc7-96c5-q579 (CVE-2026-85061, critical)**, an XSS sanitizer bypass in `DOM.sanitize()` via attribution strings; fixed in **6.4.1** | Critical upstream; **mitigated** in CORE | Open | CSP `script-src 'self' 'sha256-…'` (no `'unsafe-inline'`/`'unsafe-hashes'`) blocks inline event handlers, so script execution is mitigated. HTML injection into attribution from a compromised third-party style (OpenFreeMap) remains possible. CORE's own attributions are static. **Upgrade to ≥ 6.4.1** in a dedicated change: new vendored bundle with licence, SRI and hash updates, then browser regression (major version; founder approval) |
| S3 | `frame-ancestors` cannot be set by `<meta>` CSP, and GitHub Pages sets no headers | Low (no state-changing actions on the site) | Open | Accept for the static prototype; set headers at a future host |
| S4 | Public Git history contains a personal author email (3 commits) | Low (privacy) | Open | Use the GitHub no-reply email going forward; history rewrite not recommended (force-push forbidden) |
| S5 | `innerHTML` used 63 times in `src/`; modules define `esc()` for external values | Medium (XSS surface) | Partially verified (escaping helpers exist; not every call audited) | Targeted review of each `innerHTML` with external data; consider a lint rule |
| S6 | Local control centre | Low | Verified | 127.0.0.1 bind, token, Host/Origin checks, CSP, `nosniff` (agent security review) |
| S7 | Secrets | Low | Verified | Integrity scanner in hooks; Claude deny rules for `.env*`, `*.pem`, `*.key`; no secrets found (0 findings, 363 files) |
| S8 | Dependency inventory | Low | Verified | No `package.json`; the only third-party code is vendored MapLibre (S2) and self-hosted fonts |
| S9 | Backups and recovery of `.core-local` | Medium (local data loss) | Not designed | Define a backup scope consistent with the retention design (DATA_PROCESSING_INVENTORY) |
| S10 | Rate limiting, CSRF, CORS, uploads, SSRF | — | N/A today (no server application, no uploads; collectors call fixed allowlisted URLs) | Required before any CORE World or Business server |

## Incident record — INC-2026-10-15-01

- **Detected:** 2026-10-15, during the compliance audit, when a port conflict on 8000 led to identifying the listener.
- **Scope:** HTTP listener on `*:8000` from 2026-10-13, serving the repository root. Reachable paths confirmed with HEAD requests from localhost only; no content was downloaded during the investigation.
- **Contained:** process 94242 stopped with founder approval; no listener on 8000 afterwards.
- **Data at risk:** agent and system SQLite records and the Git repository (public anyway). No credentials. No visitor personal data. The founder's own `human:` decisions would be in memory if any existed (none recorded).
- **Evidence limits:** `http.server` request logs went to its terminal and are not available. **Whether any other host accessed the files cannot be determined.**
- **Notification:** no regulatory or user notification appears triggered (no third-party personal data identified), but this is to be confirmed by counsel if any personal data is later found in those files.
- **Follow-up:** S1 remediation; add a check to the launch checklist.

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
