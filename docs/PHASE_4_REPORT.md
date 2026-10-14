# Phase 4 — Model-assisted agents and living City Intelligence: report

Status: **COMPLETE on 2026-10-13** as a working vertical slice, with the limitations below. Baseline `fc44dce`. Phase 5 has **not** started. Audit: [PHASE_4_AUDIT.md](PHASE_4_AUDIT.md).

## Facts requested by the founder

| Item | Actual value |
| --- | --- |
| LLM-powered agents | **5** model-assisted specialists, executed for real with the local model: urban planning, environment, energy and infrastructure, scenarios, independent evidence review. They use the model whenever it is reachable and are reported unavailable otherwise. **16** rule-based agents remain executable without any model. |
| Model used | **qwen3:8b** (Qwen3, Apache-2.0, 8.2B parameters, Q4_K_M, 5.2 GB) on **Ollama v0.40.3** (MIT). User-local binary; SHA-256 verified against GitHub's published digest; Ollama Apple signature; listens on 127.0.0.1 only. Installed and downloaded with the founder's approval. "Thinking" is disabled. No paid API; the adapter refuses non-loopback endpoints. |
| Real tool calls (recorded end-to-end mission) | **27** tool calls across 11 tools (9 served from cache, 0 denied), **23** model calls, **43** evidence items, **43** validated model statements, **13** model outputs rejected by the validator |
| Knowledge sources | **8** sources and **22** approved, versioned documents in role-specific collections. 4 documents were added by the learning workflow and approved by the founder (`human:founder`): 1 learned from DataSF's metadata API, 3 curated. |
| City sources | **17** registered (16 active, Legistar retired): 10 DataSF / USGS / NWS / Open-Meteo, CORS-capable, plus 6 Node-only (RSS, CAISO). **314** items indexed. |
| Scheduled refresh | GitHub Actions cron `.github/workflows/city-feed.yml`, every 3 h plus manual dispatch, independent of any browser. Verification status: **see "Scheduler verification" below.** |
| Resource usage (live mission) | **18.1 min** wall time. 70,415 input + 9,732 output tokens, **13.2 tokens/s** generation. Model processes peaked at **11.0 GB** resident memory, mean 96 % / peak 255 % CPU (inference mostly on the Metal GPU). Node orchestrator: 158 MB, 5.7 s of CPU. |

## What was built

- **Model adapter** (`src/llm.js`):
  - Ollama or any OpenAI-compatible local server; loopback only;
  - bounded context (26,000 characters, tool results truncated then elided oldest-first), bounded output (600 tokens per tool turn, 1,500 per report), 180 s timeout, cancellation;
  - tool calling; JSON-schema structured outputs; typed errors (`unavailable`, `timeout`, `model-missing`, `invalid-output`, `not-local`).
- **Model-assisted collaboration** (`src/cognitive.js`). Twelve stages: received → model check → classification → geolocation → selection → investigation → deliberation → revision → scenario → verification → brief → gateway.
  - **The model:** chooses which permitted tools to call (at most 5 per agent), sets arguments only where the tool declares them (search query, evidence ids, scenario parameters), and writes structured statements, responses (agree, dispute, refine), evidence requests and parameter proposals.
  - **Deterministic code:** executes the tools, checks permissions and argument schemas, builds the evidence register E#, validates each model output, routes evidence requests to an agent that owns the tool, and recomputes scenario parameters with the validated models. The validator requires existing citations, accepts no number absent from the cited evidence and no decision language, and rejects self-responses and echo responses.
  - **Gateway** `issueCognitiveDecision`: replays every tool call and compares the evidence; re-validates every retained model output; re-checks permissions; derives the outcome from the deterministic city gateway. Open requests, unresolved disputes, reviewer reservations or knowledge gaps produce **PREUVES SUPPLÉMENTAIRES REQUISES**. **Model content can only add caution.** `authorizes: false`.
- **Knowledge and learning** (`src/knowledge.js`, `src/learning.js`, `scripts/learn.mjs`):
  - role-specific collections (profile list plus human-approved additions); retrieval with citation `id@vN`, source, licence, retrieval date and freshness; bilingual query expansion (code only);
  - every change keeps the previous version in `history`; rollback is human-only and creates a new version;
  - learning cycle: gap (coverage: a tool's data source is undocumented in the agent's collection; retrieval: a search returned nothing) → authorized source (DataSF metadata API only) → validation (authorized host, licence, producer, date, relevance, novelty, content) → proposal → evaluation on a staged copy, before and after → human approval for important changes → promotion. Only a freshness refresh with identical content can be auto-promoted, and it is still versioned.
  - Agents cannot approve, edit safety-policy documents, or change permissions or tools.
