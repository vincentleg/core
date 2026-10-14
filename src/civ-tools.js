// CORE — Phase 9 study-area tools (SoMa, Mission, Tenderloin). Deterministic functions over the verified
// data/sf9 snapshot. Every finding carries evidence refs that resolve() can check, an epistemic label
// (reported | derived | modeled | challenge) and typed values. Tools never act on the world.
(function (root) {
  'use strict';
  const H = 120; // planning horizon (days) for permit windows — declared assumption
  const DAY = 86400000;
  const inRing = (p, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const inGeom = (p, g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).some(poly => inRing(p, poly[0]) && !poly.slice(1).some(h => inRing(p, h)));
  const lines = g => g.type === 'MultiLineString' ? g.coordinates : [g.coordinates];
  const mid = g => { const c = lines(g).flat(); return c[Math.floor(c.length / 2)]; };
  const R = 6371008.8, rad = x => x * Math.PI / 180;
  const dist = (a, b) => { const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const ref = (dataset, id) => ({ type: 'record', dataset, ref: `${dataset}:${id}` });
  const f = (topic, claim, epistemic, evidence, values = {}) => ({ topic, claim, epistemic, evidence, values });
  const days = iso => Math.floor(Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') / DAY);

  // Context: indexes over the snapshot (built once).
  function context({ manifest, data }) {
    const nh = new Map(data.neighborhoods.features.map(x => [x.properties.nhood, x.geometry]));
    const hin = new Map(); for (const x of data.hin.features) { const k = x.properties.cnn; if (!hin.has(k)) hin.set(k, { ...x.properties, geometry: x.geometry, mid: mid(x.geometry), length_km: x.properties.length_mi * 1.609344 }); }
    const crashes = new Map(); for (const r of data['crashes-agg'].rows) { if (!r.cnn) continue; if (!crashes.has(r.cnn)) crashes.set(r.cnn, []); crashes.get(r.cnn).push(r); }
    const permits = new Map(); for (const p of data.permits.features) { const k = p.properties.cnn; if (!permits.has(k)) permits.set(k, []); permits.get(k).push(p); }
    const recordIds = new Set(data.permits.features.map(p => p.properties.record_id));
    return { manifest, data, nh, hin, crashes, permits, recordIds, asOf: String(manifest.generated_at).slice(0, 10), asOfN: days(manifest.generated_at), retrieved: Object.fromEntries(manifest.datasets.map(d => [d.file.replace('.json', ''), d.retrieved_at])) };
  }
  // Evidence resolution (used by reviewers and tests).
  function resolve(cx, r) {
    if (!r || !r.dataset || typeof r.ref !== 'string') return false;
    const [ds, id] = [r.dataset, String(r.ref).slice(r.dataset.length + 1)];
    if (ds === 'hin') return cx.hin.has(id); if (ds === 'crashes-agg') return cx.crashes.has(id); if (ds === 'study-permits') return cx.recordIds.has(id);
    if (ds === 'flood-zone') return id === '2022'; if (ds === 'neighborhoods') return cx.nh.has(id); if (ds === 'dataset') return !!cx.retrieved[id]; return false;
  }
  const hinIn = (cx, nhood) => [...cx.hin.values()].filter(h => inGeom(h.mid, cx.nh.get(nhood)));
  const window = (cx, p) => ({ s: days(p.properties.start || p.properties.approved), e: days(p.properties.end || p.properties.start || p.properties.approved) });
  const planned = (cx, list) => list.filter(p => p.properties.status_class === 'active' && (w => w.e >= cx.asOfN && w.s <= cx.asOfN + H)(window(cx, p)));

  const TOOLS = {
    // Traffic safety analyst (mobility): injury crashes on High Injury Network segments of a neighbourhood.
    'safety.crash-profile': { permission: 'analyze', run(cx, t) {
      const segs = hinIn(cx, t.nhood), years = 5, rows = segs.map(h => { const cr = cx.crashes.get(h.cnn) || [], n = cr.reduce((s, r) => s + r.n, 0), sevfat = cr.filter(r => /Severe|Fatal/.test(r.severity)).reduce((s, r) => s + r.n, 0), ped = cr.filter(r => /Pedestrian/.test(r.group || '')).reduce((s, r) => s + r.n, 0);
        return { cnn: h.cnn, street: h.street, length_km: +h.length_km.toFixed(3), crashes: n, severe_fatal: sevfat, pedestrian: ped, per_km_year: h.length_km > 0 ? +(n / h.length_km / years).toFixed(1) : null }; }).filter(r => r.crashes > 0).sort((a, b) => b.severe_fatal - a.severe_fatal || b.crashes - a.crashes);
      const tot = rows.reduce((s, r) => s + r.crashes, 0), sf = rows.reduce((s, r) => s + r.severe_fatal, 0);
      return { rows, findings: [
        f('safety', `${t.nhood} : ${segs.length} tronçon(s) du réseau HIN 2024 ; ${rows.length} avec au moins un accident avec blessé déclaré sur 5 ans (${tot} accidents, dont ${sf} graves ou mortels).`, 'reported', [ref('neighborhoods', t.nhood), ...rows.slice(0, 20).map(r => ref('crashes-agg', r.cnn))], { segments: segs.length, withCrashes: rows.length, crashes: tot, severeFatal: sf }),
        ...rows.slice(0, 5).map(r => f('safety', `${r.street} (CNN ${r.cnn}) : ${r.crashes} accident(s) avec blessé, ${r.severe_fatal} grave(s)/mortel(s), ${r.pedestrian} impliquant un piéton, ${r.per_km_year} par km et par an.`, 'derived', [ref('hin', r.cnn), ref('crashes-agg', r.cnn)], r)),
      ], assumptions: ['Accidents rattachés à un tronçon par la clé CNN du jeu (les accidents d’intersection sans tronçon sont exclus).', 'Fenêtre de 5 ans ' + cx.data['crashes-agg'].window.from + ' → ' + cx.data['crashes-agg'].window.to + ' ; accidents déclarés (sous-déclaration possible).'] };
    } },
    // Works coordination analyst (civil): planned or active street-work permits on given segments within H days.
    'works.area-windows': { permission: 'analyze', run(cx, t) {
      const out = t.segments.map(cnn => { const ps = planned(cx, cx.permits.get(cnn) || []); return { cnn, permits: ps.map(p => p.properties.record_id), orgs: [...new Set(ps.map(p => p.properties.agent).filter(Boolean))].sort(), excavation: ps.filter(p => /Exc|Boring/i.test(p.properties.permit_type)).length }; }).filter(r => r.permits.length);
      return { rows: out, findings: [f('works', `${out.length} des ${t.segments.length} tronçons examinés ont des fenêtres de travaux approuvées en cours ou dans les ${H} j (${out.reduce((s, r) => s + r.permits.length, 0)} permis, ${new Set(out.flatMap(r => r.orgs)).size} organisation(s)).`, 'reported', out.flatMap(r => r.permits.slice(0, 3).map(id => ref('study-permits', id))).slice(0, 30), { segments: t.segments.length, withWorks: out.length })],
        assumptions: [`Horizon de ${H} jours depuis l’instantané (${cx.asOf}).`, 'Un permis approuvé n’est pas la preuve que les travaux ont lieu.'] };
    } },
    // Data verification (research): freshness and nature of every dataset used — challenges, not findings.
    'data.freshness': { permission: 'review', run(cx, t) {
      const ch = [], age = k => Math.round((Date.parse(cx.manifest.generated_at) - Date.parse(cx.retrieved[k])) / DAY);
      for (const k of t.datasets) {
        if (k === 'crashes-agg') { const lag = days(cx.manifest.generated_at) - days(cx.data['crashes-agg'].window.to); ch.push({ dataset: k, level: lag > 30 ? 'warn' : 'info', text: `Accidents jusqu’au ${cx.data['crashes-agg'].window.to} seulement (${lag} j avant l’instantané) : les accidents récents ne sont pas inclus.` }); }
        if (k === 'hin') ch.push({ dataset: k, level: 'info', text: 'Réseau HIN 2024 : désignation administrative fondée sur des années antérieures ; ne mesure pas le risque actuel.' });
        if (k === 'flood-zone') ch.push({ dataset: k, level: 'warn', text: 'Zone d’inondation SFPUC de juillet 2022 : modèle de tempête centennale, pas une inondation observée ; trous intérieurs ignorés lors du découpage (léger excès).' });
        if (k === 'permits') ch.push({ dataset: k, level: age(k) > 7 ? 'warn' : 'info', text: `Permis collectés il y a ${age(k)} j ; statut administratif, pas preuve d’exécution.` });
      }
      return { challenges: ch, findings: ch.map(c => f('freshness', c.text, 'challenge', [ref('dataset', c.dataset)], { level: c.level })) };
    } },
    // Flood risk analyst (water): planned works and HIN segments inside the modeled 100-year storm flood zone.
    'flood.exposure': { permission: 'analyze', run(cx, t) {
      const zone = cx.data['flood-zone'].features[0].geometry, nh = cx.nh.get(t.nhood);
      const inNh = p => inGeom(p, nh), inZone = p => inGeom(p, zone);
      const permits = planned(cx, cx.data.permits.features).filter(p => inNh(p.geometry.coordinates));
      const exposed = permits.filter(p => inZone(p.geometry.coordinates)), exc = exposed.filter(p => /Exc|Boring/i.test(p.properties.permit_type));
      const hin = hinIn(cx, t.nhood), hinZ = hin.filter(h => lines(h.geometry).flat().some(inZone));
      return { rows: exposed.map(p => ({ id: p.properties.record_id, cnn: p.properties.cnn, type: p.properties.permit_type, start: p.properties.start, end: p.properties.end, agent: p.properties.agent, at: p.geometry.coordinates })), hinInZone: hinZ.map(h => h.cnn), findings: [
        f('flood', `${t.nhood} : ${exposed.length} des ${permits.length} permis de travaux en cours ou à venir (${H} j) sont dans la zone de risque de tempête centennale modélisée (SFPUC 2022), dont ${exc.length} d’excavation.`, 'modeled', [ref('flood-zone', '2022'), ref('neighborhoods', t.nhood), ...exposed.slice(0, 20).map(p => ref('study-permits', p.properties.record_id))], { permits: permits.length, inZone: exposed.length, excavation: exc.length }),
        f('flood', `${hinZ.length} tronçon(s) HIN du quartier traversent cette zone modélisée.`, 'modeled', [ref('flood-zone', '2022'), ...hinZ.slice(0, 10).map(h => ref('hin', h.cnn))], { hinInZone: hinZ.length }),
      ], assumptions: ['Zone modélisée (pas d’inondation observée) ; un point de permis représente son tronçon.', `Horizon de ${H} jours.`] };
    } },
  };
  // Adversarial / evidence review: every claim must cite resolvable evidence; numbers must come from values;
  // recommendations must be labelled and free of causal or decision language; modeled data must be called modeled.
  const CAUSAL = /\b(cause|causent|provoque|provoquent|entraîne|entraînent|responsable de|à cause de)\b/i, DECISION = /\b(autoris(?:e|er|ons|ez|ent)|approuv(?:e|er|ons|ez|ent)\b|ordonn\w*|exig[ée]s? par la loi|doit être interdit)/i;
  function review(cx, findings, recommendation, extraResolve = () => false) {
    const accepted = [], rejected = [], ok = r => resolve(cx, r) || extraResolve(r);
    for (const x of findings) {
      const missing = (x.evidence || []).find(r => !ok(r));
      if (!(x.evidence || []).length) rejected.push({ claim: x.claim, reason: 'aucune preuve citée' });
      else if (missing) rejected.push({ claim: x.claim, reason: `preuve introuvable : ${missing.ref}` });
      else if (x.epistemic === 'modeled' && !/modélis/i.test(x.claim)) rejected.push({ claim: x.claim, reason: 'donnée modélisée présentée sans le dire' });
      else accepted.push(x);
    }
    const recIssues = recommendation ? [CAUSAL.test(recommendation.text) && !/hypothèse/i.test(recommendation.text) ? 'relation causale non qualifiée' : null, DECISION.test(recommendation.text) ? 'langage de décision réservé aux humains' : null, !/recommandation|hypothèse/i.test(recommendation.kind || '') ? 'type de recommandation absent' : null].filter(Boolean) : [];
    return { accepted, rejected, recommendation: recommendation ? { ok: !recIssues.length, issues: recIssues } : null };
  }
  const CT = { H, TOOLS, context, resolve, review, inGeom, dist, mid, hinIn };
  if (typeof module !== 'undefined' && module.exports) module.exports = CT; else root.CORE_CIV_TOOLS = CT;
})(typeof globalThis !== 'undefined' ? globalThis : this);
