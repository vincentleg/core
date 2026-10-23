# San Francisco human–AI experience — founder review (2026-10-23)

## Scope and provenance

The restored pre-Explorer source baseline is `4b3fcb3`. Foundation documentation and entry changes were checkpointed locally at `99d66b2` on `foundation/civilization-reset`. This phase extends the existing `Explore the Demo` path in the restored holographic globe; it does not use Explorer 2.0 or the Helsinki/Kalasatama realism assets. No push or deployment was made.

## Journey available in the local preview

Open `world.html`, choose **Explore the Demo**, then advance through seven self-paced stops: Real Earth in San Francisco; a mapped Folsom/Howard street approach and its evidence gaps; a private demonstration idea; an earlier recorded agent investigation; bounded queue-model scenarios; locally verified calculation and scientific limitations; and a human-review recommendation with a link to the draft in My CORE. The user may skip the idea, go back, change model assumptions, run the browser worker, export the model report, or leave the tour for the existing exploration controls.

The idea is a **user claim**, stored only in this browser as a marked private demonstration draft; the sharing helper refuses to promote it. The recorded agent work predates it and has not analyzed the text. The scenarios test specified assumptions, not the idea. The recommendation calls for authorized counts, signal plans, calibration, independent review and a human decision before intervention. No proposal is transmitted; no improvement or verified real-world impact is claimed. The existing crisis guard rejects crisis text before draft storage. My CORE shows the draft as not reviewed.

## Evidence and calculation boundary

The existing `data/urban/catalog.json` cites DataSF street geometry (Streets `3psu-pn9h`, PDDL, retrieved 2026-10-13) and OpenStreetMap pedestrian mapping (ODbL, retrieved 2026-10-14); source dates and limitations appear in the tour. It also contains a dated aggregate housing source (`xdht-4php`), which is context, not traffic evidence. Mapped geometry locates the example and does not establish present congestion. The existing `data/urban/latest.json` is a recorded exploratory run, verified by `verifyReport`; fresh runs use the existing deterministic local worker. Demand, lane capacity and signal timing are assumptions. No observed traffic counts, calibrated effect, official city review, partnership, authorization or field outcome is available. `docs/DATA_SOURCES.md` remains the governing source inventory; this phase fetched no new dataset.

## Verification and screenshots

- Focused unit/product/security tests: 21/21 passed. Full `node scripts/verify.mjs`: 354/354 passed, including integrity/security checks (827 scanned files, zero findings, eight documented exceptions). Public build: 201 files, 21.8 MB; pinned vendor verified.
- Isolated browser journey before the final CSS adjustment: 22/22 checks passed across desktop 1440×1000 and mobile emulation 390×844. Checks cover idea privacy, no network write, model comparison, review boundary, My CORE history, hospital demo and founder route; no page errors. Results: `.core-local/evidence/sf-phase1/report.json`. A later direct mobile browser capture verified the corrected navigation layout; repeated full-suite attempts after the CSS adjustment timed out during page navigation in headless Chrome, so a post-adjustment 22/22 result is not claimed.
- Genuine browser screenshots: `.core-local/evidence/sf-phase1/{desktop,mobile}-{entry,idea,scenarios,review}.png`, `desktop-history.png`, and post-adjustment `mobile-debug.png` (French entry). These local evidence files are intentionally ignored by Git.
- Local software-WebGL timing: desktop demo readiness 19.1 s and full journey 80.7 s; mobile emulation readiness 6.3 s and full journey 22.8 s. These are diagnostic timings, not production benchmarks. No physical mobile device or Safari run was performed.

Run the preview from the public build with `python3 -m http.server 8796 --bind 127.0.0.1` in `public/`, then open `http://127.0.0.1:8796/world.html`. The browser audit requires the existing locally installed Playwright Core and an isolated Chromium CDP instance; it adds no project dependency.

## Preserved and next gate

The globe, authentication code, hospital demonstration, founder route, deterministic scientific engine, existing agent records, security controls and source metadata were not replaced. This phase adds no database migration, paid service or external submission endpoint. The founder's live sign-in has not been retested; browser checks establish local route availability only. Next development should obtain authorized traffic counts and signal plans, calibrate and independently review the model, then design a consented, moderated contribution backend with explicit human review. Until then the San Francisco journey remains an illustrative research demonstration.
