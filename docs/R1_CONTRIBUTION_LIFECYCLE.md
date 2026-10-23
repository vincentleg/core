# R1 — Human contribution lifecycle (founder review, 2026-10-23)

Branch `foundation/civilization-reset`, built on `dc4c0a1`. Scope: roadmap phase R1 in `docs/CIVILIZATION_FOUNDATION_2_0.md`. Local only: no backend, migration, external integration, transmission, payment, new dependency or rendering change. Not pushed or deployed.

## What exists now

- `src/contrib/lifecycle.mjs`: a pure state machine (no DOM, storage or network). States follow the product constitution: Draft, Submitted, Needs evidence, Under review, Simulation candidate, Simulated, Independent review, Recommended / Not recommended, Approved for transmission, Transmitted, Externally implemented, Impact measured, Rejected, Archived. Each event records sequence, time, actor (id, role, mode), from/to, reason, evidence, demonstration flag, consent where required, and a SHA-256 link to the previous event.
- My CORE (`src/me/me.mjs`): each private contribution is adopted into a lifecycle record. It shows the state path, timeline, missing evidence, limitations, pending decisions with who would have to act, and whether the history verifies. The author can submit (explicit consent checkbox) or archive. Deleting a contribution deletes its history. The TRUST storage inventory lists the new key `core.lifecycle.v1`.
- The San Francisco tour is unchanged. Its private demonstration draft appears in My CORE as a demonstration record.

## Transition and authorization rules

| To | From | Who (mode) | Required proof |
|---|---|---|---|
| Submitted | Draft | author (local demonstration or authenticated) | reason + explicit review consent; then the code evidence gate runs |
| Needs evidence | Submitted, Under review | CORE evidence gate (system, internal only) or reviewer (authenticated) | list of missing requirements |
| Under review | Submitted | moderator (authenticated) | reason |
| Simulation candidate | Under review, Needs evidence | reviewer (authenticated) | `authorized-data` evidence |
| Simulated | Simulation candidate | reviewer (authenticated) | `simulation` evidence |
| Independent review | Simulated | reviewer (authenticated) | reason |
| Recommended / Not recommended | Independent review | independent reviewer (authenticated, no earlier role on the record) | `review` evidence |
| Approved for transmission | Recommended | authorized signer (authenticated, not the author) | `mandate` evidence |
| Transmitted / Externally implemented / Impact measured | previous state in order | signer, or a new independent reviewer for impact | enabled external authority **and** a well-formed external record (matching subject and type, issuer, https URL, past observation time, SHA-256) accepted by a verifier |
| Rejected | any open state | moderator or reviewer (authenticated) | reason |
| Archived | any non-external state | author | reason |

General rules: every transition needs a reason. Authors can never review or authorize their own contribution. Demonstration records can never enter a real review. Closed records accept nothing more. Event clocks cannot run backwards. System steps cannot be injected from outside the module. Every transition first replays and re-verifies the entire history under the same verifiers.

**In the browser** `createLifecycle()` receives no actor verifier, no external verifier and no external authority. So every authenticated step is refused, every stored authenticated or external event fails verification (a forged "Transmitted" locks the record), and the last three states are unreachable. Browser actions are labelled "local demonstration step, not an authenticated action". The local owner id is a random browser identifier, not an account. Access control is enforced in the module's `view()` API (owner only; a verified reviewer sees a pseudonymous copy only after a real, consented submission). In a single browser it is a contract for a future server, not a security boundary.

## Verification (new results, this phase)

- R0 rerun at `dc4c0a1` before any change: SF journey **22/22** (desktop 1440×1000, mobile 390×844), no page errors. Evidence: `.core-local/evidence/r0-rerun/`.
- `test/lifecycle.test.js` **8/8**: demonstration journey, unauthorized transitions, consequential path with independence and mandate, fabricated outcomes (authority disabled; malformed, wrong-subject, future, unverified records refused), forged or edited history, privacy views and store scoping/deletion, and source checks that the browser wiring passes no verifier and makes no network call.
- Affected suites 89/89; full `node scripts/verify.mjs` **362/362** with integrity checks (runtime staged as required by the gate).
- Browser `scripts/r1-lifecycle-browser.mjs` **21/21** (desktop and mobile emulation, Chrome 155 headless, fresh profile): adoption, consent required, gate result, missing evidence, pending human decisions, external states unreachable, no network writes, no overflow, tamper lock, deletion. SF journey regression after R1 **22/22**. Evidence: `.core-local/evidence/r1-lifecycle/`, `.core-local/evidence/r1-sf-regression/` (ignored by Git).

## Limitations

- No authenticated civic accounts, moderators, reviewers or signers exist, so the lifecycle stops at Needs evidence by design. Server persistence with RLS, real consent records and retention are the next infrastructure step and need founder approval.
- Browser storage can be edited by its user. Tampering is detected and locked, not prevented.
- The R1 strings exist in English and French only; Spanish, German, Simplified Chinese and Portuguese fall back to English. The i18n catalog was already stale before R1 (about 50 SF, account and hospital strings are untranslated); regenerating and translating it is a separate task.
- Shared mission contributions (`core.civ.v72`) keep their earlier stage display; R1 covers private contributions.
- Pre-existing, not fixed (journey frozen): the mobile language selector overlaps the final tour heading (`.core-local/evidence/r0-rerun/mobile-review.png`); tour copy states both 501 and 510 agents.
- Not tested: Safari/WebKit, Firefox, physical devices, screen readers, founder live sign-in.
