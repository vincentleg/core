# CORE V9.9 — Phase 4 release readiness

Assessment: 2026-10-21. **Recommendation: NO-GO for public release.** The local candidate is ready for founder-led acceptance, but device, assistive-technology, optional model, privacy/legal and hosting/recovery evidence remains incomplete. Green local tests do not establish those approvals.

## Candidate and scope

- Verified checkout: `~/core/.core-local/worktrees/v9.8`, branch `v9.9/multilingual-text-first`. Started clean at `d65fb8ed45579a5b03bb58edd50134d2af71a48c` after reading the Phase 2/3 reports, resume checkpoint and 90-control audit.
- Exact application/test release candidate: **`60ffcb0d61be2b3174c69e5ba7091963a5e6c21c`**. The following documentation checkpoint does not change its runtime. Final repository checkpoint hash is in Git log.
- Small local fixes: correctly name Dialogue's suggestion group; scope the research fallback disclosure to that tool, preserving Explorer's separate optional on-device AI. All six translations updated; catalog regenerated. No visual redesign, AI policy change, microphone removal, schema or `src/engine.js` edit.
- No HQ/Beta Lab operation, merge/reset, push/deploy, global setting change, package installation, new service/account, paid inference or connector activation. Existing hooks remain active. Founder server on 8788 and personal browsers were not used.

## Fresh verification and security evidence

Private evidence is ignored under `.core-local/evidence/v99-phase4/`; JSON/logs are local records, not portable committed test attestations. The scripts and bounded reproduction commands below are retained in Git where indicated.

| Check | Result and evidence | Limit |
| --- | --- | --- |
| Supported gate, initial and after acceptance fixes | `node scripts/verify.mjs`: **316/316 pass, zero skipped** each time; `verification.log`, `verification-final.log`; current CSP, integrity and diff checks pass | Second run justified by runtime/test changes; no repeated full Phase 1 audit |
| Optional intelligence worker | `npm test --prefix scripts/intelligence`: **6/6 pass, zero skipped**, `worker.log` | Scripted local protocol/checkpoint fixtures; no model inference or remote CI |
| Developer/security tool integrity | 38 pinned files, matching skill entries, Gitleaks 8.30.1 identity, positive/negative detection and full redaction pass; `tool-integrity.log` | Offline tool check; no new grants or MCP |
| Gitleaks candidate snapshot | No leaks; `gitleaks-tree.json/log`, 28.42 MB scanned | `git archive HEAD` of initial `d65fb8e`; no unrelated branches/worktrees |
| Gitleaks scoped history | No leaks in **9 commits**, `75c9190..d65fb8e`; `gitleaks-history.json/log` | Not an exhaustive all-branch history scan |
| Gitleaks built public artifact and final fixes | No leaks; `gitleaks-public.json/log`, `gitleaks-fixes.log` | Actual build scanned without private `.vercel` link metadata; final staged diff scanned separately |
| Existing dependency advisory queries | Both worker and vendor-AI lockfiles: **zero known vulnerabilities**; `worker-advisories.json`, `vendor-advisories.json` | Fresh registry queries, no installation; unknown advisories remain possible |
| Public build | Pinned WebLLM checksum verified; **189 source/assets + 3 generated configuration files**, **21,653,273 bytes**; `build.log`, `artifact-manifest.json` with per-file SHA-256 | Local artifact includes no docs/scripts/SQLite; not proof of hosting behavior |

The installed [security-best-practices skill](../../.agents/skills/security-best-practices/SKILL.md) and its vanilla-JavaScript frontend reference guided source review: public entry policies, model/URL/HTML sinks, local storage, model downloads and the optional Node HTTP bridge. CORE uses vanilla modules and built-in Node HTTP; no Express/React framework was assumed. Phase 1/2 fixes were reviewed against current source and executed regressions: crisis interception before inference/history, constant error responses, exact Host/Origin/token boundaries, bounded inference, namespace wipe, denied Storage handling, and AES-GCM vault/KDF backward compatibility. No new confirmed Critical/High security vulnerability was identified in this bounded review; this is not a penetration-test or absence-of-vulnerabilities claim.

| Finding | Severity / evidence | Disposition |
| --- | --- | --- |
| P4-01: research disclosure contradicted optional browser AI | Medium privacy accuracy; `src/earth/app.mjs:409` formerly said the whole public site never runs a language model | Fixed in `60ffcb0`; now explicitly describes the research tool and separate Explorer AI, in six languages. Public-mode fixture verifies rendered text |
| P4-02: labelled generic suggestion container | Accessibility defect, not a High security exploit; `dialogue.html:35` had `aria-label` on a generic `div`. Detailed axe review elevated seven language/viewport instances to violations, while other scans marked them incomplete | Fixed with `role="group"`; fresh browser accessibility-tree assertion in the existing audit and 12 affected Dialogue cases pass; no remaining `aria-prohibited-attr` incomplete |

