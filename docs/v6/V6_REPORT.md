# CORE V6 — The Living Civilization Platform: delivery report and checkpoint (2026-10-15)

**Branch:** `v6/living-civilization` (local), created from `upgrade/v2-hardening` at `a50f245`.
- Nothing was pushed, merged or deployed.
- No paid service, account system, external AI, new dependency or download was added.
- Constitution V1.1 and FD01–FD11 are unchanged.

## Launch locally
```sh
cd <the CORE repository folder>
python3 -m http.server 8000 --bind 127.0.0.1
# then open http://localhost:8000/world.html   (start here)
#          http://localhost:8000/dialogue.html  http://localhost:8000/commons.html#journey
```

## What works (implemented, tested)
| Area | What it does | Code |
|---|---|---|
| One product shell | One navigation on World, Dialogue and Commons:<br>• World first, then Dialogue, Savoir, Mon espace, Ensemble, Apprendre, Progrès, Intelligence, TRUST;<br>• hash deep links that keep state;<br>• a journey indicator that stores IDs, counts and dates only | `src/shell/` |
| CORE Dialogue | A private working session with a clearly non-human agent:<br>• 10 guided phases filling a live idea draft;<br>• factual questions answered only by CORE Knowledge, with citations, status and uncertainty;<br>• weak or overconfident claims are challenged, never praised;<br>• evidence and agent reasoning are visually distinct;<br>• tool permission boundaries; consent off by default;<br>• saves into the encrypted vault; Markdown/JSON export; resumes an idea for revision.<br>Deterministic: **not a language model**, and it says so | `src/dialogue/`, `dialogue.html` |
| Idea Vault | Shared session that auto-locks (10 min idle, 60 s hidden, on unload); chained, encrypted versions; version diff; category; encrypted notes; decrypted export with a warning; deletion | `src/civic/vault*.mjs` |
| Labs | Checklist plus a research dossier:<br>• testable hypothesis, assumptions, evidence with basis, alternatives, risks;<br>• validation and prototype plans, success and failure criteria;<br>• missing evidence named;<br>• arithmetic only on recorded values (2 ft / 0.61 m to the minimum, 5 ft / 1.52 m to the recommended width, from the 2014 record).<br>Never a validation | `src/civic/labs.mjs` |
| Knowledge | Explorer over a real graph: 319 nodes, every edge typed and explained, none causal. Cited questions. Contributions as candidates through validation → quarantine → provenance → classification → conflict check (e.g. "9 ft" vs the recorded 10 ft) → human review required. A simulated reviewer can only annotate; no approval is possible without an authenticated human; URLs are never fetched | `src/kb/` |
| Expert Network | 4 fictional experts (no real person or institution, "synthetic" verification):<br>• topic matching with reasons;<br>• requests stored in the encrypted vault, sharing only what the author chose;<br>• conflicts of interest surfaced;<br>• one labelled "AVIS FICTIF" per request, drawn from the missing evidence;<br>• the author's own decision record | `src/civic/network.mjs` |
| Communities | 5 fictional, adults-only communities, one about the real Folsom record:<br>• rules and member roles;<br>• local drafts (never published, safety-screened);<br>• report → simulated moderation citing a rule → appeal to a human;<br>• local blocking.<br>No messaging, no locations of people | same |
| Arena | Structured debate (fictional) about the real record:<br>• arguments, counterarguments, evidence requests, rebuttals;<br>• cited evidence must exist; unsourced arguments flagged;<br>• unresolved objections computed;<br>• no winner, no vote.<br>The sealed-judging tournament (V4) remains | `src/civic/debate.mjs` |
| Academy | 3 lessons (evidence vs assumption; reading an AI refusal and a source; designing an experiment), all tied to the real record; teacher-demo with fictional pupils | `src/civic/academy.mjs` |
| World | Markers for all 37 recorded problem segments, coloured by evidence status; a popup routing to Dialogue and evidence; `#problem=` deep links; a Dialogue entry from the agent; journey status in the problem panel. V3 avatar, realistic radius and controls preserved | `src/world/` |
| Progress, Continuity, Institutions | Unchanged sourced indicators. Continuity sources grouped by kind (fiction / history / contested / systems / speculative). A labelled institutional demo built from public data only | `src/civic/ui-more.mjs` |
| TRUST page | Every local storage key, its protection and size; vault lock; one-click wipe of all CORE data | `src/civic/ui-journey.mjs` |

