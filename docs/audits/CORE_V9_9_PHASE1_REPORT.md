# CORE V9.9 Phase 1 checkpoint — 2026-10-20–21

Branch: `v9.9/multilingual-text-first`, in the worktree directory named `v9.8`. Started at `75c9190`. Local implementation checkpoints: `ce30d5d` (crisis/privacy fixes), `9d270a7` (translation/accessibility fixes and audit scripts). The following documentation checkpoint changes no runtime. No merge, push, deployment, external plugin installation, package installation, paid-service activation, HQ change or Beta Lab change.

## Fixed

1. **Sensitive crisis input retained by Dialogue.** The raw user crisis text previously entered session turns and could be saved/exported. Only the fixed help response is now retained; a regression asserts absence from both session state and Markdown export.
2. **Direct local API bypassed crisis interception.** Authenticated requests sent directly to the bridge could reach the model. The bridge now uses the shared recognizer and fixed response before inference; tests assert zero model calls.
3. **Local API rejected four supported languages.** Replaced its EN/FR-only check with the existing six-language allowlist. All six exact codes are tested; unsupported, prototype-name and array values are refused.
4. **TRUST deletion omitted newer data/consent keys.** The confirmed deletion action now removes all `core.*` keys in localStorage and sessionStorage, preserves unrelated keys and reloads the page to discard its in-memory state. Browser model caches and other tabs remain separate limitations.
5. **Incorrect privacy/provenance claims.** TRUST no longer says CORE has no microphone or makes an unqualified no-network claim. Updated these statements in all six languages. Removed the unsupported claim that people authored the fixed crisis text.
6. **Crisis-resource accuracy.** Replaced Portugal's general SNS24 reference with the dedicated 1411 service, qualified Swiss carrier charges, and scoped German/Chinese emergency examples geographically. Sources and remaining human-review limits: [resource review](CORE_V9_9_CRISIS_RESOURCES.md).
7. **Avatar input missing an accessible name.** Associated the pseudonym field with its existing translated heading; no visual change.
8. **Ten translation lookup gaps.** Added the missing Commons/Knowledge/storage text in es/de/zh-CN/pt through the existing dictionaries and extraction templates. Regenerated the catalog: 2,620 required keys, all present in each dictionary. Each dictionary retains 2,621 entries, including one historical unused entry. New translations remain model-written drafts.

These were confirmed privacy, safety, language and accessibility issues. This assessment found no credential-pattern exposure or confirmed critical remote exploit; it does not establish absence of vulnerabilities.

## Executed validation

| Check | Actual result |
| --- | --- |
| Final `node scripts/verify.mjs` | **308/308 pass**, CSP current, integrity scan of 723 then-tracked files: zero findings. Executed with loopback permission; earlier sandbox-only failures in two control-server tests were separately reproduced as passing outside the sandbox. |
| Targeted affected suite | 58/58 pass; later translation/safety subset 52/52 pass. No tests skipped in the final supported gate. |
| Optional `test/intelligence.test.mjs` | **FAIL at import:** missing `@langchain/langgraph`. Its declared dependencies were not installed; the supported gate selects `.test.js`, so its green result does not cover this optional suite. |
| Secret/integrity checks | Zero tested pattern findings in tracked files, V9.9 commit scans and generated public artifacts. Pattern scanning is bounded evidence. |
| Lockfile-only npm advisory checks | Vendor AI and optional local intelligence: **zero known advisories**. Existing lockfiles only; nothing installed. |
| Build | Pinned WebLLM checksum verified; 189 public files, approximately 21.6 MB before transfer/compression. |
| Six-language browser matrix | **132 unique language/viewport/page cases**, 11 supported pages × six languages × 1440/390 px. Latest evidence per case: **1,557 checks passed, 1 failed**. No uncaught page exceptions or unresolved translation lookups in the inspected completed journeys. The failed case did not complete its interaction checks. |
| Extra interaction coverage | Agent search/selection/evidence, fixed crisis response, synthetic model failure with deterministic fallback, synthetic microphone denial, language switching, disclosures/tabs and Commons vault/Knowledge/experts/communities/TRUST routes. No actual audio or model download/inference. |
| Accessibility | DOM accessible-name/image checks, Tab focus and Chrome accessibility-tree probes. Missing avatar label fixed and retested in six languages/two viewports. **No new axe run, complete contrast audit or screen-reader acceptance.** |
| Performance | Three current-public-site no-WebGPU samples completed without page exceptions; metrics below. |