No speculative infrastructure, new sanitizer/framework, cloud backup or model service was introduced. Previously reviewed crisis-number sources remain in [the resource record](CORE_V9_9_CRISIS_RESOURCES.md); no test calls, clinical approval, newly measured detector recall or blanket country coverage is claimed.

## Browser, accessibility and privacy acceptance

| Check | Fresh result | Remaining limit |
| --- | --- | --- |
| Chrome 155.0.8059.85 + axe 4.10.2 | Initial 90 cases, then 24 affected World/Dialogue cases. Latest-per-case aggregation: **90 cases, 150 scans, 528 keyboard/focus checks, zero violations/failures/page exceptions**; `accessibility-latest.json` | 11 desktop pages and four mobile pages × six languages; viewport emulation, not physical devices |
| ARIA and keyboard | Named suggestions group, native modal containment/return, visible focus, settings Escape/return, Explorer input shortcut and conversation scrolling pass | Browser AX exposure is not an actual screen-reader walkthrough; all custom-widget arrow-key conventions and zoom states are not certified |
| Contrast review | `manual-detail.json` captures six languages × two widths × World/Commons/Dialogue; CSS/gradient/opacity review, conservative bounds in `contrast-bounds.json`, native Firefox screenshot inspected | 664 incomplete-node instances reviewed; 472 meet calculated bounds, 192 remain unresolved under conservative image/overlap/opacity assumptions. This is exploratory CSS evidence, not an independent contrast certification. **144 latest scans still contain color-contrast incompletes**; live map/transition states need visual review |
| Native Firefox **122.0** | **6 languages, 48/48 checks**, zero page errors/axe violations; actual WebGL globe, Explorer, camera search, language switching and navigation; `firefox.json`, adjacent globe screenshot | Old installed version; current Firefox and physical/mobile compatibility unverified |
| Safari 27.0.1 | Native driver available; session creation refused, `safari-availability.json` | Remote Automation disabled. The [browser skill](../../.agents/skills/core-browser-audit/SKILL.md) states: “a browser setting only the founder may enable.” No setting was changed; no Safari/WebKit pass |
| Consent, model failure, disclosure and actual deletion | **6 language cases, 48/48 checks**, `acceptance.json`; reproducible `scripts/v99-phase4-acceptance.mjs` | GPU capability, heavy loader failure and public-mode flag are explicit fixtures; no model weights downloaded/inference run |
| Deletion boundaries | Real UI confirmation/wipe/reload removes synthetic CORE local/session keys and consent; preserves unrelated keys and a synthetic model-cache record as disclosed | Other tabs' memory, downloaded exports and browser cache removal remain manual; no visitor's data was opened/deleted |
| Microphone and spoken output | Existing regression gate scans all non-vendor published HTML/JS: no speech-output API; on-device `processLocally` input only. Browser denial fixtures keep text input usable | No physical audio recorded, language pack installed or actual microphone granted; no spoken CORE answers |
| Translations | Catalog remains **2,624 required keys**, four dictionaries **2,627 entries each**; parity/placeholder/markup gate passes. Revised disclosure rendered in all six languages | New wording is model-written. Scientific records, identifiers, source titles, model text and capability reasons can remain English; zero missing catalog keys does not imply every data-driven string is translated or semantically approved |

Full public-page journeys: **132/132 cases, 1,572/1,572 checks**, zero failures/page exceptions (`browser.json`). Coverage includes all 11 major pages at desktop/mobile widths in all six languages; menus, tabs, language switching, agent search/evidence, crisis/history exclusion, synthetic model failure and microphone denial are exercised. **18/18** fresh denied-local/sessionStorage cases pass on mobile World/Avatar/Commons (`storage.json`).

The previous Spanish/mobile startup failure remains resolved within bounded evidence: **12/12** fresh serial starts (four ordinary **1,109–1,195 ms**, four injected catalog resets **1,116–1,164 ms**, four essential-module resets **4,079–4,144 ms**), zero uncaught page exceptions (`stability.json`). These supplement Phase 2's 36/36 runs. The Phase 2 reproducer was reused with four repeats per mode and an explicit failure exit; private copy `stability.cjs` is retained locally. The static Python fixture uses backlog 128. This is not a reconstruction of the original lost packet or proof against arbitrary outages. The previous missing-LangGraph failure remains resolved: the supported separate worker suite passes 6/6 with its existing locked dependencies.

### Serial performance findings

After functional audits, without concurrent audits, the existing performance script measured three local headless samples (`performance.json`).

