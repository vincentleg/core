// CORE World — exploratory consumer tiers and entitlements (V3 design, NOT active: no billing, no accounts).
// Prices are hypotheses for founder review. The invariant matters more than the prices: no tier can buy influence,
// authority, visibility in rankings or scientific credibility. A test enforces it.
export const FREE_CORE = ['explore-world', 'avatar-basic', 'navigation-first-third-person', 'public-agents-fair-use', 'public-science', 'problem-discovery', 'submit-observation', 'submit-idea', 'public-proposal-process', 'contribution-history', 'review-status', 'accessibility'];
export const TIERS = [
  { id: 'free', name: 'CORE Free', eurPerMonth: 0, adds: FREE_CORE },
  { id: 'plus', name: 'CORE Plus', eurPerMonth: 2.99, adds: ['wardrobe-extended', 'hairstyles-extra', 'accessories-cosmetic', 'appearance-presets', 'environment-themes', 'saved-routes', 'bookmarks-extended', 'collections'] },
  { id: 'premium', name: 'CORE Premium', eurPerMonth: 6.99, adds: ['discovery-advanced', 'personal-dashboard', 'geo-comparison', 'project-organisation', 'visualisation-advanced', 'saved-scenarios-extra', 'research-workspace', 'education'] },
  { id: 'expert', name: 'CORE Expert', eurPerMonth: 14.99, adds: ['analytical-workspace', 'compute-extra', 'exports-advanced', 'scenario-comparison', 'research-tools', 'analysis-history-extended', 'collaboration-advanced', 'agent-assistance-authorized'] },
];
// Capabilities that must never be sold, in any tier or institutional contract.
export const NEVER_FOR_SALE = ['vote-weight', 'ranking-boost', 'scientific-approval', 'review-authority', 'finding-suppression', 'priority-moderation', 'verified-badge', 'private-data-access', 'human-decision'];

export function entitlements(tierId) {
  const i = TIERS.findIndex(t => t.id === tierId);
  if (i < 0) throw Error(`tier inconnu : ${tierId}`);
  return new Set(TIERS.slice(0, i + 1).flatMap(t => t.adds));
}
