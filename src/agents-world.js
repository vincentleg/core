// CORE — agents in the world (Phase 7). Holographic avatars for agent profiles, a movement engine on the corridor
// street network, and a replay of RECORDED missions. Truthfulness rules:
//  • an avatar's state always comes from a recorded event (tool call → investigating, model call → reasoning
//    (recorded), report → reporting, dispute → collaborating) or is "idle — no execution running";
//  • movement visualises where the data a tool used is located; it is not a physical inspection;
//  • replay keeps the real event order and shows recorded timestamps; display pacing is compressed and says so;
//  • structured messages are derived only from recorded responses, routing events, reports and the gateway.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { map: null, avatars: new Map(), net: null, hub: null, replay: null, follow: null, selected: null, raf: 0, showAll: false };
  const FLAGSHIP = m => m.mode === 'fast' && /cheminement/.test(m.question);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = 6371008.8, rad = x => x * Math.PI / 180;
  const dist = (a, b) => { const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const key = c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`;

  // ---------- Street network of the corridor (segments + cross-street connectors) ----------
  function buildNet(ctx) {
    const nodes = new Map(), adj = new Map(), node = c => { const k = key(c); if (!nodes.has(k)) { nodes.set(k, c); adj.set(k, []); } return k; };
    const link = (a, b, coords, kind) => { const len = coords.slice(1).reduce((n, c, i) => n + dist(coords[i], c), 0); adj.get(a).push({ to: b, coords, len, kind }); adj.get(b).push({ to: a, coords: coords.slice().reverse(), len, kind }); };
    const ends = { FOLSOM: [], HOWARD: [] };
    for (const [cnn, f] of ctx.segments) {
      const c = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates.flat() : f.geometry.coordinates, a = node(c[0]), b = node(c[c.length - 1]);
      link(a, b, c, 'street'); const st = /FOLSOM/i.test(f.properties.street) ? 'FOLSOM' : 'HOWARD'; ends[st].push(a, b);
    }
    // Cross streets are not in the snapshot: connect mutually-nearest Folsom/Howard nodes ≤ 240 m (approximation, flagged).
    const near = (k, list) => list.map(o => [o, dist(nodes.get(k), nodes.get(o))]).sort((x, y) => x[1] - y[1])[0];
    for (const f of [...new Set(ends.FOLSOM)]) { const [h, d] = near(f, [...new Set(ends.HOWARD)]); if (d <= 240 && near(h, [...new Set(ends.FOLSOM)])[0] === f) link(f, h, [nodes.get(f), nodes.get(h)], 'cross-street (approximation)'); }
    return { nodes, adj };
  }
  function nearestNode(c) { let best = null, bd = Infinity; for (const [k, n] of S.net.nodes) { const d = dist(c, n); if (d < bd) { bd = d; best = k; } } return best; }
  // An endpoint is on the network when it lies within 30 m of a corridor street line.
  const offNet = c => { for (const f of S.ctx.segments.values()) if (G.CORE_COORD.distanceToGeometry(c, f.geometry) <= 30) return false; return true; };
  // Dijkstra on ≤ 100 nodes; returns coordinates and whether any leg is approximate.
  function route(from, to) {
    if (S.walknet) { const r = S.walknet.route(from, to); if (r) return { coords: r.coords, approx: r.approx, length: r.length, network: 'osm' }; }
    const a = nearestNode(from), b = nearestNode(to), D = new Map([[a, 0]]), prev = new Map(), Q = new Set(S.net.nodes.keys());
    while (Q.size) { let u = null, du = Infinity; for (const q of Q) { const d = D.has(q) ? D.get(q) : Infinity; if (d < du) { du = d; u = q; } } if (u === null || u === b) break; Q.delete(u);
      for (const e of S.net.adj.get(u)) { const nd = du + e.len; if (nd < (D.has(e.to) ? D.get(e.to) : Infinity)) { D.set(e.to, nd); prev.set(e.to, { from: u, e }); } } }
    const legs = []; let k = b; while (prev.has(k)) { const p = prev.get(k); legs.unshift(p.e); k = p.from; }
    const coords = [from, ...legs.flatMap(e => e.coords), to], approx = legs.some(e => e.kind !== 'street') || offNet(from) || offNet(to);
    return { coords, approx, length: coords.slice(1).reduce((n, c, i) => n + dist(coords[i], c), 0) };
  }
  const along = (coords, f) => { const L = coords.slice(1).map((c, i) => dist(coords[i], c)), T = L.reduce((a, b) => a + b, 0) || 1; let d = f * T; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const t = L[i] ? Math.min(1, d / L[i]) : 1; return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t]; } d -= L[i]; } return coords[coords.length - 1]; };
  const mid = g => { const c = g.type === 'MultiLineString' ? g.coordinates.flat() : g.coordinates; return along(c, 0.5); };

  // ---------- Avatars: rendered by CORE_MOTION (one avatar system for population, replay and live) ----------
  const STATE_FR = { idle: 'en attente (aucune exécution en cours)', walking: 'déplacement', investigating: 'outil exécuté (relecture)', reasoning: 'interprétation du modèle (enregistrée)', reporting: 'rapport (relecture)', collaborating: 'échange avec un autre agent (relecture)', routing: 'demande routée (relecture)' };
  const M = () => G.CORE_MOTION;
  // Agents sharing a location stand side by side (≈ 5 m apart) instead of on top of each other (display only).
  // Co-located agents stand on distinct nearby walkway nodes (valid ground positions), never on geometric offsets.
  const offset = (c, slot) => slot == null ? c : S.walknet ? S.walknet.spread(c, slot + 1) : c;
  function hubLayer() {
    const map = S.map, data = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: S.hub }, properties: { label: 'Poste de coordination virtuel' } }] };
    if (!map.getSource('core-hub')) { map.addSource('core-hub', { type: 'geojson', data }); map.addLayer({ id: 'core-hub', type: 'circle', source: 'core-hub', minzoom: 12, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 17, 26], 'circle-color': 'rgba(92,200,255,0.10)', 'circle-stroke-color': '#5cc8ff', 'circle-stroke-width': 1.2, 'circle-stroke-opacity': 0.7 } });
      map.addLayer({ id: 'core-hub-label', type: 'symbol', source: 'core-hub', minzoom: 13.5, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 2.4] }, paint: { 'text-color': '#9fdcff', 'text-halo-color': '#02050b', 'text-halo-width': 1.4 } }); }
    if (!map.getSource('agent-route')) { map.addSource('agent-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); map.addLayer({ id: 'agent-route', type: 'line', source: 'agent-route', paint: { 'line-color': ['match', ['get', 'part'], 'done', '#e3b341', '#5cc8ff'], 'line-width': 3, 'line-dasharray': [2, 1.5], 'line-opacity': 0.9 } });
      map.addSource('agent-link', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); map.addLayer({ id: 'agent-link', type: 'line', source: 'agent-link', paint: { 'line-color': ['match', ['get', 'type'], 'disagreement', '#ff8a5c', 'request', '#5cc8ff', 'evidence', '#7ee787', 'review', '#d2a8ff', '#f0b72f'], 'line-width': 2, 'line-dasharray': [1, 1.2], 'line-opacity': 0.9 } }); }
  }

  // ---------- Replay of a recorded mission ----------
  const SEG_TOOLS = new Set(['works.windows', 'works.telecom', 'trees.near-works', 'buildings.frontage', 'public-space.sidewalks', 'energy.benchmarks', 'scenario.evaluate', 'scenario.investigate']);
  const HUB_TOOLS = new Set(['knowledge.search', 'knowledge.retrieve', 'policy.check', 'evidence.check', 'resilience.weather-alerts', 'civic.legislation', 'grid.mix', 'air.quality']);
  function locate(mc, call, ctx) {
    if (HUB_TOOLS.has(call.tool)) return { c: S.hub, why: 'travail sur la bibliothèque, le registre ou une source sans localisation (poste virtuel)' };
    const ev = (call.evidence || []).map(id => mc.evidence.find(e => e.id === id)).filter(Boolean);
    for (const e of ev) for (const r of e.evidence || []) {
      const m = /^(sidewalks|permits|street-trees|building-permits|energy-benchmarks|tree-removals):(.+)$/.exec(r.ref || ''); if (!m) continue;
      const f = (S.data[m[1]] || ctx.data[m[1]]) && (S.data[m[1]] || ctx.data[m[1]]).features.find(x => x.properties.record_id === m[2]); if (!f || !f.geometry) continue;
      return { c: f.geometry.type === 'Point' ? f.geometry.coordinates : mid(f.geometry), why: `${m[1]} · ${m[2]} (enregistrement cité par ${e.id})` };
    }
    if (call.tool === 'graph.link') { const it = G.CORE_PLATFORM.state.store.items.find(i => i.id === mc.target.item); if (it && it.geo) return { c: it.geo.coordinates, why: `élément de veille ${it.id}` }; }
    if (mc.target.segment && ctx.segments.get(mc.target.segment) && (SEG_TOOLS.has(call.tool) || call.tool === 'sim.sidewalk-capacity')) return { c: mid(ctx.segments.get(mc.target.segment).geometry), why: `tronçon ${mc.target.segment}` };
    return { c: S.hub, why: 'calcul à l’échelle du corridor (poste virtuel)' };
  }
  // Schedule: recorded order kept (a step starts no earlier than any step recorded more than 50 ms before it; events
  // recorded together may play together); display start also waits for the agent's previous step; gaps are compressed.
  function buildReplay(mc, ctx) {
    const evs = [], idx = new Map(mc.toolCalls.map(c => [c.seq, c])); let cursor = 0, prevT = 0; const free = new Map(), posOf = new Map(), steps = [];
    const callsByAgent = new Map(); for (const c of mc.toolCalls) { if (!callsByAgent.has(c.agent)) callsByAgent.set(c.agent, []); callsByAgent.get(c.agent).push(c); }
    const used = new Map();
    for (const l of mc.log) {
      if (!l.agent || !['tool-call', 'model-call', 'report', 'route'].includes(l.kind)) continue;
      cursor += Math.max(180, Math.min(2200, (l.t - prevT) / 40)); prevT = l.t;
      const from = posOf.get(l.agent) || S.hub; let to = from, state = 'reasoning', why = '', hold = 1100, call = null;
      if (l.kind === 'tool-call') { const list = callsByAgent.get(l.agent) || [], k = used.get(l.agent) || 0; call = list[k]; used.set(l.agent, k + 1); const loc = call ? locate(mc, call, ctx) : { c: S.hub, why: '' }; to = loc.c; why = loc.why; state = 'investigating'; hold = 1500; }
      else if (l.kind === 'report') { to = S.hub; state = 'reporting'; hold = 1500; }
      else if (l.kind === 'route') { state = 'routing'; hold = 900; }
      const r = dist(from, to) > 5 ? route(from, to) : null, walk = r ? Math.max(800, Math.min(4000, r.length * 6)) : 0;
      const floor = steps.filter(x => x.t < l.t - 50).reduce((m, x) => Math.max(m, x.start), 0), start = Math.max(cursor, free.get(l.agent) || 0, floor);
      steps.push({ agent: l.agent, start, walkEnd: start + walk, end: start + walk + hold, path: r, from, to, state, why, text: l.text, t: l.t, kind: l.kind, call: call && call.tool });
      free.set(l.agent, start + walk + hold); posOf.set(l.agent, to);
    }
    // Collaboration links (recorded disputes) drawn at the time of the disputing agent's recorded report.
    // Typed collaboration links, each from a recorded record: disagreement (mc.disagreements), request and evidence
    // transfer (mc.requests fulfilled by another agent), review (review-phase report to the agents it checked).
    const rep = (agent, phase) => steps.find(x => x.kind === 'report' && x.agent === agent && (!phase || (x.text || '').startsWith(phase)));
    const links = [];
    for (const d of mc.disagreements || []) { const s = rep(d.between[1]); if (s) links.push({ type: 'disagreement', from: d.between[1], to: d.between[0], at: s.start, until: s.end + 1500, text: d.statement, id: d.id }); }
    for (const q of mc.requests || []) { if (!q.fulfilledBy || q.fulfilledBy === q.agent) continue; const s = rep(q.agent, q.phase); if (!s) continue;
      links.push({ type: 'request', from: q.agent, to: q.fulfilledBy, at: s.start, until: s.start + 1400, text: q.need, id: q.id });
      links.push({ type: 'evidence', from: q.fulfilledBy, to: q.agent, at: s.start + 1400, until: s.start + 2800, text: `réponse via ${q.tool || 'outil'} (${q.status})`, id: q.id }); }
    const reviewer = mc.board.filter(b => b.phase === 'review').map(b => b.agent)[0], rs = reviewer && rep(reviewer, 'review');
    if (rs) for (const a of [...new Set(mc.board.filter(b => b.phase !== 'review').map(b => b.agent))]) if (a !== reviewer) links.push({ type: 'review', from: reviewer, to: a, at: rs.start, until: rs.end + 1200, text: 'revue des énoncés (phase review enregistrée)', id: 'review' });
    const TL = { 'tool-call': 'source', route: 'specialist', report: 'report', 'model-call': 'model' };
    const timeline = mc.log.map(l => { const s = l.agent ? steps.find(x => x.t === l.t && x.agent === l.agent && x.kind === l.kind) : null;
      const type = l.kind === 'stage' ? (l.stage === 'received' ? 'start' : l.stage === 'gateway' ? 'decision' : null) : l.kind === 'mission' ? 'human' : TL[l.kind];
      return type ? { type, t: l.t, at: s ? s.start : null, agent: l.agent || null, text: l.text } : null; }).filter(Boolean);
    let lastAt = 0; for (const e of timeline) { if (e.at == null) e.at = lastAt; lastAt = Math.max(lastAt, e.at); }
    const total = Math.max(...steps.map(s => s.end), lastAt, 1000) + 1000;
    for (const e of timeline) if (e.type === 'human' || e.type === 'decision') e.at = Math.max(e.at, total - 1000);
    return { mc, steps, links, timeline, total, messages: messages(mc, steps), agents: [...new Set(steps.map(s => s.agent))] };
  }
  // Structured messages, derived only from recorded data.
  function messages(mc, steps) {
    const code = id => (S.reg.byId.get(id) || { code: id }).code, coord = `${code('core.san-francisco.manager')} (coordinateur de mission, routage déterministe)`, out = [];
    const atReport = (agent, phase) => { const s = steps.find(x => x.kind === 'report' && x.agent === agent && (x.text || '').startsWith(phase)); return s || steps.find(x => x.agent === agent) || { start: 0, t: 0 }; };
    for (const b of ['investigation', 'deliberation', 'revision', 'scenario', 'review']) for (const agent of [...new Set(mc.board.filter(x => x.phase === b).map(x => x.agent))]) {
      const acc = mc.board.filter(x => x.phase === b && x.agent === agent), rej = (mc.rejected || []).filter(x => x.phase === b && x.agent === agent), s = atReport(agent, b);
      out.push({ at: s.start, t: s.t, from: code(agent), to: coord, mission: mc.id, task: `Rapport (${b})`, evidence: [...new Set(acc.flatMap(x => x.cites))].slice(0, 8), result: `${acc.length} énoncé(s) validé(s), ${rej.length} rejeté(s)`, confidence: [...new Set(acc.map(x => x.confidence))].join(', ') || '—', decision: 'validation déterministe' });
    }
    for (const r of mc.responses || []) { const tgt = mc.board.find(x => x.id === r.to), s = atReport(r.agent, r.phase); out.push({ at: s.start + 200, t: s.t, from: code(r.agent), to: tgt ? code(tgt.agent) : r.to, mission: mc.id, task: `${r.stance === 'dispute' ? 'Désaccord' : r.stance === 'agree' ? 'Accord' : 'Précision'} sur ${r.to}`, evidence: r.cites, result: r.statement, confidence: '—', decision: r.stance === 'dispute' ? 'désaccord enregistré (non résolu sauf révision)' : 'accepté par le validateur' }); }
    for (const q of mc.specialistRequests || []) { const s = atReport(q.agent, 'investigation'); out.push({ at: s.start + 300, t: s.t, from: code(q.agent), to: coord, mission: mc.id, task: `Demande de spécialité « ${q.specialization} »`, evidence: [], result: q.status, confidence: '—', decision: q.status === 'added' ? 'spécialiste ajouté par le routage' : `non ajouté (${q.status})` }); }
    for (const q of mc.requests || []) { const s = atReport(q.agent, q.phase); out.push({ at: s.start + 400, t: s.t, from: code(q.agent), to: q.fulfilledBy ? code(q.fulfilledBy) : coord, mission: mc.id, task: `Demande de preuve : ${q.need}`, evidence: q.evidence || [], result: q.status, confidence: '—', decision: q.status === 'fulfilled' ? 'outil exécuté par l’agent propriétaire' : 'aucune source CORE : preuve manquante' }); }
    const last = Math.max(...steps.map(s => s.end), 0);
    if (mc.decision) out.push({ at: last + 300, t: (mc.log[mc.log.length - 1] || {}).t || 0, from: `${code('core.san-francisco.governance.gateway')} (CORE Command — passerelle)`, to: 'Revue humaine', mission: mc.id, task: 'Décision de la passerelle', evidence: [], result: mc.decision.state, confidence: '—', decision: 'aucune autorisation ; décision humaine requise' });
    return out.sort((a, b) => a.at - b.at);
  }
  function frame() {
    const rp = S.replay; if (!rp) return;
    const now = rp.playing ? rp.pos + (performance.now() - rp.t0) * rp.speed : rp.pos;
    const t = Math.min(now, rp.total); if (rp.playing && t >= rp.total) { rp.playing = false; rp.pos = rp.total; }
    const slot = new Map(rp.plan.agents.map((id, i) => [id, i]));
    for (const id of rp.plan.agents) {
      const cur = rp.plan.steps.filter(s => s.agent === id && s.start <= t).pop(), sl = slot.get(id);
      if (!cur) { M().drive(id, { pos: offset(S.hub, sl), state: 'idle', note: 'pas encore actif dans la relecture' }); continue; }
      if (t < cur.walkEnd && cur.path) M().drive(id, { pos: offset(along(cur.path.coords, (t - cur.start) / (cur.walkEnd - cur.start)), sl), state: 'walking', note: cur.path.approx ? 'relecture — trajet partiellement approximatif' : `relecture — trajet sur ${cur.path.network === 'osm' ? 'les trottoirs et passages OSM' : 'le réseau du corridor'}` });
      else if (t < cur.end) M().drive(id, { pos: offset(cur.to, sl), state: cur.state, note: `${cur.call || ''} ${cur.why || ''} · journal +${(cur.t / 1000).toFixed(1)} s`.trim() });
      else M().drive(id, { pos: offset(cur.to, sl), state: 'idle', note: 'en attente dans la relecture' });
    }
    const posOf = id => (M().state.agents.get(id) || {}).pos, act = rp.plan.links.filter(l => l.at <= t && t <= l.until);
    const lk = act.map(l => { const A = posOf(l.from), B = posOf(l.to); return A && B ? { type: 'Feature', geometry: { type: 'LineString', coordinates: [A, B] }, properties: { type: l.type } } : null; }).filter(Boolean);
    for (const l of act) if (l.type === 'disagreement') { const A = M().state.agents.get(l.from); if (A) { A.state = 'collaborating'; A.note = `${l.id} : ${l.text.slice(0, 80)}`; } }
    S.map.getSource('agent-link').setData({ type: 'FeatureCollection', features: lk });
    if (S.selected) routeFor(S.selected, t);
    theatreUpdate(t);
    rp.lastT = t;
    if (rp.playing) S.raf = requestAnimationFrame(frame);
  }
  function routeFor(id, t) {
    const rp = S.replay, steps = rp ? rp.plan.steps.filter(s => s.agent === id && s.path) : [], feats = [];
    for (const s of steps) feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: s.path.coords }, properties: { part: t >= s.walkEnd ? 'done' : 'todo' } });
    S.map.getSource('agent-route').setData({ type: 'FeatureCollection', features: feats });
  }
  async function startReplay(pred = FLAGSHIP) {
    const P = G.CORE_PLATFORM, rec = await P.loadRecorded(pred); if (!rec) return null; await ensure();
    if (G.CORE_ACTIVITY && G.CORE_ACTIVITY.state.playing) G.CORE_ACTIVITY.stop();
    if (S.replay) endReplayAgents(); await M().ensure();
    const plan = buildReplay(rec, S.ctx); plan.agents.forEach((id, i) => M().drive(id, { pos: offset(S.hub, i), state: 'idle', note: 'relecture' })); M().dim(plan.agents);
    S.replay = { plan, total: plan.total, pos: 0, t0: performance.now(), speed: 1, playing: !reduced() }; theatre(true);
    cancelAnimationFrame(S.raf); if (reduced()) { S.replay.pos = plan.total; frame(); } else S.raf = requestAnimationFrame(frame);
    return S.replay;
  }
  function play(on) { const rp = S.replay; if (!rp) return; if (on && !rp.playing) { if (rp.pos >= rp.total) rp.pos = 0; rp.t0 = performance.now(); rp.playing = true; S.raf = requestAnimationFrame(frame); } else if (!on && rp.playing) { rp.pos = Math.min(rp.total, rp.pos + (performance.now() - rp.t0) * rp.speed); rp.playing = false; frame(); } theatreUpdate(rp.pos); }
  function seek(ms) { const rp = S.replay; if (!rp) return; rp.pos = Math.max(0, Math.min(rp.total, ms)); rp.t0 = performance.now(); frame(); }
  function endReplayAgents() { for (const id of S.replay.plan.agents) M().release(id); M().dim(null); }
  function stopReplay() { cancelAnimationFrame(S.raf); if (S.replay) endReplayAgents(); S.replay = null; theatre(false); M().unfollow(false); if (S.map.getSource('agent-route')) { S.map.getSource('agent-route').setData({ type: 'FeatureCollection', features: [] }); S.map.getSource('agent-link').setData({ type: 'FeatureCollection', features: [] }); } }

  // ---------- Mission theatre (replay controls + structured messages) ----------
  function theatre(on) {
    let el = $('theatre'); if (!on) { if (el) el.hidden = true; document.body.classList.remove('theatre-on'); return; }
    if (!el) { el = document.createElement('section'); el.id = 'theatre'; el.className = 'panel theatre'; el.setAttribute('aria-label', 'Relecture de mission'); document.body.appendChild(el); }
    const rp = S.replay, mc = rp.plan.mc;
    el.hidden = false; document.body.classList.add('theatre-on');
    el.innerHTML = `<div class="th-banner"><b>RELECTURE</b> — exécution réelle enregistrée le ${esc(String(mc.recorded.at).slice(0, 16).replace('T', ' '))} UTC (${esc(mc.model.name)}, mode ${esc(mc.mode)}). Ordre réel des évènements, rythme compressé pour l’affichage. Les déplacements représentent les données utilisées par les outils, pas une inspection physique.</div>
      <div class="th-row"><button type="button" class="small" id="th-play">${rp.playing ? 'Pause' : 'Lecture'}</button><input type="range" id="th-seek" min="0" max="${Math.round(rp.total)}" value="0" aria-label="Position dans la relecture"><select id="th-speed" aria-label="Vitesse"><option value="0.5">×0,5</option><option value="1" selected>×1</option><option value="2">×2</option><option value="4">×4</option></select><span class="hint" id="th-clock"></span><button type="button" class="ghost small" id="th-close">Fermer</button></div>
      <div class="th-legend"><span class="lk disagreement">désaccord</span><span class="lk request">demande</span><span class="lk evidence">transfert de preuve</span><span class="lk review">revue</span> — chaque lien correspond à un enregistrement du journal</div>
      <div class="th-timeline" id="th-timeline" aria-label="Chronologie des évènements enregistrés">${rp.plan.timeline.map(e => `<i class="tl ${e.type}" style="left:${(100 * e.at / rp.total).toFixed(2)}%" title="${esc(TL_FR[e.type])} · journal +${(e.t / 1000).toFixed(1)} s${e.agent ? ` · ${esc((S.reg.byId.get(e.agent) || {}).code || '')}` : ''} — ${esc(String(e.text).slice(0, 90))}"></i>`).join('')}<b id="th-now"></b></div>
      <details id="th-msgs-box"><summary>Messages structurés (${rp.plan.messages.length}) — dérivés du journal</summary><ol class="th-msgs" id="th-msgs"></ol></details>`;
    $('th-play').onclick = () => play(!S.replay.playing); $('th-seek').oninput = e => seek(+e.target.value); $('th-speed').onchange = e => { const r2 = S.replay; r2.pos = Math.min(r2.total, r2.pos + (r2.playing ? (performance.now() - r2.t0) * r2.speed : 0)); r2.t0 = performance.now(); r2.speed = +e.target.value; }; $('th-close').onclick = stopReplay;
  }
  const TL_FR = { start: 'Mission démarrée', source: 'Source consultée (outil)', specialist: 'Spécialiste consulté', model: 'Interprétation du modèle', report: 'Rapport : énoncés acceptés/rejetés', decision: 'Décision proposée (passerelle)', human: 'Approbation humaine requise' };
  function theatreUpdate(t) {
    const rp = S.replay; if (!rp || !$('th-clock')) return;
    const now = $('th-now'); if (now) now.style.left = `${(100 * t / rp.total).toFixed(2)}%`;
    const recT = rp.plan.steps.filter(s => s.start <= t).reduce((m, s) => Math.max(m, s.t), 0);
    $('th-clock').textContent = `journal +${(recT / 1000).toFixed(0)} s / ${(rp.plan.mc.metrics.wallMs / 1000).toFixed(0)} s · vitesse ×${rp.speed}`;
    if (document.activeElement !== $('th-seek')) $('th-seek').value = Math.round(t);
    $('th-play').textContent = rp.playing ? 'Pause' : 'Lecture';
    const shown = rp.plan.messages.filter(m => m.at <= t), box = $('th-msgs');
    if (box && box.childElementCount !== shown.length) box.innerHTML = shown.slice(-40).map(m => `<li><span class="m-h">${esc(m.from)} → ${esc(m.to)} · ${esc(m.mission)} · journal +${(m.t / 1000).toFixed(1)} s</span><b>${esc(m.task)}</b><span>${esc(String(m.result).slice(0, 160))}</span><span class="hint">preuves ${esc(m.evidence.join(', ') || '—')} · confiance ${esc(m.confidence)} · ${esc(m.decision)}</span></li>`).join('');
  }

  // ---------- Selection, dossier, follow ----------
  function select(id) { if (S.replay) routeFor(id, S.replay.lastT || 0); M().select(id); }
  function follow(id) { return M().follow(id); }

  // ---------- Lifecycle ----------
  async function ensure() {
    if (S.ctx) return; const sv = G.CORE_SF_VIEW; await sv.loadData();
    S.ctx = G.CORE_COORD.buildContext({ manifest: sv.state.manifest, data: sv.state.data, verified: sv.state.verified }); S.data = sv.state.data;
    S.reg = G.CORE_ORG.index(G.CORE_PLATFORM.state.registry); S.net = buildNet(S.ctx);
    const all = [...S.net.nodes.values()], c = [all.reduce((n, p) => n + p[0], 0) / all.length, all.reduce((n, p) => n + p[1], 0) / all.length]; S.hub = S.net.nodes.get(nearestNode(c));
    if (G.CORE_POPULATION) { await M().ensure(); S.walknet = M().state.net; }
    hubLayer();
  }
  // On arrival in the city the whole registered population appears (CORE_MOTION); nothing runs by itself.
  async function arrive() { if (!G.CORE_PLATFORM || !G.CORE_PLATFORM.state.registry) return; S.arrived = true; await ensure(); if (G.CORE_POPULATION_UI) { G.CORE_POPULATION_UI.init(); G.CORE_POPULATION_UI.render(); } if (G.CORE_ACTIVITY && !S.activityStarted) { S.activityStarted = true; G.CORE_ACTIVITY.init(); G.CORE_ACTIVITY.start(); } }
  function showAll(on) { M().setFilter(on ? 'all' : 'executable'); }
  function init({ map }) {
    S.map = map;
    // Direct access (#app, skip, search): place idle participants the first time the city is in view.
    map.on('moveend', () => { if (!S.arrived && !S.replay && map.getZoom() >= 12 && Math.abs(map.getCenter().lng + 122.42) < 0.2 && Math.abs(map.getCenter().lat - 37.77) < 0.15) arrive().catch(() => {}); });
    document.addEventListener('visibilitychange', () => document.body.classList.toggle('tab-hidden', document.hidden));
  }
  Object.defineProperty(S, 'avatars', { get: () => (G.CORE_MOTION ? G.CORE_MOTION.state.agents : new Map()) });
  G.CORE_AGENTS_WORLD = { init, arrive, startReplay, stopReplay, play, seek, select, follow, showAll, buildNet, route, state: S, STATE_FR, _buildReplay: buildReplay };
})();
