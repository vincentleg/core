// CORE — street-work coordination intelligence (Phase 2C).
// Deterministic, rule-based agents over the dated DataSF snapshots in data/sf. No LLM is used here.
// Every agent is a generator that yields real execution events; the browser displays them as they run.
// The coordination gateway recomputes everything and never authorizes work: human review is mandatory.
(function (root) {
  'use strict';

  // ---------- Parameters (declared assumptions, shown in the UI) ----------
  const DEFAULTS = Object.freeze({
    maxShiftDays: 30,        // a not-yet-started permit window may move at most ±30 days (assumption)
    leadDays: 7,             // a moved window cannot start earlier than snapshot date + 7 days (assumption)
    programmeDays: 90,       // windows longer than 90 days are treated as programme permits and never moved (assumption)
    repeatWindowDays: 365,   // repeated-work detection window
    repeatMinPermits: 5,     // ≥ 5 distinct permits by ≥ 2 organisations within the window
    geoToleranceM: 75,       // permit point must lie within 75 m of its CNN geometry
    horizonDays: 60,         // coordination review looks at overlaps within the next 60 days
    programmeInOccupation: false, // programme permits are framework authorizations: excluded from occupation metrics (assumption, perturbed in A7)
  });
  const ASSUMPTIONS = [
    'Les dates de permis sont des fenêtres autorisées, pas des dates de travaux réalisés.',
    'Un permis non commencé peut être décalé de ±{maxShiftDays} jours au plus (hypothèse, pas une règle municipale).',
    'Aucun décalage ne peut commencer avant la date de l’instantané + {leadDays} jours.',
    'Les permis commencés, actifs, d’urgence ou de plus de {programmeDays} jours ne sont jamais déplacés.',
    'La durée de chaque permis est conservée.',
    'Les permis RENOUVELÉS sont remplacés par leur renouvellement et exclus de la planification.',
    'Une tranchée partagée suppose une compatibilité technique non vérifiée par CORE.',
    'Les permis-programmes (> {programmeDays} j) comptent dans les chevauchements mais pas dans les fenêtres ni les jours d’occupation (hypothèse testée en A7).',
    'La revue de coordination porte sur les chevauchements entre organisations dans les {horizonDays} prochains jours.',
  ];
  const DATASETS = ['corridor', 'intersections', 'permits', 'large-excavations', 'moratoria', 'closures'];
  const EXCAVATION_TYPES = ['Excavation', 'ExcStreet', 'Boring', 'Emergency'];
  const SCENARIOS = [
    { id: 'S0', name: 'Référence : calendrier indépendant', kind: 'observed' },
    { id: 'S1', name: 'Fenêtres coordonnées (enchaînées)', kind: 'hypothetical' },
    { id: 'S2', name: 'Excavation partagée (hypothèse)', kind: 'hypothetical' },
    { id: 'S3', name: 'Replanification sans chevauchement', kind: 'hypothetical' },
    { id: 'S4', name: 'Séquence hors fermetures SFMTA', kind: 'hypothetical' },
  ];
  const AGENTS = [
    { id: 'discovery', name: 'Agent de découverte' },
    { id: 'evidence', name: 'Agent de preuves' },
    { id: 'scenario', name: 'Générateur de scénarios' },
    { id: 'evaluation', name: 'Agent d’évaluation' },
    { id: 'adversarial', name: 'Agent adversarial' },
    { id: 'gateway', name: 'Passerelle de décision' },
  ];

  // ---------- Utilities ----------
  const DAY = 86400000;
  const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + 'T00:00:00Z'));
  const dn = s => Math.round(Date.parse(s + 'T00:00:00Z') / DAY);
  const ds = n => new Date(n * DAY).toISOString().slice(0, 10);
  const overlap = (a, b) => Math.max(0, Math.min(a.e, b.e) - Math.max(a.s, b.s) + 1);
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return JSON.stringify(v);
  }
  // FNV-1a 64-bit fingerprint (non-cryptographic; used to compare deterministic outputs and replays).
  function fingerprint(v) {
    const s = stable(v); let h = 0xcbf29ce484222325n; const P = 0x100000001b3n, M = 0xffffffffffffffffn;
    for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i)); h = (h * P) & M; }
    return h.toString(16).padStart(16, '0');
  }
  const R = 6371008.8, RAD = Math.PI / 180;
  function meters(a, b) { const x = (b[0] - a[0]) * RAD * Math.cos((a[1] + b[1]) / 2 * RAD), y = (b[1] - a[1]) * RAD; return Math.hypot(x, y) * R; }
  function pointSegmentM(p, a, b) {
    const k = Math.cos(p[1] * RAD) * R * RAD, toXY = q => [(q[0] - p[0]) * k, (q[1] - p[1]) * R * RAD];
    const A = toXY(a), B = toXY(b), dx = B[0] - A[0], dy = B[1] - A[1], L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, -(A[0] * dx + A[1] * dy) / L)) : 0;
    return Math.hypot(A[0] + t * dx, A[1] + t * dy);
  }
  function distanceToGeometry(p, g) {
    if (!g) return Infinity;
    if (g.type === 'Point') return meters(p, g.coordinates);
    if (g.type === 'LineString') { let d = Infinity; const c = g.coordinates; for (let i = 1; i < c.length; i++) d = Math.min(d, pointSegmentM(p, c[i - 1], c[i])); return d; }
    return Infinity;
  }
  function mergeIntervals(ws) { // contiguous (e+1 == s) counts as one occupation window
    const a = ws.map(w => ({ s: w.s, e: w.e })).sort((x, y) => x.s - y.s || x.e - y.e), out = [];
    for (const w of a) { const l = out[out.length - 1]; if (l && w.s <= l.e + 1) l.e = Math.max(l.e, w.e); else out.push({ ...w }); }
    return out;
  }

  // ---------- Context: index the snapshot ----------
  function buildContext({ manifest, data, verified }) {
    if (!manifest || !data) throw new TypeError('Instantané manquant.');
    const asOf = String(manifest.generated_at || '').slice(0, 10);
    if (!isDay(asOf)) throw new TypeError('Date d’instantané invalide.');
    for (const k of DATASETS) if (!data[k] || !Array.isArray(data[k].features)) throw new TypeError(`Jeu manquant : ${k}`);
    const segments = new Map(), nodes = new Map(), groupsOfCnn = new Map();
    for (const f of data.corridor.features) segments.set(f.properties.cnn, f);
    for (const f of data.intersections.features) nodes.set(f.properties.cnn, f);
    for (const [cnn, f] of segments) for (const c of [cnn, f.properties.f_node_cnn, f.properties.t_node_cnn]) {
      if (!groupsOfCnn.has(c)) groupsOfCnn.set(c, []); groupsOfCnn.get(c).push(cnn);
    }
    const byRecord = new Map();
    for (const k of DATASETS) for (const f of data[k].features) byRecord.set(`${k}:${f.properties.record_id}`, { dataset: k, feature: f });
    const datasets = {};
    for (const d of manifest.datasets || []) {
      const key = d.file.replace(/\.geojson$/, '');
      datasets[key] = { id: d.id, title: d.title, page: d.page, sha256: d.sha256, retrieved_at: d.retrieved_at, verified: verified ? verified[key] || 'unknown' : 'unknown' };
    }
    return { asOf, asOfN: dn(asOf), manifest, data, segments, nodes, groupsOfCnn, byRecord, datasets };
  }
  function geometryOfCnn(ctx, cnn) { const s = ctx.segments.get(cnn); if (s) return s.geometry; const n = ctx.nodes.get(cnn); return n ? n.geometry : null; }
  function groupCnns(ctx, seg) { const f = ctx.segments.get(seg); return f ? [seg, f.properties.f_node_cnn, f.properties.t_node_cnn] : []; }

  // A permit location record made ready for analysis; reasons explain any exclusion.
  function windowOf(ctx, f, opts) {
    const p = f.properties, reasons = [];
    if (!isDay(p.start) || !isDay(p.end)) reasons.push('dates manquantes ou invalides');
    else if (p.start > p.end) reasons.push('début postérieur à la fin');
    const geo = geometryOfCnn(ctx, p.cnn);
    const dist = geo && f.geometry ? distanceToGeometry(f.geometry.coordinates, geo) : Infinity;
    if (!(dist <= opts.geoToleranceM)) reasons.push(`position à ${Number.isFinite(dist) ? Math.round(dist) + ' m' : '∞'} de sa géométrie CNN`);
    const w = { record_id: p.record_id, dataset: 'permits', permit_number: p.permit_number, cnn: p.cnn, agent: p.agent || null, status: p.status, type: p.permit_type,
      start: p.start, end: p.end, purpose: p.purpose || null, project: p.project || null, coords: f.geometry ? f.geometry.coordinates : null, geo_m: Number.isFinite(dist) ? Math.round(dist) : null };
    if (reasons.length) return { w, reasons };
    w.s = dn(p.start); w.e = dn(p.end); w.dur = w.e - w.s + 1;
    const fixed = [];
    if (w.s <= ctx.asOfN) fixed.push('déjà commencé');
    if (p.status === 'ACTIVE') fixed.push('actif');
    if (p.permit_type === 'Emergency') fixed.push('urgence');
    if (w.dur > opts.programmeDays) fixed.push(`programme > ${opts.programmeDays} j`);
    w.fixed = fixed;
    return { w, reasons };
  }

  // Records of a segment group (segment + its two intersection nodes), one per permit number.
  function groupRecords(ctx, seg, opts) {
    const cnns = new Set(groupCnns(ctx, seg)), seen = new Map(), excluded = [];
    for (const f of ctx.data.permits.features) {
      if (!cnns.has(f.properties.cnn)) continue;
      const { w, reasons } = windowOf(ctx, f, opts);
      if (reasons.length) { excluded.push({ record_id: w.record_id, reasons }); continue; }
      const prev = seen.get(w.permit_number);
      if (!prev || (w.cnn === seg && prev.cnn !== seg)) seen.set(w.permit_number, w);
    }
    return { records: [...seen.values()].sort((a, b) => a.s - b.s || a.record_id.localeCompare(b.record_id)), excluded };
  }

  // ---------- Metrics (deterministic) ----------
  function closuresFor(ctx, cnns) {
    const set = new Set(cnns);
    return ctx.data.closures.features.filter(f => set.has(f.properties.cnn) && isDay(f.properties.start) && isDay(f.properties.end))
      .map(f => ({ record_id: f.properties.record_id, cnn: f.properties.cnn, name: f.properties.case_name, status: f.properties.status, start: f.properties.start, end: f.properties.end, s: dn(f.properties.start), e: dn(f.properties.end) }));
  }
  function moratoriaFor(ctx, cnns) {
    const set = new Set(cnns);
    return ctx.data.moratoria.features.filter(f => set.has(f.properties.cnn) && isDay(f.properties.start) && isDay(f.properties.end))
      .map(f => ({ record_id: f.properties.record_id, cnn: f.properties.cnn, start: f.properties.start, end: f.properties.end, s: dn(f.properties.start), e: dn(f.properties.end), limits: f.properties.limits }));
  }
  const isSurface = w => w.type === 'StrtImprov' || w.project === 'streetscape';
  function evaluate(windows, env) {
    const orgs = new Set(windows.map(w => w.agent).filter(Boolean));
    let overlapPairs = 0, overlapDays = 0, sequencing = 0;
    for (let i = 0; i < windows.length; i++) for (let j = i + 1; j < windows.length; j++) {
      const a = windows[i], b = windows[j];
      if (a.agent && b.agent && a.agent !== b.agent) { const o = overlap(a, b); if (o > 0) { overlapPairs++; overlapDays += o; } }
      for (const [x, y] of [[a, b], [b, a]]) if (isSurface(x) && EXCAVATION_TYPES.includes(y.type) && y.s > x.e) sequencing++;
    }
    const occ = env.programmeInOccupation ? windows : windows.filter(w => w.dur <= env.programmeDays);
    const merged = mergeIntervals(occ);
    let closureDays = 0;
    for (const w of windows) for (const c of env.closures) closureDays += overlap(w, c);
    const moratorium = windows.filter(w => env.moratoria.some(m => m.cnn === w.cnn && w.s >= m.s && w.s <= m.e)).length;
    return {
      permits: windows.length, organisations: orgs.size, segments: new Set(windows.map(w => w.cnn)).size,
      overlapPairs, overlapDays, occupationWindows: merged.length, extraWindows: Math.max(0, merged.length - 1), programmePermits: windows.length - occ.length,
      occupiedDays: merged.reduce((s, m) => s + m.e - m.s + 1, 0), closureConflictDays: closureDays, moratoriumStarts: moratorium, sequencingIssues: sequencing,
    };
  }
  function violations(base, windows, env, opts) {
    const out = [], byId = new Map(base.map(w => [w.record_id, w]));
    for (const w of windows) {
      const o = byId.get(w.record_id);
      if (!o) { out.push(`${w.record_id} : enregistrement inconnu`); continue; }
      const shift = w.s - o.s;
      if (w.e - w.s !== o.e - o.s) out.push(`${w.record_id} : durée modifiée`);
      if (shift !== 0 && o.fixed.length) out.push(`${w.record_id} : permis non déplaçable (${o.fixed.join(', ')})`);
      if (Math.abs(shift) > opts.maxShiftDays) out.push(`${w.record_id} : décalage ${shift} j > ±${opts.maxShiftDays} j`);
      if (shift !== 0 && w.s < env.asOfN + opts.leadDays) out.push(`${w.record_id} : début avant instantané + ${opts.leadDays} j`);
    }
    if (windows.length !== base.length) out.push('ensemble de permis modifié');
    return out;
  }

  // ---------- Scenario scheduling (bounded, deterministic) ----------
  function place(base, opts, env, score) {
    const windows = base.map(w => ({ ...w }));
    for (const w of windows.filter(x => !x.fixed.length).sort((a, b) => a.s - b.s || a.record_id.localeCompare(b.record_id))) {
      const lo = Math.max(w.s - opts.maxShiftDays, env.asOfN + opts.leadDays), hi = w.s + opts.maxShiftDays, others = windows.filter(o => o !== w);
      const cand = new Set([w.s]);
      for (const o of others) for (const s of [o.s, o.e + 1, o.s - w.dur, o.e - w.dur + 1]) cand.add(s);
      for (const c of env.closures) for (const s of [c.e + 1, c.s - w.dur]) cand.add(s);
      let best = null;
      for (const s of [...cand].sort((a, b) => a - b)) {
        if (s !== w.s && (s < lo || s > hi)) continue;
        const trial = { ...w, s, e: s + w.dur - 1 };
        const k = score(trial, others, w);
        if (!k) continue;
        const key = [...k, Math.abs(s - w.s), s];
        if (!best || lexLess(key, best.key)) best = { s, key };
      }
      if (best) { w.s = best.s; w.e = best.s + w.dur - 1; }
    }
    return windows.map(w => ({ ...w, start: ds(w.s), end: ds(w.e), shift: w.s - base.find(b => b.record_id === w.record_id).s }));
  }
  function lexLess(a, b) { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; }
  const otherOrgOverlap =(t, others) => others.reduce((s, o) => s + (o.agent && t.agent && o.agent !== t.agent ? overlap(t, o) : 0), 0);
  const allOverlap = (t, others) => others.reduce((s, o) => s + overlap(t, o), 0);
  const closureOverlap = (t, env) => env.closures.reduce((s, c) => s + overlap(t, c), 0);
  function scenario(id, base, env, opts) {
    const occ = (t, others) => mergeIntervals([t, ...others]).length;
    switch (id) {
      case 'S0': return base.map(w => ({ ...w, shift: 0 }));
      case 'S1': return place(base, opts, env, (t, o) => [occ(t, o), allOverlap(t, o), closureOverlap(t, env)]);          // one continuous occupation, no simultaneous crews
      case 'S2': return place(base, opts, env, (t, o) => [occ(t, o), -otherOrgOverlap(t, o), closureOverlap(t, env)]);    // maximise shared window with other organisations
      case 'S3': return place(base, opts, env, (t, o) => [otherOrgOverlap(t, o), closureOverlap(t, env)]);                // remove inter-organisation overlap
      case 'S4': return place(base, opts, env, (t, o) => [closureOverlap(t, env), otherOrgOverlap(t, o)]);                // avoid SFMTA closure windows
      default: throw new TypeError(`Scénario inconnu : ${id}`);
    }
  }
  // Declared priority: event-closure conflicts, moratorium starts, sequencing, separate occupation windows, occupied days.
  // A reschedule improves only if it is strictly better on one of these and worse on none. Inter-organisation
  // overlap is reported but neutral: sharing a trench and avoiding simultaneous crews pull in opposite directions.
  const PRIORITY = ['closureConflictDays', 'moratoriumStarts', 'sequencingIssues', 'extraWindows', 'occupiedDays'];
  function better(m, b) { return PRIORITY.every(k => m[k] <= b[k]) && PRIORITY.some(k => m[k] < b[k]); }
  const rankKey = m => [...PRIORITY.map(k => m[k]), m.totalShift];

  // Coordination review basis: verified overlaps between different organisations inside the review horizon,
  // where at least one of the two windows is not a programme permit.
  function reviewBasis(base, env, opts) {
    const lo = env.asOfN, hi = env.asOfN + opts.horizonDays, pairs = [];
    for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) {
      const a = base[i], b = base[j];
      if (!a.agent || !b.agent || a.agent === b.agent || (a.dur > opts.programmeDays && b.dur > opts.programmeDays)) continue;
      const s = Math.max(a.s, b.s, lo), e = Math.min(a.e, b.e, hi);
      if (e >= s) pairs.push({ a: a.record_id, b: b.record_id, orgs: [a.agent, b.agent].sort(), from: ds(s), to: ds(e), days: e - s + 1 });
    }
    return { pairs, organisations: [...new Set(pairs.flatMap(p => p.orgs))].sort(), holds: pairs.length > 0 };
  }

  function evaluateScenarios(base, env, opts) {
    const baseline = evaluate(base, env);
    const out = SCENARIOS.map(sc => {
      const windows = scenario(sc.id, base, env, opts);
      const metrics = { ...evaluate(windows, env), moved: windows.filter(w => w.shift).length, totalShift: windows.reduce((s, w) => s + Math.abs(w.shift), 0), maxShift: windows.reduce((s, w) => Math.max(s, Math.abs(w.shift)), 0) };
      const viol = sc.id === 'S0' ? [] : violations(base, windows, env, opts);
      const applicable = sc.id !== 'S4' || env.closures.length > 0;
      const improves = sc.id !== 'S0' && applicable && !viol.length && better(metrics, baseline);
      return { id: sc.id, name: sc.name, kind: sc.kind, applicable, windows: windows.map(pick), metrics, violations: viol, improves };
    });
    const ok = out.filter(s => s.improves).sort((a, b) => { const x = rankKey(a.metrics), y = rankKey(b.metrics); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return a.id.localeCompare(b.id); });
    return { baseline, scenarios: out, recommended: ok.length ? ok[0].id : null, review: reviewBasis(base, env, opts) };
  }
  const pick = w => ({ record_id: w.record_id, permit_number: w.permit_number, agent: w.agent, cnn: w.cnn, type: w.type, status: w.status, start: w.start, end: w.end, shift: w.shift || 0, fixed: w.fixed });

  // ---------- Adversarial perturbations (fixed, enumerated) ----------
  const PERTURBATIONS = [
    { id: 'A1', label: 'Décalage maximal réduit de moitié', apply: (b, e, o) => ({ base: b, env: e, opts: { ...o, maxShiftDays: Math.floor(o.maxShiftDays / 2) } }) },
    { id: 'A2', label: 'Délai de préavis porté à +14 jours', apply: (b, e, o) => ({ base: b, env: e, opts: { ...o, leadDays: o.leadDays + 7 } }) },
    { id: 'A3', label: 'Durées des permis déplaçables +20 %', apply: (b, e, o) => ({ base: b.map(w => w.fixed.length ? w : { ...w, dur: Math.ceil(w.dur * 1.2), e: w.s + Math.ceil(w.dur * 1.2) - 1 }), env: e, opts: o }) },
    { id: 'A4', label: 'Exclusion des permis d’urgence et des titulaires masqués', apply: (b, e, o) => ({ base: b.filter(w => w.type !== 'Emergency' && w.agent), env: e, opts: o }) },
    { id: 'A5', label: 'Incertitude de date : débuts déplaçables +3 jours', apply: (b, e, o) => ({ base: b.map(w => w.fixed.length ? w : { ...w, s: w.s + 3, e: w.e + 3 }), env: e, opts: o }) },
    { id: 'A6', label: 'Instantané vieilli de 7 jours', apply: (b, e, o) => ({ base: b.filter(w => w.e >= e.asOfN + 7).map(w => ({ ...w, fixed: w.s <= e.asOfN + 7 && !w.fixed.includes('déjà commencé') ? [...w.fixed, 'déjà commencé'] : w.fixed })), env: { ...e, asOfN: e.asOfN + 7 }, opts: o }) },
    { id: 'A7', label: 'Permis-programmes inclus dans l’occupation (ou ignorés pour la revue)', apply: (b, e, o) => ({ base: b, env: { ...e, programmeInOccupation: true }, opts: { ...o, programmeInOccupation: true }, review: { base: b.filter(w => w.dur <= o.programmeDays) } }) },
  ];
  // mode 'reschedule': the recommended scenario must stay feasible and better; mode 'review': the verified
  // inter-organisation overlap inside the horizon must persist.
  function adversarial(scenarioId, base, env, opts, mode = 'reschedule') {
    return PERTURBATIONS.map(p => {
      const t = p.apply(base, env, opts);
      if (mode === 'review') {
        const rb = (t.review && t.review.base) || t.base, r = reviewBasis(rb, t.env, t.opts);
        return { id: p.id, label: p.label, pass: r.holds, reason: r.holds ? `${r.pairs.length} chevauchement(s) entre ${r.organisations.length} organisations maintenu(s)` : 'plus de chevauchement vérifié entre organisations dans l’horizon' };
      }
      if (new Set(t.base.map(w => w.agent).filter(Boolean)).size < 2) return { id: p.id, label: p.label, pass: false, reason: 'moins de deux organisations' };
      const baseline = evaluate(t.base, t.env), windows = scenario(scenarioId, t.base, t.env, t.opts);
      const m = evaluate(windows, t.env), viol = violations(t.base, windows, t.env, t.opts);
      const pass = !viol.length && better(m, baseline);
      return { id: p.id, label: p.label, pass, reason: pass ? 'conclusion maintenue' : viol.length ? viol[0] : 'plus d’amélioration par rapport à la référence', extraWindows: [baseline.extraWindows, m.extraWindows] };
    });
  }

  // ---------- Opportunity analysis for one segment group ----------
  function analyseGroup(ctx, seg, opts) {
    const { records } = groupRecords(ctx, seg, opts);
    const env = { asOfN: ctx.asOfN, closures: closuresFor(ctx, groupCnns(ctx, seg)), moratoria: moratoriaFor(ctx, groupCnns(ctx, seg)), programmeDays: opts.programmeDays, programmeInOccupation: !!opts.programmeInOccupation };
    const planning = records.filter(w => ['APPROVED', 'ACTIVE'].includes(w.status) && w.e >= ctx.asOfN);
    return { seg, records, planning, env };
  }

  // ---------- Agents (generators yielding real events) ----------
  function* discoveryAgent(ctx, opts, out) {
    const segs = [...ctx.segments.keys()];
    yield ev('discovery', 'start', `Lecture de ${ctx.data.permits.features.length} enregistrements de permis, ${segs.length} tronçons, ${ctx.data.closures.features.length} fermetures, ${ctx.data.moratoria.features.length} moratoires (instantané ${ctx.asOf}).`, { counts: { permits: ctx.data.permits.features.length, segments: segs.length } });
    const findings = [];
    for (const seg of segs) {
      const p = ctx.segments.get(seg).properties, g = analyseGroup(ctx, seg, opts), here = [];
      const live = g.records.filter(w => w.status !== 'RENEWED');
      // temporal overlap between organisations (all windows since 2021, superseded renewals excluded)
      let pairs = 0, days = 0; const pairIds = new Set();
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        if (a.agent && b.agent && a.agent !== b.agent) { const o = overlap(a, b); if (o > 0) { pairs++; days += o; pairIds.add(a.record_id); pairIds.add(b.record_id); } }
      }
      if (pairs) here.push({ type: 'overlap', title: 'Chevauchement temporel entre organisations', records: [...pairIds], metrics: { pairs, overlapDays: days } });
      // repeated work within a rolling window
      let bestRun = null;
      for (const a of live) {
        const inWin = live.filter(b => b.s >= a.s && b.s < a.s + opts.repeatWindowDays), orgs = new Set(inWin.map(w => w.agent).filter(Boolean));
        if (inWin.length >= opts.repeatMinPermits && orgs.size >= 2 && (!bestRun || inWin.length > bestRun.n)) bestRun = { n: inWin.length, orgs: orgs.size, from: a.start, ids: inWin.map(w => w.record_id) };
      }
      if (bestRun) here.push({ type: 'repeated', title: 'Travaux répétés au même endroit', records: bestRun.ids, metrics: { permits: bestRun.n, organisations: bestRun.orgs, windowStart: bestRun.from, windowDays: opts.repeatWindowDays } });
      // starts inside an active paving moratorium
      const mor = live.filter(w => g.env.moratoria.some(m => m.cnn === w.cnn && w.s >= m.s && w.s <= m.e));
      if (mor.length) here.push({ type: 'moratorium', title: 'Permis débutant pendant un moratoire de chaussée', records: mor.map(w => w.record_id), metrics: { permits: mor.length }, caveat: 'Des dérogations peuvent exister ; ce n’est pas une infraction démontrée.' });
      // conflicts with SFMTA closures
      const clo = live.filter(w => g.env.closures.some(c => overlap(w, c) > 0));
      if (clo.length) here.push({ type: 'closure', title: 'Fenêtres de permis pendant une fermeture SFMTA', records: clo.map(w => w.record_id), closures: [...new Set(g.env.closures.filter(c => clo.some(w => overlap(w, c))).map(c => c.record_id))], metrics: { permits: clo.length, closureDays: clo.reduce((s, w) => s + g.env.closures.reduce((t, c) => t + overlap(w, c), 0), 0) } });
      // prospective coordination opportunity
      const orgs = new Set(g.planning.map(w => w.agent).filter(Boolean)), movable = g.planning.filter(w => !w.fixed.length);
      if (orgs.size >= 2 && movable.length >= 1) here.push({ type: 'opportunity', title: 'Opportunité de coordination à venir', records: g.planning.map(w => w.record_id), metrics: { permits: g.planning.length, organisations: orgs.size, movable: movable.length } });
      for (const f of here) findings.push({ id: `${f.type}:${seg}`, seg, street: p.street, from: p.from, to: p.to, ...f });
      yield ev('discovery', 'scan', `${p.street} ${p.from} → ${p.to} : ${g.records.length} permis (${g.planning.length} en cours/à venir)${here.length ? ` — ${here.map(f => f.title.toLowerCase()).join(', ')}` : ''}.`, { cnn: groupCnns(ctx, seg), counts: { records: g.records.length, findings: here.length }, refs: here.flatMap(f => f.records).slice(0, 12) });
    }
    const order = { opportunity: 0, closure: 1, overlap: 2, moratorium: 3, repeated: 4 };
    findings.sort((a, b) => order[a.type] - order[b.type] || (b.metrics.organisations || 0) - (a.metrics.organisations || 0) || b.records.length - a.records.length || a.id.localeCompare(b.id));
    out.findings = findings;
    yield ev('discovery', 'done', `${findings.length} constats potentiels : ${countBy(findings, 'type')}.`, { counts: { findings: findings.length }, output: findings.map(f => f.id) });
  }

  function* evidenceAgent(ctx, opts, out) {
    yield ev('evidence', 'start', `Vérification de ${out.findings.length} constats : existence des enregistrements, sommes de l’instantané, cohérence des dates et de la géographie.`);
    const bad = Object.entries(ctx.datasets).filter(([, d]) => d.verified !== 'ok').map(([k]) => k);
    if (bad.length) yield ev('evidence', 'check', `Sommes SHA-256 non vérifiées pour : ${bad.join(', ')}. Les constats dépendants seront bloqués.`, { status: 'fail' });
    else yield ev('evidence', 'check', `Instantané ${ctx.asOf} : ${Object.keys(ctx.datasets).length} jeux, sommes SHA-256 vérifiées.`, { status: 'ok' });
    for (const f of out.findings) {
      const bundle = evidenceBundle(ctx, f, opts);
      f.evidence = bundle;
      const fails = bundle.checks.filter(c => !c.pass);
      yield ev('evidence', 'bundle', `${f.street} ${f.from} → ${f.to} · ${f.title} : ${bundle.records.length} enregistrements cités, ${bundle.checks.length - fails.length}/${bundle.checks.length} contrôles réussis${fails.length ? ` — échec : ${fails.map(c => c.label).join(' ; ')}` : ''}.`,
        { status: fails.length ? 'fail' : 'ok', cnn: groupCnns(ctx, f.seg), refs: bundle.records.map(r => r.record_id) });
    }
    const excluded = [...ctx.segments.keys()].reduce((s, seg) => s + groupRecords(ctx, seg, opts).excluded.length, 0);
    yield ev('evidence', 'done', `${out.findings.filter(f => f.evidence.valid).length}/${out.findings.length} constats étayés. ${excluded} enregistrements exclus de l’analyse (dates absentes ou géométrie incohérente), jamais complétés.`, { counts: { excluded } });
  }

  function evidenceBundle(ctx, f, opts) {
    const records = [], checks = [];
    for (const id of f.records) {
      const hit = ctx.byRecord.get(`permits:${id}`);
      if (!hit) { records.push({ record_id: id, missing: true }); continue; }
      const p = hit.feature.properties;
      records.push({ dataset: 'permits', record_id: id, permit_number: p.permit_number, cnn: p.cnn, agent: p.agent || null, status: p.status, type: p.permit_type, start: p.start, end: p.end,
        url: `https://data.sf.gov/resource/${ctx.datasets.permits ? ctx.datasets.permits.id : 'b6tj-gt35'}.json?permit_number=${encodeURIComponent(p.permit_number)}` });
    }
    const cnns = new Set(groupCnns(ctx, f.seg));
    checks.push({ id: 'records', label: 'enregistrements présents dans l’instantané', pass: records.every(r => !r.missing) && records.length > 0 });
    checks.push({ id: 'snapshot', label: 'sommes SHA-256 de l’instantané vérifiées', pass: ['permits', 'corridor', 'closures', 'moratoria'].every(k => ctx.datasets[k] && ctx.datasets[k].verified === 'ok') });
    checks.push({ id: 'dates', label: 'dates cohérentes', pass: records.every(r => r.missing || (isDay(r.start) && isDay(r.end) && r.start <= r.end)) });
    checks.push({ id: 'geography', label: 'tronçon ou intersection du groupe, position ≤ ' + opts.geoToleranceM + ' m', pass: records.every(r => { if (r.missing) return false; const h = ctx.byRecord.get(`permits:${r.record_id}`); return cnns.has(r.cnn) && distanceToGeometry(h.feature.geometry.coordinates, geometryOfCnn(ctx, r.cnn)) <= opts.geoToleranceM; }) });
    if (['overlap', 'opportunity'].includes(f.type)) checks.push({ id: 'organisations', label: 'au moins deux organisations identifiées', pass: new Set(records.map(r => r.agent).filter(Boolean)).size >= 2 });
    const method = {
      overlap: 'Paires de permis d’organisations différentes sur le même groupe (tronçon + intersections), recouvrement inclusif des fenêtres [début, fin] ; renouvellements exclus.',
      repeated: `Nombre maximal de permis distincts débutant dans une fenêtre glissante de ${opts.repeatWindowDays} jours, au moins deux organisations ; seuil ${opts.repeatMinPermits}.`,
      moratorium: 'Début de fenêtre compris dans un moratoire en vigueur sur le même CNN (jeu des moratoires actuels uniquement).',
      closure: 'Recouvrement des fenêtres de permis avec les fermetures SFMTA sur les CNN du groupe.',
      opportunity: `Permis APPROVED/ACTIVE se terminant après l’instantané, au moins deux organisations et un permis déplaçable (non commencé, non urgent, ≤ ${opts.programmeDays} j).`,
    }[f.type];
    return { records, checks, method, valid: checks.every(c => c.pass), snapshot: { date: ctx.asOf, generated_at: ctx.manifest.generated_at, datasets: Object.fromEntries(['permits', 'corridor', 'intersections', 'closures', 'moratoria'].map(k => [k, ctx.datasets[k] ? { sha256: ctx.datasets[k].sha256, verified: ctx.datasets[k].verified } : null])) } };
  }

  function* scenarioAgent(ctx, opts, out) {
    const opps = out.findings.filter(f => f.type === 'opportunity');
    yield ev('scenario', 'start', `${opps.length} opportunités à venir ; génération de ${SCENARIOS.length} scénarios chacune sous contraintes déclarées (±${opts.maxShiftDays} j, préavis ${opts.leadDays} j, programmes > ${opts.programmeDays} j fixes).`);
    out.analyses = {};
    for (const f of opps) {
      if (!f.evidence.valid) { yield ev('scenario', 'skip', `${f.street} ${f.from} → ${f.to} : preuves incomplètes, aucun scénario généré.`, { status: 'fail', cnn: groupCnns(ctx, f.seg) }); continue; }
      const g = analyseGroup(ctx, f.seg, opts);
      out.analyses[f.id] = { group: g, base: g.planning };
      const movable = g.planning.filter(w => !w.fixed.length).map(w => w.permit_number);
      yield ev('scenario', 'generate', `${f.street} ${f.from} → ${f.to} : ${g.planning.length} fenêtres de ${new Set(g.planning.map(w => w.agent).filter(Boolean)).size} organisations ; déplaçables : ${movable.join(', ') || 'aucune'} ; fermetures SFMTA dans le groupe : ${g.env.closures.length}.`, { cnn: groupCnns(ctx, f.seg), refs: g.planning.map(w => w.record_id) });
    }
  }

  function* evaluationAgent(ctx, opts, out) {
    yield ev('evaluation', 'start', `Calcul déterministe des métriques pour ${Object.keys(out.analyses).length} opportunités × ${SCENARIOS.length} scénarios.`);
    for (const [id, a] of Object.entries(out.analyses)) {
      const res = evaluateScenarios(a.base, a.group.env, opts);
      a.result = res;
      for (const s of res.scenarios) {
        const m = s.metrics;
        yield ev('evaluation', 'scenario', `${id.split(':')[1]} · ${s.id} ${s.name} : ${m.occupationWindows} fenêtre(s) d’occupation, ${m.overlapPairs} chevauchement(s) inter-organisations (${m.overlapDays} j), ${m.closureConflictDays} j en conflit avec fermeture, ${s.violations.length} violation(s)${s.applicable ? '' : ' — non applicable'}${s.improves ? ' — améliore la référence' : ''}.`,
          { status: s.violations.length ? 'warn' : 'ok', cnn: groupCnns(ctx, a.group.seg), output: fingerprint(s) });
      }
      a.mode = res.recommended ? 'reschedule' : res.review.holds ? 'review' : null;
      yield ev('evaluation', 'select', `${id.split(':')[1]} : ${res.recommended ? `replanification ${res.recommended} retenue (priorité : conflits de fermeture, moratoires, séquence, fenêtres distinctes, jours d’occupation ; chevauchement neutre)`
        : res.review.holds ? `aucune replanification ne domine la référence ; ${res.review.pairs.length} chevauchement(s) vérifié(s) entre ${res.review.organisations.join(', ')} dans les ${opts.horizonDays} j → revue de coordination proposée`
        : 'aucune replanification ne domine et aucun chevauchement à revoir'}.`, { status: a.mode ? 'ok' : 'warn', refs: res.review.pairs.flatMap(p => [p.a, p.b]) });
    }
  }

  function* adversarialAgent(ctx, opts, out) {
    const rec = Object.entries(out.analyses).filter(([, a]) => a.mode);
    yield ev('adversarial', 'start', `${PERTURBATIONS.length} perturbations canoniques appliquées à ${rec.length} proposition(s).`);
    for (const [id, a] of rec) {
      a.adversarial = adversarial(a.result.recommended, a.base, a.group.env, opts, a.mode);
      for (const r of a.adversarial) yield ev('adversarial', 'test', `${id.split(':')[1]} · ${a.mode === 'review' ? 'revue' : a.result.recommended} · ${r.id} ${r.label} : ${r.pass ? 'tenu — ' + r.reason : 'ÉCHEC — ' + r.reason}.`, { status: r.pass ? 'ok' : 'fail', cnn: groupCnns(ctx, a.group.seg) });
    }
  }

  function* gatewayAgent(ctx, opts, out) {
    yield ev('gateway', 'start', 'Passerelle de coordination : recalcul indépendant de chaque proposition (preuves, géographie, dates, contraintes, métriques, perturbations).');
    out.decisions = {};
    for (const f of out.findings.filter(x => x.type === 'opportunity')) {
      const proposal = makeProposal(ctx, out, f.id, opts);
      const d = issueCoordinationProposal(proposal, ctx);
      out.decisions[f.id] = { proposal, decision: d };
      yield ev('gateway', 'decide', `${f.street} ${f.from} → ${f.to} : ${d.state} — ${d.reason}`, { status: d.state === 'PRÊT POUR REVUE HUMAINE' ? 'ok' : d.state === 'SUSPENDU' ? 'warn' : 'fail', cnn: groupCnns(ctx, f.seg) });
    }
    const n = Object.values(out.decisions).filter(x => x.decision.state === 'PRÊT POUR REVUE HUMAINE').length;
    yield ev('gateway', 'done', `${n} proposition(s) prête(s) pour revue humaine ; aucune n’est une autorisation. CORE n’applique rien.`);
  }

  let SEQ = 0;
  function ev(agent, op, text, extra = {}) { return { seq: ++SEQ, agent, kind: 'deterministic', op, text, status: 'ok', ...extra }; }
  const countBy = (a, k) => Object.entries(a.reduce((m, x) => (m[x[k]] = (m[x[k]] || 0) + 1, m), {})).map(([t, n]) => `${n} ${t}`).join(', ');

  // Full pipeline: yields every event; the final event carries the result fingerprint.
  function* pipeline(ctx, options = {}) {
    const opts = { ...DEFAULTS, ...options };
    SEQ = 0;
    const out = { opts };
    for (const agent of [discoveryAgent, evidenceAgent, scenarioAgent, evaluationAgent, adversarialAgent, gatewayAgent]) yield* agent(ctx, opts, out);
    out.fingerprint = fingerprint(summary(out));
    yield { seq: ++SEQ, agent: 'system', kind: 'deterministic', op: 'complete', status: 'ok', text: `Exécution terminée. Empreinte des résultats ${out.fingerprint} (FNV-1a, non cryptographique) — identique à chaque réexécution sur le même instantané.`, result: out };
  }
  function run(ctx, options) { const events = []; let result = null; for (const e of pipeline(ctx, options)) { events.push(e); if (e.result) result = e.result; } return { events, result }; }
  function summary(out) {
    return { findings: out.findings.map(f => ({ id: f.id, records: f.records, metrics: f.metrics, valid: f.evidence && f.evidence.valid })),
      analyses: Object.fromEntries(Object.entries(out.analyses).map(([k, a]) => [k, { mode: a.mode || null, recommended: a.result && a.result.recommended, review: a.result && a.result.review, scenarios: a.result && a.result.scenarios, adversarial: a.adversarial || null }])),
      decisions: Object.fromEntries(Object.entries(out.decisions || {}).map(([k, d]) => [k, d.decision.state])) };
  }
  // Trace for replay/export: events without the in-memory result object.
  function trace(events) { return events.map(({ result, ...e }) => e); }
  function traceFingerprint(events) { return fingerprint(trace(events)); }

  // ---------- Proposal + coordination gateway ----------
  function makeProposal(ctx, out, findingId, opts) {
    const f = out.findings.find(x => x.id === findingId), a = out.analyses[findingId];
    if (!f) return null;
    const rec = a && a.result && a.result.recommended ? a.result.scenarios.find(s => s.id === a.result.recommended) : null;
    return {
      mode: (a && a.mode) || null,
      finding: { id: f.id, type: f.type, seg: f.seg, records: f.records },
      evidence: f.evidence ? { records: f.evidence.records, snapshot: f.evidence.snapshot } : null,
      params: { maxShiftDays: opts.maxShiftDays, leadDays: opts.leadDays, programmeDays: opts.programmeDays, geoToleranceM: opts.geoToleranceM },
      scenario: rec ? { id: rec.id, windows: rec.windows, metrics: rec.metrics } : null,
      review: a && a.result ? a.result.review : null,
      baseline: a && a.result ? a.result.baseline : null,
      adversarial: a && a.adversarial ? a.adversarial.map(r => ({ id: r.id, pass: r.pass })) : null,
    };
  }
  const PROPOSAL_KEYS = ['mode', 'finding', 'evidence', 'params', 'scenario', 'review', 'baseline', 'adversarial'];
  function blockedDecision(reason, checks) {
    return { state: 'BLOQUÉ', reason, checks, recommendation: null, conditions: [], humanReview: 'Revue humaine obligatoire. Aucune proposition exploitable.', authorizes: false };
  }
  function issueCoordinationProposal(input, ctx) {
    const checks = []; const add = (id, label, pass, detail) => { checks.push({ id, label, pass: !!pass, detail: detail || null }); return !!pass; };
    let p;
    try { p = JSON.parse(JSON.stringify(input)); } catch (_) { return blockedDecision('Proposition illisible.', checks); }
    try {
      if (!add('contract', 'contrat complet et sans champ inconnu', p && typeof p === 'object' && Object.keys(p).every(k => PROPOSAL_KEYS.includes(k)) && PROPOSAL_KEYS.every(k => k in p) && p.finding && p.evidence && p.params))
        return blockedDecision('Preuves manquantes ou contrat incomplet.', checks);
      const opts = { ...DEFAULTS, ...p.params };
      if (!add('params', 'paramètres déclarés valides', [opts.maxShiftDays, opts.leadDays, opts.programmeDays, opts.geoToleranceM].every(v => Number.isInteger(v) && v >= 0 && v <= 3650)))
        return blockedDecision('Paramètres de scénario invalides.', checks);
      const f = p.finding, seg = f.seg;
      if (!add('finding', 'constat rattaché à un tronçon du corridor', typeof seg === 'string' && ctx.segments.has(seg) && f.type === 'opportunity' && Array.isArray(f.records) && f.records.length > 0))
        return blockedDecision('Constat inconnu ou hors corridor.', checks);
      const snap = p.evidence.snapshot || {};
      const snapOk = snap.date === ctx.asOf && ['permits', 'corridor', 'closures', 'moratoria'].every(k => snap.datasets && snap.datasets[k] && ctx.datasets[k] && snap.datasets[k].sha256 === ctx.datasets[k].sha256 && ctx.datasets[k].verified === 'ok');
      if (!add('snapshot', 'instantané identifié et sommes SHA-256 vérifiées', snapOk)) return blockedDecision('Enregistrements sources non vérifiables (instantané non vérifié ou différent).', checks);
      const recs = p.evidence.records || [], cnns = new Set(groupCnns(ctx, seg));
      const recordsOk = recs.length === f.records.length && recs.every(r => {
        const h = ctx.byRecord.get(`permits:${r.record_id}`); if (!h || !f.records.includes(r.record_id)) return false;
        const q = h.feature.properties;
        return r.permit_number === q.permit_number && r.cnn === q.cnn && r.start === q.start && r.end === q.end && (r.agent || null) === (q.agent || null) && r.status === q.status;
      });
      if (!add('records', 'enregistrements cités identiques à l’instantané', recordsOk)) return blockedDecision('Preuves absentes, inconnues ou modifiées.', checks);
      const geoOk = recs.every(r => { const h = ctx.byRecord.get(`permits:${r.record_id}`); return cnns.has(r.cnn) && distanceToGeometry(h.feature.geometry.coordinates, geometryOfCnn(ctx, r.cnn)) <= opts.geoToleranceM; });
      if (!add('geography', 'relations géographiques valides', geoOk)) return blockedDecision('Relation géographique invalide.', checks);
      const datesOk = recs.every(r => isDay(r.start) && isDay(r.end) && r.start <= r.end);
      if (!add('dates', 'dates cohérentes', datesOk)) return blockedDecision('Dates incohérentes.', checks);
      // deterministic recomputation from the snapshot
      const g = analyseGroup(ctx, seg, opts);
      const plan = g.planning.map(w => w.record_id).sort();
      if (!add('finding-recompute', 'constat recalculé à l’identique', JSON.stringify(plan) === JSON.stringify([...f.records].sort()) && new Set(g.planning.map(w => w.agent).filter(Boolean)).size >= 2 && g.planning.some(w => !w.fixed.length)))
        return blockedDecision('Le constat ne correspond pas au recalcul déterministe.', checks);
      const res = evaluateScenarios(g.planning, g.env, opts);
      const mode = res.recommended ? 'reschedule' : res.review.holds ? 'review' : null;
      if (!add('mode', 'type de recommandation recalculé à l’identique', p.mode === mode && mode !== null, mode ? null : 'ni replanification dominante ni chevauchement à revoir'))
        return blockedDecision(mode ? 'Le type de recommandation ne correspond pas au recalcul.' : 'Aucune replanification ne domine la référence et aucun chevauchement vérifié n’est à revoir.', checks);
      if (!add('baseline', 'référence recalculée à l’identique', stable(res.baseline) === stable(p.baseline) && stable(res.review) === stable(p.review)))
        return blockedDecision('Les résultats ne correspondent pas au recalcul déterministe.', checks);
      const conditions = ASSUMPTIONS.map(a => a.replace(/\{(\w+)\}/g, (_, k) => opts[k]));
      if (mode === 'review') {
        if (!add('no-schedule-change', 'aucune fenêtre modifiée dans une revue', p.scenario === null)) return blockedDecision('Une revue de coordination ne peut pas porter de changement de calendrier.', checks);
        const adv = adversarial(null, g.planning, g.env, opts, 'review');
        if (!add('adversarial-recompute', 'tests adversariaux recalculés à l’identique', Array.isArray(p.adversarial) && stable(adv.map(r => ({ id: r.id, pass: r.pass }))) === stable(p.adversarial)))
          return blockedDecision('Les tests adversariaux ne correspondent pas au recalcul.', checks);
        const failed = adv.filter(r => !r.pass);
        const recommendation = { type: 'review', organisations: res.review.organisations, pairs: res.review.pairs, baseline: res.baseline, options: res.scenarios.map(s => ({ id: s.id, name: s.name, applicable: s.applicable, violations: s.violations.length, metrics: s.metrics })) };
        if (!add('robust', 'chevauchement maintenu sous les perturbations canoniques', !failed.length, failed.map(r => `${r.id} ${r.reason}`).join(' ; ') || null))
          return { state: 'SUSPENDU', reason: `Constat fragile : ${failed.map(r => r.label.toLowerCase()).join(' ; ')}.`, checks, recommendation, conditions, humanReview: humanText, authorizes: false };
        return { state: 'PRÊT POUR REVUE HUMAINE', reason: `Revue de coordination : ${res.review.organisations.join(', ')} ont ${res.review.pairs.length} chevauchement(s) de fenêtres de permis sur ce tronçon d’ici ${opts.horizonDays} j. Aucune replanification ne domine la référence sous les contraintes ; options comparées jointes.`, checks, recommendation, conditions, humanReview: humanText, authorizes: false };
      }
      const sc = p.scenario && res.scenarios.find(s => s.id === p.scenario.id);
      if (!add('scenario-known', 'scénario connu et applicable', !!sc && sc.id !== 'S0' && sc.applicable)) return blockedDecision('Scénario inconnu ou absent.', checks);
      // windows must respect declared constraints (checked on the submitted windows, not only the recomputed ones)
      const byId = new Map(g.planning.map(w => [w.record_id, w]));
      const submitted = (p.scenario.windows || []).map(w => { const o = byId.get(w.record_id); return o && isDay(w.start) && isDay(w.end) ? { ...o, s: dn(w.start), e: dn(w.end) } : { record_id: w.record_id, s: NaN, e: NaN }; });
      const viol = submitted.some(w => !Number.isFinite(w.s)) ? ['fenêtre invalide'] : violations(g.planning, submitted, g.env, opts);
      if (!add('constraints', 'contraintes déclarées respectées', !viol.length, viol.join(' ; ') || null)) return blockedDecision(`Le scénario viole les contraintes : ${viol[0]}.`, checks);
      const same = JSON.stringify(sc.windows) === JSON.stringify(p.scenario.windows) && stable(sc.metrics) === stable(p.scenario.metrics);
      if (!add('recompute', 'fenêtres et métriques identiques au recalcul', same)) return blockedDecision('Les résultats ne correspondent pas au recalcul déterministe.', checks);
      if (!add('improves', 'amélioration stricte sur la référence, sans conflit supplémentaire', sc.improves && res.recommended === sc.id)) return blockedDecision('Le scénario n’améliore pas la référence ou n’est pas le mieux classé.', checks);
      const adv = adversarial(sc.id, g.planning, g.env, opts, 'reschedule');
      const advSame = Array.isArray(p.adversarial) && stable(adv.map(r => ({ id: r.id, pass: r.pass }))) === stable(p.adversarial);
      if (!add('adversarial-recompute', 'tests adversariaux recalculés à l’identique', advSame)) return blockedDecision('Les tests adversariaux ne correspondent pas au recalcul.', checks);
      const failed = adv.filter(r => !r.pass);
      const recommendation = { type: 'reschedule', scenario: sc.id, name: sc.name, moved: sc.windows.filter(w => w.shift).map(w => ({ permit_number: w.permit_number, agent: w.agent, from: byId.get(w.record_id).start, to: w.start, shift: w.shift })), baseline: res.baseline, metrics: sc.metrics };
      if (!add('robust', 'conclusion maintenue sous les 6 perturbations canoniques', !failed.length, failed.map(r => `${r.id} ${r.reason}`).join(' ; ') || null))
        return { state: 'SUSPENDU', reason: `Conclusion fragile : ${failed.map(r => r.label.toLowerCase()).join(' ; ')}.`, checks, recommendation, conditions, humanReview: humanText, authorizes: false };
      return { state: 'PRÊT POUR REVUE HUMAINE', reason: `${sc.name} : ${res.baseline.occupationWindows} → ${sc.metrics.occupationWindows} fenêtre(s) d’occupation, ${res.baseline.overlapPairs} → ${sc.metrics.overlapPairs} chevauchement(s), conflits fermeture ${res.baseline.closureConflictDays} → ${sc.metrics.closureConflictDays} j (dates de permis, hypothèses déclarées).`, checks, recommendation, conditions, humanReview: humanText, authorizes: false };
    } catch (err) { return blockedDecision('Proposition invalide : ' + (err && err.message ? err.message : 'erreur'), checks); }
  }
  const humanText = 'Recommandation conditionnelle. Revue humaine obligatoire (coordination SF Public Works et titulaires des permis). CORE n’autorise ni n’applique aucun changement.';

  const COORD = { reviewBasis, better, PRIORITY, DEFAULTS, ASSUMPTIONS, SCENARIOS, AGENTS, PERTURBATIONS, buildContext, pipeline, run, trace, traceFingerprint, fingerprint, stable, evaluate, evaluateScenarios, scenario, violations, mergeIntervals, overlap, analyseGroup, groupRecords, groupCnns, distanceToGeometry, makeProposal, issueCoordinationProposal, dn, ds };
  if (typeof module !== 'undefined' && module.exports) module.exports = COORD; else root.CORE_COORD = COORD;
})(typeof globalThis !== 'undefined' ? globalThis : this);
