# CORE — compliance audit (engineering preparation, 2026-10-15)

**This is not legal advice and not a compliance certification.** It records what the code and site *actually do* and which legal questions they raise. No qualified lawyer has reviewed CORE. Passing tests prove software behaviour only.

**Scope:** branch `consolidation/phase9-13`; the public static site (GitHub Pages: `index.html`, `research.html`, `privacy.html`, `corridor.html`, `control.html`); GitHub Actions; and local owner tooling.

**Canonical documents this audit builds on, not replaces:**
- [PRIVACY_AND_REGULATORY_READINESS.md](../PRIVACY_AND_REGULATORY_READINESS.md)
- [IP_AND_ATTRIBUTION.md](../IP_AND_ATTRIBUTION.md)
- [SECURITY_BASELINE.md](../SECURITY_BASELINE.md)
- [DATA_SOURCES.md](../DATA_SOURCES.md)
- `privacy.html`

**Companion documents:**
- [DATA_PROCESSING_INVENTORY.md](DATA_PROCESSING_INVENTORY.md)
- [THIRD_PARTY_SERVICES_REGISTER.md](THIRD_PARTY_SERVICES_REGISTER.md)
- [SECURITY_AND_INCIDENT_READINESS.md](SECURITY_AND_INCIDENT_READINESS.md)
- [PUBLIC_LAUNCH_CHECKLIST.md](PUBLIC_LAUNCH_CHECKLIST.md)
- [LEGAL_DECISIONS_REQUIRED.md](LEGAL_DECISIONS_REQUIRED.md)

## Facts established in this pass (evidence)

