# CORE V3 — threat model and security report (2026-10-15)

**Scope.** The proposed CORE World / Intelligence / institutional architecture ([ARCHITECTURE.md](ARCHITECTURE.md)) and the local prototype `world.html`.
- Severity uses impact × likelihood for a public launch. The prototype itself has no server and no accounts.
- This is a design review, not a penetration test.

## 1. Incident INC-2026-10-15-01 — status
Full record: [`docs/compliance/SECURITY_AND_INCIDENT_READINESS.md`](../compliance/SECURITY_AND_INCIDENT_READINESS.md).

| Item | Status |
|---|---|
| Orphaned headless Chrome with DevTools port 9222 on the repository profile | **Stopped** (V3 session) |
| Chrome profile (claude.ai, luma.com cookies) | **Moved out of the repository**, unread, to `~/CORE-quarantine/` (mode 700) |
| Orphaned `http.server` on all interfaces (8765) | **Stopped** |
| Local backup of `.core-local` | **Done**: `scripts/backup-local.mjs`, first backup integrity-checked |
| macOS firewall | **OFF: founder action** |
| claude.ai / luma.com session sign-out, password changes | **OPEN: founder action**, cannot be verified by an agent |
| Other all-interface listeners (3101 next-server, 8080 WebDriver, 5000/7000 AirPlay, V-Ray 24267/30304) | **OPEN: founder decision**; instructions in the record |
| Router port forwarding | Not inspected |

**Incident status: contained, not resolved.** Whether anyone accessed the exposed files remains unknown.

## 2. Threats and controls

| # | Asset / surface | Threat | Severity at launch | Control (designed) | Prototype status |
|---|---|---|---|---|---|
| T1 | Public pages | XSS through record or user text | High | `esc()`/`safeUrl()` everywhere; CSP without inline script | World: all text escaped, `script-src 'self'`; audited (Node + Chromium) |
| T2 | Accounts (future) | Mass account creation, Sybil, credential stuffing | High | Proportional identity (Constitution art. 6): rate limits, proof-of-personhood options without mandatory ID, device/risk signals, no paid influence | **Not built.** No accounts; no public contributions (art. 6 respected) |
| T3 | Contributions and votes | Coordinated manipulation, brigading, vote buying | High | Popularity kept separate from evidence (art. 3); per-dimension rankings; anomaly detection on bursts; audit trail; appeals | Lifecycle: votes, payment and popularity cannot move a state (tested) |
| T4 | Agent conversations | Prompt injection, data exfiltration, harmful content | High once a model is used | No tool or private data reachable from chat; grounding on records only; safety screen before the model; output checks (numbers must exist in records, as in the existing `llm.js` validator) | Deterministic adapter (no model); injection text inert and labelled; PII redacted; threats, hate and insults refused per message |
| T5 | Evidence | Data poisoning, false evidence, forged sources | High | Evidence enters only through dated, checksummed snapshots of authorized sources (FD09); user-suggested sources are leads, never evidence, until verified | Contributions are marked unreviewed and local |
| T6 | Scientific results | Manipulation by funders, customers or insiders | Critical | See §4 (institutional independence); immutable decision history; independent review | Design only |
| T7 | Geographic data | Disclosure of sensitive or withheld sites | High | `geo-policy.mjs` on every channel (navigation, agent tools, data access, visualization, simulation), failing closed; no reconstruction of withheld detail | Mechanism + tests; **published list empty** (no jurisdiction reviewed) |
| T8 | Institutional tenants | Cross-tenant leakage, private data entering public knowledge | Critical | Separate storage per tenant; private-to-public promotion only through explicit, reviewed publication; FD10 R2 | Design only |
| T9 | Payments (future) | Fraud, card data exposure | High | A PCI-compliant processor handles cards; CORE never stores card data; entitlements are separated from authority | Not built; no billing (by instruction) |
| T10 | Admin and agent execution | Privilege escalation, unbounded autonomous loops | High | Existing budgets (`maxTasks`, `maxMs`, `maxRecords`), STOP file, scheduler limits, human-only approvals | Unchanged |
| T11 | Availability | DDoS, tile-provider outage | Medium | CDN, rate limits, self-hosted PMTiles as a fallback | World shows "source unavailable" and keeps panels usable |
| T12 | Local development | Exposed servers or profiles (the incident) | High | `--bind 127.0.0.1`; integrity gate rejects databases and profiles; backups | Enforced and tested |
| T13 | Privacy | Re-identification from contributions and location traces | High | Pseudonyms; precise location never published; contributions tied to a segment, not a person; avatar position never stored | Avatar position kept in memory only; contributions local |

## 3. Conversation safeguards (CORE-specific rules)
1. **Proportionality.** A refused message is refused alone; the conversation continues. Refusal reasons are explicit (threat, hate, insult, spam, rate limit, length).
2. **Privacy.** Email addresses, phone numbers and street addresses are removed before display. The user is told why.
3. **Injection.** Instructions to override rules are ignored and labelled as such. The agent has no hidden instructions and no privileged access to reveal.
4. **Grounding.** Answers cite records. Missing information is stated ("aucune proposition enregistrée"). No solution is invented.
5. **Memory scopes (design):**
   - current conversation (default; ends when the panel closes);
   - current problem (shared, public records only);
   - user-approved preferences;
   - user-approved contribution history;
   - public scientific knowledge.
   Agents never share private memory with each other; retention and deletion follow the decision register.
6. **Appeal and correction (design):** every moderation action records rule, time and actor, and can be appealed to a human. Corrections stay in the history.

These rules are CORE's own, compatible with provider usage policies; no provider policy text is copied.

## 4. Institutional independence
- **Funding versus findings:** paying customers fund analysis and services. They cannot buy findings, rankings, suppression of public-interest results, or access to private citizen data.
- **Sponsored work:** it is labelled as such, and its methods and limitations are published with the result.
- **Conflicts of interest:** disclosed on every institutional dossier.
- **Review:** independent of the paying party.
- **Public and private data:** separated per FD10 R2.
- **Audit:** decision histories cannot be rewritten; corrections are appended.

## 5. Checks run this session
- Node: `test/world.test.js` (7 tests: geo, safety, dialogue, contributions, geo policy, entitlements, economics). Full suite: see the delivery report.
- Chromium: `scripts/world-audit.mjs` (30 checks, including CSP, GET-only requests to two hosts, PII removal, injection inertness, no uncaught errors).
- Integrity gate on every commit (secrets, PII, databases, profiles).
- **Not done:** a penetration test, abuse testing at scale, or a review of the safety lists by a moderation professional.
