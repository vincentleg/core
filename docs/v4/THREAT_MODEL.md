# CORE V4 — security and privacy threat model (2026-10-15)

This extends [docs/v3/THREAT_MODEL.md](../v3/THREAT_MODEL.md), which covers XSS, data poisoning, geography, tenants, payments and the incident. It is a design review plus the controls already coded; it is not a penetration test.

## Incident INC-2026-10-15-01 (re-checked at V4 start)
- **Resolved:** F3 (profile quarantined) and F7 (backup).
- **Still open (founder actions):**
  - firewall off;
  - session sign-out and passwords;
  - listeners on all interfaces: 3101, 8080, 5000/7000, 24267, 30304;
  - router.
- **Status:** contained, not resolved.

## V4 threats
| # | Threat | Surface | Control coded now | Control required before public use |
|---|---|---|---|---|
| V1 | Account takeover | Future accounts | None (no accounts) | Passkeys, recovery codes, rate limits, new-device alerts, session revocation |
| V2 | Pseudonym abuse / impersonation | Identity | Pseudonyms cannot carry contact details; declared ≠ verified; no self-verification | Reserved names, impersonation reports, verified badges only from registered verifiers |
| V3 | Sybil attacks | Contributions, votes, Arena | Public voting closed; a single role per person per tournament | Proportional personhood signals (no mandatory ID), per-account budgets, graph analysis of coordinated accounts |
| V4 | Voting manipulation | Arena, rankings | No public vote; median of ≥3 justified judge sheets | Vote integrity checks, anomaly detection, published methodology, appeals |
| V5 | Tournament collusion | Arena | Conflict declarations block judges; sheets sealed until closure; all sheets published | Judge rotation, inter-judge agreement statistics, recusal audits |
| V6 | Confidential idea exfiltration | Vault | Encrypted at rest (AES-GCM, PBKDF2 210k); owner-only grants; Labs reads only with permission; no network calls (CSP `connect-src 'self'`) | Server-side end-to-end encryption design, key escrow decision (none by default), logged access, breach notification |
| V7 | Prompt injection against Labs or agents | Labs, chat | Labs is rules-based (nothing to inject); World chat marks injection inert | Model sandboxing: no tools from untrusted text, output validation against records |
| V8 | False expertise claims | Profiles | Expertise is labelled DÉCLARÉE; no verifier exists | Credential verification by registered bodies; misuse reporting |
| V9 | Scientific data poisoning | Evidence | Contributions never become evidence without review (V3) | Evidence intake through FD09 snapshots only; provenance checks |
| V10 | Harassment | Chat, future comments | Proportional refusals (V3 `safety.mjs`); no direct messaging exists | Reporting, blocking, human moderation, appeals |
| V11 | DDoS | Any public endpoint | Static site only | CDN, rate limits, graceful degradation |
| V12 | Child safety | Academy | Teacher-demo only; fictional learners; no ranking or public bio for non-adult profiles | Safeguarding policy, counsel review, school or guardian onboarding, trained moderators |
| V13 | Institutional conflicts of interest | Contracts | `NEVER_FOR_SALE`; independence rules (V3 §4) | Contract clauses, disclosure registry, independent review board |
| V14 | Payment abuse | Future billing | None (no billing) | PCI processor, refund-fraud monitoring, no paid influence |
| V15 | Ranking manipulation | Future leaderboards | None exist; opt-in off; adults only | Achievement-based, auditable, appealable rankings |
| V16 | Vault passphrase loss | Vault | Users are warned that data is lost without the passphrase | Recovery design (optional escrow with consent), export |
| V17 | Shared-device exposure | localStorage | Vault encrypted; "Verrouiller" clears the key from memory | Auto-lock timer; per-device profiles |

## Privacy notes
- **New storage keys:** `core.commons.v1` (profile, Labs throttle log) and `core.vault.v1` (ciphertext only). Both are listed in the unpublished privacy draft.
- **Fingerprints:** they reveal nothing without the text, but identical texts produce identical hashes. A future public registry should add a per-idea salt if hashes are published.

## Checks run
- `test/civic.test.js`: 6 tests, covering tampering detection, wrong passphrase, permissions, publication, judge conflicts, sealing, academy gating and indicator sourcing.
- `scripts/commons-audit.mjs`: 30 Chromium checks, including the ciphertext-only storage check, CSP, GET-only requests and no uncaught errors.