- **Living City Intelligence** (`src/feeds.js`):
  - 7 new sources: Planning project records, aggregated 311, business-registration count, Rec & Parks, SF Fire, CAISO, Open-Meteo;
  - Legistar retired (its API is frozen at 2020); SFPUC polled daily (stale since 2024);
  - kinds now separate statistics, predictions, agency announcements, commentary, opinion and allegations from observations and decisions;
  - every item carries a confidence level and its limitation;
  - personal fields are never requested; official `http://` links are upgraded to HTTPS after checking.
- **Scheduled refresh:** `.github/workflows/city-feed.yml`, with actions pinned by SHA (checkout v7.0.1, setup-node v7.1.0). It collects, re-records deterministic missions when content changed, runs the tests, runs the integrity gate and commits data only. No model runs in CI.
- **Security gate:** `scripts/integrity-check.mjs` plus `.githooks/` (pre-commit; pre-push together with the tests). No bypass; exceptions store a reason and a SHA-256 of the exact value, never the value itself. The Phase 3 chained-command error is analysed in the audit. The gate **blocked the first Phase 4 commit attempt**: the allowlist itself repeated the excepted values. It was fixed by storing hashes, not by weakening a rule.
- **Interface:**
  - **Agents:** model availability (model, parameters, quantization), model-assisted badges, role-scoped collections with provenance, knowledge evaluation, learning history, collaboration counts.
  - **Missions:** a "collaboration assistée par modèle" tab for live runs (when the model is reachable) and recorded runs. Each run shows the stage track, every tool call, the evidence register, validated model interpretations (labelled), exchanges, evidence requests, recomputed parameters, rejected outputs with reasons, the Decision Brief, gateway checks and measured usage.
  - **City Intelligence:** kinds, confidence and limits, retired sources, scheduler status with run link.
  - **Data & Evidence:** learning proposals with before/after scores and reviewers.
  - **Decisions:** a human review note stored only in the browser, never transmitted.
  - No decorative agent animation.

## End-to-end example (real event, real model)

1. **New verified event.** DataSF street-use permit **26EXC-05114**, an excavation on Howard St between 8th and 9th, approved 2026-10-07, first seen by CORE 2026-10-13. Classification: approved decision, infrastructure, official source.
2. **Geographic association.** `graph.link` (deterministic) links it to Howard 8th → 9th (CNN 7051000, observed by CNN field; the point is 17 m from the axis).
3. **Agent selection.** Urban planning, environment, energy and infrastructure, scenarios, independent reviewer. Relevant unavailable profiles are listed (geotechnical, grid, water, transit, traffic, biodiversity, air measurement…).
4. **Evidence retrieval.** The model chose 27 tool calls: works windows, frontage permits, Planning records, sidewalks, trees, air quality, weather alerts, telecom works, knowledge search, scenario, evidence check.
5. **Cross-domain investigation and deliberation.** Requests went to tool owners: 8 fulfilled; 11 had no CORE tool able to answer, mostly asking for the excavation's *impact*, which CORE cannot model. The reviewer recorded a real disagreement: the planner called the activity "moderate", the energy analyst, citing E16, called it "high".
6. **Scenario evaluation.** The analyst first proposed out-of-domain parameters (frontage 12 m, horizon 365 d, deferral 180 d). Each was refused by the tool, and it corrected itself until a valid set (frontage 20 m, horizon 120 d, deferral 60 d, tree radius 17 m) was **recomputed by the deterministic models**. No model-produced number entered the brief.
7. **Independent verification.** Every evidence reference resolved; all 27 tool calls replayed identically; all retained model outputs re-validated.
8. **Decision Brief.** Validated interpretations (labelled as model output), disputes, open requests, missing data, sensitivities, source dates, and 13 rejected model outputs.
9. **Human review.** **PREUVES SUPPLÉMENTAIRES REQUISES**: 11 open evidence requests, 2 unresolved disputes, 14 reviewer reservations and 7 knowledge gaps (since deduplicated per agent and query). This is a request for information, not a fabricated conclusion.

Recorded at `data/missions/cognitive/cognitive-13f3c2ad6fb1.json`; viewable in Missions → Collaboration.

## Observed model quality (honest)

