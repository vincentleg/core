# Phase 8 — security, privacy and legal review

This document is not legal advice, and CORE makes **no compliance claim** (GDPR, CCPA/CPRA or other) without professional review.

## Privacy

| Change | Effect |
| --- | --- |
| Fonts **self-hosted** (`assets/fonts/`: Oxanium, IBM Plex Sans, IBM Plex Mono; SIL OFL 1.1 with the licence texts included), on the globe and on the corridor page | No request to Google Fonts; closes Phase 7 legal-risk item 1 for fonts. CSP is now `font-src 'self'`, with Google hosts removed from `style-src` |
| **`privacy.html`** | Factual notice of actual behaviour: no account, cookie or analytics; browser storage keys; every third-party service with its purpose and timing; CSP; no compliance claim. Linked from the landing and the navigation bar |
| MapLibre **not** self-hosted | `CLAUDE.md` forbids committing dependencies. MapLibre 5.7.3 stays on unpkg, pinned with SRI. Vendoring it (BSD-3, ~940 KB) would remove one more third-party request; it needs the founder's decision because it changes a repository rule |

**Remaining third-party requests**, each disclosing the visitor's IP address to the provider:
- GitHub Pages (hosting);
- unpkg (MapLibre);
- OpenFreeMap (map tiles);
- NASA GIBS (opening imagery);
- AWS (terrain tiles, only when relief is on);
- DataSF, USGS and NWS (when the in-browser monitoring refreshes);
- GitHub API (data-health view).

## Data rights

**New source:** OpenStreetMap pedestrian network.

| Field | Value |
| --- | --- |
| Owner | OpenStreetMap contributors |
| Licence | ODbL 1.0 |
| Commercial use | Allowed with attribution and share-alike of the derived database |
| Attribution | Map attribution control ("© OpenStreetMap contributors") and the file metadata |
| Processing | Pedestrian geometry only (no names or other tags), for display routing, never as evidence |
| Retention | Versioned snapshot |
| Sensitivity | Low |
| Scope | SoMa corridor area, retrieved 2026-10-14 |
| Access | One bounded Overpass request with an identifying user agent |

`data/osm/walk-network.json` is a derived database and is published under ODbL. The entry `dataset:osm-walk-network` is in `src/data-policy.js`.

**Unchanged policies:**
- Open-Meteo stays quarantined and blocked by the CSP;
- no personal data: 311 individual requests, owner names and police incidents remain excluded.

## Agent security

| Threat (brief §11.3) | Control | Evidence |
| --- | --- | --- |
| Override its own permissions | Registry objects are frozen, and `ORG.canUse` checks every tool call | Test: assigning `permission` throws `TypeError` |
| Modify governing policy, rewrite audit history | Policy lives in code reviewed by git hooks; queue events are SHA-256 hash-chained | Test: editing an event breaks `verify()` |
| Create subordinate agents | No API creates agents; the registry is built only from `src/org.js` | Code review |
| Access credentials or exfiltrate data | The supervisor disables `fetch` (empty network allowlist) and imports no shell or network module; the public site never contacts a model; the CSP restricts outbound hosts | Test: the supervisor source has no `child_process`, `exec`, `spawn` or `eval`, and replaces `fetch` |
| Execute arbitrary commands | No shell in the supervisor; tools are pure functions on the verified snapshot | Same test |
| Change production autonomously | The supervisor writes only `.core-local/` and, with `--record`, `data/operations/log.json`; publishing still needs a human commit, which runs the hooks | Test: write targets are allowlisted |
| Circumvent human approval | Only `human:<name>` can complete a task or lift an emergency stop | Tests (queue and supervisor) |
| Run unbounded | Time budget per task, bounded attempts, queue size, concurrency 1, pacing, emergency stop file, single-writer lock (prevents a race that could erase a stop) | Manual test recorded in the report |
| Prompt injection | External text (feeds, tool output, other agents' statements) is passed to the model as labelled **untrusted data**. Model output is validated against the evidence (citations, numbers, meaning). The gateway recomputes every tool and re-validates. The model never chooses non-permitted tools | Phase 4–5 tests, plus `src/cognitive.js` system rules |

## Findings fixed in Phase 8

1. **Emergency-stop race.** A `stop` written while the supervisor was saving could be overwritten, losing the stop event from the chain. Fixed with a process lock: while a supervisor runs, `stop` only writes the STOP file, and the running process records the stop itself.
2. **Phase 7 undercount.** Phase 7 reported 8 agents with recorded work; 23 is correct. Documentation corrected.

## Brand and hosting

- **Brand:** the CORE wordmark is original, but **no trademark search** has been done. Clearance is needed before commercial use.
- **Hosting:** GitHub Pages remains for this non-commercial prototype only; its terms exclude commercial SaaS. No paid hosting.

## Scan

- `scripts/integrity-check.mjs` reports 0 findings; the hooks are active and were never bypassed.
- No secrets or credentials exist in the client or the repository.
