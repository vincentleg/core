# CORE V3 — The Living Earth: architecture (2026-10-15)

**Status.** This is a design for founder review, plus a working **local prototype** of one vertical slice (`world.html`).
- No public platform, accounts, server, payments or moderation exist.
- Constitution V1 art. 1 still calls World an "optional and distant B2C extension". Making the visual Earth the central product is **proposed amendment A1** in [DECISION_REGISTER.md](DECISION_REGISTER.md); it is not applied.

## 1. Current architecture (verified in the repository)

| Layer | What exists | Where |
|---|---|---|
| Holographic Earth | MapLibre GL JS 6.11.2 (vendored, SRI). OpenFreeMap vector tiles. Cyan/slate style. Procedural SF landmarks | `index.html`, `src/map-style.js`, `src/sf-world.js` |
| Agents | 82 registered profiles (35 executable, deterministic or local-model). Recorded missions. Replay theatre. Supervisor (local only) | `data/agents/registry.json`, `src/agents-world.js`, `src/civ-activity.js`, `scripts/civ*.mjs` |
| Evidence | Dated DataSF / NYC snapshots with SHA-256 manifests. Problems registry (98 entries, 4 knowledge statuses). Gateways that fail closed | `data/`, `src/engine.js`, `scripts/problems.mjs` |
| Governance | Constitution V1, FD01–FD10, gateway states. Human decision recorded locally only | `docs/` |
| Science lab | Bounded research engine with reproducible dossiers | `research.html`, `src/research*.js` |
| Hosting | Static GitHub Pages; no backend | — |

## 2. Proposed architecture (one Earth, two visual realities)

```
                ┌──────────────── Shared world model (single source of truth) ────────────────┐
                │  Geographic data (WGS84) · Evidence records · Problems · Agent state ·       │
                │  Human contributions · Decisions/authorizations · Simulations · Provenance   │
                └───────────────▲───────────────────────────▲───────────────────────────▲──────┘
                                │ read-only                 │ governed writes            │ entitlement checks
     ┌──────────────────────────┴───────┐   ┌───────────────┴──────────────┐   ┌─────────┴─────────┐
     │ CORE Intelligence (holographic)  │   │ CORE World (human avatars)   │   │ Business / City / │
     │ agents investigate, simulate,    │   │ explore, talk, contribute;   │   │ Region / Gov      │
     │ request review                   │   │ realistic radius around user │   │ workspaces        │
     └──────────────────────────────────┘   └──────────────────────────────┘   └───────────────────┘
                 Rendering never writes to the world model. Gateways and humans do.
```

**Component boundaries.** Each boundary is enforced in code, or marked as design only.

| Boundary | Rule | Prototype enforcement |
|---|---|---|
| Rendering ↔ data | Visual state (reveal, camera, avatar) never changes records | The reveal is a MapLibre `feature-state`, never written to data. `world-style.mjs` comment |
| Avatar ↔ agent conclusions | A user can submit a contribution; only governed review moves it | `contributions.mjs`: actor rules; agents cannot decide; votes and payment cannot move a state |
| Agents ↔ real world | Agents analyse; the gateway recalculates; humans authorize | Unchanged (`engine.js`, Constitution art. 4–5) |
| Public ↔ private | Conversations private and ephemeral; contributions local in the prototype | `app.mjs`: chat cleared on close; `core.world.v1` localStorage only |
| Business ↔ public science | Private enterprise data never enters public knowledge (FD10 R2) | Design only (no Business code) |
| Monetization ↔ authority | No tier buys influence, authority, ranking or credibility | `entitlements.mjs` + test |
| Geography ↔ restrictions | A policy list checked on every channel; fail closed | `geo-policy.mjs` (empty published list) checked on movement and teleport |

## 3. Geographic data model and coordinates

- **Truth:** every record keeps WGS84 longitude/latitude. Scene positions are derived, never stored.
- **Local frame:** an East-North-Up tangent plane in metres is anchored at an origin near the avatar (`geo.mjs`). Positions are recomputed from lng/lat every step, so error does not accumulate. Measured: a 1 km walk in 10 cm steps drifts under 0.5 m. Re-anchoring happens beyond 1 km.
- **Streaming:** MapLibre streams vector tiles. The prototype keeps a building/road cache within 250 m of the avatar, refreshed every 60 m or at most once a second as tiles arrive.
- **Altitude:** terrain is off in World (flat ground). The first-person camera is placed at 1.7 m with `calculateCameraOptionsFromCameraLngLatAltRotation`. Terrain-following is future work.

**Provenance record required for every geographic dataset** (design; existing CORE snapshots already carry most fields in `data/*/manifest.json`):

