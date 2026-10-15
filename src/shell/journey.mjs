// CORE journey state — what links World, Dialogue, Vault, Labs, Experts, Communities and Arena for ONE user in ONE browser.
// It stores identifiers, counts and timestamps only: never idea text, titles or conversation content (those stay in the
// encrypted vault or in the session). Key: core.journey.v1 (localStorage, wrapped in try/catch).
const KEY = 'core.journey.v1';
export const STEPS = [
  ['world', 'Problème découvert dans CORE World'], ['dialogue', 'Dialogue avec un agent'], ['vault', 'Idée enregistrée (chiffrée)'], ['labs', 'Analyse CORE Labs'],
  ['revision', 'Proposition révisée'], ['review', 'Demande de revue préparée (experts fictifs)'], ['community', 'Communauté consultée (fictive)'], ['arena', 'Arène fictive'],
];
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
export function read(st = store()) { try { const v = JSON.parse(st?.getItem(KEY) || 'null'); return v && v.v === 1 ? v : { v: 1, problemId: null, ideaId: null, steps: {}, idea: null }; } catch { return { v: 1, problemId: null, ideaId: null, steps: {}, idea: null }; } }
// `idea` may only carry: versions, labsPresent, labsTotal, missingEvidence, reviewRequests, published (booleans and numbers).
const ALLOWED_IDEA = ['versions', 'labsPresent', 'labsTotal', 'missingEvidence', 'reviewRequests', 'published'];
export function mark(step, { problemId, ideaId, idea, at = new Date().toISOString() } = {}, st = store()) {
  if (!STEPS.some(([id]) => id === step)) throw Error(`étape inconnue : ${step}`);
  const j = read(st); j.steps[step] = at;
  if (problemId) j.problemId = String(problemId).slice(0, 120);
  if (ideaId) j.ideaId = String(ideaId).slice(0, 60);
  if (idea) j.idea = Object.fromEntries(ALLOWED_IDEA.filter(k => k in idea).map(k => [k, typeof idea[k] === 'boolean' ? idea[k] : Number(idea[k]) || 0]));
  try { st?.setItem(KEY, JSON.stringify(j)); } catch {}
  return j;
}
export function reset(st = store()) { try { st?.removeItem(KEY); } catch {} }
export function summary(j = read()) { return STEPS.map(([id, label]) => ({ id, label, at: j.steps[id] || null })); }
