// CORE V7.2 — mission analyses. Pure functions: dated public records in, cited findings out. Every number is computed
// here from the snapshot files (never typed by hand, never produced by a model). A finding carries its source, the
// retrieval date, the period it covers, a status ('observed' = a recorded count/sum; 'derived' = arithmetic on observed
// values) and its limitations. Gaps (what CORE cannot establish with the loaded data) are findings too.
// V9: every human-readable field is bilingual { en, fr } (English is the reference); numbers are formatted per locale.
import { T, locale, translate } from '../i18n/i18n.mjs';
export const FILES = {
  pipeline: 'data/sf-housing/pipeline.geojson', prodYear: 'data/sf-housing/production-by-year.json', prodNb: 'data/sf-housing/production-by-neighborhood.json',
  evictions: 'data/sf-housing/evictions-agg.json', housingManifest: 'data/sf-housing/manifest.json', flood: 'data/sf9/flood-zone.json', sf9Manifest: 'data/sf9/manifest.json',
  hin: 'data/sf9/hin.json', crashes: 'data/sf9/crashes-agg.json', energy: 'data/sf/energy-benchmarks.geojson', trees: 'data/sf/street-trees.geojson', removals: 'data/sf/tree-removals.geojson',
  sfManifest: 'data/sf/manifest.json', problems: 'data/problems/registry.json', corridor: 'data/sf/corridor.geojson',
  mobility: 'data/mobility/results.json', mobilityManifest: 'data/mobility/manifest.json',
};
// Locale helpers handed to bi(): x.n(number), x.pct(ratio), x.sgn(percent with sign), x.t(en, fr).
const SP = code => (['fr', 'de', 'es'].includes(code) ? ' %' : '%');
const H = code => ({ code, n: v => Number(v).toLocaleString(locale(code)), pct: r => `${Number((r * 100).toFixed(1)).toLocaleString(locale(code))}${SP(code)}`,
  sgn: p => `${p > 0 ? '+' : ''}${Number(p).toLocaleString(locale(code))}${SP(code)}`, t: (en, fr) => T(en, fr, code) });
export const bi = f => ({ en: f(H('en')), fr: f(H('fr')) });
export const B = (en, fr) => ({ en, fr });
export const txt = (x, code = 'en') => (x && typeof x === 'object' ? x[code] ?? x.en : x ?? '');
const src = (manifest, file, extra = {}) => { const d = manifest?.datasets?.find(x => x.file === file) || {}; return { dataset: d.id || file, title: d.title || file, page: d.page || null, retrieved: (d.retrieved_at || '').slice(0, 10), license: d.license?.name || null, ...extra }; };
const GAP = B('Declared gap.', 'Lacune déclarée.');
// Ray casting on [lng, lat] rings; polygons with holes and multipolygons.
const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
export const inPolygon = (p, g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).some(poly => inRing(p, poly[0]) && !poly.slice(1).some(h => inRing(p, h)));