- **Useful:** it chose relevant tools for each role, cited evidence, detected a genuine contradiction between specialists, asked for evidence CORE does not have, and self-corrected parameters from tool errors.
- **Weaknesses seen:**
  - A semantic misreading the validator cannot catch: "a depth of 17 m from the axis" for a distance. The number is sourced, the meaning is wrong. The tool wording was made unambiguous; human review remains necessary.
  - Speculative wording ("works may influence local pollution", citing only the modelled air-quality value). It is labelled a concern, but it is not evidence of an effect.
  - Responses addressed to itself and verbatim echoes (rejected: 9 + 2).
  - A permit identifier used without citing the evidence that contains it (rejected: 2).
  - Revisions rarely used the `revises` field.
  - One structured report reached the output limit (1,500 tokens) and was truncated.
- **The validator** guarantees provenance (citations exist, numbers come from cited evidence, no decision language). It does **not** guarantee semantic correctness; that is the reviewer's and the human's role.

## Tests

| Suite | Kind | Result |
| --- | --- | --- |
| `node --test test/*.test.js` | Unit and regression; **mock model** (`test/helpers/mock-ollama.js`, labelled) | **73/73** |
| `node --test test/live/*.test.js` | **Live model** (qwen3:8b): real tool calling, real structured output, a full real multi-agent mission, real prompt injection in event text | **5/5 passed** (4 live subtests, 31.8 min, log kept locally in ignored `test-results/phase4/`) |

**Phase 4 unit coverage:**
- model adapter: local-only, unavailable, missing model, bounded context, invalid structured output;
- registry; tool permission boundaries (denied tool, out-of-domain parameters);
- collaboration (dispute, routed requests, revision, recomputed scenario parameters);
- prompt injection with a model that obeys it (forbidden tool, decision language, invented numbers, uncited claims — all blocked);
- gateway tampering (evidence, numbers, agent swap);
- model content only adds caution; model unavailable;
- role-scoped retrieval and citations; versioning and human-only rollback;
- learning cycle with before/after evaluation;
- new sources, retired source, statement kinds, privacy, HTTPS upgrade;
- the security gate; validator details found with the real model.

**Browser audit** ([PHASE_4_BROWSER_RESULTS.json](PHASE_4_BROWSER_RESULTS.json)):

| Browser | Result |
| --- | --- |
| Chrome 155.0.8059.40 headless (CDP) | **101/101** (93 earlier checks + 8 Phase 4), 0 uncaught errors; negative paths 12/12 |
| Firefox 122.0 headless (BiDi) | **Not re-run in Phase 4**: Firefox hung at startup in this session (99 % CPU for 3 min, empty profile, no BiDi listener), both inside and outside the command sandbox. Not fixed, because that would mean changing machine settings. Last Firefox result: 93/93 in Phase 3, earlier the same day. |
| Safari | Not performed (remote automation disabled) |

## Scheduler verification

The workflow is deployed with the Phase 4 commit. The first manually dispatched run and its outcome are recorded in the follow-up documentation commit; until then the scheduler counts as **deployed, not yet verified**.

## Resource and scale controls

- **Bounds:** only the agents selected for a mission run. The local model executes one agent at a time; the deterministic pool runs at most 3 tasks. Budgets: 5 tool calls and 4 tool turns per agent, 32 model calls and 30 min per mission.
- **Caching and cancellation:** tool results are cached per mission (9 of 27 hits in the live run). Cancellation aborts in-flight model requests.
- **Without a model:** the system stays useful; the 16 rule-based agents, deterministic missions (about 0.3 s) and all gateways work. The 5 model-assisted agents show as unavailable, and no canned answer is ever produced.
- **Cost:** a model-assisted mission is slow (about 18 min on an M1 Max) because generation runs at 13 tokens/s under JSON-grammar decoding, with prompts of 1,000–5,000 tokens.

## Limitations and deferred items

- **Semantic correctness of model text** is not machine-verified; human review is required. No calibrated impact model: requests for "impact" evidence stay open.
- **Speed and placement:** model-assisted missions are slow and run only where the model is installed (the founder's Mac). The public site shows recorded runs and runs live only on a machine with Ollama.
- **Licensed news:** none. Board of Supervisors legislation is unavailable (frozen API); Muni/BART alerts need keys; there are no incident-level safety data (privacy).
- **Browser coverage:** Firefox was not re-run in Phase 4 (startup hang); Safari, iOS and physical devices untested.
- **Scheduler timing:** GitHub cron is best-effort and pauses after 60 days of repository inactivity.
- **Not started:** Phase 5, on explicit request only.
