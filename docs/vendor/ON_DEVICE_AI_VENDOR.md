# On-device AI vendor bundle

V9.9 removed voice: the Transformers.js/ONNX Runtime Whisper bundle is no longer built or published.

## WebLLM 0.2.85 — CORE copy

- **Use:** on-device language model (Qwen3 q4f16, WebGPU) in a module worker, loaded only after the visitor consents. Never loaded on the homepage.
- **Content:** `web-llm.mjs` is `@mlc-ai/web-llm@0.2.85/lib/index.js` (Apache-2.0, `LICENSE`), self-contained ES module, with only its trailing `sourceMappingURL` comment removed.
- **SHA-256:** d93803844ef0d193059a41c18dfa2850407d4a9132199578f5808d791bf526f1.
- **Model files are not redistributed by CORE.** The visitor's browser downloads them from their official sources at pinned revisions: weights/tokenizer from Hugging Face `mlc-ai/Qwen3-*-q4f16_1-MLC` (Qwen3, Apache-2.0) and the compiled WebGPU library from `mlc-ai/binary-mlc-llm-libs` at commit `025bcaf3780fa8254f5e5efd3bfea0a5397248f4` (repository declares no licence, so CORE does not self-host it), verified with SRI before use.
