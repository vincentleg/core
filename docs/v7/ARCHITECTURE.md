# CORE V7 — architecture and backend readiness

## Front end (static, no runtime build step)
All pages are plain HTML with same-origin ES modules and a strict CSP: `script-src 'self'`, no eval, no WebAssembly, no inline scripts. A boot guard (`src/ui/boot-guard.mjs`) recovers cold loads on the local development server.

| Page | Destination | Modules |
|---|---|---|
| `world.html` | Explorer | `src/earth/app.mjs` (scales, onboarding, panel, list/search, human mode), `style.mjs`, `scene3d.mjs` (MapLibre custom 3D layer), `problem-view.mjs` (pure, tested) |
| `avatar.html` | Mon CORE | `src/earth/studio.mjs`, `avatar3d.mjs` (renderer), `avatar-config.mjs` (pure model, tested) |
| `dialogue.html` | Créer | `src/dialogue/room.mjs` (Conversation and Studio), `engine.mjs` (deterministic, V6 logic kept), `src/intelligence/*` |
| `me.html` | Mon CORE | `src/me/me.mjs` |
| `commons.html` | all | V4–V6 modules, unchanged logic, new shell and design system |
| `world-classic.html`, `index.html`, `corridor.html`, `research.html` | preserved | unchanged (V3–V6 and the scientific engine) |

**Avatar separation:**
- identity (pseudonym);
- appearance (a validated configuration);
- rendering (`avatar3d.mjs`);
- animation state (one mixer, named clips);
- profile (Commons identity);
- visibility (not public);
- cosmetics (none, and never for sale beyond appearance: `src/world/entitlements.mjs`).

## Intelligence (provider-agnostic, `src/intelligence/`)
```
question
  → safety screen (engine) + privacy check (no personal data to any model)
  → retrieval: CORE Knowledge (integrity-anchored records, deterministic)
  → provider: deterministic (default) | local model via Ollama on 127.0.0.1 (opt-in) | remote (disabled)
  → verifier: numbers and conversions, dates, legal/status vocabulary, overclaims, citations,
    explicit epistemic limits
  → disclosure: who formulated the answer, against which evidence, what is uncertain
```
- If the model's draft fails verification or the model is unavailable, the cited deterministic answer is shown, with the reasons.
- A model can only reword retrieved claims. It never approves, authorises or invents outcomes.
- Dialogue never probes for a local model unless the person opens the engine panel or has chosen it before.
- Local evaluation (qwen3:8b, this Mac): about 6 s to the first token on a cold model, then 4–12 s per verified answer. Every "norme/conforme/requis/dangereux" draft was rejected; careful drafts passed.

## Backend readiness (`backend/`, not deployed)
- **Target:** PostgreSQL with Supabase Auth conventions (`auth.uid()`, roles `anon`/`authenticated`). Portable to any PostgreSQL that provides an identity function.
- **Schema (`backend/schema.sql`):**
  - profiles (pseudonym, avatar appearance, adult-only age band);
  - **idea boxes holding ciphertext only:** the browser seals with AES-GCM and the database refuses a `plaintext` field or weak key derivation;
  - follows;
  - quarantined contributions;
  - roles, review decisions and an append-only audit log.
- **Security model:**
  - RLS enabled **and forced** on every table; deny by default;
  - owner-only access to private rows;
  - privileged actions only through audited `SECURITY DEFINER` functions: no self-grant, no self-review, no direct inserts of decisions;
  - data export and account deletion.
- **Verified locally:** `scripts/backend-rls-check.mjs` passes 18/18 in PostgreSQL 17.5 (PGlite), including that User B cannot read, modify, delete or overwrite User A's ideas.
- **Not done, and required before any public account:**
  - a real Supabase project, with founder approval and an account;
  - e-mail verification, password reset or passkeys, all handled by the auth provider;
  - rate limiting at the API gateway;
  - abuse prevention and anti-Sybil measures;
  - human moderation staffing;
  - counsel review (privacy notice, terms, minors, IP of ideas);
  - server-side input validation beyond the SQL checks;
  - penetration testing;
  - a migration system (plain SQL files, applied in order).
- **Ideas stay end-to-end encrypted:** cloud persistence would store the same ciphertext the browser already keeps. Losing the passphrase loses the ideas; that is a deliberate privacy trade-off to explain to users.

## Capacity assumptions
These are estimates for planning, not measurements of production.

| Users/month | Front end | Tiles | Database | Note |
|---|---|---|---|---|
| 1,000 | ~5 GB/month from CORE's origin | public OpenFreeMap | tiny (ciphertext boxes are a few KB) | no server needed beyond auth/DB |
| 10,000 | ~50 GB/month | public, monitored | well under 500 MB | auth MAU within free limits; commercial terms decide hosting |
| 100,000 | ~470 GB/month → CDN | self-hosted | a few GB | paid tiers; costs to be quoted |

Per-visit figures come from `RENDERING_BENCHMARK.md`: 4.7 MB from CORE's origin, uncompressed. Larger populations need a CDN, self-hosted tiles, read replicas and moderation capacity, each with its own budget decision.

## V7.2 — agent civilisation engine (branch `v72/agent-civilization`)

| Layer | Files | Role |
|---|---|---|
| Evidence | `scripts/housing-snapshot.mjs` → `data/sf-housing/` | DataSF housing records (PDDL / US public domain), aggregated where sensitive, with a manifest and hashes |
| Registry | `scripts/agents-civilization.mjs` → `data/agents/sf-civilization.json` | 508 identities: the 68 Phase 3 profiles kept verbatim plus 440 generated; 5 levels; 34 teams; 7 councils; virtual posts |
| Analyses | `src/civilization/analyses.mjs` | Cited findings computed from the snapshots; declared gaps; competing hypotheses; dissent |
| Missions | `src/civilization/missions.mjs` | Task graphs per mission (flagship: 23 tasks over all stages), record-by-record audits, council sessions, monitoring |
| Runtime | `src/civilization/runtime.mjs` | Deterministic event-driven scheduler:<br>• bounded concurrency;<br>• typed messages, hash-chained log, save/restore;<br>• cancellation, consent-gated human input;<br>• agent memory as an activity journal |
| Client | `src/civilization/client.mjs` | Browser runner: Web Locks single writer, 4 Hz ticks, pause/speed, `localStorage` persistence, cross-tab submission (BroadcastChannel) |
| World | `src/earth/agents-layer.mjs`, `civ-panels.mjs`, `agents3d.mjs`, `avatar3d.mjs` (holograms), `app.mjs` | Real / Agents / Hybride modes; agent, mission, activity, event and hierarchy panels; street-level holographic crowd with level of detail |
| Dialogue | `src/dialogue/team.mjs` | Team research mode: routing to specialists, evidence verifier, reviewer, coordinator; consent-gated contributions |
| Commons | `src/civic/ui-missions.mjs` | Mission views in Knowledge, Labs, Arena and Academy |

**Reasoning agents:** none by default. The only model path is the optional local model rewording a coordinator synthesis, one call at a time, verified before display. Every other agent output is deterministic computation on dated public data, and each page says so.

**Scaling path (not built):** move the runtime into a Web Worker or a server process, index agents spatially for city-wide queries, and keep the log in IndexedDB or PostgreSQL instead of `localStorage` (1,200-event window today).
