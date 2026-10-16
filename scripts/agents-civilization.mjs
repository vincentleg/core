// CORE V7.2 — San Francisco agent civilisation registry (deterministic generator). node scripts/agents-civilization.mjs
// Input: data/agents/registry.json (the 68 Phase 3–9 profiles, kept verbatim: same ids, codes, tools, supervisors,
// execution modes) + data/sf-housing/neighborhoods.geojson (41 analysis neighbourhoods, DataSF PDDL).
// Output: data/agents/sf-civilization.json — hierarchy (global → assembly/councils → city → teams → agents), ≥ 500
// distinct agents with role, specialty, team, supervisor, councils, capabilities, data permissions, escalation rules,
// neighbourhood and virtual post. A profile is an IDENTITY, not a running model: what an agent can actually do is the
// runtime capability it maps to (src/civilization/runtime.mjs). Posts are virtual places, never real offices.
import fs from 'node:fs';
import crypto from 'node:crypto';
const base = JSON.parse(fs.readFileSync('data/agents/registry.json', 'utf8'));
const nb = JSON.parse(fs.readFileSync('data/sf-housing/neighborhoods.geojson', 'utf8')).features;
const centroid = f => { const ring = (f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.sort((a, b) => b[0].length - a[0].length)[0])[0];
  const n = ring.length - 1; let x = 0, y = 0; for (let i = 0; i < n; i++) { x += ring[i][0]; y += ring[i][1]; } return [+(x / n).toFixed(5), +(y / n).toFixed(5)]; };
const NB = nb.map(f => ({ name: f.properties.nhood, c: centroid(f) })).filter(n => !/Golden Gate Park|McLaren Park|Lincoln Park|Presidio$|Treasure Island/.test(n.name)).sort((a, b) => a.name.localeCompare(b.name));
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
const DISCLAIMER = 'Identité d’agent CORE (rôle visé) : ni personne réelle, ni qualification professionnelle ; son travail est celui du moteur CORE.';

