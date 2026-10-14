# CORE city intelligence architecture (Phase 2D)

CORE is meant to grow into an explorable, evidence-grounded digital counterpart of Earth. This document describes the part that runs today in San Francisco and how new domains plug in. It is all static and deterministic, with no paid service, and nothing acts on the physical world.

```mermaid
flowchart LR
  Reg[src/domains.js: domain and dataset registry] --> Ad[scripts/sf-snapshot.mjs + city-snapshot.mjs: bounded adapters]
  Ad --> Snap[data/sf/*.geojson + manifest.json: SHA-256, URLs, timestamps]
  Snap --> Ctx[coord.buildContext: verified context]
  Ctx --> Graph[src/graph.js: knowledge graph]
  Ctx --> Coord[src/coord.js: street-work coordination]
  Graph --> City[src/city-agents.js: 8-role investigation]
  Sim[src/simulation.js: model registry] --> City
  Coord --> Sim
  City --> Gate[issueCityDecision: fail-closed gateway]
  City --> UI[src/city-view.js: themes, investigation, brief, demo]
  Gate --> UI
```

## Layers

1. **Domain registry** (`src/domains.js`). Seven domains, each with a status:

   | Domain | Status |
   | --- | --- |
   | Infrastructure | working |
   | Buildings and housing | working |
   | Nature and environment | partial |
   | Energy | partial |
   | Public space and land | partial |
   | Society and communities | candidate |
   | Events and decisions | partial |

   Each dataset spec declares: id, domain(s), provider, update frequency, kind (observed, administrative, self-reported, study), geometry, temporal field, dedupe key, schema and normalizer.

   To add a domain, append a `DOMAINS` entry and dataset specs; the UI lists it automatically. The domain stays disabled until its status is `working` or `partial` **and** its map layers exist.
2. **Adapters.** Bounded SoQL queries (corridor CNNs, bounding boxes, recency), schema validation, deduplication, PII removal, a frontage-distance post-filter, merged manifest entries, and change detection against the previous checksum. On failure, the previous snapshot is kept.
3. **Knowledge graph** (`src/graph.js`):
   - **Entities:** StreetSegment, Location, Permit (street use and building), Organization, Tree, Event (closure, removal notice), Observation (moratorium), InfrastructureAsset (sidewalk), Parcel, Building (energy), Park, Hypothesis.
   - **Relationships:** each carries `basis` ∈ {observed, derived, rule, hypothesis} and a required `why`:
     - *Observed:* CNN fields, permit holders, tree IDs on removal notices, parcels.
     - *Derived:* distances, explicit `distance_m`.
     - *Rule:* temporal overlaps, recency.
     - *Hypothesis:* `AFFECTS` is hypothesis-only, which the code enforces.
   - **Contradictions:** recorded with `CONTRADICTED_BY`.
   - **Size:** about 2,700 entities and 4,400 relations for the corridor, rebuilt deterministically in the browser in under 100 ms.
4. **Simulation interface** (`src/simulation.js`). Each model has a version, domain, kind, calibration flag, input digest, uncertainty text and note.

   | Model | Status |
   | --- | --- |
   | `coordination-schedule-v1` | Working |
   | `tree-proximity-exposure-v1` | Working (a proximity indicator, not a damage model) |
   | `evidence-completeness-v1` | Working |
   | `core-point-queue-v0` | Reference only (synthetic) |
   | `energy-model` | Explicitly unavailable |
   | `ecology-model` | Explicitly unavailable |
   | `traffic-model-real` | Explicitly unavailable |

   Future engines (SUMO, energy, water, land use) register here with the same result contract.
5. **Orchestration** (`src/city-agents.js`). A generator yields one event per executed operation, across eight logical roles:

   | Role | What it does |
   | --- | --- |
   | Discovery | Builds the graph and computes domain signals per segment |
   | Evidence | Checks checksums, records, dates and geometry |
   | Cross-domain reasoning | Produces a testable hypothesis with claims C1–C3, NEAR relations and contradictions |
   | Scenario generation | Builds R0 reference, R1 coordinated intervention, R2 defer-and-investigate |
   | Evaluation | Runs the models |
   | Adversarial review | Applies seven perturbations P1–P7 and lists missing evidence |
   | Synthesis | Writes the Decision Brief and the ranking with reasons |
   | Human decision gateway | Applies the fail-closed rules below |

   **Model providers:** `registerProvider` accepts future providers that propose; their output is never trusted without recomputation. None is registered.
