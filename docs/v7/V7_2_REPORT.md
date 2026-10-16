# CORE V7.2 — Living Agent Civilization Engine: delivery report (2026-10-16)

**Branch:** `v72/agent-civilization` (local), based on `v7/living-earth` (`c16425d`).
- Nothing was pushed, merged or deployed.
- Cost: $0. No account, API key, paid service or external AI.
- The V7 design is unchanged except for the additions the brief allows.

## Launch locally
```sh
cd <the CORE repository folder> && git switch v72/agent-civilization
python3 -m http.server 8000 --bind 127.0.0.1
# open http://localhost:8000/world.html                         (Explorer San Francisco → housing mission, Hybrid)
#      http://localhost:8000/world.html#layer=agents&mission=mission.sf.housing-resilience
#      http://localhost:8000/dialogue.html#mission=mission.sf.housing-resilience   (team session)
```
In a browser console, `localStorage.removeItem('core.civ.v72')` resets the agent runtime.

## IMPLEMENTED AND VERIFIED
| Item | Evidence |
|---|---|
| **508 registered agents, 501 in San Francisco** | Registry `data/agents/sf-civilization.json`:<br>• hierarchy: CORE Global Intelligence → Global Assembly → 7 councils (2 geographic, 4 thematic, 1 mission) → San Francisco direction → 34 teams → 464 agents;<br>• the 68 Phase 3 profiles kept verbatim;<br>• all supervisors and councils resolve; no agent can approve or authorise.<br>Checked by `test/civilization.test.js` |
| **10 missions** | • **Flagship:** housing affordability and urban resilience;<br>• **5 on loaded data:** energy, road safety, urban forest, sidewalk regression test, data freshness;<br>• **4 declared data gaps:** AI compute, food, schools, water. These do no fabricated work |
| Flagship grounded in dated public data | DataSF pipeline, housing production and **aggregated** eviction notices; flood-risk zone. Findings are recomputed by code; tests check them against the snapshot |
| Real runtime | • Stages from OBSERVE to HUMAN_REVIEW, then monitoring; RECOMMENDATION never happens without a human;<br>• the rent-burden retrieval **fails for real** (the Census API needs a key) and escalates;<br>• 10 typed message kinds; record-by-record audits; council sessions;<br>• bounded concurrency, cancellation, consent-gated human input;<br>• deterministic, hash-chained log; recovery continues identically. All tested |
| Real / Agents / Hybride, independent of scale | V7.2 journey steps 2–4, 20; switching keeps panel, mission and camera |
| Planet network | San Francisco active (501 registered), New York **partial** (recorded missions only), inter-city link; hierarchy panel |
| Populated city | All 499 positioned agents drawn. **Measured at runtime ×16: 24–63 agents working simultaneously** (the rest honestly shown idle); about 190 distinct agents worked within 15 runtime minutes |
| Holographic humanoid agents at street level | Same CC0 rig and animations as humans: translucent cyan, Fresnel rim, scanlines, role marker. Animation follows real activity (walk, talk, inspect, idle). Up to 12 animated + 220 instanced ("Haute"), or 6 + 40 ("Équilibrée"). Compact nameplates; E opens the agent's card |
| Agent card | Identity, organisation, councils, escalation, capabilities, data permissions, current activity and mission, memory (activity journal), recent exchanges |
| Multi-agent team mode | `dialogue.html#mission=`:<br>• coordinator, specialists, evidence verifier and reviewer;<br>• answers only from cited findings; causal questions get the competing hypotheses plus "not established";<br>• consult another specialist; engine exchange log;<br>• private vault save; sharing **only with explicit consent**;<br>• optional local-model wording, verified. In the test, qwen3:8b's draft cited a non-existent source and was **rejected**; the deterministic answer stayed |
| Human participation | A consented hypothesis is triaged by the verification team and is never auto-accepted. It appears in the World mission panel and in Mon CORE |
| Commons integration | Knowledge (findings as candidates, not merged into the verified graph), Labs (known missing evidence), Arena (H1–H3, no vote), Academy (a lesson on reading a dossier) |
| TRUST | The new local keys (`core.civ.v72`, `core.world.layer`, `core.follow.v1`) are listed and included in the wipe |