| Fact | Evidence |
|---|---|
| No cookies, analytics, ad trackers, beacons, geolocation, IndexedDB or browser fingerprinting in site code | `grep` over `src/*.js` and the HTML pages; "fingerprint" hits are SHA-256 hashes of data |
| Browser storage: `sessionStorage` key `core.entered`; `localStorage` keys `core.missions.v1` (summaries of missions the visitor ran), `core.human-decisions.v1` (visitor's own review choice and free-text note, ≤ 200 chars), plus the feed-watch cache (`src/platform.js:48`) | `src/entry.js:31,47`; `src/platform.js:48,50,234,453,455` |
| The privacy notice lists `core.entered` and the feed-watch cache, but **not** `core.missions.v1` or `core.human-decisions.v1` | `privacy.html` line 35 vs the code above; notice dated 2026-10-14 |
| Forms: `index.html` local search (no submission off-device) and range sliders; `research.html` local controls. CSP `connect-src` stops any upload of form data | CSP in each page; `research.html` `connect-src 'self'` |
| The visitor's browser contacts third parties directly: OpenFreeMap, NASA GIBS, AWS terrain tiles, DataSF, USGS, NWS, the GitHub API (data-health view). Each receives IP and user agent | `index.html` CSP; `privacy.html` table (accurate for these) |
| No accounts, authentication, payments, email, newsletter, comments or uploads exist | Code inventory; no server application |
| No legal notice, operator identity, postal contact, terms of use or IP notice page; contact = the public GitHub repository | Page inventory |
| Published city data includes **property addresses** (building permits, energy benchmarks) and **permittee/contractor names**, usually companies but possibly sole traders | `data/sf/building-permits.geojson`, `data/sf/energy-benchmarks.geojson`, `data/sf/permits.geojson`, `data/sf9/permits.json` |
| Public Git history: 3 commits carry a personal email address as author email; the rest use GitHub no-reply addresses | `git log --format=%ae` (masked here) |
| **Incident (2026-10-15):** a local `python -m http.server 8000` started 2026-10-13 served the repository root on all interfaces, including `.core-local/*.sqlite` (agent and system memory) and `.git/` (no credentials found). It was stopped with founder approval | [SECURITY_AND_INCIDENT_READINESS.md](SECURITY_AND_INCIDENT_READINESS.md) §Incident record |

## Classification

**Columns:**
- **Appl.** = applies now: yes / no / uncertain / future.
- **Launch** = blocks a *public launch* of participation or commercial features (the current static prototype is already public).
- **F** = needs founder decision.
- **L** = needs qualified legal review.

| # | Requirement | Jurisdiction | Appl. | Status | Evidence | Risk | Remediation | Launch | F | L |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Operator identity / legal notice ("mentions légales") | FR/EU (LCEN art. 6-III, if the publisher is FR-based or professional); others vary | uncertain | MISSING | No page | Medium | Decide publisher identity and jurisdiction, then publish a reviewed notice | yes | F | L |
| 2 | Contact information | Most | yes (good practice; legal for professional publishers) | PARTIAL | GitHub repository only | Low | A dedicated contact channel once the publisher is decided | yes | F | — |
| 3 | Hosting disclosure | FR (LCEN) if applicable | uncertain | PARTIAL | `privacy.html` names GitHub Pages | Low | Include in the legal notice | yes | F | L |
| 4 | Privacy notice accuracy and transparency | GDPR Art. 12–14 if applicable; CalOPPA if PII is collected from CA residents | uncertain (no direct collection) | **PARTIAL: inaccurate** | Two storage keys undisclosed | Medium | Proposed corrected text below, **not published** (production-facing policy) | yes | F | L |
| 5 | Terms of use | — | future (no accounts or UGC) | MISSING | — | Low now | Draft with counsel before any participation | yes | F | L |
| 6 | Terms of sale, subscriptions, cancellation, refunds, withdrawal | EU CRD, CA ARL, FTC "click-to-cancel" rules where in force | future (no payments) | NOT APPLICABLE NOW | No payment code | — | Before any paid feature | yes (paid) | F | L |
| 7 | IP notices (project code, third-party) | Copyright law | yes | PARTIAL | FD05 proprietary; third-party licences present (`assets/vendor`, `assets/fonts/OFL-*`); no project notice on the site | Low | Add a short visible notice in the legal page | no | F | L |
| 8 | UGC rules / moderation (DSA for hosting services in the EU) | EU DSA; US §230 context | future | MISSING | No UGC | — | Before CORE World contributions | yes | F | L |
| 9 | GDPR / UK GDPR territorial scope | Art. 3(1) establishment; Art. 3(2) targeting or monitoring | **uncertain** | — | French-language site; founder location undetermined; no monitoring or analytics | Medium | Counsel determination (see LEGAL_DECISIONS_REQUIRED) | yes | F | L |
| 10 | Joint controllership for embedded third-party requests (CJEU C-40/17 *Fashion ID*) | EU if GDPR applies | uncertain | Documented in `privacy.html` | Visitor IPs flow to 7 third parties | Low–Medium | Counsel view; consider self-hosting tiles and imagery or lazy loading on user action | no | F | L |
| 11 | CCPA/CPRA | California | **no today** (no for-profit business meeting the thresholds; no sale or sharing); future | — | No revenue, no personal-data sale | — | Re-check at commercial launch (thresholds in Cal. Civ. Code §1798.140(d), verify current adjusted figures) | no | F | L |
| 12 | Browser storage consent (ePrivacy Art. 5(3); CNIL guidance) | EU/FR if applicable | uncertain | No banner (correct if exempt) | All keys functional and user-initiated; no tracking | Low | Counsel to confirm the "strictly necessary / requested by the user" exemption; **no banner added for appearance** | no | — | L |
| 13 | Data minimization in published data | GDPR Art. 5(1)(c) if applicable; CCPA public-records exemption | uncertain | PARTIAL | Addresses and permittee names published; 311 and owner names excluded by design (`privacy.html`) | Medium | Counsel review; option: aggregate to block level or drop `agent` for non-company names | no | F | L |
| 14 | Data-subject rights (access, rectification, erasure, portability, objection) | GDPR Art. 15–22 | future (no direct data subjects) | DOCUMENTED ONLY for the sandbox | WS12 sandbox: correction, withdrawal, logical erasure tested (`test/contributions.test.js`) | — | Design in DATA_PROCESSING_INVENTORY §Retention before accounts | yes | F | L |
| 15 | Retention and deletion policy | GDPR Art. 5(1)(e) | future | MISSING (policy); PARTIAL (logical deletion) | No retention schedule; Git history and backups not purgeable by app | Medium | Retention architecture proposal in DATA_PROCESSING_INVENTORY | yes | F | L |
| 16 | Automated decision-making (Art. 22) | GDPR | no (no decisions about people) | N/A | Agents analyse infrastructure, not individuals | — | Re-assess if Business scores organizations or people | no | — | L |
| 17 | International transfers | GDPR Ch. V | uncertain | — | US-hosted services only | Low now | Counsel, at the time of EU users | yes | F | L |
| 18 | DPIA triggers (location data, large-scale, minors) | GDPR Art. 35 | future | — | Participatory Earth with location = likely trigger | — | DPIA before CORE World participation | yes | F | L |
| 19 | Breach notification | GDPR Art. 33–34; US state laws | future (minimal personal data) | Framework drafted | SECURITY_AND_INCIDENT_READINESS | — | Test procedure | no | F | L |
| 20 | Children (COPPA <13; GDPR Art. 8, 13–16 by member state, FR 15; UK AADC) | US/EU/UK | future (no accounts) | MISSING (design) | — | High when World opens | No participation by minors until an age-appropriate design and legal assessment exist; no intrusive age verification | yes | F | L |
| 21 | Accessibility (WCAG 2.2 AA target; EU EAA for in-scope commercial services; ADA unsettled) | EU/US | uncertain now; yes for Business | PARTIAL | Chromium probe: no missing alt or labels, zoom allowed; landmarks, `h1` and target size fixed in a local commit; keyboard focus visible on all tested stops; screen readers and contrast not tested | Medium | See PUBLIC_LAUNCH_CHECKLIST §Accessibility | yes | — | L |
| 22 | AI transparency (EU AI Act Art. 50; FTC deception) | EU/US | partial | PARTIAL | No AI runs for visitors; recorded agent outputs labelled "relecture" / synthetic | Low | Keep labels; re-assess for model-driven features | no | — | L |
| 23 | Scientific and marketing claims (FTC Act §5, EU UCPD) | US/EU | yes | PARTIAL | Labels distinguish synthetic, recorded, uncalibrated; the landing says "missions d’IA enregistrées · coût d’exploitation nul" | Medium | Review public wording before any commercial use; no testimonials, results or customers claimed | yes (commercial) | F | L |
| 24 | Third-party licences (code, fonts, maps, data) | Copyright and database rights | yes | VERIFIED for listed items | IP_AND_ATTRIBUTION | Low | Keep; re-verify at commercial use (OSM ODbL, terrain providers) | no | — | L |
| 25 | Dataset rights (FD09) | Per source | yes | ENFORCED as rule; NYC and SFMTA BLOCKED | FD09, readiness doc | — | Founder rights decisions | no | F | L |
| 26 | Business/World data isolation | Contract and privacy law | future | DOCUMENTED ONLY | No tenant data exists; boundary rules in PRIVACY_AND_REGULATORY_READINESS | High when Business starts | Tenant isolation design (below) | yes (Business) | F | L |

## Proposed privacy-notice correction (NOT published; founder and counsel approval required)

Add to the `localStorage` row of `privacy.html`:
- `core.missions.v1`: summaries (identifier, state, decision state, hash, time) of up to 10 missions you ran in this browser.
- `core.human-decisions.v1`: the review choice and optional note (≤ 200 characters) you typed in the decision panel; never sent anywhere.

Update the "Dernière mise à jour" date. Effect: transparency only; no code change.

## Business / World isolation (design requirement, nothing implemented)

Separate storage and keys per tenant. Business data is never readable by public contribution paths, shared agent memory, public dashboards, logs or model prompts. Enforcement points:
- a **tenant id** on every memory row, enforced in `src/civ-memory.js` queries;
- per-tenant SQLite files;
- an export allowlist;
- no third-party model API for tenant data without a DPA and founder approval;
- tests asserting that cross-tenant queries return nothing.

Public contributions never grant access to private data (PRIVACY_AND_REGULATORY_READINESS, FC22). Today there is no tenant data and no Business code, so the risk is architectural, not active.