6. **Gateway** (`issueCityDecision`). It checks, in order:
   1. contract (no unknown fields);
   2. parameters;
   3. snapshot checksums verified and identical;
   4. location;
   5. dates;
   6. independent recomputation of discovery, evidence, hypothesis, domains, evaluation, alternatives, adversarial review, ranking and recommendation;
   7. constraints;
   8. essential evidence for the recommended action;
   9. sensitivity rule.

   **Outcome:**
   - `ÉLIGIBLE À LA REVUE HUMAINE` — eligible for human review.
   - `PREUVES SUPPLÉMENTAIRES REQUISES` — more evidence required.
   - `REJETÉ` — rejected.
   - `authorizes` is always `false`.

   **Sensitivity rule:**
   - *Intervention (R1):* must survive every perturbation.
   - *Investigation (R2):* must survive a majority, with the sensitivity disclosed.
7. **UI.**
   - **Explore:** globe → San Francisco.
   - **Understand:** a Themes panel listing every domain with its status, with clustered building permits and a period filter.
   - **Discover and investigate:** an Investigation tab with live, paused and replayed runs, parameter sliders that recompute, and map synchronisation (block, works, trees, tree↔permit links, building permits, energy buildings).
   - **Decide:** the Decision Brief, gateway checks and JSON export.
   - **Guided demo:** nine user-paced steps that call the real functions.

## Reproducibility

The same snapshot and parameters give the same events and fingerprint (FNV-1a, non-cryptographic) in Node, Chrome and Firefox; this is audited. Snapshot authenticity rests on the SHA-256 manifest of public data.

## What this architecture does not claim

- No calibrated physical, energy, ecological or traffic model.
- No causal inference from proximity.
- No individual-level social data.
- No real-time feeds.
- No automated action.

## Phase 3 additions: organization, missions, continuous awareness

- **Organization:** global → city manager → 28 departments → specialists → independent verification and governance (`src/org.js`). A profile is an identity with declared competencies, tools, permission and budget, not a running model. 16 profiles are executable; 15 are unavailable, each with its reason.
- **Missions** (`src/missions.js`): a question or detected event gives domains; the manager recruits qualified executable agents; tasks run in a pool of 3 with timeouts, retries and cancellation. Findings are shared and typed, disagreements detected, the adversarial review runs, and every synthesis statement cites findings. The mission gateway recomputes everything and corridor missions consult `issueCityDecision`. A manager has no extra factual authority.
- **Continuous awareness** (`src/feeds.js`, `scripts/city-feed.mjs`): 10 official sources run through verification, classification, geolocation, graph linking (`linkFeedItems`) and deduplicated mission suggestions. Refresh works only while a process or the app runs; no background scheduler exists.
- **Knowledge** (`src/knowledge.js`): approved, versioned documents with freshness, confidence and limitations; contradiction detection; agents propose, humans approve.
- **Models** (`src/llm.js`): a provider-independent local interface. Any model text must cite findings and add no unsourced numbers; deterministic tools and gateways stay authoritative. No provider runs today.

## Phase 4 additions: living intelligence and model-assisted investigation

The event-to-intelligence workflow runs on real components (`src/cognitive.js`). Model actions are marked **(model)**; everything else is deterministic code.

1. **Verified event:** the feed pipeline verifies the item and classifies it (kind, domains, confidence).
2. **Geographic association:** `graph.link`, using the CNN field or a ≤ 60 m derived link.
3. **Specialist selection:** chosen by the event's and the segment's domains; relevant unavailable profiles are listed.
4. **Evidence retrieval:** **(model)** chooses which permitted tools to call → deterministic evidence register E#.
5. **Cross-domain investigation:** structured findings from each specialist, then deliberation (agree, dispute, refine), evidence requests routed to the owning agent, and revision.
6. **Scenario evaluation:** **(model)** may propose bounded parameters; the deterministic investigation recomputes R0/R1/R2.
7. **Independent verification:** evidence references are resolved deterministically, then the model-assisted reviewer checks the interpretations with `evidence.check`.
8. **Decision Brief:** assembled deterministically. Model interpretations are labelled and cited; uncertainty, missing data, source dates and rejected outputs are listed.
9. **Cognitive gateway, then human review:** open requests, unresolved disputes, reviewer reservations or knowledge gaps yield **PREUVES SUPPLÉMENTAIRES REQUISES** (more evidence required), never a fabricated conclusion.

Refresh runs independently of the browser on GitHub Actions every 3 hours; see the Phase 4 report for verified operation.