| Sample | Earth + Intelligence ready | Completed transfers | Heap | Route / first move | Command complete | Main-thread long tasks |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop cold | 1,170 ms | 10,056 KiB | 34.1 MiB | 10 / 13 ms | 1,440 ms | One 58 ms |
| Desktop warm | 327 ms | 2 KiB | 37.2 MiB | 17 / 20 ms | 1,460 ms | One 59 ms |
| Mobile viewport cold | 978 ms | 9,370 KiB | 41.3 MiB | 9 / 15 ms | 1,454 ms | None recorded |

Largest decoded payloads remain walk network 881 KiB, regions 645 KiB, civilization 643 KiB, road/work datasets ~582 KiB and MapLibre modules. Cache-disabled diagnostic runs fetch the work registry twice through existing consumers. The ~1.44–1.46-second command duration includes intentional map animation; dispatch/first movement is 9–20 ms. Payload and actual device performance warrant budgeting, but these samples demonstrate no new severe stall warranting a release-preparation refactor. No performance optimization or calibrated improvement is claimed. Transfer counts include completed requests only, cross-origin size visibility varies, and warm/cold are local cache conditions. WebGPU is disabled; no throttled WAN, physical-device or model performance test. ~60-Hz requestAnimationFrame cadence is not GPU rendering throughput. All samples have zero uncaught page errors.

Reproduction: build with `node scripts/build-public.mjs`, serve only `public/` on an unused loopback port with backlog 128, start your own disposable browser/profile, and set `NODE_PATH` to the existing Playwright Core installation listed in the tooling inventory. Run these **serially** with the evidence directory already created:

```sh
node scripts/v99-phase1-browser.mjs .core-local/evidence/v99-phase4/browser.json
node scripts/v99-phase2-accessibility.mjs .core-local/evidence/v99-phase4/accessibility.json
node scripts/v99-phase4-acceptance.mjs .core-local/evidence/v99-phase4/acceptance.json
node scripts/v99-phase2-storage.mjs .core-local/evidence/v99-phase4/storage.json
node scripts/v99-phase1-performance.mjs .core-local/evidence/v99-phase4/performance.json
```

Firefox uses the installed Firefox 122 with its own profile on 9243 and `node scripts/v99-phase2-firefox.mjs <output.json>`; the screenshot now follows the requested output path, preserving historical evidence. Never use personal profiles or port 9222. Expected local-only optional development-probe 404s and MapLibre warnings are distinct from uncaught page errors; the supplemental public-mode fixture verifies those loopback paths stay unused. No claim is made about actual hosted headers.

Harness limitations were investigated rather than hidden: a detailed diagnostic assertion left its own CDP connection open; that stale connection disrupted the first native-confirmation fixture. Its process was stopped, browser connections isolated, and deletion subsequently passed. A French expected-text fixture omitted the required French reference; that fixture was corrected and all six supplemental cases rerun. Those failed attempts remain in ignored evidence and are not counted as acceptance passes. Some initial Chrome fixture work overlapped the slow legacy Firefox transport; timing evidence is collected separately without concurrent audits.

## All 21 open-control dispositions

Updated audit totals: **65 PASS / 0 FAIL / 11 PARTIAL / 4 NOT APPLICABLE / 10 NOT VERIFIED** (90). Counts remain unchanged: repairing individual defects and refreshing local evidence does not justify promoting controls with outstanding human/device/hosting requirements. The [90-point audit](CORE_V9_9_90_POINT_RELEASE_AUDIT.md) retains historical evidence and adds Phase 4 references.

