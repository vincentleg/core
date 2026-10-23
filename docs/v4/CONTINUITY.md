# CORE Continuity — research bibliography and framework (V4, 2026-10-15)

**Status: research.**
- No catastrophe prediction is made, and no AI authority is proposed.
- Bibliographic details come from general knowledge and should be checked against library records before citation. **No book was read or reproduced in this session.**
- Summaries are short descriptions of each work's argument.

## 1. Sources, by kind of evidence

**Fiction (inspiration, not evidence)**
- Isaac Asimov, *Foundation* (1951) and sequels. Asimov imagines a "psychohistory" that predicts collapse and an encyclopedia project that shortens the dark age that follows. Use: the idea of deliberately preserving knowledge. Caution: psychohistory is fiction, and societies are not predictable in that way.

**History and interpretation**
| Work | Argument (short) | Caution / debate |
|---|---|---|
| Edward Gibbon, *The History of the Decline and Fall of the Roman Empire* (1776–1789) | Long decline of the Western Empire: moral, religious and military explanations | 18th-century framing; many causal claims are disputed by modern scholarship |
| Joseph Tainter, *The Collapse of Complex Societies* (Cambridge University Press, 1988) | Societies add complexity to solve problems; returns on complexity decline until simplification ("collapse") becomes economical | Influential general theory; critics question how measurable "complexity" and "marginal returns" are |
| Bryan Ward-Perkins, *The Fall of Rome and the End of Civilization* (Oxford University Press, 2005) | Archaeology (pottery, housing, cattle size, coinage) shows a real, steep material decline in the West | Argues against purely "transformation" readings of late antiquity |
| Peter Heather, *The Fall of the Roman Empire: A New History* (Macmillan, 2005) | External pressure (Huns, migrations, the loss of Africa's revenue) outweighed internal decay | Emphasis on exogenous shocks; contested by "transformation" historians |
| Kyle Harper, *The Fate of Rome: Climate, Disease, and the End of an Empire* (Princeton University Press, 2017) | Climate change (the late antique cooling) and pandemics (the Antonine and Justinianic plagues) were major drivers | Debate on the size of pandemic mortality and on climate causality |
| Peter Brown, *The World of Late Antiquity* (1971) | Late antiquity as transformation rather than simple decline | The counterpoint to the "decline" framings above |
| Patricia McAnany & Norman Yoffee (eds.), *Questioning Collapse* (Cambridge University Press, 2010) | Critiques simple collapse narratives; stresses resilience and continuity of peoples | A response to popular collapse books |

**Systems and resilience science**
| Work | Use for CORE |
|---|---|
| C. S. Holling, "Resilience and Stability of Ecological Systems", *Annual Review of Ecology and Systematics* (1973) | The origin of resilience as the ability to absorb change, not just to return to equilibrium |
| Marten Scheffer, *Critical Transitions in Nature and Society* (Princeton University Press, 2009) | Tipping points and early-warning signals, with their limits |
| Miguel Centeno et al., "The Emergence of Global Systemic Risk", *Annual Review of Sociology* (2015) | Interconnection as a source of cascading failure |
| Donella Meadows et al., *The Limits to Growth* (1972) | A scenario modelling tradition; read as scenarios, not forecasts |
| UNDRR, *Sendai Framework for Disaster Risk Reduction 2015–2030* | An internationally agreed vocabulary for preparedness and recovery |
| LOCKSS ("Lots Of Copies Keep Stuff Safe", Stanford Libraries) | Digital preservation by distributed replication |

## 2. Framework for CORE Continuity (proposal)
1. **Knowledge preservation:**
   - every CORE dataset, method and decision is exportable in open formats (JSON, GeoJSON, Markdown) with SHA-256 manifests;
   - CORE already does this for `data/*/manifest.json`;
   - replicate to independent locations (LOCKSS principle);
   - human-readable method notes travel with the data.
2. **Dependency mapping:** for each problem domain, record which infrastructures it depends on (energy, water, communications, transport, supply chains, institutions), as observed links with sources.
3. **Vulnerability analysis:** scenario exercises ("if X fails for N days"), labelled as SIMULATION, with assumptions and no probability unless sourced.
4. **Preparedness and recovery:** reference public frameworks (Sendai); identify which human roles decide and act (P1).
5. **Long-term transmission:** education (Academy), plain-language summaries and the preserved history of decisions and failures (art. 2: "publish failures").
6. **Comparative scholarship:** present competing interpretations side by side (the table above), never one "lesson of history".

## 3. Kardashev scale (educational reference)
- **Origin:** Nikolai Kardashev (1964) classified hypothetical civilizations by the power they harness:
  - Type I: planetary, about 10¹⁶ W in Sagan's interpolation;
  - Type II: stellar, about 10²⁶ W;
  - Type III: galactic, about 10³⁶ W.
- **Formula:** Carl Sagan's interpolation, K = (log₁₀ P − 6) / 10, is implemented in `src/civic/progress.mjs`. It returns a number only for a power the user supplies, with its source.
- **Limits:** it measures energy use, not well-being, equity, knowledge, ecological sustainability or institutional quality. More energy is not "better" by itself. CORE never presents it as a progress score.

## 4. Implementation status
- **In use:** only the export-with-manifest practice (existing) and the Kardashev teaching tool.
- **Not built:** dependency maps and scenario exercises. They need data authorized under FD09 and a methodology review.
