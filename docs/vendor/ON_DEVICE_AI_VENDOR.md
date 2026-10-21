# Transformers.js 4.3.0 + ONNX Runtime Web — CORE bundle

- **Use:** on-device speech recognition only (Whisper), loaded on demand after the visitor consents. Never loaded on the homepage.
- **Content:** `transformers.mjs` bundles `@huggingface/transformers@4.3.0` (Apache-2.0, `LICENSE-transformers`) with `onnxruntime-web@1.31.0-dev.20260914-8d85527a0` WebGPU build (MIT, `LICENSE-onnxruntime-web`), exporting `pipeline` and `env`. `ort-wasm-simd-threaded.asyncify.{mjs,wasm}` are copied unchanged from `onnxruntime-web/dist` and self-hosted (no CDN fetch).
- **Build:** in a scratch directory with those packages installed (`npm install --ignore-scripts`): `npx esbuild@0.25.10 entry.mjs --bundle --format=esm --platform=browser --minify --legal-comments=eof --conditions=browser --main-fields=browser,module,main --alias:onnxruntime-web/webgpu=./node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs --external:sharp --external:onnxruntime-node --outfile=transformers.mjs`, where `entry.mjs` is `export { pipeline, env } from '@huggingface/transformers';`.
- **SHA-256:** `transformers.mjs` a182e5aabc71c3c7b507652c15209fd3c483b815a33d6714b841d0714ab6e241; `ort-wasm-simd-threaded.asyncify.mjs` 0966b6105cd936744498aa60df7a22cbd47af3374dbc64a9ab561c08a71e3611; `ort-wasm-simd-threaded.asyncify.wasm` 49871f5a4409519797e127440868a6d1923339d9185907f301a5b2a1d90af082.
- **WebAssembly:** requires `'wasm-unsafe-eval'` in the CSP of `world.html` only.
# WebLLM 0.2.85 — CORE copy

- **Use:** on-device language model (Qwen3 q4f16, WebGPU) in a module worker, loaded only after the visitor consents. Never loaded on the homepage.
- **Content:** `web-llm.mjs` is `@mlc-ai/web-llm@0.2.85/lib/index.js` (Apache-2.0, `LICENSE`), self-contained ES module, with only its trailing `sourceMappingURL` comment removed.
- **SHA-256:** d93803844ef0d193059a41c18dfa2850407d4a9132199578f5808d791bf526f1.
- **Model files are not redistributed by CORE.** The visitor's browser downloads them from their official sources at pinned revisions: weights/tokenizer from Hugging Face `mlc-ai/Qwen3-*-q4f16_1-MLC` (Qwen3, Apache-2.0) and the compiled WebGPU library from `mlc-ai/binary-mlc-llm-libs` at commit `025bcaf3780fa8254f5e5efd3bfea0a5397248f4` (repository declares no licence, so CORE does not self-host it), verified with SRI before use.
