# CORE V9.9 — Phase 5: real-world acceptance and release gates

Publication note: the founder subsequently explicitly authorized the release; [production release record](CORE_V9_9_PRODUCTION_RELEASE.md) supersedes this historical publication recommendation. Its human/device/model-rights limitations and unsigned checklist remain unaccepted.

Date: 2026-10-21. **Historical public release recommendation: NO-GO pending the founder/qualified-reviewer gates below.** This phase adds executable local evidence and fixes confirmed defects. It does not authorize publication or replace human, physical-device, legal or production-hosting acceptance.

## Verified workspace and candidate

Started clean at `5b0d222c356c2f9015679a9d8f7c52b4e8839217`, branch **`v9.9/multilingual-text-first`**, actual worktree **`~/core/.core-local/worktrees/v9.8`**. `pwd`, branch, status and latest commit were checked before reading the resume checkpoint, Phase 4 report and 90-point audit. No command was run in Wines Horizon, CORE HQ or Beta Lab, and no files in those projects were inspected or changed. The directory name was not used as the version identifier.

Phase 4's 316-test gate, 132-page journey matrix, old-Firefox results and model-failure fixtures remain historical evidence, not newly executed Phase 5 tests. The supported gate passed **319/319** after the vault fix and again after the separately discovered startup fix; the separate worker passed **6/6**, zero skipped. Exact application/test RC: **`effc048afd81f32d1d2597655f3496b59706aed6`**. The following documentation checkpoint changes no runtime. No deployment, push, merge/reset, account, paid service, package installation or global tooling configuration change.

## Confirmed issues and fixes

| Finding | Evidence before change | Result / scope |
| --- | --- | --- |
| P5-01 — incomplete Dialogue keyboard/ARIA contract | `preflight.json`: ArrowRight leaves selection/focus unchanged in room/team tabs and working-mode radios; all choices were tab stops and the panel unnamed | `ed84c77`: arrow navigation/wrap, Home/End, radio Up/Down, one tab stop, active tab/panel relationships and keyboard-focusable panel. Shared 16-line helper, two unit regressions, real Chrome and Firefox key events. No redesign or conversation logic change |
| P5-02 — narrow privacy-page overflow | All six initial 320-CSS-pixel cases showed 12 px root overflow | `ed84c77`: local wrapping rule fixes long table words without adding scripts or changing privacy claims |
| P5-03 — clipped More control | Screenshot review and `header-before.json`: at 320 px the control extended to x=351 despite root-overflow checks passing | `ed84c77`: compact spacing below 361 px preserves brand and controls; explicit header/menu bounds plus Enter open/close tests pass in all six languages. Root overflow alone was insufficient evidence |
| P5-04 — false vault save success under failed storage | `vault-storage-before.log`: missing expected rejection; `save()` returned false and callers could announce encrypted save success | `d2357ec`: storage failure rejects with an existing six-language error, prior ciphertext stays intact, explicit replacements commit after persistence, initial creation failure leaves no false open state, and all save consumers catch/report failure. Browser creation/metadata/deletion retries and drafts tested; no schema/KDF migration |
| P5-05 — constrained startup catalog abort | `constrained.json` and `constrained-diagnostic.json`: Earth ready, Intelligence absent, work/regions aborted twice around 15 s; a separate successful copy took 16.2 s. Initial 90-second acceptance wait failed | `effc048`: per-attempt catalog deadline 60 s; one retry and invalid-data rejection retained. Two matched cold retests ready at 33.465/33.431 s and navigation succeeds. No payload optimization claimed |

Six languages, Earth-first visuals, user-initiated on-device microphone input and text-only answers remain. No CORE speech-output feature was introduced. `src/engine.js`, database schemas and generated corridor/data sources were not edited.

## Newly executed evidence

Private evidence lives in ignored `.core-local/evidence/v99-phase5/`. It contains synthetic records/questions, logs, publisher metadata and disposable-browser screenshots, not founder profiles or actual visitor records. These local records are not portable Git attestations. Committed scripts provide repeatable acceptance checks.