// New departments for the V7.2 domains not covered by the Phase 3 organisation.
const NEW_DEPTS = [['food', 'Systèmes alimentaires'], ['education', 'Éducation'], ['ai-infrastructure', 'Infrastructures d’IA et calcul'], ['ethics', 'Éthique, vie privée et gouvernance'], ['resilience', 'Résilience aux catastrophes'], ['inequality', 'Inégalités économiques']];
const DEPTS = [...base.departments.map(d => [d.id, d.name]), ...NEW_DEPTS];
// Team size and specialist roles per department (each role is a distinct specialty; agents cycle through neighbourhoods).
const ROLES = {
  housing: [['production', 'Analyste de la production de logements'], ['pipeline', 'Analyste du pipeline de logements abordables'], ['displacement', 'Analyste des pressions de déplacement (agrégats)'], ['zoning', 'Analyste zonage et capacité foncière'], ['tenure', 'Analyste propriétaires et locataires'], ['costs', 'Analyste des coûts de construction'], ['policy', 'Veille des politiques de logement'], ['siting', 'Analyste localisation des projets'], ['typology', 'Analyste typologies de logements'], ['affordability', 'Analyste de l’accessibilité financière']],
  climate: [['flood', 'Analyste du risque d’inondation'], ['heat', 'Analyste chaleur urbaine'], ['sea-level', 'Analyste élévation du niveau de la mer'], ['emissions', 'Analyste des émissions'], ['adaptation', 'Analyste adaptation'], ['exposure', 'Analyste exposition des populations']],
  energy: [['buildings', 'Analyste performance énergétique des bâtiments'], ['grid', 'Analyste résilience du réseau'], ['efficiency', 'Analyste efficacité énergétique'], ['renewables', 'Analyste énergies renouvelables'], ['benchmark', 'Analyste des déclarations énergétiques']],
  mobility: [['access', 'Analyste accessibilité aux services'], ['safety', 'Analyste sécurité routière'], ['walk', 'Analyste mobilité piétonne'], ['bike', 'Analyste mobilité cyclable']],
  transit: [['coverage', 'Analyste couverture des transports publics'], ['frequency', 'Analyste fréquence de service']],
  health: [['access', 'Analyste accès aux soins'], ['environment', 'Analyste santé environnementale'], ['equity', 'Analyste équité en santé'], ['heat-health', 'Analyste santé et chaleur']],
  'public-space': [['sidewalks', 'Analyste trottoirs'], ['accessibility', 'Analyste accessibilité universelle'], ['parks', 'Analyste espaces publics']],
  economics: [['costs', 'Analyste coûts et financements'], ['labor', 'Analyste emploi et revenus'], ['public-finance', 'Analyste finances publiques']],
  inequality: [['income', 'Analyste revenus et écarts'], ['wealth', 'Analyste patrimoine et logement'], ['spatial', 'Analyste inégalités territoriales']],
  water: [['supply', 'Analyste approvisionnement en eau'], ['stormwater', 'Analyste eaux pluviales'], ['sewer', 'Analyste assainissement']],
  ecology: [['species', 'Analyste biodiversité'], ['habitat', 'Analyste habitats urbains']],
  forestry: [['canopy', 'Analyste canopée'], ['trees', 'Analyste inventaire des arbres']],
  food: [['access', 'Analyste accès alimentaire'], ['supply', 'Analyste chaînes d’approvisionnement'], ['waste', 'Analyste gaspillage alimentaire']],
  education: [['schools', 'Analyste accès scolaire'], ['learning', 'Analyste ressources pédagogiques']],
  'ai-infrastructure': [['compute', 'Analyste énergie du calcul'], ['datacenters', 'Analyste centres de données'], ['models', 'Analyste usages des modèles']],
  cybersecurity: [['threats', 'Analyste menaces'], ['privacy-tech', 'Analyste protection des données']],
  'data-science': [['statistics', 'Statisticien·ne d’agent'], ['quality', 'Analyste qualité des données'], ['geodata', 'Analyste données géographiques']],
  simulation: [['scenarios', 'Modélisateur de scénarios'], ['uncertainty', 'Analyste incertitude']],
  research: [['sources', 'Vérificateur des sources'], ['dates', 'Vérificateur des dates et versions'], ['provenance', 'Vérificateur de provenance'], ['literature', 'Veille scientifique']],
  safety: [['adversarial', 'Revue adversariale'], ['claims', 'Revue des affirmations']],
  ethics: [['privacy', 'Analyste vie privée'], ['fairness', 'Analyste équité'], ['governance', 'Analyste gouvernance'], ['consent', 'Analyste consentement']],
  resilience: [['earthquake', 'Analyste risque sismique'], ['preparedness', 'Analyste préparation'], ['recovery', 'Analyste relèvement']],
  regulatory: [['codes', 'Veille réglementaire'], ['permits', 'Analyste autorisations']],
  social: [['community', 'Analyste impacts communautaires'], ['displacement', 'Analyste déplacements de population']],
  architecture: [['design', 'Analyste conception urbaine'], ['heritage', 'Analyste patrimoine bâti']],
  civil: [['works', 'Analyste coordination des travaux'], ['structures', 'Analyste ouvrages']],
  'building-systems': [['retrofit', 'Analyste rénovation'], ['hvac', 'Analyste systèmes techniques']],
  environmental: [['air', 'Analyste qualité de l’air'], ['soil', 'Analyste sols']],
  geotech: [['liquefaction', 'Analyste liquéfaction'], ['slopes', 'Analyste pentes']],
  digital: [['networks', 'Analyste réseaux numériques']], telecom: [['works', 'Analyste travaux télécom']], electrical: [['grid', 'Analyste distribution électrique']], mechanical: [['systems', 'Analyste équipements']],
  administration: [['services', 'Analyste services publics']],
};
const TEAM_SIZE = { housing: 40, climate: 24, energy: 22, mobility: 18, health: 18, inequality: 18, ethics: 18, research: 24, 'data-science': 16, simulation: 16, economics: 16, 'public-space': 14, water: 14, resilience: 16, transit: 12, ecology: 12, forestry: 12, food: 12, education: 12, 'ai-infrastructure': 14, social: 16, safety: 14, regulatory: 10 };
// Datasets each department may read (public CORE snapshots only).
const DATA = { housing: ['sf-housing/pipeline', 'sf-housing/production-by-year', 'sf-housing/production-by-neighborhood', 'sf-housing/evictions-agg', 'sf-housing/neighborhoods', 'sf/building-permits'],
  climate: ['sf9/flood-zone', 'sf-housing/pipeline', 'sf-housing/neighborhoods'], resilience: ['sf9/flood-zone', 'sf-housing/pipeline'], energy: ['sf/energy-benchmarks'], 'building-systems': ['sf/energy-benchmarks'],
  mobility: ['sf9/hin', 'sf9/crashes-agg'], transit: ['sf9/hin'], 'public-space': ['problems/registry', 'sf/sidewalks'], forestry: ['sf/street-trees', 'sf/tree-removals'], ecology: ['sf/street-trees', 'sf/parks'],
  social: ['sf-housing/evictions-agg', 'sf-housing/neighborhoods'], inequality: ['sf-housing/evictions-agg', 'sf-housing/production-by-neighborhood'], economics: ['sf-housing/production-by-year'], civil: ['sf/permits', 'sf/large-excavations'], health: ['sf9/crashes-agg'] };
