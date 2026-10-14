# Phase 4 audit — agent architecture, sources and security gate (baseline `fc44dce`)

Audited on 2026-10-13. Read: CLAUDE.md, PROJECT_STATE.md, ROADMAP.md, docs/CLAUDE_HANDOFF.md, docs/PHASE_3_REPORT.md, docs/CITY_INTELLIGENCE_ARCHITECTURE.md, `src/org.js`, `src/tools.js`, `src/missions.js`, `src/knowledge.js`, `src/llm.js`, `src/feeds.js`, `scripts/*`.

## 1. What was deterministic, model-driven or unavailable at the baseline

| Layer | Baseline behaviour | Kind |
| --- | --- | --- |
| 60 registered profiles | 16 executable, 29 coordination-only, 15 unavailable | Identities |
| 16 executable agents | 14 specialist tools, the city manager's planner and the governance gateway | **Deterministic** code |
| Mission orchestrator (`missions.js`) | Rule-based recruitment by tool applicability and department domains; bounded worker pool (3), timeouts, retries, cancellation | **Deterministic** |
| Tool permissions | `ORG.canUse`: tool in profile, permission rank ≥ requirement; checked before each call | **Deterministic** |
| Knowledge retrieval | TF-IDF over approved documents; not restricted per agent in practice (`knowledge.retrieve` passed `allowed: null`) | **Deterministic** |
| Mission gateway | Recomputes the mission from its origin; hashes the submitted content; verifies evidence; mirrors `issueCityDecision` | **Deterministic** |
| `src/llm.js` | Provider interface and prose validator; **no runtime installed, never called by any agent** | **Unavailable** |

**Model-driven at the baseline: nothing.** No component used a language model. The 16 "agents" are rule-based functions with identities, and they must not be described as autonomous AI.

## 2. Phase 4 boundary between model and code

| A local model (qwen3:8b via Ollama) decides | Deterministic code decides |
| --- | --- |
| Which permitted tools to call, within a budget of 5 per agent | Whether the call is permitted (profile + permission rank) |
| Arguments for search, evidence checks and scenario parameters | Argument validity: schema; parameter bounds 5–30 m, 20–80 m, 30–120 d, 7–60 d, 90–730 d |
| Wording of interpretations, hypotheses and concerns | Every number, every evidence item (register E#), every simulation result |
| Agreeing with, disputing or refining another agent | Whether a statement is accepted: citations exist, numbers appear in cited evidence, no decision language |
| Requesting missing evidence | Routing the request to an agent that owns the tool, and running it |
| — | The decision: recomputation of every tool call, re-validation of every model output; model content can only add caution |

The 16 rule-based agents keep working without a model. The 5 model-assisted specialists are reported as unavailable whenever no local model is reachable.

## 3. City sources (2026-10-13)

| Source | Finding | Action |
| --- | --- | --- |
| Legistar web API (sfgov) | Highest MatterId was last modified in 2020: the public API is frozen | **Retired** from collection; historical items kept |
| SFPUC RSS | Newest item May 2024 | Kept, polled daily, marked stale |
| SF Department of Emergency Management RSS | Empty channel | Not added |
| sf.gov news, Mayor's office | Timeouts | Not added |
| sfbos.org, SF Planning, SF Environment, SFMTA projects/news RSS | 404 | Not added |
| BART advisories | Require a key (the published demo key is still a credential) | Not added |
| 511.org | Requires registration | Not added |
| DataSF Planning project records (qvu5-m3a2) | Current, CORS; contains applicant and planner names | **Added**; personal fields never requested |
| DataSF 311 cases (vw6y-z8j6) | Current; addresses and free text | **Added** as aggregated counts only (South of Market, 7 days) |
| DataSF business registrations (g8m3-pdis) | Current; owner names | **Added** as a count only (South of Market, 30 days) |
| Rec & Parks news RSS | Current | **Added** |
| SF Fire Department RSS | Current; links use `http://` | **Added**; links upgraded to HTTPS (verified) |
| CAISO Today's Outlook | 5-minute supply by resource, MW | **Added** (Node) |
| Open-Meteo air quality (CAMS model) | CORS; CC BY 4.0 | **Added**, labelled modelled, low confidence |

## 4. Security gate review (previous phase)

In Phase 3 a pre-commit `grep` reported matches. The commit and push still ran because they were chained in the same shell command after the scan, without depending on its exit status. The matches turned out to be false positives (the public repository URL), but the process was wrong regardless.

Fix:
- `scripts/integrity-check.mjs` exits non-zero on any finding: forbidden paths, secrets, emails, phone numbers in collected data, local paths, oversized files, invalid JSON, corridor drift. It has no bypass option.
- Repository-local hooks (`git config core.hooksPath .githooks`) run it on pre-commit, and on pre-push together with the test suite.
- False positives are handled by exact, reasoned exceptions in `.integrity-allowlist.json`: six pre-existing cases (the founder's own contact line, the documented workspace path, synthetic test fixtures). Rules are never weakened.
- The gate was tested: a staged file containing a token-shaped string was refused (exit 1, no commit created).
