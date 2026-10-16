// CORE V8 — progress, measured in SEPARATE dimensions. There is no composite score: each dimension says what it counts,
// where the number comes from and what it does NOT mean. Rules:
//  • Real-world verified impact counts only improvements independently verified in the real world — today, none.
//    Simulations, agent work, findings and contributions never add to it.
//  • The Kardashev value is an energy-use metric for human civilisation (Sagan's interpolation), not a measure of
//    progress, well-being or CORE's effect; it is shown with its formula and uncertainty.
export const QBTU_J = 1.055056e18, YEAR_S = 31557600;
// Sagan (1973): K = (log10 P − 6) / 10, P in watts. Uncertainty: ±rel on P (method and estimation differences).
export function kardashev(quadBtu, rel = 0.1) {
  const P = quadBtu * QBTU_J / YEAR_S, K = p => (Math.log10(p) - 6) / 10;
  return { watts: P, terawatts: P / 1e12, K: K(P), low: K(P * (1 - rel)), high: K(P * (1 + rel)), rel, formula: 'K = (log10 P − 6) / 10, P en watts (interpolation de Sagan, 1973)' };
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
    { id: 'impact', title: 'Impact réel vérifié', value: 0, unit: 'amélioration vérifiée', state: 'none',
      what: 'Améliorations du monde réel vérifiées indépendamment (mesure avant/après, protocole, relecture humaine).',
      source: 'Aucune vérification indépendante n’existe dans ce prototype.', not: 'Les simulations, le travail des agents, les constats et les contributions n’y ajoutent jamais rien.' },
    { id: 'knowledge', title: 'Connaissance datée', value: dated.length, unit: 'constats sourcés', state: 'observed',
      what: `Constats calculés par du code sur des données publiques datées, répartis sur ${missions.length} missions ; ${problems.length} problèmes enregistrés.`,
      source: 'Missions CORE (registres et instantanés publics dans data/).', not: 'Un constat n’est pas une solution ni une preuve de cause.' },
    { id: 'gaps', title: 'Lacunes déclarées', value: gaps, unit: 'lacunes', state: 'gap',
      what: 'Données manquantes ou inaccessibles déclarées plutôt que comblées par des suppositions.', source: 'Missions CORE.', not: 'Moins de lacunes ne veut pas dire « mieux » si elles sont comblées sans source.' },
    { id: 'research', title: 'Travail de recherche (local)', value: tasksDone, unit: 'tâches terminées', state: 'simulated',
      what: `${events.filter(e => e.kind === 'message').length} messages typés entre agents dans ce navigateur.`, source: civ ? 'État local du moteur de civilisation (ce navigateur).' : 'Moteur jamais lancé dans ce navigateur.', not: 'Activité d’agents déterministes ; aucune n’est une décision ni un impact.' },
    { id: 'simulation', title: 'Simulations (non calibrées)', value: scen.length ? scen.length - 1 : 0, unit: 'scénarios comparés', state: 'simulated',
      what: scen.length ? `Mobilité SoMa : ${scen.filter(s => s.status === 'promising-uncalibrated').map(s => s.id).join(', ') || 'aucune'} techniquement prometteuse(s), ${scen.filter(s => s.status === 'unsupported').length} non étayée(s), dans un modèle NON calibré.` : '—',
      source: 'SUMO 1.27.1, data/mobility/results.json.', not: 'Un gain simulé n’est pas un gain réel : contribue 0 à l’impact vérifié.' },
    { id: 'participation', title: 'Participation humaine (locale)', value: inputs.length, unit: 'contributions partagées', state: 'info',
      what: `${inputs.filter(h => h.evaluation).length} évaluée(s) sur la forme ; ${inputs.filter(h => h.state === 'en attente de revue humaine').length} en attente de revue humaine.`, source: 'Ce navigateur uniquement (aucun serveur).', not: 'Une contribution partagée n’est ni acceptée ni validée.' },
    { id: 'energy', title: 'Échelle énergétique (Kardashev)', value: last ? +last.K.toFixed(3) : null, unit: last ? `type K (${last.year})` : '', state: 'info',
      what: last ? `Consommation mondiale d’énergie ${last.quadBtu.toFixed(0)} quadrillions de Btu en ${last.year} ≈ ${last.terawatts.toFixed(1)} TW. K entre ${last.low.toFixed(3)} et ${last.high.toFixed(3)} pour ±${last.rel * 100} % sur l’énergie.` : 'Données non chargées.',
      source: energy ? `${energy.terms.acknowledgment} — ${energy.terms.status}.` : '—', not: 'Mesure de la quantité d’énergie utilisée, pas du progrès, du bien-être ni de l’effet de CORE.' },
  ];
}
