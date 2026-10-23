# Foundation reset — evidence, gaps and phased plan

Checkpoint: 2026-10-22. Active isolated branch starts at `4b3fcb3` (`origin/v9.9/multilingual-text-first`). Its descendants `65c7aec` and `bfae215` are archived on the original local branch; this branch does not include standalone Explore World, the free 360° camera, Rocketbox assets or the sun-lit street layer. Git history and clean original worktree were inspected. The local release checkpoint says those two commits were neither pushed nor deployed; production was the founder-account deployment of `f887847` (`dpl_8PSrMvuu2BeugUWPVJBPsjUxpDGv`). This is documentary evidence, not a fresh remote deployment query. The Oct 21 visual correction `c2d6f5c` predates the founder authentication commits; returning directly to it would lose security and account work, so `4b3fcb3` is the exact latest known safe pre-Explorer source baseline. No Helsinki/Kalasatama assets occur in the two rejected commits.

## Factual inventory

| Maturity | Evidence in this tree | Practical limit |
| --- | --- | --- |
| Implemented and previously verified | Globe/SF and hybrid views, nine-step guided tour, deterministic missions/evidence gates, Phase 13 bounded research, local contribution tests, founder account RLS and API denials | Prior reports record tests; this branch still needs fresh regression and screenshots. Science is uncalibrated. |
| Implemented but not verified for a real user | Founder email-link login and editable private workspace | Actual founder inbox sign-in, save and logout pending. No general civic account. |
| Partial or prototype | Local avatar and contributions, fictional arena, synthetic hospital twin, optional local model, multilingual UI | Browser-local state is not shared persistence; 3D/avatar is not proof of an account; some translations lack qualified review. |
| Documented only | Phase 14 measured pilot protocol, external decision authority, institution controls | Rights, observations, preregistration, holdout and independent reviewer absent. |
| Newly proposed | Four offers, optional higher-assurance identity, geographic agent network, transparent proposal lifecycle, optional premium cosmetics | Product hypotheses; no billing, public moderation or global compute. |
| Blocked | Real impact claims, live civic intake, city/government transmission, company verification | Needs data rights, authenticated roles, anti-abuse, privacy/tenant review and human mandate. |

Sources: `docs/CONSTITUTION_V1_1.md`, `docs/FOUNDER_DECISIONS.md`, `docs/MASTER_ROADMAP.md`, `docs/PHASE_13_REPORT.md`, `docs/CORE_RESUME_CHECKPOINT.md`, `src/earth/demo.mjs`, `src/contrib/`, `src/civic/arena.mjs`, `src/me/`, `scripts/account/` and the Git ancestry. Recorded results are not fresh results.

## Site architecture and journeys

Proposed navigation: CORE (mission/entry), Explore (Real Earth, World, Hybrid), World (agents, problems, contributions), Business (clearly sponsored), Cities & Governments (future offer and limits), Solutions (scientific dossiers and applications), Manifesto, My CORE (local personal space or authorized founder workspace). Preserve existing routes and accessible text; migrate navigation only after route inventory, translation and regression checks. The first bounded change merely clarifies the existing hero actions: **Explore the Demo**, **Enter CORE**, **Discover CORE for Business**.

Anonymous visitor: landing → demo without account → SF supported place and labeled example → recorded agent inquiry → hypothetical idea held locally → scenario and uncertainty → report/authority boundary → offer overview and rights. The existing guided tour covers much of this, but timing, full offer/rights explanation and a genuine submission flow need review. Returning user: My CORE → avatar, contributions, ideas, followed places, conversations and privacy. Only local features may be shown as active; persistent civic account, achievements and conversations need distinct maturity labels. Business and institutional users require their own authenticated, isolated workflows.

## Architecture contracts before expansion

Reuse the static UI, MapLibre globe, deterministic engine/gateway, local registries, bounded research runner, contribution ledger and existing account handler. Define records for `human`, `avatar`, `verification`, `place`, `agent` (role, sponsor, place, permission, budget), `conversation`, `observation/idea`, `evidence` (source, rights, time, kind, hash), `simulation` (inputs, model, calibration, outputs), `review`, `decision`, `challenge`, `achievement`, `organization`, `consent` and append-only `audit_event`. Scope every private record to an authenticated owner/tenant and enforce in storage, not UI alone. Keep real fact, human claim, assumption, synthetic output, fictional example and commercial assertion as explicit types. Review migrations for compatibility, rollback and RLS before running any. On-demand agent identities may persist; execution is bounded and triggered, never millions of resident processes. No new dependency or service is justified at this checkpoint.

## Executable sequence

Each row is a separate reviewable phase. $0 means feasible with existing local/static resources at prototype scale, not a promise of free global operation.

