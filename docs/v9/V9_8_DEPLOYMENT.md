# V9.8 deployment and validation checkpoint

Production remains the approved V9.7 hotfix `a74768ccf09aa3eccc0c2d890c963d390206b080`. No promotion or domain change is authorized. The existing CORE Vercel project was verified to match the original project link; its actual API configuration already protects deployment URLs with Vercel Authentication (`all_except_custom_domains`). No protection, billing, environment or production setting needs to be changed.

## Implemented and verified locally

- 500 actual registered identities and sixteen municipal reference points; no regenerated personas, agents or scientific datasets.
- Desktop and mobile Chrome emulation: visible initial search, sourced Folsom camera movement, Golden Gate Bridge reference, real Oakland urban-planning agent navigation/highlight/panel, contextual “here,” inconsistent-place clarification without movement, French navigation, recorded investigations, sources and product/pricing/worker disclosures. No JavaScript exceptions in the successful focused run; no horizontal page overflow.
- Genuine local Ollama/Qwen3:8B selected `search_places`, `search_agents`, `select_agent` and `retrieve_evidence`. The actual Oakland identity has no completed recorded investigation, and the response discloses that. Its unsupported synthesized citations were rejected; the shown response is explicitly a model-planned factual execution receipt, not an accepted model narrative.
- A generated OS-voice WAV went through actual browser getUserMedia, AudioWorklet capture, the local Whisper base endpoint and genuine constrained Qwen3 tool planning in the shared engine, then moved the real Earth camera to Folsom Street. This uses synthetic audio and proves that path, not physical microphone quality or Safari compatibility.
- Targeted unit tests cover bounded orchestration, closed arguments, unsupported coordinates/IDs, source checks, repeated plans, context, held evidence scope, privacy reset, PCM conversion, microphone denial/cancellation and local-speech interruption. Final targeted count: 24 tests. Exact-runtime release gate: 297 tests passed, zero failures, with integrity/CSP/security and determinism checks retained.

The final focused combined voice/model run used `search_places`, `resolve_location` and `fly_to_place`, with zero JavaScript exceptions. The first tiny-model and unconstrained-reference attempts failed safely and are retained.

Earlier development failures are retained in ignored local evidence. They included a missing worker allowlist entry, a highlight incorrectly waiting on tile loading, repeated model plans, unsupported synthesized citations, and the stdin CLI requiring explicit text-to-stdout flags. They were corrected and checked in their affected paths, not counted as successful original attempts.

## Preview build and scope

`node scripts/build-public.mjs` publishes only the existing approved static manifest and its assets. It excludes scripts, docs, tests, Beta Lab, `.core-local`, model weights, audio fixtures, databases and credentials. The audio worklet and MapLibre module worker are explicitly present in the allowlist. Public CSP retains the disclosed optional Photon host and strips the local-model endpoint.

Only the existing CORE project and static Preview are authorized. No hosted inference, speech worker, tunnel, cloud GPU, paid framework, account, subscription or production configuration was created. Public mode labels conversational AI offline, preserves indexed search/navigation/evidence and never probes the visitor's Ollama.

## Known acceptance limits

Physical microphones and real iOS Safari are untested. Desktop Chrome, mobile Chrome emulation, desktop WebKit and mobile WebKit emulation passed; WebKit emulation is not a physical Safari-device test. Native speech output depends on installed compatible local voices; unit lifecycle tests do not prove audible sound from a physical speaker. Local Whisper emits final-turn text rather than streaming partial transcripts; compatible optional browser recognition supplies live interim text. General model reasoning is not guaranteed correct, and successful actions do not validate recorded claims. Geographic caches cover only documented references; precise extra addresses require opt-in geocoding and candidate choice.

## Final protected deployment

Preview: https://core-1gu25qj0q-vincentleg.vercel.app (existing Vercel Authentication required). Runtime commit: `d282304f9b63c40d5c6b92fc0e5445296601f351`, pushed to `v9.8/core-intelligence`. The static build contains 176 files, 13.8 MB; it includes no inference server or model weights.

Authenticated desktop Chrome and mobile Chrome emulation passed against this deployed Preview: actual sourced camera movement, actual Oakland agent selection/panel, map-center visibility, contextual search, French navigation, geographic ambiguity, sources and honest offline disclosures. The desktop six-scene tour, Plans and Manifesto also passed. Both runs had zero page exceptions, horizontal overflow or attempts to contact localhost/private intelligence APIs. Anonymous Preview access returned authentication redirect 302. Temporary owner-auth browser cookies were kept outside Git and removed after validation.

Read-only hashes of production `world.html`, `src/earth/app.mjs` and `src/earth/demo-launch.js` matched their predeployment approved-baseline checks. No production promotion occurred. Final preservation audit: all 1,309 original Beta Lab/checkpoint files still matched the saved SHA-256 manifest. The 1,000 personas and existing browser results were not regenerated.

Local evidence: `.core-local/evidence/v98/verify-layout-final.log` (297 passing tests); `layout-final/results.json` (final desktop/mobile layout); `protected-final/results.json` and PNGs (deployed desktop/mobile); `webkit/results.json`; `voice-base/results.json`; `production-after.json`. Earlier failed attempts remain preserved beside successful checks. These ignored files remain in this worktree, not the static deployment or Git history.
