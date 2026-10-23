# CORE V5.1 — security foundations and Knowledge: report (2026-10-15)

Nothing was pushed, merged, deployed or published, and no constitutional text changed.

| Item | Result | Evidence |
|---|---|---|
| 1. Backup of the 18 unpublished commits | Full-history bundle, verified (`git bundle verify`), restored into a scratch clone: same HEAD `1f05e33`, same 18 commits, identical tree, 195/195 tests; active branch untouched | `~/CORE-backups/git/core-upgrade-v2-hardening-20261015T210110Z.bundle` (mode 600, SHA-256 `5cf8d1c4…37b1`) |
| 2. MapLibre hotfix | Local branch `hotfix/maplibre-6.11.2` = `22ce0d2` on `main` `358f6f6`; 20 files; 170/170, `verify.mjs` passed, integrity 0; Chromium main 159/159 (rerun), negative 12/12, lab 7/7 | [HOTFIX_RELEASE.md](HOTFIX_RELEASE.md) |
| 3. CORE Knowledge | `src/kb/knowledge.mjs`: allowlisted public files only; citations with record id, file SHA-256 and dataset integrity; status labels; uncertainty; refusals (no record, no evidence, private data, out of scope, unsupported claim, integrity, validation); every answer re-validated (fail closed). New "Savoir" tab in Commons | `test/knowledge.test.js`, `scripts/commons-audit.mjs` |
| 4. Security tests | Unauthorized access (allowlist, no storage or network in the module, private-data refusals); provenance tampering (dataset edit → integrity refusal; forged number, citation, hash, source or status → validation fails); malicious inputs (empty, oversized, threats, PII not echoed, markup stripped and never rendered); injection (claims identical with and without injection text); unsupported claims (cause, danger, repair, approval, efficacy refused) | 7 Node tests + 5 browser checks |
| 5. No regression | Node **202/202**; integrity 0 findings (416 files); World **30/30**; Commons **35/35** (30 V4 + 5 Knowledge) | Chromium 155 |
| 6. Constitutional reconciliation | FD02, FD10 R1, art. 1 and art. 8: verbatim current texts and proposed replacements. Validation stays mandatory before any claim; World can become central after approval. **Not applied** | [CONSTITUTIONAL_RECONCILIATION_PROPOSED.md](CONSTITUTIONAL_RECONCILIATION_PROPOSED.md) |
| 7. Remaining requirements | TRUST, Dialogue, Expert Network, Communities, continuous ingestion | [REQUIREMENTS.md](REQUIREMENTS.md) |

## Security findings this pass
- **Fixed during development**, before commit:
  - the validator's number check was a substring match, so a forged "6 ft" passed;
  - it read hex fingerprints and dataset IDs as numbers.

  Now it requires exact, standalone numbers, and an ISO-date normalisation was added. A sweep of all 98 problems × 2 questions shows no false refusals.
- **Found in the audits, fixed:**
  - the World audit could read the *previous* page's state after navigation;
  - the Commons audit asked questions faster than the 1.5 s rate limit.
- **Known pre-existing bug on `main`:** the activity/replay race (fixed in `01906b5` on this branch, not in the hotfix).
- **Integrity gap:** registry files (`problems`, `agents`, `manifest`) are "unanchored": hashed at load, with no reference hash. A manifest for them is listed in REQUIREMENTS.
