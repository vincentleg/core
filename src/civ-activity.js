// CORE — Civilisation Activity Layer (Phase 9). Shows ACTUAL recorded work: the autonomous missions recorded by
// scripts/civ.mjs (data/civ). Each recorded message is replayed in order: a delegated specialist walks from its post to
// the location of the evidence its tool used (validated pedestrian network), works, reports and walks back; leads,
// data verification, reviewers and the gateway act from their posts; every exchange draws a typed link and appears in
// the activity feed. Labelled RELECTURE (recorded) — never live on the public site. On the owner's machine, events of a
// running local mission (.core-local/civ-live.json) are shown with the label EN DIRECT (local).
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const M = () => G.CORE_MOTION, reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TYPE_FR = { 'memory-read': 'lecture de la mémoire institutionnelle', report: 'compte rendu', assign: 'affectation', delegate: 'délégation', request: 'demande', result: 'résultat', challenge: 'contestation', 'coverage-gap': 'lacune de couverture', 'review-request': 'demande de revue', review: 'revue', decision: 'décision proposée', 'human-decision': 'décision humaine', note: 'procédure apprise', error: 'échec' };
  const COLOR = { request: '#5cc8ff', delegate: '#5cc8ff', assign: '#9fe3ff', result: '#7ee787', challenge: '#ff8a5c', 'coverage-gap': '#f0b72f', 'review-request': '#d2a8ff', review: '#d2a8ff', decision: '#ff4d6d', error: '#ff4d6d', note: '#f0b72f' };
  const S = { index: null, missions: [], playing: false, speed: 1, i: 0, run: 0, feed: [], current: null, liveSeen: 0 };
  const wait = ms => new Promise(r => setTimeout(r, reduced() ? 0 : ms / S.speed));
  async function load() {
    if (S.index) return S.index;
    try { S.index = await (await fetch('data/civ/index.json', { cache: 'no-cache' })).json(); } catch (_) { S.index = { missions: [] }; }
    S.missions = (await Promise.all(S.index.missions.map(m => fetch(`data/civ/missions/${m.file || m.id.replace(/[:@]/g, '-') + '.json'}`).then(r => r.ok ? r.json() : null).catch(() => null)))).filter(Boolean);
    return S.index;
  }
  function layer() {
    const map = M().state.map; if (map.getSource('civ-links')) return;
    map.addSource('civ-links', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'civ-links', type: 'line', source: 'civ-links', paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [1, 1.2], 'line-opacity': 0.9 } });
    // Phase 10: while a recorded cross-city mission replays, one labelled arc joins the participating cities.
    map.addSource('civ-arc', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'civ-arc', type: 'line', source: 'civ-arc', paint: { 'line-color': '#f0b72f', 'line-width': 2.5, 'line-opacity': 0.85, 'line-dasharray': [2, 1] } });
    map.addLayer({ id: 'civ-arc-label', type: 'symbol', source: 'civ-arc', layout: { 'symbol-placement': 'line-center', 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, -0.9] }, paint: { 'text-color': '#ffd38a', 'text-halo-color': '#06121c', 'text-halo-width': 1.5 } });
  }
  const links = [];
  function link(from, to, type) {
    const A = M().state.agents.get(from), B = M().state.agents.get(to); if (!A || !B) return;
    const l = { from, to, color: COLOR[type] || '#9fe3ff', until: performance.now() + 1800 / S.speed }; links.push(l);
  }
  function drawLinks() {
    const now = performance.now(); for (let i = links.length - 1; i >= 0; i--) if (links[i].until < now) links.splice(i, 1);
    const src = M().state.map && M().state.map.getSource('civ-links'); if (!src) return;
    if (!links.length && S.linksEmpty) { if (S.playing) requestAnimationFrame(drawLinks); return; } S.linksEmpty = !links.length; // no redraw when nothing changes
    src.setData({ type: 'FeatureCollection', features: links.map(l => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: [M().state.agents.get(l.from).pos, M().state.agents.get(l.to).pos] }, properties: { color: l.color } })) });
    if (S.playing || links.length) requestAnimationFrame(drawLinks);
  }
  const codeOf = id => { const A = M().state.agents.get(id); return A ? A.agent.code : id; };
  function feed(m, msg, label) {
    S.feed.unshift({ label, mission: m.title + ' · ' + m.nhood, type: msg.type, from: codeOf(msg.from), to: msg.to === 'human' ? 'revue humaine' : msg.to === 'memory' ? 'mémoire institutionnelle' : codeOf(msg.to), purpose: msg.purpose, outcome: msg.outcome, at: msg.at });
    S.feed = S.feed.slice(0, 40); render();
  }
  function setState(id, mode, state, note) { const A = M().state.agents.get(id); if (!A || A.path) return; A.mode = mode; A.state = state; A.note = note; A.visible = true; M().state.dirty = true; }
  async function arrived(id, max = 25000) { const t0 = performance.now(); while (M().state.agents.get(id).path && performance.now() - t0 < max / S.speed) await new Promise(r => setTimeout(r, 120)); }
  // Replay one recorded mission, message by message, in recorded order.
  async function playMission(m, run) {
    S.current = m; const parts = new Set(m.messages.flatMap(x => [x.from, x.to]).filter(id => M().state.agents.has(id)));
    arc(m.cities && m.cities.length > 1 ? m : null);
    // Phase 10: when the viewer is inside a city and the mission belongs to another one, the camera follows the mission.
    const map = M().state.map, C = G.CORE_CITIES, city = m.city || (m.cities && m.cities.length === 1 ? m.cities[0] : null);
    if (S.follow !== false && C && city && map && map.getZoom() >= 11) { const cfg = C.get(city), c = map.getCenter(); if (cfg && Math.hypot(c.lng - cfg.view.center[0], c.lat - cfg.view.center[1]) > 0.3) map.easeTo({ ...cfg.view, duration: reduced() ? 0 : 2500 }); }
    M().dim([...parts]); render();
    for (const x of m.messages) {
      if (!S.playing || run !== S.run) return;
      feed(m, x, 'RELECTURE'); if (x.to !== 'human' && x.to !== 'memory' && x.from !== x.to) link(x.from, x.to, x.type);
      const st = m.subtasks.find(s => x.purpose.includes(s.id + ' ') || x.purpose.includes(s.id + ' (') || x.purpose.endsWith(s.id));
      if (x.type === 'delegate' && st && st.agent === x.to) {
        if (st.site && st.state === 'succeeded') M().go(x.to, st.site.coord, { durationMs: 6000 / S.speed, purpose: `vers ${st.site.kind} : ${st.site.label} (${st.tool}, relecture)`, onArrive: A => { A.mode = 'work'; A.state = 'investigating'; A.note = `${st.tool} — ${st.site.label} (relecture)`; } });
        else setState(x.to, 'coordinate', 'investigating', `${st.tool} — ${st.site ? '' : 'source sans localisation, '}travail au poste (relecture)`);
      } else if (x.type === 'result') { await arrived(x.from); setState(x.from, 'work', 'reporting', `résultat : ${x.outcome} (relecture)`); }
      else if (x.type === 'error') setState(x.from, 'coordinate', 'idle', `échec enregistré : ${x.outcome} (relecture)`);
      else if (x.type === 'note') setState(x.from, 'coordinate', 'reasoning', 'procédure apprise appliquée (relecture)');
      else if (['request', 'assign', 'review-request', 'challenge', 'coverage-gap'].includes(x.type)) setState(x.from, 'coordinate', x.type === 'challenge' ? 'collaborating' : 'routing', `${TYPE_FR[x.type]} (relecture)`);
      else if (x.type === 'review') setState(x.from, 'coordinate', 'reasoning', 'revue adversariale (relecture)');
      else if (x.type === 'memory-read') setState(x.from, 'coordinate', 'reasoning', `mémoire institutionnelle consultée : ${x.outcome} (relecture)`);
      else if (x.type === 'report') setState(x.from, 'coordinate', 'reporting', 'compte rendu à la direction (relecture)');
      else if (x.type === 'decision') setState(x.from, 'coordinate', 'reporting', 'décision proposée à la revue humaine (relecture)');
      await wait(900);
    }
    await wait(1500);
    for (const id of parts) { const A = M().state.agents.get(id); if (A && A.mode !== 'post') M().toPost(id, 'retour au poste après la mission (relecture)', 5000 / S.speed); }
    await wait(2500); M().dim(null); arc(null);
  }
  // Great-circle arc between the participating cities (display only), with the recorded mission's label.
  function arc(m) {
    const src = M().state.map && M().state.map.getSource('civ-arc'); if (!src) return;
    if (!m || !G.CORE_CITIES) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
    const [a, b] = m.cities.map(c => G.CORE_CITIES.get(c).center), R = Math.PI / 180, v = p => [Math.cos(p[1] * R) * Math.cos(p[0] * R), Math.cos(p[1] * R) * Math.sin(p[0] * R), Math.sin(p[1] * R)];
    const A = v(a), B = v(b), d = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), pts = [];
    for (let k = 0; k <= 64; k++) { const t = k / 64, sa = Math.sin((1 - t) * d) / Math.sin(d), sb = Math.sin(t * d) / Math.sin(d), x = sa * A[0] + sb * B[0], y = sa * A[1] + sb * B[1], z = sa * A[2] + sb * B[2]; pts.push([Math.atan2(y, x) / R, Math.atan2(z, Math.hypot(x, y)) / R]); }
    src.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: { label: `${m.cities.map(c => G.CORE_CITIES.get(c).name).join(' ↔ ')} — collaboration enregistrée (relecture)` } }] });
  }
  async function start() {
    await load(); await M().ensure(); layer(); if (!S.missions.length) { render(); return false; }
    S.playing = true; const run = ++S.run; requestAnimationFrame(drawLinks); render();
    while (S.playing && run === S.run) { const m = S.missions[S.i % S.missions.length]; S.i++; await playMission(m, run); }
    return true;
  }
  function stop() { S.playing = false; S.run++; S.current = null; arc(null); if (M().state.ready) { M().dim(null); for (const A of M().state.agents.values()) if (A.mode !== 'post' && A.mode !== 'replay' && A.mode !== 'live') M().toPost(A.agent.id, 'retour au poste (relecture arrêtée)'); } render(); }
  // Replay a single recorded mission (guided demo), then stop.
  async function playOnly(id) {
    await load(); await M().ensure(); layer(); const m = S.missions.find(x => x.id === id); if (!m) return false;
    S.playing = false; const run = ++S.run; S.playing = true; S.feed = []; requestAnimationFrame(drawLinks); render();
    await playMission(m, run); if (run === S.run) { S.playing = false; render(); } return true;
  }
  // Downloadable evidence dossier (Markdown) built only from the recorded mission.
  function dossier(m) {
    const code = id => codeOf(id), L = [];
    L.push(`# Dossier de preuves — ${m.title} — ${m.nhood}`, '', `Mission \`${m.id}\` · enregistrée le ${m.recorded && m.recorded.at} par ${m.recorded && m.recorded.by} · instantané ${m.recorded && m.recorded.snapshot}`, '',
      `**Statut :** ${m.state} — passerelle : ${m.decision ? m.decision.state : '—'} — ${m.human ? `décision humaine : ${m.human.decision} (${m.human.reviewer}, ${m.human.at})` : 'aucune décision humaine enregistrée'}. CORE n’autorise ni n’exécute aucune action.`, '',
      `## Question`, m.question, '', `## Organisation`, `Priorité : ${m.priority ? m.priority.basis : '—'} · responsable : ${code(m.owner)} (${m.owner})`, '',
      '| Sous-tâche | Agent | Outil | État | Note |', '| --- | --- | --- | --- | --- |', ...m.subtasks.map(s2 => `| ${s2.id} | ${s2.code} | ${s2.tool} | ${s2.state} | ${(s2.error || s2.note || `${s2.findings} constat(s)`).replace(/\|/g, '/')} |`), '',
      `## Constats acceptés (observés / dérivés / modélisés — jamais « vérifiés sur le terrain »)`, ...m.findings.map(f => `- [${f.epistemic}] ${f.claim} — preuves : ${(f.evidence || []).map(e => e.ref).slice(0, 8).join(', ')}`), '',
      `## Constats rejetés`, ...(m.rejected.length ? m.rejected.map(r => `- ${r.claim} — ${r.reason}`) : ['- aucun']), '',
      `## Réserves (vérification des données)`, ...m.challenges.map(c => `- [${c.level}] ${c.text}`), '',
      `## Hypothèses de calcul`, ...Object.values(m.results).flatMap(r => r.assumptions || []).map(a => `- ${a}`), '',
      ...(m.decisionAnalysis ? ['## Aide à la décision (modélisé, exploratoire, non calibré)', '| Option | Description | Indice | Variation | Autorisations concernées |', '| --- | --- | --- | --- | --- |', ...m.decisionAnalysis.options.map(o => `| ${o.id} | ${o.label} | ${o.exposure} | ${o.coveredShare !== undefined ? `part couverte ${Math.round(o.coveredShare * 100)} %` : `${Math.round(o.change * 100)} %`} | ${o.permitsAffected} |`), '', `Sensibilité : ${m.decisionAnalysis.sensitivity.length} combinaisons (top N, horizon, pondération) ; option la plus réductrice par combinaison : ${Object.entries(m.decisionAnalysis.sensitivity.reduce((o, x) => ({ ...o, [x.best]: (o[x.best] || 0) + 1 }), {})).map(([k, v]) => `${k} ×${v}`).join(', ')}.`, '', 'Qualité des preuves : ' + m.decisionAnalysis.quality.map(q => `${q.source} ${q.grade} (${q.why})`).join(' ; '), ''] : []),
      ...(m.comparability && m.comparability.length ? ['## Comparabilité entre villes (réviseur méthodologique)', '| Indicateur | Verdict | Raison |', '| --- | --- | --- |', ...m.comparability.map(c => `| ${c.metric} | ${c.verdict} | ${c.why.replace(/\|/g, '/')} |`), ''] : []),
      ...(m.memoryReused && m.memoryReused.length ? ['## Mémoire institutionnelle réutilisée', ...m.memoryReused.map(e => `- ${e.id} [${e.status}] ${e.statement}`), ''] : []),
      `## Recommandation (${m.recommendation ? m.recommendation.kind : '—'})`, m.recommendation ? m.recommendation.text : 'Aucune.', '',
      `## Interprétation assistée par modèle (local, enregistrée, validée)`, ...(m.model.calls ? [...m.model.accepted.map(a => `- accepté : ${a.statement}`), ...m.model.rejected.map(r => `- rejeté (${r.reason}) : ${r.statement}`)] : ['- aucune']), '',
      `## Échanges enregistrés (${m.messages.length})`, ...m.messages.map(x => `- ${x.at} · ${x.type} · ${code(x.from)} → ${x.to === 'human' ? 'revue humaine' : code(x.to)} — ${x.purpose}${x.outcome ? ` (${x.outcome})` : ''}`), '',
      '## Sources', ...((m.cities || [m.city || 'san-francisco']).filter(c => c !== 'san-francisco').map(c => `Zone d’étude ${c === 'new-york' ? 'New York' : c} : données NYC Open Data (loi NYC Open Data ; attribution : source, date de collecte, modifications CORE) et OpenStreetMap (ODbL) ; voir data/nyc/manifest.json (URL, dates, SHA-256).`)), ...(((m.cities || [m.city || 'san-francisco']).includes('san-francisco') && G.CORE_PLATFORM.state.civIndex && G.CORE_PLATFORM.state.civIndex.study_area) ? [`Zone d’étude : ${G.CORE_PLATFORM.state.civIndex.study_area.neighborhoods.join(', ')} — données DataSF (ODC-PDDL) et OpenStreetMap (ODbL) ; voir data/sf9/manifest.json (URL, dates, SHA-256).`] : []));
    const blob = new Blob([L.join('\n') + '\n'], { type: 'text/markdown' }), a2 = document.createElement('a');
    a2.href = URL.createObjectURL(blob); a2.download = `CORE-dossier-${m.id.replace(/[^a-z0-9]+/gi, '-')}.md`; document.body.appendChild(a2); a2.click(); setTimeout(() => { URL.revokeObjectURL(a2.href); a2.remove(); }, 1000);
    return L.length;
  }
  // Live events on the owner's machine (local runtime), never fetched on the public site.
  async function pollLive() {
    if (!G.CORE_PLATFORM.state.local) return;
    try { const r = await fetch('.core-local/civ-live.json', { cache: 'no-store' }); if (r.ok) { const L = await r.json(); const fresh = L.events.filter(e => e.kind === 'message' && Date.parse(e.at) > S.liveSeen);
      for (const e of fresh) { S.liveSeen = Math.max(S.liveSeen, Date.parse(e.at)); feed({ title: e.mission.replace(/@.*$/, '').split(':').slice(1, -1).join(' · '), nhood: e.mission.replace(/@.*$/, '').split(':').pop() }, e.data, 'EN DIRECT (local)'); if (e.data.to !== 'human') link(e.data.from, e.data.to, e.data.type); }
      if (fresh.length) requestAnimationFrame(drawLinks); } } catch (_) { /* no local runtime */ }
    setTimeout(pollLive, 2000);
  }
  function render() {
    let el = $('activity'); if (!el) { el = document.createElement('section'); el.id = 'activity'; el.className = 'panel activity'; el.setAttribute('aria-label', 'Activité de la civilisation'); document.body.appendChild(el); }
    const m = S.current;
    el.innerHTML = `<header><b>Activité</b> <span class="act-badge ${S.playing ? 'rec' : 'idle'}">${S.playing ? 'RELECTURE' : 'ARRÊTÉE'}</span> <span class="hint">${S.missions.length} mission(s) autonome(s) enregistrée(s)</span>
      <span style="flex:1"></span><button type="button" class="small ghost" id="act-toggle">${S.playing ? 'Arrêter' : 'Relire l’activité'}</button><button type="button" class="small ghost" id="act-speed">×${S.speed}</button><button type="button" class="small ghost" id="act-min" aria-label="Réduire">–</button></header>
      ${m ? `<p class="hint act-now"><button type="button" class="linkish" id="act-dossier">Dossier ↓</button> ${esc(m.title)} — ${esc(m.nhood)} · responsable <button type="button" class="linkish" data-agent-open="${esc(m.owner)}">${esc(codeOf(m.owner))}</button> · enregistrée le ${esc(String(m.recorded && m.recorded.at || '').slice(0, 16).replace('T', ' '))} UTC · ${esc(m.decision ? m.decision.state : '')}${m.human ? ` · décision humaine : ${esc(m.human.decision)}` : ' · aucune décision humaine enregistrée'}</p>` : ''}
      <ol class="act-feed">${S.feed.slice(0, 12).map(f => `<li class="t-${esc(f.type)}"><span class="act-badge ${f.label === 'RELECTURE' ? 'rec' : 'live'}">${esc(f.label)}</span> <b>${esc(TYPE_FR[f.type] || f.type)}</b> ${esc(f.from)} → ${esc(f.to)} — ${esc(f.purpose)}${f.outcome ? ` <span class="hint">(${esc(String(f.outcome).slice(0, 90))})</span>` : ''}</li>`).join('')}</ol>`;
    $('act-toggle').onclick = () => S.playing ? stop() : start(); $('act-speed').onclick = () => { S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 4 : 1; render(); };
    $('act-min').onclick = () => el.classList.toggle('min');
    el.querySelectorAll('[data-agent-open]').forEach(b => b.onclick = () => M().select(b.dataset.agentOpen));
    const dz = $('act-dossier'); if (dz && m) dz.onclick = () => dossier(m);
  }
  // Only events newer than this page count as live: a stale local file is never presented as current activity.
  function init() { S.liveSeen = Date.now(); load().then(render); pollLive(); }
  G.CORE_ACTIVITY = { init, start, stop, load, playOnly, dossier, state: S, TYPE_FR };
})();
