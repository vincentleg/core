// CORE V7.2 — mission analyses. Pure functions: dated public records in, cited findings out. Every number is computed
// here from the snapshot files (never typed by hand, never produced by a model). A finding carries its source, the
// retrieval date, the period it covers, a status ('observed' = a recorded count/sum; 'derived' = arithmetic on observed
// values) and its limitations. Gaps (what CORE cannot establish with the loaded data) are findings too.
export const FILES = {
  pipeline: 'data/sf-housing/pipeline.geojson', prodYear: 'data/sf-housing/production-by-year.json', prodNb: 'data/sf-housing/production-by-neighborhood.json',
  evictions: 'data/sf-housing/evictions-agg.json', housingManifest: 'data/sf-housing/manifest.json', flood: 'data/sf9/flood-zone.json', sf9Manifest: 'data/sf9/manifest.json',
  hin: 'data/sf9/hin.json', crashes: 'data/sf9/crashes-agg.json', energy: 'data/sf/energy-benchmarks.geojson', trees: 'data/sf/street-trees.geojson', removals: 'data/sf/tree-removals.geojson',
  sfManifest: 'data/sf/manifest.json', problems: 'data/problems/registry.json', corridor: 'data/sf/corridor.geojson',
};
const fr = n => Number(n).toLocaleString('fr-FR');
const pct = x => `${(x * 100).toFixed(1).replace('.', ',')} %`;
const src = (manifest, file, extra = {}) => { const d = manifest?.datasets?.find(x => x.file === file) || {}; return { dataset: d.id || file, title: d.title || file, page: d.page || null, retrieved: (d.retrieved_at || '').slice(0, 10), license: d.license?.name || null, ...extra }; };
// Ray casting on [lng, lat] rings; polygons with holes and multipolygons.
const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
export const inPolygon = (p, g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).some(poly => inRing(p, poly[0]) && !poly.slice(1).some(h => inRing(p, h)));