const ALL_DATA = [...new Set(Object.values(DATA).flat())];
const capsFor = (dept, role) => {
  const c = ['knowledge.read', 'mission.report'];
  if (DATA[dept]) c.push(...DATA[dept].map(d => `data.read:${d}`));
  if (['research'].includes(dept)) c.push('evidence.verify', 'evidence.date-check');
  if (['safety', 'ethics'].includes(dept)) c.push('review.challenge');
  if (dept === 'simulation') c.push('scenario.compare');
  if (/lead|Direction/.test(role)) c.push('mission.delegate', 'mission.consolidate');
  return [...new Set(c)];
};
const code3 = id => ({ 'ai-infrastructure': 'AIC', 'public-space': 'PUB', 'data-science': 'DAT', 'building-systems': 'BLD', inequality: 'INQ', resilience: 'RES', education: 'EDU', ethics: 'ETH', food: 'FOD' }[id] || id.slice(0, 3).toUpperCase());

const agents = [], byId = new Map();
const add = a => { if (byId.has(a.id)) throw Error('duplicate ' + a.id); byId.set(a.id, a); agents.push(a); return a; };
const hubs = {}; // virtual team hubs, spread over neighbourhood centroids (deterministic), never real offices
DEPTS.forEach(([id], i) => { const n = NB[(i * 7) % NB.length]; hubs[id] = { neighborhood: n.name, post: [+(n.c[0] + (rnd() - 0.5) * 0.004).toFixed(5), +(n.c[1] + (rnd() - 0.5) * 0.003).toFixed(5)] }; });
// The flagship mission (housing and resilience) is anchored in SoMa, around Folsom Street: its teams' virtual hubs sit
// within ~250 m of CORE World's street-level entry, so their meetings are visible at human scale. Still virtual places.
// Sidewalk points (street centreline of Folsom / Howard segments ± 9.5 m, from data/sf/corridor.geojson), nearest first.
const FLAGSHIP_HUBS = { 'public-space': [-122.403624, 37.779957], housing: [-122.404042, 37.779627], climate: [-122.40471, 37.779099], social: [-122.404863, 37.779221],
  research: [-122.402643, 37.780732], 'data-science': [-122.402795, 37.780854], inequality: [-122.405184, 37.778725], ethics: [-122.405336, 37.778847], safety: [-122.405407, 37.781004], simulation: [-122.405093, 37.781252] };
for (const [id, post] of Object.entries(FLAGSHIP_HUBS)) hubs[id] = { neighborhood: 'South of Market', post, flagship: true };

