// CORE — population control and civilisation status strip (Phase 8). Compact, map-first: one floating bar with
// the population filter (all / executable / recorded work / active / zone / team), the motion mode in force,
// the problems layer switch and truthful counts computed from loaded data.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function render() {
    const M = G.CORE_MOTION, P = G.CORE_PLATFORM.state, el = $('pop-bar'); if (!el || !M.state.ready) return;
    const POP = G.CORE_POPULATION, c = M.counts(), reg = P.registry, f = M.state.filter;
    const n = k => POP.filter(reg, a => M.state.agents.get(a.id).st, k).length;
    const leads = reg.agents.filter(a => a.id.endsWith('.lead') || a.scope.level === 'city' || a.scope.level === 'global');
    const AW = G.CORE_AGENTS_WORLD, L = M.state.live, sup = L && Date.now() - Date.parse(L.updated) < 120000, mode = c.live ? 'EXÉCUTION LOCALE RÉELLE' : sup && !L.stopped ? 'SUPERVISEUR LOCAL ACTIF' : sup && L.stopped ? 'ARRÊT D’URGENCE (LOCAL)' : AW && AW.state.replay ? 'RELECTURE ENREGISTRÉE' : 'ILLUSTRATIF';
    el.innerHTML = `<div class="pb-row"><b>Population</b>
      ${[['all', `Tous (${n('all')})`], ['executable', `Exécutables (${n('executable')})`], ['recorded', `Travail enregistré (${n('recorded')})`], ['active', `Actifs (${n('active')})`]].map(([k, l]) => `<button type="button" class="small ${f === k ? '' : 'ghost'}" data-pop="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('')}
      <select id="pop-zone" aria-label="Filtrer par domaine"><option value="">Domaine…</option>${POP.ZONES.map(z => `<option value="zone:${z.id}" ${f === `zone:${z.id}` ? 'selected' : ''}>${esc(z.name)}</option>`).join('')}</select>
      <select id="pop-team" aria-label="Filtrer par équipe hiérarchique"><option value="">Équipe…</option>${leads.map(a => `<option value="team:${esc(a.id)}" ${f === `team:${a.id}` ? 'selected' : ''}>${esc(a.code)} ${esc(a.role.replace('Direction — ', ''))}</option>`).join('')}</select>
      <label class="pb-prob"><input type="checkbox" id="pop-problems" ${G.CORE_PROBLEMS_VIEW && G.CORE_PROBLEMS_VIEW.state.shown ? 'checked' : ''}> Problèmes</label></div>
      <div class="pb-row hint"><span class="pb-mode" data-mode="${c.live ? 'live' : AW && AW.state.replay ? 'replay' : 'illustrative'}">${mode}</span>
      ${c.live ? `${c.live} agent(s) exécutent une tâche du superviseur local (déterministe).` : sup ? `Superviseur local : ${L.counts.assigned || 0} tâche(s) en file, ${(L.counts['awaiting-human'] || 0) + (L.counts['needs-evidence'] || 0)} analysée(s), chaîne d’audit ${L.chain && L.chain.ok ? 'intacte' : 'à vérifier'} · mis à jour ${String(L.updated).slice(11, 19)} UTC.` : AW && AW.state.replay ? 'Participants pilotés par le journal enregistré ; les autres sont atténués.' : `Déplacements de visualisation sur les trottoirs OSM, vitesse ×${M.SPEED} : aucun travail, aucune visite réelle.`}
      · affichés ${c.shown}/${c.total} · en cours ${(c.byStatus.executing || 0)} · en file ${(c.byStatus.queued || 0)}${M.state.capped ? ' · densité plafonnée (avatars détaillés limités)' : ''}
      <span class="pb-legend">${Object.entries(M.COLORS).map(([k, col]) => `<i style="--c:${col}"></i>${esc(POP.STATUS[k].split(' (')[0])}`).join(' ')}</span></div>`;
    el.querySelectorAll('[data-pop]').forEach(b => b.onclick = () => { M.setFilter(b.dataset.pop); render(); });
    $('pop-zone').onchange = e => { if (e.target.value) { M.setFilter(e.target.value); const z = M.state.zones.find(q => `zone:${q.id}` === e.target.value); if (z) M.state.map.easeTo({ center: z.anchor, zoom: 15.6, duration: 1200 }); render(); } };
    $('pop-team').onchange = e => { if (e.target.value) { M.setFilter(e.target.value); render(); } };
    $('pop-problems').onchange = e => G.CORE_PROBLEMS_VIEW.show(e.target.checked);
  }
  function init() {
    if ($('pop-bar')) return; const el = document.createElement('section'); el.id = 'pop-bar'; el.className = 'panel pop-bar'; el.setAttribute('aria-label', 'Population des agents'); document.body.appendChild(el);
    document.addEventListener('core:population', render); setInterval(() => { if (!document.hidden && $('pop-bar') && !$('pop-bar').matches(':focus-within')) render(); }, 5000);
  }
  G.CORE_POPULATION_UI = { init, render };
})();
