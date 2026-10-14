# Phase 7 — security, privacy and legal-risk review

This review records what was checked and changed. It is **not** a legal opinion, and CORE makes **no compliance claim** (GDPR, CCPA or any other).

## 1. Content Security Policy

A `<meta http-equiv="Content-Security-Policy">` is written by `scripts/csp.mjs`. `--check` fails if the tag is stale, and a Node test runs it.

| Directive | Value | Why |
| --- | --- | --- |
| `default-src` | `'self'` | Everything not listed is refused |
| `script-src` | `'self'` + `https://unpkg.com` + the SHA-256 of the single inline script | Allows no `unsafe-inline` and no `unsafe-eval`. MapLibre is pinned (5.7.3) and loaded with **SRI** (`sha384-…`); the hash was confirmed identical on unpkg and jsDelivr |
| `style-src` | `'self' 'unsafe-inline'`, unpkg, Google Fonts | The interface uses inline style attributes. Removing them is a larger refactor (see §6) |
| `connect-src` | Map tiles (OpenFreeMap, AWS terrain, NASA GIBS), DataSF, USGS, NWS, GitHub API, local model ports `127.0.0.1:11434`, `localhost:11434`, `127.0.0.1:8080` | Only the hosts the code calls. **Open-Meteo (quarantined) is absent**, so even a mistaken call is refused, as verified in Chrome |
| `img-src` | `'self' data: blob:` + tile hosts | |
| `worker-src` / `child-src` | `blob:` | MapLibre workers |
| `object-src` | `'none'` | |
| `base-uri` / `form-action` | `'self'` | |

**Verified in Chrome 155:** the page loads with 0 CSP violations across landing, entry, data health and terrain. A deliberate `fetch` to an unlisted host and to Open-Meteo is refused and logged.

**Limits of a meta CSP:** no `frame-ancestors` (clickjacking protection needs a header), no reporting endpoint. GitHub Pages cannot set headers. `corridor.html` (the synthetic simulator) has no CSP yet.

## 2. DOM injection review

The code renders HTML with template strings:

- every interpolated value goes through `esc()`, which escapes `& < > " '`;
- the new Phase 7 modules (`civ.js`, `agents-world.js`) do the same.

**Finding fixed:** links from external feeds (RSS and API items) were escaped but not scheme-checked. An item with a `javascript:` URL would have produced a clickable link. `platform.js` now passes feed and knowledge links through `safeUrl` (https only, otherwise `#`), and `civ.js` does the same for problem evidence and GitHub run links. The CSP independently blocks `javascript:` navigation. A test locks the fix.

**Other links:**
- snapshot pages, record API links and licence URLs come from the repository's own manifest, which hooks and tests check;
- evidence URLs are built by code from dataset IDs.

**No dangerous constructs:** no `eval` or `new Function` and no inline event handlers in the page. `prompt()` is used only for the human reviewer's name in the scheduler; the value is escaped and must match `human:<name>`.

**SVG brand assets** contain no script and no external references (tested).

## 3. Secrets, endpoints and data

- **Integrity scan:** `scripts/integrity-check.mjs --all` reports 0 findings in 153 files. Hooks run on commit and push.
- **Public site:**
  - never probes a model endpoint (public mode);
  - no key, token or credential exists in the client;
  - the GitHub API is called unauthenticated, read-only, and only when the visitor opens "Santé des données".
- **No personal data is collected or produced by Phase 7:**
  - avatars are generic and have no faces;
  - machine IDs identify software profiles, not people;
  - the problems registry is derived from the existing public snapshot.

## 4. Privacy-relevant behaviour (facts, for a future legal review)

| Item | Fact |
| --- | --- |
| Cookies | None set by CORE |
| Browser storage | `localStorage`: browser-retrieved feed items and refresh settings. `sessionStorage`: `core.entered` (landing already seen). Nothing leaves the browser |
| Analytics / tracking | None |
| Third-party requests that expose the visitor's IP address and user agent to the provider | unpkg (MapLibre), Google Fonts, OpenFreeMap tiles, AWS S3 terrain tiles, NASA GIBS, data.sf.gov / USGS / NWS (when feeds refresh in the browser), api.github.com (data-health view) |
| Server-side processing | None (static GitHub Pages; GitHub's own logs apply) |

## 5. Legal-risk checklist (open items, not conclusions)

| # | Topic | Status / risk | Suggested action |
| --- | --- | --- | --- |
| 1 | GDPR (EU visitors): third-party requests disclose IP addresses. Google Fonts embedding has been found unlawful without consent by a German regional court (LG München I, 2022) | **Open risk** | Self-host the fonts (both families are under the SIL Open Font License) and consider self-hosting MapLibre. Then add a short privacy notice listing the remaining tile providers |
| 2 | CCPA/CPRA: no sale or sharing of personal information, no tracking | Low as described; **not assessed** by counsel | Privacy notice before any commercial launch |
| 3 | Imagery: NASA GIBS Blue Marble, NASA open-data policy, acknowledgement requested | Acknowledged on the landing page and in the attribution. No NASA endorsement is implied | Keep the acknowledgement; never use the NASA insignia |
| 4 | Map data: OSM (ODbL) via OpenFreeMap | Attribution present (MapLibre control) | Keep; check the OpenFreeMap terms before any commercial traffic |
| 5 | DataSF (ODC-PDDL), USGS/NWS (US public domain) | Eligible under `src/data-policy.js` | — |
| 6 | Open-Meteo (free API non-commercial) | Quarantined; now **also blocked by CSP** | — |
| 7 | Hosting: GitHub Pages terms exclude commercial SaaS and online-business hosting | Fine for a public prototype, not for a commercial launch | Choose eligible hosting before commercial use |
| 8 | Brand: "CORE" wordmark is original geometry. **No trademark search was done** | Open risk (common word) | Trademark clearance before commercial branding |
| 9 | AI transparency: model-assisted output is labelled; recorded runs are labelled "relecture"; no live execution on the public site | Consistent with honest-labelling goals; no specific AI-law assessment done | Review against the EU AI Act transparency duties if offered in the EU |
| 10 | Repository licence: none granted | Unchanged | Owner decision |

## 6. Not done (and why)

- **Removing `'unsafe-inline'` from `style-src`:** many inline style attributes; a mechanical refactor with UI risk, deferred.
- **Header-based CSP, HSTS and frame-ancestors:** impossible on GitHub Pages.
- **Self-hosting fonts and MapLibre:** recommended for privacy (item 1), deferred to keep the phase scoped.
- **Formal penetration test or accessibility audit:** not done.