export function housing(D) {
  const mh = D.housingManifest, m9 = D.sf9Manifest, F = [];
  // F1 — production trend (complete years only; the current year is partial).
  const years = D.prodYear.filter(r => r.year >= 2016 && r.year <= 2025), sum = (a, k) => a.reduce((s, r) => s + r[k], 0);
  const early = years.filter(r => r.year <= 2020), late = years.filter(r => r.year >= 2021);
  const e = sum(early, 'net_units') / early.length, l = sum(late, 'net_units') / late.length;
  F.push({ id: 'h.production-trend', team: 'housing', role: 'production', status: 'derived', value: +((l - e) / e).toFixed(3), period: '2016–2025 (années complètes)',
    claim: `Logements nets achevés : ${fr(Math.round(e))} par an en moyenne en 2016–2020, ${fr(Math.round(l))} par an en 2021–2025 (${pct((l - e) / e)}).`,
    source: src(mh, 'production-by-year.json'), limits: 'Achèvements déclarés au Département de l’urbanisme ; l’année en cours est partielle et exclue ; un achèvement ne dit rien des prix.' });
  // F2 — affordable share of completions.
  const aff = sum(late, 'affordable_units'), net = sum(late, 'net_units');
  F.push({ id: 'h.affordable-share', team: 'housing', role: 'affordability', status: 'derived', value: +(aff / net).toFixed(3), period: '2021–2025',
    claim: `${fr(aff)} logements abordables sur ${fr(net)} achevés en 2021–2025, soit ${pct(aff / net)}.`, source: src(mh, 'production-by-year.json'),
    limits: 'Une partie des logements « abordables » est estimée par la source (champ affordable_is_estimate) ; « abordable » renvoie aux seuils de revenu des programmes, pas au revenu des ménages.' });
  // F3 — affordable pipeline.
  const P = D.pipeline.features.map(f => f.properties), live = P.filter(p => !/Completed/i.test(p.status || ''));
  const byStatus = live.reduce((m, p) => (m[p.status] = (m[p.status] || 0) + 1, m), {});
  const units = live.reduce((s, p) => s + p.affordable, 0), full = live.filter(p => /100% Affordable/.test(p.program || '')).length;
  F.push({ id: 'h.pipeline', team: 'housing', role: 'pipeline', status: 'observed', value: units, period: `instantané du ${src(mh, 'pipeline.geojson').retrieved}`,
    claim: `Le pipeline de la ville compte ${fr(live.length)} projets non achevés pour ${fr(units)} logements abordables (dont ${fr(full)} projets 100 % abordables).`,
    detail: byStatus, source: src(mh, 'pipeline.geojson'), limits: 'Dates d’achèvement estimées par la MOHCD ; un projet du pipeline peut être retardé ou abandonné.' });
  // F4 — where the affordable pipeline is.
  const byNb = Object.entries(live.reduce((m, p) => (m[p.neighborhood || '—'] = (m[p.neighborhood || '—'] || 0) + p.affordable, m), {})).sort((a, b) => b[1] - a[1]);
  const top3 = byNb.slice(0, 3), topShare = top3.reduce((s, x) => s + x[1], 0) / units;
  F.push({ id: 'h.pipeline-geography', team: 'housing', role: 'siting', status: 'derived', value: +topShare.toFixed(3), period: 'instantané',
    claim: `${pct(topShare)} des logements abordables du pipeline sont dans trois quartiers : ${top3.map(([n, u]) => `${n} (${fr(u)})`).join(', ')}.`,
    source: src(mh, 'pipeline.geojson'), limits: 'Concentration observée ; elle ne dit pas si elle est souhaitable.' });
  // F5 — eviction notices (aggregated).
  const ev = D.evictions.byYear.filter(r => r.year <= 2025), low = ev.reduce((a, r) => r.notices < a.notices ? r : a), last = ev.at(-1), first = ev[0];
  F.push({ id: 'h.eviction-notices', team: 'social', role: 'displacement', status: 'observed', value: last.notices, period: `${first.year}–${last.year}`,
    claim: `Avis d’expulsion déposés : ${fr(first.notices)} en ${first.year}, minimum de ${fr(low.notices)} en ${low.year}, ${fr(last.notices)} en ${last.year}.`,
    source: src(mh, 'evictions-agg.json'), limits: 'Un avis déposé n’est pas une expulsion exécutée ; 2020–2021 sont marquées par des moratoires sanitaires ; comptes agrégés uniquement (aucune donnée individuelle conservée).' });
  // F6 — affordable pipeline inside the 2022 100-year storm flood risk zone (study area only).
  const zone = D.flood.features[0], bbox = zone.properties.clipped_to, inBox = p => p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3];
  const studied = D.pipeline.features.filter(f => !/Completed/i.test(f.properties.status || '') && inBox(f.geometry.coordinates));
  const wet = studied.filter(f => inPolygon(f.geometry.coordinates, zone.geometry)), wetUnits = wet.reduce((s, f) => s + f.properties.affordable, 0);
  F.push({ id: 'h.flood-exposure', team: 'climate', role: 'flood', status: 'derived', value: wet.length, period: 'zone de juillet 2022 ; pipeline instantané',
    claim: `Dans la zone d’étude (SoMa, Mission, Tenderloin), ${wet.length} des ${studied.length} projets abordables non achevés (${fr(wetUnits)} logements) sont situés dans la zone de risque d’inondation par orage centennal (2022).`,
    sites: wet.map(f => ({ id: f.properties.id, at: f.geometry.coordinates, units: f.properties.affordable })), source: src(m9, 'flood-zone.json', { second: src(mh, 'pipeline.geojson') }),
    limits: 'Zone de ruissellement pluvial (pas l’élévation du niveau de la mer) ; seulement la zone d’étude ; un projet en zone peut prévoir des mesures de protection que ces données ne décrivent pas.' });
  // Gaps: what cannot be established with the loaded data.
  const GAPS = [['g.rent-burden', 'Taux d’effort des locataires, loyers médians et revenus : non établis (le Census Data API exige désormais une clé ; aucune clé sans décision du fondateur).'],
    ['g.prices', 'Prix et loyers de marché : aucune source ouverte chargée.'], ['g.zoning', 'Capacité de zonage et contraintes foncières : non chargées.'], ['g.transit', 'Accès aux transports par projet : non calculé (pas de données de desserte chargées).'], ['g.causality', 'Aucune relation de cause à effet n’est établie par ces comptes.']];
  for (const [id, claim] of GAPS) F.push({ id, team: 'research', role: 'sources', status: 'gap', claim, source: null, limits: 'Lacune déclarée.' });
  const H = [
    { id: 'H1', title: 'Production insuffisante', statement: 'La baisse des achèvements depuis 2021 contribue au manque de logements abordables.', support: ['h.production-trend', 'h.pipeline'], against: ['g.prices', 'g.causality'], test: 'Comparer production et croissance des ménages, avec des loyers datés (sources à charger).', team: 'housing' },
    { id: 'H2', title: 'Pression de déplacement', statement: 'La remontée des avis d’expulsion depuis 2023 signale une pression sur les locataires, inégale selon les quartiers.', support: ['h.eviction-notices'], against: ['g.rent-burden', 'g.causality'], test: 'Avis par quartier rapportés au nombre de logements locatifs (dénominateur manquant).', team: 'social' },
    { id: 'H3', title: 'Localisation et résilience', statement: 'Une part du pipeline abordable de la zone d’étude est exposée au risque d’inondation : produire plus peut exposer plus de ménages modestes.', support: ['h.flood-exposure', 'h.pipeline-geography'], against: ['g.causality'], test: 'Vérifier les mesures de protection prévues par projet ; étendre la zone de risque à toute la ville.', team: 'climate' },
  ];
  const DISSENT = [
    { by: 'research', text: 'Les années 2020–2021 (moratoires) faussent toute tendance des avis d’expulsion : comparer hors de ces années.' },
    { by: 'safety', text: 'H1 et H2 ne sont pas exclusives ; aucune donnée chargée ne permet de les départager. Ne pas présenter une hypothèse comme la cause.' },
    { by: 'ethics', text: 'Les avis d’expulsion concernent des personnes : n’utiliser que des agrégats, ne jamais localiser des ménages.' },
    { by: 'climate', text: 'La zone pluviale centennale n’est qu’un des risques ; l’absence d’un projet dans cette zone ne veut pas dire qu’il est sûr.' },
  ];
  return { findings: F, hypotheses: H, dissent: DISSENT };
}

