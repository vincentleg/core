# V9.8 voice architecture and free component selection

The production website does not acquire local inference merely by being deployed on Vercel. Full local voice uses the loopback developer bridge; the protected static Preview uses honest public-safe mode.

## Selected implementation

Microphone activation is an explicit button/voice-session action. Local capture uses getUserMedia, an AudioWorklet (ScriptProcessor compatibility fallback), bounded in-memory samples, RMS silence detection/end of turn and conversion to mono PCM16 at 16 kHz. Capture is limited to approximately thirty seconds, with a ten-second no-speech timeout. The browser shows connecting, listening, transcribing, thinking, executing, speaking, muted, offline and error states. Stop, reset, visibility change and cancellation terminate capture. Audio is not retained by CORE.

The bridge pipes WAV bytes to **whisper.cpp v1.9.5**, commit `d1be6fde11ac6e0407606b4e42fe72d34add8037`, CPU-only, using multilingual **base**. The official model SHA-1 matches `465707469ff3a37a2b9b8d8f89f2f99de7299dac`; downloaded SHA-256 is `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe`. Model and source licenses are MIT. The binary reads standard input and emits text to standard output (`-otxt -of -`); no raw microphone file is created. Whisper automatically detects input language, and the shared text engine resolves English/French response language. The earlier tiny model misheard Folsom during combined testing and remains preserved locally. Base uses a bounded vocabulary hint containing verified public place names, not a scripted transcript. This model can still misrecognize proper names; ambiguity and tool validation still apply.

Transcription feeds the identical engine used by typing. Local Whisper returns a final transcript after the utterance; live interim transcription is available only with compatible browser recognition. After a response, an explicitly active voice conversation can listen for another turn. Pressing the microphone interrupts speech. This is turn-based voice, not full-duplex acoustic echo cancellation or guaranteed natural barge-in on every device.

Speech output uses browser `speechSynthesis`, choosing only an installed `SpeechSynthesisVoice.localService` voice matching English/French. There is no bundled voice model or paid TTS API. If no compatible local voice exists, the text response stays available; spoken output is not claimed. An installed voice and browser support are prerequisites, not universal guarantees.

A separate explicit checkbox consents to browser recognition. `SpeechRecognition`/`webkitSpeechRecognition` can send audio to the browser vendor. Without that consent, an on-device `processLocally` implementation is used only where supported, or local Whisper is required. No hidden listening or microphone start occurs at page load. Browser-provided recognition is not universally local, free of vendor constraints, or supported by every browser.

## Candidate assessment

Official repositories and licenses were checked 2026-10-20; machine-readable metadata is [V9_8_OPEN_SOURCE.json](V9_8_OPEN_SOURCE.json). Unselected frameworks were documentation-assessed, not installed or runtime-certified. Dependency and model licenses must be checked independently if integrating them later.

| Candidate | License / dependencies | Decision |
| --- | --- | --- |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | MIT; C/C++, CMake, platform CPU backend; converted Whisper weights MIT | Selected, compiled locally with Apple Accelerate; CMake 3.31.6 isolated build tool, no browser model download |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT wrapper; Python, CTranslate2, PyAV/tokenizer/model dependencies | No second STT runtime needed for this Node/browser project |
| [rhasspy/piper](https://github.com/rhasspy/piper) | Archived MIT repository; development moved to [OHF Piper GPL](https://github.com/OHF-Voice/piper1-gpl); individual voice licenses vary | Not installed; avoid adding a voice runtime/model when an installed browser voice suffices |
| [Kokoro](https://github.com/hexgrad/kokoro) | Apache-2.0 code/weights; Python/PyTorch, language frontend and eSpeak-ng dependencies | Not installed; optional later after per-component/voice review, not needed for present turn-based output |
| [Pipecat](https://github.com/pipecat-ai/pipecat) | BSD-2-Clause; Python transports plus chosen STT/TTS/LLM services | Not installed; a separate real-time media framework adds no necessary capability to this small bridge |
| [LiveKit Agents](https://github.com/livekit/agents) | Apache-2.0 framework; RTC/server stack, provider plugins; turn models have separate terms | Not installed; no hosted LiveKit service, account or paid transport |
| [Photon](https://github.com/komoot/photon) | Apache-2.0 server; Java/OpenSearch and OSM ODbL data; official demo permits reasonable bounded usage without guarantees | Optional API adapter plus tiny verified cache; no server framework installed |
| [Pelias](https://github.com/pelias/pelias) | MIT components; Elasticsearch, multiple importers/datasets with independent terms | Not installed; disproportionate infrastructure for current coverage |
| [Ollama](https://github.com/ollama/ollama) | MIT runtime; model weights separately licensed | Existing local runtime reused through CORE's adapter; Qwen3 Apache-2.0, no cloud API |
| [LangGraph](https://github.com/langchain-ai/langgraph) | MIT; existing JS research worker already pinned separately | Existing recorded research retained; no extra LangGraph graph/checkpointer needed for ephemeral UI tool turns |

No new npm/runtime framework dependencies were added. Whisper/CMake/model artifacts are ignored local files and are not shipped in Preview.

## Availability choices

| Mode | Availability, resources and cost | Status |
| --- | --- | --- |
| Local Node + Ollama + Whisper | Existing Mac, one active request, model/STT latency and local RAM/CPU requirements; no provider charges | Implemented local mode; no tunnel, external binding or remote public access |
| Static Vercel Preview | Existing project/free allocation; no GPU or local-model process supplied by static hosting | Public-safe indexed search/navigation; model offline |
| Browser model inference | [WebGPU inference is possible](https://huggingface.co/docs/transformers.js/guides/webgpu), but model downloads, RAM, mobile support and quality require separate validation | Assessed, not installed or claimed to work |
| Secure self-hosting | Requires approved hardware, HTTPS, authentication, quotas, abuse protection, availability and operating-cost ownership | No infrastructure provisioned; the developer's Mac is not exposed |
| Free hosted model demo | Free tiers can sleep, throttle and impose quotas; no unlimited inference assumption | No external inference service approved or used |

Browser speech references: [recognition support and server processing](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [experimental local processing](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally), [local synthesis voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService). Vercel resource limits are [documented separately](https://vercel.com/docs/limits); static deployment does not supply Ollama.
