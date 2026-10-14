# Phase 5 — evaluations (actual results)

## Semantic validation

The validator is deterministic: `src/cognitive.js` checkStatement plus `src/semantic.js`. Results are in [PHASE_5_SEMANTIC_RESULTS.json](PHASE_5_SEMANTIC_RESULTS.json).

| Set | Cases | Correct |
| --- | --- | --- |
| Tuned set (`test/fixtures/semantic-cases.json`): meaning, unit, scope, modelled vs. measured, temporal, geography, causal, false precision, valid statements | 32 | **32** |
| Held-out set (`semantic-holdout.json`), written after tuning, same author | 20 | **20** |
| Real Phase 4 recording: 43 retained statements re-validated | 43 | 7 rejected, 0 false positives after the identifier fix, 1 attributable to changed inputs |

The 7 real rejections are the 4 "profondeur de 17 m" (distance read as depth) and 3 overstatements ("l'excavation affecte le tronçon"). Re-validating the real data also revealed 10 false positives in the first version (street ordinals like "08TH", the noun "impact"); they were fixed before the held-out run was finalised.

**Limits:** only the classes listed are checked. Meaning and unit checks need typed quantities, so evidence produced before Phase 5 has none. Both sets were written by the same author; independent adversarial cases are still needed. Free-text fields (request reasons) are labelled "non validées" rather than checked.

## Tests

| Suite | Kind | Result |
| --- | --- | --- |
| `node --test test/*.test.js` | Unit and regression, **mock model** | **83/83** |
| `test/phase5.test.js` (part of the above) | Semantic sets, simulation, data policy, routing, fast mode, cache, recorded live runs, dossier, public mode | 9/9 |
| `test/live/*.test.js` | **Live model** | 5/5 in Phase 4; **not re-run in Phase 5** (deep mode unchanged; fast mode is evidenced by the 3 live recordings below) |
| Browser audit | Chrome 155, local | **101/101**; negative paths 12/12 |
| Public site smoke test | Chrome 155 against https://vincentleg.github.io/core/ | Pass (see PHASE_5_BROWSER_RESULTS.json) |
| Firefox / Safari | — | Not run (Firefox 122 hangs at startup; Safari untested) |

## Live missions recorded with qwen3:8b (fast mode)

| Mission | Wall | Model calls | Tokens (in + out) | Accepted / rejected | Decision |
| --- | --- | --- | --- | --- | --- |
| Excavation 26EXC-05114, Howard 8th–9th | 342 s | 9 | 17,671 + 4,078 | 25 / 8 | more evidence required |
| Tree planting × accessibility (corridor) | 242 s | 7 | 9,315 + 2,956 | 17 / 10 | more evidence required |

Gateway replay of both recordings with the current code reproduces the recorded decision, and the planning dossier passes validation.