| Field | Example (prototype sources) |
|---|---|
| Source / provider | OpenStreetMap via OpenFreeMap tiles; DataSF Street Tree List (`tkzw-k3nq`); DataSF Sidewalk Widths (`4g86-grxu`) |
| Licence and attribution | ODbL 1.0 © OpenStreetMap contributors, OpenMapTiles; DataSF ODC-PDDL (`docs/DATA_SOURCES.md`) |
| Coverage / resolution | Planet / building footprints; Folsom–Howard corridor only |
| Acquisition and update dates | Tiles: provider schedule (not pinned); DataSF snapshot 2026-10-13; sidewalk widths from a 2014 study |
| Known limits | OSM heights and footprints vary; sidewalk records sit on the street centreline; tree canopy size is a display convention |
| Redistribution | Vector tiles are not redistributed by CORE; DataSF snapshots are redistributed under PDDL |
| Epistemic class | Observed (records) · approximate (procedural landmarks, canopy size, generic materials) · synthetic (none in World) |

## 4. Rendering pipeline (implemented in the prototype)

1. One MapLibre map with the holographic style, the same palette as `index.html`.
2. Each frame: move the avatar from input → collision test against building footprints → geo-policy check → camera (third person: pitch 72°, zoom 19.6; first person: eye at 1.7 m, pitch 86°).
3. **Reveal update**, at most every 0.4 m moved, or when the radius changes:
   - Buildings: distance from the avatar to each footprint → `reveal ∈ [0, 1]` (1 inside the radius, a linear fade across a 6 m band) → `feature-state`. A single building layer interpolates the colour from the holographic ramp to a neutral material palette. There is no doubled geometry, so no z-fighting.
   - Ground: a pavement disc of the radius.
   - Roads: tile geometry clipped exactly to the circle (`clipToCircle`) and drawn as asphalt with markings.
   - Trees: DataSF street trees within the radius become canopy discs; outside they stay cyan points.
   - Band: a blurred cyan ring at the edge.
4. **Quality modes:** "Haute" draws all of the above. "Économe" (default on phones) has no band, markings or trees.
5. **Not implemented:** shader dissolve, textures, photogrammetry, lighting per material, occlusion culling beyond MapLibre's own, WebGPU.

## 5. Avatar system
- **Presets:** 5 diverse adult presets as inline SVG (`avatars.mjs`), with outfit colour, hairstyle and a pseudonym. Stored only in `core.world.v1`. Appearance carries no status.
- **Display:** a DOM marker standing upright (billboard), with a walk cycle that is disabled under reduced motion.
- **Controls:**
  - Desktop: W/Z ↑, S ↓, A/Q ←, D →, Shift to run, C for camera, E to talk, Escape.
  - Mobile: a joystick plus large buttons.
  - Any device: a no-avatar mode, with normal map navigation and the full information panel.
- **Limits:** this is not a 3D rigged character, and there is no ground snapping on terrain. A real 3D avatar (glTF/VRM through a Three.js custom layer) is the next step, evaluated in [TECHNOLOGY_EVALUATION.md](TECHNOLOGY_EVALUATION.md).

## 6. Agent interaction model
- **Visibility:** an agent is visible only if it exists in the registry and is assigned to the problem shown. Prototype: `CORE-PUB-0036` (public space and sidewalks, deterministic, permission `analyze`).
- **Appearance:** a hexagonal artificial figure with an emblem and halo, never a human silhouette. The label says that its position is a virtual post, not a physical presence.
- **Card:** name, role, scope, status, investigation, problems assigned, evidence, proposals, simulations, review status and verified outcomes, all taken from records. "Aucun" is shown when none exist.
- **Conversation:** `dialogue.mjs` is deterministic and answers only from the records, with their sources. It is screened by `safety.mjs` and its memory lasts only for the current conversation. A local-model adapter (Ollama, local only) would plug in behind the same safety and grounding rules; it is **not enabled** in World.

## 7. Scientific evidence model (reused, not reinvented)
- **Epistemic labels:** the problem status vocabulary of `data/problems/registry.json` (observed, potential risk, hypothesis, simulated), the badge styles of `docs/DESIGN.md` and the gateway labels.
- **14-stage pathway:** the panel shows each stage as present (✓) or "non atteint". Missing stages are never filled in.
- **Contribution lifecycle:** `contributions.mjs` maps onto the gateway vocabulary: PREUVES SUPPLÉMENTAIRES REQUISES, ÉLIGIBLE À LA REVUE HUMAINE, REJETÉ with a reason. Authorization and implementation require an **authenticated authority**, which does not exist. Outcome verification requires an **independent reviewer**, which also does not exist.

## 8. Security model (summary; detail in [THREAT_MODEL.md](THREAT_MODEL.md))
- **Page restrictions:** a strict CSP (no inline script) and no network write.
- **Allowed requests:** only GET requests to the site itself and the tile service, both verified by `scripts/world-audit.mjs`.
- **Input screening:** proportional refusals, PII redaction, injection noted as inert, rate limits.
- **Geographic restrictions:** a policy list that fails closed. It is empty because no jurisdictional review has been done.

## 9. Economic architecture (detail in [ECONOMIC_MODEL.md](ECONOMIC_MODEL.md))
- **Entitlements:** `entitlements.mjs` defines tiers as additive entitlement sets, with a `NEVER_FOR_SALE` list enforced by a test.
- **Not built:** billing, accounts, metering and institutional tenancy.
- **Future metering:** compute and inference budgets per entitlement, reusing the existing agent `budget` fields (`maxTasks`, `maxMs`, `maxRecords`).
