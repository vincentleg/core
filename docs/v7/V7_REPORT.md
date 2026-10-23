# CORE V7 — A Living Earth: delivery report and checkpoint (2026-10-15)

**Branch:** `v7/living-earth` (local), created from `v6/living-civilization` at `b7f9292`.
- Nothing was pushed, merged or deployed.
- Budget used: **$0**. No account, key, billing, trial or paid service.
- Constitution V1.1 and FD01–FD11 are unchanged.
- The founder's V7 brief authorised this design and engineering phase. `AGENTS.md` still says "pas de phase cosmétique" and has **not** been edited; updating that line is a founder decision.

## Launch locally
```sh
cd <the CORE repository folder>
python3 -m http.server 8000 --bind 127.0.0.1
# then open http://localhost:8000/world.html
# also:   /avatar.html  /dialogue.html  /me.html  /commons.html#knowledge  /world-classic.html (V6 World)
# quality: world.html?quality=high | balanced | low
# optional local model: start Ollama on this computer, then open the engine panel in Dialogue
```

## What was built
| Deliverable | Where | Status |
|---|---|---|
| Design system "Living Earth" | `src/ui/`, [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | done; every V3–V6 page inherits it |
| Four-destination navigation | `src/shell/nav.mjs` | done: Explorer · Créer · Collaborer · Mon CORE, all earlier sections contextual, TRUST always one click away; bottom bar on phones |
| Earth experience | `world.html`, `src/earth/` | done:<br>• planet (NASA imagery, atmosphere, starfield) → region (USGS relief) → city (OSM, problem markers) → human (3D street, real shadows);<br>• first-60-seconds onboarding;<br>• plain-language problem panel (Comprendre · Proposer · Collaborer);<br>• accessible list and search;<br>• "Ce que vous voyez" disclosure |
| Rendering benchmark | [RENDERING_BENCHMARK.md](RENDERING_BENCHMARK.md) | done: MapLibre + open data selected; CesiumJS without ion measured and rejected; Google 3D Tiles not usable at $0 |
| Avatar creator | `avatar.html` | done:<br>• 6 presets, 2 silhouettes, 8 skin tones, 6 hairstyles × 8 colours, beard;<br>• 3 tops, 3 bottoms, shoes, all colour-customisable;<br>• rotate (drag or keys), walk and talk previews;<br>• pseudonym and identity card |
| Avatars in the world | `src/earth/avatar3d.mjs` | done:<br>• CC0 rigged bodies, CORE-made clothing, idle/walk/jog/talk animations, true 1.74 m scale;<br>• third and first person, keyboard and touch joystick;<br>• the agent is a non-human hologram with a label |
| Dialogue & Research Studio | `dialogue.html` | done:<br>• Conversation and Studio modes over one session;<br>• paper dossier (known / unknown / proposed, 10 editable sections);<br>• source previews and contextual suggestions;<br>• consent-based encrypted saving (V6 logic kept) |
| Intelligence orchestration | `src/intelligence/` | done: deterministic by default; optional **local** model, streamed and **verified** before display; remote disabled |
| Mon CORE | `me.html` | done:<br>• 3D portrait, journey, private ideas (after unlock), followed problem;<br>• contribution history ("aucune revue humaine", "aucune réutilisation"), collaboration, learning, privacy;<br>• "Aucun impact réel établi" |
| Backend readiness | `backend/schema.sql`, [ARCHITECTURE.md](ARCHITECTURE.md) | schema plus a verified isolation check; **not deployed, no accounts** |
| Tooling, licensing, costs | [TOOLING_AND_COSTS.md](TOOLING_AND_COSTS.md) | done |
| Full journey | `scripts/v7-journey-audit.mjs` | 25/25 on desktop and phone |

## V6 → V7, visually
**Comparison sheet:** `<session scratchpad>/v7/shots/V6-vs-V7.png` (V6 left, V7 right: entry, street level, problem panel, dialogue, personal space). The scratchpad is temporary and local to this machine.

Per-step screenshots:
- `v7/audit/final-*.png` (desktop) and `v7/audit/final-m-*.png` (phone);
- cross-engine shots in `v7/xb/`;
- engine comparison in `v7/bench/compare.png`.

Screenshots are not committed (the integrity gate keeps media out of Git).

## Test results (this Mac, 2026-10-15)
| Check | Result |
|---|---|
| Node tests | **239/239** (225 at V6 start; +7 intelligence, +7 V7) |
| `node scripts/verify.mjs` (suite, integrity, anchors) | **passed** |
| V7 journey (Chromium 155), 1440×900 / 390×844 | **25/25** / **25/25**:<br>• 60 fps at street level;<br>• 3D layer 1.1–1.2 ms per frame;<br>• XSS inert;<br>• private phrase never stored in clear;<br>• only GET to this site and 3 reviewed map hosts |
| Cross-engine smoke (Playwright **WebKit 26.6**, **Firefox 155**), desktop and phone | **7/7** in every combination, 0 page errors |
| Backend isolation (PostgreSQL 17.5 via PGlite) | **18/18** (User B cannot read, modify, delete or overwrite User A's ideas; no self-grant; no self-review; export; deletion) |
| V6 regression audits | V6 journey **17/17** · Commons **35/35** · classic World **34/34** · main app **162/162** · negative **12/12** · lab 7 checks, 0 errors |
| Local model (qwen3:8b via Ollama) | verified answers pass; drafts saying "norme/conforme/requis/dangereux" are rejected and replaced by the cited answer |

**Honest notes:**
- The main-app audit failed once at "SF cinematic fly-to", then passed 162/162 on rerun. The likely cause is the cold-load connection resets described below. `index.html` is unchanged since V6.
- **Not tested:**
  - Safari itself (WebKit ≠ Safari);
  - real phones or real mobile GPUs;
  - screen readers;
  - long sessions;
  - production hosting.

## Security and privacy
- **CSP:** strict on every new page (`script-src 'self'`, no eval, no WebAssembly). World allows exactly OpenFreeMap, NASA GIBS and AWS Terrain Tiles; Dialogue additionally allows only `http://127.0.0.1:11434` (the local model).
- **Local model:** never probed unless the person opens the engine panel; personal data is screened out before anything reaches it.
- **New local data:** `core.avatar.v2` (appearance, pseudonym) and `core.intelligence.v1` (engine choice, never content). Both are listed and wipeable in TRUST.
- **Found and fixed:**
  - a background probe of the local model endpoint;
  - pages left blank on cold loads, when Python's dev server resets connections: fixed with a boot guard;
  - mobile navigation hidden by legacy CSS;
  - a historic-district polygon drawn as a park;
  - relief tiles dominating transfer;
  - MapLibre not drawing extrusions above zoom 20.

## Performance
| | High quality | Balanced (default on touch / low-memory devices) |
|---|---|---|
| Ready | ~1.0 s | ~0.5 s |
| Transfer, planet → city → human | 11.4 MB | 5.8 MB |
| Frame rate (headless, vsync-capped) | 60 at all scales | 60 at all scales |

Avatar assets total 2.3 MB and load only at human scale, in the studio or in Mon CORE.

## Genuine remaining limitations
1. **The city is not photorealistic.** Geometry is real (OSM); façades, materials and the sun are conventions, and the page says so. Photorealism needs licensed 3D tiles (billing).
2. **Avatars are stylised realism, not photoreal humans.** The free CC0 bodies have athletic "superhero" proportions only. Clothing is generated (fitted garments, no loose dresses or coats), and there are no facial expressions.
3. **No accounts.** Identity, ideas and history live in one browser. The backend is a verified schema only.
4. **Dialogue stays deterministic by default.** The local model is opt-in, slow (4–12 s), and limited to rewording cited claims. Free conversation is not generative.
5. **One place:** one corridor of San Francisco (37 recorded segments). Other cities need data reviews under FD09.
6. **Fictional participants:**
   - experts, communities, moderators, reviewers, debaters and pupils are fictional;
   - no multiplayer;
   - no real review, approval or impact.
7. **Not yet redesigned beyond the shared design system:** Knowledge graph explorer, Labs, Arena and Academy. Their logic and layouts are V6, restyled.
8. **Accessibility:** keyboard and reduced motion are supported. A screen-reader pass and a WCAG audit have not been done.
9. **Hosting terms:** GitHub Pages and Vercel Hobby do not allow a commercial SaaS for free. The avatar `.glb` files in a public repository need a founder licence check (CC0 per the packs, newer custom licence on the publisher's site).

## Next priorities (founder decisions first)
1. Decide how and whether to publish `upgrade/v2-hardening`, `v6/living-civilization` and `v7/living-earth` (FD11 and V2–V7 are local only), and the avatar-asset question.
2. Approve (or not) a Supabase project and counsel review, before any real account.
3. Real-device testing: an iPhone with Safari, an Android phone, a VoiceOver pass.
4. Redesign Knowledge, Labs and Arena as first-class workspaces on the new system.
5. Avatar quality: commission or build (Blender with MPFB, CC0) fuller outfits and natural proportions.

## Checkpoint
- **Commits on `v7/living-earth`:**

  | Commit | Content |
  |---|---|
  | `b09fcc7` | design system, navigation, avatars, World |
  | `555618c` | Dialogue and Intelligence |
  | `f109c7e` | Mon CORE, journey audit, mobile |
  | `6ca2c55` | backend readiness |
  | `8981dba` | boot guard |
  | `ad4eb3c` | performance |
  | `9a87196` | street buildings and staging |
  | `005ae43` | V7 tests |
  | `cb41854` | docs |
  | (this report) | delivery report |

- **Reproduce the checks:**
  - `node --test test/*.test.js`
  - `CORE_BASE=http://127.0.0.1:8000/ node scripts/v7-journey-audit.mjs <cdp-port> <out> [w h]`
  - `CORE_PGLITE=<pglite entry> node scripts/backend-rls-check.mjs`
