# V9.8 resume

## V9.8.1 work-in-progress checkpoint (2026-10-20) — paused by founder; NOT pushed, NOT deployed

Branch `v9.8/core-intelligence`. `aca60e9` = local Origin fix (25 tests passed). The WIP commit that follows it holds everything below. Production, Preview, CORE HQ and Beta Lab are unchanged. Nothing was pushed to GitHub or deployed to Vercel.

**Done (code written):**
- Explore no longer flies to San Francisco: `start()` in `src/earth/app.mjs` enters the Explorer (`body.ea-explore`) at the global Earth. It does not open problems, the hybrid layer, an agent or the microphone. `revealMap()` also enters the Explorer.
- `world.html`: new compact command bar markup (input, mic, send, stop, ⋯ settings, status line, settings/consent sheets, response card). CSP adds `'wasm-unsafe-eval'` and connect-src `https://huggingface.co https://*.hf.co https://raw.githubusercontent.com`.
- `core.css` rewritten: bar hidden on the homepage; in the Explorer it is a band under the nav; `#map` starts below it; overlays shift through `--navh`.
- Engine (`engine.mjs`): `routeRequest` fast router executes clear navigation/agent/evidence requests without model planning, followed by an optional synthesis-only model round. Adds timings (`routeMs`, `firstMoveMs`, `modelMs`, `totalMs`), `setModel()`, `compactInstructions()`, `synthesisInstructions()` and `brief()`. "Find an agent" selects the nearest real match to the current place.
- Tools/catalog: when an agent has no recorded work, the tool now names real agents that do. Taxonomy is broader. Product facts mention optional on-device AI.
- New modules, not yet wired into the UI: `browser-model.mjs` + `llm-worker.mjs` (WebLLM 0.2.85, Qwen3-1.7B/0.6B q4f16, pinned HF revisions + SRI, schema-constrained plans) and `browser-speech.mjs` + `speech-worker.mjs` (Transformers.js 4.3.0, Whisper base on WebGPU / tiny on WASM, pinned revisions).
- Vendored, with licences and `BUILD.md`: `assets/vendor/web-llm-0.2.85/`, `assets/vendor/transformers-4.3.0/` (includes the 27 MB ORT wasm).
- `test/core-intelligence.test.js`: 24/24 passed after the engine changes. Two model-planning tests were moved to ambiguous text, and the evidence wording was updated.

**Measured baseline** (local, `.core-local/evidence/v981/local-latency-baseline.json`): whisper.cpp ≈0.75 s; Qwen3:8B plan 19.6 s cold and 9.7 s warm; synthesis round 13 s. The 20–30 s comes from two Qwen rounds, which the fast router removes for clear commands. WebGPU with shader-f16 is available in headless Chrome on this M1 Max.

**Unfinished / not run:**
1. `src/intelligence/core/ui.mjs` still targets the OLD markup (`data-ci-example`, `data-ci-browser`, old options) and will break with the new `world.html`. Rewrite it first: compact render (answer + action chips + choices + collapsible details), states Listening/Thinking/Navigating/Speaking/Ready, ⋯ settings, consent for on-device AI (≈1 GB) and voice (Whisper ≈165 MB, or a browser speech service with disclosure), `engine.setModel(model,'browser-model')`, localhost bridge kept as is. Make `CORE_INTELLIGENCE.focus()` enter the Explorer (`CORE_EARTH.start()`) when called from the homepage.
2. `voice.mjs`: silence threshold 1300 ms → ~900 ms; wire `loadBrowserSpeech().transcribe` on the public site.
3. `scripts/intelligence-server.mjs`: add `.wasm: application/wasm` MIME and support `input.synthesis` (calls maxItems 0, `synthesisInstructions`). `scripts/public-manifest.mjs`: seed `llm-worker.mjs`, `speech-worker.mjs`, `browser-model.mjs`, `browser-speech.mjs` and the vendor files.
4. Tests to update intentionally: `test/v7.test.js` (world.html now has `'wasm-unsafe-eval'`) and `test/trust.test.js` (world connect-src list). Add router/latency unit tests.
5. Not tested at all: no browser run of the new layout, WebLLM or Whisper, desktop/mobile layout, six-scene tour or EN/FR voice fixtures (generate them with `say` + `afconvert`). Also not run: `node scripts/verify.mjs`, `docs/DATA_SOURCES.md`/`V9_8_OPEN_SOURCE.json` licence entries, the PROJECT_STATE update, push and deploy.

**Vendor files left UNTRACKED on disk** (`assets/vendor/web-llm-0.2.85/`, `assets/vendor/transformers-4.3.0/`). The pre-commit integrity hook refused them: the ORT wasm is 26.9 MB, over the 8 MB limit, and minified bundles matched the local-path pattern. The hook was not bypassed. The founder must decide: approve a documented exception, or fetch these pinned files at build time. Their rebuild steps and SHA-256 are in each folder's `BUILD.md`.

**Blockers:** free hosted inference (HF / Cloudflare / Groq) needs accounts and keys that are not available. It was not adopted, and the public AI is on-device instead. `mlc-ai/binary-mlc-llm-libs` declares no licence, so its model wasm is fetched from the pinned official commit with SRI and not self-hosted. Without WebGPU (some browsers and phones), only the fast router and indexed search are available.