export function housing(D) {
  const mh = D.housingManifest, m9 = D.sf9Manifest, F = [];
  // F1 — production trend (complete years only; the current year is partial).
  const years = D.prodYear.filter(r => r.year >= 2016 && r.year <= 2025), sum = (a, k) => a.reduce((s, r) => s + r[k], 0);
  const early = years.filter(r => r.year <= 2020), late = years.filter(r => r.year >= 2021);
  const e = sum(early, 'net_units') / early.length, l = sum(late, 'net_units') / late.length;
  F.push({ id: 'h.production-trend', team: 'housing', role: 'production', status: 'derived', value: +((l - e) / e).toFixed(3), period: B('2016–2025 (complete years)', '2016–2025 (années complètes)'),
    claim: bi(x => x.t(`Net new homes completed: ${x.n(Math.round(e))} a year on average in 2016–2020, ${x.n(Math.round(l))} a year in 2021–2025 (${x.pct((l - e) / e)}).`, `Logements nets achevés : ${x.n(Math.round(e))} par an en moyenne en 2016–2020, ${x.n(Math.round(l))} par an en 2021–2025 (${x.pct((l - e) / e)}).`)),
    source: src(mh, 'production-by-year.json'), limits: B('Completions reported to the Planning Department; the current year is partial and excluded; a completion says nothing about prices.', 'Achèvements déclarés au Département de l’urbanisme ; l’année en cours est partielle et exclue ; un achèvement ne dit rien des prix.') });
  // F2 — affordable share of completions.
  const aff = sum(late, 'affordable_units'), net = sum(late, 'net_units');
  F.push({ id: 'h.affordable-share', team: 'housing', role: 'affordability', status: 'derived', value: +(aff / net).toFixed(3), period: B('2021–2025', '2021–2025'),
    claim: bi(x => x.t(`${x.n(aff)} affordable homes out of ${x.n(net)} completed in 2021–2025, i.e. ${x.pct(aff / net)}.`, `${x.n(aff)} logements abordables sur ${x.n(net)} achevés en 2021–2025, soit ${x.pct(aff / net)}.`)), source: src(mh, 'production-by-year.json'),
    limits: B('Part of the “affordable” count is estimated by the source (affordable_is_estimate); “affordable” refers to programme income limits, not to household incomes.', 'Une partie des logements « abordables » est estimée par la source (champ affordable_is_estimate) ; « abordable » renvoie aux seuils de revenu des programmes, pas au revenu des ménages.') });
  // F3 — affordable pipeline.
  const P = D.pipeline.features.map(f => f.properties), live = P.filter(p => !/Completed/i.test(p.status || ''));
  const byStatus = live.reduce((m, p) => (m[p.status] = (m[p.status] || 0) + 1, m), {});
  const units = live.reduce((s, p) => s + p.affordable, 0), full = live.filter(p => /100% Affordable/.test(p.program || '')).length, snap = src(mh, 'pipeline.geojson').retrieved;
  F.push({ id: 'h.pipeline', team: 'housing', role: 'pipeline', status: 'observed', value: units, period: B(`snapshot of ${snap}`, `instantané du ${snap}`),
    claim: bi(x => x.t(`The city’s pipeline holds ${x.n(live.length)} unfinished projects for ${x.n(units)} affordable homes (${x.n(full)} of them 100% affordable projects).`, `Le pipeline de la ville compte ${x.n(live.length)} projets non achevés pour ${x.n(units)} logements abordables (dont ${x.n(full)} projets 100 % abordables).`)),
    detail: byStatus, source: src(mh, 'pipeline.geojson'), limits: B('Completion dates are MOHCD estimates; a pipeline project can be delayed or abandoned.', 'Dates d’achèvement estimées par la MOHCD ; un projet du pipeline peut être retardé ou abandonné.') });
  // F4 — where the affordable pipeline is.
  const byNb = Object.entries(live.reduce((m, p) => (m[p.neighborhood || '—'] = (m[p.neighborhood || '—'] || 0) + p.affordable, m), {})).sort((a, b) => b[1] - a[1]);
  const top3 = byNb.slice(0, 3), topShare = top3.reduce((s, x) => s + x[1], 0) / units;
  F.push({ id: 'h.pipeline-geography', team: 'housing', role: 'siting', status: 'derived', value: +topShare.toFixed(3), period: B('snapshot', 'instantané'),
    claim: bi(x => x.t(`${x.pct(topShare)} of the pipeline’s affordable homes are in three neighbourhoods: ${top3.map(([nb, u]) => `${nb} (${x.n(u)})`).join(', ')}.`, `${x.pct(topShare)} des logements abordables du pipeline sont dans trois quartiers : ${top3.map(([nb, u]) => `${nb} (${x.n(u)})`).join(', ')}.`)),
    source: src(mh, 'pipeline.geojson'), limits: B('An observed concentration; it does not say whether it is desirable.', 'Concentration observée ; elle ne dit pas si elle est souhaitable.') });
  // F5 — eviction notices (aggregated).
  const ev = D.evictions.byYear.filter(r => r.year <= 2025), low = ev.reduce((a, r) => r.notices < a.notices ? r : a), last = ev.at(-1), first = ev[0];
  F.push({ id: 'h.eviction-notices', team: 'social', role: 'displacement', status: 'observed', value: last.notices, period: B(`${first.year}–${last.year}`, `${first.year}–${last.year}`),
    claim: bi(x => x.t(`Eviction notices filed: ${x.n(first.notices)} in ${first.year}, a low of ${x.n(low.notices)} in ${low.year}, ${x.n(last.notices)} in ${last.year}.`, `Avis d’expulsion déposés : ${x.n(first.notices)} en ${first.year}, minimum de ${x.n(low.notices)} en ${low.year}, ${x.n(last.notices)} en ${last.year}.`)),
    source: src(mh, 'evictions-agg.json'), limits: B('A notice filed is not an eviction carried out; 2020–2021 were shaped by public-health moratoria; aggregated counts only (no individual data kept).', 'Un avis déposé n’est pas une expulsion exécutée ; 2020–2021 sont marquées par des moratoires sanitaires ; comptes agrégés uniquement (aucune donnée individuelle conservée).') });
  // F6 — affordable pipeline inside the 2022 100-year storm flood risk zone (study area only).
  const zone = D.flood.features[0], bbox = zone.properties.clipped_to, inBox = p => p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3];
  const studied = D.pipeline.features.filter(f => !/Completed/i.test(f.properties.status || '') && inBox(f.geometry.coordinates));
  const wet = studied.filter(f => inPolygon(f.geometry.coordinates, zone.geometry)), wetUnits = wet.reduce((s, f) => s + f.properties.affordable, 0);
  F.push({ id: 'h.flood-exposure', team: 'climate', role: 'flood', status: 'derived', value: wet.length, period: B('zone of July 2022; pipeline snapshot', 'zone de juillet 2022 ; pipeline instantané'),
    claim: bi(x => x.t(`In the study area (SoMa, Mission, Tenderloin), ${wet.length} of the ${studied.length} unfinished affordable projects (${x.n(wetUnits)} homes) lie in the 100-year storm flood risk zone (2022).`, `Dans la zone d’étude (SoMa, Mission, Tenderloin), ${wet.length} des ${studied.length} projets abordables non achevés (${x.n(wetUnits)} logements) sont situés dans la zone de risque d’inondation par orage centennal (2022).`)),
    sites: wet.map(f => ({ id: f.properties.id, at: f.geometry.coordinates, units: f.properties.affordable })), source: src(m9, 'flood-zone.json', { second: src(mh, 'pipeline.geojson') }),
    limits: B('Stormwater flooding zone (not sea-level rise); study area only; a project inside the zone may plan protections these data do not describe.', 'Zone de ruissellement pluvial (pas l’élévation du niveau de la mer) ; seulement la zone d’étude ; un projet en zone peut prévoir des mesures de protection que ces données ne décrivent pas.') });
  // Gaps: what cannot be established with the loaded data.
  const GAPS = [['g.rent-burden', B('Renter cost burden, median rents and incomes: not established (the Census Data API now requires a key; no key without a founder decision).', 'Taux d’effort des locataires, loyers médians et revenus : non établis (le Census Data API exige désormais une clé ; aucune clé sans décision du fondateur).')],
    ['g.prices', B('Market prices and rents: no open source loaded.', 'Prix et loyers de marché : aucune source ouverte chargée.')], ['g.zoning', B('Zoning capacity and land constraints: not loaded.', 'Capacité de zonage et contraintes foncières : non chargées.')],
    ['g.transit', B('Transit access per project: not computed (no service data loaded).', 'Accès aux transports par projet : non calculé (pas de données de desserte chargées).')], ['g.causality', B('No cause-and-effect relationship is established by these counts.', 'Aucune relation de cause à effet n’est établie par ces comptes.')]];
  for (const [id, claim] of GAPS) F.push({ id, team: 'research', role: 'sources', status: 'gap', claim, source: null, limits: GAP });
  const Hy = [
    { id: 'H1', title: B('Insufficient production', 'Production insuffisante'), statement: B('The drop in completions since 2021 contributes to the shortage of affordable homes.', 'La baisse des achèvements depuis 2021 contribue au manque de logements abordables.'), support: ['h.production-trend', 'h.pipeline'], against: ['g.prices', 'g.causality'], test: B('Compare production with household growth, using dated rents (sources still to load).', 'Comparer production et croissance des ménages, avec des loyers datés (sources à charger).'), team: 'housing' },
    { id: 'H2', title: B('Displacement pressure', 'Pression de déplacement'), statement: B('The rise in eviction notices since 2023 signals pressure on renters, unevenly spread across neighbourhoods.', 'La remontée des avis d’expulsion depuis 2023 signale une pression sur les locataires, inégale selon les quartiers.'), support: ['h.eviction-notices'], against: ['g.rent-burden', 'g.causality'], test: B('Notices per neighbourhood relative to the number of rental homes (missing denominator).', 'Avis par quartier rapportés au nombre de logements locatifs (dénominateur manquant).'), team: 'social' },
    { id: 'H3', title: B('Location and resilience', 'Localisation et résilience'), statement: B('Part of the study area’s affordable pipeline is exposed to flood risk: building more could expose more low-income households.', 'Une part du pipeline abordable de la zone d’étude est exposée au risque d’inondation : produire plus peut exposer plus de ménages modestes.'), support: ['h.flood-exposure', 'h.pipeline-geography'], against: ['g.causality'], test: B('Check the protections planned for each project; extend the risk zone to the whole city.', 'Vérifier les mesures de protection prévues par projet ; étendre la zone de risque à toute la ville.'), team: 'climate' },
  ];
  const DISSENT = [
    { by: 'research', text: B('2020–2021 (moratoria) distort any eviction-notice trend: compare outside those years.', 'Les années 2020–2021 (moratoires) faussent toute tendance des avis d’expulsion : comparer hors de ces années.') },
    { by: 'safety', text: B('H1 and H2 are not mutually exclusive; no loaded data can tell them apart. Do not present a hypothesis as the cause.', 'H1 et H2 ne sont pas exclusives ; aucune donnée chargée ne permet de les départager. Ne pas présenter une hypothèse comme la cause.') },
    { by: 'ethics', text: B('Eviction notices concern people: use aggregates only, never locate households.', 'Les avis d’expulsion concernent des personnes : n’utiliser que des agrégats, ne jamais localiser des ménages.') },
    { by: 'climate', text: B('The 100-year stormwater zone is only one risk; a project outside it is not thereby safe.', 'La zone pluviale centennale n’est qu’un des risques ; l’absence d’un projet dans cette zone ne veut pas dire qu’il est sûr.') },
  ];
  return { findings: F, hypotheses: Hy, dissent: DISSENT };
}