| Check | Phase 5 evidence/result | Interpretation |
| --- | --- | --- |
| Chrome 155.0.8059.85 public-mode/reflow/keyboard | **66 cases, 888 checks, zero failures/errors**; `browser.json`; `scripts/v99-phase5-browser.mjs` | Eleven pages × six languages at 320 CSS pixels; room/team keyboard at 320/1440; header/menu bounds. Reserved HTTPS origin is fulfilled from the loopback public build, exercising actual PUBLIC code without replacing env/model modules. This is an origin-interception fixture, not TLS/hosting verification |
| axe 4.10.2 | **24 targeted Dialogue scans, zero violations**; remaining incomplete rule `color-contrast` | Six languages × two widths × two modes, after keyboard/ARIA fixes. No complete WCAG or screen-reader certification |
| Sampled Earth contrast | **204 text instances across 24 frames**, six languages, 320/1440, landing/Explorer: sampled minimum **6.01:1**, no threshold failures; `contrast.json`, screenshots | Text-transparent capture samples the rendered background beneath text ranges with existing Playwright PNG decoding; no library installed. Covers selected stable states, not every map background, motion, focus state, menu or device. Actual screen-reader and comprehensive human contrast review remain open |
| Native Firefox | **158.0.1**, **6 language cases / 108 checks**, zero failures/page errors; `firefox-bidi.json`; `scripts/v99-phase5-firefox.mjs` | Real globe/WebGL, Explorer camera search, narrow header, navigation language retention, trusted tab/radio key events and panel focus. Runtime version comes from native BiDi capabilities |
| Firefox tooling contradiction | Info.plist/defaults reports **122.0**, while the running native protocol reports **158.0.1**. Legacy `/json/version` returns 404 even with the disposable profile's legacy-protocol preference | Do not carry Phase 4's Firefox 122 statement forward as current evidence. Reused existing BiDi transport, no driver/browser install. Temporary test-profile preference removed with that profile; global/personal settings untouched. No claim that the observed version is Mozilla's latest release |
| Safari | Fresh session refused; `safari-availability.json` | Founder-controlled Remote Automation remains disabled. No Safari/WebKit pass. The [browser skill](../../.agents/skills/core-browser-audit/SKILL.md) reserves it as “a browser setting only the founder may enable” |
| Real local AI | Existing approved Qwen3:8b GGUF Q4_K_M: **6 language cases / 36 checks**, zero failures/errors; `local-ai.json`, filtered model/license metadata and `bridge-events.jsonl` | Six actual synthetic educational replies, validated/displayed as text; six crisis inputs caused no additional model call/history retention; no speech attempted. Inference took 10.2–23.3 s per sample. Language meaning is not professionally approved by these examples |
| AI privacy boundary | Own bridge on 8791 restricts upstream fetches to exact loopback Ollama `/api/tags` and `/api/chat`; no remote AI/model/geocoder request in the checked browser journeys | Founder server 8788 was not used. Existing daemon was neither started/stopped nor reconfigured; no model pulled. This is a code/request-level boundary check, not an OS-wide packet audit |
| Real dictation capability | Browser reports `downloadable` for en/fr/es/de/zh-CN/pt; `preflight.json` and `browser.json` | Capability queried without granting a microphone, installing packs or recording audio. Real audio/device/vendor behavior remains NOT VERIFIED |
| Vault browser acceptance | **6 cases / 66 checks**, zero failures/page errors; `vault.json`; `scripts/v99-phase5-vault.mjs` | Synthetic quota failure gives translated error; previous encrypted record/draft retained; retry succeeds; metadata failure/retry; lock/reopen; deletion failure/retry |
| Export privacy | In those six cases, declining native plaintext-export confirmation creates no file; accepting produces the declared plaintext idea without the passphrase | **The current export is deliberately decrypted JSON**, not an encrypted backup or automatic recovery mechanism. Files outside the browser must be protected/deleted by their owner; no encrypted import/recovery service is claimed |
| Targeted vault tests | **32/32 pass**; `vault-targeted.log`; failing-before/passing-after storage regression | Covers affected trust/V7/V8 behavior; not new human approval |
| Developer tool verification | 38 pinned files, scanner identity/detection/redaction pass; `tools.log` | No skill/lock/global configuration modification or new connector |

## AI source/rights gate

