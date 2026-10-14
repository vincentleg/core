// CORE — cities, cross-city investigation, decision analysis and discovery (Phase 10). Read-only view of published
// recordings: src/cities.js (configuration), <dataDir>/manifest.json (sources), data/civ (missions recorded by
// scripts/civ.mjs) and data/civ/discovery.json (scheduler, scripts/civd.mjs). Nothing here runs an agent or a model.
(function () {
  'use strict';
  const G = globalThis;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pill = (t, k = '') => `<span class="pill ${k}">${esc(t)}</span>`;
  const day = s => String(s || '—').slice(0, 10);
  const S = { manifests: {}, discovery: undefined, missions: new Map() };
  const P = () => G.CORE_PLATFORM;
  async function mission(e) { if (!S.missions.has(e.id)) S.missions.set(e.id, await P().getJSON(`data/civ/missions/${e.file}`).catch(() => null)); return S.missions.get(e.id); }
  async function load() {
    const C = G.CORE_CITIES; for (const c of C.operational()) if (!S.manifests[c.id]) S.manifests[c.id] = await P().getJSON(`${c.studyArea.dataDir}/manifest.json`).catch(() => null);
    if (S.discovery === undefined) S.discovery = await P().getJSON('data/civ/discovery.json').catch(() => null);
    const st = P().state; if (st.opsReady) await st.opsReady; return st.civIndex ? st.civIndex.missions : [];
  }
  const VERDICT = v => /^non comparable/.test(v) ? 'fail' : /réserves/.test(v) ? 'warn' : 'ok';
  function cityCards(ix) {
    const C = G.CORE_CITIES, reg = P().state.registry;
    return Object.values(C.CITIES).map(c => {
      if (c.status !== 'operational') return `<div class="item"><span class="t">${esc(c.name)} ${pill('navigation seulement')}</span><span class="m">${esc(c.unavailable.join(' ; '))}</span></div>`;
      const man = S.manifests[c.id], ag = reg.agents.filter(a => a.scope.city === c.id), ms = ix.filter(m => (m.cities || [m.city]).includes(c.id));
      const src = Object.entries(c.sources).map(([k, s]) => { const d = man && man.datasets.find(x => x.file.startsWith(k === 'crashes' ? 'crashes-agg' : k === 'works' ? 'permits' : k === 'neighborhoods' ? 'neighborhoods' : k)); return `<tr><td>${esc(s.title)}</td><td>${esc(s.nature || '—')}</td><td>${esc(day(d && d.retrieved_at))}</td></tr>`; }).join('');
      return `<div class="item"><span class="t">${esc(c.name)} ${pill('opérationnelle', 'ok')} <span class="hint">depuis ${esc(c.since)}</span></span>
        <span class="m">Zone d’étude : ${esc(c.studyArea.neighborhoods.join(', '))} · ${ag.length} profils d’agents propres à la ville · ${ms.length} mission(s) enregistrée(s) · licence : ${esc(c.portal.licence.split(':')[0])}</span>
        <details><summary>Sources intégrées (${Object.keys(c.sources).length}) et lacunes</summary><table class="tbl"><thead><tr><th>Jeu</th><th>Nature</th><th>Collecté</th></tr></thead><tbody>${src}</tbody></table>
        <p class="hint">Domaines : ${Object.entries(c.domains).map(([k, v]) => `${esc(k)} — ${esc(v)}`).join(' · ')}</p><p class="hint">Non intégré : ${esc(c.unavailable.join(' ; '))}. ${esc(c.jurisdiction)}</p></details></div>`;
    }).join('');
  }
  function worldCard(m) {
    if (!m) return '<p class="hint">Aucune enquête inter-villes enregistrée.</p>';
    const name = id => { const a = P().state.registry.agents.find(x => x.id === id); return a ? `<button type="button" class="linkish" data-agent-open="${esc(id)}">${esc(a.code)}</button>` : esc(id); };
    return `<p><b>${esc(m.question)}</b></p>
      <p class="m">${pill(m.state, m.state === 'HUMAN_REVIEW' ? 'warn' : 'info')} passerelles : ${esc(m.decision ? m.decision.state : '—')} · ${m.human ? `décision humaine : ${esc(m.human.decision)}` : 'aucune décision humaine enregistrée'} · ${m.subtasks.length} sous-tâches, ${m.messages.length} échanges, 0 appel de modèle</p>
      <p class="hint">Chaîne enregistrée : ${name('core.global.coordinator')} → direction mondiale ${name(m.owner)} → mémoire institutionnelle (${m.memoryReused.length} entrées vérifiées réutilisées) → directions mobilité ${m.cities.map(c => name(`core.${c}.mobility.lead`)).join(' et ')} → spécialistes ${m.subtasks.filter(s => s.city).map(s => name(s.agent)).join(', ')} → réviseur méthodologique ${name('core.global.research.methodology-reviewer')} → réviseurs adversariaux → revue humaine.</p>
      <ul class="list">${m.comparability.map(c => `<li class="item"><span class="t">${esc(c.metric)} ${pill(c.verdict, VERDICT(c.verdict))}</span><span class="hint">${esc(c.why)}</span></li>`).join('')}</ul>
      ${m.figures ? `<table class="tbl"><thead><tr><th>Zone</th><th>Réseau désigné</th><th>Avec blessé ou tué (5 ans)</th><th>Mortels</th><th>Par km et par an</th></tr></thead><tbody>${m.figures.map(f => `<tr><td>${esc(f.nhood)} (${esc(f.name)})</td><td>${f.km} km</td><td>${f.crashes}</td><td>${f.fatal}</td><td>${f.perKmYear}</td></tr>`).join('')}</tbody></table><p class="hint">Juxtaposition descriptive : chaque ligne suit la définition de sa ville ; le réviseur déclare les niveaux non comparables. Aucune ville n’est jugée plus ou moins sûre.</p>` : ''}
      <p class="hint"><b>Recommandation (hypothèse) :</b> ${esc(m.recommendation ? m.recommendation.text : '—')}</p>
      <div class="toolbar"><button type="button" class="small" data-replay="${esc(m.id)}">Relire sur la carte</button><button type="button" class="small ghost" data-dossier="${esc(m.id)}">Dossier ↓</button></div>`;
  }
  function decisionCard(m) {
    if (!m || !m.decisionAnalysis) return '<p class="hint">Aucune analyse de décision enregistrée.</p>';
    const d = m.decisionAnalysis, best = Object.entries(d.sensitivity.reduce((o, x) => ({ ...o, [x.best]: (o[x.best] || 0) + 1 }), {}));
    const asm = Object.values(m.results).flatMap(r => r.assumptions || []).filter((x, i, a) => a.indexOf(x) === i);
    return `<p><b>Problème :</b> ${esc(m.question)}</p>
      <p class="m">${pill(m.state, 'warn')} · ${m.human ? `décision humaine : ${esc(m.human.decision)}` : 'en attente de décision humaine'} · revue indépendante : ${m.rejected.length} constat(s) rejeté(s), recommandation ${m.review && m.review.recommendation && m.review.recommendation.ok ? 'conforme' : 'non conforme'}</p>
      <ul class="list">${d.options.map(o => `<li class="item"><span class="t"><b>${o.id}</b> — ${esc(o.label)}</span><span class="m">indice ${o.exposure} · ${o.coveredShare !== undefined ? `couvre ${Math.round(o.coveredShare * 100)} % de l’indice` : `effet ${Math.round(o.change * 100)} %`} · ${o.permitsAffected} autorisation(s) · ${o.orgsAffected} organisation(s)</span><span class="hint">${esc(o.note)}</span></li>`).join('')}</ul>
      <p class="hint"><b>Calcul :</b> indice = taux d’accidents avec blessé du tronçon (par km et par an, 5 ans) × jours de travaux autorisés dans l’horizon, sommé sur les tronçons. <b>Modélisé, exploratoire, non calibré</b> : il classe des options, il ne prédit aucun accident évité. Aucun coût n’est calculé.</p>
      <details><summary>Sensibilité : ${d.sensitivity.length} combinaisons — option la plus réductrice : ${best.map(([k, v]) => `${k} ×${v}`).join(', ')}</summary><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Top N</th><th>Horizon</th><th>Pondération</th><th>Indice I0</th><th>I2</th><th>I3</th><th>Meilleure</th></tr></thead><tbody>${d.sensitivity.map(x => `<tr><td>${x.topN}</td><td>${x.horizon} j</td><td>${x.weight === 'all' ? 'toutes gravités' : 'graves et mortels'}</td><td>${x.e0}</td><td>${Math.round(x.I2 * 100)} %</td><td>${Math.round(x.I3 * 100)} %</td><td>${x.best}</td></tr>`).join('')}</tbody></table></div></details>
      <p class="hint"><b>Qualité des preuves :</b> ${d.quality.map(q => `${esc(q.source)} ${pill(q.grade, q.grade === 'A' ? 'ok' : q.grade === 'B' ? 'info' : 'warn')} ${esc(q.why)}`).join(' · ')}</p>
      <details><summary>Hypothèses (${asm.length})</summary><ul>${asm.map(a => `<li>${esc(a)}</li>`).join('')}</ul></details>
      <p class="hint"><b>Prochaine étape proposée :</b> ${esc(m.recommendation ? m.recommendation.text : '—')}</p>
      <p class="hint"><b>Point de contrôle humain :</b> la passerelle ${esc(m.decision ? m.decision.state : '—')} ; elle n’autorise rien. Seul un humain (<code>human:&lt;nom&gt;</code>) peut approuver, rejeter ou demander des preuves, depuis le centre de contrôle local.</p>
      <div class="toolbar"><button type="button" class="small" data-replay="${esc(m.id)}">Relire sur la carte</button><button type="button" class="small ghost" data-dossier="${esc(m.id)}">Dossier ↓</button></div>`;
  }
  function discoveryCard(d) {
    if (!d) return '<p class="hint">Aucun rapport de découverte publié.</p>';
    return `<p class="hint">${esc(d.note)} Enregistré le ${esc(day(d.recorded_at))} par ${esc(d.by)}.</p>
      <table class="tbl"><thead><tr><th>Ville</th><th>Instantané publié</th><th>Instantané comparé</th><th>Nouveaux enregistrements</th><th>Fenêtres modifiées</th><th>Fins</th><th>Accidents mis à jour</th><th>Signaux</th></tr></thead><tbody>${d.diffs.map(x => `<tr><td>${esc(x.city)}</td><td>${esc(String(x.baseline).slice(0, 16))}</td><td>${esc(String(x.current).slice(0, 16))}</td><td>${x.totals.added}</td><td>${x.totals.windowChanged ?? '—'}</td><td>${x.totals.ended}</td><td>${x.totals.crashWindowChanged ? 'oui' : 'non'}</td><td>${x.signals}</td></tr>`).join('')}</tbody></table>
      ${d.signals.length ? `<ul class="list">${d.signals.slice(0, 12).map(s => `<li class="item"><span class="t">${esc(s.kind)} · ${esc(s.city)} · ${esc(s.nhood || '—')}</span><span class="m">${esc(s.street || s.segment || '')} · ${s.records.length} enregistrement(s) · priorité ${Number(s.priority).toFixed(1)} · ${esc(s.status)}</span></li>`).join('')}</ul>` : '<p class="hint">Aucun changement détecté entre les instantanés comparés : aucun signal (résultat réel, pas une absence de surveillance). Les fichiers collectés peuvent différer par l’ordre des lignes renvoyé par les API ; seul le contenu est comparé.</p>'}
      <p class="hint">File persistante : ${Object.entries(d.queue.byStatus).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')} — ${d.investigations.length} enquête(s) planifiée(s) ; ${d.followUps.length} suivi(s).</p>`;
  }
  async function render(el) {
    el.innerHTML = '<p class="hint">Chargement…</p>';
    const ix = await load(), world = ix.find(m => m.scope === 'world'), dec = ix.find(m => m.workflow === 'decision-safety-works');
    const [wm, dm] = await Promise.all([world ? mission(world) : null, dec ? mission(dec) : null]);
    if (P().state.sec !== 'cities') return;
    const C = G.CORE_CITIES, ops = C.operational();
    el.innerHTML = `<div class="kpis"><div class="kpi"><b>${ops.length}</b><span>villes opérationnelles</span></div><div class="kpi"><b>${Object.values(C.CITIES).length - ops.length}</b><span>destinations de navigation seulement</span></div>
        <div class="kpi"><b>${ix.length}</b><span>missions autonomes enregistrées</span></div><div class="kpi"><b>${ix.filter(m => m.scope === 'world').length}</b><span>enquête(s) inter-villes</span></div><div class="kpi"><b>${ix.filter(m => m.human).length}</b><span>décisions humaines enregistrées</span></div></div>
      <p class="hint">Aucune couverture planétaire n’est revendiquée : deux zones d’étude, des données publiques datées, des agents dont chaque action est enregistrée.</p>
      <h3>Villes</h3><div class="list">${cityCards(ix)}</div>
      <h3>Enquête inter-villes</h3>${worldCard(wm)}
      <h3>Aide à la décision — ${esc(dm ? dm.nhood : '')}</h3>${decisionCard(dm)}
      <h3>Découverte automatique (comparaison d’instantanés)</h3>${discoveryCard(S.discovery)}`;
    el.querySelectorAll('[data-agent-open]').forEach(b => b.onclick = () => P().openAgent ? P().openAgent(b.dataset.agentOpen) : null);
    el.querySelectorAll('[data-replay]').forEach(b => b.onclick = async () => { P().show('world'); await G.CORE_ACTIVITY.playOnly(b.dataset.replay); });
    el.querySelectorAll('[data-dossier]').forEach(b => b.onclick = async () => { await G.CORE_ACTIVITY.load(); const m = G.CORE_ACTIVITY.state.missions.find(x => x.id === b.dataset.dossier); if (m) G.CORE_ACTIVITY.dossier(m); });
  }
  G.CORE_CITIES_VIEW = { render, load, state: S };
})();