// Background missions for other teams, all on data already in the repository.
export function energy(D) {
  const f = D.energy.features.map(x => x.properties).filter(p => p.site_eui > 0), v = f.map(p => p.site_eui).sort((a, b) => a - b), med = v[Math.floor(v.length / 2)], yr = Math.max(...f.map(p => p.year));
  return [{ id: 'e.eui', team: 'energy', role: 'benchmark', status: 'derived', value: med, period: B(`${yr} filings`, `déclarations ${yr}`),
    claim: bi(x => x.t(`Median site energy use intensity of the corridor’s ${f.length} reporting buildings: ${x.n(med)} kBtu/ft²/year.`, `Intensité énergétique médiane (site) des ${f.length} bâtiments déclarants du corridor : ${x.n(med)} kBtu/pi²/an.`)), source: src(D.sfManifest, 'energy-benchmarks.geojson'),
    limits: B('Buildings subject to the benchmarking ordinance only; Folsom/Howard corridor.', 'Bâtiments soumis à déclaration seulement ; corridor Folsom/Howard.'), sites: D.energy.features.slice(0, 40).map(x => ({ at: x.geometry.coordinates })) }];
}
export function mobility(D) {
  const mi = D.hin.features.reduce((s, f) => s + (f.properties.length_mi || 0), 0), rows = D.crashes.rows, killed = rows.reduce((s, r) => s + (r.killed || 0), 0), n = rows.reduce((s, r) => s + (r.n || 0), 0);
  return [{ id: 'm.hin', team: 'mobility', role: 'safety', status: 'observed', value: +mi.toFixed(1), period: B('2024', '2024'), claim: bi(x => x.t(`High-Injury Network (2024): ${x.n(+mi.toFixed(1))} miles of streets, ${x.n(D.hin.features.length)} segments.`, `Réseau à haut risque (HIN 2024) : ${x.n(+mi.toFixed(1))} miles de rues, ${x.n(D.hin.features.length)} tronçons.`)), source: src(D.sf9Manifest, 'hin.json'), limits: B('A city designation; it does not measure future risk.', 'Désignation municipale ; ne mesure pas le risque futur.') },
    { id: 'm.crashes', team: 'mobility', role: 'safety', status: 'observed', value: n, period: B(`${D.crashes.window.from} → ${D.crashes.window.to}`, `${D.crashes.window.from} → ${D.crashes.window.to}`), claim: bi(x => x.t(`${x.n(n)} injury collisions recorded in the study area, ${x.n(killed)} of them fatal.`, `${x.n(n)} collisions avec blessés enregistrées dans la zone d’étude, dont ${x.n(killed)} mortelles.`)), source: src(D.sf9Manifest, 'crashes-agg.json'), limits: B('Aggregated counts; possible under-reporting.', 'Comptes agrégés ; sous-déclaration possible.') }];
}
export function forest(D) {
  return [{ id: 'f.trees', team: 'forestry', role: 'trees', status: 'observed', value: D.trees.features.length, period: B('snapshot', 'instantané'), claim: bi(x => x.t(`${x.n(D.trees.features.length)} street trees inventoried along the corridor; ${D.removals.features.length} removal notices recorded.`, `${x.n(D.trees.features.length)} arbres d’alignement inventoriés le long du corridor ; ${D.removals.features.length} avis d’abattage enregistrés.`)), source: src(D.sfManifest, 'street-trees.geojson'), limits: B('City inventory; tree health not verified.', 'Inventaire municipal ; état sanitaire non vérifié.'), sites: D.trees.features.filter((_, i) => i % 12 === 0).map(f => ({ at: f.geometry.coordinates })) }];
}
export function freshness(D, today) {
  const all = [...(D.sfManifest.datasets || []), ...(D.sf9Manifest.datasets || []), ...(D.housingManifest.datasets || [])].filter(d => d.retrieved_at);
  const ages = all.map(d => ({ file: d.file, days: Math.floor((Date.parse(today) - Date.parse(d.retrieved_at)) / 864e5) })), oldest = ages.reduce((a, b) => b.days > a.days ? b : a), day = today.slice(0, 10);
  return [{ id: 'r.freshness', team: 'research', role: 'dates', status: 'derived', value: oldest.days, period: B(`as of ${day}`, `au ${day}`), claim: B(`${all.length} verified snapshots; the oldest (${oldest.file}) is ${oldest.days} day(s) old.`, `${all.length} instantanés vérifiés ; le plus ancien (${oldest.file}) date de ${oldest.days} jour(s).`), source: { dataset: 'manifests', title: 'CORE snapshot manifests', retrieved: day }, limits: B('Age of CORE’s copy, not of the source data.', 'Âge de la copie CORE, pas de la donnée source.') }];
}
export function sidewalk(D) {
  const p = D.problems.problems.find(x => x.id === 'sidewalk-below-bsp-min:5665000');
  return [{ id: 's.sidewalk', team: 'public-space', role: 'sidewalks', status: 'observed', value: p?.metrics?.width_ft, period: B('2014 survey', 'étude 2014'), claim: B(`Regression test: Folsom St sidewalk measured at ${p?.metrics?.width_ft} ft against a minimum of ${p?.metrics?.min_ft} ft (2014 survey).`, `Test de régression : trottoir Folsom St mesuré ${p?.metrics?.width_ft} ft pour un minimum de ${p?.metrics?.min_ft} ft (étude 2014).`), source: { dataset: 'sidewalks:8562', title: 'Sidewalk Widths (2014)', retrieved: (p?.asOf || '').slice(0, 10) }, limits: B(p?.caveat || '', p?.caveat || '') }];
}

