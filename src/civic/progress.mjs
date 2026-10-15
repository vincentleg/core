// CORE Global Progress — two separate systems (V4 prototype). Virtual progress counts what CORE did; Earth progress
// shows sourced physical-world indicators. Neither is combined into a universal score, and activity is never impact.
export function virtualProgress({ problems, civIndex, agents }) {
  const P = problems.problems;
  return [
    { id: 'problems-recorded', label: 'Problèmes enregistrés', value: P.length, basis: 'data/problems/registry.json' },
    { id: 'by-status', label: 'dont observés / risques potentiels / hypothèses / simulés', value: ['observed', 'potential-risk', 'hypothesis', 'simulated'].map(s => P.filter(p => p.status === s).length).join(' / '), basis: 'statut de connaissance' },
    { id: 'investigations', label: 'Problèmes investigués par un agent', value: P.filter(p => p.investigation).length, basis: 'champ investigation' },
    { id: 'eligible', label: 'Investigations « ÉLIGIBLE À LA REVUE HUMAINE »', value: P.filter(p => p.investigation?.decision === 'ÉLIGIBLE À LA REVUE HUMAINE').length, basis: 'passerelle (pas une approbation)' },
    { id: 'human-decisions', label: 'Décisions humaines enregistrées', value: P.filter(p => p.humanDecision && !/aucune/i.test(p.humanDecision)).length, basis: 'champ humanDecision' },
    { id: 'missions', label: 'Missions autonomes enregistrées', value: civIndex.missions.length, basis: 'data/civ/index.json' },
    { id: 'agents', label: 'Agents à règles disponibles / à modèle local / enregistrés', value: `${agents.agents.filter(a => a.executionMode === 'deterministic' && a.status === 'available').length} / ${agents.agents.filter(a => a.executionMode === 'llm').length} / ${agents.agents.length}`, basis: 'data/agents/registry.json' },
    { id: 'real-impact', label: 'Impacts réels mesurés', value: 0, basis: 'aucune intervention autorisée ni mesurée à ce jour' },
  ];
}

const REQUIRED = ['source', 'url', 'period', 'method', 'uncertainty', 'scope'];
export function indicator(def) {
  const missing = REQUIRED.filter(k => !String(def[k] ?? '').trim());
  if (missing.length) throw Error(`indicateur sans ${missing.join(', ')} : refusé`);
  return { ...def, trend: def.series && def.series.length > 1 ? 'série' : 'une seule période : aucune tendance ne peut être affirmée' };
}
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function earthIndicators({ energy, sidewalks }) {
  const eui = energy.features.map(f => f.properties).filter(p => Number.isFinite(p.site_eui));
  const years = [...new Set(eui.map(p => p.year))];
  const sw = sidewalks.features.map(f => f.properties).filter(p => Number.isFinite(p.width_ft) && Number.isFinite(p.min_width_ft));
  return [
    indicator({ id: 'energy-eui', domain: 'Énergie', label: 'Intensité énergétique médiane des bâtiments déclarants', value: median(eui.map(p => p.site_eui)), unit: 'kBtu/pi²/an (site EUI)',
      n: eui.length, source: 'SF Environment — Existing Buildings Energy Performance Ordinance (DataSF 96ck-qcfe)', url: 'https://data.sf.gov/d/96ck-qcfe', period: `année de déclaration ${years.join(', ')}`,
      method: 'médiane des valeurs déclarées, bâtiments du corridor Folsom–Howard seulement', uncertainty: 'auto-déclaration des propriétaires ; échantillon du corridor, non représentatif de la ville', scope: 'corridor laboratoire CORE' }),
    indicator({ id: 'sidewalk-bsp', domain: 'Accessibilité', label: 'Tronçons dont le trottoir est sous le minimum du Better Streets Plan', value: sw.filter(p => p.width_ft < p.min_width_ft).length, unit: `sur ${sw.length} tronçons relevés`,
      n: sw.length, source: 'DataSF — Sidewalk widths (4g86-grxu)', url: 'https://data.sf.gov/d/4g86-grxu', period: 'étude de 2014',
      method: 'comparaison largeur relevée / minimum de la classe BSP', uncertainty: 'mesures de 2014, peut-être obsolètes ; règle de conception, pas norme d’accessibilité', scope: 'corridor laboratoire CORE' }),
  ];
}

// Kardashev scale (educational): Sagan's interpolation K = (log10 P − 6) / 10, P in watts. Type I ≈ 10^16 W,
// II ≈ 10^26 W, III ≈ 10^36 W. It measures energy use only: not well-being, justice, knowledge or sustainability.
export function kardashev(watts) {
  if (!(watts > 0)) throw Error('puissance positive en watts requise');
  return { K: (Math.log10(watts) - 6) / 10, note: 'mesure de puissance seulement ; ne dit rien du bien-être, de l’équité, de la connaissance ni de la durabilité' };
}
