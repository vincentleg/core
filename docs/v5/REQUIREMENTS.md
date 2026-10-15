# CORE V5 — remaining requirements: TRUST, Dialogue, Expert Network, Communities, continuous Knowledge ingestion (2026-10-15)

**Status: requirements only.**
- Nothing here is activated: no multi-user feature, no account, no external AI service, no server.
- "Done today" lists what exists in the repository and can be reused.

## CORE TRUST (mandatory foundation; blocks every public multi-user feature)
| Requirement | Done today | Missing |
|---|---|---|
| Authenticated identity | Pseudonymous profile model (`src/civic/identity.mjs`), local only | Passkeys (WebAuthn), recovery codes, session management, account deletion, server |
| Proportional anti-Sybil (Constitution art. 6) | Public voting closed; one role per tournament | Personhood signals without mandatory ID, per-account budgets, coordinated-account detection |
| Authorization | Owner-only rules expressed in modules (policy, not security) | Server-side enforcement, roles, institutional grants, least privilege |
| Tamper-evident audit log | Agent-side SQLite chains; vault version chain; Knowledge answer validator | Append-only server log anchored externally (or a signed log), covering moderation, judging, reviews and grants |
| Privacy | Encrypted vault at rest; data minimised; unpublished privacy draft | Published notice (publisher identity, L1–L16), retention and deletion jobs, DPIA, breach procedure tested |
| Moderation and appeals | Proportional message screening (`src/world/safety.mjs`) | Human moderators, queues, appeals SLA, transparency reports, DSA review if EU |
| Child safety | Gating: teacher-demo only, no ranking or public bio for non-adults | Safeguarding policy, counsel review, guardian/school onboarding |
| Security operations | Integrity gate, CSP, backups, incident record | Incident F-actions closed; `main` protection (OP01); dependency monitoring; penetration test |

## CORE Dialogue (conversation with agents)
- **Prerequisite:** CORE Knowledge as the only source of facts. It now exists for public records: `src/kb/knowledge.mjs`.
- **Missing:**
  - an optional local-model adapter behind the Knowledge validator (every number and claim must cite a record, or the answer is refused);
  - the model is never given tools or private data;
  - per-user rate and cost budgets;
  - evaluation sets for grounding and refusals.
- **External AI services:** **forbidden** without founder approval (`CLAUDE.md`: no CORE data to external providers).

## CORE Expert Network
- **Missing:**
  - registered credential verifiers;
  - a verification workflow and expiry;
  - impersonation reports;
  - liability boundaries (no individual medical, legal or engineering advice through CORE);
  - expert conflict-of-interest disclosure;
  - payment to experts, if ever (later, with approval).
- **Today:** expertise is "déclarée" only, and no verifier exists by design.

## CORE Communities
- **Missing:** everything multi-user, including forums or rooms, membership, moderation tools, reporting, blocking, rate limits, and adult/minor separation.
- **Prerequisites:** all of TRUST.

## Continuous Knowledge ingestion
- **Today:** dated snapshots with SHA-256 manifests (`data/*/manifest.json`); Knowledge checks dataset files against them.
- **Missing:**
  - an FD09 review per source before ingestion;
  - scheduled snapshots with diff review (the city-feed bot is the template; publication through PRs under OP01);
  - anchoring of registry files (`problems`, `agents`) in a manifest, which today are "unanchored";
  - provenance for derived records;
  - poisoning checks (sudden distribution shifts, unexpected new fields);
  - a human reviewer for new sources.

## Recommended order
1. Close the incident F-actions and release the MapLibre hotfix.
2. Decide the constitutional reconciliation.
3. TRUST design review (identity, audit log, moderation) with counsel.
4. Anchor registry files in a manifest (cheap, local).
5. Knowledge evaluation set.
6. A local-model Dialogue experiment behind the validator.
7. Only then, Expert Network and Communities.
