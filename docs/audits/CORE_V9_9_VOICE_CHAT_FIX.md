# CORE V9.9 — voice and chat onboarding production fix

Current production update: the [geographic-navigation hotfix](CORE_V9_9_GEOGRAPHIC_HOTFIX_RELEASE.md) is now deployed, preserving this voice/chat behavior. This earlier release record remains historical.

Date: 2026-10-21. Focused founder-authorized production improvement, not another development phase. **Live and READY:** https://creationofrebornearth.com.

| Release identity | Verified value |
| --- | --- |
| Exact deployed commit | `384b48111b80a50358347501d81cc882f0016a59` |
| Branch | `v9.9/multilingual-text-first` |
| Deployment | `dpl_3UZ3c3oNKpFFHTGRpjJiNFuGMN8i` |
| Immutable URL | https://core-mq0soxa7m-vincentleg.vercel.app |
| Existing project | `vincentleg/core`, `prj_bUuUjCsodKFbyWhI2IYLBSdZ6Pys` |
| Production routing | Apex and www aliases verified; Vercel READY and commit metadata match |
| Retained immediate rollback | `dpl_EooJaB3FBNkJh5FJm3EKvWNPzKkL`, https://core-okzcmjjvv-vincentleg.vercel.app |

## What changed

- Chat and microphone are available on the Earth-first landing page. The existing command bar/design is reused; its narrow-screen title overlap was corrected and visually reviewed.
- Basic commands, place search/navigation, agents and recorded answers use the existing deterministic pipeline without Qwen. “What is CORE?” now retrieves the existing `core-now` overview instead of losing every search word. Unknown generative questions honestly explain the limitation and give useful commands; they do not invent answers.
- Native `SpeechRecognition` or `webkitSpeechRecognition` is used after an explicit microphone press. Six interface language codes map to en-US/fr-FR/es-ES/de-DE/zh-CN/pt-BR. Interim and final text appear in the input; final text enters the existing command/response pipeline, including Companion. A second press cancels; World also cancels with Escape and language/page changes, Companion on close/re-render. Permission errors, silence, unsupported browsers and recognition errors leave typing available. A 20-second bound limits one dictation attempt.
- Already-available on-device recognition is preferred. No browser language pack is installed automatically. Otherwise a **separate translated confirmation precedes capture**, explaining that the browser provider may process audio under its privacy policy. Declining starts no recognition. CORE adds no audio-upload endpoint, recording or audio storage. Native provider transport is controlled by the browser, not CORE’s page CSP; all six static privacy disclosures now make that distinction.
- Qwen remains available under **Advanced AI (optional)** in settings, with its approximate size (normally 984 MB for 1.7B) before explicit activation. Old remembered consent no longer starts loading on page entry. Opening ordinary chat, microphone or settings causes no model download; capability detection waits for the Advanced AI section. Pending optional model initialization does not block voice or deterministic chat. Existing local inference is retained; no CORE-hosted generative service genuinely exists, so none was added or claimed.
- No speech-output path, paid API, dependency, account, billing/global setting, schema or `src/engine.js` change. Six languages and premium visuals preserved. No HQ, Beta Lab or Wines Horizon operation. Remote release branch updated; main and unrelated commits untouched.

## Verification

Ignored private evidence: `.core-local/evidence/v99-voice-chat/`. The committed regression scripts/tests are repeatable; these local logs are not public attestations.

