// CORE — San Francisco public-record normalization (Phase 2B).
// Pure functions shared by scripts/sf-snapshot.mjs (Node) and the browser.
// Rule: never invent a record, coordinate or date. Rows without usable geometry are counted and dropped.
(function (root) {
  'use strict';

  const CORRIDOR = {
    id: 'folsom-howard-2nd-11th',
    streets: ['FOLSOM ST', 'HOWARD ST'],
    from: '02ND ST',
    to: '11TH ST',
    since: '2021-01-01', // permit window; documented in the manifest
  };

  // Columns that identify or contact people. They are never written to a snapshot.
  const PII_COLUMNS = ['agentphone', 'contact', 'inspector', 'planchecker', 'phone', 'email', 'contact_name', 'contact_phone'];

  // Street-use permit types kept for street-works analysis (DataSF b6tj-gt35 `permit_type`).
  const WORK_PERMIT_TYPES = ['Excavation', 'ExcStreet', 'StrtImprov', 'Boring', 'Emergency'];

  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const num = v => (v === null || v === undefined || v === '' ? NaN : Number(v));
  const day = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const text = v => (v === null || v === undefined ? null : String(v).trim() || null);
  // CNN ids arrive as "5678000" or "24583000.0" depending on the dataset; normalize to integer strings.
  const cnnId = v => { const t = text(v); return t !== null && /^\d+(\.0+)?$/.test(t) ? String(parseInt(t, 10)) : t; };

  // Free-text fields (purpose, info, …) sometimes embed contact details: redact emails and phone numbers.
  const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const PHONE = /(?:\+?1[-. ]?)?\(?\b\d{3}\)?[-. ]?\d{3}[-. ]\d{4}\b/g;
  const scrub = v => { const t = text(v); return t === null ? null : t.replace(EMAIL, '[courriel masqué]').replace(PHONE, '[téléphone masqué]'); };
  const hasContactText = v => typeof v === 'string' && (new RegExp(EMAIL.source).test(v) || new RegExp(PHONE.source).test(v));

  // Permit holders are kept only when they are clearly organisations; anything that may be a person's name is masked.
  const ORG = /\b(inc|llc|l\.l\.c|ltd|co|corp|corporation|company|construction|engineering|electric|gas|department|dept|communications?|group|services?|plumbing|pipelines?|builders|works|paving|grading|concrete|cement|contractors?|broadband|technolog(?:y|ies)|testlab|lightworks|energy|parks|utility|utilities|protection|exploration|telephone|telecom\w*|cable\w*|brothers|management|city|county|agency|authority|district|sfmta|transit|water|power|fiber)\b/i;
  const organisation = v => { const t = text(v); return t && ORG.test(t) ? t : null; };

  function stripPII(row) {
    const out = {};
    for (const [k, v] of Object.entries(row)) if (!PII_COLUMNS.includes(k.toLowerCase())) out[k] = v;
    return out;
  }

  function pointOf(row) {
    const lon = num(row.longitude), lat = num(row.latitude);
    if (finite(lon) && finite(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lon === 0 && lat === 0)) return [lon, lat];
    for (const key of ['point', 'location', 'the_geom']) {
      const g = row[key];
      if (g && g.type === 'Point' && Array.isArray(g.coordinates)) {
        const [x, y] = g.coordinates.map(Number);
        if (finite(x) && finite(y) && !(x === 0 && y === 0)) return [x, y];
      }
    }
    return null;
  }

  // Walk the centerline chain of `street` from the node at `from` to the node at `to` (CNN topology).
  function corridorSegments(rows, street, from, to) {
    const segs = rows.filter(r => r.streetname === street && String(r.active) !== 'false' && r.line && r.line.type === 'LineString');
    const start = segs.find(r => r.f_st === from) || segs.find(r => r.t_st === from);
    if (!start) return [];
    const forward = start.f_st === from;
    const byNode = new Map();
    for (const s of segs) {
      const a = forward ? s.f_node_cnn : s.t_node_cnn;
      if (!byNode.has(a)) byNode.set(a, s);
    }
    const out = []; const seen = new Set();
    let cur = start;
    while (cur && !seen.has(cur.cnn) && out.length < 200) {
      out.push(cur); seen.add(cur.cnn);
      if ((forward ? cur.t_st : cur.f_st) === to) return out;
      cur = byNode.get(forward ? cur.t_node_cnn : cur.f_node_cnn);
    }
    return []; // chain did not reach `to`: refuse rather than guess
  }

  function segmentFeature(r) {
    return { type: 'Feature', geometry: r.line, properties: {
      kind: 'segment', record_id: cnnId(r.cnn), cnn: cnnId(r.cnn), street: r.streetname, from: text(r.f_st), to: text(r.t_st),
      f_node_cnn: cnnId(r.f_node_cnn), t_node_cnn: cnnId(r.t_node_cnn), oneway: text(r.oneway), classcode: text(r.classcode) } };
  }

  function statusClass(s) {
    const v = String(s || '').toLowerCase();
    if (/active|issued|approved/.test(v)) return 'active';
    if (/complete|closed|expired|finaled|cancel/.test(v)) return 'ended';
    return 'other';
  }

  // Street-use permits (b6tj-gt35) → point features. Location is the permit's published point.
  function permitFeature(row) {
    const r = stripPII(row); const p = pointOf(r);
    if (!p || !text(r.permit_number)) return null;
    return { type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {
      kind: 'permit', record_id: `${text(r.permit_number)}@${cnnId(r.cnn)}`, permit_number: text(r.permit_number),
      permit_type: text(r.permit_type), status: text(r.status), status_class: statusClass(r.status),
      street: text(r.streetname), cross_street_1: text(r.cross_street_1), cross_street_2: text(r.cross_street_2), cnn: cnnId(r.cnn),
      agent: organisation(r.agent), agent_masked: text(r.agent) && !organisation(r.agent) ? true : undefined, purpose: scrub(r.permit_purpose), approved: day(r.approved_date), start: day(r.permit_start_date), end: day(r.permit_end_date),
      project: /streetscape/i.test(r.permit_purpose || '') ? 'streetscape' : null } };
  }

  // Large utility excavation permits (i926-ujnc).
  function largePermitFeature(row) {
    const r = stripPII(row); const p = pointOf(r);
    if (!p) return null;
    return { type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {
      kind: 'large_excavation', record_id: `${text(r.permit_number)}@${cnnId(r.cnn)}`, permit_number: text(r.permit_number), status: text(r.permit_status),
      status_class: statusClass(r.permit_status), street: text(r.street_name), cross_street_1: text(r.cross_street_1), cross_street_2: text(r.cross_street_2),
      cnn: cnnId(r.cnn), agent: organisation(r.agent), agent_masked: text(r.agent) && !organisation(r.agent) ? true : undefined, purpose: scrub(r.permit_purpose), reason: scrub(r.permit_reason), start: day(r.permit_start_date), end: day(r.permit_end_date) } };
  }

  // Paving moratoria (5wbp-dwzt) are joined to the corridor segment with the same CNN; intersections keep their point.
  function moratoriumFeature(row, segByCnn) {
    const r = stripPII(row); const seg = segByCnn.get(cnnId(r.cnn)); const p = pointOf(r);
    const geometry = seg ? seg.geometry : (p ? { type: 'Point', coordinates: p } : null);
    if (!geometry) return null;
    return { type: 'Feature', geometry, properties: {
      kind: 'moratorium', record_id: text(r.id) || `${cnnId(r.cnn)}-${day(r.effectivedate)}`, cnn: cnnId(r.cnn), street: text(r.streetname), limits: scrub(r.limits),
      start: day(r.effectivedate), end: day(r.expirationdate), job_order: text(r.jobordernum), geometry_source: seg ? 'segment CNN join' : 'published point' } };
  }

  // SFMTA temporary street closures (8x25-yybr) carry their own line geometry.
  function closureFeature(row) {
    const r = stripPII(row); const g = r.shape;
    if (!g || !/LineString|Point/.test(g.type)) return null;
    return { type: 'Feature', geometry: g, properties: {
      kind: 'closure', record_id: text(r.objectid) || text(r.case_num), case_num: text(r.case_num), case_name: scrub(r.case_name), type: text(r.type),
      status: text(r.status), street: text(r.street), from: text(r.from_st), to: text(r.to_st), cnn: cnnId(r.cnn), impact: text(r.veh_imp),
      start: day(r.start_date) || day(r.start_dt), end: day(r.end_date) || day(r.end_dt), info: scrub(r.info) } };
  }

  function collect(rows, fn, ...args) {
    const features = []; let dropped = 0;
    for (const row of rows) { const f = fn(row, ...args); if (f) features.push(f); else dropped++; }
    return { features, dropped };
  }

  // Recursively assert that no PII column name survives in a snapshot.
  function hasPII(value) {
    if (hasContactText(value)) return true;
    if (Array.isArray(value)) return value.some(hasPII);
    if (value && typeof value === 'object') return Object.entries(value).some(([k, v]) => PII_COLUMNS.includes(k.toLowerCase()) || hasPII(v));
    return false;
  }

  const SF = { cnnId, organisation, scrub, CORRIDOR, PII_COLUMNS, WORK_PERMIT_TYPES, stripPII, pointOf, corridorSegments, segmentFeature, statusClass,
    permitFeature, largePermitFeature, moratoriumFeature, closureFeature, collect, hasPII };
  if (typeof module !== 'undefined' && module.exports) module.exports = SF; else root.CORE_SF_DATA = SF;
})(typeof globalThis !== 'undefined' ? globalThis : this);