// Background missions for other teams, all on data already in the repository.
export function energy(D) {
  const f = D.energy.features.map(x => x.properties).filter(p => p.site_eui > 0), v = f.map(p => p.site_eui).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)];
  return [{ id: 'e.eui', team: 'energy', role: 'benchmark', status: 'derived', value: med, period: `déclarations ${Math.max(...f.map(p => p.year))}`,
    claim: `Intensité énergétique médiane (site) des ${f.length} bâtiments déclarants du corridor : ${med} kBtu/pi²/an.`, source: src(D.sfManifest, 'energy-benchmarks.geojson'), limits: 'Bâtiments soumis à déclaration seulement ; corridor Folsom/Howard.', sites: D.energy.features.slice(0, 40).map(x => ({ at: x.geometry.coordinates })) }];
}
export function mobility(D) {
  const mi = D.hin.features.reduce((s, f) => s + (f.properties.length_mi || 0), 0), rows = D.crashes.rows, killed = rows.reduce((s, r) => s + (r.killed || 0), 0), n = rows.reduce((s, r) => s + (r.n || 0), 0);
  return [{ id: 'm.hin', team: 'mobility', role: 'safety', status: 'observed', value: +mi.toFixed(1), period: '2024', claim: `Réseau à haut risque (HIN 2024) : ${fr(mi.toFixed(1))} miles de rues, ${fr(D.hin.features.length)} tronçons.`, source: src(D.sf9Manifest, 'hin.json'), limits: 'Désignation municipale ; ne mesure pas le risque futur.' },
    { id: 'm.crashes', team: 'mobility', role: 'safety', status: 'observed', value: n, period: `${D.crashes.window.from} → ${D.crashes.window.to}`, claim: `${fr(n)} collisions avec blessés enregistrées dans la zone d’étude, dont ${fr(killed)} mortelles.`, source: src(D.sf9Manifest, 'crashes-agg.json'), limits: 'Comptes agrégés ; sous-déclaration possible.' }];
}
export function forest(D) {
  return [{ id: 'f.trees', team: 'forestry', role: 'trees', status: 'observed', value: D.trees.features.length, period: 'instantané', claim: `${fr(D.trees.features.length)} arbres d’alignement inventoriés le long du corridor ; ${D.removals.features.length} avis d’abattage enregistrés.`, source: src(D.sfManifest, 'street-trees.geojson'), limits: 'Inventaire municipal ; état sanitaire non vérifié.', sites: D.trees.features.filter((_, i) => i % 12 === 0).map(f => ({ at: f.geometry.coordinates })) }];
}
export function freshness(D, today) {
  const all = [...(D.sfManifest.datasets || []), ...(D.sf9Manifest.datasets || []), ...(D.housingManifest.datasets || [])].filter(d => d.retrieved_at);
  const ages = all.map(d => ({ file: d.file, days: Math.floor((Date.parse(today) - Date.parse(d.retrieved_at)) / 864e5) })), oldest = ages.reduce((a, b) => b.days > a.days ? b : a);
  return [{ id: 'r.freshness', team: 'research', role: 'dates', status: 'derived', value: oldest.days, period: `au ${today.slice(0, 10)}`, claim: `${all.length} instantanés vérifiés ; le plus ancien (${oldest.file}) date de ${oldest.days} jour(s).`, source: { dataset: 'manifests', title: 'Manifestes des instantanés CORE', retrieved: today.slice(0, 10) }, limits: 'Âge de la copie CORE, pas de la donnée source.' }];
}
export function sidewalk(D) {
  const p = D.problems.problems.find(x => x.id === 'sidewalk-below-bsp-min:5665000');
  return [{ id: 's.sidewalk', team: 'public-space', role: 'sidewalks', status: 'observed', value: p?.metrics?.width_ft, period: 'étude 2014', claim: `Test de régression : trottoir Folsom St mesuré ${p?.metrics?.width_ft} ft pour un minimum de ${p?.metrics?.min_ft} ft (étude 2014).`, source: { dataset: 'sidewalks:8562', title: 'Sidewalk Widths (2014)', retrieved: (p?.asOf || '').slice(0, 10) }, limits: p?.caveat || '' }];
}