| Phase | Reuse / minimal addition | Data and security gate | Tests, acceptance and risk | Maturity / $0 |
| --- | --- | --- | --- | --- |
| Foundation | Git baseline, existing build/tests; copy and documentation | Preserve history, accounts and private data | Exact baseline, diff, screenshots, regression; risk: undocumented live drift | In progress / yes |
| Product architecture | V1.1, FD rules, current routes; product constitution and map | No weakened authority or public opening | Review route/capability inventory and governance crosswalk; risk: misleading labels | Design / yes |
| Public experience | `world.html`, existing guided demo and text alternative; small copy and flow fixes | Explicit synthetic/source labels | Keyboard/mobile/browser tour, report and no-account path; risk: 3D/performance | Partial / yes |
| Human participation | `src/me`, `src/contrib`, account handler; scoped civic account plan | Consent, moderation, RLS, retention, abuse limits | Owner/isolation and refusal tests before real persistence; risk: user data | Prototype / local only |
| Agent network | Registry, scheduler and gateways; place/role/sponsor contract | Tool allowlists, budget, audit, no private-data invention | Deterministic identity/permission tests; risk: authority confusion | Partial / yes locally |
| Evidence pipeline | Phase 13 runner, science and contribution ledger; status/provenance contract | FD09 rights, fail-closed gates, signed human decision | Tamper/unknown-source and revision tests; calibrated pilot separately; risk: false impact | Partial / yes locally |
| Business pilot | Existing synthetic hospital twin and founder workspace; verified sponsor marker | Tenant isolation, consent, no scientific impersonation | Private API/RLS and copy review; no actual partner claim; risk: confidentiality | Prototype / yes locally |
| Cities pilot | SF dossier, scenario reports; resident workflow prototype | No government transmission absent mandate | Authorized-data and reviewer-gate tests; risk: data rights | Design / conditional |
| Gamification | Existing fictional arena; bounded achievement display | Anti-Sybil, harassment, appeal and equal access | Manipulation and accessibility tests; risk: biased incentives | Prototype / yes locally |
| Future commercialization | Existing Business/Plans descriptions; readiness dossier | No billing, payments or civic priority | Price hypothesis and consent review; risk: unvalidated demand | Hypothesis / yes for design |

Superseding sequence (2026-10-23): phases R0–R8, traceability, maturity inventory and decision memo in `docs/CIVILIZATION_FOUNDATION_2_0.md`; the table above remains the original reasoning.

Next measurable milestone: a complete, accessible SF demo in which a visitor can trace one idea from labeled example to reproducible scenario, missing evidence and human decision gate, with no false claim of implementation. Phase 14 scientific validation proceeds on its own protected track and must precede any measured-benefit claim.

## Local acceptance evidence

The restored branch remains at commit `4b3fcb395f81402ff012481c6094ed386a8204e4`; proposed changes are staged for review, **not committed, pushed or deployed**. `node scripts/build-public.mjs` built 201 files (21.8 MB). Focused product/demo/trust tests passed 16/16. `node scripts/verify.mjs` passed 353/353 after rerunning with loopback permission; the first sandboxed run had 350/353 because three existing local-server tests could not bind `127.0.0.1`. CSP and integrity checks passed within the final gate. `git diff --cached --check` is clean.

Fresh isolated Chromium software-WebGL screenshots are in `.core-local/evidence/foundation-reset/`: `restored-entry.png` and `restored-explorer.png`. The archived rejected `desktop-05-avatar-third.png` is copied there from the original worktree's October 22 Explore acceptance evidence. Visual comparison: the restored Explorer shows the original globe, three layers and mission/contribution controls; the rejected view adds the standalone street scene and third-person Rocketbox avatar. These are genuine captures at different interface states, not a pixel-diff or proof of equal load conditions. The fresh landing capture has a visible data-loading message; it proves the appearance and working WebGL render, not complete city-data load. Physical device, Safari, screen reader and live production were not tested in this checkpoint.

## Investor positioning, bounded by evidence

CORE can show a navigable Earth, SF research scenarios, recorded/deterministic agent roles, local contribution flow and a protected founder account. Spatial context makes location-specific tradeoffs legible; agents can organize bounded analyses; human participation supplies questions and criticism. Businesses might pay for consented discovery and research, and cities might use evidence-linked resident intake, but neither demand nor procurement is validated. Open-world interest and spatial AI are context, not proof of traction. No YC/a16z endorsement, customer, revenue, municipal partnership, independently validated efficacy or global capacity is claimed. The next fundable evidence would be the SF journey plus real user comprehension and, separately, an authorized calibrated pilot.