| Control | Status | Local disposition / required owner action |
| --- | --- | --- |
| 19, permitted third parties | PARTIAL | Intentional map/model metadata flows inventoried, CSP retained; founder reviews processor handling, not an isolation rebuild |
| 21, disclosure accuracy | PARTIAL | Confirmed public-research contradiction fixed; [data-flow record](CORE_V9_9_DATA_FLOW_AND_STORAGE.md) reviewed against source. Human semantic/privacy review remains |
| 27, complete removal | PARTIAL | Real namespace deletion and disclosed cache preservation verified; close other tabs and clear site data/cache manually for fuller removal |
| 35, export lifecycle | PARTIAL | Encryption/backward compatibility tests pass; users manage exported files, browser eviction and passphrase loss. No cloud recovery promised |
| 48, scientific/provenance labels | PARTIAL | Recorded/deterministic/unreviewed distinctions retained and sampled; qualified human meaning review remains |
| 66, all model shards | PARTIAL | Revision pins and selected config/tokenizer/WASM SRI reviewed. Full download, all-shard integrity and inference acceptance absent; must accept optional feature before public release |
| 67, license/attribution | PARTIAL | Existing vendor notices retained, no new dependencies; prior declared-license inventory retained. Complete asset/transitive redistribution review requires appropriate human review |
| 77, accessible labels/contrast | PARTIAL | Suggestion-group defect fixed, latest axe/AX pass; manual image-backed contrast incomplete |
| 78, keyboard/screen reader | PARTIAL | 528 keyboard/focus checks pass; VoiceOver/NVDA/TalkBack actual reading order, announcements and navigation unverified |
| 79, device/browser layout | PARTIAL | Six-language viewport/Chrome/old-Firefox checks pass; Safari, current Firefox, physical devices and expanded zoom coverage remain |
| 80, performance budget | PARTIAL | Fresh local measurements recorded; founder must set budget and representative hardware/network. No calibrated phone/WebGPU performance claim |
| 8, hosted HTTPS/headers | NOT VERIFIED | Generated config reviewed; actual V9.9 origin/header/redirect/CSP enforcement needs separately authorized hosting acceptance |
| 9, hosting access/domain | NOT VERIFIED | Founder/hosting owner must verify project/domain ownership, access and release configuration; no account inspected |
| 10, rollback exercise | NOT VERIFIED | Concrete procedure below; no deployment rollback executed or simulated as production evidence |
| 24, controller/contact | NOT VERIFIED | Founder identifies accountable controller/privacy contact and obtains qualified review; repository contact is not legal approval |
| 29, hosting retention/transport | NOT VERIFIED | Owner checks actual logs, retention, TLS and provider practices; local server cannot establish them |
| 30, legal applicability | NOT VERIFIED | Qualified assessment of applicable obligations; no certification requirement invented, no compliance assertion |
| 40, residency/agreements | NOT VERIFIED | Owner/legal reviewer assesses relevant host/map/download provider terms and residency; no contract inferred |
| 74, translation meaning | NOT VERIFIED | Qualified six-language review of privacy, crisis, scientific and commercial wording; new model-written correction included |
| 84, real microphone/packs | NOT VERIFIED | Founder-operated device test with explicit microphone/language-pack permission; no real recording during this phase |
| 89, crisis adequacy/recall | NOT VERIFIED | Qualified clinical/geographic review and realistic detector evaluation; language is not location, tested patterns are not measured recall |

## Hosting preparation and rollback — proposal only

No V9.9 deployment was created. Meta CSP and generated `public/vercel.json` are local configuration evidence. Before any separately approved publication, the hosting owner must verify actual HTTPS/redirects/security headers, correct static root and exclusions, account/domain access, log retention/processor terms, billing safeguards, and a usable previous immutable deployment. Remote CI has not run because no push was authorized.

1. Record the **actual current** production deployment ID/URL, commit, project/team and domain routing from the owner's approved hosting interface. The handoff's V9.8.1 `a89f60d` / `dpl_Bvw6QKRGg18SLwwrnQ5LAHiuBWzZ` is **historical and unverified**, not an automatic rollback target. Retain that deployment and its configuration; do not delete it.
2. Verify the old deployment still serves an acceptable site and that retained local vaults can be opened; do not erase visitor site data. This phase has no data migration/schema change. Record acceptance evidence before a release.
3. Only after explicit release/rollback authorization, the owner can select that exact previous deployment in Vercel's Instant Rollback interface, or use `vercel rollback <verified-deployment-id-or-url> --scope <verified-team>` from the verified project context. This is a **documented proposal, not an executed command**. Vercel documents the CLI syntax and plan-specific target restrictions in its [rollback reference](https://vercel.com/docs/cli/rollback); confirm eligibility without enabling a paid plan.
4. Recheck apex/www routing, HTTPS/headers, six-language pages, World startup/search, privacy and text-only behavior after a rollback. Preserve browser data, incident evidence and the rejected RC. Reopening forward promotion requires another explicit decision; never use Git reset/force-push as a hosting rollback.

The provider notes that rollback reassigns traffic to an existing build and does not restore changed project environment variables or external services; review those separately. [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback). No recovery-time guarantee or independently tested rollback is asserted.

## Founder actions required before a public GO

Assign human privacy/legal, six-language and crisis-resource reviewers; decide optional model feature acceptance after a real download/integrity/inference test; arrange physical device/current-browser, screen-reader, contrast and microphone checks. Set a measurable performance budget on representative hardware. Approve a narrowly scoped hosting/account/retention/rollback assessment and any later preview/remote-CI/publication steps separately. No unresolved item is silently waived by this report, and no paid infrastructure or blanket legal certification is requested.

**NO-GO remains the public-release recommendation.** Passing local implementation checks supports the next human/device/hosting acceptance step; it does not authorize publication.
