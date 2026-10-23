# CORE — data processing inventory (2026-10-15)

Engineering record of what data CORE actually processes, where and why. It is not a GDPR Art. 30 register (that requires a determined controller and counsel), but it is structured so it can become one. Personal data: **P** = yes, **p?** = possibly, **—** = no.

## Current processing

| # | Activity | Where | Data categories | Personal | Purpose | Retention today | Deletion today |
|---|---|---|---|---|---|---|---|
| 1 | Serving the public site | GitHub Pages | Visitor IP, user agent, request logs (held by GitHub) | P | Hosting | GitHub's policy (not controlled by CORE) | Not controllable by CORE |
| 2 | Map, imagery and terrain tiles | Visitor browser → OpenFreeMap, NASA GIBS, AWS | IP, user agent, tile coordinates (indicate area viewed) | P | Map display | Third parties' policies | — |
| 3 | Live feed watch in the browser | Visitor browser → DataSF, USGS, NWS; cached in `localStorage` | IP to sources; public records cached locally | P (IP) | Show fresh public data | Until the visitor clears storage | Visitor clears browser data |
| 4 | Data-health view | Visitor browser → api.github.com | IP, user agent | P | Show workflow history | GitHub's policy | — |
| 5 | Visitor's local review notes and missions | `localStorage` (`core.human-decisions.v1`, `core.missions.v1`); `sessionStorage` `core.entered` | Free-text note ≤ 200 chars, choices, mission summaries | p? (free text) | User-requested functionality | Until cleared (session key: until tab closes) | Visitor clears browser data |
| 6 | Scheduled collection of public city data | GitHub Actions → official portals; committed to `data/` | Public records incl. **property addresses** and **permittee/contractor names** | p? | City Intelligence | Indefinite (Git history) | New commits can drop fields; **history is not purgeable** without a rewrite |
| 7 | Local agent memory and queues | Owner machine `.core-local/*.sqlite` | Agent episodes, findings, events; owner decisions if any (`human:` labels) | p? (owner label) | Agent memory | Indefinite | Manual file deletion; no retention job |
| 8 | WS12 contribution sandbox | Owner machine (tests and demo) | **Synthetic** actors only | — | Prototype | Test files removed after tests | Logical erasure tested; physical purge not implemented |
| 9 | Optional local model | Owner machine, loopback Ollama | Bounded research text | — | Prose paraphrase | `keep_alive: 0` | — |
| 10 | Source code and commits | GitHub (public) | Author names and emails (3 commits use a personal email address) | P | Version control | Permanent (public history) | Rewrite would be destructive; use the no-reply email going forward |
| 11 | Development assistance | Claude Code (Anthropic), Codex (OpenAI) | Repository code and docs sent as prompts; no visitor data | p? (author info in files) | Development | Providers' policies under the founder's accounts | Provider controls |

## Future processing (triggered only by planned features)

| Feature | New data | Triggers |
|---|---|---|
| CORE World accounts and avatars | Identity, pseudonym, avatar, contribution history, optional precise location | Lawful basis, notice, DPIA (location; possibly minors), rights handling, retention, anti-Sybil, moderation (DSA) |
| Public contributions | Ideas, evidence files, critiques, reviewer notes | UGC terms, licensing of contributions, attribution, withdrawal, takedown |
| CORE Business | Enterprise operational data, user accounts, possibly employee data | Contracts and DPA (CORE as processor or controller), tenant isolation, sub-processors, breach duties |
| Payments | Billing identity, tax data | Processor terms, tax, consumer law |
| Real pilot datasets | Aggregated counts (no personal data intended) | FD09 rights, minimization |

## Proposed retention and deletion architecture (design; not implemented)

1. **Data classes with a retention period each** (founder and counsel set the values):
   - public scientific records: provenance kept, personal fields minimized;
   - contributor content: until withdrawal, plus a short grace period;
   - account data: until account deletion;
   - security logs: short fixed period;
   - backups: rolling window.
2. **Separate identity from provenance.** Contribution records reference a pseudonymous contributor id; identity lives in a separate store. Erasure deletes the identity row and replaces the contributor id in provenance with a tombstone. The scientific record (hash, decision, evidence) keeps integrity without identifying the person. Where a contribution itself is personal data, its text is purged and only a hash and a "withdrawn" marker remain.
3. **Physical purge job** with a test: after the retention period, rows are deleted (not flagged). SQLite `VACUUM`, and backups expire within their rolling window. The privacy notice must state the backup delay honestly.
4. **Git is never a store for personal data.** Real personal data never enters `data/` or the history (already a rule in PRIVACY_AND_REGULATORY_READINESS).
5. **Rights workflow:** verified request → export (portability) or erase → logged outcome. Response deadlines set with counsel.

**Known conflicts:**
- Public Git history and third-party caches cannot be purged, so personal data must never be committed.
- Scientific integrity versus erasure: resolved by step 2, keeping hashes and decisions, not identity.
- Legal retention duties (tax, disputes) apply only once commercial.

**What CORE can honestly promise today:** nothing beyond the visitor-controlled browser storage. Promising "immediate or universal deletion" would be false.

## Tests of existing rights mechanisms

`test/contributions.test.js` (run in the full suite, passing) covers:
- correction hides prior publication;
- withdrawal and deletion remove public access;
- public fingerprints exclude private coordinates;
- private notes are not exposed.

These are **logical** controls in a synthetic sandbox. Physical purge and retention timers are untested because they don't exist.
