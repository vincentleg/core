# V9.8.1 release: Explorer, compact intelligence, fast router, public on-device AI and voice

**Production:** https://creationofrebornearth.com, deployment `dpl_Bvw6QKRGg18SLwwrnQ5LAHiuBWzZ` (existing Vercel project `core`), runtime commit `a89f60d`, pushed to `v9.8/core-intelligence`. CORE HQ and Beta Lab were not changed. No paid service, account, API key or inference server was added.

## What changed
- **Homepage:** unchanged, Earth-first. The intelligence bar is hidden there; the header search shortcut enters the Explorer.
- **Explore:** opens the global Earth (zoom ≈1.65; 1.05 on phones). It no longer flies to San Francisco and opens no problems, agent, investigation or microphone. A compact command bar (input, microphone, send, ⋯ settings, one status line) sits under the navigation. The map viewport starts below the bar; all overlays shift with it.
- **Answers:** a short answer, action chips (for example "✓ Moved to Folsom Street"), concise agent and place choices, and a collapsed "Details" section with engine, timings, evidence, sources and tool outcomes. The tool outcome appears immediately; a model's wording replaces it only if it passes the checks.
- **Fast router** (`routeRequest`): clear navigation, agent and evidence requests run through the validated tools without waiting for a model.
  - Models are used for ambiguous or relational requests and to reword returned agent or problem evidence.
  - Product and pricing facts are always shown verbatim.
  - A summary of recorded claims always carries the recorded "exploratory, uncalibrated" limitation.
- **Public AI:** Qwen3-1.7B q4f16 (Qwen3-0.6B on phones and small GPUs), running in the browser through WebLLM 0.2.85 on WebGPU in a module worker. It loads only after explicit consent (≈984 MB, or 352 MB for 0.6B).
  - Model files come from their official sources at pinned revisions, with SRI on config, tokenizer and library.
  - A whitespace-free EBNF grammar is generated from CORE's tool schemas.
  - The model's tool set excludes coordinate tools.
  - A model flight must follow a place search in the same request.
- **Public voice:** on-device Whisper base (fp16) through Transformers.js 4.3.0 on WebGPU, with Whisper tiny on WebAssembly as a fallback. It loads after consent (≈146 MB). Audio stays in the browser and is never stored. The browser speech service remains optional, with a disclosure. Silence cutoff: 850 ms.
- **Local:** the Qwen3:8B and whisper.cpp loopback bridge is unchanged, plus a synthesis-only mode. Origin, Host, token and DNS-rebinding protections are unchanged (25 server tests).
- **Supply chain:** the third-party bundles are too large for the repository policy (27 MB wasm), so they are not committed. `scripts/vendor-ai.mjs` rebuilds them from `scripts/vendor-ai/package-lock.json` and checks their SHA-256 before every public build. On `world.html` only, the CSP adds `'wasm-unsafe-eval'` plus Hugging Face and the raw GitHub host.

## Measured latency (Apple M1 Max, headless Chrome 155, real WebGPU; evidence in ignored `.core-local/evidence/v981/`)
| Path | Measured |
|---|---|
| Before (local Qwen3:8B plan + synthesis) | 9.7–19.6 s per plan round + 13 s synthesis round |
| Text command → first camera movement (fast router; local, public and production) | 0–8 ms; flight completes ≈1.4 s |
| Spoken command: speech end → first camera movement (production, on-device Whisper) | 391–413 ms |
| Mic press → first camera movement (includes ≈2–3 s of speech in the fixture) | 3.1–4.4 s |
| On-device Qwen3-1.7B load (production) | cold 168 s (download) · warm 2.7–2.8 s |
| On-device Whisper load (production) | cold 12.6–13.0 s · warm 1.7–2.1 s |
| Model-planned request (production) | first move 3.2 s (bike lanes, Berkeley) · 6.0 s (city across the bay → Oakland) |
| Evidence summary after fast tools (production) | camera at 3 ms; model answer at 6.7–6.9 s |
| Local Qwen3:8B summary after fast tools | camera at ms; answer 11.9 s |

## Production acceptance (fresh browser profiles, no localhost requests)
- Layout passed, desktop 1440×900 and mobile 390×844:
  - The homepage has no intelligence panel, and Explore opens the global Earth.
  - The desktop bar is 850–1000 px wide; the bar is ≤80 px high on both.
  - The map starts below the bar, and the agent panel never covers it.
  - No horizontal overflow; the six-scene tour works; plans, manifesto and solutions pages are reachable.
- Text, EN/FR: Folsom Street, an Oakland urban-planning agent, "What has this agent discovered?" (honest no-record answer plus real alternatives), "Emmène-moi à San Francisco", an energy agent in Oakland, "Trouve-moi un agent d'urbanisme", Golden Gate Bridge.
- On-device model, three fresh-context requests passed with real tool outcomes:
  - bike lanes in Berkeley → model-planned agent search and selection;
  - across the bay → Oakland;
  - recorded mobility agent → evidence summary with limitation.
- Voice: synthetic `say` audio through Chrome's fake microphone into the real getUserMedia/AudioWorklet path, then on-device Whisper. EN Folsom passed in cold run 2 and warm. FR San Francisco, the spoken agent search and the spoken follow-up passed. Microphone denial is visible, nothing listens, and typing still works.
- **Failures recorded:**
  - Cold voice run 1 heard "Ick me to fall some street"; it was refused, and misheard names are now offered as a choice.
  - Before the guards, the 1.7B model:
    - flew to a stale location;
    - proposed invented coordinates (refused);
    - attributed other agents' work to an idle agent.
  - In one session context the model still could not resolve "across the bay" and asked for the place by name, moving nothing.
- Release gate: `node scripts/verify.mjs`, 307/307.

## Limits
- On-device AI requires WebGPU with 16-bit shaders (recent Chrome/Edge desktop, Safari 26+, some Android); elsewhere fast search and navigation still work.
- Downloads are large on first use.
- A 1.7B model can misinterpret relational requests; CORE refuses wrong actions and asks for a name.
- Tested: Chrome on macOS only. Not tested: Safari, iOS and Android devices, physical microphones, noise and accents, and multi-user load.
- Hosted free inference (Hugging Face, Cloudflare Workers AI, Groq) requires accounts and keys that were not available, and was not adopted.
- 500 identities are registered assignments, not running models; the recorded claims are exploratory and uncalibrated.
