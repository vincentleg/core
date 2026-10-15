# CORE — third-party services register (2026-10-15)

Only services actually used, verified from code (CSP, `src/feeds.js`, workflows) and the tooling audit. "Authorized" means founder use is documented. DPA availability is noted only where relevant, and none has been signed by CORE.

| Service | Purpose | Data sent | Personal data | Contract / DPA | Hosting | Cost | Founder authorization |
|---|---|---|---|---|---|---|---|
| GitHub (repository, Pages, Actions, API) | Code hosting, public site, scheduled collection, CI | Code, commits, visitor requests to Pages and the API | Visitor IP (GitHub logs); author identities | GitHub Terms (GitHub offers a DPA for paid organization plans; personal account, so not signed) | US | Free (public repo) | Yes (since Phase 0) |
| OpenFreeMap | Vector tiles and labels | Tile requests from visitors | IP, user agent | Service terms; no DPA | Provider's infrastructure | Free | Yes (map style, DATA_SOURCES) |
| NASA GIBS | Earth imagery on the landing page | Tile requests | IP | US government service terms | US | Free | Yes |
| AWS S3 (Terrain Tiles open dataset) | Terrain relief when enabled | Tile requests | IP | AWS Open Data terms | US | Free to the user | Yes |
| DataSF, NYC Open Data, USGS, NWS, SFMTA, SF agencies, Open-Meteo, CAISO | Public data sources (browser watch and/or Actions collection) | Queries; IP of the browser or Actions runner | IP (browser cases) | Each source's terms (DATA_SOURCES; FD09) | US / EU (Open-Meteo) | Free | Per source in DATA_SOURCES; NYC ATR **blocked** |
| Ollama (local) | Optional local model | Nothing leaves the machine (loopback) | — | MIT software | Local | Free | Yes (founder-approved) |
| Anthropic (Claude Code) | Development assistant | Repository code and docs in prompts | Possible author info | Consumer or Commercial Terms, per the founder's account | US | Founder's subscription (no new cost) | Yes (tooling audit, `903ea98`) |
| OpenAI (Codex) | Development assistant (Phases 9–13) | Repository code and docs | Possible author info | OpenAI terms, per the founder's account | US | Founder's account | Yes (history) |

**Not used:** analytics, error monitoring, email, authentication providers, payments, CDNs for code or fonts (all self-hosted), AI APIs in the public site.

**Rule:** no private CORE data is sent to any provider to test an integration (FD09, CLAUDE.md compliance rules).
