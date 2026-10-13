// CORE — simulation interface (Phase 2D). A model declares what it is, which domain it covers, whether it is
// calibrated, and returns results with inputs digest, parameters, version, uncertainty and provenance.
// Only deterministic, honest models are registered; physical domains without a validated model are declared
// unavailable instead of being simulated.
(function (root) {
  'use strict';
  const C = (typeof require === 'function' && typeof module !== 'undefined') ? require('./coord.js') : root.CORE_COORD;

  const MODELS = {
    'core-point-queue-v0': { domain: 'infrastructure', kind: 'synthetic traffic simulation', calibrated: false, status: 'reference only',
      note: 'Simulateur de files ponctuelles du corridor synthétique (src/engine.js). Non géoréférencé, non calibré, conservé séparément.' },
    'coordination-schedule-v1': { domain: 'infrastructure', kind: 'deterministic scheduling under declared constraints', calibrated: false, status: 'working',
      note: 'Fenêtres de permis réelles, contraintes déclarées (src/coord.js). Ne modélise ni trafic ni coût.' },
    'tree-proximity-exposure-v1': { domain: 'nature', kind: 'geographic proximity count (indicator, not damage model)', calibrated: false, status: 'working',
      note: 'Compte les arbres inventoriés à moins de d mètres du point publié d’un permis d’excavation. Le point du permis n’est pas le tracé de la tranchée.' },
    'evidence-completeness-v1': { domain: 'cross-domain', kind: 'checklist of required evidence', calibrated: false, status: 'working',
      note: 'Part des preuves requises disponibles dans l’instantané pour une décision donnée.' },
    'energy-model': { domain: 'energy', status: 'unavailable', note: 'Aucun modèle énergétique validé : aucune économie d’énergie n’est simulée.' },
    'ecology-model': { domain: 'nature', status: 'unavailable', note: 'Aucun modèle écologique ou de santé des arbres : aucun dommage ni bénéfice n’est estimé.' },
    'traffic-model-real': { domain: 'infrastructure', status: 'unavailable', note: 'Pas de comptages ni de plans de feux observés : aucun effet trafic réel.' },
  };

  function result(model, params, inputs, outputs, uncertainty) {
    const m = MODELS[model];
    return { model, version: model.split('-').pop(), domain: m.domain, kind: m.kind, calibrated: m.calibrated, params, inputs_digest: C.fingerprint(inputs), outputs, uncertainty, note: m.note };
  }

  // tree-proximity-exposure-v1: windows = [{record_id, coords, s, e}] grouped into occupation windows.
  // exposures = Σ over occupation windows of distinct trees within d of any permit point active in that window.
  function treeExposure(windows, trees, d) {
    const occ = C.mergeIntervals(windows), within = new Map(), episodes = [];
    for (const w of windows) within.set(w.record_id, trees.filter(t => C.distanceToGeometry(w.coords, { type: 'Point', coordinates: t.coords }) <= d).map(t => t.id));
    for (const o of occ) {
      const ids = new Set(); for (const w of windows) if (w.s <= o.e && w.e >= o.s) for (const t of within.get(w.record_id)) ids.add(t);
      episodes.push({ from: C.ds(o.s), to: C.ds(o.e), trees: [...ids].sort() });
    }
    const perPermit = [...within.values()].reduce((s, a) => s + a.length, 0);
    const unique = new Set([...within.values()].flat());
    return { uniqueTrees: unique.size, permitTreePairs: perPermit, exposureEpisodes: episodes.reduce((s, e) => s + e.trees.length, 0), occupationWindows: occ.length, episodes, treesByPermit: Object.fromEntries(within) };
  }

  function run(model, input) {
    const m = MODELS[model];
    if (!m) throw new TypeError(`modèle inconnu : ${model}`);
    if (m.status === 'unavailable') return { model, status: 'unavailable', note: m.note };
    switch (model) {
      case 'coordination-schedule-v1': {
        const windows = C.scenario(input.scenario, input.base, input.env, input.opts);
        return result(model, { scenario: input.scenario, ...pickOpts(input.opts) }, { base: input.base.map(w => [w.record_id, w.s, w.e]), env: input.env.closures.length }, { windows: windows.map(w => ({ record_id: w.record_id, start: w.start, end: w.end, shift: w.shift })), metrics: C.evaluate(windows, input.env), violations: input.scenario === 'S0' ? [] : C.violations(input.base, windows, input.env, input.opts) },
          'Hypothétique : dates de permis = fenêtres autorisées ; contraintes = hypothèses déclarées.');
      }
      case 'tree-proximity-exposure-v1': {
        const out = treeExposure(input.windows, input.trees, input.distanceM);
        return result(model, { distanceM: input.distanceM }, { windows: input.windows.map(w => [w.record_id, w.s, w.e]), trees: input.trees.map(t => t.id) }, out,
          'Indicateur de proximité, pas un modèle de dommage : position du permis à l’adresse ou au tronçon (incertitude de plusieurs dizaines de mètres), tracé réel inconnu.');
      }
      case 'evidence-completeness-v1': {
        const items = input.items, have = items.filter(i => i.available).length;
        return result(model, {}, items.map(i => [i.id, i.available]), { available: have, required: items.length, ratio: items.length ? +(have / items.length).toFixed(2) : 0, missing: items.filter(i => !i.available).map(i => i.id) }, 'Liste de contrôle déclarée ; ne mesure pas la qualité intrinsèque des sources.');
      }
      case 'core-point-queue-v0': return { model, status: 'reference only', note: m.note };
      default: throw new TypeError(`modèle non exécutable : ${model}`);
    }
  }
  const pickOpts = o => ({ maxShiftDays: o.maxShiftDays, leadDays: o.leadDays, programmeDays: o.programmeDays });

  const SIM = { MODELS, run, treeExposure };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM; else root.CORE_SIM = SIM;
})(typeof globalThis !== 'undefined' ? globalThis : this);
