# CORE V3 — economic model (exploratory, 2026-10-15)

**Status.**
- Every number here is a hypothesis for founder review. There are no customers, contracts, measured conversion rates or market studies.
- No billing exists, and none may be activated without approval.
- The model is code (`scripts/lib/economics.mjs`, tested), so each figure traces to a stated input: `node scripts/lib/economics.mjs` reproduces the table below.

## Principles (proposed, see the decision register)
1. **Free for basic participation:** explore, talk to public agents within fair use, submit observations and ideas, follow review status, accessibility. This is CORE Free, at €0.
2. **Optional extras only:** monetization covers comfort, cosmetics, computation, professional tools and institutional services. It never covers influence, authority, rankings or scientific credibility (`NEVER_FOR_SALE`, enforced by a test).
3. **Private conversations are never sold.**
4. **No paid tier grants approval or review authority.** Earned competencies (Observer, Investigator…) describe participation; they are not professional qualifications.

## Consumer tiers (indicative prices incl. VAT)
| Tier | €/month | Adds (summary; full list in `src/world/entitlements.mjs`) |
|---|---|---|
| CORE Free | 0 | World, basic avatar, both cameras, public agents (fair use), problems, contributions, history, review status, accessibility |
| CORE Plus | 2.99 | Wardrobe, hairstyles, accessories, presets, themes, saved routes, bookmarks, collections |
| CORE Premium | 6.99 | Advanced discovery, personal dashboard, geographic comparison, project organisation, visualisation, saved scenarios, research workspace, education |
| CORE Expert | 14.99 | Analytical workspace, extra compute, exports, scenario comparison, research tools, longer history, collaboration, authorized agent assistance |

## Institutional frameworks (custom contracts)
| Offer | Basis for price | Hard limits |
|---|---|---|
| CORE City | Scope (districts, datasets), agents and compute, support/SLA, integration with authorized municipal systems | No purchase of findings; citizen contributions stay public-interest; pilots before procurement |
| CORE Region | Number of jurisdictions, cross-city analyses, data licensing | Same |
| CORE Government | Deployment scope, compute, data licensing, security accreditation, SLA | No unrestricted access to private citizen data or to other countries' restricted systems; no suppression of public-interest findings; conflict-of-interest disclosure |
| CORE Enterprise (= Business, FD10 R2) | Private analytical environment, specialized agents, integrations, support | Private data isolated from public knowledge; initial potential focus: AI infrastructure, energy, cooling, water |
| CORE Creator & Research | Revenue share, licensing | **Deferred**: no marketplace before moderation, IP and security review |

## Scenarios (monthly, EUR, from `scripts/lib/economics.mjs`)
| Scenario | Monthly active users | Paying users | Revenue | of which consumer, net of VAT | Costs | Operating result | Consumer alone* |
|---|---|---|---|---|---|---|---|
| Conservative | 20,000 | 400 (2 %) | 10,130 | 1,797 | 26,102 | **−15,972** | −1,056 |
| Baseline | 150,000 | 5,250 (3.5 %) | 87,748 | 23,581 | 93,437 | **−5,689** | +3,769 |
| Optimistic | 1,000,000 | 50,000 (5 %) | 707,917 | 224,583 | 394,799 | **+313,118 (44 %)** | +105,285 |

\* Consumer net revenue minus payment fees, support, and the infrastructure, inference and moderation cost of **all** users, free included.

**Main assumptions:**
- Tier mix of paying users: 60 % Plus, 30 % Premium, 10 % Expert.
- Average EU VAT 20 %; card fees 2.9 % + €0.25.
- Cost per active user per month: infrastructure €0.04–0.06, inference €0.03–0.04, moderation €0.02–0.03.
- Contracts per year:

  | Scenario | Cities | Regions | Governments | Enterprises |
  |---|---|---|---|---|
  | Conservative | 1 × €40k | — | — | 1 × €60k |
  | Baseline | 5 × €60k | 1 × €150k | — | 4 × €80k |
  | Optimistic | 25 × €80k | 5 × €200k | 2 × €500k | 15 × €120k |

- Team: 3 / 8 / 25 full-time staff at €6.5–7.5k per month, fully loaded.
- Sales cost: 12–15 % of institutional revenue.
- Data licences and legal/compliance: as listed in the code.

**What the model says:**
- Under these assumptions, consumer subscriptions roughly pay for free users, not for the company.
- Institutional contracts carry the model.
- The conservative case is loss-making and needs funding.
- Inference cost per free user is the most sensitive lever for keeping free participation viable.

## Key risks
- **Conversion:** no evidence that 2–5 % of users would pay for cosmetics or tools.
- **Procurement:** public procurement cycles are long (often months to years).
- **Inference costs:** these could exceed the assumption if conversations use large models.
- **Tile and data dependencies:** OpenFreeMap has no SLA, and licensed realistic 3D data is costly.
- **Independence:** reputational risk if institutional revenue is seen to buy influence (mitigated by §4 of THREAT_MODEL).
- **Taxes:** VAT and digital-services rules vary by country.

## Validation experiments (none run; all need founder approval)
1. A willingness-to-pay survey with a cosmetic-only Plus tier, and no payment collected.
2. One city pilot under a no-cost research agreement, measuring the agent hours and inference cost per answered question.
3. Inference cost measured per conversation with small local models versus hosted models (cost observability first).
4. A low-bandwidth mode measured on a mid-range phone.

## Affordability and cost controls
- **Affordability:**
  - regional pricing by purchasing power;
  - free education and non-profit access;
  - public-interest sponsorship labelled as such;
  - institutional revenue cross-subsidising Free.
- **Cost controls:**
  - the economical rendering mode;
  - deterministic answers before any model;
  - small models for simple intents;
  - shared caches of public findings;
  - per-entitlement budgets and rate limits;
  - asynchronous analysis, with simulations on demand;
  - geographic streaming.
- **Ruled out:** unsafe model routing, provider-restriction bypass, and paid services activated without approval.
