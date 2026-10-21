# V9.8 resume

## V9.8.1 — released (2026-10-20)

Live at https://creationofrebornearth.com (`dpl_Bvw6QKRGg18SLwwrnQ5LAHiuBWzZ`, runtime `a89f60d`, branch `v9.8/core-intelligence` pushed). Release record, measured latency, acceptance and limits: [V9_8_1_RELEASE.md](V9_8_1_RELEASE.md).

Resume or extend:
```sh
cd ~/core/.core-local/worktrees/v9.8
node --test test/core-intelligence.test.js test/intelligence-server.test.js
node scripts/build-public.mjs            # runs scripts/vendor-ai.mjs first (pinned, checksum-verified bundles)
(cd public && python3 -m http.server 8790 --bind 127.0.0.1)   # then CORE_TEST_URL=http://127.0.0.1:8790/world.html
NODE_PATH=~/core/.core-local/v8/pw/node_modules CORE_TEST_PART=layout|text|ai|model|voice|deny node scripts/intelligence-public-browser.mjs
node scripts/verify.mjs                  # release gate, then: cd public && vercel deploy --prod --yes (founder authorization)
```
`ai` and `model` need `CORE_TEST_PROFILE` (persistent profile keeps the ≈1 GB model cached); `voice` needs `CORE_VOICE_FIXTURE` (`say` + `afconvert` WAV, synthetic, never a physical-microphone claim). After a deploy, clear the profile's `Default/Cache` (production sends `max-age=300` for `/src`).

Next candidates (not started): physical Safari/iOS/Android and microphone validation; better small-model relational planning (or Qwen3-4B on capable desktops); hosted inference only if the founder creates a free account and key server-side.

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
