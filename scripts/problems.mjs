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
  evidence: [{ ref: r.sources.sidewalk, url: SRC.sidewalks }], caveat: 'Mesure de 2014 ; la largeur actuelle peut différer. Le minimum BSP est une règle de conception, pas une norme d’accessibilité.' });

// 2. Potential risks: deterministic discovery findings (overlaps, closures, moratoria, repeated works).
const { result } = C.run(ctx, C.DEFAULTS);
const KIND = { overlap: ['works-overlap', 'Chevauchement de chantiers entre organisations'], closure: ['works-during-closure', 'Fenêtres de permis pendant une fermeture SFMTA'], moratorium: ['works-in-moratorium', 'Permis débutant pendant un moratoire de chaussée'], repeated: ['repeated-works', 'Travaux répétés au même endroit'], opportunity: ['coordination-opportunity', 'Opportunité de coordination à venir'] };
for (const f of result.findings) { const [k, title] = KIND[f.type] || [f.type, f.title];
  add({ id: `${k}:${f.seg}`, domain: 'infrastructure', status: 'potential-risk', segment: f.seg, place: `${f.street} ${f.from} → ${f.to}`, title,
    statement: `${f.records.length} permis concernés${f.metrics.organisations ? `, ${f.metrics.organisations} organisations` : ''}${f.metrics.overlapDays ? `, ${f.metrics.overlapDays} jour(s) de chevauchement cumulé` : ''}.`,
    evidence: f.records.slice(0, 12).map(id => ({ ref: `permits:${id}`, url: SRC.permits })), validEvidence: !!(f.evidence && f.evidence.valid),
    caveat: f.caveat || 'Détection déterministe sur des fenêtres administratives ; ce n’est ni un incident constaté ni une infraction.' }); }

// 3. Simulated: plantable positions deferred by planned works (exploratory, uncalibrated model).
for (const r of sim.rows.filter(x => x.deferred_for_works > 0)) add({ id: `planting-deferred:${r.cnn}`, domain: 'nature', status: 'simulated', segment: r.cnn, place: label(r),
  title: 'Plantation à reporter à cause de travaux planifiés (simulation)', statement: `${r.deferred_for_works} emplacement(s) simulé(s) à reporter (modèle ${sim.model}, non calibré, empreinte ${sim.fingerprint}).`,
  evidence: [{ ref: r.sources.sidewalk, url: SRC.sidewalks }, ...r.sources.permits.map(ref => ({ ref, url: SRC.permits }))], caveat: 'Résultat d’un modèle exploratoire ; aucun emplacement réel n’a été vérifié.' });

// 4. Hypotheses raised in recorded missions that no CORE tool could answer (unfulfillable evidence requests).
const cogIdx = JSON.parse(fs.readFileSync('data/missions/cognitive/index.json', 'utf8'));
for (const m of cogIdx.missions) { const mc = JSON.parse(fs.readFileSync(`data/missions/cognitive/${m.id.replace(':', '-')}.json`, 'utf8'));
  for (const q of (mc.requests || []).filter(x => x.status === 'unfulfillable')) add({ id: `open-question:${m.id}:${q.id}`, domain: mc.target.domains[0] || 'general', status: 'hypothesis', segment: mc.target.segment, place: mc.target.label,
    title: 'Question ouverte sans preuve disponible', statement: q.need, raisedBy: q.agent, mission: m.id, evidence: [], caveat: 'Demande d’un agent dans une mission enregistrée ; aucune source CORE ne permet d’y répondre.' }); }

// 5. Domains with no integrated evidence: stated explicitly.
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
