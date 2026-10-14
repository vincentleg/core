# Phase 5 — agent organization and runtime

## Layers (kept separate)

| Layer | Where | What it is |
| --- | --- | --- |
| Agent profile | `src/org.js` | Identity, department, permission, supervisor, budget, tools, collection. 68 profiles |
| Specialization | `src/specializations.js` | 32 professional specializations across 17 domains. Each points to a runtime and a profile, or states its evidence gap |
| Runtime | — | `model-assisted` (local qwen3:8b chooses and words; code computes): **7**. `deterministic`: **17** executable profiles. `none`: 14 specializations, each with a stated gap |
| Knowledge | `data/knowledge/library.json` | Versioned, role-scoped collections; human-approved learning |
| Tools | `src/tools.js` | 20 deterministic tools with typed quantities. New: `sim.sidewalk-capacity`, `policy.check` |
| Evidence memory | mission register E# | Produced only by tools; a repeated computation is registered once |
| Authorization | `ORG.canUse`, gateways | Permission rank per tool; nothing authorizes real-world action |
| Evaluation | `src/evals.js`, `src/learning.js`, semantic evals | Competency, knowledge and semantic cases |

**Registered vs. executing:** of the 68 profiles, 24 can execute (17 rule-based, 7 model-assisted, the latter only with local Ollama). 29 are coordination-only and 15 are unavailable with their gap stated. No profile was added just to inflate the count.

## Routing

`SPZ.route(target)` scores executable model-assisted specializations by the mission's domains and question vocabulary. It keeps at most 3, with a relevance floor of at least half the top score. It then adds the scenario analyst for spatial or scenario questions and the mandatory reviewers (evidence review, data eligibility), and lists the relevant non-executable specializations as gaps.

## Agent capabilities

All are implemented and exercised in live recordings unless noted.

| Capability | Mechanism |
| --- | --- |
| Investigate and retrieve evidence | Routed tools plus role-scoped knowledge search |
| Identify missing information | `evidence_requests`, routed to a tool owner, otherwise left open |
| Challenge interpretations | `responses: dispute`, recorded as D# |
| Request another specialist | `specialist_requests`; budget of 1 per mission. Live: the urban planner was added on request |
| Propose testable hypotheses | `kind: hypothesis`; causal language is accepted only when hedged |
| Request simulations | `simulation_requests` and `parameter_proposals`; bounded, recomputed deterministically |
| Compare alternatives | Simulation alternatives A0–A3, scenario R0–R2 |
| Express uncertainty | Confidence field and sensitivity evidence |
| Abstain | `abstain` field, shown in the dossier |

## Execution modes

- **fast** (default): deterministic tool routing; shared context first, so the prompt prefix is reused; about 7–9 calls.
- **deep** (Phase 4): the model chooses its tools; about 23 calls.

Both feed the same validator and the same cognitive gateway. Without Ollama, model-assisted missions stop at `model-unavailable`; rule-based missions, simulations and dossiers of recorded runs keep working.
