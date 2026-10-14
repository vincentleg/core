// World Problems Registry (Phase 7): derive problem records for San Francisco from the verified snapshot only.
//   node scripts/problems.mjs          → data/problems/registry.json
// Every problem carries a status that says what kind of knowledge it is:
//   observed        — a fact read directly from a public record (e.g. a measured 2014 sidewalk width below the BSP minimum)
//   potential-risk  — a deterministic detector flags a pattern in records (e.g. overlapping permit windows); not a confirmed harm
//   hypothesis      — a question an agent or the team raised that no CORE evidence answers yet
//   simulated       — output of an uncalibrated model (never presented as a measurement)
// Domains without integrated evidence are listed as "no evidence integrated", never as "no problem".
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../src/coord.js'), SIM = require('../src/sim-sidewalk.js');

const manifest = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
for (const d of manifest.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
if (Object.values(verified).some(v => v !== 'ok')) { console.error('Snapshot checksum mismatch: refusing to derive problems.'); process.exit(1); }
const ctx = C.buildContext({ manifest, data, verified }), asOf = manifest.generated_at;
const SRC = Object.fromEntries(manifest.datasets.map(d => [d.file.replace('.geojson', ''), d.page || `https://data.sf.gov/d/${d.id}`])); // dataset pages from the manifest
const label = r => `${r.street} ${r.from} → ${r.to}`;
const problems = [];
const add = p => problems.push({ city: 'san-francisco', asOf, ...p });

// 1. Observed: 2014 sidewalk width below the Better Streets Plan minimum for its class.
const sim = SIM.run(ctx);
for (const r of sim.rows.filter(x => x.below_bsp_min)) add({ id: `sidewalk-below-bsp-min:${r.cnn}`, domain: 'accessibility', status: 'observed', segment: r.cnn, place: label(r),
  title: 'Trottoir plus étroit que le minimum du Better Streets Plan', statement: `Largeur mesurée ${r.width_ft} ft (étude 2014) < minimum ${r.bsp_min_ft} ft pour la classe « ${r.bsp_class} ».`,
  evidence: [{ ref: r.sources.sidewalk, url: SRC.sidewalks }], metrics: { width_ft: r.width_ft, min_ft: r.bsp_min_ft }, caveat: 'Mesure de 2014 ; la largeur actuelle peut différer. Le minimum BSP est une règle de conception, pas une norme d’accessibilité.' });

// 2. Potential risks: deterministic discovery findings (overlaps, closures, moratoria, repeated works).
const { result } = C.run(ctx, C.DEFAULTS);
const KIND = { overlap: ['works-overlap', 'Chevauchement de chantiers entre organisations'], closure: ['works-during-closure', 'Fenêtres de permis pendant une fermeture SFMTA'], moratorium: ['works-in-moratorium', 'Permis débutant pendant un moratoire de chaussée'], repeated: ['repeated-works', 'Travaux répétés au même endroit'], opportunity: ['coordination-opportunity', 'Opportunité de coordination à venir'] };
for (const f of result.findings) { const [k, title] = KIND[f.type] || [f.type, f.title];
  add({ id: `${k}:${f.seg}`, domain: 'infrastructure', status: 'potential-risk', segment: f.seg, place: `${f.street} ${f.from} → ${f.to}`, title,
    statement: `${f.records.length} permis concernés${f.metrics.organisations ? `, ${f.metrics.organisations} organisations` : ''}${f.metrics.overlapDays ? `, ${f.metrics.overlapDays} jour(s) de chevauchement cumulé` : ''}.`,
    evidence: f.records.slice(0, 12).map(id => ({ ref: `permits:${id}`, url: SRC.permits })), metrics: f.metrics, validEvidence: !!(f.evidence && f.evidence.valid),
    caveat: f.caveat || 'Détection déterministe sur des fenêtres administratives ; ce n’est ni un incident constaté ni une infraction.' }); }

// 3. Simulated: plantable positions deferred by planned works (exploratory, uncalibrated model).
for (const r of sim.rows.filter(x => x.deferred_for_works > 0)) add({ id: `planting-deferred:${r.cnn}`, domain: 'nature', status: 'simulated', segment: r.cnn, place: label(r),
  title: 'Plantation à reporter à cause de travaux planifiés (simulation)', statement: `${r.deferred_for_works} emplacement(s) simulé(s) à reporter (modèle ${sim.model}, non calibré, empreinte ${sim.fingerprint}).`,
  evidence: [{ ref: r.sources.sidewalk, url: SRC.sidewalks }, ...r.sources.permits.map(ref => ({ ref, url: SRC.permits }))], metrics: { deferred: r.deferred_for_works }, caveat: 'Résultat d’un modèle exploratoire ; aucun emplacement réel n’a été vérifié.' });

// 4. Hypotheses raised in recorded missions that no CORE tool could answer (unfulfillable evidence requests).
const cogIdx = JSON.parse(fs.readFileSync('data/missions/cognitive/index.json', 'utf8'));
for (const m of cogIdx.missions) { const mc = JSON.parse(fs.readFileSync(`data/missions/cognitive/${m.id.replace(':', '-')}.json`, 'utf8'));
  for (const q of (mc.requests || []).filter(x => x.status === 'unfulfillable')) add({ id: `open-question:${m.id}:${q.id}`, domain: mc.target.domains[0] || 'general', status: 'hypothesis', segment: mc.target.segment, place: mc.target.label,
    title: 'Question ouverte sans preuve disponible', statement: q.need, raisedBy: q.agent, mission: m.id, evidence: [], caveat: 'Demande d’un agent dans une mission enregistrée ; aucune source CORE ne permet d’y répondre.' }); }

// 5. Phase 8: severity (declared rule, not validated), dates, related problems, interventions, assigned agents and
// investigation status from the recorded local operations (data/operations/log.json, scripts/supervisor.mjs).
const SEVERITY = {
  'sidewalk-below-bsp-min': p => { const d = p.metrics.min_ft - p.metrics.width_ft; return { level: d >= 3 ? 'élevée' : d >= 1 ? 'moyenne' : 'faible', basis: `écart au minimum BSP : ${d} ft (≥ 3 ft élevée, ≥ 1 ft moyenne)` }; },
  'works-overlap': p => { const d = (p.metrics && p.metrics.overlapDays) || 0; return { level: d >= 60 ? 'élevée' : d >= 14 ? 'moyenne' : 'faible', basis: `${d} jour(s) de chevauchement cumulé (≥ 60 élevée, ≥ 14 moyenne)` }; },
  'planting-deferred': p => ({ level: p.metrics.deferred >= 5 ? 'moyenne' : 'faible', basis: `${p.metrics.deferred} emplacement(s) simulé(s) (≥ 5 moyenne) — simulation non calibrée` }),
};
const INTERVENTIONS = {
  'works-overlap': 'Scénarios de coordination S1–S4 calculés par le laboratoire déterministe (non validés sur le terrain)',
  'coordination-opportunity': 'Regroupement des fenêtres de travaux (scénarios S1–S4, non validés)',
  'planting-deferred': 'Alternative A3 de la simulation : planter après les travaux (simulé, non calibré)',
};
const ops = fs.existsSync('data/operations/log.json') ? JSON.parse(fs.readFileSync('data/operations/log.json', 'utf8')) : null;
const STATUS_FR = { 'awaiting-human': 'analysé — revue humaine requise', 'needs-evidence': 'analysé — preuves supplémentaires requises', completed: 'revu par un humain', rejected: 'rejeté par la passerelle', failed: 'échec de l’analyse', cancelled: 'annulé' };
const retrieved = Object.fromEntries(manifest.datasets.map(d => [d.file.replace('.geojson', ''), d.retrieved_at]));
for (const p of problems) {
  const kind = p.id.split(':')[0], sev = SEVERITY[kind];
  p.severity = sev ? { ...sev(p), method: 'règle déclarée par CORE (non validée)' } : { level: 'non évaluée', basis: 'aucune méthode de sévérité définie pour ce type', method: null };
  p.observedAt = p.status === 'hypothesis' ? null : retrieved[(p.evidence[0] || { ref: '' }).ref.split(':')[0]] || asOf;
  p.lastVerified = asOf; // snapshot whose SHA-256 checksums were verified when this registry was generated
  p.related = p.segment ? problems.filter(o => o !== p && o.segment === p.segment).map(o => o.id) : [];
  p.interventions = INTERVENTIONS[kind] ? [{ label: INTERVENTIONS[kind], status: 'proposition (non vérifiée)' }] : [];
  p.confidence = { observed: 'élevée pour le fait enregistré ; actualité non vérifiée', 'potential-risk': 'moyenne : motif administratif, impact non mesuré', simulated: 'faible : modèle non calibré', hypothesis: 'aucune : question ouverte' }[p.status];
  p.humanDecision = 'aucune décision humaine enregistrée';
  const task = ops && ops.tasks.find(t => t.problems.includes(p.id));
  p.investigation = task ? { task: task.id, state: task.state, label: STATUS_FR[task.state] || task.state, mission: task.result && task.result.mission, fingerprint: task.result && task.result.fingerprint, decision: task.result && task.result.decision, at: task.updated } : { task: null, state: p.status === 'hypothesis' ? 'no-tool' : 'not-started', label: p.status === 'hypothesis' ? 'aucun outil CORE ne peut y répondre' : 'non investigué' };
  p.assignedAgents = [...new Set([...(p.raisedBy ? [p.raisedBy] : []), ...(task ? task.agents.map(a => a.id) : [])])];
}

// 6. Domains with no integrated evidence: stated explicitly.
const covered = new Set(problems.map(p => p.domain));
const gaps = ['air-quality', 'noise', 'flooding', 'heat', 'transit', 'traffic-safety', 'energy-grid', 'water-network', 'housing', 'public-health'].filter(d => !covered.has(d)).map(d => ({ domain: d, status: 'no-evidence-integrated' }));

const byStatus = problems.reduce((o, p) => ({ ...o, [p.status]: (o[p.status] || 0) + 1 }), {});
const out = { version: 'core-problems-registry-v1', generatedBy: 'scripts/problems.mjs', snapshot: asOf, 
  statuses: { observed: 'lu directement dans un registre public', 'potential-risk': 'motif détecté de façon déterministe, non confirmé', hypothesis: 'question ouverte sans preuve', simulated: 'sortie d’un modèle non calibré' },
  counts: byStatus, problems, gaps };
out.fingerprint = C.fingerprint({ snapshot: asOf, problems: problems.map(p => [p.id, p.status]) });
fs.mkdirSync('data/problems', { recursive: true });
fs.writeFileSync('data/problems/registry.json', JSON.stringify(out, null, 1) + '\n');
console.log(`data/problems/registry.json: ${problems.length} problems ${JSON.stringify(byStatus)}; ${gaps.length} domains without evidence; fingerprint ${out.fingerprint}`);
