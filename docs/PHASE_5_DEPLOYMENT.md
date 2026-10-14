# Phase 5 — public deployment

**URL:** https://vincentleg.github.io/core/ (HTTPS enforced)

**Provider:** GitHub Pages, deployed from branch `main`, repository root, with `.nojekyll`. Enabled 2026-10-14 through the GitHub API with the founder's existing token. No new account, credential or service.

## Zero-cost verification (docs.github.com, checked 2026-10-14)

1. **Provider:** GitHub Pages.
2. **Free-tier terms:** available for public repositories on GitHub Free. The repository is public.
3. **Intended use:** Pages hosts sites "about yourself, your organization, or your project". It is **not** allowed as free hosting for an online business, e-commerce or commercial SaaS. CORE is a project and prototype site with no transactions, accounts or sales, which is eligible today. **If CORE becomes a commercial service, it must move.**
4. **Limits:** 1 GB per site (CORE is far below), 100 GB/month soft bandwidth, soft limit of 10 builds/hour.
5. **Overages:** Pages has no metered billing. Limits are enforced by throttling or contact, not by charges.
6. **Billing:** none required; no payment method was used.
7. **Paid features:** none enabled; no custom domain.
8. **Automatic deployment:** every push to `main` rebuilds the site. Verified: the build reached status `built` after enabling.
9. **Public site verified** in Chrome 155 headless: the app is ready; public mode means no localhost model probe; the browser simulation matches the Node fingerprint; the guided demo opens a recorded live mission; the dossier renders; 0 uncaught errors.
10. **Remaining risks:**
    - GitHub may throttle at high traffic.
    - Visitors' browsers call the public CORS APIs (DataSF, USGS, NWS) only when they click "refresh"; auto-refresh is off by default on the public site.

## GitHub integration

- **Single source:** `main` is the source of truth.
- **Data refresh:** the scheduled data workflow `city-feed.yml` pushes data commits; each triggers one Pages build. There is no loop, because Pages builds never commit.
- **Secrets:** none; the workflow uses only the built-in `GITHUB_TOKEN` with `contents: write`.
- **Visible failures:** Actions run failures show in the Actions tab.

## What the public site does not do

- It never contacts any model endpoint.
- Model-assisted missions are shown as **recorded real executions** (qwen3:8b on the founder's Mac).
- Live runs require local Ollama on the founder's machine (`python3 -m http.server`, then open `localhost:8000`).
