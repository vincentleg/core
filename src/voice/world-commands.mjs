// Deterministic, read-only city commands shared by typed and spoken input. No network, model or browser storage.
import { CITIES } from '../execution/city-registry.mjs';
import { SF_MOBILITY, SF_HOUSING } from '../execution/missions.mjs';

const norm = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const NAMES = [['san-francisco', /\b(san francisco|sf)\b/], ['oakland', /\boakland\b/], ['new-york', /\b(new york|nyc)\b/], ['paris', /\bparis\b/], ['nairobi', /\bnairobi\b/], ['tokyo', /\btokyo\b/]];
const specs = [SF_MOBILITY, SF_HOUSING];
const tr = (code, en, fr) => code === 'fr' ? fr : en;
const title = (spec, code) => spec.title[code] || spec.title.en;
const cityName = (city, code) => city.name[code] || city.name.en;
const cityMention = q => NAMES.find(([, re]) => re.test(q))?.[0] || null;
const language = (q, preferred) => /\b(montre|emmene|ramene|retourne|quelles?|ville|ici|preuves?|explique|ouvre|peut|comparer|comparaison|mobilite|donnees)\b/.test(q) ? 'fr' : preferred === 'fr' ? 'fr' : 'en';

export function createWorldSession() { return { cityId: null, missionId: null, history: [], reset() { this.cityId = null; this.missionId = null; this.history = []; } }; }
export const worldSession = createWorldSession();

