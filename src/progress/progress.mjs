// CORE V8 — progress, measured in SEPARATE dimensions. There is no composite score: each dimension says what it counts,
// where the number comes from and what it does NOT mean. Rules:
//  • Real-world verified impact counts only improvements independently verified in the real world — today, none.
//    Simulations, agent work, findings and contributions never add to it.
//  • The Kardashev value is an energy-use metric for human civilisation (Sagan's interpolation), not a measure of
//    progress, well-being or CORE's effect; it is shown with its formula and uncertainty.
import { T } from '../i18n/i18n.mjs';
export const QBTU_J = 1.055056e18, YEAR_S = 31557600;
// Sagan (1973): K = (log10 P − 6) / 10, P in watts. Uncertainty: ±rel on P (method and estimation differences).
export function kardashev(quadBtu, rel = 0.1) {
  const P = quadBtu * QBTU_J / YEAR_S, K = p => (Math.log10(p) - 6) / 10;
  return { watts: P, terawatts: P / 1e12, K: K(P), low: K(P * (1 - rel)), high: K(P * (1 + rel)), rel, formula: T('K = (log10 P − 6) / 10, P in watts (Sagan’s interpolation, 1973)', 'K = (log10 P − 6) / 10, P en watts (interpolation de Sagan, 1973)') };
}
// Yearly series → K per year (for the trend), sorted by year.
export const kSeries = values => Object.entries(values).map(([y, q]) => ({ year: +y, quadBtu: q, ...kardashev(q) })).sort((a, b) => a.year - b.year);

