# CORE V9.8 — CORE Intelligence

Production stays at V9.7 hotfix `a74768ccf09aa3eccc0c2d890c963d390206b080`. V9.8 is an isolated Preview feature branch. CORE HQ is untouched. Beta Lab is paused on its separate branch at `6a4a309`, with all original and ignored artifacts preserved in a verified local archive (1,309 files). No persona or browser campaign was rerun.

## Architecture

The prominent World search field and voice transcripts both call `createIntelligence().run()` in `src/intelligence/core/engine.mjs`. The same catalog, session context, schemas and executor handle both input paths. Existing MapLibre Earth, geographic agent renderer, agent panels, registered assignments, completed task records and sources are reused. `src/engine.js`, scientific calculations and gateways are unchanged.

The flow is language selection/detection → bounded context → actual local model planning or explicitly labeled indexed fallback → geographic/entity resolution → validated registered tools → actual UI execution → checked synthesis or a labeled factual tool receipt → optional local device speech.

Mode A uses the existing local Ollama **qwen3:8b**, Q4_K_M (existing model digest `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41`), through CORE's existing `src/llm.js` adapter. There is no new agent framework or cloud provider. One same-origin Node bridge binds only to `127.0.0.1`. A short structured model plan can request multiple registered tools. Eight calls and four planning rounds are the ceiling; identical repeated plans stop without replaying actions. Unknown citations, unsupported numerical/status claims and unconfirmed camera-success claims are rejected. When synthesis fails, the UI explicitly identifies the actual tool receipt; it does not present a deterministic result as model reasoning.

Mode B serves static files: geographic references, indexed registry search, real camera movement, recorded investigation lookup and product facts remain useful. **Conversational AI is offline.** A public hostname never probes the visitor's computer or exposes the local bridge. No public Qwen3 or Whisper service was deployed.

## Geographic and agent scope

The local geographic index reuses the sixteen Census municipal reference points and the mapped DataSF Folsom/Howard corridor. Two OSM landmark references come from the official Photon service; they are derived reference points, not surveyed bridge centroids. Bay Bridge resolves to the returned West Span and is named that way. An optional, disclosed Photon lookup handles additional streets, addresses, neighborhoods, intersections, multilingual names and typos to the extent the upstream service supports them. It is not an unlimited global geocoder.

Only submitted queries are sent externally, after the checkbox consent. Five uncached queries/minute, at least 1.2 seconds apart, one request at a time, seven-second timeout and 64-entry session cache. Multiple candidates or fuzzy local matches require explicit selection. Inconsistent Folsom/Golden Gate or Folsom/Oakland references do not move the camera. An unknown street in a known city cannot silently become navigation to that city's center.

The canonical `data/intelligence/work.json` registry has exactly 500 unique identities. Search includes real role, domain, assignment, mission, allowed tools, actual task claims and source/tool history. Model interpretation supplies flexible semantic queries; deterministic matching and ranking operate on those real records. This is not an embedding model or a claim that every possible paraphrase is understood. Results distinguish idle/registered identities, recorded work and offline workers. No identity is inferred to be executing from an animation.

Selecting a returned agent navigates to its actual rendered walker position when available, otherwise its declared assignment, highlights it and opens the existing agent information panel. Nearby/nearest matching uses geographic distance within matching domain/city constraints. It does not invent availability, credentials or discoveries. An Oakland urban-planning identity can be found, but the published snapshot supplies no completed investigation for that identity; CORE must disclose that gap. SF results are not transferred to Oakland or San Jose.

## Context, grounding and privacy

Session memory keeps at most ten user/assistant messages and 64 outcome events. It tracks resolved location, selected agent, ranked results and evidence. Reset and cancellation clear/abort the active interaction; no conversation is written to browser storage or a database. The bridge does not log prompts or audio. Controlled test artifacts contain only explicit synthetic/public fixtures.

Available product facts are indexed separately from recorded model claims. Plus at $12 is proposed; billing, Plus cloud workspaces and cross-device continuity are not shipped. Professional tiers remain hypotheses, 500 identities are not 500 running models, and exploratory traffic calculations are not measured improvements. Known flagged scope claims in the original investigation are excluded from the retrieved claims.

The model can answer unrelated educational questions from its own knowledge, labeled as model output. No web-search or live-news tool was added, and no current real-time knowledge is promised. Citations and automated checks reduce errors; they are not scientific or human validation.

## Security and performance

Closed per-tool schemas, verified returned IDs, finite geographic bounds, coordinate/provenance matching, camera arrival checks, bounded bodies/timeouts, per-process rate/concurrency limits, same-origin checks, host validation and an ephemeral CSRF token surround inference. Retrieved documents never grant permissions. No tools run arbitrary code, shell commands, purchases, publication, infrastructure changes or paid APIs. The local Whisper subprocess has a fixed binary, model and argument list, no shell and no user-supplied path.

Voice code and the audio worklet load on demand. No browser model downloads occur on initial load. The catalog reuses existing public artifacts; 500-item indexed matching stays in the browser while model/STT work runs outside the render thread. Model output is buffered until validated; token streaming is not implemented for the structured planning path.

See [voice architecture](V9_8_VOICE_ARCHITECTURE.md), [tool registry](V9_8_TOOL_REGISTRY.md), [deployment and validation](V9_8_DEPLOYMENT.md) and [resume instructions](V9_8_RESUME.md).
