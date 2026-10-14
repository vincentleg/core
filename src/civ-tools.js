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
  // Phase 10: wording per city (San Francisco strings unchanged; New York states its own definitions).
  const LABELS = {
    'san-francisco': { hinUnit: 'tronçon(s) du réseau HIN 2024', hinName: 'Réseau HIN 2024 : désignation administrative fondée sur des années antérieures ; ne mesure pas le risque actuel.', crashUnit: 'accident avec blessé déclaré', atLeast: 'au moins un accident avec blessé déclaré', crashPlural: 'accidents', Crashes: 'Accidents', sev: 'graves ou mortels', sevOne: 'grave(s)/mortel(s)', crashShort: 'accident(s) avec blessé', assignment: 'Accidents rattachés à un tronçon par la clé CNN du jeu (les accidents d’intersection sans tronçon sont exclus).', worksUnit: 'fenêtres de travaux approuvées', worksCount: 'permis', worksNote: 'Un permis approuvé n’est pas la preuve que les travaux ont lieu.', idLabel: 'CNN', worksAge: 'Permis collectés', worksNature: 'statut administratif, pas preuve d’exécution.' },
    'new-york': { hinUnit: 'tronçon(s) de corridor prioritaire Vision Zero', hinName: 'Corridors prioritaires Vision Zero (NYC DOT) : désignation administrative selon une méthode propre à New York ; ne mesure pas le risque actuel et n’est pas équivalente au HIN de San Francisco.', crashUnit: 'collision avec blessé ou tué déclarée par la police', atLeast: 'au moins une collision avec blessé ou tué déclarée par la police', crashPlural: 'collisions', Crashes: 'Collisions', sev: 'mortelles (la source ne classe pas la gravité des blessures)', sevOne: 'mortelle(s)', crashShort: 'collision(s) avec blessé ou tué', assignment: 'Collisions rattachées au tronçon de corridor le plus proche à moins de 20 m (rattachement spatial par CORE) ; les collisions sans blessé ni tué sont exclues.', worksUnit: 'fermetures de rue pour travaux', worksCount: 'fermetures', worksNote: 'Une fermeture autorisée n’est pas la preuve que les travaux ont lieu ; aucun titulaire n’est publié.', idLabel: 'id', worksAge: 'Fermetures collectées', worksNature: 'autorisation administrative, pas preuve d’exécution.' },
  };
  function context({ manifest, data, city = null }) {
    const cityId = city || manifest.city || 'san-francisco', L = LABELS[cityId];
    const nh = new Map(data.neighborhoods.features.map(x => [x.properties.nhood, x.geometry]));
    const hin = new Map(); for (const x of data.hin.features) { const k = x.properties.cnn; if (!hin.has(k)) hin.set(k, { ...x.properties, geometry: x.geometry, mid: mid(x.geometry), length_km: x.properties.length_mi * 1.609344 }); }
    const crashes = new Map(); for (const r of data['crashes-agg'].rows) { if (!r.cnn) continue; if (!crashes.has(r.cnn)) crashes.set(r.cnn, []); crashes.get(r.cnn).push(r); }
    const permits = new Map(); for (const p of data.permits.features) { const k = p.properties.cnn; if (!permits.has(k)) permits.set(k, []); permits.get(k).push(p); }
    const recordIds = new Set(data.permits.features.map(p => p.properties.record_id));
    const ramps = data.ramps ? data.ramps.features : [];
    return { city: cityId, L, ramps, manifest, data, nh, hin, crashes, permits, recordIds, asOf: String(manifest.generated_at).slice(0, 10), asOfN: days(manifest.generated_at), retrieved: Object.fromEntries(manifest.datasets.map(d => [d.file.replace('.json', ''), d.retrieved_at])) };
  }
  // Evidence resolution (used by reviewers and tests).
  function resolve(cx, r) {
    if (!r || !r.dataset || typeof r.ref !== 'string') return false;
    const [ds, id] = [r.dataset, String(r.ref).slice(r.dataset.length + 1)];
    if (ds === 'hin') return cx.hin.has(id); if (ds === 'crashes-agg') return cx.crashes.has(id); if (ds === 'study-permits') return cx.recordIds.has(id);
    if (ds === 'flood-zone') return id === '2022'; if (ds === 'ramps') return cx.ramps.some(x => x.properties.record_id === id); if (ds === 'neighborhoods') return cx.nh.has(id); if (ds === 'dataset') return !!cx.retrieved[id]; return false;
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
        f('safety', `${t.nhood} : ${segs.length} ${cx.L.hinUnit} ; ${rows.length} avec ${cx.L.atLeast} sur 5 ans (${tot} ${cx.L.crashPlural}, dont ${sf} ${cx.L.sev}).`, 'reported', [ref('neighborhoods', t.nhood), ...rows.slice(0, 20).map(r => ref('crashes-agg', r.cnn))], { segments: segs.length, withCrashes: rows.length, crashes: tot, severeFatal: sf }),
        ...rows.slice(0, 5).map(r => f('safety', `${r.street} (${cx.L.idLabel} ${r.cnn}) : ${r.crashes} ${cx.L.crashShort}, ${r.severe_fatal} ${cx.L.sevOne}, ${r.pedestrian} impliquant un piéton, ${r.per_km_year} par km et par an.`, 'derived', [ref('hin', r.cnn), ref('crashes-agg', r.cnn)], r)),
      ], assumptions: [cx.L.assignment, 'Fenêtre de 5 ans ' + cx.data['crashes-agg'].window.from + ' → ' + cx.data['crashes-agg'].window.to + ` ; ${cx.L.crashPlural} déclaré${cx.city === 'new-york' ? 'e' : ''}s (sous-déclaration possible).`] };
    } },
    // Works coordination analyst (civil): planned or active street-work permits on given segments within H days.
    'works.area-windows': { permission: 'analyze', run(cx, t) {
      const out = t.segments.map(cnn => { const ps = planned(cx, cx.permits.get(cnn) || []); return { cnn, permits: ps.map(p => p.properties.record_id), orgs: [...new Set(ps.map(p => p.properties.agent).filter(Boolean))].sort(), excavation: ps.filter(p => /Exc|Boring/i.test(p.properties.permit_type)).length }; }).filter(r => r.permits.length);
      return { rows: out, findings: [f('works', `${out.length} des ${t.segments.length} tronçons examinés ont des ${cx.L.worksUnit} en cours ou dans les ${H} j (${out.reduce((s, r) => s + r.permits.length, 0)} ${cx.L.worksCount}${cx.city === 'new-york' ? '' : `, ${new Set(out.flatMap(r => r.orgs)).size} organisation(s)`}).`, 'reported', out.flatMap(r => r.permits.slice(0, 3).map(id => ref('study-permits', id))).slice(0, 30), { segments: t.segments.length, withWorks: out.length })],
        assumptions: [`Horizon de ${H} jours depuis l’instantané (${cx.asOf}).`, cx.L.worksNote] };
    } },
    // Data verification (research): freshness and nature of every dataset used — challenges, not findings.
    'data.freshness': { permission: 'review', run(cx, t) {
      const ch = [], age = k => Math.round((Date.parse(cx.manifest.generated_at) - Date.parse(cx.retrieved[k])) / DAY);
      for (const k of t.datasets) {
        if (k === 'crashes-agg') { const lag = days(cx.manifest.generated_at) - days(cx.data['crashes-agg'].window.to); ch.push({ dataset: k, level: lag > 30 ? 'warn' : 'info', text: `${cx.L.Crashes} jusqu’au ${cx.data['crashes-agg'].window.to} seulement (${lag} j avant l’instantané) : les ${cx.L.crashPlural} récent${cx.city === 'new-york' ? 'e' : ''}s ne sont pas inclus${cx.city === 'new-york' ? 'es' : ''}.` }); }
        if (k === 'hin') ch.push({ dataset: k, level: 'info', text: cx.L.hinName });
        if (k === 'flood-zone') ch.push({ dataset: k, level: 'warn', text: 'Zone d’inondation SFPUC de juillet 2022 : modèle de tempête centennale, pas une inondation observée ; trous intérieurs ignorés lors du découpage (léger excès).' });
        if (k === 'permits') ch.push({ dataset: k, level: age(k) > 7 ? 'warn' : 'info', text: `${cx.L.worksAge} il y a ${age(k)} j ; ${cx.L.worksNature}` });
        if (k === 'ramps') { const ys = cx.ramps.map(x => x.properties.surveyed).filter(Boolean).sort(); ch.push({ dataset: k, level: 'warn', text: `Rampes relevées entre ${ys[0] || '?'} et ${ys[ys.length - 1] || '?'} : l’état actuel peut différer ; unités des paliers supposées (pouces) d’après le jeu.` }); }
      }
      return { challenges: ch, findings: ch.map(c => f('freshness', c.text, 'challenge', [ref('dataset', c.dataset)], { level: c.level })) };
    } },
    // Ramp accessibility analyst (public space, NYC): ramps whose MEASURED values exceed declared thresholds.
    // Thresholds (declared, from US accessibility guidance; not a legal compliance test): running slope > 8.33 %,
    // cross slope > 2 %, ponding observed, obstacle recorded on ramp or landing, detectable warning surface missing.
    'accessibility.ramps': { permission: 'analyze', run(cx, t) {
      const nh = cx.nh.get(t.nhood), inN = cx.ramps.filter(x => inGeom(x.geometry.coordinates, nh));
      const issues = x => { const p = x.properties, out = []; if (p.running_slope_pct !== null && p.running_slope_pct > 8.33) out.push('pente > 8,33 %'); if (p.cross_slope_pct !== null && p.cross_slope_pct > 2) out.push('dévers > 2 %'); if (/yes/i.test(p.ponding || '')) out.push('stagnation d’eau'); if (p.obstacles_ramp && !/none/i.test(p.obstacles_ramp)) out.push('obstacle sur la rampe'); if (p.obstacles_landing && !/none/i.test(p.obstacles_landing)) out.push('obstacle sur le palier'); if (/missing/i.test(p.warning_surface || '')) out.push('bande d’éveil absente'); return out; };
      const rows = inN.map(x => ({ id: x.properties.record_id, at: x.geometry.coordinates, street: x.properties.street, cross: x.properties.cross, surveyed: x.properties.surveyed, issues: issues(x) })).filter(r => r.issues.length);
      const count = k => rows.filter(r => r.issues.includes(k)).length;
      return { rows, findings: [f('accessibility', `${t.nhood} : ${rows.length} des ${inN.length} rampes relevées dépassent au moins un seuil déclaré (pente > 8,33 % : ${count('pente > 8,33 %')} ; dévers > 2 % : ${count('dévers > 2 %')} ; bande d’éveil absente : ${count('bande d’éveil absente')}).`, 'reported', [ref('neighborhoods', t.nhood), ...rows.slice(0, 20).map(r => ref('ramps', r.id))], { ramps: inN.length, flagged: rows.length, slope: count('pente > 8,33 %'), cross: count('dévers > 2 %'), dws: count('bande d’éveil absente') })],
        assumptions: ['Seuils déclarés par CORE d’après les recommandations d’accessibilité américaines ; ce n’est pas un contrôle de conformité légale.', 'Mesures datées de chaque relevé (certaines ont plusieurs années).'] };
    } },
    // Works analyst: closures/permits within 30 m of given points (e.g. deficient ramps).
    'works.near-points': { permission: 'analyze', run(cx, t) {
      const active = planned(cx, cx.data.permits.features), rows = t.points.map(pt => ({ id: pt.id, at: pt.at, works: active.filter(w => dist(w.geometry.coordinates, pt.at) <= 30).map(w => w.properties.record_id) })).filter(r => r.works.length);
      return { rows, findings: [f('works', `${rows.length} des ${t.points.length} points examinés ont des ${cx.L.worksUnit} à moins de 30 m, en cours ou dans les ${H} j.`, 'derived', rows.slice(0, 20).flatMap(r => [ref('ramps', r.id), ...r.works.slice(0, 2).map(id => ref('study-permits', id))]), { points: t.points.length, near: rows.length })],
        assumptions: [`Distance de 30 m entre le point de la rampe et le milieu de la ${cx.city === 'new-york' ? 'fermeture' : 'zone de permis'} (approximation).`, cx.L.worksNote] };
    } },
    // Decision analyst (simulation, Phase 10): compares interventions on the road-safety × works problem of a neighbourhood.
    // EXPLORATORY, UNCALIBRATED: the exposure index (crash rate on the segment × days with planned works) ranks options;
    // it is not a prediction of injuries avoided. No cost or benefit in money is computed (no cost data integrated).
    'decision.interventions': { permission: 'analyze', run(cx, t) {
      const years = 5, analyse = ({ topN = 5, horizon = H, weight = 'all' } = {}) => {
        const segs = hinIn(cx, t.nhood).map(h => { const cr = cx.crashes.get(h.cnn) || [], n = cr.filter(r => weight === 'all' || /Severe|Fatal/.test(r.severity)).reduce((s2, r) => s2 + r.n, 0); return { cnn: h.cnn, street: h.street, rate: h.length_km > 0 ? n / h.length_km / years : 0 }; }).filter(x => x.rate > 0);
        const lo = cx.asOfN, hi = cx.asOfN + horizon, clip = w => ({ s: Math.max(lo, w.s), e: Math.min(hi, w.e) });
        const rows = segs.map(sg => { const ws = (cx.permits.get(sg.cnn) || []).filter(p2 => p2.properties.status_class === 'active').map(p2 => ({ id: p2.properties.record_id, type: p2.properties.permit_type || '', agent: p2.properties.agent, ...clip(window(cx, p2)) })).filter(w => w.e >= w.s);
          const sum = ws.reduce((n2, w) => n2 + w.e - w.s + 1, 0), days = new Set(); for (const w of ws) for (let d = w.s; d <= w.e; d++) days.add(d);
          const urgent = ws.filter(w => /emerg/i.test(w.type)), deferable = ws.filter(w => !/emerg/i.test(w.type)), uDays = new Set(); for (const w of urgent) for (let d = w.s; d <= w.e; d++) uDays.add(d);
          return { ...sg, permits: ws.length, sumDays: sum, unionDays: days.size, urgentDays: uDays.size, deferable: deferable.map(w => w.id), orgs: [...new Set(deferable.map(w => w.agent).filter(Boolean))] }; }).filter(r => r.permits > 0).sort((a2, b2) => b2.rate * b2.sumDays - a2.rate * a2.sumDays);
        const E = f2 => +rows.reduce((n2, r) => n2 + r.rate * f2(r), 0).toFixed(1), top = rows.slice(0, topN), topSet = new Set(top.map(r => r.cnn));
        const e0 = E(r => r.sumDays), e1cov = +top.reduce((n2, r) => n2 + r.rate * r.sumDays, 0).toFixed(1), e2 = E(r => r.unionDays), e3 = E(r => topSet.has(r.cnn) ? r.urgentDays : r.sumDays);
        return { rows, e0, options: [
          { id: 'I0', label: 'Statu quo : travaux tels qu’autorisés', exposure: e0, change: 0, permitsAffected: 0, orgsAffected: 0, note: 'référence' },
          { id: 'I1', label: `Revue préalable du plan de circulation piétonne et cycliste sur les ${top.length} tronçons les plus exposés`, exposure: e0, change: 0, coveredShare: e0 ? +(e1cov / e0).toFixed(3) : 0, permitsAffected: top.reduce((n2, r) => n2 + r.permits, 0), orgsAffected: new Set(top.flatMap(r => r.orgs)).size, note: 'ne réduit pas l’indice ; part de l’indice couverte par une revue' },
          { id: 'I2', label: 'Coordonner les fenêtres qui se chevauchent sur un même tronçon (jours occupés une seule fois)', exposure: e2, change: e0 ? +((e2 - e0) / e0).toFixed(3) : 0, permitsAffected: rows.filter(r => r.sumDays > r.unionDays).reduce((n2, r) => n2 + r.permits, 0), orgsAffected: new Set(rows.filter(r => r.sumDays > r.unionDays).flatMap(r => r.orgs)).size, note: 'suppose que des chantiers simultanés peuvent partager la même occupation (hypothèse)' },
          { id: 'I3', label: `Reporter au-delà de l’horizon les travaux non urgents des ${top.length} tronçons les plus exposés`, exposure: e3, change: e0 ? +((e3 - e0) / e0).toFixed(3) : 0, permitsAffected: top.reduce((n2, r) => n2 + r.deferable.length, 0), orgsAffected: new Set(top.flatMap(r => r.orgs)).size, note: 'déplace les travaux dans le temps ; ne les supprime pas' },
        ] };
      };
      const base = analyse(t), sens = [];
      for (const topN of [3, 5, 10]) for (const horizon of [60, 120, 180]) for (const weight of ['all', 'severe']) { const a2 = analyse({ topN, horizon, weight }); sens.push({ topN, horizon, weight, e0: a2.e0, I2: a2.options[2].change, I3: a2.options[3].change, best: a2.options.slice(1).filter(o => o.id !== 'I1').sort((x, y) => x.exposure - y.exposure)[0].id }); }
      const quality = [
        { source: 'crashes-agg', grade: 'B', why: `${cx.L.Crashes} déclaré${cx.city === 'new-york' ? 'e' : ''}s, décalage de ${days(cx.manifest.generated_at) - days(cx.data['crashes-agg'].window.to)} j ; ${cx.city === 'new-york' ? 'rattachement spatial à 20 m, gravité non classée' : 'rattachement par clé CNN, gravité classée'}` },
        { source: 'hin', grade: 'B', why: cx.L.hinName },
        { source: 'permits', grade: cx.city === 'new-york' ? 'C' : 'B', why: cx.city === 'new-york' ? 'fermetures autorisées (pas les permis), sans titulaire ; type urgent non distingué' : 'permis approuvés, titulaires connus ; exécution non prouvée' },
        { source: 'modèle', grade: 'C', why: 'indice exploratoire non calibré : aucune relation entre jours de travaux et accidents n’est établie' },
      ];
      const best = base.options.filter(o => o.id === 'I2' || o.id === 'I3').sort((x, y) => x.exposure - y.exposure)[0], stable = sens.filter(x => x.best === best.id).length;
      return { analysis: base, sensitivity: sens, quality, findings: [
        f('decision', `${t.nhood} : indice d’exposition exploratoire de référence ${base.e0} sur ${base.rows.length} tronçon(s) avec ${cx.L.crashPlural} et travaux dans les ${t.horizon || H} j.`, 'modeled', base.rows.slice(0, 10).map(r => ref('hin', r.cnn)), { e0: base.e0, segments: base.rows.length }),
        ...base.options.slice(1).map(o => f('decision', `${o.id} — ${o.label} : indice ${o.exposure}${o.coveredShare !== undefined ? `, part couverte ${Math.round(o.coveredShare * 100)} %` : `, variation ${Math.round(o.change * 100)} %`} ; ${o.permitsAffected} ${cx.L.worksCount} concerné(e)s (modélisé, exploratoire).`, 'modeled', base.rows.slice(0, 5).map(r => ref('hin', r.cnn)), { exposure: o.exposure, change: o.change, coveredShare: o.coveredShare ?? null, permitsAffected: o.permitsAffected })),
        f('decision', `Sensibilité : l’option ${best.id} reste la plus réductrice de l’indice dans ${stable} des ${sens.length} combinaisons (top N 3/5/10, horizon 60/120/180 j, pondération toutes gravités / graves) — modélisé, exploratoire.`, 'modeled', [ref('hin', base.rows[0] ? base.rows[0].cnn : '')].filter(r => r.ref !== 'hin:'), { stable, combinations: sens.length }),
      ], assumptions: ['Indice = taux d’accidents du tronçon (par km et par an, 5 ans) × jours de travaux autorisés dans l’horizon ; exploratoire, non calibré.', 'Aucun coût ni bénéfice monétaire calculé (aucune donnée de coût intégrée).', 'Report et coordination supposés faisables administrativement (hypothèse à vérifier auprès des services).'] };
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
  const CT = { H, TOOLS, LABELS, context, resolve, review, inGeom, dist, mid, hinIn, planned, window };
  if (typeof module !== 'undefined' && module.exports) module.exports = CT; else root.CORE_CIV_TOOLS = CT;
})(typeof globalThis !== 'undefined' ? globalThis : this);