// The dimensions, from published files (results, missions) and this browser's local runtime state (civ).
export function dimensions({ missions = [], mobility = null, civ = null, energy = null, problems = [] }) {
  const findings = missions.flatMap(m => m.findings || []), dated = findings.filter(f => f.status !== 'gap'), gaps = findings.filter(f => f.status === 'gap').length;
  const events = civ?.events || [], inputs = Object.values(civ?.missions || {}).flatMap(ms => ms.humanInputs || []);
  const tasksDone = Object.values(civ?.missions || {}).reduce((n, ms) => n + Object.values(ms.tasks || {}).filter(t => t.state === 'done').length, 0);
  const scen = mobility?.scenarios || [], last = energy ? kSeries(energy.series.total.values).at(-1) : null;
  return [
    { id: 'impact', title: T('Verified real-world impact', 'Impact réel vérifié'), value: 0, unit: T('verified improvement', 'amélioration vérifiée'), state: 'none',
      what: T('Real-world improvements independently verified (before/after measurement, protocol, human review).', 'Améliorations du monde réel vérifiées indépendamment (mesure avant/après, protocole, relecture humaine).'),
      source: T('No independent verification exists in this prototype.', 'Aucune vérification indépendante n’existe dans ce prototype.'), not: T('Simulations, agent work, findings and contributions never add anything to it.', 'Les simulations, le travail des agents, les constats et les contributions n’y ajoutent jamais rien.') },
    { id: 'knowledge', title: T('Dated knowledge', 'Connaissance datée'), value: dated.length, unit: T('sourced findings', 'constats sourcés'), state: 'observed',
      what: T(`Findings computed by code on dated public data, across ${missions.length} missions; ${problems.length} recorded problems.`, `Constats calculés par du code sur des données publiques datées, répartis sur ${missions.length} missions ; ${problems.length} problèmes enregistrés.`),
      source: T('CORE missions (public registries and snapshots in data/).', 'Missions CORE (registres et instantanés publics dans data/).'), not: T('A finding is not a solution nor a proof of cause.', 'Un constat n’est pas une solution ni une preuve de cause.') },
    { id: 'gaps', title: T('Declared gaps', 'Lacunes déclarées'), value: gaps, unit: T('gaps', 'lacunes'), state: 'gap',
      what: T('Missing or inaccessible data declared rather than filled with guesses.', 'Données manquantes ou inaccessibles déclarées plutôt que comblées par des suppositions.'), source: T('CORE missions.', 'Missions CORE.'), not: T('Fewer gaps does not mean “better” if they are filled without a source.', 'Moins de lacunes ne veut pas dire « mieux » si elles sont comblées sans source.') },
    { id: 'research', title: T('Research work (local)', 'Travail de recherche (local)'), value: tasksDone, unit: T('tasks completed', 'tâches terminées'), state: 'simulated',
      what: T(`${events.filter(e => e.kind === 'message').length} typed messages between agents in this browser.`, `${events.filter(e => e.kind === 'message').length} messages typés entre agents dans ce navigateur.`), source: civ ? T('Local state of the civilisation engine (this browser).', 'État local du moteur de civilisation (ce navigateur).') : T('Engine never started in this browser.', 'Moteur jamais lancé dans ce navigateur.'), not: T('Activity of deterministic agents; none of it is a decision or an impact.', 'Activité d’agents déterministes ; aucune n’est une décision ni un impact.') },
    { id: 'simulation', title: T('Simulations (uncalibrated)', 'Simulations (non calibrées)'), value: scen.length ? scen.length - 1 : 0, unit: T('scenarios compared', 'scénarios comparés'), state: 'simulated',
      what: scen.length ? T(`SoMa mobility: ${scen.filter(s => s.status === 'promising-uncalibrated').map(s => s.id).join(', ') || 'none'} technically promising, ${scen.filter(s => s.status === 'unsupported').length} unsupported, in an UNcalibrated model.`, `Mobilité SoMa : ${scen.filter(s => s.status === 'promising-uncalibrated').map(s => s.id).join(', ') || 'aucune'} techniquement prometteuse(s), ${scen.filter(s => s.status === 'unsupported').length} non étayée(s), dans un modèle NON calibré.`) : '—',
      source: 'SUMO 1.27.1, data/mobility/results.json.', not: T('A simulated gain is not a real gain: it contributes 0 to verified impact.', 'Un gain simulé n’est pas un gain réel : contribue 0 à l’impact vérifié.') },
    { id: 'participation', title: T('Human participation (local)', 'Participation humaine (locale)'), value: inputs.length, unit: T('shared contributions', 'contributions partagées'), state: 'info',
      what: T(`${inputs.filter(h => h.evaluation).length} evaluated on form; ${inputs.filter(h => h.state === 'en attente de revue humaine').length} awaiting human review.`, `${inputs.filter(h => h.evaluation).length} évaluée(s) sur la forme ; ${inputs.filter(h => h.state === 'en attente de revue humaine').length} en attente de revue humaine.`), source: T('This browser only (no server).', 'Ce navigateur uniquement (aucun serveur).'), not: T('A shared contribution is neither accepted nor validated.', 'Une contribution partagée n’est ni acceptée ni validée.') },
    { id: 'energy', title: T('Energy scale (Kardashev)', 'Échelle énergétique (Kardashev)'), value: last ? +last.K.toFixed(3) : null, unit: last ? T(`type K (${last.year})`, `type K (${last.year})`) : '', state: 'info',
      what: last ? T(`World energy consumption ${last.quadBtu.toFixed(0)} quadrillion Btu in ${last.year} ≈ ${last.terawatts.toFixed(1)} TW. K between ${last.low.toFixed(3)} and ${last.high.toFixed(3)} for ±${last.rel * 100} % on energy.`, `Consommation mondiale d’énergie ${last.quadBtu.toFixed(0)} quadrillions de Btu en ${last.year} ≈ ${last.terawatts.toFixed(1)} TW. K entre ${last.low.toFixed(3)} et ${last.high.toFixed(3)} pour ±${last.rel * 100} % sur l’énergie.`) : T('Data not loaded.', 'Données non chargées.'),
      source: energy ? `${energy.terms.acknowledgment} · ${energy.terms.status}.` : '—', not: T('A measure of the quantity of energy used, not of progress, well-being or CORE’s effect.', 'Mesure de la quantité d’énergie utilisée, pas du progrès, du bien-être ni de l’effet de CORE.') },
  ];
}
