# CORE — R13 V1 functional completion, local release candidate, 2026-10-23
Worktree `.core-local/worktrees/v9.8/.core-local/worktrees/r12-release`, sanitized `release/r10-public` on R12 `fde1fa2`; no contaminated history; private project store untouched; nothing pushed, merged or deployed.
Audit: automated click-through of 13 public pages, desktop + mobile: no broken links or dead navigation/product controls.
Fixed: Escape now closes the overlay that holds focus (it closed the layer intro over the Earth panel); keyboard focus stays in the panel when its content is replaced; public site shows the local-model button disabled as "Local model · unavailable on this site" with a note; English labels no longer say "Mon CORE"; untranslated urban-panel strings bilingual + draft es/de/zh-CN/pt; My CORE explains why guided-tour drafts get no review request.
New `scripts/r13-browser.mjs`: full visitor journey run as a non-localhost secure host (PUBLIC mode): layers, missions, Escape, contribution → My CORE → review request download, nine pages, menu, language persistence.
Verification: R13 journeys desktop/mobile passed; R12 six-page + R11 eight-step demo passed; `node scripts/verify.mjs` full suite and integrity, privacy isolation included; evidence in ignored `.core-local/evidence/r13/`.
Release concerns: draft translations need professional review (plans detail sections English-only); Safari not covered; deleted-branch cached objects need host purge.
Next: founder review of the R13 local commit; publication requires separate authorization.
