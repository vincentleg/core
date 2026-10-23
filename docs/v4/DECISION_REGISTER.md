# CORE V4 — founder decision register (2026-10-15)

This continues [docs/v3/DECISION_REGISTER.md](../v3/DECISION_REGISTER.md); all V3 entries still stand. Nothing here changes the Constitution or FD01–FD10.

## Already approved (in force)
- Constitution V1.
- FD01–FD10 (FD05: proprietary code and free hosting; FD08: minimal tooling at zero added cost; FD09: authorized data only; FD10: R1–R5).
- **V3 and V4 missions:** local, reversible prototypes authorized. No push, merge, deploy, public launch, payments, paid tools, cloud, or minors.

## Proposed in V4 (need explicit decision)
| # | Proposal | Where |
|---|---|---|
| P1–P15 | Fifteen constitutional principles: empowerment, epistemic transparency, human authorization, contributor rights, pseudonymity, civic fairness, minors, independence, transparent AI evaluation, resilience, accessibility, responsible monetization, appeals, restrictions, simulation vs reality | [CONSTITUTIONAL_AMENDMENTS_PROPOSED.md](CONSTITUTIONAL_AMENDMENTS_PROPOSED.md) |
| A1, A2 | Amend art. 1 (World as the central experience) and art. 8 (visual work that exposes evidence) | same |
| D1 | Identity model: pseudonymous, private by default, declared ≠ verified, passkeys for future accounts | ARCHITECTURE §2 |
| D2 | Idea Vault: contributors keep their rights; fingerprints are not patents; explicit publication with a licence | ARCHITECTURE §3 |
| D3 | Labs: a checklist, not a score; 5 analyses per idea per day; contests to a human | ARCHITECTURE §3 |
| D4 | Arena: no public voting until vote integrity exists; ≥3 independent, justified judges; results never authorize | ARCHITECTURE §3 |
| D5 | Progression: specific, documented achievements; thematic or regional opt-in rankings for adults only; nothing sold | ARCHITECTURE §8 |
| D6 | Academy pathways (age ranges are hypotheses) and the child-safety architecture | ARCHITECTURE §4 |
| D7 | World News for Education editorial model (human editor, FACT/OPINION/HYPOTHESIS/DEVELOPING) | ARCHITECTURE §5 |
| D8 | Schools as an institutional line in the economic model | [ECONOMIC_UPDATE.md](ECONOMIC_UPDATE.md) |

## Requires authorization before any action
| # | Action | Why |
|---|---|---|
| R1 | **Release the MapLibre 6.11.2 security fix (PR #3) separately from V2–V4** | Production still serves a vulnerable version |
| R2 | Push `upgrade/v2-hardening`, or split it into reviewable PRs (V2 hardening / V3 World / V4 Commons) | Repository rule |
| R3 | Publishing `world.html` or `commons.html` (any merge would) | FD10; Constitution art. 6 |
| R4 | Any account system, server, trusted timestamp service (RFC 3161 TSA), payment provider or analytics | AGENTS.md; cost; privacy |
| R5 | Any work with real minors, schools or families | Safeguarding, legal and security review (P7) |
| R6 | Legal review of the vault (IP, disclosure, evidential value of fingerprints) and of the child-safety design | Counsel |
| R7 | News sources for World News for Education | FD09 licence review |
| R8 | Remaining incident actions: firewall, sessions, passwords, listeners, router | Founder-only |

## Deferred
- Collaboration inside the vault.
- Model-assisted Labs.
- Public Arena.
- Real classrooms.
- Live news.
- Continuity dependency maps.
- Creator marketplace.
- Government offer details.