### Unresolved startup finding

The final Spanish/mobile World case timed out waiting for Earth/Intelligence readiness after 60 seconds. Earlier matching interaction checks passed. A focused diagnostic subsequently became ready in **4,624 ms** and captured `ERR_CONNECTION_RESET` for the local `src/shell/nav.mjs` request, plus the boot guard's retry. This suggests local transport instability but **does not establish the original timeout's cause**. The timeout remains a finding; the successful retry does not resolve it. Evidence: `browser-final.json`, `browser-summary.json`, `startup-diagnostic.json`.

Initial browser evidence is retained rather than rewritten: 1,434 passes/30 failures across 132 loads. Those failures exposed the avatar label and test assumptions (the model intentionally falls back, and map controls must be tested after closing the answer overlay). A second targeted attempt incorrectly clicked reset while its settings sheet was hidden and was stopped. Corrected targeted checks exposed ten real translation gaps; these were fixed and Commons rerun. All intermediate results remain in ignored evidence files. The legacy V9 journey audit produced 9 passes/25 failures and crashed on an obsolete form field; it remains an obsolete-harness failure, not an acceptance pass.

### Performance samples

| Sample | Ready | Completed transfers | JS heap | First camera action | Agent command complete | RAF cadence |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop cold | 1,177 ms | 9,761 KB | 41.3 MB | 11 ms | 1,448 ms | 54.3/s |
| Desktop warm | 3,864 ms | 32 KB | 55.1 MB | 18 ms | 1,452 ms | 60.4/s |
| Mobile cold | 1,041 ms | 9,878 KB | 48.2 MB | 15 ms | 1,451 ms | 60.4/s |

One headless machine, no throttling, no WebGPU/model. Transfers cover completed requests through the sample, including cache behavior; they are not the public build's total size. RAF cadence is not measured GPU rendering throughput. No agreed performance budget or representative-device calibration; the slower warm sample is retained without claiming an optimization or improvement.

## Audit and readiness

[The 90-control audit](CORE_V9_9_90_POINT_RELEASE_AUDIT.md) uses a newly defined project checklist because no historical numbered specification was recovered. It records evidence rather than claiming legal compliance. Final counts: **59 PASS, 2 FAIL, 14 PARTIAL, 4 NOT APPLICABLE, 11 NOT VERIFIED**. The FAIL controls are the unresolved startup case and the unavailable optional local-intelligence test environment.

**Ready for a next phase of focused validation/remediation; not release-ready.** Priorities: explain the startup timeout; qualify the optional worker environment if it remains in scope; perform manual keyboard/screen-reader and real-device/microphone/browser checks; obtain qualified translation/crisis/privacy review and a founder decision on privacy contact; verify hosting controls before any separately authorized publication. Core language support and text-only answers remain intact; visuals were preserved.

## Evidence and reproduction

Private evidence: `.core-local/evidence/v99-phase1/` (ignored, retained locally; not portable evidence in Git). Important files: `final-verification.log`, `targeted-final.log`, `translation-final-tests.log`, `browser-summary.json`, the browser JSONs listed there, `performance.json`, `optional-intelligence.log`, dependency JSONs, history scans and `public-scan.json`. The 24-hour local verification proof is tied to the exact runtime fingerprint and Node v22.20.0; documentation-only changes do not invalidate it.

The existing external Playwright installation is required; no package or browser is downloaded by the scripts. Start an isolated browser/profile on an unused loopback port, never the founder's profile/port 9222. Keep the founder's port 8788 untouched. Serve **public/** on loopback. Run browser checks serially:

```sh
node scripts/build-public.mjs
python3 -m http.server 8790 --bind 127.0.0.1 --directory public
NODE_PATH="$HOME/core/.core-local/v8/pw/node_modules" CORE_CDP_PORT=9241 node scripts/v99-phase1-browser.mjs
# Affected pages only (output path first):
NODE_PATH="$HOME/core/.core-local/v8/pw/node_modules" CORE_CDP_PORT=9241 node scripts/v99-phase1-browser.mjs .core-local/evidence/v99-phase1/recheck.json world.html commons.html
NODE_PATH="$HOME/core/.core-local/v8/pw/node_modules" CORE_CDP_PORT=9241 node scripts/v99-phase1-performance.mjs
node scripts/verify.mjs
```

The browser default output directory must already exist. Python hosting does not enforce generated Vercel response headers. Do not infer production-header acceptance from these local checks.