**Resume:** `cd ~/core/.core-local/worktrees/v9.8 && git log --oneline -3 && node --test test/core-intelligence.test.js test/intelligence-server.test.js`. Then do steps 1–5 in order, use local browser tests (`NODE_PATH=~/core/.core-local/v8/pw/node_modules`), and only then push and deploy as authorized.

Worktree: `~/core/.core-local/worktrees/v9.8`; feature branch `v9.8/core-intelligence`, based directly on approved production hotfix `a74768ccf09aa3eccc0c2d890c963d390206b080`. Do not merge unrelated concurrent main-branch changes blindly. Production and CORE HQ remain unchanged.

Beta Lab remains paused in the original `~/core` checkout on `beta-lab/v9.7-baseline`, checkpoint `6a4a309`. Its tracked changes were committed with hooks enabled; the full 1,309-file local archive and manifest are in the original checkout's `.core-local/checkpoints/v98-before/`. Existing untracked V9.6/V9.7 deployment/production notes were preserved there and left in place. Do not rerun the panel or change its holds.

Final runtime: `d282304f9b63c40d5c6b92fc0e5445296601f351`; protected Preview: https://core-1gu25qj0q-vincentleg.vercel.app. Deployed desktop/mobile Chrome checks passed in public safe mode. Exact-runtime release gate: 297 tests. See [deployment proof and limits](V9_8_DEPLOYMENT.md).

## Launch the current local installation

```sh
cd ~/core/.core-local/worktrees/v9.8
node scripts/intelligence-server.mjs
```

Open **http://127.0.0.1:8788/**. The existing Ollama service must expose the already installed `qwen3:8b` on loopback. If the service is not running, start `ollama serve` in another terminal; do not start a second copy over an existing service. Missing model/speech components are disclosed rather than replaced with fabricated responses.

Whisper is installed under `.core-local/voice/`. Its CPU CLI and base model are detected automatically by the bridge. The optional environment names are `CORE_INTELLIGENCE_PORT`, `CORE_WHISPER_BIN`, `CORE_WHISPER_MODEL`; do not expose these endpoints or upload local files. Public domains cannot access this bridge. Text and voice share the same engine.

Try:

- “Find an agent working on urban planning near Oakland, take me to it and explain what it has actually discovered.”
- “Take me to Folsom Street in San Francisco.”
- “Show me the transportation agents here.”
- “Show me completed investigations.” / “Show me the sources.”
- “Why would I pay $12?” / “Are all 500 agents thinking right now?”
- “Emmène-moi à Oakland.”

For voice, press the microphone; local Whisper needs no cloud-processing checkbox. Stop/mute/cancel/reset controls remain visible. Only opt into browser recognition if its potential vendor-side audio processing is acceptable. Do not claim physical microphone or Safari validation based on the controlled audio fixture tests.

## Recreate optional local speech on a fresh checkout

Run manually from the V9.8 worktree. These are official free sources, not a hosted service installation. Model/source/build artifacts stay ignored and are not in a Git clone or Preview.

```sh
python3 -m venv .core-local/voice/build-tools
.core-local/voice/build-tools/bin/pip install cmake==3.31.6
git clone --depth 1 --branch v1.9.5 https://github.com/ggml-org/whisper.cpp.git .core-local/voice/whisper.cpp
git -C .core-local/voice/whisper.cpp rev-parse HEAD
.core-local/voice/build-tools/bin/cmake -S .core-local/voice/whisper.cpp -B .core-local/voice/whisper.cpp/build -DCMAKE_BUILD_TYPE=Release -DGGML_METAL=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF
.core-local/voice/build-tools/bin/cmake --build .core-local/voice/whisper.cpp/build --target whisper-cli --config Release -j 4
curl --fail --location --output .core-local/voice/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

Confirm the source commit and model hashes against [voice architecture](V9_8_VOICE_ARCHITECTURE.md) before using the downloaded weights. Do not replace or overwrite an existing installation without inspection.

## Validation commands

```sh
node --test test/core-intelligence.test.js
node scripts/build-public.mjs
NODE_PATH=../../../beta-lab/node_modules node scripts/intelligence-browser.mjs
```

Browser checks reuse the lab's existing pinned Playwright Core read-only; no lab runner is invoked. An independent checkout can install the same Playwright Core 1.64.1 in ignored local tooling instead. The smoke script uses installed Chrome. `CORE_TEST_MODEL=1` adds a genuine local Qwen workflow; `CORE_VOICE_FIXTURE=.core-local/evidence/v98/folsom.wav` adds the generated audio capture path. These take longer and should only be repeated for relevant failures/changes. The fixture was created with the Mac's installed voice, not a person's microphone. Existing browser/model failure artifacts stay preserved next to final successful evidence.

For a major integration/release, stage the runtime and run `node scripts/verify.mjs` once; security/pre-push hooks reuse the exact runtime/Node proof within 24 hours. Never skip hooks or broaden to a long persona campaign. See [deployment and acceptance status](V9_8_DEPLOYMENT.md).

## Remaining boundaries

Public visitors have no hosted general model or local Whisper. Additional geocoding is optional and bounded, not unlimited or guaranteed. Browser recognition/synthesis vary by platform. Real iOS Safari, physical microphones, broad accent/noise accuracy, full-duplex voice and sustained multi-user public inference require further validation/infrastructure. The local Qwen model sometimes repeats plans or supplies unsupported citations; the executor stops repetitions and the verifier substitutes a clearly labeled factual receipt. No customer demand, scientific validation or real-world traffic gain is established.
