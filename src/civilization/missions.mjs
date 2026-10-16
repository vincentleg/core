// CORE V7.2 — mission plans for the San Francisco civilisation. A plan is a task graph; each task names the stage, the
// team (and optionally the specialist role) that performs it, how many agents work together, where they work (a team
// hub, a council hub or the location of the evidence), how long it takes in runtime seconds, what it depends on, and the
// TYPED messages it emits. Message text is built from computed findings (analyses.mjs), never invented.
import * as A from './analyses.mjs';
const STATUS_FR = { observed: 'observé', 'potential-risk': 'risque potentiel', hypothesis: 'hypothèse', simulated: 'simulé' };

// Virtual meeting points (labelled as such in the UI). The flagship's field point sits in SoMa, near Folsom Street, so
// the team is visible at human scale from CORE World's street view.
// Sidewalk points of Folsom Street (centreline ± 9.5 m), 28 m from CORE World's street-level entry. Virtual meeting points.
export const PLACES = { council: [-122.403776, 37.780079], somaField: [-122.404194, 37.779749], cityHall: [-122.4192, 37.7793] };

export function buildMissions(D, reg, { today = new Date().toISOString() } = {}) {
  const hz = A.housing(D), f = id => hz.findings.find(x => x.id === id), L = d => `core.san-francisco.${d}.lead`;
  const pipeSites = D.pipeline.features.filter(x => /South of Market|Mission|Tenderloin/.test(x.properties.neighborhood || '')).slice(0, 24).map(x => x.geometry.coordinates);
  const flood = f('h.flood-exposure').sites.map(s => s.at);
  const ev = (...ids) => ids;
  const housing = {
    id: 'mission.sf.housing-resilience', flagship: true, city: 'san-francisco', council: 'core.council.mission.housing-resilience', coordinator: L('housing'),
    title: 'Logement abordable et résilience urbaine — San Francisco',
    question: 'Comment San Francisco peut-elle produire davantage de logements abordables sans accroître la vulnérabilité climatique des ménages modestes ?',
    scope: 'Ville de San Francisco ; analyse de l’exposition au risque d’inondation limitée à la zone d’étude SoMa / Mission / Tenderloin.',
    findings: hz.findings, hypotheses: hz.hypotheses, dissent: hz.dissent,
    plan: [
      { id: 'open', stage: 'OBSERVE', team: 'housing', lead: true, n: 1, at: 'hub', dur: 12, msgs: [['status', 'city', `Mission ouverte : « ${'Logement abordable et résilience urbaine'} ». La Direction San Francisco délègue la coordination à l’équipe Logement.`]] },
      { id: 'frame', stage: 'FORMULATE', council: true, n: 6, at: PLACES.council, dur: 30, after: ['open'], msgs: [['dossier-update', 'council', 'Question de recherche et périmètre fixés par le conseil de mission ; périmètre de l’exposition limité à la zone d’étude (données disponibles).']] },
      { id: 'get-production', stage: 'RETRIEVE', team: 'housing', role: 'production', n: 2, at: 'hub', dur: 20, after: ['frame'], msgs: [['request', 'lead', 'Demande : achèvements de logements par année (source officielle datée).'], ['evidence', 'lead', 'Jeu « Housing Production 2005–present » (Planning, domaine public US), agrégé par année.', ev('h.production-trend')]] },
      { id: 'get-pipeline', stage: 'RETRIEVE', team: 'housing', role: 'pipeline', n: 2, at: 'hub', dur: 20, after: ['frame'], msgs: [['evidence', 'lead', 'Jeu « MOHCD Affordable Housing Pipeline » (PDDL) : un point par projet, sans nom de promoteur ni adresse.', ev('h.pipeline')]] },
      { id: 'get-evictions', stage: 'RETRIEVE', team: 'social', role: 'displacement', n: 2, at: 'hub', dur: 22, after: ['frame'], msgs: [['evidence', 'lead', 'Avis d’expulsion : comptes agrégés par année et par quartier uniquement (aucune donnée individuelle).', ev('h.eviction-notices')]] },
      { id: 'get-flood', stage: 'RETRIEVE', team: 'climate', role: 'flood', n: 2, at: 'hub', dur: 18, after: ['frame'], msgs: [['evidence', 'lead', 'Zone de risque d’inondation par orage centennal (juillet 2022, PDDL), découpée à la zone d’étude.', ev('h.flood-exposure')]] },
      { id: 'get-rent', stage: 'RETRIEVE', team: 'research', role: 'sources', n: 1, at: 'hub', dur: 16, after: ['frame'], fail: 'Census Data API : clé requise (redirection missing_key) ; CORE n’utilise aucune clé sans décision du fondateur.',
        msgs: [['escalate', 'lead', 'Taux d’effort des locataires indisponible : lacune enregistrée, escalade à la direction Logement.', ev('g.rent-burden')]] },
      { id: 'an-production', stage: 'ANALYZE', team: 'housing', role: 'production', n: 2, at: 'hub', dur: 26, after: ['get-production'], msgs: [['analysis', 'lead', f('h.production-trend').claim, ev('h.production-trend')], ['analysis', 'lead', f('h.affordable-share').claim, ev('h.affordable-share')]] },
      { id: 'an-pipeline', stage: 'ANALYZE', team: 'housing', role: 'siting', n: 3, at: 'pipe', dur: 34, after: ['get-pipeline'], msgs: [['analysis', 'lead', f('h.pipeline-geography').claim, ev('h.pipeline-geography')]] },
      { id: 'an-evictions', stage: 'ANALYZE', team: 'social', role: 'displacement', n: 2, at: 'hub', dur: 24, after: ['get-evictions'], msgs: [['analysis', 'lead', f('h.eviction-notices').claim, ev('h.eviction-notices')]] },
      { id: 'an-flood', stage: 'ANALYZE', team: 'climate', role: 'flood', n: 3, at: 'flood', dur: 34, after: ['get-flood', 'get-pipeline'], msgs: [['analysis', 'lead', f('h.flood-exposure').claim, ev('h.flood-exposure')]] },
      { id: 'ask-review', stage: 'REQUEST_REVIEW', team: 'housing', lead: true, n: 1, at: PLACES.council, dur: 10, after: ['an-production', 'an-pipeline', 'an-evictions', 'an-flood'], msgs: [['review-request', 'research', 'Demande de vérification des dates, des sources et des méthodes avant toute hypothèse.']] },
      { id: 'check-dates', stage: 'COLLABORATE', team: 'research', role: 'dates', n: 2, at: PLACES.council, dur: 24, after: ['ask-review'], msgs: [['review', 'lead', 'Dates vérifiées : chaque jeu porte sa date de récupération et sa période ; l’année en cours (partielle) est exclue des tendances.'], ['challenge', 'social', hz.dissent[0].text, ev('h.eviction-notices')]] },
      { id: 'check-stats', stage: 'COLLABORATE', team: 'data-science', role: 'quality', n: 2, at: PLACES.council, dur: 22, after: ['ask-review'], msgs: [['challenge', 'housing', 'Une partie des logements « abordables » achevés est estimée par la source : la part de 37 % est un ordre de grandeur, pas une mesure exacte.', ev('h.affordable-share')]] },
      { id: 'check-ethics', stage: 'COLLABORATE', team: 'ethics', role: 'privacy', n: 2, at: PLACES.council, dur: 20, after: ['ask-review'], msgs: [['challenge', 'social', hz.dissent[2].text]] },
      { id: 'hyp-1', stage: 'HYPOTHESES', team: 'housing', role: 'policy', n: 3, at: PLACES.somaField, dur: 30, after: ['check-dates', 'check-stats'], msgs: [['dossier-update', 'council', `H1 — ${hz.hypotheses[0].title} : ${hz.hypotheses[0].statement}`, ev('h.production-trend', 'h.pipeline')]] },
      { id: 'hyp-2', stage: 'HYPOTHESES', team: 'social', role: 'community', n: 2, at: PLACES.somaField, dur: 30, after: ['check-dates', 'check-ethics'], msgs: [['alternative', 'housing', `H2 — ${hz.hypotheses[1].title} : ${hz.hypotheses[1].statement}`, ev('h.eviction-notices')]] },
      { id: 'hyp-3', stage: 'HYPOTHESES', team: 'climate', role: 'adaptation', n: 2, at: PLACES.somaField, dur: 30, after: ['check-dates'], msgs: [['alternative', 'housing', `H3 — ${hz.hypotheses[2].title} : ${hz.hypotheses[2].statement}`, ev('h.flood-exposure', 'h.pipeline-geography')]] },
      { id: 'simulate', stage: 'SIMULATE', team: 'simulation', role: 'scenarios', n: 2, at: 'hub', dur: 20, after: ['hyp-1', 'hyp-2', 'hyp-3'], msgs: [['status', 'council', 'Simulation non effectuée : aucun modèle calibré du marché du logement n’est disponible. Les hypothèses restent des hypothèses.']] },
      { id: 'critique', stage: 'CRITIQUE', team: 'safety', role: 'adversarial', n: 2, at: PLACES.council, dur: 26, after: ['simulate'], msgs: [['challenge', 'council', hz.dissent[1].text, ev('g.causality')], ['challenge', 'council', hz.dissent[3].text, ev('h.flood-exposure')]] },
      { id: 'revise', stage: 'REVISE', team: 'housing', lead: true, n: 1, at: PLACES.council, dur: 20, after: ['critique'], msgs: [['dossier-update', 'council', 'Dossier révisé : H1, H2 et H3 restent ouvertes et non exclusives ; les dissidences sont conservées ; les lacunes (loyers, revenus, zonage) sont listées comme prioritaires.']] },
      { id: 'dossier', stage: 'DOSSIER', council: true, n: 5, at: PLACES.council, dur: 30, after: ['revise'], msgs: [['dossier-update', 'city', 'Dossier de recherche produit : 6 constats datés, 3 hypothèses concurrentes, 4 dissidences, 5 lacunes. Rien n’est établi au-delà des comptes cités.']] },
      { id: 'gateway', stage: 'HUMAN_REVIEW', team: 'safety', role: 'claims', n: 1, at: PLACES.cityHall, dur: 14, after: ['dossier'], msgs: [['status', 'city', 'En attente de revue humaine : aucun relecteur humain vérifié n’existe encore dans CORE. Aucune recommandation n’est émise sans lui.']] },
    ],
    sessions: { every: 75, dur: 40, at: PLACES.council },
    monitor: { team: 'housing', every: 45, sites: [...pipeSites, ...flood], text: 'Surveillance : revérification de la date des instantanés et visite (virtuelle) d’un site du pipeline. Aucune nouvelle donnée n’est téléchargée par le navigateur.' },
  };
  const small = (id, title, team, fn, extra = {}) => { const F = fn(D); return {
    id, city: 'san-francisco', council: 'core.council.geo.san-francisco', coordinator: L(team), title, question: extra.question || title, scope: extra.scope || 'Données déjà présentes dans CORE.', findings: F, hypotheses: [], dissent: [],
    plan: [
      { id: 'open', stage: 'OBSERVE', team, lead: true, n: 1, at: 'hub', dur: 10, msgs: [['status', 'city', `Mission ouverte : ${title}.`]] },
      { id: 'get', stage: 'RETRIEVE', team, role: F[0].role, n: 2, at: 'hub', dur: 18, after: ['open'], msgs: F.map(x => ['evidence', 'lead', `Source : ${x.source?.title || '—'} (récupérée le ${x.source?.retrieved || '—'}).`, [x.id]]) },
      { id: 'analyze', stage: 'ANALYZE', team, role: F[0].role, n: 2, at: F[0].sites ? 'sites' : 'hub', dur: 26, after: ['get'], msgs: F.map(x => ['analysis', 'lead', x.claim, [x.id]]) },
      { id: 'verify', stage: 'COLLABORATE', team: 'research', role: 'provenance', n: 1, at: 'hub', dur: 16, after: ['analyze'], msgs: [['review', team, `Provenance vérifiée ; limite rappelée : ${F[0].limits}`]] },
      { id: 'dossier', stage: 'DOSSIER', team, lead: true, n: 1, at: 'hub', dur: 14, after: ['verify'], msgs: [['dossier-update', 'city', `Constat versé au dossier, statut « ${F[0].status === 'observed' ? 'observé' : 'dérivé'} » ; aucune conclusion causale.`]] },
    ], monitor: { team, every: 60, sites: (F[0].sites || []).map(s => s.at), text: 'Surveillance : revérification de la date de l’instantané.' }, ...extra }; };
  const gap = (id, team, title) => ({ id, city: 'san-francisco', council: 'core.council.geo.san-francisco', coordinator: L(team), title, question: title, scope: 'Aucune source publique chargée pour ce domaine.', findings: [{ id: `${id}.gap`, team, status: 'gap', claim: `Aucune donnée publique n’est chargée pour « ${title} » : l’équipe est enregistrée mais n’a pas de travail fondé à faire.`, limits: 'Lacune déclarée.' }], hypotheses: [], dissent: [],
    plan: [{ id: 'gap', stage: 'OBSERVE', team, lead: true, n: 1, at: 'hub', dur: 10, msgs: [['status', 'city', `Lacune : aucune source chargée pour « ${title} ». Équipe en attente.`, [`${id}.gap`]]] }] });
  // Record-by-record audits: genuine checks on each public record, done where the record is located. They keep teams
  // busy with real work across the whole city; each batch reports what it found; each full pass is summarised.
  const todayD = today.slice(0, 10);
  const zone = D.flood.features[0], bbox = zone.properties.clipped_to, inBox = p => p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3];
  housing.audits = [
    { id: 'pipeline-dates', team: 'housing', lanes: 14, batch: 2, label: 'Vérification des dates et unités du pipeline', items: D.pipeline.features.map(x => { const p = x.properties;
      const flag = !p.units ? 'unités non renseignées' : p.completion && p.completion < todayD ? 'date d’achèvement estimée dépassée' : !p.completion ? 'date d’achèvement non renseignée' : 'cohérent';
      return { key: p.id, at: x.geometry.coordinates, flag, note: `projet ${p.id} (${p.neighborhood || '—'}) : ${flag}` }; }) },
    { id: 'pipeline-quality', team: 'data-science', lanes: 6, batch: 3, label: 'Qualité des enregistrements du pipeline', items: D.pipeline.features.map(x => { const p = x.properties;
      const flag = p.affordable > p.units && p.units > 0 ? 'plus d’abordables que d’unités' : !p.neighborhood ? 'quartier manquant' : 'complet';
      return { key: p.id, at: x.geometry.coordinates, flag, note: `projet ${p.id} : ${flag}` }; }) },
    { id: 'flood-check', team: 'climate', lanes: 8, batch: 2, label: 'Exposition au risque d’inondation, projet par projet', items: D.pipeline.features.map(x => { const at = x.geometry.coordinates;
      const flag = !inBox(at) ? 'hors zone d’étude (non évaluable)' : A.inPolygon(at, zone.geometry) ? 'dans la zone de risque 2022' : 'hors zone de risque 2022';
      return { key: x.properties.id, at, flag, note: `projet ${x.properties.id} : ${flag}` }; }) },
    { id: 'affordability-mix', team: 'inequality', lanes: 6, batch: 3, label: 'Part abordable par projet', items: D.pipeline.features.map(x => { const p = x.properties, r = p.units ? p.affordable / p.units : 0;
      const flag = !p.units ? 'non calculable' : r >= 0.99 ? '100 % abordable' : r >= 0.25 ? '25–99 % abordable' : 'moins de 25 % abordable';
      return { key: p.id, at: x.geometry.coordinates, flag, note: `projet ${p.id} : ${flag}` }; }) },
  ];
  const crashBy = D.crashes.rows.reduce((m, r) => (m[r.cnn] = (m[r.cnn] || 0) + r.n, m), {});
  const audits = {
    'mission.sf.energy-benchmarks': [{ id: 'energy-records', team: 'energy', lanes: 8, batch: 2, label: 'Déclarations énergétiques, bâtiment par bâtiment', items: D.energy.features.map(x => { const p = x.properties;
      const flag = !/Complied/i.test(p.status || '') ? 'déclaration non conforme ou absente' : !(p.site_eui > 0) ? 'intensité non renseignée' : 'déclaration conforme';
      return { key: p.record_id, at: x.geometry.coordinates, flag, note: `bâtiment ${p.parcel} : ${flag}` }; }) }],
    'mission.sf.road-safety': [{ id: 'hin-crashes', team: 'mobility', lanes: 10, batch: 4, label: 'Collisions sur les tronçons du réseau à haut risque', items: D.hin.features.filter(f => crashBy[f.properties.cnn]).map(f => { const c = f.geometry.coordinates, at = Array.isArray(c[0][0]) ? c[0][0] : c[0], n = crashBy[f.properties.cnn];
      return { key: f.properties.cnn, at, flag: n >= 10 ? '10 collisions ou plus' : n >= 3 ? '3 à 9 collisions' : '1 ou 2 collisions', note: `tronçon ${f.properties.street} (${f.properties.cnn}) : ${n} collision(s) avec blessés` }; }) }],
    'mission.sf.urban-forest': [{ id: 'tree-records', team: 'forestry', lanes: 7, batch: 4, label: 'Inventaire des arbres, fiche par fiche', items: D.trees.features.map(x => { const p = x.properties;
      const flag = !p.species || /Tree\(s\) ::/.test(p.species) ? 'espèce non renseignée' : !p.dbh_range ? 'diamètre non renseigné' : 'fiche complète';
      return { key: p.treeid, at: x.geometry.coordinates, flag, note: `arbre ${p.treeid} : ${flag}` }; }) }],
    'mission.sf.sidewalk-regression': [{ id: 'problem-records', team: 'public-space', lanes: 4, batch: 3, label: 'Problèmes enregistrés, preuve par preuve', items: D.problems.problems.filter(p => p.segment).map(p => ({ key: p.id, at: null, segment: p.segment,
      flag: (p.evidence || []).length ? `${STATUS_FR[p.status] || p.status} — preuve présente` : 'sans preuve', note: `${p.id} : ${(p.evidence || []).length} preuve(s), statut ${p.status}` })) }],
  };
  const corridorMid = Object.fromEntries((D.corridor?.features || []).map(f => { const [a, b] = f.geometry.coordinates; return [f.properties.cnn, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]; }));
  for (const list of Object.values(audits)) for (const a of list) a.items = a.items.map(i => ({ ...i, at: i.at || corridorMid[i.segment] || null })).filter(i => i.at);
  // V8 — San Francisco mobility (SUMO). The simulation is computed outside the browser (scripts/mobility/build.py);
  // agents here read and review the recorded, reproducible runs: they never claim to have run them live.
  const mob = A.mobilitySim(D), mf = id => mob.findings.find(x => x.id === id), folsomSites = (D.corridor?.features || []).filter(x => /FOLSOM/.test(x.properties.streetname || '')).map(x => { const [a, b] = x.geometry.coordinates; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; });
  const mobility = { id: 'mission.sf.mobility', flagship: true, city: 'san-francisco', council: 'core.council.geo.san-francisco', coordinator: L('mobility'),
    title: 'Mobilité et congestion — SoMa, San Francisco',
    question: 'Quelles interventions pourraient réduire les retards sur le corridor Folsom / Howard sans dégrader les bus, la sécurité ni l’équité — et que peut-on réellement en savoir ?',
    scope: 'Grille de SoMa (3rd–9th, Folsom / Howard) ; réseau réel OpenStreetMap ; demande, feux et bus synthétiques ; modèle NON CALIBRÉ.',
    simulation: 'SUMO 1.27.1, 5 scénarios × 5 graines, relecture enregistrée de 20 s ; modèle non calibré.',
    findings: mob.findings, hypotheses: mob.hypotheses, dissent: mob.dissent, verdict: mob.verdict,
    plan: [
      { id: 'open', stage: 'OBSERVE', team: 'mobility', lead: true, n: 1, at: 'hub', dur: 10, msgs: [['status', 'city', 'Mission ouverte : mobilité et congestion à SoMa.']] },
      { id: 'get-net', stage: 'RETRIEVE', team: 'mobility', role: 'walk', n: 2, at: 'hub', dur: 18, after: ['open'], msgs: [['evidence', 'lead', 'Réseau routier OpenStreetMap (ODbL) et feux recensés par DataSF récupérés ; aucun comptage de trafic public.', ['m.signals', 'g.counts']]] },
      { id: 'verify-signals', stage: 'COLLABORATE', team: 'research', role: 'provenance', n: 1, at: 'hub', dur: 16, after: ['get-net'], msgs: [['review', 'mobility', mf('m.signals').claim, ['m.signals']]] },
      { id: 'baseline', stage: 'SIMULATE', team: 'simulation', role: 'scenarios', n: 2, at: 'sites', dur: 26, after: ['get-net'], msgs: [['analysis', 'lead', mf('m.baseline').claim, ['m.baseline']]] },
      ...['A', 'B', 'C', 'D'].map(k => ({ id: `scen-${k}`, stage: 'SIMULATE', team: 'simulation', role: 'scenarios', n: 2, at: 'sites', dur: 22, after: ['baseline'], msgs: [['analysis', 'lead', mf(`m.scenario-${k}`).claim, [`m.scenario-${k}`]]] })),
      { id: 'search', stage: 'SIMULATE', team: 'simulation', role: 'uncertainty', n: 2, at: 'hub', dur: 24, after: ['scen-A', 'scen-B', 'scen-C', 'scen-D'], msgs: [['analysis', 'lead', mf('m.search').claim, ['m.search']]] },
      { id: 'critique', stage: 'CRITIQUE', team: 'safety', role: 'adversarial', n: 2, at: PLACES.council, dur: 22, after: ['search'], msgs: [['challenge', 'mobility', mob.dissent[0].text, ['g.counts', 'g.timing']], ['challenge', 'mobility', mob.dissent[1].text, ['m.scenario-C']]] },
      { id: 'hyp', stage: 'HYPOTHESES', team: 'mobility', role: 'access', n: 2, at: PLACES.council, dur: 22, after: ['critique'], msgs: mob.hypotheses.map(h => ['alternative', 'council', `${h.id} — ${h.title} : ${h.statement}`, h.support]) },
      { id: 'dossier', stage: 'DOSSIER', team: 'mobility', lead: true, n: 1, at: PLACES.council, dur: 18, after: ['hyp'], msgs: [['dossier-update', 'city', mob.verdict]] },
      { id: 'gateway', stage: 'HUMAN_REVIEW', team: 'safety', role: 'claims', n: 1, at: PLACES.cityHall, dur: 12, after: ['dossier'], msgs: [['status', 'city', 'En attente de revue humaine ; aucune intervention n’est recommandée sur un modèle non calibré.']] },
    ],
    sessions: { every: 90, dur: 36, at: PLACES.council },
    monitor: { team: 'mobility', every: 50, sites: folsomSites, text: 'Surveillance : vérification des tronçons du corridor Folsom ; aucune nouvelle donnée téléchargée.' } };
  return [housing, mobility,
    small('mission.sf.energy-benchmarks', 'Performance énergétique des bâtiments du corridor', 'energy', A.energy, { audits: audits['mission.sf.energy-benchmarks'] }),
    small('mission.sf.road-safety', 'Sécurité routière : réseau à haut risque', 'mobility', A.mobility, { audits: audits['mission.sf.road-safety'] }),
    small('mission.sf.urban-forest', 'Forêt urbaine du corridor Folsom / Howard', 'forestry', A.forest, { audits: audits['mission.sf.urban-forest'] }),
    small('mission.sf.sidewalk-regression', 'Test de régression : trottoir de Folsom Street', 'public-space', A.sidewalk, { regression: true, audits: audits['mission.sf.sidewalk-regression'] }),
    small('mission.sf.data-freshness', 'Fraîcheur des données de CORE', 'research', D2 => A.freshness(D2, today)),
    gap('mission.sf.ai-compute', 'ai-infrastructure', 'Consommation énergétique du calcul d’IA'), gap('mission.sf.food-access', 'food', 'Accès alimentaire'), gap('mission.sf.schools', 'education', 'Accès scolaire'), gap('mission.sf.water', 'water', 'Sécurité de l’eau')];
}