| Check | Result and scope |
| --- | --- |
| Focused unit tests | **58/58**: dictation, Intelligence and affected Companion/i18n contracts. Includes six locales, standard/prefixed recognition, local capability, provider-consent rejection, pending-capability cancel, interim/final/late events, permission/network/silence and bounded cleanup. Synthetic API events, no actual audio |
| Supported release gate | **329/329**, zero skipped; CSP current, integrity **784 files/zero findings**, six existing documented exceptions. One gate after staging; push hook reused identical-runtime proof |
| Translations | Regenerated catalog **2,630 keys**, four dictionaries **2,638 entries each**; key/token/markup parity passes. Eleven new dictionary messages; six static privacy sections updated. Professional meaning review remains unsigned |
| Local Chrome 155.0.8059.85 | **105/105 checks**, six languages, 1440/320 viewports, visible landing chat/mic, deterministic grounded overview/navigation, synthetic native/prefixed voice-to-command flow, privacy rejection, errors/stop, Companion and a deliberately held optional-model-load fixture. No unsolicited model requests or uncaught errors. Desktop/mobile screenshots reviewed |
| Native Firefox 158.0.1 | **5/5**: actual recognition APIs absent, clear unsupported-browser message, visible mic/chat, no model initialization and real model-free grounded chat. No mocked support claim |
| Actual public URL | **105/105** focused checks started `2026-10-21T21:56:58.611Z`, same six-language scenarios over actual hosting. Recognition and held model are explicitly synthetic fixtures, not a microphone/inference acceptance claim |
| Actual native Chrome denial on public URL | **14/14**, started `2026-10-21T21:57:30.746Z`. Both actual recognition constructors present; real support probe returns browser-managed mode. Microphone permission explicitly set and verified **denied before pressing mic**. Real provider confirmation shown; actual native permission error resets mic and preserves grounded text chat. No microphone recording/model download; this is denial-path evidence, not successful dictation |
| Build/upload | Pinned bundle verified; **193 files / 21,665,605 bytes**. Static public allowlist and `.vercel` exclusion retained |
| Secrets/security hooks | Gitleaks 8.30.1 public artifact and staged diff: no leaks; pre-commit/pre-push integrity checks passed, no bypass |
| Live identity | Vercel API `gitCommitSha` and `coreReleaseCommit` match the exact commit above. Six actual hosted file hashes match built World, dictation, Intelligence UI/tools/CSS and privacy; anonymous HTTPS 200 |

Intermediate test problems were retained in local logs and resolved: the local harness initially omitted the hosting `/` → `world.html` rewrite; a loopback proxy suffered EPIPE during context disposal and was replaced with direct built-artifact fulfillment; Companion was correctly tested through its actual non-World entry point; Firefox’s first English-string assertion needed an explicit English test locale. None is reported as a successful check or a production application defect. Screenshot review separately found and fixed the real title overlap before the final tests/deployment.

## Privacy and remaining acceptance

This request explicitly changes the former on-device-only voice requirement to progressive native recognition with informed provider consent. Audit control 82 now records that changed requirement and its bounded evidence, rather than silently retaining the old claim. Controls 19/21/73/83 are updated for these affected paths only; no comprehensive audit was repeated. Totals remain **66 PASS / 0 FAIL / 12 PARTIAL / 4 NOT APPLICABLE / 8 NOT VERIFIED**.

[Browser recognition support is limited and may use a vendor service](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition); [`processLocally` distinguishes enforced local processing](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally). No universal browser, language, offline, provider-retention or availability promise. Real successful audio capture/transcription, physical devices, Safari and qualified translations/privacy/legal review remain manual. The [existing unsigned checklist](CORE_V9_9_PHASE5_ACCEPTANCE.md#founder-manual-acceptance-checklist--all-items-unsigned) still applies, with voice evaluated against this explicitly authorized policy. Optional browser-model artifact rights/full download/inference acceptance remains unresolved and was not exercised. CORE still replies only in text.

## Rollback and final checkpoint

The immediate previous READY production deployment was authenticated and retained before release. If a critical regression warrants the founder-authorized rollback:

```sh
vercel rollback dpl_EooJaB3FBNkJh5FJm3EKvWNPzKkL --scope vincentleg
```

Then inspect the apex deployment ID and recheck globe/navigation/text-only behavior. The [existing rollback limitations](CORE_V9_9_PRODUCTION_RELEASE.md#rollback-reference) still apply; no rollback exercise or recovery-time guarantee. Final documentation is a subsequent focused commit, not another deployment. Disposable test browsers/server and their own profiles are stopped/removed at the final checkpoint; founder services are preserved. Founder can refresh the public page and test now; cached assets from an already-open session may require a full reload.
