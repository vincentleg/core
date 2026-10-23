# CORE V9.9 — Phase 2 release-blocker remediation

Date: 2026-10-21. Verified branch: `v9.9/multilingual-text-first`, actual worktree `~/core/.core-local/worktrees/v9.8`. Continued from `ce30d5d`, `9d270a7`, `466c458`; Phase 1 was not restarted. No merge/reset, push/deploy, HQ/Beta Lab change, paid service or optional plugin collection installation.

**Verdict:** both previous confirmed failures are resolved in the tested scope. The local runtime verification gate is green. V9.9 is ready for focused human/device/hosting acceptance, **not public release**: browser/assistive-device coverage and human privacy, translation and crisis-safety decisions remain incomplete.

## Saved implementation commits

| Commit | Result |
| --- | --- |
| `309ac42` | Bounded catalog transport retry, correct World boot readiness/recovery, supported optional worker test script and separate CI job |
| `9ddf11d` | Research/contribution crisis guards, generic bridge errors, stronger vault KDF with backward compatibility, accurate wipe limits/failure handling, blocked-storage startup/language resilience and six-language copy |
| `3909f2e` | Contrast/target-size/focus/keyboard-scroll repairs and reproducible accessibility, Firefox and denied-storage browser scripts |

The documentation checkpoint follows these commits; its exact hash is in the final Git log. All commits remain local. Six languages, microphone input policy, text-only answers and the Earth-first design remain; no speech-output implementation was introduced.

## Status of the two previous failures

**Spanish/mobile World startup — resolved within bounded tests.** A single reset of `data/intelligence/work.json` left Intelligence uninitialized indefinitely; its catalog initialization did not retry. A single reset of an essential Intelligence module also escaped recovery because the boot guard treated the existence of `CORE_EARTH` as completion before Intelligence was ready. Both mechanisms were reproduced before fixing. The original Phase 1 trace is insufficient to identify its exact failing packet, so no unique historical cause is asserted.

Catalog transport/body/timeout failures now retry once, with a 15-second per-attempt timeout and 250-ms retry delay; permanent HTTP errors, malformed JSON and invalid registries fail closed. World readiness now requires actual Earth readiness **and** the Intelligence engine. An essential module failure receives the existing one-reload recovery, then a visible failure if it persists. New unit tests verify these distinctions, including failure before the fix.

Serial Spanish/mobile tests: **36/36 pass** (390×844; 12 ordinary, 12 injected catalog reset, 12 injected essential-module reset). Ready ranges: ordinary **1,090–1,242 ms**, catalog-reset **1,125–1,965 ms**, module-reset **4,143–6,030 ms**. Fresh six-language World interactions and denied-storage checks also pass. This does not establish behavior on every browser/network.

The default Python 3.9 fixture’s connection backlog of five also produced real local module resets. The same static handler was rerun with backlog 128 for stable testing. This fixture correction is documented separately; it is not an application or production performance improvement.

**Optional LangGraph suite — supported and isolated, resolved locally.** The lockfile already pinned LangGraph 1.5.1, SQLite checkpoint 1.1.0 and better-sqlite3 12.11.1; expected modules/native binding were missing. Restored locked packages with lifecycle scripts disabled, then compiled the pinned SQLite binding from source using existing Node headers. No dependency version changed. `npm test --prefix scripts/intelligence` now explicitly runs the previously excluded `.test.mjs` suite: **6/6 pass, zero skipped**, using scripted protocol fixtures and no real model calls. A separate read-only, SHA-pinned CI job restores/builds/runs this supported worker suite; it was **not executed remotely** because nothing was pushed. The optional worker stays outside the public static bundle and outside the ordinary `.test.js` gate; it is not silently waived or removed.

## Additional fixes and checks

