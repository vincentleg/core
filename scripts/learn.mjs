// CORE controlled learning workflow (Phase 4). Agents and curators PROPOSE; only a human approves.
//   node scripts/learn.mjs                       identify gaps → fetch authorized sources → validate → propose (+ before/after evaluation)
//   node scripts/learn.mjs --curated             also queue the curated proposals in knowledge/curated-phase4.json
//   node scripts/learn.mjs --list                show proposals and their evaluations
//   node scripts/learn.mjs --approve prop-N --reviewer "human:Name"    promote (new version, history kept)
//   node scripts/learn.mjs --reject  prop-N --reviewer "human:Name"
//   node scripts/learn.mjs --rollback <docId> <version> --reviewer "human:Name"
// Writes data/knowledge/library.json and appends to data/knowledge/learning-log.json.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const KN = require('../src/knowledge.js'), ORG = require('../src/org.js'), LEARN = require('../src/learning.js');

const LIB = 'data/knowledge/library.json', LOG = 'data/knowledge/learning-log.json';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const K = KN.load(JSON.parse(fs.readFileSync(LIB, 'utf8'))), registry = ORG.buildRegistry();
const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, 'utf8')) : { version: 'core-learning-log-v1', entries: [] };
const now = new Date().toISOString();
const save = () => { fs.writeFileSync(LIB, JSON.stringify(K.lib, null, 1) + '\n'); fs.writeFileSync(LOG, JSON.stringify(log, null, 1) + '\n'); };
const reviewer = opt('--reviewer');
const show = p => `${p.id} [${p.status}] ${p.docId} — ${p.importance || '?'}${p.requiresHumanApproval ? ', approbation humaine requise' : ''} — par ${p.proposedBy}\n   ${(p.evaluation || []).map(e => `${e.agent}: ${e.before.score} → ${e.after.score}`).join(' ; ') || 'pas d’évaluation'}`;

if (args.includes('--approve') || args.includes('--reject')) {
  const id = opt('--approve') || opt('--reject'), p = KN.review(K, id, reviewer, args.includes('--approve') ? 'approve' : 'reject');
  log.entries.push({ at: now, action: p.status, proposal: id, docId: p.docId, reviewer, note: p.note || null }); save(); console.log(show(p));
} else if (args.includes('--rollback')) {
  const i = args.indexOf('--rollback'), d = KN.rollback(K, args[i + 1], Number(args[i + 2]), reviewer);
  log.entries.push({ at: now, action: 'rollback', docId: d.id, toVersion: Number(args[i + 2]), newVersion: d.version, reviewer }); save(); console.log(`${d.id} restauré : nouvelle version ${d.version}`);
} else if (args.includes('--list')) {
  for (const p of K.lib.proposals) console.log(show(p));
} else {
  const pendingDocs = new Set(K.lib.proposals.filter(p => p.status === 'pending').map(p => p.docId));
  const missions = fs.existsSync('data/missions/cognitive') ? fs.readdirSync('data/missions/cognitive').filter(f => f.endsWith('.json') && f !== 'index.json').map(f => JSON.parse(fs.readFileSync(`data/missions/cognitive/${f}`, 'utf8'))).map(m => ({ id: m.id, cognitive: m })) : [];
  const gaps = LEARN.identifyGaps({ registry, K, missions });
  console.log(`${gaps.length} lacune(s) identifiée(s)`);
  for (const g of gaps) {
    const entry = { at: now, action: 'gap', gap: g };
    if (!g.dataset) { entry.result = 'aucune source autorisée lisible par machine (rédaction humaine requise)'; log.entries.push(entry); console.log(`- ${g.text} → ${entry.result}`); continue; }
    const docId = `k-ds-${g.dataset}`;
    if (pendingDocs.has(docId) || K.lib.documents.some(d => d.id === docId)) { console.log(`- ${g.text} → déjà proposé ou présent`); continue; }
    const cand = await LEARN.retrieveCandidate(g, { now });
    if (!cand.ok) { entry.result = `échec de récupération : ${cand.reason}`; log.entries.push(entry); console.log(`- ${entry.result}`); continue; }
    const validation = LEARN.validateCandidate(K, g, cand);
    entry.candidate = { url: cand.url, provenance: cand.provenance }; entry.validation = validation;
    if (!validation.pass) { entry.result = 'rejeté par la validation'; log.entries.push(entry); console.log(`- ${g.text} → rejeté : ${validation.checks.filter(c => !c.pass).map(c => c.id).join(', ')}`); continue; }
    const p = LEARN.proposeLearning(K, registry, { gap: g, docId, change: cand.doc, provenance: cand.provenance, collections: [g.agent], proposedBy: g.agent, validation });
    entry.result = `proposition ${p.id}`; entry.proposal = p.id; log.entries.push(entry); pendingDocs.add(docId); console.log(`- ${g.text}\n  ${show(p)}`);
  }
  if (args.includes('--curated')) {
    const cur = JSON.parse(fs.readFileSync('knowledge/curated-phase4.json', 'utf8')).proposals;
    for (const c of cur) {
      if (pendingDocs.has(c.docId) || K.lib.documents.some(d => d.id === c.docId)) continue;
      const gap = { kind: 'curated', agent: c.collections[0], text: `Documentation de ${c.change.title} absente des collections concernées.` };
      const p = LEARN.proposeLearning(K, registry, { gap, docId: c.docId, change: c.change, provenance: { curated: 'knowledge/curated-phase4.json', source: c.change.url }, collections: c.collections, proposedBy: 'curator:phase-4-build', validation: null, newSource: c.newSource || null });
      log.entries.push({ at: now, action: 'curated-proposal', proposal: p.id, docId: c.docId }); console.log(`- curé : ${show(p)}`);
    }
  }
  save();
}
