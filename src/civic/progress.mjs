// CORE Global Progress — two separate systems (V4 prototype). Virtual progress counts what CORE did; Earth progress
// shows sourced physical-world indicators. Neither is combined into a universal score, and activity is never impact.
const B = (en, fr) => ({ en, fr });
export function virtualProgress({ problems, civIndex, agents }) {
  const P = problems.problems;
  return [
    { id: 'problems-recorded', label: B('Recorded problems', 'Problèmes enregistrés'), value: P.length, basis: 'data/problems/registry.json' },
    { id: 'by-status', label: B('of which observed / potential risks / hypotheses / simulated', 'dont observés / risques potentiels / hypothèses / simulés'), value: ['observed', 'potential-risk', 'hypothesis', 'simulated'].map(s => P.filter(p => p.status === s).length).join(' / '), basis: B('knowledge status', 'statut de connaissance') },
    { id: 'investigations', label: B('Problems investigated by an agent', 'Problèmes investigués par un agent'), value: P.filter(p => p.investigation).length, basis: B('investigation field', 'champ investigation') },
    { id: 'eligible', label: B('Investigations “ELIGIBLE FOR HUMAN REVIEW”', 'Investigations « ÉLIGIBLE À LA REVUE HUMAINE »'), value: P.filter(p => p.investigation?.decision === 'ÉLIGIBLE À LA REVUE HUMAINE').length, basis: B('gateway (not an approval)', 'passerelle (pas une approbation)') },
    { id: 'human-decisions', label: B('Recorded human decisions', 'Décisions humaines enregistrées'), value: P.filter(p => p.humanDecision && !/aucune/i.test(p.humanDecision)).length, basis: B('humanDecision field', 'champ humanDecision') },
    { id: 'missions', label: B('Recorded autonomous missions', 'Missions autonomes enregistrées'), value: civIndex.missions.length, basis: 'data/civ/index.json' },
    { id: 'agents', label: B('Rule-based agents available / local-model agents / registered', 'Agents à règles disponibles / à modèle local / enregistrés'), value: `${agents.agents.filter(a => a.executionMode === 'deterministic' && a.status === 'available').length} / ${agents.agents.filter(a => a.executionMode === 'llm').length} / ${agents.agents.length}`, basis: 'data/agents/registry.json' },
    { id: 'real-impact', label: B('Measured real-world impacts', 'Impacts réels mesurés'), value: 0, basis: B('no intervention authorised or measured to date', 'aucune intervention autorisée ni mesurée à ce jour') },
  ];
}

const REQUIRED = ['source', 'url', 'period', 'method', 'uncertainty', 'scope'];
export function indicator(def) {
  const missing = REQUIRED.filter(k => !String((def[k] && typeof def[k] === 'object' ? def[k].en : def[k]) ?? '').trim());
  if (missing.length) throw Error(`indicator without ${missing.join(', ')}: refused (indicateur refusé)`);
  return { ...def, trend: def.series && def.series.length > 1 ? B('series', 'série') : B('a single period: no trend can be claimed', 'une seule période : aucune tendance ne peut être affirmée') };
}
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function earthIndicators({ energy, sidewalks }) {
  const eui = energy.features.map(f => f.properties).filter(p => Number.isFinite(p.site_eui));
  const years = [...new Set(eui.map(p => p.year))];
  const sw = sidewalks.features.map(f => f.properties).filter(p => Number.isFinite(p.width_ft) && Number.isFinite(p.min_width_ft));
  return [
    indicator({ id: 'energy-eui', domain: B('Energy', 'Énergie'), label: B('Median energy use intensity of reporting buildings', 'Intensité énergétique médiane des bâtiments déclarants'), value: median(eui.map(p => p.site_eui)), unit: B('kBtu/ft²/year (site EUI)', 'kBtu/pi²/an (site EUI)'),
      n: eui.length, source: 'SF Environment — Existing Buildings Energy Performance Ordinance (DataSF 96ck-qcfe)', url: 'https://data.sf.gov/d/96ck-qcfe', period: B(`reporting year ${years.join(', ')}`, `année de déclaration ${years.join(', ')}`),
      method: B('median of reported values, Folsom–Howard corridor buildings only', 'médiane des valeurs déclarées, bâtiments du corridor Folsom–Howard seulement'), uncertainty: B('self-reported by owners; corridor sample, not representative of the city', 'auto-déclaration des propriétaires ; échantillon du corridor, non représentatif de la ville'), scope: B('CORE laboratory corridor', 'corridor laboratoire CORE') }),
    indicator({ id: 'sidewalk-bsp', domain: B('Accessibility', 'Accessibilité'), label: B('Segments whose sidewalk is below the Better Streets Plan minimum', 'Tronçons dont le trottoir est sous le minimum du Better Streets Plan'), value: sw.filter(p => p.width_ft < p.min_width_ft).length, unit: B(`of ${sw.length} surveyed segments`, `sur ${sw.length} tronçons relevés`),
      n: sw.length, source: 'DataSF — Sidewalk widths (4g86-grxu)', url: 'https://data.sf.gov/d/4g86-grxu', period: B('2014 survey', 'étude de 2014'),
      method: B('surveyed width compared with the BSP class minimum', 'comparaison largeur relevée / minimum de la classe BSP'), uncertainty: B('2014 measurements, possibly outdated; a design rule, not an accessibility standard', 'mesures de 2014, peut-être obsolètes ; règle de conception, pas norme d’accessibilité'), scope: B('CORE laboratory corridor', 'corridor laboratoire CORE') }),
  ];
}

// Kardashev scale (educational): Sagan's interpolation K = (log10 P − 6) / 10, P in watts. Type I ≈ 10^16 W,
// II ≈ 10^26 W, III ≈ 10^36 W. It measures energy use only: not well-being, justice, knowledge or sustainability.
export function kardashev(watts) {
  if (!(watts > 0)) throw Error('positive power in watts required / puissance positive en watts requise');
  return { K: (Math.log10(watts) - 6) / 10, note: B('a measure of power only; says nothing about well-being, equity, knowledge or sustainability', 'mesure de puissance seulement ; ne dit rien du bien-être, de l’équité, de la connaissance ni de la durabilité') };
}
