# CORE V3 — founder decision register (2026-10-15)

Product ideas in the V3 mission are **not** constitutional rules until the founder approves them explicitly, with a date and provenance (Constitution V1 art. 8). Nothing below changes `docs/CONSTITUTION_V1.md` or `docs/FOUNDER_DECISIONS.md`.

## A. Already approved (unchanged, in force)
| Ref | Decision |
|---|---|
| Constitution V1 | Scientific integrity, useful dissent, deterministic verification, strict human authority, privacy and anti-Sybil before public contributions, honesty and rights, continuity |
| FD05 | CORE code provisionally proprietary; free static hosting; third-party obligations audited |
| FD08 | Minimal, safe tooling at zero added cost; memory, MCP, routing and multi-agent tools only when need, trust, compatibility and cost are demonstrated (V3 added no dependency) |
| FD09 | No data access, processing or redistribution without demonstrated authorization |
| FD10 R1–R5 | Civilization is the immediate technical priority; World is the long-term participatory interface; Business is separate; avatar evolution never ranks human worth; no protection weakened; no invented history |
| V3 mission (2026-10-15) | Local, reversible V3 prototype work authorized. No push, merge, deploy, billing, paid tools or cloud |

## B. Proposed in V3 (need explicit founder approval)
| # | Proposal | Interaction with current rules |
|---|---|---|
| **A1 (amendment)** | Make the visual Earth (World + Intelligence on one shared world) **the central product experience** | Conflicts with Constitution art. 1 ("World … optional and distant") and with the FD10 R1 priority order. Needs a dated amendment, or confirmation that World stays secondary while prototyped |
| **A2 (amendment)** | Art. 8 prefers calibration and independent validation over new visual features. Add: "visual work is allowed when it exposes existing evidence and does not substitute for validation" | Would bring the V3 slice into line with art. 8 |
| P1 | One shared world model; rendering never writes data (ARCHITECTURE §2) | Consistent with art. 2 and 4 |
| P2 | Realistic radius around human avatars, configurable (default 10 m; prototype range 0–50 m) | Product choice |
| P3 | Contribution lifecycle with actor rules (`contributions.mjs`) | Uses existing gateway labels; adds "Retenue pour étude", "Mise en œuvre autorisée", "Mise en œuvre", "Résultat en cours de mesure", "Résultat vérifié" |
| P4 | Earned competencies (Observer, Investigator…) separate from paid capabilities | Consistent with FD10 R3 / FC19 |
| P5 | Consumer tiers Free / Plus €2.99 / Premium €6.99 / Expert €14.99 with `NEVER_FOR_SALE` | New commercial policy; prices are hypotheses |
| P6 | Institutional offers City / Region / Government / Enterprise with independence safeguards | Enterprise = Business (FD10 R2) |
| P7 | Conversation safeguards and memory scopes (THREAT_MODEL §3) | Consistent with art. 6 |
| P8 | Geographic restriction policy (data-driven, fail closed, empty until legal review) | Consistent with FD09 |

## C. Require authorization before any action
| # | Action | Why |
|---|---|---|
| C1 | Push `upgrade/v2-hardening` (V2 + V3 local commits), or split them into PRs | Repository rule |
| C2 | Merge PR #3 and deploy (production still serves the vulnerable MapLibre 5.7.3) | **Release priority**: security fix pending |
| C3 | Publish `world.html` publicly (it would ship with any merge of this branch) | FD10: "do not claim a public platform exists"; art. 6 (no public contributions; the prototype keeps them local) |
| C4 | Add a dependency (Three.js / three-vrm) for 3D avatars | Constitution art. 7 (no tool adopted implicitly) |
| C5 | Any billing provider, account system, cloud hosting or analytics | `AGENTS.md`, mission constraints |
| C6 | Overture Maps or any new dataset | FD09 review per theme |
| C7 | Firewall, session sign-out, password changes, router check (incident F1, F2, F4, F6) | Founder-only |
| C8 | Install a newer Firefox, or enable Safari Remote Automation, for cross-browser tests | System changes |

## D. Deferred
- Creator marketplace.
- Government offer details beyond principles.
- Photorealistic data sources.
- WebGPU.
- Global streaming infrastructure.
- Real-time multi-user presence.
- Local-model conversations in World.
- Appearance-based customisation beyond the presets.
