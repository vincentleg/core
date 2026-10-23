# CORE V9.9 — geographic navigation hotfix released

2026-10-22 UTC. **Live and verified:** https://creationofrebornearth.com. Resumed clean at `0594139` on `v9.9/multilingual-text-first` in `~/core/.core-local/worktrees/v9.8`; reused saved implementation `add133d` without application changes. No new development phase or comprehensive audit.

**Exact deployed Git commit:** `0594139b8d2ac3bd5da9daaa0d759628a93cc090`. Application commit: `add133d6dfb59a49d6210fb28a1aa93a34001267`. **Vercel deployment:** `dpl_HATfgYHfekBtxrpcBLGTDFmSLwMR`, READY, existing `vincentleg/core` (`prj_bUuUjCsodKFbyWhI2IYLBSdZ6Pys`), immutable URL https://core-5k37gnuhk-vincentleg.vercel.app. Actual apex/www aliases and deployment API commit metadata verified. Final test/documentation checkpoint follows without another deployment.

## Cause and saved fix

The broad local alias “Golden Gate” matched the bridge inside a park request and suppressed external search. The local street catalog covered only Folsom/Howard, command extraction missed phrases such as “Zoom sur”, and unfiltered external results included buildings/tram stops instead of requested streets/hospitals. Geocoding consent was hidden and not persistent. The interrupted implementation also exposed Tokyo/local-namesake ranking and inappropriate continental camera context.

The saved fix separates command grammar/entity extraction, feature-compatible local matching, and consented open-ended Photon resolution. It uses documented feature filters, exact-name/context ranking, duplicate-street handling and explicit alternatives, not a new famous-location list. Global untyped names avoid local provider bias and prioritize administrative places. At planetary zoom, published corridor coverage provides soft context; explicit location qualifiers take precedence. User-supplied coordinates retain their signs/order. Camera movement is awaited and checks actual center AND zoom, then highlights the destination. Typed input and voice transcription use the same pipeline; Qwen remains optional, with no automatic model download or speech output.

## Newly completed verification

- Missing Tokyo, Springfield and unknown-place real-browser checks passed first; 11 geographic unit tests passed. The formerly interrupted targeted log was recovered as a recorded 69/69 pass, not falsely relabeled as a new run.
- Supported release gate **340/340**, zero skipped; CSP/integrity passed. A second gate passed only because the non-public browser test script was corrected to await language application. No runtime application change or second deployment was needed.
- Local focused real-Photon browser journey: **85/85 checks, 15 commands, 10 rate-spaced submitted provider lookups**, zero uncaught exceptions. All six interface-language command variants, synthetic voice dispatch, consent rejection/persistence, expected ambiguity and unknown-place behavior covered.
- Actual production: **85/85 checks, 15 commands, 10 lookups**, started `2026-10-22T02:41:35.925Z`; genuine text-field Enter submissions, real Photon responses and actual camera centers/zoom/markers. One voice-transcription event was synthetic; no audio was recorded. No unexpected model download or uncaught application exception.
- Build: pinned bundle verified, **193 upload files / 21,683,496 bytes**, linked project/manifest exclusions checked. Gitleaks 8.30.1: public artifact and both unpublished checkpoint commits clean. Existing commit/push hooks retained; no dependency installation or paid service.
- **9/9 actual hosted file hashes** match the build (World, catalog, geocoder, lexicon, engine, tools, map adapter, UI and privacy). Vercel `gitCommitSha` and `coreReleaseCommit` match the release above.

| Actual live command | Resolved identity / feature | Actual camera [longitude, latitude] |
| --- | --- | --- |
| Go to Golden Gate Park | Golden Gate Park; park | `-122.4821837, 37.7693681` |
| Va devant Golden Gate Park | Golden Gate Park; park | `-122.4821837, 37.7693681` |
| Zoom sur Market Street, San Francisco | Market Street; street | `-122.4260298, 37.76994` |
| Zoom sur Market Street | Market Street; street | `-122.4260298, 37.76994` |
| Go to Folsom Street | Folsom Street; street | `-122.4067101, 37.7776401` |
| Take me to the Eiffel Tower | Eiffel Tower; monument | `2.2945006, 48.8582599` — after choosing Paris |
| Go to UCSF Medical Center | UCSF Medical Center at Mission Bay; hospital | `-122.3907673, 37.7659389` |
| Take me to Tokyo | Tokyo; city | `139.7638947, 35.6768601` |
| Zoom to 37.7749, -122.4194 | 37.7749, -122.4194; coordinates | `-122.4194, 37.7749` |

`Go to Springfield` correctly returns multiple choices without navigation. `Go to ZzqNonexistentPlace8675309` correctly returns no destination and leaves the camera unchanged. Spanish/German/Portuguese/Chinese park commands and French voice-pipeline dispatch also pass. No requested positive case remains failing in the final live run.

The first live keyboard harness failed to find the Paris alternative after rapid language switches: it submitted an English entity while the German dictionary switch was still pending, and the provider localized the Paris name. The test now awaits each language application; failed evidence is retained alongside the final pass. This does not certify arbitrary cross-language aliases or provider completeness.

## Privacy, limitations and rollback

Photon remains the existing free [official service with reasonable-use/no-availability-guarantee terms](https://github.com/komoot/photon#demo-server), using [documented filters/bias](https://github.com/komoot/photon/blob/master/docs/api-v1.md). No typeahead/crawling; bounded timeout, memory cache and five uncached requests/minute per session remain. Geographic consent/refusal is remembered under `core.geocode.consent`; the existing checkbox revokes it. Disclosures in six languages explain place name, map-context center and IP transmission, with no audio/full chat. No device GPS request or search-history persistence added.

Provider outages/rate limits, real ambiguity and incomplete multilingual aliases still require retry/refinement/choice. Eiffel Tower replicas require selecting Paris; UCSF resolves to the returned Mission Bay hospital, not a tram stop. Real microphone hardware/Safari/device acceptance and qualified translation/privacy/legal/model-artifact review remain outside this focused verification. No new blanket certification or audit totals asserted.

Before deployment the actual prior READY production was recorded and retained: `dpl_3UZ3c3oNKpFFHTGRpjJiNFuGMN8i` (voice/chat release). If a critical regression warrants the authorized rollback:

```sh
vercel rollback dpl_3UZ3c3oNKpFFHTGRpjJiNFuGMN8i --scope vincentleg
```

Then verify apex deployment identity, globe/search and text-only responses. No rollback exercise or recovery-time guarantee. Private evidence: `.core-local/evidence/v99-geography-resume/`, including `live-final.json/log`, `live-typed.mjs`, `identity.json`, gate/scanner and deployment records. The keyboard harness is a local variant of the committed browser script; only submission uses the real input/Enter instead of calling its shared handler directly.

Release branch pushed; main’s 25 separate commits at inspection preserved. Buildings work/renderer, CORE HQ, Beta Lab and Wines Horizon untouched; no merge/reset/force-push or global/billing changes. Disposable browser/profile stopped/removed at final checkpoint; founder services untouched. Founder can refresh the public site and test the hotfix now.
