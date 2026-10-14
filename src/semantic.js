// CORE — deterministic semantic checks for model-written statements (Phase 5).
// A cited number is not enough: its meaning must match. Evidence carries typed quantities
// ({ value, unit, quantity, meaning, scope, nature, asOf }); this module checks that a statement uses each number
// with a compatible physical quantity and unit, does not widen its geographic scope, does not present modelled
// values as measurements or old data as current, does not name places absent from its evidence, and does not
// assert causality without hedging. It covers these error classes only — it is not general semantic verification.
(function (root) {
  'use strict';
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2018\u2019\u0060\u00b4]/g, "'");

  // Words that name a physical quantity (French and English), normalised (no accents).
  const QUANTITY_WORDS = {
    distance: /\b(distance|distant|eloigne|a \d+(?:[.,]\d+)? ?m de|from|away)\b/,
    depth: /\b(profondeur|profond|depth|deep)\b/,
    length: /\b(longueur|long|length|lineaire)\b/,
    width: /\b(largeur|large|width|wide)\b/,
    height: /\b(hauteur|haut|height|tall)\b/,
    area: /\b(surface|superficie|area|m2|m²)\b/,
    duration: /\b(jours?|days?|semaines?|mois|duree|horizon|report)\b/,
    count: /\b(nombre|fenetres?|arbres?|permis|chevauchements?|episodes?|batiments?|dossiers?|demandes?|alertes?|organisations?)\b/,
    radius: /\b(rayon|radius|perimetre|zone de)\b/,
    share: /(%|\bpourcent|\bpart\b|\bshare\b)/,
    power: /\b(mw|megawatts?|puissance|production)\b/,
    index: /\b(aqi|indice|index)\b/,
    concentration: /\b(pm2|µg|ug\/m3|concentration)\b/,
  };
  // Pairs that must never be confused (a distance is not a depth, a width is not a length…).
  const INCOMPATIBLE = { distance: ['depth', 'height', 'width', 'length', 'area'], width: ['depth', 'length', 'height', 'distance'], length: ['depth', 'width', 'height'], radius: ['depth', 'height', 'width', 'length'],
    count: ['depth', 'height', 'width', 'length', 'distance', 'area'], share: ['power', 'count'], power: ['share'], duration: ['distance', 'depth', 'width', 'length'], index: ['concentration'], concentration: ['index'] };
  const UNIT_ALIASES = { m: ['m', 'metre', 'metres', 'meter', 'meters'], km: ['km'], ft: ['ft', 'pi', 'pieds', 'feet', 'foot'], '%': ['%', 'pourcent', 'percent'], mw: ['mw'], days: ['j', 'jours', 'jour', 'days', 'day'], 'ug/m3': ['µg/m³', 'µg/m3', 'ug/m3'], count: [] };
  const unitOf = tok => Object.keys(UNIT_ALIASES).find(u => UNIT_ALIASES[u].includes(tok)) || null;
  const CAUSAL = /\b(caus(e|ent|er|era|erait|ant)|provoqu\w*|entrain(e|ent|er|era|erait)|endommag\w*|degrad(e|ent|er|era|erait)|amelior(e|ent|er|era|erait)|redui(t|sent|ra|rait)|reduire|augment(e|ent|er|era|erait)|diminu(e|ent|er|era|erait)|affect(e|ent|er|era|erait)|impact(e|ent|er|era|erait)|influenc(ent|er|era|erait)|menac(e|ent|er)|due? a|because|leads? to|results? in)\b/;
  const HEDGE = /\b(pourrai\w*|peut|peuvent|possible\w*|hypothes\w*|si\b|eventuel\w*|risque de|might|may|could)\b/;
  const MEASURED = /\b(mesur\w*|observ\w*|releve\w*|capteur\w*|measured|observed|sensor)\b/;
  const CURRENT = /\b(actuellement|aujourd'?hui|en ce moment|current(ly)?|today|now)\b/;
  const SF = /\b(san francisco|sf|la ville|de la ville|soma)\b/;

  // Numbers in a statement with a little context on each side.
  function numbersWithContext(statement) {
    const s = norm(statement).replace(/\be\d+\b|\ba\d+\b|\br[0-2]\b|\bq\d+\b|\bd\d+\b/g, ' ');
    const out = [];
    for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|[a-zµ/³0-9]+)?/g)) {
      // Identifiers are not quantities: street ordinals (08th), permit ids (26exc-05114), names (pm2,5).
      const prev = s[m.index - 1] || ' ', glued = m[2] && !/\s/.test(s[m.index + m[1].length] || ' ');
      if (/[a-z\-]/.test(prev) || (glued && /^(st|nd|rd|th|e|er|eme|exc|[a-z]{3,})/.test(m[2]) && !unitOf(m[2].replace(/[.,;:)]$/, '')))) continue;
      const value = Number(m[1].replace(',', '.')), before = s.slice(Math.max(0, m.index - 48), m.index), after = s.slice(m.index + m[0].length, m.index + m[0].length + 40);
      out.push({ value, raw: m[1], unitTok: m[2] ? m[2].replace(/[.,;:)]$/, '') : null, before, after, window: `${before} ${m[0]} ${after}` });
    }
    return out;
  }
  const quantityWordsIn = text => Object.entries(QUANTITY_WORDS).filter(([, re]) => re.test(text)).map(([q]) => q);

  // Returns null when the statement passes, or { class, reason }.
  function check(statement, { kind = 'interpretation', evidence = [], target = {}, now = new Date().toISOString(), places = [] } = {}) {
    const s = norm(statement), quantities = evidence.flatMap(e => (e.quantities || []).map(q => ({ ...q, evidenceId: e.id, nature: q.nature || e.nature || null, scope: q.scope || e.scope || null, asOf: q.asOf || e.asOf || null })));
    // 1. Physical meaning and unit of each cited number.
    for (const n of numbersWithContext(statement)) {
      const matches = quantities.filter(q => Math.abs(q.value - n.value) < 1e-9);
      if (!matches.length) continue;
      const near = quantityWordsIn(`${n.before.slice(-28)} ${n.raw} ${n.after.slice(0, 26)}`);
      for (const q of matches) {
        const bad = near.find(w => (INCOMPATIBLE[q.quantity] || []).includes(w) && !near.includes(q.quantity));
        if (bad && matches.every(m => (INCOMPATIBLE[m.quantity] || []).includes(bad))) return { class: 'meaning', reason: `sens incorrect : ${n.raw} ${q.unit} est ${q.meaning} (${q.quantity}), pas une grandeur de type « ${bad} »` };
        const u = n.unitTok ? unitOf(n.unitTok) : null;
        if (u && q.unit && u !== q.unit && matches.every(m => m.unit !== u)) return { class: 'unit', reason: `unité incorrecte : ${n.raw} est en ${q.unit} dans la preuve ${q.evidenceId}, pas en ${n.unitTok}` };
      }
      // 2. Scope: a regional value presented as San Francisco-specific.
      const scoped = matches.find(q => q.scope && q.scope !== 'segment' && q.scope !== 'city' && SF.test(n.window));
      if (scoped) return { class: 'scope', reason: `portée incorrecte : ${n.raw} concerne ${scoped.scope}, pas San Francisco en particulier` };
      // 3. Modelled values presented as measurements.
      const modelled = matches.find(q => q.nature === 'modelled' && MEASURED.test(n.window) && !/\b(non|pas|not)\b[^.]{0,20}(mesur|observ|measured)/.test(n.window));
      if (modelled) return { class: 'observed-vs-modelled', reason: `${n.raw} est une valeur modélisée (${modelled.meaning}), pas une mesure` };
      // 4. Old data presented as current.
      const old = matches.find(q => q.asOf && (Date.parse(now) - Date.parse(q.asOf)) / 86400000 > 730 && CURRENT.test(n.window) && !n.window.includes(q.asOf.slice(0, 4)));
      if (old) return { class: 'temporal', reason: `donnée de ${old.asOf.slice(0, 4)} présentée comme actuelle` };
    }
    // 5. Places: every street named must appear in the cited evidence or the mission target.
    const known = norm([...evidence.map(e => e.claim), target.label || '', ...places].join(' '));
    for (const m of s.matchAll(/\b(folsom|howard|mission|market|harrison|bryant|brannan|townsend|king|berry|natoma|minna|tehama|clementina|shipley|clara|langton|russ|moss|lafayette|valencia|van ness|embarcadero)\b/g)) {
      if (!known.includes(m[1])) return { class: 'geography', reason: `lieu non présent dans les preuves citées : ${m[1]}` };
    }
    // 6. Causality: only hedged hypotheses may state a causal relation.
    if (CAUSAL.test(s) && !(kind === 'hypothesis' && HEDGE.test(s)) && !/\b(aucune?s?|pas de|no evidence|non etablie?|ne permet pas|ne prouve pas|n'indique)\b/.test(s)) return { class: 'causal', reason: 'relation causale affirmée sans hypothèse explicite ni preuve d’effet' };
    // 7. False precision: more decimals than any cited source value.
    for (const n of numbersWithContext(statement)) {
      const dec = (n.raw.split(/[.,]/)[1] || '').length, srcDec = Math.max(0, ...quantities.filter(q => Math.round(q.value) === Math.round(n.value)).map(q => (String(q.value).split('.')[1] || '').length));
      if (dec > srcDec && dec > 0 && quantities.some(q => Math.round(q.value) === Math.round(n.value))) return { class: 'precision', reason: `précision excessive : ${n.raw}` };
    }
    return null;
  }

  const SEM = { check, numbersWithContext, quantityWordsIn, QUANTITY_WORDS, INCOMPATIBLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = SEM; else root.CORE_SEMANTIC = SEM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
