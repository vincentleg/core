import { T, BL } from '../i18n/i18n.mjs';
// CORE Knowledge graph (V6): a small, real graph built ONLY from recorded fields. Every edge type has a stated meaning;
// no edge is causal. Contributions (local, candidate) can be attached for the author's own view; private ideas never are.
export const EDGES = BL({
  'located-at': ['the problem is recorded on this street segment (CNN identifier)', 'le problème est enregistré sur ce tronçon de rue (identifiant CNN)'],
  cites: ['the problem cites this record as evidence', 'le problème cite cet enregistrement comme preuve'],
  'from-dataset': ['the record comes from this public dataset (verified fingerprint)', 'l’enregistrement provient de ce jeu de données public (empreinte vérifiée)'],
  'assigned-to': ['the problem is routed to this agent (routing, not verified competence)', 'le problème est routé vers cet agent (routage, pas compétence vérifiée)'],
  'listed-related': ['the problem registry lists these problems as related (same segment), with no causal link', 'le registre des problèmes liste ces problèmes comme liés (même tronçon), sans lien de cause'],
  'same-segment': ['both problems concern the same segment (co-location, not causality)', 'les deux problèmes portent sur le même tronçon (co-localisation, pas causalité)'],
  'about': ['a candidate contribution (unverified, local) concerns this problem', 'une contribution candidate (non vérifiée, locale) porte sur ce problème'],
});
const node = (id, type, label, extra = {}) => ({ id, type, label, ...extra });

export function build(ix, { contributions = [] } = {}) {
  const nodes = new Map(), edges = [];
  const add = n => { if (!nodes.has(n.id)) nodes.set(n.id, n); return n.id; };
  const link = (from, to, type) => { if (!EDGES[type]) throw Error(T(`unknown edge type: ${type}`, `type d’arête inconnu : ${type}`)); edges.push({ from, to, type }); };
  for (const [k, f] of Object.entries(ix.files)) if (f.meta) add(node(`dataset:${k}`, 'dataset', f.meta.title, { url: f.meta.page, integrity: f.integrity, provider: f.meta.provider }));
  for (const p of ix.problems) {
    add(node(`problem:${p.id}`, 'problem', p.title, { status: p.status, place: p.place || '', domain: p.domain }));
    if (p.segment) link(`problem:${p.id}`, add(node(`segment:${p.segment}`, 'location', `${String(p.place || '').split(' → ')[0] || T('Segment', 'Tronçon')} (CNN ${p.segment})`, { segment: p.segment })), 'located-at');
    for (const e of p.evidence) {
      const r = ix.records.get(e.ref); if (!r) continue;
      const rid = add(node(`record:${e.ref}`, 'evidence', r.kind === 'sidewalk' ? T(`Sidewalk survey ${r.record_id}`, `Relevé trottoir ${r.record_id}`) : T(`Permit ${r.permit_number || r.record_id}`, `Permis ${r.permit_number || r.record_id}`), { url: e.url, kind: r.kind }));
      link(`problem:${p.id}`, rid, 'cites'); link(rid, `dataset:${e.ref.split(':')[0]}`, 'from-dataset');
    }
    for (const a of p.assignedAgents || []) { const g = ix.agents.find(x => x.id === a); if (g) link(`problem:${p.id}`, add(node(`agent:${g.id}`, 'agent', `${g.code} — ${g.role}`)), 'assigned-to'); }
    for (const rel of p.related || []) if (ix.problems.some(q => q.id === rel)) link(`problem:${p.id}`, `problem:${rel}`, 'listed-related');
  }
  const bySeg = {}; for (const p of ix.problems) if (p.segment) (bySeg[p.segment] ||= []).push(p.id);
  for (const ids of Object.values(bySeg)) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!edges.some(e => e.type === 'listed-related' && ((e.from === `problem:${ids[i]}` && e.to === `problem:${ids[j]}`) || (e.from === `problem:${ids[j]}` && e.to === `problem:${ids[i]}`)))) link(`problem:${ids[i]}`, `problem:${ids[j]}`, 'same-segment');
  for (const c of contributions) if (c.problemId && nodes.has(`problem:${c.problemId}`)) link(add(node(`contribution:${c.id}`, 'contribution', c.claim.slice(0, 60), { state: c.state, local: true })), `problem:${c.problemId}`, 'about');
  return { nodes, edges };
}
export const neighbours = (g, id) => g.edges.filter(e => e.from === id || e.to === id).map(e => ({ type: e.type, meaning: EDGES[e.type], dir: e.from === id ? 'out' : 'in', node: g.nodes.get(e.from === id ? e.to : e.from) })).filter(x => x.node);

const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Plain search over recorded labels (problems, evidence, agents, locations). Returns nodes with a reason.
export function search(g, q, limit = 20) {
  const t = norm(q).split(/\s+/).filter(w => w.length >= 2); if (!t.length) return [];
  const hits = [];
  for (const n of g.nodes.values()) {
    if (n.local) continue;
    const hay = norm(`${n.label} ${n.place || ''} ${n.id} ${n.domain || ''}`), score = t.filter(w => hay.includes(w)).length;
    if (score === t.length) hits.push({ node: n, score, why: n.type === 'problem' ? T('all words found in the problem title or place', 'tous les mots trouvés dans le titre ou le lieu du problème') : T('all words found in the label', 'tous les mots trouvés dans le libellé') });
  }
  return hits.sort((a, b) => b.score - a.score || (a.node.type === 'problem' ? -1 : 1)).slice(0, limit);
}
