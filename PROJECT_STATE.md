# CORE — R14 V1 final QA, local release candidate, 2026-10-23
Worktree `.core-local/worktrees/v9.8/.core-local/worktrees/r12-release`, sanitized `release/r10-public` (R13 `b5803de`); no contaminated history; private project store untouched; nothing pushed, merged or deployed.
R14 fixes: Solutions city section had near-invisible body text (1.9:1) and an invisible "Open the San Francisco mobility dossier" button; 12 homepage/hero strings were English in es/de/zh-CN/pt; language selector now marks every non-English edition as a draft in its own language.
New `scripts/r14-qa.mjs`: 13 public pages × desktop/tablet/phone in PUBLIC mode: screenshots, overflow, errors, layout shift, weight, touch targets, focus, sampled contrast; evidence in ignored `.core-local/evidence/r14/`.
QA result: 0 overflow, 0 page errors, 0 sampled contrast failures, visible keyboard focus; dictionaries complete (0 missing keys, 0 interpolation/markup mismatches; crawl 0 missing after fix).
Verification: R13 journeys and R12 six-page + R11 eight-step demo (reduced motion on phone) passed desktop/mobile; `node scripts/verify.mjs` full suite; public build scanned for private terms/paths.
Known, non-blocking: one initial-render layout shift on dialogue/report/My CORE (CLS 0.11–0.38 at <200 ms); Earth page loads ~7 MB in ~140 requests; several 20–23 px text links; plans detail sections English-only.
Release concerns: Safari/WebKit not installed (manual checklist in R14 report); translations are model-written drafts; deleted-branch cached objects need host purge.
Next: founder visual approval of R14 screenshots, Safari manual check; publication requires separate authorization.