Actual WebGPU capability was queried without stubbing GPU support and reported supported. That alone does not accept the public browser model. Read-only official metadata at pinned Qwen3-0.6B MLC revision `8c14ce481d4c692769976ad52afea453a102df19` lists **nine weight shards, 335,372,288 bytes** and SHA-256 values, but does not declare a license field. No shards were downloaded or checked byte-for-byte.

The pinned [official compiled-library tree](https://github.com/mlc-ai/binary-mlc-llm-libs/tree/025bcaf3780fa8254f5e5efd3bfea0a5397248f4) exposes no root license in the checked listing, and a root LICENSE request returned 404. This does not prove infringement; it leaves the applicable grant unestablished. Source licensing and SRI cannot be substituted for that evidence. [AGENTS.md](../../AGENTS.md) FD09 requires: “incertitude → arrêter l’opération, documenter, demander au fondateur.” Consequently **new browser-model/WASM download, compilation and inference remain unverified** pending an applicable official grant/qualified scope decision. Founder consent alone does not create third-party usage rights. The [data-source record](../DATA_SOURCES.md) now distinguishes this from historical V9.8 speech guidance.

Separately, the previously approved installed local Qwen3 model was already available; its digest and reported Apache-2.0 license text were checked before bounded reuse, consistent with [Qwen's official maintainer source](https://github.com/QwenLM/Qwen3). Its passing local inference does not waive the public WebGPU artifact gate.

## Final gate, startup/performance evidence and local commits

Final `node scripts/verify.mjs`: **319/319 pass, zero skipped**, current CSP, **780 tracked files scanned / zero findings / six existing documented exceptions** (`verification-final.log`). The initial post-vault gate also passed; repeating it was justified by the subsequently discovered catalog bug, not documentation edits. Separate worker: **6/6**, zero skipped (`worker.log`). New tab/radio tests and the failing-before/passing-after vault regression are included in 319; their counts are not additional independent tests to sum. Dictionary coverage remains 2,624 required keys with 2,627 entries in each of four dictionaries; the storage error reuses existing translations.

After the deadline fix, **12/12** ordinary/catalog-reset/module-reset Spanish/mobile starts pass (`stability.json`), four per mode: ordinary **1,073–1,228 ms**, catalog reset **1,107–1,275 ms**, essential-module reset **4,193–4,257 ms**. Targeted startup/Intelligence tests: **35/35** (`startup-targeted.log`). Invalid records/permanent HTTP errors still fail closed; transport retries remain bounded to one.

The matched slow-network experiment used a fresh context, disabled/cleared HTTP cache, 390×844 viewport, 4× CPU throttling, 150 ms latency and 200,000 B/s download / 75,000 B/s upload. This is a simulated laboratory diagnostic on the local static server, not a physical phone or hosted WAN test. Browser audits ran serially.

| Sample | Earth + Intelligence readiness | Completed bytes through readiness | Command elapsed | Route / first move | Outcome |
| --- | --- | --- | --- | --- | --- |
| Before fix | Did not become ready within the initial 90-second wait | Not a pass | Unavailable | Unavailable | Both 15-second catalog attempts aborted; separate diagnostic confirmed Earth ready / engine missing |
| After fix | **33,465 ms** | **5,869,252** | 1,483 ms | 12 / 14 ms | Navigation succeeded, zero page exceptions |
| Matched repeat | **33,431 ms** | **5,869,346** | 1,475 ms | 13 / 15 ms | Navigation succeeded, zero page exceptions |

Files: `constrained-after.json`, `constrained-repeat.json`; bounded private reproducers retained alongside the before/diagnostic records. The fix tolerates valid slow transfers; it does not reduce payload size or establish an accepted performance budget. Roughly **33 seconds cold readiness remains a release-performance concern**. Transfers exclude unfinished map requests; intentional tile cancellations during camera changes and expected local-only optional-probe 404s remain in logs. No calibrated real-world speedup, percentile or GPU-throughput claim.

Final public build: **193 files** including generated configuration, **21,655,901 bytes**, pinned WebLLM checksum verified (`build.log`, per-file SHA-256 `artifact-manifest.json`). Gitleaks 8.30.1 scans of the **three scoped Phase 5 implementation commits**, final public artifact and staged vault/startup changes report no leaks (`gitleaks-history-final.json/log`, `gitleaks-public.json/log`, other staged logs); no all-branch guarantee. Phase 4's same-day advisory checks are retained as historical evidence because dependency lockfiles did not change; no new advisory query is claimed.

| Exact local commit | Scope |
| --- | --- |
| `ed84c77d55283736cda2c5cb69ed852e1ea8fb10` | Keyboard/ARIA, narrow-screen header/privacy reflow and repeatable Chrome/Firefox acceptance scripts |
| `d2357ec4a3a2674ec9f602ba78207837439d9886` | Vault persistence error/retry handling, affected consumers, regression and six-language privacy browser script |
| **`effc048afd81f32d1d2597655f3496b59706aed6`** | Final application/test RC: bounded slow-link catalog deadline |

The subsequent local documentation checkpoint records this report/audit/checklist, source/tooling corrections and resume state. Its exact hash is in Git log and the final response; no self-referential documentation commit is invented. Disposable test servers/browser processes are stopped and their own temporary profiles removed at the clean checkpoint. Founder services 8788 and the existing Ollama daemon remain untouched except the explicitly tested local model requests; no personal browser was attached.

## Remaining audit gates

The 90-control checklist remains **65 PASS / 0 FAIL / 11 PARTIAL / 4 NOT APPLICABLE / 10 NOT VERIFIED**. Counts are bounded controls, not a claim of universal acceptance. Fresh evidence improves controls 21, 27, 35, 48, 66–67, 77–80 and 84 within their scope without inventing missing sign-offs.

- **PARTIAL 19, 21, 27, 35:** intentional third-party metadata flows, human disclosure review, cross-tab/cache/exports scope and user-managed plaintext exports remain. No cloud/account infrastructure added.
- **PARTIAL 48, 66, 67:** human scientific/provenance meaning review, full browser-model integrity/inference and artifact license/redistribution review remain. No new source license approval inferred.
- **PARTIAL 77, 78, 79, 80:** selected contrast and real keyboard evidence improved; actual screen reader, Safari, physical devices, full zoom/state coverage and founder-approved hardware/performance budgets remain.
- **NOT VERIFIED 8, 9, 10, 29, 40:** actual hosted HTTPS/headers/routing, account/domain access, recovery exercise, provider retention and agreements/residency. No hosting account or production endpoint was operated.
- **NOT VERIFIED 24, 30, 74, 84, 89:** accountable controller/contact and applicable legal review; qualified translation review; physical microphone/language-pack behavior; clinical/geographic adequacy and recognizer recall. No blanket certification is assumed necessary.

## Founder manual acceptance checklist — all items unsigned

Use a disposable browser profile and synthetic, nonpersonal text. Record **RC commit, reviewer, date, OS/device, browser/version, language, expected/actual outcome, evidence and PASS/FAIL/BLOCKED**. Each unchecked item remains unaccepted. Do not enable paid services, accounts or publication to complete this sheet.

| Language | UI/translation reviewer | Privacy/crisis reviewer | Device/AT evidence | Status |
| --- | --- | --- | --- | --- |
| English | Unassigned | Unassigned | Missing | NOT VERIFIED |
| Français | Unassigned | Unassigned | Missing | NOT VERIFIED |
| Español | Unassigned | Unassigned | Missing | NOT VERIFIED |
| Deutsch | Unassigned | Unassigned | Missing | NOT VERIFIED |
| 简体中文 | Unassigned | Unassigned | Missing | NOT VERIFIED |
| Português | Unassigned | Unassigned | Missing | NOT VERIFIED |

### Browsers, devices and assistive technology

- [ ] Founder enables Safari Remote Automation only if automation is desired, or performs a documented manual Safari walkthrough. Verify Earth/WebGL, Explorer, Folsom search, navigation, menus, language persistence and error recovery; do not record a pass from driver availability.
- [ ] On representative iPhone/iPad Safari and Android Chrome hardware, repeat those journeys in all six languages, including portrait/landscape, virtual keyboard, short viewport, safe areas and low-memory behavior. Record actual versions/device memory where available.
- [ ] With a founder-enabled screen reader (VoiceOver/NVDA/TalkBack as applicable), verify headings/landmarks, meaningful tab/panel names, reading order, announcements, keyboard selection/return and absence of traps. CORE must make no speech-output calls.
- [ ] Use real browser zoom at 200% and 400%, large text and reduced motion. Inspect clipped content and focused controls; the 320-CSS-pixel automated checks are not a full zoom/device pass.
- [ ] Review contrast/focus across moving map imagery, all overlays, menus, companion, error/crisis states and light vault panels. Preserve measured evidence; sampled stable-frame ratios do not clear every axe incomplete.

### AI, microphone and privacy

- [ ] Resolve applicable rights for the exact compiled browser-model artifact with official evidence or qualified review. Do not substitute an unofficial mirror, SRI or account upgrade.
- [ ] After that gate is resolved, explicitly opt in to the appropriate pinned browser model on supported hardware. Record download bytes/hosts, expected shard hashes, actual integrity, cold/warm load, inference/cancel/disable/reload, out-of-memory/load failure and six-language responses. Confirm no weight download before consent and no remote inference.
- [ ] Explicitly press microphone only in a test profile. Review/install a browser language pack only with informed permission; dictate a harmless sentence in each language. Check denial, stop, unsupported language and text fallback. CORE's answers must remain text-only; record audio/vendor-local behavior without saving personal audio.
- [ ] Create a synthetic vault idea, lock/reopen it, cancel then accept plaintext export, and protect/delete the exported file manually. Confirm the warning is understood; it is not an encrypted backup. No passphrase recovery is promised.
- [ ] Using only dummy records, verify TRUST wipe scope, other open tabs' memory and browser site-data/cache removal. Close other tabs for fuller removal; do not assume namespace deletion erases downloaded files or all browser caches.
- [ ] Assign the actual controller/privacy contact and review hosting/map/download/optional-search data flows, retention, residency, disclosures and applicable obligations with a qualified reviewer. No anonymous repository link or code scan counts as that approval.

### Translation, scientific safety and release decision

- [ ] Qualified reviewers sign off privacy/crisis/error/commercial/scientific wording in all six languages, including French and remaining English data-driven records. Confirm users understand recorded, synthetic, unreviewed and uncalibrated labels; do not silently translate source identifiers/provenance.
- [ ] Qualified crisis review checks geographic appropriateness, service numbers/availability/costs and realistic positive/negative phrases. Language is not location. Test locally with synthetic phrases; do not call emergency services for testing or infer measured recall from six examples.
- [ ] Founder selects target hardware/network and an explicit performance budget: readiness ___ ms, completed transfer ___ MiB, interaction ___ ms, optional model limits ___. Test those conditions and approve results; local timing alone is not a budget approval.
- [ ] Hosting owner separately approves a scoped account/domain/retention/HTTPS/header/redirect/configuration review and verifies a usable immutable rollback target. Retain the prior deployment; exercise recovery only under separate authorization. Phase 4's [rollback proposal](CORE_V9_9_PHASE4_RELEASE_READINESS.md#hosting-preparation-and-rollback--proposal-only) remains unexecuted.
- [ ] Authorize remote CI/push, any preview and eventual production publication separately after evidence review. This phase grants none of those actions. Record an explicit founder release decision tied to the exact RC; unsigned checklist items are not waivers.

## Reproduction and limitations

Use the existing Playwright Core via `NODE_PATH`, pinned axe and a new browser profile/unused loopback port, serving only `node scripts/build-public.mjs` output. Run browser scripts serially: `scripts/v99-phase5-browser.mjs`, `scripts/v99-phase5-firefox.mjs` against your own native BiDi browser, and `scripts/v99-phase5-vault.mjs`. Run the supported `node scripts/verify.mjs` after staging runtime changes, plus `npm test --prefix scripts/intelligence`. Do not repeat the full Phase 4 matrix after documentation-only changes.

Earlier failing records remain in private evidence: script-free privacy correctly refused a test's dynamic import (harness fixed); Firefox CDP returned 404, then initial BiDi expression serialization was corrected to await results and assert boolean checks. Final passes use actual resolved results. The startup failure is an application deadline problem with its own before/after evidence, not dismissed as a harness problem. No human/physical/legal/hosting pass is invented.