// Level 1–2: global intelligence, assembly, councils (coordination identities; no authority over humans or science).
const G = base.agents.find(a => a.id === 'core.global.coordinator');
add({ ...G, level: 'global', name: 'CORE Global Intelligence — coordination', origin: 'registry-v1', post: null });
const assembly = add({ id: 'core.global.assembly', code: 'CORE-ASM-0001', name: 'Assemblée mondiale CORE (secrétariat)', level: 'assembly', role: 'Organise la délibération scientifique entre conseils ; rend visibles les interprétations concurrentes', supervisor: G.id, executionMode: 'simulated', permission: 'propose', origin: 'generated-v72', city: null });
const COUNCILS = [['geo.san-francisco', 'Conseil géographique — San Francisco', 'geographic', 'active'], ['geo.new-york', 'Conseil géographique — New York', 'geographic', 'partial'],
  ['theme.housing-urban', 'Conseil thématique — Logement et ville', 'thematic', 'active'], ['theme.climate-energy', 'Conseil thématique — Climat et énergie', 'thematic', 'active'], ['theme.society-health', 'Conseil thématique — Société, santé, inégalités', 'thematic', 'active'], ['theme.methods-integrity', 'Conseil thématique — Méthodes et intégrité', 'thematic', 'active'],
  ['mission.housing-resilience', 'Conseil de mission — Logement abordable et résilience (SF)', 'mission', 'active']];
const councils = COUNCILS.map(([k, name, kind, status], i) => add({ id: `core.council.${k}`, code: `CORE-CNL-${String(i + 1).padStart(4, '0')}`, name, level: 'council', kind, status, role: 'Délibération : question, preuves, hypothèses, dissidences, demandes de vérification, recommandation de revue', supervisor: assembly.id, executionMode: 'simulated', permission: 'review', origin: 'generated-v72', city: k.includes('san-francisco') || k.startsWith('mission') ? 'san-francisco' : k.includes('new-york') ? 'new-york' : null, members: [] }));
const C = Object.fromEntries(COUNCILS.map(([k], i) => [k, councils[i]]));

// Level 3: city direction (the Phase 3 city manager, kept), Level 4: team leads (Phase 3 leads kept + new leads).
const M = base.agents.find(a => a.id === 'core.san-francisco.manager');
add({ ...M, level: 'city', name: 'Direction CORE San Francisco', city: 'san-francisco', region: 'Californie, États-Unis', origin: 'registry-v1', post: hubs.administration.post, neighborhood: hubs.administration.neighborhood,
  escalation: { to: C['geo.san-francisco'].id, when: 'conflit entre équipes, preuve contestée, question hors périmètre' }, note: 'Coordonne et délègue ; ne peut ni outrepasser la revue scientifique ni autoriser une action réelle.' });
