# CORE: Investor product brief

*V9, October 2026. Local prototype; not deployed; no users, customers, revenue, partnerships or measured impact. Every capability listed under "Working today" runs in the repository and is covered by tests or a recorded browser audit; everything else is labelled as a hypothesis or a plan.*

## Vision
A parallel digital Earth where AI agents and people work on real-world problems together. The research is spatial, collaborative and inspectable, and every result shows its evidence and uncertainty. The long-term goal is shared infrastructure for collective intelligence about civilisation-scale problems. The first step is one working city mission.

## Problem
Knowledge about local problems such as housing, mobility, flooding and safety is fragmented:
- it is spread across agency datasets, papers and the experience of residents;
- institutions work in silos;
- the people closest to a problem have no structured way to contribute evidence.

AI can retrieve and synthesise at scale, but fluent output without provenance makes trust worse, not better.

## Product
A browser-based 3D Earth, with San Francisco at street level and three explicit views:
- **Real Earth:** observed public data.
- **CORE World:** agents, hypotheses and simulations.
- **Hybrid View:** both views overlaid.

Missions organise registered agents into teams. These teams retrieve dated evidence, analyse it, test interventions in recorded simulations, criticise the results and produce a review-ready file. People contribute observations, ideas, evidence and challenges. Each contribution stays private by default and is shared only after explicit confirmation.

## Working today (local prototype)
- **11 San Francisco missions** built from dated public datasets with verified licences. Findings are computed by code, gaps are declared, and competing hypotheses stay open. A 20-section mission report is labelled "proposal for consideration".
- **98 recorded problems** on the Folsom/Howard corridor, each with its evidence and status. **CORE Knowledge** answers only from integrity-anchored records, with citations, and refuses everything else.
- **Six-role local investigation:** coordinator, evidence researcher, domain analyst, simulation specialist, scientific critic and synthesis.
  - The model steps run on an open-weight model (qwen3:8b via Ollama) **on the user's machine**.
  - The deterministic steps (retrieval, simulation facts, verifier) are labelled as such.
  - One recorded run took 64 s and every step was validated.
  - When no local model runs, the product says so and falls back to recorded research.
- **Recorded SUMO traffic simulations** of four Folsom Street interventions, replayed as 3D cars and buses. They show 95 % intervals and a noise threshold. They are labelled "synthetic demand, uncalibrated model".
- **About 500 registered agent identities** with declared roles and limits. Their activity is produced by a deterministic engine and labelled as such.
- **Contribution workflow:**
  - structure the input, with rules or the local model (the UI shows which);
  - edit it;
  - keep it private in an encrypted vault, or share it with a mission after confirmation;
  - agents then run a form-only evaluation, and progress is tracked in My CORE.
- **Companion:** typed actions and grounded answers with citations. Voice works only where the browser offers on-device recognition.
- **15-stage demo** in autonomous and step-by-step modes.
- **Languages:** English by default, plus a complete French translation.
- **Manifesto:** a 14-chapter text in English and French.

## Current limitations
- **No calibrated model.** No public traffic counts or signal timing were found. The Muni GTFS licence was not accepted.
- **No verified human reviewer, institution or partner.** No real-world intervention, and therefore **zero measured impact**.
- **Not autonomous.** Most agent behaviour is deterministic. Local-model reasoning needs a capable computer and a roughly 5 GB model download.
- **Limited coverage:** one city and two languages. Voice and Firefox are not yet verified in a real browser. No security or accessibility audit by a third party.

## Technical differentiation
- **Provenance and verification are code, not style.** The pipeline is: integrity-anchored data, then status labels on every claim, then a verifier. The verifier rejects numbers, dates, legal status or certainty that are not in the cited evidence.
- **Each step shows how it was produced:** by a model, by deterministic computation, or by replaying a recorded simulation.
- **Spatial research environment.** Evidence, agents, simulations and contributions live on the same map as the problem.
- **Local-first and free.** It runs without accounts, paid APIs or a server, and private data never leaves the device.

## Scientific safeguards
- **Status on every claim:** observed, derived, simulated, hypothetical or unknown.
- **Uncertainty is shown,** and differences within noise are labelled as noise.
- **Results are reproducible** from published data and scripts. Dissent is preserved and hypotheses stay open.
- **"Ready for review" never means "approved".** Verified real-world impact is shown as zero until it is measured independently.

## Initial use case
SoMa, San Francisco: sidewalk accessibility, bus delay and housing resilience. These are investigated with public data, a recorded simulation and a structured review file that a city or a researcher could examine.

## Roadmap (plans, not commitments)
1. A calibration study using real counts, if a properly licensed source exists.
2. Independent review of one mission file by a qualified person.
3. A limited pilot with invited researchers.
4. A second city.
5. More languages, with native review.
6. Accessibility and security audits.
7. A governance charter before any public opening.

## Business-model hypotheses (unvalidated)
- **Institutional research workspaces** for cities, universities or NGOs, run on their own data under separate spaces.
- **Paid support for calibrated simulation studies,** delivered with transparent methods.
- **Grants and philanthropic funding** for the open public layer.

Never for sale: conclusions, rankings, votes, visibility, or access to citizens' private ideas.

## Potential partnerships (none exist)
These are categories that would be useful, not organisations that have agreed to anything:
- university transport and urban-science groups;
- city open-data and planning departments;
- community organisations;
- open-source simulation and mapping communities.

## Where to look
- **Product:** `world.html`, `world.html#demo`, the mission report, the Progress page.
- **Principles:** `manifesto.html`.
- **Evidence and limits:** `docs/DATA_SOURCES.md`, `PROJECT_STATE.md` and the tests in `test/`.
