# CORE V7 — tooling, licensing and costs

**Checked:** 2026-10-15, against official pages linked below.

**Budget rule:** $0. Nothing on this list was paid for, subscribed to or put on a free trial. No billing was activated and no payment method was added.

Prices are only quoted where an official page states them. A free plan is never treated as permission for a commercial public deployment.

## 1. Active in V7 (shipped in the repository or used at runtime)

| Tool | Purpose | Licence / commercial use | Credentials | Free-tier limits and lock-in | Cost estimate at 1k / 10k / 100k monthly users | Replacement | Founder approval needed? |
|---|---|---|---|---|---|---|---|
| **MapLibre GL JS 6.11.2** (vendored) | Globe, region and city map; custom 3D layer host | BSD-3-Clause; commercial OK | none | none; open source | $0 (self-hosted file) | — | no |
| **OpenFreeMap** public tiles ([site](https://openfreemap.org/)) | Vector tiles and glyphs (OpenStreetMap data) | Software MIT; data ODbL with attribution; commercial use allowed by the provider | none, no cookies | Free public instance, "no SLA"; no request limit stated; bulk downloads limited | $0 as long as the public instance tolerates the load. At 100k users, plan to **self-host** (OpenFreeMap is open source) on a CORE server: hosting cost to be quoted, not assumed | self-hosted OpenFreeMap / Planetiler tiles | yes, before relying on it in production |
| **NASA GIBS** Blue Marble ([docs](https://nasa-gibs.github.io/gibs-api-docs/)) | Planet-scale imagery | NASA open data; acknowledgement requested | none | public service, no SLA | $0 | static low-zoom tile set (public domain) | no |
| **AWS Terrain Tiles** ([registry](https://registry.opendata.aws/terrain-tiles/)) | Relief and hillshade ("Haute" quality only) | Public-domain US sources (3DEP/SRTM), credit lines | none ("no AWS account required") | AWS Open Data sponsorship, no SLA; about 4–6 MB per visit when enabled | $0 to CORE (AWS sponsors the bucket); bandwidth falls on the sponsor | self-hosted terrain tiles for the regions CORE covers | no |
| **three.js 0.186.1** (vendored bundle) | Avatars, street scene, studio, portrait | MIT | none | — | $0 | Babylon.js (Apache-2.0) | no |
| **Quaternius** Universal Base Characters and Universal Animation Library, Standard ([pack](https://quaternius.itch.io/universal-base-characters)) | Avatar bodies, hair, animations | CC0 1.0 per the pack page, itch.io metadata and the bundled licence files. The publisher's site also shows a newer "Quaternius Asset License" (commercial use allowed; no redistribution of the raw assets as a standalone pack) | none (free download, no account) | — | $0 | MakeHuman/MPFB (CC0 output) with Blender, or commissioned models | **yes, at the release gate:** confirm that publishing the `.glb` files in a public repository is acceptable. Use inside the product is allowed under either licence |
| **Inter 4.1** | UI typeface | SIL OFL 1.1 | none | — | $0 | IBM Plex Sans (already shipped) | no |
| **Lucide 0.545** (icon subset) | Icons | ISC | none | — | $0 | — | no |
| **Ollama** + an already-installed local model (qwen3:8b) | Optional local reformulation in Dialogue, off by default | Ollama MIT; Qwen3 Apache-2.0 | none | runs on the person's own computer | $0 to CORE. **A hosted model is not free:** serving 10k–100k users would need GPU servers or a paid API, which must be costed and approved | deterministic engine (default), llama.cpp | yes, for any hosted model |
| **GitHub Pages** (current hosting of `main`) ([limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)) | Static hosting | Free; **business sites and commercial SaaS are not allowed for free** | GitHub account (existing) | 1 GB site; soft bandwidth cap of 100 GB/month | V7 first visit transfers about 4.7 MB from CORE's own origin (uncompressed; less once gzip is applied): about 5 GB/month at 1k users, 47 GB at 10k, **470 GB at 100k, beyond the soft cap** | Cloudflare Pages (free plan; commercial terms to verify) or a paid CDN | yes, before any commercial launch |

## 2. Build-time and test tools (never shipped, installed outside the repository)

| Tool | Use | Licence |
|---|---|---|
| esbuild 0.25.10 | Bundling three.js | MIT |
| glTF Transform 4.5.1 + sharp | Avatar asset processing (WebP, quantisation, pruning) | MIT / Apache-2.0 |
| PGlite 0.3.8 (PostgreSQL 17.5 compiled to WebAssembly) | `scripts/backend-rls-check.mjs` | Apache-2.0 / PostgreSQL |
| Playwright 1.63.0 (WebKit 26.6, Firefox 155 builds) | Cross-engine smoke test | Apache-2.0 |
| CesiumJS 1.146.0 | Rendering spike only (removed) | Apache-2.0 |

## 3. Evaluated and not adopted

| Candidate | Finding | Decision |
|---|---|---|
| **Google Photorealistic 3D Tiles** ([docs](https://developers.google.com/maps/documentation/tile/3d-tiles)) | Needs a Cloud project **with a billing account** and an API key | Not evaluated (no approved $0 path). Possible future option on founder approval; the World code keeps rendering in one custom layer, so a licensed 3D Tiles source could be added there |
| **Cesium ion** ([pricing](https://cesium.com/platform/cesium-ion/pricing/)) | Free plan is "personal and non-commercial use" | Rejected for a commercial CORE |
| **CesiumJS without ion** | Spike: no buildings and no relief without ion; Blue Marble imagery is blurred at city scale; 3.0 s to ready against 1.0 s for MapLibre ([benchmark](RENDERING_BENCHMARK.md)) | Rejected for now. Revisit if CORE builds its own 3D Tiles from open data |
| MapTiler, OpenTopography | Need an account and API key | Not used (CORE's rule: no key, no account) |
| **Vercel** ([Hobby](https://vercel.com/docs/plans/hobby)) | Hobby plan is "non-commercial, personal use only" | Rejected for CORE's production; Pro is paid |
| **Supabase** ([pricing](https://supabase.com/pricing)) | Free: 500 MB database, 50,000 MAU, 5 GB egress, 1 GB storage, 2 projects, **paused after 1 week of inactivity**; Pro from $25/month | **Recommended backend once approved.** Not activated (needs an account). The schema in `backend/` follows its conventions |
| Neon, Drizzle, Prisma | Not needed: SQL-first schema, no ORM required yet | Deferred |
| React, React Three Fiber, Drei, shadcn/ui, Radix, Tailwind, React Bits, Storybook | CORE is vanilla ES modules with no runtime build step and a strict CSP. Adopting them means a bundler, a new runtime and rewriting tested modules, for no capability V7 needed | Not adopted. The design system is CSS tokens and vanilla components (`src/ui/`). Revisit only behind a measured spike |
| Motion, GSAP | CSS and WAAPI cover V7's motion; GSAP's "no-charge" licence is custom, not OSI | Not adopted |
| Figma | Account-based | Not used; the design system lives in code ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)) |
| Mixamo | Needs an Adobe account | Not used; Quaternius CC0 animations instead |
| Avaturn, MetaPerson / Avatar SDK | Accounts and paid SDK tiers for full features | Not adopted |
| Ready Player Me | Public service shut down | Excluded |
| VRM | Open format; available sample models are anime-styled | Not chosen (glTF with realistic proportions instead) |
| Vercel AI SDK, LangGraph, Mastra, MCP | Server-side orchestration frameworks; CORE's pipeline is small, deterministic and runs in the browser | Not adopted; the provider-agnostic interface is in `src/intelligence/` |

## 4. Costs CORE would face to scale (for founder decisions, not commitments)

| Scale (monthly users) | Static hosting | Map tiles | Accounts and database | Models |
|---|---|---|---|---|
| 1,000 | GitHub Pages is fine technically, but not for a commercial site | OpenFreeMap public | Supabase Free fits (50k MAU), but it pauses when idle | local opt-in only |
| 10,000 | ~50 GB/month: fits the soft caps; a commercial CDN plan to be chosen | public instance; monitor | Supabase Free limits (500 MB, 5 GB egress) will be tight → Pro (from $25/month) | hosted model needs a costed plan |
| 100,000 | ~470 GB/month → CDN required | self-host tiles | Pro plus compute add-ons; quote required | GPU or API budget required |

Nothing in this table is approved spending. Every move to a paid tier needs explicit founder authorisation.
