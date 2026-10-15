// CORE V3 — exploratory unit-economics model. Every input below is a HYPOTHESIS chosen for discussion, not data:
// there is no market validation, no customer, no signed contract and no measured conversion. Monthly figures, EUR.
// `node scripts/lib/economics.mjs` prints the three scenarios; docs/v3/ECONOMIC_MODEL.md explains them.
export const PRICES = { plus: 2.99, premium: 6.99, expert: 14.99 }; // consumer prices incl. VAT (EU web sale)
export const SHARED = {
  vat: 0.20,                        // average EU VAT on digital services (country-dependent: 17–27 %)
  paymentPct: 0.029, paymentFixed: 0.25, // card processing order of magnitude for EU cards; varies by provider
  tierMix: { plus: 0.6, premium: 0.3, expert: 0.1 },
};
export const SCENARIOS = {
  conservative: { mau: 20000, paidConversion: 0.02, infraPerMau: 0.06, inferencePerMau: 0.04, moderationPerMau: 0.03, supportPctOfConsumer: 0.05,
    contracts: { city: [1, 40000], region: [0, 150000], government: [0, 500000], enterprise: [1, 60000] }, salesPctOfInstitutional: 0.15,
    team: { fte: 3, loadedMonthly: 6500 }, dataLicences: 0, legalCompliance: 2500 },
  baseline: { mau: 150000, paidConversion: 0.035, infraPerMau: 0.05, inferencePerMau: 0.035, moderationPerMau: 0.025, supportPctOfConsumer: 0.05,
    contracts: { city: [5, 60000], region: [1, 150000], government: [0, 500000], enterprise: [4, 80000] }, salesPctOfInstitutional: 0.15,
    team: { fte: 8, loadedMonthly: 7000 }, dataLicences: 2000, legalCompliance: 6000 },
  optimistic: { mau: 1000000, paidConversion: 0.05, infraPerMau: 0.04, inferencePerMau: 0.03, moderationPerMau: 0.02, supportPctOfConsumer: 0.04,
    contracts: { city: [25, 80000], region: [5, 200000], government: [2, 500000], enterprise: [15, 120000] }, salesPctOfInstitutional: 0.12,
    team: { fte: 25, loadedMonthly: 7500 }, dataLicences: 10000, legalCompliance: 20000 },
};
const r0 = x => Math.round(x);
// Annual contract values are converted to monthly revenue. Free users cost money and pay nothing: that is the model.
export function run(s, shared = SHARED, prices = PRICES) {
  const payers = s.mau * s.paidConversion;
  const byTier = Object.fromEntries(Object.entries(shared.tierMix).map(([t, share]) => [t, payers * share]));
  const grossConsumer = Object.entries(byTier).reduce((a, [t, n]) => a + n * prices[t], 0);
  const netConsumer = grossConsumer / (1 + shared.vat);
  const payment = Object.entries(byTier).reduce((a, [t, n]) => a + n * (prices[t] * shared.paymentPct + shared.paymentFixed), 0);
  const institutional = Object.fromEntries(Object.entries(s.contracts).map(([k, [n, annual]]) => [k, n * annual / 12]));
  const instTotal = Object.values(institutional).reduce((a, b) => a + b, 0);
  const revenue = netConsumer + instTotal;
  const costs = { infrastructure: s.mau * s.infraPerMau, inference: s.mau * s.inferencePerMau, moderation: s.mau * s.moderationPerMau,
    payment, support: netConsumer * s.supportPctOfConsumer, sales: instTotal * s.salesPctOfInstitutional,
    personnel: s.team.fte * s.team.loadedMonthly, dataLicences: s.dataLicences, legalCompliance: s.legalCompliance };
  const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
  const freeUserCost = s.infraPerMau + s.inferencePerMau + s.moderationPerMau;
  return { payers: r0(payers), arppuNet: payers ? netConsumer / payers : 0, revenue: { consumerNet: r0(netConsumer), ...Object.fromEntries(Object.entries(institutional).map(([k, v]) => [k, r0(v)])), total: r0(revenue) },
    costs: Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, r0(v)])), totalCosts: r0(totalCosts),
    operatingResult: r0(revenue - totalCosts), operatingMargin: revenue ? (revenue - totalCosts) / revenue : 0,
    consumerOnlyContribution: r0(netConsumer - payment - s.mau * freeUserCost - netConsumer * s.supportPctOfConsumer),
    freeUserMonthlyCost: freeUserCost };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, s] of Object.entries(SCENARIOS)) {
    const o = run(s);
    console.log(`${name.padEnd(12)} MAU ${s.mau.toLocaleString('fr-FR').padStart(9)} · payants ${String(o.payers).padStart(6)} · revenu ${o.revenue.total.toLocaleString('fr-FR').padStart(10)} €/mois (grand public net ${o.revenue.consumerNet.toLocaleString('fr-FR')}) · coûts ${o.totalCosts.toLocaleString('fr-FR').padStart(10)} · résultat ${o.operatingResult.toLocaleString('fr-FR').padStart(10)} (${(o.operatingMargin * 100).toFixed(0)} %) · contribution grand public seule ${o.consumerOnlyContribution.toLocaleString('fr-FR')}`);
  }
}
