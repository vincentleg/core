# CORE Design System — Living Earth (V7)

**Code:**
- tokens and components: `src/ui/living-earth.css`;
- icons: `src/ui/icons.mjs`;
- page-specific styles: `src/earth/*.css`, `src/dialogue/room.css`, `src/me/me.css`.

The system redefines the V3–V6 tokens, so every existing module inherits it without changes to its logic.

**Baseline:** screenshots of V6 in the session scratchpad (`v7/shots/v6/`). V7 screenshots are listed in the V7 report.

## Principles taken from reference products (principles only; no UI or assets copied)
- **Google Earth:** one continuous camera from planet to street. Scale changes are flights, not page changes. The Earth is the background of everything.
- **Apple Maps:** content floats over the map in translucent cards. The map keeps most of the screen. Labels and colours stay calm, and only data is saturated.
- **Scientific visualisation tools:** one colour per meaning, used the same way everywhere (evidence status). Measured values carry units and sources. Uncertainty sits next to the value, never in a footnote.
- **Research workspaces:** writing surfaces look like paper (warm, high-contrast, lots of whitespace). Conversation and document are side by side, and the same session is shown in two modes.
- **Avatar creators:** a lit stage with the character large and turning, options on one side, the result visible immediately, and an identity card that previews what others would see (in CORE: nothing public).

## Colour
| Role | Tokens | Rule |
|---|---|---|
| Immersive layer (night, ocean) | `--le-ink-950…700`, `--le-ocean-*` | Backgrounds, map, glass panels |
| Controlled cyan | `--le-cyan` | Data, focus rings, agents' world. **Never decoration** |
| Warm neutrals (the human layer) | `--le-sand-*`, `--le-paper-ink` | Primary buttons, paper documents (research dossier), the person's own messages |
| Evidence status | `--le-observed` cyan · `--le-risk` amber · `--le-hypothesis` violet · `--le-simulated` slate · `--le-fiction` rose | One meaning each, on every page and in the map legend |
| Feedback | `--le-ok`, `--le-warn`, `--le-danger` | State, never emphasis |

**Contrast (WCAG ratios, computed against `--le-ink-950`):**
- `--le-text` 17.9:1, `--le-text-2` 11.2:1, `--le-text-3` 6.3:1, cyan 12.0:1;
- on paper: ink 14.4:1, secondary text 5.2:1.

All of these meet AA for normal text. Over glass the effective background varies with the map, which is why panels use 72–90 % opaque glass.

## Typography
- **Inter (variable):** UI and reading. Display sizes run 34–64 px, weight 600, tracking −0.035 em. Titles run 17–25 px. Body text is 15 px with a 1.55 line height.
- **IBM Plex Mono:** identifiers, records and badges only.
- **Uppercase eyebrows** (11.5 px, +0.16 em) name the context ("Explorer", "Dossier de recherche").

## Layout and composition
- **World:** full-bleed Earth. Floating elements:
  - the scale stepper on the left;
  - search and the accessible list at the top;
  - the problem panel on the right;
  - the human-scale toolbar at the bottom;
  - the legend at the bottom left.
- **Document pages:** content up to 1080–1120 px wide, with contextual sub-navigation pills under the heading.
- **Dialogue:** the conversation on midnight and the dossier on paper. In Studio mode the proportions swap.
- **Phones:** the four destinations move to a bottom bar (always all four), panels become bottom sheets, and a touch joystick appears at human scale.

## Components (CSS classes)
| Component | Class |
|---|---|
| Global navigation | `.le-nav` |
| Contextual navigation | `.le-subnav` |
| Surfaces | `.le-glass` (floating), `.le-paper` (document), `.card` |
| Evidence and status | `.le-evidence`, `.le-badge[data-s]`, `.le-meter` (measured value vs threshold) |
| Agent identity | `.le-agent-id` (hexagon: agents are never drawn as people) |
| Progress and history | `.le-steps` (review progress), `.le-timeline` (contribution history) |
| Basics | `.le-chip`, `.le-metric`, `.le-eyebrow`, `.le-display`, `.le-lede` |
| Empty, loading and error states | `.le-empty`, `.le-skeleton`, `.le-error`; the boot guard message |

## Motion
- **Purposeful only:**
  - flights between scales (MapLibre `flyTo`);
  - panel entrance (`.le-enter`, 0.7 s, ease-out);
  - avatar idle, walk and talk;
  - the agent's breathing glyph;
  - the slow globe rotation before the journey starts.
- `prefers-reduced-motion`: flights become jumps; rotation, idle animation and transitions stop (global 1 ms override).

## Materials and camera (World)
- City scale: a midnight model. Architecture moves from blue (z ≤ 14.5) to warm stone (z ≥ 16.5), and a vertical gradient gives depth.
- Street scale:
  - real footprints with procedural façades (floors, glazing, ground-floor windows, cornices, sparse lit windows);
  - a sky-dome environment for glass reflections;
  - a fixed late-afternoon sun with soft shadows.
- Third person: zoom 21.7, pitch 74°, heading follows the avatar. First person: zoom 23, pitch 85°.

## Avatar aesthetics
- CC0 base characters with credible anatomy and stylised realism. The free bodies are the athletic "superhero" proportions; this is a known limitation.
- Eight skin tones built from two scanned bases.
- Six hairstyles, eight hair colours, and a beard option.
- CORE-made clothing: T-shirt, knit and jacket (with a placket); jeans, trousers and shorts; shoes with soles. All have fabric relief and sheen.
- Never a rank, status or paid advantage.

## Accessibility
- Skip links; visible focus rings; keyboard control of the map (outside human mode) and of the avatar (W/A/S/D, arrows, C, E, Esc).
- An accessible non-3D list of every recorded problem.
- `aria-live` toasts; radiogroups in the creator; reduced motion respected.
- **Not done:** screen-reader passes with VoiceOver/NVDA and a formal WCAG audit.