// V8 — mobility simulation findings from the recorded SUMO runs (data/mobility). Everything here is a MODEL result: the network is
// real (OpenStreetMap), demand, signal plans and bus headways are synthetic, and nothing is calibrated.
export const SCENARIO_TEXT = {
  S0: { label: B('Baseline (modelled situation)', 'Référence (situation modélisée)'), change: B('OSM network, fixed signal plans generated by SUMO (real timing unknown), synthetic demand.', 'Réseau OSM, plans de feux fixes générés par SUMO (minutage réel inconnu), demande synthétique.') },
  A: { label: B('Bus-only lane on Folsom', 'Voie réservée bus sur Folsom'), change: B('The right-hand lane of Folsom (segments with 3 or more lanes) is reserved for buses.', 'La voie de droite de Folsom (tronçons à 3 voies ou plus) est réservée aux bus.'),
    why: B('Folsom has 6 segments with fewer than 3 lanes where the bus lane breaks off: cars lose a lane there, queues spill back up the corridor, and buses get stuck in them.', 'Folsom compte 6 tronçons à moins de 3 voies où la voie bus s’interrompt : privées d’une voie, les voitures y forment des files qui remontent le corridor, et les bus y restent pris.') },
  B: { label: B('Adaptive (actuated) signals', 'Feux adaptatifs (actionnés)'), change: B('Every signal switches to demand-actuated mode (SUMO’s algorithm, not real equipment).', 'Tous les feux passent en mode actionné par la demande (algorithme SUMO, pas un équipement réel).'),
    why: B('Actuated signals cut dead time at lightly loaded intersections; the gain depends on real signal plans we do not know.', 'Les feux actionnés réduisent les temps morts aux carrefours peu chargés ; le gain dépend de plans de feux réels que nous ne connaissons pas.') },
  C: { label: B('Protected bike lane (road diet)', 'Voie cyclable protégée (régime de voirie)'), change: B('Folsom’s right-hand lane becomes a bike lane: one car lane fewer.', 'La voie de droite de Folsom devient une voie cyclable : une voie voiture en moins.'),
    why: B('One car lane fewer with unchanged demand: capacity drops and queues grow (the model does not simulate the additional cyclists).', 'Une voie voiture en moins sans baisse de demande : la capacité baisse, les files s’allongent (le modèle ne simule pas les cyclistes supplémentaires).') },
  D: { label: B('Demand management (−15% car trips)', 'Gestion de la demande (−15 % de trajets voiture)'), change: B('Assumption: 15% fewer car trips (e.g. pricing, remote work), not modelled causally.', 'Hypothèse : 15 % de trajets voiture en moins (ex. tarification, télétravail) : non modélisé causalement.'),
    why: B('Fewer car trips: a mechanical effect of a demand assumption, not of a measure whose feasibility is known.', 'Moins de trajets voiture : effet mécanique d’une hypothèse de demande, pas d’une mesure dont on connaîtrait la faisabilité.') },
};
export const SIM_CALIBRATION = B('UNCALIBRATED, no result describes real traffic in San Francisco.', 'NON CALIBRÉ : aucun résultat ne décrit le trafic réel de San Francisco.');
export const SIM_VERDICT = (R, code) => { if (code !== 'en' && code !== 'fr') return translate(SIM_VERDICT(R, 'en'), code); const ok = R.scenarios.filter(s => s.status === 'promising-uncalibrated').map(s => s.id).join(', ');
  return code === 'fr' ? `Pistes techniquement prometteuses dans un modèle non calibré : ${ok || 'aucune'}. Le modèle n’est pas calibré (aucun comptage de trafic, aucun minutage de feux réel, demande synthétique) : aucun scénario ne peut être recommandé sans données réelles et revue humaine.`
    : `Technically promising options in an uncalibrated model: ${ok || 'none'}. The model is not calibrated (no traffic counts, no real signal timing, synthetic demand): no scenario can be recommended without real data and human review.`; };
