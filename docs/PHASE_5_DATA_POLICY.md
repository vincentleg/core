# Phase 5 — public-data eligibility and provenance policy

Machine-readable and enforced: `src/data-policy.js` (verified 2026-10-14).

**Fields per source:** publisher, official URL, licence or permitted-use basis, access method, public availability, sensitivity, redistribution constraints, verification date, allowed use, and status (eligible / quarantined / excluded).

## Enforcement

- `scripts/city-feed.mjs` and the in-browser refresh only request eligible, enabled sources, and purge items from any other source before publication.
- The deterministic agent **data-eligibility reviewer** (`policy.check`) checks every evidence reference of each model-assisted mission.
- Tests require an entry for every snapshot dataset, feed source and knowledge source.

## Decisions

| Source | Status | Basis |
| --- | --- | --- |
| DataSF datasets (12 snapshot datasets, 7 feeds) | eligible | ODC-PDDL. 311 and business registrations are **aggregated counts only**; applicant, owner and planner names are never requested; contact details are redacted |
| USGS, NWS | eligible | U.S. public domain |
| CAISO Today's Outlook | eligible, with attribution | caiso.com terms: public materials may be used with proprietary notices kept and the California ISO credited. Shown as statewide context, never as San Francisco data |
| Agency RSS feeds (SFMTA, Public Works, SFPUC, Rec & Parks, SF Fire) | eligible | Titles, dates and links only; summaries clipped; emails and phone numbers redacted |
| Legistar web API | eligible (historical) | Collection retired (API frozen since 2020) |
| **Open-Meteo air quality** | **quarantined** | The free API may only be used non-commercially; CORE is an investor-facing company prototype, and paid plans are excluded by the $0 rule. Collection stopped; items purged from the published feed |
| Individual 311 requests, police incidents, business owner names, BART key, utility network maps | **excluded** | Personal data, unnecessary for CORE, credential-gated, or security-sensitive |

**Infrastructure sensitivity:** CORE publishes permit windows and organisations already published by the City. It publishes no underground network maps or security-relevant operational details.

**Scans:** `node scripts/integrity-check.mjs --all` reports 0 findings across all tracked files, with 6 documented hashed exceptions (founder contact line, workspace path, synthetic fixtures).
