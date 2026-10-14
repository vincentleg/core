# Phase 5 — baseline audit (Phase 4 claims vs. reality)

Audited 2026-10-14 on commit `5679645`.

| Phase 4 claim | Verified | Note |
| --- | --- | --- |
| 74 Node tests (mock model) | **74/74 reproduced** | — |
| 5 model-assisted, 16 deterministic agents | **Reproduced** (`ORG.counts`) | 65 profiles; the other 44 are coordination-only or unavailable, not executing agents |
| 17 sources, 16 active | **Reproduced** | — |
| 8 knowledge sources, 22 documents | **Reproduced** | — |
| 18.1-min live mission, 23 calls, 13.2 tok/s, 11 GB | **Reproduced**: 1,004 s, 23 calls, 78,673 tokens, 13.8 tok/s, 11.5 GB peak | Same machine, same event |
| Scheduled refresh every 3 h | **Not yet observed** | Only manual dispatches had run. No `schedule` event appeared by 03:34 UTC, after the 03:17 slot |
| Chrome 101/101 | **Reproduced** | Firefox 122 still hangs at startup; Safari untested |

## Critical issues found

1. **No public URL.** GitHub Pages was not enabled.
2. **Semantic errors pass validation.** The Phase 4 recorded mission retained 4 "depth of 17 m" statements: a distance misread as a depth.
3. **Data rights:** Open-Meteo's free API is for non-commercial use only, which is incompatible with an investor-facing company prototype. Its use was **quarantined**.
4. **Performance:** generation runs at about 14 tok/s under JSON-grammar decoding and dominates. Model calls that only chose tools (about 8 of 23) and long, repeated prompts were the avoidable costs.
5. **No privacy issues found in published data.** The integrity scan finds 0 issues; emails are redacted; 311 and business data are aggregated.