- Crisis inputs in World research investigations, Team Dialogue and contribution structuring now get fixed resources before model probing/calls or recording. Shared model/investigation functions reject direct bypasses. Six-language unit and browser tests check the fixed responses, cleared inputs, no raw-question persistence and no model calls/recorded steps in tested paths. Limited recognizer recall and clinical/geographic adequacy remain unverified.
- Local bridge exceptions now produce fixed generic errors. Malformed JSON, null/array payloads, oversized requests and a throwing upstream cannot return tested exception/credential text.
- New vault encryption uses **600,000 PBKDF2-HMAC-SHA256 iterations**, matching [current OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Existing 210,000-iteration vaults still open; no user data migration/deletion was forced. Compatibility, wrong-passphrase and current-cost tests pass. On this machine, old seal/open cost 33–37 ms and new cost 93–94 ms; not a phone benchmark or independent crypto review.
- TRUST inventories AI consent and saved traffic runs. The erase button describes records/preferences, explicitly explains cache/other-tab limits and reports denied-storage failure without a false success reload. Storage getters previously threw before their try/catch in language, avatar and contribution helpers; they now fail safely. All six page-local language choices work even when writes fail. **18 mobile denied-storage cases** across World, Avatar and Commons pass with zero page errors.
- Fixed focused skip-link contrast on product pages, increased Explorer’s undersized mode/toggle targets from 16 to 24 px with corresponding 8-px band compensation, restored focus after settings Escape and made overflowing Dialogue conversations keyboard-focusable/scrollable. Existing visual materials, type and Earth layout remain.
- Four dictionaries cover **2,624 required catalog keys**, 2,627 entries each. Six new privacy-purpose/wipe strings were added and two wipe labels narrowed; markup/placeholder/parity checks pass. English/French and dictionary translations still require qualified semantic review.

## Browser and accessibility evidence

| Check | Fresh result | Practical limit |
| --- | --- | --- |
| Supported integration/security gate | **316/316 pass; zero skipped**; CSP current; 730 tracked files scanned, zero tested pattern findings | Pattern scanning is not exhaustive credential detection |
| Affected security tests | **67/67 pass** before the final full gate | Not a penetration-test attestation |
| Separate optional worker | **6/6 pass; zero skipped** | Scripted fixtures; remote CI and actual inference not run |
| Chrome 155.0.8059.85, axe 4.10.2 | Latest **90 cases**, **150 scans**, **zero violations/page errors** | 11 desktop pages plus World/Commons/Dialogue/Avatar mobile, all six languages; latest per-case records combine initial and targeted reruns, not 90 repeated after every change |
| Keyboard/focus | **516/516 checks pass** | Visible focus, Enter activation, native modal containment/return, settings Escape, command shortcut and conversation PageUp covered; no screen-reader acceptance |
| axe incomplete results | color-contrast in **144 scans**; aria-prohibited-attr in **24 scans** | Counts are scans containing the rule, not unique defects. Gradient/image backgrounds and non-text symbols prevent some automated contrast decisions. These and ARIA incomplete cases remain manual-review work, not passes |
| Native Firefox **122.0** | **6 language cases, 48/48 checks**, zero exceptions/axe violations | Real WebGL globe/render frame, Explorer, actual camera search, navigation and language switching; old installed version only, not current Firefox/mobile acceptance |
| SafariDriver | Session creation refused: Remote Automation disabled | No Safari result; founder-only setting was left unchanged |
| Denied browser storage | **18/18 cases pass**, zero exceptions | Synthetic denied getters; no real visitor storage inspected |
| Startup stability | **36/36 repeated Spanish/mobile starts pass** | Includes injected single catalog/module resets, not arbitrary outages |

The initial accessibility runs exposed real violations and several harness mistakes. World’s companion shortcut correctly focuses the command input, rather than opening the Commons modal; native modal tabbing may move to browser chrome without focusing page background. Tests were corrected to match actual behavior. Six mobile Team Dialogue crisis states initially failed `scrollable-region-focusable`; adding tabindex and testing actual PageUp scrolling resolved all six. The final targeted Dialogue rerun has 12/12 cases and zero violations/focus failures. Earlier failed evidence remains preserved.

Local static testing also records expected 404s for optional development bridge/checkpoint probes (`/api/intelligence/status`, `/.core-local/civ/state.json`) and MapLibre globe/terrain warnings. These are preserved in logs; zero uncaught page errors does not mean zero console warnings or failed optional requests. The production-host path disables those development probes.

Firefox 122’s old CDP transport also rejected repeated explicit navigation with a context-null error. The final harness uses fresh targets and actual site navigation; earlier protocol attempts are retained and are not mislabeled as app failures. MapLibre’s globe projection is a zoom expression, so checking only a literal type `globe` was corrected. A native screenshot confirms visible Earth rendering; requestAnimationFrame cadence alone was not used to establish rendering.

Safari cannot be accepted here. The repository [browser-audit skill](../../.claude/skills/core-browser-audit/SKILL.md) states: “Safari/WebKit is not covered: it needs Safari's \"Allow Remote Automation\", a browser setting only the founder may enable.” SafariDriver independently returned that exact missing-setting condition. No setting was changed or approval inferred.

## Performance findings

Three serial, unthrottled samples against the built static application, after other browser checks finished:

| Sample | World + Intelligence ready | Completed transfer | Heap | Route / first camera move | Command complete |
| --- | --- | --- | --- | --- | --- |
| Desktop cold | 1,475 ms | 9,268 KiB | 39.5 MiB | 7 / 10 ms | 1,443 ms |
| Desktop warm | 444 ms | 22 KiB | 53.4 MiB | 7 / 10 ms | 1,444 ms |
| Mobile viewport cold | 1,210 ms | 9,327 KiB | 29.6 MiB | 5 / 9 ms | 1,446 ms |

One main-thread long task per sample: 60, 58 and 50 ms respectively. Largest decoded same-origin resources include walk network 881 KiB, region catalog 645 KiB, civilization catalog 643 KiB, road data 582 KiB and work registry 582 KiB; MapLibre and font assets also contribute. Cross-origin Resource Timing may omit sizes. Public artifact: **189 manifest/assets files, 21.7 MB**, with vendor checksum verified; this is build size, not first-load transfer.

The ~1.44-second command duration includes the intended map animation; routing/first movement is 5–10 ms. The measured issue warranting a runtime fix was indefinite startup after transport failure. No additional payload/render refactor was justified by these samples. The transfer size warrants future budget/device acceptance, but there is no agreed budget or physical phone/slow-network evidence. ~60-Hz requestAnimationFrame cadence is **not** measured GPU throughput. WebGPU/model execution was disabled; local server, cache, browser and hardware effects prevent claiming a calibrated improvement over Phase 1.

## Disposition of every previously PARTIAL / NOT VERIFIED finding

No infrastructure is added merely to make the audit green. Priority below means follow-up importance; it is not an invented legal requirement.

| Control(s), previous status | Action/evidence in Phase 2 | Current status and owner/scope |
| --- | --- | --- |
| 19, PARTIAL | Enumerated allowed map/model/search destinations and activation | PARTIAL; intentional third-party maps/downloads. Founder/provider review, no isolation rebuild |
| 21, PARTIAL | Data-flow/storage document and accurate wipe/cache/tab disclosures | PARTIAL; human privacy/semantic review before public acceptance |
| 25, PARTIAL | First-party, legacy/session/memory/cache purposes inventoried; missing UI purposes added | PASS within recorded inventory scope |
| 27, PARTIAL | Denied storage/wipe failure fixed and tested; cache/tab limits stated | PARTIAL; browser removal remains manual by design |
| 34, PARTIAL | Current OWASP KDF cost, compatibility test and device cost recorded | PASS for stated parameter control; independent crypto review not asserted |
| 35, PARTIAL | Local encryption/export/compatibility evidence retained; no cloud-backup promise | PARTIAL; user-managed exports/eviction/passphrase loss, no new backup service |
| 48, PARTIAL | Six-language sampled labels and deterministic/replay provenance retained | PARTIAL; qualified human meaning/translation review |
| 59, PARTIAL | Generic errors plus malformed/oversized/upstream failure regression | PASS for bounded credential-error control |
| 66, PARTIAL | Pins/SRI retained; fixture tests explicitly distinguished from real downloads | PARTIAL; full optional model/shard/device acceptance still required for that feature |
| 67, PARTIAL | Reviewed 60 worker lockfile declared licenses (49 MIT, 6 ISC, 2 Apache-2.0, 1 MIT-or-WTFPL, 1 BSD-3-Clause, 1 BSD-2-Clause-or-MIT-or-Apache-2.0); axe MPL-2.0 provenance/SRI | PARTIAL; declared metadata is not complete transitive asset/legal review; no new public runtime package |
| 77, PARTIAL | Fresh axe across six languages, confirmed defects fixed/retested | PARTIAL; manual gradient contrast/ARIA incomplete review remains |
| 79, PARTIAL | Desktop/mobile, native old Firefox and blocked-storage cases | PARTIAL; physical devices/current Firefox/Safari/zoom acceptance remain |
| 80, PARTIAL | Payload, long-task, heap and interaction timings measured | PARTIAL; founder must choose a budget and representative devices; no speculative optimization |
| 87, PARTIAL | Remaining US/Mexico emergency-number primary sources checked | PASS for source validation; service availability and clinical approval remain 89 |
| 8, NOT VERIFIED | Deployment configuration retained; nothing deployed | NOT VERIFIED; hosting-owner acceptance of actual V9.9 HTTPS/headers at a separately authorized release |
| 9, NOT VERIFIED | No hosting account/domain credentials opened | NOT VERIFIED; founder/hosting owner reviews access controls |
| 10, NOT VERIFIED | Existing prior-release record retained; no rollback exercised | NOT VERIFIED; founder-approved deployment recovery check, not a local mock assertion |
| 24, NOT VERIFIED | Privacy contact/controller gap documented | NOT VERIFIED; founder and qualified privacy/legal reviewer |
| 29, NOT VERIFIED | Host/map/model metadata flows distinguished from CORE records | NOT VERIFIED; actual provider/hosting retention and transport evidence needed |
| 30, NOT VERIFIED | No compliance or certification claim added | NOT VERIFIED; qualified legal applicability review. Obtaining a certification is not assumed necessary |
| 40, NOT VERIFIED | Provider/residency boundaries documented | NOT VERIFIED; founder/legal review of applicable processor terms, no invented agreements |
| 74, NOT VERIFIED | Catalog/markup/parity tests and six-language UI samples pass | NOT VERIFIED; qualified human translation/safety meaning review, including French |
| 78, NOT VERIFIED | 516 keyboard/focus checks and concrete fixes | PARTIAL; screen-reader walkthrough still NOT VERIFIED |
| 84, NOT VERIFIED | On-device-only microphone input preserved; synthetic cases retained | NOT VERIFIED; physical microphone/permission/language packs require real-device acceptance |
| 89, NOT VERIFIED | Extra crisis bypasses closed; source-verified resources and limits recorded | NOT VERIFIED; qualified clinical/geographic review and measured detector recall absent |

Current audit totals: **65 PASS, 0 FAIL, 11 PARTIAL, 4 NOT APPLICABLE, 10 NOT VERIFIED** (90 controls). Neither previous failure was silently waived. Ten NOT VERIFIED controls and the human/device portions of PARTIAL controls remain explicit.

## Remaining acceptance blockers and next phase

1. Complete manual contrast/ARIA and screen-reader acceptance, current Firefox/Safari and representative physical mobile/browser checks. Safari needs founder-controlled Remote Automation enabled or a founder-operated test; this phase cannot claim it.
2. Qualified human review of privacy/controller/contact wording, six-language translations and crisis-resource geographic/clinical suitability. Limited patterns can miss crises; source-correct numbers are not a clinical safety evaluation.
3. Real optional browser-model download/weight-integrity/inference and microphone/language-pack acceptance if those capabilities ship. Synthetic tests do not substitute for this.
4. Hosting owner reviews access/retention/terms and approves a concrete deployment/rollback/HTTPS/header acceptance plan. Actual V9.9 hosting checks cannot pass before an authorized deployment. No legal certification is implied as a prerequisite without an applicability decision.

Third-party maps and manual backup/cache management are documented design limits, not reasons to build a cloud account system or install plugins. The optional worker’s remote CI job still needs a future authorized push/CI run; local fixture acceptance is complete. No known confirmed local critical defect remains from the investigated cases; absence of findings is not proof of absence of vulnerabilities.

## Evidence and reproduction

Ignored local evidence root: `.core-local/evidence/v99-phase2/`. These files are available on this machine, contain test fixtures/screenshots rather than real profiles, and are not portable Git artifacts. The Phase 1 record stays unchanged. Reuse the repository browser-audit skill’s isolated-profile/loopback precautions; never connect to an existing personal browser or founder’s port 8788/9222.

```sh
node scripts/build-public.mjs
# Start isolated Chrome on 9241 and the public/ handler on loopback 8790 first.
# NODE_PATH points to the existing Playwright Core installation documented in the inventory.
NODE_PATH=<existing-playwright-modules> node scripts/v99-phase2-accessibility.mjs <output.json>
NODE_PATH=<existing-playwright-modules> node scripts/v99-phase2-storage.mjs <output.json>
# Start native Firefox with a fresh throwaway profile and its loopback CDP port 9243.
node scripts/v99-phase2-firefox.mjs <output.json>
NODE_PATH=<existing-playwright-modules> node scripts/v99-phase1-performance.mjs <output.json>
npm test --prefix scripts/intelligence
# Stage any runtime changes before the integration gate; do not repeat after docs-only changes.
node scripts/verify.mjs
```

The startup stress fixture is preserved locally as `stability.cjs`: each fresh Spanish/mobile context injects at most one `connectionreset` using `context.route` for either `**/data/intelligence/work.json` or `**/src/intelligence/core/connection.mjs`, then waits up to 20 seconds for Earth **and** Intelligence; 12 serial iterations per mode. `stability.json` is the executed 36-case record. Before/after diagnostics and boot/catalog unit tests preserve the root-cause evidence.

Principal files: `final-verification.log`, `optional-worker-final.log`, `security-targeted-final.log`, `stability.json`, `module-before.json`, `startup-before.json`, `startup-after.json`, `accessibility-latest.json`, its four source result files, `accessibility-dialogue-final.json`, `axe-detail.json`, `firefox.json`, `firefox-globe.png`, `safari-availability.json`, `storage-browser.json`, `performance.json`, `vault-cost.json`, `axe-provenance.json` and build/install/native-binding logs. `accessibility-latest.json` selects the latest row for each language/width/page from initial, affected-page, security-state and final-Dialogue runs; counts assert 90 unique cases and zero final failures.

Test-only axe 4.10.2 was restored from the official package with exact version, SRI and license recorded under ignored `.core-local/a11y-tools/`; no lifecycle scripts or public dependency were added. Locked worker restoration/build is documented above. No optional connector/plugin collection was installed or enabled. Own test servers/browser profiles are stopped/removed at the clean local checkpoint; ignored evidence and restored test dependencies remain available.