export function worldCommand(text, { cityId = undefined, missionId = null, code = 'en', session = worldSession } = {}) {
  const q = norm(String(text).slice(0, 400)); if (!q) return null;
  code = language(q, code);
  const named = cityMention(q), here = cityId === undefined ? session.cityId : cityId, id = named || here, city = CITIES[id] || null;
  const result = (answer, action = null, sources = []) => ({ text: answer, action, cityId: id || null, missionId: missionId || session.missionId, code, sources });
  if (/\b(publish|publie|approve|approuve|deploy|deploie|delete|supprime|efface|reactivate|reactive)\b/.test(q)) return result(tr(code, 'That action requires the existing human governance process. Voice and text commands cannot approve, publish, delete or deploy anything.', 'Cette action exige la procédure humaine existante. Les commandes vocales ou écrites ne peuvent rien approuver, publier, supprimer ou déployer.'));
  if (/\b(folsom street|golden gate bridge|2nd street|hawthorne street)\b/.test(q) && /\b(take|go|fly|navigate|emmene|va|aller)\b/.test(q)) return null; // Existing place router keeps the precise destination.
  if (/\b(my core|mon core)\b/.test(q) && /\b(open|show|ouvre|montre|aller|va)\b/.test(q)) return result(tr(code, 'Opening My CORE. Your saved investigations stay in this browser.', 'Ouverture de Mon CORE. Vos enquêtes enregistrées restent dans ce navigateur.'), { type: 'my-core' });
  if (/\b(earth|world|globe|terre|monde|planete)\b/.test(q) && /\b(show|return|back|go|take|again|montre|retourne|reviens|ramene|va|voir)\b/.test(q)) return { ...result(tr(code, 'Returning to global Earth. City scientific coverage remains limited to the supported records.', 'Retour à la Terre entière. La couverture scientifique urbaine reste limitée aux données étayées.'), { type: 'globe' }), cityId: null, missionId: null };
  if (/\b(compare|comparison|comparer|comparaison)\b/.test(q) && /\b(missions?|mission)\b/.test(q)) {
    if (!city) return result(tr(code, 'Select a city first. Only San Francisco has a supported two-mission comparison.', 'Choisissez d’abord une ville. Seule San Francisco dispose d’une comparaison étayée entre deux missions.'));
    if (id !== 'san-francisco') return result(tr(code, `${cityName(city, code)} has no supported cross-mission comparison.`, `${cityName(city, code)} ne dispose pas de comparaison étayée entre missions.`));
    return result(tr(code, 'Opening San Francisco City Intelligence. The missions share one verified analysis neighbourhood; co-location does not establish causality. Results remain exploratory and require human review.', 'Ouverture de l’intelligence urbaine de San Francisco. Les missions partagent un quartier d’analyse vérifié ; la co-localisation ne prouve aucune causalité. Les résultats restent exploratoires et exigent une revue humaine.'), { type: 'city-intelligence' }, ['data/sf-housing/neighborhoods.geojson', 'src/execution/city.mjs']);
  }
  if (/\b(city intelligence|intelligence urbaine)\b/.test(q)) {
    if (id === 'san-francisco') return result(tr(code, 'Opening San Francisco City Intelligence: two runnable missions, verified area relationships, explicit gaps and human review.', 'Ouverture de l’intelligence urbaine de San Francisco : deux missions exécutables, liens géographiques vérifiés, lacunes explicites et revue humaine.'), { type: 'city-intelligence' }, ['src/execution/city.mjs']);
    return result(city ? tr(code, `${cityName(city, code)} has no operational City Intelligence. ${city.limitation.en}`, `${cityName(city, code)} ne dispose pas d’intelligence urbaine opérationnelle. ${city.limitation.fr}`) : tr(code, 'Select San Francisco to open the supported City Intelligence view.', 'Choisissez San Francisco pour ouvrir la vue d’intelligence urbaine étayée.'), named ? { type: 'select-city', id } : null);
  }
  if (/\b(evidence|sources?|preuves?|donn[eé]es|donnees)\b/.test(q) && /\b(show|open|explain|what|which|montre|ouvre|explique|quelles?|quelle|voir)\b/.test(q)) {
    if (id !== 'san-francisco') return result(city ? tr(code, `No authorized scientific evidence is bundled for ${cityName(city, code)}. ${city.limitation.en}`, `Aucune preuve scientifique autorisée n’est intégrée pour ${cityName(city, code)}. ${city.limitation.fr}`) : tr(code, 'Select a city to inspect its evidence availability.', 'Choisissez une ville pour voir la disponibilité des preuves.'), named ? { type: 'select-city', id } : null);
    const spec = specs.find(s => s.id === (missionId || session.missionId));
    const evidence = (spec ? spec.evidence : specs.flatMap(s => s.evidence)).map(e => e.resource);
    return result(tr(code, 'Opening San Francisco evidence. Sources are dated bundled records with stated licences and gaps; the boundary checksum is checked. No scientific conclusion is approved.', 'Ouverture des preuves de San Francisco. Les sources sont des enregistrements datés avec licences et lacunes déclarées ; la somme de contrôle des limites est vérifiée. Aucune conclusion scientifique n’est approuvée.'), { type: 'city-intelligence' }, [...new Set(evidence)]);
  }
  if (/\b(mobility|mobilite|traffic|trafic|transport)\b/.test(q) && /\b(explain|open|show|what|explique|ouvre|montre|quelle|c est)\b/.test(q)) {
    return { ...result(tr(code, `${title(SF_MOBILITY, 'en')} is a bounded San Francisco calculation using bundled street geometry and recorded inputs. It is uncalibrated; observed traffic counts, verified signal plans and independent human review are still required.`, `${title(SF_MOBILITY, 'fr')} est un calcul borné à San Francisco fondé sur une géométrie intégrée et des entrées enregistrées. Il n’est pas calibré ; comptages observés, plans de feux vérifiés et revue humaine indépendante restent nécessaires.`), { type: 'mission', id: SF_MOBILITY.id }, SF_MOBILITY.evidence.map(e => e.resource)), cityId: 'san-francisco', missionId: SF_MOBILITY.id };
  }
  if (/\b(missions?|mission)\b/.test(q) && /\b(what|which|available|here|analyze|analyse|quelles?|quelle|disponibles?|ici|peut|faire|list|liste)\b/.test(q) || /\b(what can (core|you)|what (can|do) you analyze|que peut core)\b/.test(q)) {
    if (!city) return result(tr(code, 'Select a city first. San Francisco has two runnable local missions; other listed cities do not.', 'Choisissez d’abord une ville. San Francisco dispose de deux missions locales exécutables ; les autres villes listées n’en disposent pas.'));
    if (id === 'san-francisco') return result(tr(code, `San Francisco has two runnable missions: ${specs.map(s => title(s, 'en')).join('; ')}. They use authorized bundled evidence. Outputs are exploratory, not validated impacts; human review is required.`, `San Francisco dispose de deux missions exécutables : ${specs.map(s => title(s, 'fr')).join(' ; ')}. Elles utilisent des preuves intégrées autorisées. Les résultats sont exploratoires, pas des impacts validés ; une revue humaine est requise.`), named ? { type: 'select-city', id } : null, ['src/execution/missions.mjs', 'docs/DATA_SOURCES.md']);
    return result(tr(code, `${cityName(city, code)}: ${city.limitation.en}`, `${cityName(city, code)} : ${city.limitation.fr}`), named ? { type: 'select-city', id } : null);
  }
  if (named && /\b(show|take|go|fly|open|visit|navigate|montre|emmene|va|visite|ouvre|aller|voir)\b/.test(q)) return result(tr(code, `Going to ${cityName(city, 'en')}. ${id === 'san-francisco' ? 'Two runnable exploratory missions are available; independent review is still required.' : city.limitation.en}`, `Direction ${cityName(city, 'fr')}. ${id === 'san-francisco' ? 'Deux missions exploratoires exécutables sont disponibles ; une revue indépendante reste nécessaire.' : city.limitation.fr}`), { type: 'select-city', id });
  return null;
}

export async function executeWorldCommand(command, world) {
  switch (command.action?.type) {
    case 'select-city': return world?.selectCity ? (await world.selectCity(command.action.id), { navigated: true }) : { href: `world.html#city=${command.action.id}` };
    case 'city-intelligence': return world?.showCity ? (await world.showCity(), { navigated: true }) : { href: 'world.html#city=san-francisco' };
    case 'mission': return world?.openMission ? (await world.openMission(command.action.id), { navigated: true }) : { href: `world.html#mission=${command.action.id}` };
    case 'globe': return world?.goScale ? (await world.goScale('planet'), { navigated: true }) : { href: 'world.html#explore' };
    case 'my-core': return { href: 'me.html' };
    default: return { navigated: false };
  }
}
export function rememberWorldCommand(session, query, command) {
  session.cityId = command.cityId; session.missionId = command.missionId;
  session.history.push({ query: String(query).slice(0, 400), answer: command.text, cityId: command.cityId, missionId: command.missionId });
  session.history = session.history.slice(-10);
}