**Example agent-to-agent exchange** (from the engine log for the flagship mission):
1. `CORE-RES-…` (verification of sources) → housing direction, *escalade*: "Taux d'effort des locataires indisponible : lacune enregistrée…"
2. Data-science → housing, *contestation*: "Une partie des logements « abordables » achevés est estimée par la source…"
3. Social → housing, *hypothèse concurrente*: "H2 — Pression de déplacement…"
4. Safety → council, *contestation*: "H1 et H2 ne sont pas exclusives…"
5. Housing direction → council, *mise à jour du dossier*: "H1, H2 et H3 restent ouvertes et non exclusives ; les dissidences sont conservées…"

## Test results (this Mac, 2026-10-16)
| Check | Result |
|---|---|
| Node tests | **246/246** (+7 civilisation) |
| `node scripts/verify.mjs` | **passed** |
| **V7.2 20-step journey** (`scripts/v72-journey-audit.mjs`), 1440×900 / 390×844 | **26/26** / **26/26** (includes consent, privacy, XSS, network-host and error checks) |
| V7 journey (updated for the new opening) | **27/27** |
| V6 regression audits | V6 journey **17/17** · Commons **35/35** · classic World **34/34** · main app **162/162** · negative paths **12/12** |
| Playwright **WebKit 26.6** and **Firefox 155**, desktop and phone | **10/10** each, 0 page errors |
| Backend RLS check | not re-run (unchanged since V7, 18/18) |

## Performance (headless Chromium on this Mac, vsync-capped)
| | High, 1440×900 | Balanced, 1440×900 | Balanced, 390×844 |
|---|---|---|---|
| City scale, Agents layer, 499 agents, runtime ×16 | 60 fps, p95 16.8 ms | 60 fps, p95 16.7 ms | 60 fps, p95 16.8 ms |
| Street scale with holograms | 60 fps, p95 16.8 ms (6 near + 21 far) | 60 fps, p95 16.7 ms | 60 fps, p95 16.8 ms (2 + 15) |
| Triangles at street level | 1.45 M | 0.75 M | 0.76 M |
| 3D layer cost per frame | 1.0 ms | 0.7 ms | 0.7 ms |
| Engine step / overlay update | 0.03–0.05 ms / 0.09–0.12 ms | same | same |
| JS heap | 118–123 MB | 24–113 MB | 37–61 MB |
| Saved state (`localStorage`) | about 610 KB | | |

**Reasoning agents running concurrently: 1** (the optional local model, one call at a time, cancellable). Everything else is deterministic computation.

## SIMULATED OR DEMONSTRATION-ONLY
- **Agent identities:** 440 are generated; posts, hubs and meeting points are virtual.
- **Movement:** travel is accelerated (25 m/s), and movement shows where the work points, not physical presence.
- **Agent "work":** coded computation on dated public data. Messages are produced by the engine, not by free model conversation.
- **Human review:** no human reviewer exists. Every dossier waits at HUMAN_REVIEW.
- **New York:** only recorded missions are shown; its registry isn't loaded.
- **Experts, communities, Arena debaters and pupils:** still fictional (V6).

## NOT IMPLEMENTED (known limitations)
- **Missing data:** no rent, income, zoning or transit data (the Census API needs a key, a founder decision), so H1–H3 cannot be told apart.
- **Flood coverage:** the flood join covers only the SoMa/Mission/Tenderloin study area.
- **Persistence:** the engine runs only while CORE is open, in one tab (Web Locks) and in the main thread, with `localStorage` keeping a 1,200-event window. Not built: Web Worker, IndexedDB, server.
- **Hologram placement:** audit targets are lot points, so some street-level agents stand inside blocks, hidden by buildings.
- **Talking to an agent:** "talk" needs the agent to stay within 4.5 m; agents on the move can walk out of range.
- **Not tested:**
  - Safari itself (WebKit ≠ Safari), real phones and real GPUs;
  - screen readers;
  - long-session memory;
  - multi-tab contention beyond the cross-tab submission path.
- **Labs, Arena and Academy:** the mission views are read-only cards. Debate arguments and lesson progress don't yet write into the missions.
- **Founder decisions** (nothing activated):
  - a Census API key;
  - hosted accounts (Supabase);
  - publishing the branches;
  - the avatar `.glb` licence question;
  - the `AGENTS.md` "pas de phase cosmétique" wording.