const leadOf = {};
for (const [id, name] of DEPTS) {
  const old = base.agents.find(a => a.id === `core.san-francisco.${id}.lead`);
  const lead = add(old ? { ...old, level: 'team-lead', name: `Direction — ${name}`, origin: 'registry-v1' } : { id: `core.san-francisco.${id}.lead`, code: `CORE-${code3(id)}-L001`, name: `Direction — ${name}`, role: `Direction — ${name}`, level: 'team-lead', supervisor: M.id, executionMode: 'coordination-only', permission: 'propose', origin: 'generated-v72' });
  Object.assign(lead, { city: 'san-francisco', region: 'Californie, États-Unis', department: id, team: `team.${id}`, teamName: name, post: hubs[id].post, neighborhood: hubs[id].neighborhood, capabilities: capsFor(id, 'lead'), dataPermissions: DATA[id] || [], escalation: { to: M.id, when: 'besoin d’une autre équipe, preuve contestée, risque éthique' } });
  leadOf[id] = lead;
}
// Level 5: the Phase 3 specialists (kept), then generated specialists until each team reaches its size.
for (const a of base.agents.filter(x => !byId.has(x.id))) {
  const d = a.department || 'research';
  add({ ...a, level: 'agent', name: `${a.code} · ${a.role}`, origin: 'registry-v1', city: 'san-francisco', region: 'Californie, États-Unis', team: `team.${d}`, teamName: DEPTS.find(x => x[0] === d)?.[1], supervisor: a.supervisor || leadOf[d]?.id,
    post: hubs[d]?.post, neighborhood: hubs[d]?.neighborhood, capabilities: capsFor(d, a.role), dataPermissions: DATA[d] || [], escalation: { to: leadOf[d]?.id, when: 'incertitude, conflit de preuves, hors permission' } });
}
for (const [id, name] of DEPTS) {
  const roles = ROLES[id] || [['analyst', `Analyste — ${name}`]], size = TEAM_SIZE[id] || 10;
  let n = agents.filter(a => a.department === id || a.team === `team.${id}`).length;
  for (let k = 1; n < size; k++, n++) {
    const [rk, label] = roles[(k - 1) % roles.length], hood = NB[(k * 5 + id.length * 3) % NB.length];
    const num = String(k).padStart(3, '0'), cd = code3(id);
    add({ id: `core.san-francisco.${id}.${rk}.${num}`, code: `CORE-${cd}-${num}`, name: `${cd}-${num} · ${label} — ${hood.name}`, level: 'agent', role: label, specialization: `${label} (${hood.name})`, department: id, team: `team.${id}`, teamName: name,
      supervisor: leadOf[id].id, city: 'san-francisco', region: 'Californie, États-Unis', neighborhood: hood.name,
      post: [+(hood.c[0] + (rnd() - 0.5) * 0.006).toFixed(5), +(hood.c[1] + (rnd() - 0.5) * 0.005).toFixed(5)],
      capabilities: capsFor(id, label), dataPermissions: DATA[id] || [], tools: [], permission: 'analyze', executionMode: 'simulated', origin: 'generated-v72',
      escalation: { to: leadOf[id].id, when: 'incertitude, conflit de preuves, demande hors permission' }, reviewState: 'non revu' });
  }
}
// Council membership: leads of related teams + verification + ethics; the mission council gets the housing mission team.
const member = (c, ids) => { for (const i of ids) if (byId.has(i)) { c.members.push(i); (byId.get(i).councils ||= []).push(c.id); } };
const L = d => `core.san-francisco.${d}.lead`;
member(C['geo.san-francisco'], [M.id, ...DEPTS.map(([d]) => L(d))]);
member(C['theme.housing-urban'], ['housing', 'architecture', 'regulatory', 'public-space', 'civil', 'economics'].map(L));
member(C['theme.climate-energy'], ['climate', 'energy', 'water', 'resilience', 'ai-infrastructure', 'environmental'].map(L));
member(C['theme.society-health'], ['health', 'social', 'inequality', 'education', 'food'].map(L));
member(C['theme.methods-integrity'], ['research', 'data-science', 'simulation', 'safety', 'ethics'].map(L));
member(C['mission.housing-resilience'], [L('housing'), L('climate'), L('inequality'), L('ethics'), L('research'), L('simulation'), 'core.san-francisco.housing.pipeline.001', 'core.san-francisco.housing.production.002', 'core.san-francisco.climate.flood.001', 'core.san-francisco.research.dates.002', 'core.san-francisco.safety.adversarial.001']);
member(C['geo.new-york'], []); // registered council; NYC agents are not loaded in this registry (recorded NYC missions only)
for (const a of agents) { a.councils ||= []; a.dataPermissions ||= []; a.capabilities ||= []; }

const doc = { version: 'core-sf-civilization-v1', disclaimer: DISCLAIMER, generated_by: 'scripts/agents-civilization.mjs', inputs: { registry: 'data/agents/registry.json', registry_version: base.version, neighborhoods: 'data/sf-housing/neighborhoods.geojson' },
  honesty: 'Registered identities. Their activity in the browser is produced by the deterministic CORE runtime (src/civilization/runtime.mjs) on dated public data; only explicitly marked tasks may use an optional local model. No agent is an independent reasoning model; none has authority over people, science or real-world action.',
  departments: DEPTS.map(([id, name]) => ({ id, name, team: `team.${id}`, lead: L(id), hub: hubs[id], size: agents.filter(a => a.team === `team.${id}`).length, data: DATA[id] || [] })),
  datasets: ALL_DATA, agents };
doc.counts = { total: agents.length, sanFrancisco: agents.filter(a => a.city === 'san-francisco').length, kept_from_registry_v1: agents.filter(a => a.origin === 'registry-v1').length, generated: agents.filter(a => a.origin === 'generated-v72').length,
  byLevel: agents.reduce((m, a) => (m[a.level] = (m[a.level] || 0) + 1, m), {}) };
const text = JSON.stringify(doc) + '\n';
fs.writeFileSync('data/agents/sf-civilization.json', text);
console.log(JSON.stringify(doc.counts), crypto.createHash('sha256').update(text).digest('hex').slice(0, 16), (text.length / 1024).toFixed(0) + ' KB');
