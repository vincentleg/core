# CORE — public launch checklist (2026-10-15)

"Launch" means opening participation (CORE World accounts and contributions) or any commercial offer. The static prototype is already public. Each item states its evidence and status.

## Blockers (must be closed before launch)

| # | Item | Status | Evidence / note |
|---|---|---|---|
| B1 | Publisher identity, jurisdiction and legal notice | OPEN (founder + counsel) | No legal page |
| B2 | Accurate privacy notice reviewed by counsel | OPEN | Two storage keys undisclosed; correction drafted in CORE_COMPLIANCE_AUDIT, not published |
| B3 | Terms of use, UGC rules, contribution licence, moderation and takedown (DSA if EU) | OPEN | None exist |
| B4 | Identity, anti-Sybil and abuse controls proportionate to risk (Constitution V1 §6, FC14) | OPEN | No identity system |
| B5 | Minors: participation design and legal assessment (COPPA, GDPR Art. 8, UK AADC) | OPEN | None |
| B6 | DPIA for location-based participation | OPEN | None |
| B7 | Retention, deletion and rights workflow implemented and tested (physical purge) | OPEN | Design in DATA_PROCESSING_INVENTORY |
| B8 | Upgrade vendored MapLibre to ≥ 6.4.1 (S2) | DONE on branch (6.11.2, D090); deploy pending | Production still on 5.7.3 until merge |
| B9 | Server security for any backend (authn/z, rate limits, CSRF, uploads, headers) | N/A until a backend exists | — |
| B10 | `main` protection (OP01) | OPEN | Ruleset prepared |
| B11 | Accessibility WCAG 2.2 AA target: landmarks, headings and target size fixed locally; screen-reader runs, contrast measurement, Firefox and Safari still missing | PARTIAL | See below |
| B12 | Business only: tenant isolation, DPA and contracts, hosting other than GitHub Pages (its terms exclude SaaS/commerce), pricing and cancellation terms | OPEN | IP_AND_ATTRIBUTION |
| B13 | Incident procedure exercised once | OPEN | Draft only |
| B14 | Never serve the repository root on a network interface (S1) | Rule exists | AGENTS.md `--bind 127.0.0.1` |

## Accessibility (engineering findings, Chromium 155, 2026-10-15)

Checked with a scratch DOM probe and the existing audits, which are not a WCAG certification:
- `html lang="fr"` on every page.
- No image without `alt`, no unnamed button or link, no unlabelled control, no positive `tabindex`, zoom not disabled.
- `research.html` and `privacy.html`: one `main` and one `h1` each.
- **Fixed in this pass:** `corridor.html` had no `main` landmark. The `.app` container is now `<main>` (via `src/template.html` → `node build.js`); browser audit still 159/159.
- **Fixed (local commit):** `index.html` app regions are wrapped in `<main id="core-main">` with a visually hidden `h1`; `corridor.html` has a visually hidden `h1`. All four public pages now have exactly one `main` and one `h1`.
- **Fixed (local commit):** the small targets at load were the theme checkboxes (9×13 px), not the sliders as first reported. Their wrapping labels count as the target; one label ("Énergie") was 19 px high and now has a 24 px minimum. Range sliders also get a 24 px minimum height. Remaining small hits are inline text links, which are exempt from SC 2.5.8.
- **Keyboard (Chromium 155, real Tab events):** every focus stop on `index.html#app` (14), `corridor.html` and `research.html` shows a visible outline, in a logical order. Mobile layout checks pass (main audit 159/159; negative 12/12; lab 0 errors).
- **Not verified:** colour contrast measurement, screen-reader runs (VoiceOver/NVDA), focus order across panels, reduced motion in `research.html` (`prefers-reduced-motion` is present in `index.html` and `corridor.html`, absent from `src/research.css` and `src/science.css`).

Existing browser evidence:
- Chromium 155: `index.html`/`corridor.html` audit **159/159**; `research.html` **7/7**, 0 errors, 0 external requests.
- Firefox and Safari: **not run** (historical blockers recorded in the Phase 8/9 reports).

## Website fundamentals

| Item | Status |
|---|---|
| Titles | Present on all pages |
| Meta description | `index.html` only |
| Canonical, Open Graph, social previews | Absent |
| `robots.txt`, `sitemap.xml` | Absent: an indexing policy is a founder decision. `control.html` (local tool, also served publicly) has `noindex` |
| Custom 404 | Absent (GitHub default) |
| Favicon | Not verified |
| Broken links | Not crawled in this pass |
| Structured data | Absent (not needed for a prototype) |
| Private or experimental routes | No private data is served by Pages: `.core-local` is ignored by Git and `.git` is not published by Pages |
