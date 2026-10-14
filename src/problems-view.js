// CORE — problems on the map (Phase 8). Each registered problem with a corridor segment is drawn at that segment
// (points spread along the segment so several problems stay clickable). Clicking a problem opens its card:
// status, severity rule, evidence, investigation (recorded local operation), interventions with assumptions,
// related problems and the assigned agents — each agent opens its own profile.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pill = (t, k = '') => `<span class="pill ${k}">${esc(t)}</span>`;
  const fmt = iso => (iso ? `${String(iso).slice(0, 16).replace('T', ' ')} UTC` : '—');
  const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
  const ST = { observed: ['observé', 'ok', '#7ee787'], 'potential-risk': ['risque potentiel', 'warn', '#f0b72f'], hypothesis: ['hypothèse', 'info', '#d2a8ff'], simulated: ['simulé', 'info', '#79c0ff'] };
  const S = { map: null, R: null, shown: false };
  async function load() { if (S.R) return S.R; S.R = (G.CORE_CIV && G.CORE_CIV.state.problems) || await G.CORE_PLATFORM.getJSON('data/problems/registry.json'); if (G.CORE_CIV) G.CORE_CIV.state.problems = S.R; return S.R; }
  const along = (c, f) => { const i = Math.min(c.length - 2, Math.floor(f * (c.length - 1))), t = f * (c.length - 1) - i; return [c[i][0] + (c[i + 1][0] - c[i][0]) * t, c[i][1] + (c[i + 1][1] - c[i][1]) * t]; };
  function features(R) {
    const sv = G.CORE_SF_VIEW.state; if (!sv.data) return [];
    const bySeg = new Map(); for (const p of R.problems.filter(x => x.segment)) { if (!bySeg.has(p.segment)) bySeg.set(p.segment, []); bySeg.get(p.segment).push(p); }
    const out = [];
    for (const [seg, ps] of bySeg) { const f = sv.data.corridor.features.find(x => String(x.properties.cnn) === seg); if (!f) continue; const c = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates.flat() : f.geometry.coordinates;
      ps.forEach((p, i) => out.push({ type: 'Feature', geometry: { type: 'Point', coordinates: along(c, (i + 1) / (ps.length + 1)) }, properties: { id: p.id, status: p.status, color: ST[p.status][2] } })); }
    return out;
  }
  async function show(on = true) {
    const map = S.map, R = await load(); S.shown = on;
    if (!map.getSource('problems')) {
      map.addSource('problems', { type: 'geojson', data: { type: 'FeatureCollection', features: features(R) } });
      map.addLayer({ id: 'problems-pt', type: 'circle', source: 'problems', minzoom: 14, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 4, 17, 8], 'circle-color': ['get', 'color'], 'circle-opacity': 0.85, 'circle-stroke-color': '#02050b', 'circle-stroke-width': 1.2 } });
      map.on('click', 'problems-pt', e => { const f = e.features && e.features[0]; if (f) open(f.properties.id); });
      map.on('mouseenter', 'problems-pt', () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', 'problems-pt', () => { map.getCanvas().style.cursor = ''; });
    } else map.getSource('problems').setData({ type: 'FeatureCollection', features: features(R) });
    map.setLayoutProperty('problems-pt', 'visibility', on ? 'visible' : 'none');
    return R.problems.length;
  }
  async function open(id) {
    const R = await load(), p = R.problems.find(x => x.id === id); if (!p) return;
    const reg = G.CORE_PLATFORM.state.registry;
    let el = $('problem-card'); if (!el) { el = document.createElement('aside'); el.id = 'problem-card'; el.className = 'panel agent-card problem-card'; el.setAttribute('aria-label', 'Problème'); document.body.appendChild(el); }
    if (G.CORE_AGENT_PROFILE) G.CORE_AGENT_PROFILE.close();
    el.hidden = false; el.dataset.problem = id; document.body.classList.add('card-open');
    const inv = p.investigation, ag = (p.assignedAgents || []).map(x => reg.agents.find(a => a.id === x)).filter(Boolean);
    el.innerHTML = `<header><div><code class="mid">${esc(p.id)}</code><h3>${esc(p.title)}</h3></div><button type="button" class="ghost small" id="pb-close" aria-label="Fermer">✕</button></header><div class="pc-body">
      <div class="pc-pills">${pill(ST[p.status][0], ST[p.status][1])} ${pill(`domaine ${p.domain}`)} ${pill(`sévérité ${p.severity.level}`)}</div>
      <p>${esc(p.statement)}</p><p class="hint">${esc(p.place || '')} · ${esc(p.caveat)}</p>
      <table class="tbl"><tbody><tr><th>Méthode de sévérité</th><td>${esc(p.severity.basis)}${p.severity.method ? ` — ${esc(p.severity.method)}` : ''}</td></tr>
        <tr><th>Observé (collecte)</th><td>${fmt(p.observedAt)}</td></tr><tr><th>Dernière vérification</th><td>${fmt(p.lastVerified)} (sommes de contrôle de l’instantané)</td></tr>
        <tr><th>Confiance</th><td>${esc(p.confidence)}</td></tr><tr><th>Investigation</th><td>${esc(inv.label)}${inv.task ? ` · ${esc(inv.task)} · mission ${esc(inv.mission)} (empreinte ${esc(inv.fingerprint)}) · ${esc(inv.decision)} · ${fmt(inv.at)}` : ''}</td></tr>
        <tr><th>Décision humaine</th><td>${esc(p.humanDecision)}</td></tr></tbody></table>
      <h4>Agents assignés (${ag.length})</h4>${ag.length ? `<ul class="plain">${ag.map(a => `<li><button type="button" class="linkish" data-open-agent="${esc(a.id)}">${esc(a.code)}</button> <span class="hint">${esc(a.role)}</span></li>`).join('')}</ul>` : '<p class="hint">Aucun agent assigné.</p>'}
      <h4>Preuves</h4>${p.evidence.length ? `<ul class="plain">${p.evidence.slice(0, 10).map(e => `<li><a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener">${esc(e.ref)}</a></li>`).join('')}</ul>${p.evidence.length > 10 ? `<p class="hint">+${p.evidence.length - 10}</p>` : ''}` : '<p class="hint">Aucune preuve : question ouverte.</p>'}
      <h4>Interventions proposées</h4>${p.interventions.length ? `<ul class="plain">${p.interventions.map(i => `<li>${esc(i.label)} ${pill(i.status, 'warn')}</li>`).join('')}</ul><p class="hint">Hypothèses et limites : voir la simulation et le laboratoire de coordination (onglets Missions → Simulations). Aucune intervention n’est vérifiée.</p>` : '<p class="hint">Aucune intervention proposée.</p>'}
      <h4>Problèmes liés (${p.related.length})</h4>${p.related.length ? `<ul class="plain">${p.related.map(r => `<li><button type="button" class="linkish" data-open-problem="${esc(r)}">${esc(r)}</button></li>`).join('')}</ul>` : '<p class="hint">Aucun.</p>'}
      ${p.segment ? '<p><button type="button" class="small ghost" id="pb-fly">Centrer la carte</button></p>' : ''}</div>`;
    el.querySelectorAll('[data-open-agent]').forEach(b => b.onclick = () => { el.hidden = true; G.CORE_MOTION ? G.CORE_MOTION.select(b.dataset.openAgent) : G.CORE_AGENT_PROFILE.open(b.dataset.openAgent); });
    el.querySelectorAll('[data-open-problem]').forEach(b => b.onclick = () => open(b.dataset.openProblem));
    $('pb-close').onclick = () => { el.hidden = true; document.body.classList.remove('card-open'); };
    const fly = $('pb-fly'); if (fly) fly.onclick = () => { const f = (S.map.getSource('problems') && features(R).find(x => x.properties.id === id)); if (f) S.map.easeTo({ center: f.geometry.coordinates, zoom: 17, pitch: 55, duration: 1200 }); };
  }
  function init({ map }) { S.map = map; }
  G.CORE_PROBLEMS_VIEW = { init, show, open, load, state: S, ST };
})();
