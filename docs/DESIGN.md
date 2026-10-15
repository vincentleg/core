# CORE — design system (as implemented, 2026-10-15)

This document describes the interface that exists in `index.html`, `corridor.html` (built from `src/template.html`), `research.html` and `privacy.html`. It is the reference for changes; it does not describe future CORE World or Business screens, which do not exist yet.

## Principles

1. **World first.** The map is the product; panels float over it and never hide each other.
2. **Status before style.** Every result shows what kind of knowledge it is (observed, derived, simulated, hypothesis, recorded replay) before it shows a number. No visual treatment may make an uncertain or pending result look approved.
3. **Precision over decoration.** Dark, quiet surfaces, one accent colour per meaning, monospace for data. Motion explains change or it is removed.
4. **Accessible by default.** Keyboard first, visible focus, 24 px minimum targets, reduced motion honoured.

## Tokens

There are two layers, both defined as CSS custom properties on `:root` in `index.html`. New code uses these variables and never hard-codes a colour that already has a token.

| Layer | Tokens | Use |
|---|---|---|
| Brand / map (Phase 1) | `--void #02050b`, `--cyan #78e8ff`, `--amber #ffb84d`, `--magenta #ff5cd6` | Map styling, landing, wordmark, epistemic badges |
| Platform panels (Phase 3) | `--panel rgba(13,17,23,.94)`, `--surface #161b22`, `--line #232c37`, `--ink #e6edf3`, `--muted #8b98a5`, `--accent #6fd3ee` | Panels, tables, forms, navigation |
| Layout | `--navh 52px`, `--gap 12px`, `--dock-w 300px` (full width below 640 px), `--insp-w min(420px, 100vw − 32px)` | Floating panel geometry |

`research.html` (`src/research.css`) and `privacy.html` use a reduced palette of their own with the same intent. Unifying them is listed under debt below.

**Type.** All fonts are self-hosted (`assets/fonts/`); no font CDN.
- **Oxanium**: the display face, for the wordmark and brand headings only.
- **IBM Plex Sans**: body text and controls.
- **IBM Plex Mono**: identifiers, hashes, coordinates and timestamps.

## Layout and breakpoints

| Region | Element | Rule |
|---|---|---|
| Top | `#appnav` | Fixed, `--navh` high; sections Monde · Civilisation · Intelligence · Missions · Preuves |
| Left | `.console` (Explorer) | `--dock-w` wide; a bottom sheet below 640 px |
| Right | `#sf-panel`, `#ws` (inspector) | `--insp-w` wide; one inspector at a time; a bottom sheet below 640 px |
| Top right | `.layers` (Couches & légende) | Left of an open inspector on desktop |
| Floating | `.pop-bar` (Population), `.activity` (Activité) | Secondary; they yield space (below) |
| Bottom | `.cam` (camera controls) | Centred |

**Priority when space is short:** inspector > Explorer > Activity > Population bar.
- **Above 1100 px:** with the city panel open, the Population bar sits between the Explorer and the inspector, below the layers button.
- **1100 px and below:** the Explorer, Population and Activity panels hide while an inspector is open, and the Population bar moves under the navigation bar.
- **700 px and below:** the floating Activity feed is hidden. The same feed stays available in Civilisation → Activité, and the population filters in Civilisation → Organisation.

The browser audit checks that no visible floating panels overlap at desktop, tablet (820 px) and mobile (390 px).

## Evidence and decision status (existing vocabulary — do not create a parallel one)

| Meaning | Where | Label | Visual |
|---|---|---|---|
| Observed public record | `.badge.observed` | OBSERVÉ · registre public | Cyan text |
| Approximate, procedural or derived geometry | `.badge.approx` | APPROXIMATIF | Amber text |
| Synthetic or hypothetical | `.badge.synthetic` | SYNTHÉTIQUE, HYPOTHÈSE | Magenta text |
| Claim basis (city brief) | `BASIS_LABEL` in `src/city-view.js` | OBSERVÉ · DÉRIVÉ (géographie) · RÈGLE · HYPOTHÈSE | Badge per basis |
| Problem status | `ST` in `src/civ.js` | observé · risque potentiel · hypothèse · simulé | Pills |
| Recorded execution | Activity / theatre | RELECTURE (recorded) vs EN DIRECT (local) | Amber vs green badge; the public site never shows EN DIRECT |
| Gateway / decision | `DEC`, `STATE_CLASS` | BLOQUÉ · PREUVES SUPPLÉMENTAIRES REQUISES · ÉLIGIBLE / PRÊT POUR REVUE HUMAINE · REJETÉ · SUSPENDU | Pills: `fail` red, `warn` amber, **`info` cyan for "eligible / ready for human review"** |
| Integrity check passed | `.pill.ok` | e.g. "recalcul identique", "fichier intact" | Green, reserved for checks that actually passed |

Green means **a check passed**. It never means approved: approval is a human act recorded elsewhere ("Prêt pour signature" ≠ "approuvé", `AGENTS.md`).

## Motion

- Movement represents recorded data (replays, routes) or orients the camera. No ambient decoration.
- Every animation has a `prefers-reduced-motion: reduce` path: replays jump to the end, transitions are removed.
- Replays are always labelled RELECTURE, with the compressed timescale stated.
- No animation library is used; CSS and `requestAnimationFrame` cover current needs (tool evaluation in `docs/development/CLAUDE_TOOLING_AUDIT.md`).

## Accessibility baseline

- `lang="fr"` on every page.
- Exactly one `main` and one `h1` per page (visually hidden in the app).
- `:focus-visible` outline `#79c0ff`.
- Range sliders and theme labels have a 24 px minimum target.
- **Contrast (computed 2026-10-15, WCAG 2 formula):** every token text colour on `--panel`, `--surface` and `--void` is at least 5.88:1 (`--muted` on `--surface`; `--ink` reaches 16:1). Every hard-coded dark-on-light pair is at least 9.7:1 (buttons, ENTER CORE, attribution, skip link). This treats translucent panels as solid. Text drawn directly on the map, placeholders and disabled states were not measured.
- Not yet done: screen-reader runs (VoiceOver/NVDA). Do not claim WCAG conformance.

## Known design debt (not changed in this pass)

- Three `:root` blocks and per-phase override layers in `index.html`. Consolidate the tokens into one block before any visual redesign.
- Two pill systems: corridor pills (`ok`/`warn`/`bad`, filled) and platform pills (`ok`/`warn`/`fail`/`info`, outlined).
- `research.html` and `privacy.html` palettes are separate from the app tokens.
- Information density in the inspector is high on mobile; a progressive-disclosure pass needs founder input on priorities.

## Changing the interface

1. Use existing tokens and the status vocabulary above.
2. Run the browser audits (`.claude/skills/core-browser-audit/`); the layout guard and accessibility checks must stay green.
3. After editing the inline script of `index.html`, run `node scripts/csp.mjs`. After editing `src/template.html` or `src/app.js`, run `node build.js`.
