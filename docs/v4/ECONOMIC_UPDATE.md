# CORE V4 — updated economic assumptions (2026-10-15)

This extends [docs/v3/ECONOMIC_MODEL.md](../v3/ECONOMIC_MODEL.md). The model is code: `node scripts/lib/economics.mjs` reproduces every number below. **All inputs are hypotheses** — there is no customer, contract, price test or measured conversion. No payment exists or may be activated without approval.

## What changed in V4
- **Schools** as an institutional line (hypothesis: €6,000 per school per year; 0 / 20 / 200 schools by scenario). Schools are never charged per pupil for civic participation, and minors are never targeted with purchases.
- **Security** (€0.01) and **storage** (€0.005) per monthly active user added to cost of revenue.
- **Gross margin** (revenue minus cost of revenue: infrastructure, inference, moderation, payment fees, support, data licences, security, storage) is now separated from **operating result** (which also deducts personnel, sales and legal/compliance).
- **Working-capital need**: institutional invoices are assumed to be paid about 60 days after issue, so cash lags revenue even when the operating result is positive. Operating result ≠ cash flow (taxes, investment and timing also differ).

## Scenarios (monthly, EUR)
| Scenario | Revenue | Gross margin | Total costs | Operating result | Working capital tied up |
|---|---|---|---|---|---|
| Conservative | 10,130 | 69 % | 26,402 | **−16,272** | ≈ 16,700 |
| Baseline | 97,748 | 75 % | 97,187 | **+561** (≈ break-even) | ≈ 148,300 |
| Optimistic | 807,917 | 82 % | 421,799 | **+386,118** | ≈ 1,166,700 |

## Reading
- Free participation costs about €0.11–0.15 per active user per month (infrastructure, inference, moderation, security, storage), depending on scenario. Consumer subscriptions roughly cover it; institutional contracts fund the rest of the organisation.
- The baseline only breaks even with 30 institutional contracts (5 cities, 1 region, 4 enterprises, 20 schools). The conservative case needs external funding.
- Monetization limits (`NEVER_FOR_SALE`) are unchanged by V4. Vault, Labs basics, Arena participation and Academy for schools stay outside consumer paywalls; Labs extras (compute, exports) fit the Expert tier.

## Validation experiments (none run; need approval)
Pricing interviews with 5 school leaders (no data from children); one city research agreement measuring cost per answered question; inference cost per Labs analysis if a model is ever used.
