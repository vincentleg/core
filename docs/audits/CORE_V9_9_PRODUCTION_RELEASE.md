# CORE V9.9 — authorized production release

Current production update: the subsequent [voice/chat onboarding fix](CORE_V9_9_VOICE_CHAT_FIX.md) supersedes the deployment below. This original release record is retained for provenance/rollback.

Date: 2026-10-21. **Deployed and available for founder testing:** https://creationofrebornearth.com. This completes the expressly authorized release; it does not start another development phase or certify the unsigned manual checks.

## Release identity and authorization

| Item | Verified value |
| --- | --- |
| Branch | `v9.9/multilingual-text-first` |
| Exact deployed Git commit | `90d4772e9d98507bb1e65eeb39e5a6a0981f681e` |
| Application/test commit | `effc048afd81f32d1d2597655f3496b59706aed6` |
| Deployment ID | `dpl_EooJaB3FBNkJh5FJm3EKvWNPzKkL` |
| Immutable deployment URL | https://core-okzcmjjvv-vincentleg.vercel.app |
| Existing owner/project | `vincentleg/core`, `prj_bUuUjCsodKFbyWhI2IYLBSdZ6Pys` |
| Existing organization | `team_J49jXmAXIjsAiupWY0z18yHN` |
| Hosting status | `READY`, target `production`; apex and www aliases verified |
| Live smoke started | `2026-10-21T21:32:25.187Z` |

The founder explicitly authorized production publication, release-branch push and rollback for a critical regression, despite remaining optional human/device/legal acceptance. This supersedes the previous publication restrictions and release recommendations, **not** the recorded limitations or third-party rights requirements. No known confirmed critical security issue or exposed secret was found in these release checks. No application, schema, UI, language, AI, microphone or global-tooling change was needed.

The correct worktree `~/core/.core-local/worktrees/v9.8` started clean at the deployed commit. A fresh fetch found **128 branch-only / 23 main-only commits** against `origin/main` (`99799a1` at inspection), including scheduled data refreshes and an earlier MapLibre hotfix. The release already contains MapLibre 6.11.2. No merge was needed for the existing static CLI deployment. The release branch was pushed with active security hooks; main and all unrelated history were preserved. No force-push, reset, HQ/Beta Lab/Wines Horizon operation or new service/account/dependency/billing setting.

## Minimal verification and live results

Ignored evidence: `.core-local/evidence/v99-release/`. Recorded files are local evidence, not portable public attestations. No comprehensive audit/browser matrix was repeated.

| Check | Fresh result / evidence |
| --- | --- |
| Supported gate | **319/319 pass, zero skipped**; `verification-authorized-network.log`. Initial sandbox invocation passed 317, but two loopback control-server tests could not start and failed while extracting their startup token; the authorized outside-sandbox run resolved both without code changes. The necessary permission retry is recorded, not hidden |
| CSP/integrity | CSP current; **781 files, zero findings**, six existing documented exceptions. Existing hooks remained enabled |
| Production build | `node scripts/build-public.mjs`: **190 source/assets**, **193 upload files / 21,655,901 bytes** including generated configuration; pinned AI bundle checksum verified |
| Public secrets | Gitleaks **8.30.1**, final public directory: no leaks (`gitleaks-public.json/log`). Active pre-push checks scanned unpublished commits and reused the exact-runtime test proof |
| Deployment input | Existing linked project; static `Other` framework; 193 files; `.vercel` excluded. Explicit public manifest excludes internal docs, scripts, tests, local databases and secrets; no install/migration/runtime service introduced |
| Hosted build | Vercel `READY`; hosted CLI 64.7.0, static build completed in 357 ms. Existing local CLI 63.1.2. No plan or build-machine upgrade |
| Anonymous live smoke | Chrome **155.0.8059.85**, disposable profile: **43/43 checks pass** (`live-smoke.json`, bounded reproducer `live-smoke.cjs`) |
| Homepage/Earth/Explorer | Anonymous HTTPS 200, real WebGL globe/projection, Explorer opens; desktop screenshot visually reviewed |
| Six languages | Actual selector changes to en/fr/es/de/zh-CN/pt; HTML language and persisted selection verified |
| Search/agent intelligence | Submitted Folsom Street search navigates; actual agent selection and recorded evidence retrieval succeed; crisis example excluded from history |
| AI consent/text-only | Settings visible, Qwen3-1.7B offered through explicit opt-in; no model consent, weight request or speech-output call in the checked journey. Optional generative model was **not downloaded or executed** |
| Navigation/routes | Clicked Solutions link works; plans, Commons, Dialogue, privacy and manifesto return 200; www root redirects 308 to apex |
| Mobile | Fresh 390×844 context: ready globe/Intelligence, header fits, Explorer input visible; screenshot visually reviewed. This is a browser viewport, not physical hardware |
| Errors | **Zero uncaught exceptions, console errors or HTTP failures**. 72 request cancellations, all `ERR_ABORTED`: 57 map tiles, 12 terrain requests and three same-origin opaque requests during navigation. No other failed-request type; cancellations are retained in evidence, not reported as completed transfers |
| Served headers | Actual HTTPS response: HSTS `max-age=31536000`, nosniff, DENY framing, no-referrer, camera/geolocation denied and microphone self-only |
| Commit/artifact identity | Vercel API `gitCommitSha` and `coreReleaseCommit` both equal the deployed commit. SHA-256 of six actual public responses matches the built world HTML, Intelligence UI/catalog, shared CSS, Spanish dictionary and MapLibre module |