## Demonstration (automated: `scripts/v6-journey-audit.mjs`, 17/17)
1. Enter World with an avatar.
2. Find the documented sidewalk problem and its agent.
3. Open the Dialogue room; "Que sait-on de ce trottoir ?" returns cited, verified evidence.
4. An overconfident proposal is challenged.
5. Save it to the encrypted vault (v1).
6. Labs produces the dossier and names the missing evidence.
7. Revise it in Dialogue (v2).
8. Compare v1 and v2.
9. Prepare a fictional expert request; the labelled fictional reply asks for the missing evidence.
10. Visit the fictional Folsom community.
11. Add a sourced rebuttal in the fictional Arena.
12. Return to World: the problem panel shows the journey, and that nothing is validated.

Throughout the run, an XSS payload never executes, a private phrase is found only inside the encrypted vault, and every request is a GET to this site or the tile host.

## Test results (final pass, Chromium 155, this Mac)
| Suite | Result |
|---|---|
| Node (`node --test test/*.test.js`) | **225/225** (206 at the start of V6; +19: dialogue 5, knowledge 2, civic 6, trust 6) |
| Integrity scan / anchors / `verify.mjs` | 0 findings in 446 files / current / passed |
| V6 end-to-end journey audit | **17/17** |
| Commons audit | **35/35** |
| World audit | **34/34** (+4: markers, marker click, Dialogue link, deep link) |
| Main app audit / negative / lab | **162/162** / **12/12** / 7/7 |
| Performance (World, headless, vsync-capped) | 60 fps at radius 0–50 m; frame p95 16.7–16.8 ms; reveal update mean 1.7–2.7 ms, p95 21–38 ms (unchanged from V3) |
| Firefox, Safari, real phones, screen readers | **Not run** (Firefox long-session issue known; Safari needs a founder setting) |

## Remaining simulated or conceptual
- Every expert, community member, moderator, reviewer, debater and pupil is fictional.
- No accounts and no multi-user features; all identity is local and pseudonymous.
- No real review or human approval exists.
- No publication of contributions, posts or ideas.
- No live news.
- Institutional workspaces are a demo only.

## Local language model evaluation (not integrated)
- **Setup:** `qwen3:8b`, already installed, local only, one grounded call.
- **Speed:** 10 s, of which 5.4 s is model loading, then about 15 tokens/s.
- **Grounding:** good, and it declined to call the sidewalk dangerous.
- **Error:** it called the 12 ft minimum a "norme" (standard), while the record says it is a design rule, not an accessibility standard.
- **Recommendation:** a numbers-only validator would miss that kind of error, so keep it disabled until a semantic validator exists (check claimed status, rule versus standard, dates).

## Next priorities
1. **Publish:** decide how this branch and `upgrade/v2-hardening` get published (FD11 and V2–V6 are unpublished).
2. **CORE TRUST foundations before any multi-user feature:**
   - authenticated accounts (passkeys) and an anti-Sybil design;
   - a durable audit log;
   - human moderation;
   - counsel review (L1–L16, minors, idea-vault IP).
3. **Model experiment:** a semantic answer validator, then a flagged local-model mode in Dialogue.
4. **Browsers and devices:**
   - a real phone test and Safari/WebKit (founder setting needed);
   - the Firefox long-session issue;
   - screen-reader passes.
5. **Data:** more recorded datasets (FD09 review) so Knowledge, Labs and World cover more than one corridor.

## Checkpoint (to resume without repeating work)
- **Commits on `v6/living-civilization`:** `0928d02` Dialogue + shell, `0844162` journey/Labs/TRUST, `015f9c9` Knowledge, `b697940` network, `a8bf675` Arena/Academy/Continuity, `c54ef4e` World, `64b9fc9` TRUST tests + demo audit, then this report.
- **Tests:** `node --test test/*.test.js`.
- **Browser audits:** `scripts/{v6-journey,commons,world,browser}-audit.mjs <cdp-port> <out>`, run against your own headless Chrome; see `.claude/skills/core-browser-audit`.