export function mobilitySim(D) {
  const R = D.mobility, M = D.mobilityManifest, src = { dataset: 'data/mobility/results.json', title: `SUMO 1.27.1 simulations (${M.seeds.length} seeds, ${M.simulatedSeconds / 60} simulated minutes)`, retrieved: M.generated_at.slice(0, 10), page: 'https://eclipse.dev/sumo/' };
  const b = R.scenarios.find(x => x.id === 'S0').summary, f = [], s = n => Math.round(n), MOD = B('uncalibrated model', 'modèle non calibré');
  f.push({ id: 'm.baseline', team: 'mobility', role: 'safety', status: 'simulated', value: b.carDelay.mean, period: MOD,
    claim: bi(x => x.t(`Modelled baseline (real OSM network, synthetic demand): mean car delay ${s(b.carDelay.mean)} s (± ${s(b.carDelay.ci95)} s), bus travel time ${s(b.busTravelTime.mean)} s on the synthetic Folsom line.`, `Référence modélisée (réseau OSM réel, demande synthétique) : retard moyen voiture ${s(b.carDelay.mean)} s (± ${s(b.carDelay.ci95)} s), temps de parcours bus ${s(b.busTravelTime.mean)} s sur la ligne synthétique de Folsom.`)), source: src, limits: SIM_CALIBRATION });
  for (const x of R.scenarios.filter(x => x.id !== 'S0')) {
    const c = x.comparison, ST = SCENARIO_TEXT[x.id];
    f.push({ id: `m.scenario-${x.id}`, team: 'mobility', role: 'safety', status: 'simulated', value: c.carDelay.pct, period: MOD, scenario: x.id,
      claim: bi(h => h.t(`Scenario ${x.id} · ${ST.label.en}: car delay ${h.sgn(c.carDelay.pct)}, bus time ${h.sgn(c.busTravelTime.pct)}, estimated CO2 ${h.sgn(c.co2kg.pct)} versus the baseline${c.carDelay.beyondNoise ? '' : ' (difference within seed noise)'}.`, `Scénario ${x.id} · ${ST.label.fr} : retard voiture ${h.sgn(c.carDelay.pct)}, temps bus ${h.sgn(c.busTravelTime.pct)}, CO2 estimé ${h.sgn(c.co2kg.pct)} par rapport à la référence${c.carDelay.beyondNoise ? '' : ' (écart dans le bruit des graines)'}.`)), source: src, limits: B(`${ST.why.en} ${SIM_CALIBRATION.en}`, `${ST.why.fr} ${SIM_CALIBRATION.fr}`) });
  }
  const par = R.search.simulated.filter(x => x.pareto);
  f.push({ id: 'm.search', team: 'mobility', role: 'safety', status: 'simulated', value: R.search.simulated.length, period: MOD,
    claim: bi(h => h.t(`Scenario search: ${R.search.generated} configurations generated, ${R.search.rejected.length} rejected by a constraint, ${R.search.simulated.length} simulated (3 seeds); Pareto front: ${par.map(x => `${x.network} at ${Math.round(x.demandScale * 100)}% demand`).join(', ')}.`, `Recherche de scénarios : ${R.search.generated} configurations générées, ${R.search.rejected.length} rejetée(s) par contrainte, ${R.search.simulated.length} simulées (3 graines) ; front de Pareto : ${par.map(x => `${x.network} à ${Math.round(x.demandScale * 100)} % de demande`).join(', ')}.`)), source: src, limits: B('Grid of 15 configurations; constraint filtering; 3 seeds each; no surrogate model used.', 'Grille de 15 configurations ; filtrage par contraintes ; 3 graines chacune ; aucun modèle de substitution utilisé.') });
  const N = M.network;
  f.push({ id: 'm.signals', team: 'research', role: 'provenance', status: 'observed', value: N.signalsMatchedWithin35m, period: B('snapshot', 'instantané'), claim: B(`${N.signalsMatchedWithin35m} of the model’s ${N.signalsInModel} signals match a signal recorded by DataSF (within 35 m); ${N.signalsDataSF} signals recorded in the area.`, `${N.signalsMatchedWithin35m} des ${N.signalsInModel} feux du modèle correspondent à un feu recensé par DataSF (à moins de 35 m) ; ${N.signalsDataSF} feux recensés dans la zone.`), source: { dataset: 'ybh5-27n2', title: 'Traffic Signals (DataSF)', retrieved: M.sources.find(x => x.id === 'ybh5-27n2')?.retrieved_at?.slice(0, 10), page: 'https://data.sf.gov/d/ybh5-27n2' }, limits: B('Presence of signals only; their timing is not published.', 'Présence des feux seulement ; leur minutage n’est pas publié.') });
  for (const [id, claim] of [['g.counts', B('Traffic counts: no public dataset found: demand is synthetic.', 'Comptages de trafic : aucun jeu public trouvé, la demande est synthétique.')], ['g.timing', B('Real signal timing: not published: signal plans are generated by SUMO.', 'Minutage réel des feux : non publié, les plans de feux sont générés par SUMO.')], ['g.gtfs', B('Muni schedules (GTFS): access requires accepting a licence (indemnity, California law), a founder decision; the bus line is an assumption.', 'Horaires Muni (GTFS) : l’accès exige d’accepter une licence (indemnisation, droit californien) : décision du fondateur ; la ligne de bus est une hypothèse.')]])
    f.push({ id, team: 'research', role: 'sources', status: 'gap', claim, source: null, limits: GAP });
  const Hy = [
    { id: 'HM1', title: B('Actuated signals', 'Feux actionnés'), statement: B('In this model, actuated signals reduce delay for cars and buses; this must be checked against real signal plans.', 'Dans ce modèle, des feux actionnés réduisent le retard des voitures et des bus ; il faut vérifier avec les plans de feux réels.'), support: ['m.scenario-B'], against: ['g.timing', 'g.counts'], test: B('Obtain signal plans and traffic counts, calibrate the baseline, replay B.', 'Obtenir les plans de feux et des comptages, calibrer la référence, rejouer B.'), team: 'mobility' },
    { id: 'HM2', title: B('Continuous bus lane', 'Voie bus continue'), statement: B('A bus lane only helps buses if it is continuous: in this model, its gaps cause queues to spill back.', 'Une voie bus n’aide les bus que si elle est continue : dans ce modèle, ses interruptions provoquent des remontées de files.'), support: ['m.scenario-A'], against: ['g.counts', 'g.gtfs'], test: B('Simulate a continuous bus lane with turning queues (scenario still to build).', 'Simuler une voie bus continue avec files d’attente de virage (scénario à construire).'), team: 'mobility' },
    { id: 'HM3', title: B('Demand reduction', 'Réduction de la demande'), statement: B('Fewer car trips reduce delay; this remains a demand assumption until a concrete measure is modelled.', 'Moins de trajets voiture réduit le retard ; ce n’est qu’une hypothèse de demande tant qu’aucune mesure concrète n’est modélisée.'), support: ['m.scenario-D'], against: ['g.counts'], test: B('Model a specific measure (pricing, mode shift) and its effects measured elsewhere.', 'Modéliser une mesure précise (tarification, report modal) et ses effets mesurés ailleurs.'), team: 'mobility' },
  ];
  const DISSENT = [{ by: 'safety', text: B('An uncalibrated model cannot justify recommending an intervention: rankings may flip under real demand.', 'Un modèle non calibré ne permet pas de recommander une intervention : les classements peuvent s’inverser avec la demande réelle.') }, { by: 'ethics', text: B('The road diet worsens car time in this model, but the model simulates neither cyclists nor safety: do not judge it on car delay alone.', 'Le régime de voirie dégrade le temps voiture dans ce modèle mais il ne simule pas les cyclistes ni la sécurité : ne pas le juger sur le seul retard voiture.') }];
  return { findings: f, hypotheses: Hy, dissent: DISSENT, verdict: B(SIM_VERDICT(R, 'en'), SIM_VERDICT(R, 'fr')) };
}