The optional worker's **6/6** result and the broader six-language/browser/accessibility evidence remain the **recorded Phase 5 results**, not fresh release executions. No redundant worker/full accessibility campaign was launched.

## Remaining limitations and acceptance

The [Phase 5 founder checklist](CORE_V9_9_PHASE5_ACCEPTANCE.md#founder-manual-acceptance-checklist--all-items-unsigned) remains unsigned. Actual Safari/physical devices, screen readers, microphone/language-pack audio, comprehensive contrast/zoom, qualified translations/crisis-resource accuracy, controller/privacy/legal/provider-retention review and an approved performance budget remain open. Prior constrained local readiness was roughly 33 seconds; the deadline fix is not a payload optimization.

Optional public Qwen model download/all-shard integrity/compilation/inference remain unverified. The exact compiled-library/model artifact rights scope is still unestablished; no new download or execution was performed. Passing deterministic live search and prior approved local Qwen inference do not establish public model inference acceptance. Do not treat founder publication authorization as a third-party license grant. Vault exports remain explicitly plaintext JSON with confirmation; at-rest encryption does not protect exported files.

Only newly verified hosting controls were updated: control **8 → PASS**, control **9 → PARTIAL** (project/domain/authorized access verified; all-member roles/MFA/access review absent). Current totals: **66 PASS / 0 FAIL / 12 PARTIAL / 4 NOT APPLICABLE / 8 NOT VERIFIED**. Account-wide access, retention/contracts and independently exercised recovery were not invented. The practical release decision is **founder-authorized public testing, deployed successfully**, with these limitations retained; no broad compliance or complete acceptance claim.

## Rollback reference

Immediately before publication, authenticated inspection of the actual apex domain verified the prior deployment **`dpl_Bvw6QKRGg18SLwwrnQ5LAHiuBWzZ`**, URL `core-at3mqklii-vincentleg.vercel.app`, `READY`, same owner/project and production aliases. It was retained. This newly confirms its deployment identity and readiness; its historical Git attribution was not independently re-established.

If a critical regression warrants the already authorized rollback, use the existing project/account:

```sh
vercel rollback dpl_Bvw6QKRGg18SLwwrnQ5LAHiuBWzZ --scope vincentleg
```

Then confirm apex deployment ID, HTTPS/headers, homepage/globe, Explorer/search and text-only behavior. Follow the [existing rollback limitations](CORE_V9_9_PHASE4_RELEASE_READINESS.md#hosting-preparation-and-rollback--proposal-only) and [official CLI reference](https://vercel.com/docs/cli/rollback). No rollback was necessary or exercised; plan eligibility and recovery timing are not claimed. Hosting rollback reassigns an existing build, not Git history, environment settings or external data. Never reset/force-push as a hosting rollback.

Final documentation is saved in a subsequent focused commit, without a second deployment: the exact live application/release commit remains the one listed above. Founder testing can begin immediately at the apex URL; no new development cycle is authorized by this checkpoint.
