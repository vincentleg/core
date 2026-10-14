// CORE — Civilisation views (Phase 7): World Problems Registry, activity dashboard with the bounded scheduler,
// and data health (snapshot, feeds, GitHub Actions refresh runs). Counts are computed from loaded data; a zero is
// shown as zero. Nothing here invents a run, a measurement or an agent action.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = iso => (iso ? `${String(iso).slice(0, 16).replace('T', ' ')} UTC` : '—');
  const pill = (t, k = '') => `<span class="pill ${k}">${esc(t)}</span>`;
  const safeUrl = u => (/^https:\/\//.test(String(u || '')) ? u : '#');
  const ST = { observed: ['observé', 'ok'], 'potential-risk': ['risque potentiel', 'warn'], hypothesis: ['hypothèse', 'info'], simulated: ['simulé', 'info'] };
  const C = { problems: null, filter: 'all', sched: null, runs: null };
  const getJSON = async u => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); };

  // ---------- World Problems Registry ----------
  async function renderProblems(el) {
    try { C.problems = C.problems || await getJSON('data/problems/registry.json'); } catch (e) { el.innerHTML = `<p class="hint">Registre des problèmes indisponible (${esc(e.message)}).</p>`; return; }
    if (G.CORE_PLATFORM.state.sec !== 'problems') return; // left during the first load: do not overwrite another view
    const R = C.problems, list = R.problems.filter(p => C.filter === 'all' || p.status === C.filter);
    el.innerHTML = `<p class="hint">Problèmes dérivés <b>uniquement</b> de l’instantané vérifié du ${fmt(R.snapshot)} et des missions enregistrées (<code>scripts/problems.mjs</code>, empreinte ${esc(R.fingerprint)}). Chaque entrée dit quel type de connaissance elle est ; aucune mesure n’est inventée.</p>
      <div class="kpis">${Object.entries(ST).map(([k, [l]]) => `<div class="kpi"><b>${R.counts[k] || 0}</b><span>${esc(l)}</span></div>`).join('')}<div class="kpi"><b>${R.gaps.length}</b><span>domaines sans preuve intégrée</span></div></div>
      <details class="explain"><summary>Que signifient ces statuts ?</summary><ul>${Object.entries(R.statuses).map(([k, v]) => `<li>${pill(ST[k][0], ST[k][1])} ${esc(v)}</li>`).join('')}</ul></details>
      <div class="toolbar" role="group" aria-label="Filtrer par statut">${[['all', `Tous (${R.problems.length})`], ...Object.entries(ST).map(([k, [l]]) => [k, `${l} (${R.counts[k] || 0})`])].map(([k, l]) => `<button type="button" class="small ${C.filter === k ? '' : 'ghost'}" data-pfilter="${k}" aria-pressed="${C.filter === k}">${esc(l)}</button>`).join('')}</div>
      <ul class="list problems">${list.slice(0, 80).map(p => `<li class="item"><span class="t">${pill(ST[p.status][0], ST[p.status][1])} ${esc(p.title)}</span>
        <span class="m">${esc(p.place || '—')} · domaine ${esc(p.domain)}${p.raisedBy ? ` · soulevé par ${esc(p.raisedBy.split('.').pop())}` : ''}</span><span>${esc(p.statement)}</span>
        <span class="hint">Preuves : ${p.evidence.length ? p.evidence.slice(0, 6).map(e => `<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener">${esc(e.ref)}</a>`).join(', ') + (p.evidence.length > 6 ? ` +${p.evidence.length - 6}` : '') : 'aucune (question ouverte)'} · ${esc(p.caveat)}</span>
        <span class="m">${esc(p.investigation ? p.investigation.label : '')} · ${(p.assignedAgents || []).length} agent(s) assigné(s) · sévérité ${esc(p.severity ? p.severity.level : '—')}</span>
        <span><button type="button" class="ghost small" data-popen="${esc(p.id)}">Ouvrir (agents, preuves)</button></span></li>`).join('')}</ul>
      ${list.length > 80 ? `<p class="hint">${list.length - 80} autres entrées dans <code>data/problems/registry.json</code>.</p>` : ''}
      <h3>Domaines sans preuve intégrée</h3><p class="hint">Absence de données ≠ absence de problème : ${R.gaps.map(g => esc(g.domain)).join(', ')}.</p>`;
    el.querySelectorAll('[data-pfilter]').forEach(b => b.onclick = () => { C.filter = b.dataset.pfilter; renderProblems(el); });
    el.querySelectorAll('[data-popen]').forEach(b => b.onclick = async () => { G.CORE_PLATFORM.show('world'); if (G.CORE_PROBLEMS_VIEW) { await G.CORE_PROBLEMS_VIEW.show(true); G.CORE_PROBLEMS_VIEW.open(b.dataset.popen); } });
    el.querySelectorAll('[data-pseg]').forEach(b => b.onclick = () => { const sv = G.CORE_SF_VIEW, f = sv.state.data && sv.state.data.corridor.features.find(x => String(x.properties.cnn) === b.dataset.pseg); G.CORE_PLATFORM.show('world'); if (f) { const c = f.geometry.coordinates.flat(Infinity), xs = c.filter((_, i) => i % 2 === 0), ys = c.filter((_, i) => i % 2 === 1); G.CORE_PLATFORM.state.map.flyTo({ center: [xs.reduce((a, v) => a + v, 0) / xs.length, ys.reduce((a, v) => a + v, 0) / ys.length], zoom: 17, pitch: 55, duration: 2500 }); } });
  }

  // ---------- Activity dashboard + bounded scheduler ----------
  function sched() {
    if (C.sched || !G.CORE_SCHEDULER) return C.sched;
    C.sched = G.CORE_SCHEDULER.create({ maxQueued: 6, maxJobsPerHour: 12, maxMsPerJob: 15000 }); return C.sched;
  }
  async function renderActivity(el, env) {
    const P = G.CORE_PLATFORM.state, c = P.counts, q = sched(), s = q ? q.snapshot() : null, AW = G.CORE_AGENTS_WORLD;
    const sessionRunning = P.missions.reduce((n, m) => n + m.tasks.filter(t => t.state === 'running').length, 0), schedRunning = s ? s.counts.running : 0;
    const cog = P.cogIndex ? P.cogIndex.missions : [], det = P.recorded ? P.recorded.missions : [];
    el.innerHTML = `<div class="kpis"><div class="kpi"><b>${sessionRunning + schedRunning}</b><span>tâches en cours maintenant</span></div><div class="kpi"><b>${c.executable + c.llm}</b><span>agents exécutables</span></div>
        <div class="kpi"><b>${cog.length}</b><span>missions avec modèle enregistrées</span></div><div class="kpi"><b>${det.length}</b><span>missions à règles enregistrées</span></div><div class="kpi"><b>${P.missions.length}</b><span>missions lancées dans cette session</span></div></div>
      <p class="hint">${P.local ? 'Machine locale : les missions à règles s’exécutent dans ce navigateur ; les missions assistées par modèle demandent Ollama.' : 'Site public : aucune exécution en direct des agents assistés par modèle ; les missions affichées sont des exécutions réelles <b>enregistrées</b>.'} ${AW && AW.state.replay ? 'Une <b>relecture</b> est en cours dans le monde (ce n’est pas une exécution).' : ''}</p>
      <h3>Journal des missions enregistrées</h3><ul class="list">${[...cog.map(m => ({ at: m.recorded_at, t: `${m.mode === 'fast' ? 'rapide' : 'approfondie'} · ${m.question}`, k: `${m.metrics.modelCalls} appels modèle · ${m.metrics.toolCalls} outils · ${Math.round(m.metrics.wallMs / 1000)} s · ${m.agents.length} agents`, d: m.decision })), ...det.map(m => ({ at: P.recorded.recorded_at || null, t: `règles · ${m.origin}`, k: `${(m.agentIds || []).length} agents · ${m.ms} ms`, d: m.decision }))].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 12).map(x => `<li class="item"><span class="t">${esc(x.t)}</span><span class="m">${fmt(x.at)} · ${esc(x.k)} · ${esc(x.d)}</span></li>`).join('')}</ul>
      <h3>Ordonnanceur borné (session)</h3>
      ${s ? `<p class="hint">File limitée à ${s.limits.maxQueued} tâches, ${s.limits.maxConcurrent} à la fois, ${s.limits.maxAttempts} tentatives, ${s.limits.maxMsPerJob / 1000} s par tâche, ${s.limits.maxJobsPerHour} par heure. Aucun déclenchement automatique : rien ne s’exécute sans votre action. Les tâches marquées « approbation » attendent une approbation humaine.</p>
      <div class="toolbar"><button type="button" class="small" id="sc-eval">Mettre en file : réévaluer les agents à règles</button><button type="button" class="small ghost" id="sc-sim">Mettre en file : recalcul de la simulation (approbation)</button><button type="button" class="small" id="sc-run" ${s.stopped ? 'disabled' : ''}>Exécuter la file</button><button type="button" class="small danger" id="sc-stop">${s.stopped ? 'Arrêt actif — lever (humain)' : 'Arrêt d’urgence'}</button></div>
      <div class="kpis">${Object.entries(s.counts).map(([k, v]) => `<div class="kpi"><b>${v}</b><span>${esc({ queued: 'en file', running: 'en cours', completed: 'terminées', failed: 'échouées', paused: 'en pause', 'awaiting-approval': 'attente d’approbation', stopped: 'arrêtées' }[k])}</span></div>`).join('')}</div>
      <ul class="list">${s.jobs.map(j => `<li class="item"><span class="t">${esc(j.id)} · ${esc(j.label)}</span><span class="m">${pill(j.state, j.state === 'completed' ? 'ok' : j.state === 'failed' || j.state === 'stopped' ? 'fail' : 'info')} tentatives ${j.attempts}${j.approvedBy ? ` · approuvé par ${esc(j.approvedBy)}` : ''}${j.error ? ` · ${esc(j.error)}` : ''}${j.result ? ` · ${esc(j.result)}` : ''}</span>${j.state === 'awaiting-approval' ? `<button type="button" class="ghost small" data-approve="${esc(j.id)}">Approuver (humain)</button>` : ''}</li>`).join('') || '<li class="hint">Aucune tâche.</li>'}</ul>
      <details><summary>Journal d’audit chaîné (${s.log.length} entrées) — ${s.chain.ok ? pill('chaîne SHA-256 intacte', 'ok') : pill(`chaîne rompue à l’entrée ${s.chain.at}`, 'fail')}</summary><ol class="audit">${s.log.slice(-30).map(e => `<li><code>${esc(e.hash.slice(0, 12))}</code> ${fmt(e.at)} · ${esc(e.event)}${e.job ? ` · ${esc(e.job)}` : ''}${e.detail ? ` — ${esc(e.detail)}` : ''}</li>`).join('')}</ol></details>` : '<p class="hint">Ordonnanceur indisponible.</p>'}`;
    if (!s) return;
    const again = () => renderActivity(el, env);
    $('sc-eval').onclick = () => { q.enqueue({ kind: 'evals', label: 'Réévaluation des agents à règles', run: async () => { const r = G.CORE_EVALS.evaluate(await G.CORE_PLATFORM.state.envFn(), P.registry); P.liveEvals = r.results || r; const res = r.results || r; return `${res.filter(x => x.pass).length}/${res.length} cas réussis`; } }); again(); };
    $('sc-sim').onclick = () => { q.enqueue({ kind: 'simulation', requiresApproval: true, label: 'Recalcul sidewalk-tree-capacity-v1 (paramètres par défaut)', run: async () => { const r = G.CORE_SIM_SIDEWALK.run((await G.CORE_PLATFORM.state.envFn()).ctx); return `${r.totals.additional_positions} emplacements simulés, empreinte ${r.fingerprint}`; } }); again(); };
    $('sc-run').onclick = async () => { await q.drain(); again(); };
    $('sc-stop').onclick = () => { if (s.stopped) { const who = prompt('Nom du réviseur humain pour lever l’arrêt :'); if (who) q.reset(`human:${who.trim().replace(/\s+/g, '-')}`); } else q.emergencyStop('arrêt d’urgence demandé depuis l’interface'); again(); };
    el.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => { const who = prompt('Nom du réviseur humain :'); if (who) q.approve(b.dataset.approve, `human:${who.trim().replace(/\s+/g, '-')}`); again(); });
  }

  // ---------- Data health ----------
  async function loadRuns() {
    if (C.runs) return C.runs;
    try { const [r, wf] = await Promise.all([getJSON('https://api.github.com/repos/vincentleg/core/actions/workflows/city-feed.yml/runs?per_page=50'), getJSON('https://api.github.com/repos/vincentleg/core/actions/workflows/city-feed.yml').catch(() => null)]);
      C.runs = { ok: true, at: new Date().toISOString(), created: wf && wf.created_at, state: wf && wf.state, runs: (r.workflow_runs || []).map(x => ({ event: x.event, created: x.created_at, status: x.status, conclusion: x.conclusion, url: x.html_url })) };
    } catch (e) { C.runs = { ok: false, error: String(e.message || e) }; }
    return C.runs;
  }
  // Cron slots of '17 */3 * * *' (UTC) strictly after the workflow was created and before `now`.
  function expectedSlots(createdIso, nowIso) { let n = 0; const end = Date.parse(nowIso); const t = new Date(createdIso); t.setUTCMinutes(17, 0, 0); t.setUTCHours(t.getUTCHours() - (t.getUTCHours() % 3));
    for (; t.getTime() <= end; t.setUTCHours(t.getUTCHours() + 3)) if (t.getTime() > Date.parse(createdIso)) n++; return n; }
  async function renderHealth(el, env) {
    const P = G.CORE_PLATFORM.state, sv = G.CORE_SF_VIEW.state, m = sv.manifest, health = env.feedHealth;
    el.innerHTML = `<p class="hint">Santé des données : âge des instantanés, état de chaque source de veille et historique réel des collectes automatiques. Une source joignable n’est pas une preuve d’exactitude.</p>
      <h3>Instantané des registres (San Francisco)</h3>${m ? `<table class="tbl"><thead><tr><th>Jeu</th><th>Collecté</th><th>Entités</th><th>Intégrité</th></tr></thead><tbody>${m.datasets.map(d => `<tr><td><a href="${esc(safeUrl(d.page))}" target="_blank" rel="noopener">${esc(d.title || d.file)}</a></td><td>${fmt(d.retrieved_at)}</td><td>${esc(d.features)}</td><td>${sv.verified && sv.verified[d.file.replace('.geojson', '')] === 'ok' ? pill('fichier intact', 'ok') : pill('non vérifié', 'warn')}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Instantané en cours de chargement.</p>'}
      <h3>Sources de veille</h3><table class="tbl"><thead><tr><th>Source</th><th>Dernier succès</th><th>Dernière erreur</th><th>Éléments</th><th>Fraîcheur</th></tr></thead><tbody>${health.map(h => `<tr><td>${esc(h.name)}${h.enabled ? '' : ' ' + pill('retirée')}</td><td>${fmt(h.lastSuccess)}</td><td>${h.lastError ? pill(String(h.lastError).slice(0, 60), 'fail') : '—'}</td><td>${esc(h.items)}</td><td>${esc(h.freshness)}</td></tr>`).join('')}</tbody></table>
      <p class="hint">Dernière collecte complète : ${fmt(P.state.lastSuccessfulUpdate)} (${esc(P.state.lastRun && P.state.lastRun.runner ? P.state.lastRun.runner.kind : 'inconnu')}).</p>
      <h3>Collecte automatique (GitHub Actions <code>city-feed.yml</code>)</h3><div id="hl-runs"><p class="hint">Lecture de l’historique public des exécutions…</p></div>`;
    const R = await loadRuns(), box = $('hl-runs'); if (!box) return;
    if (!R.ok) { box.innerHTML = `<p class="hint">Historique indisponible (${esc(R.error)}). Aucune conclusion n’est tirée.</p>`; return; }
    const sch = R.runs.filter(r => r.event === 'schedule'), man = R.runs.filter(r => r.event === 'workflow_dispatch'), slots = R.created ? expectedSlots(R.created, R.at) : null;
    const ok = R.runs.filter(r => r.conclusion === 'success'), lastOk = ok[0], lastTry = R.runs[0], age = P.state.lastSuccessfulUpdate ? (Date.parse(R.at) - Date.parse(P.state.lastSuccessfulUpdate)) / 3600e3 : null;
    box.innerHTML = `<div class="kpis"><div class="kpi"><b>${sch.length}${slots !== null ? ` / ${slots}` : ''}</b><span>exécutions planifiées observées / créneaux cron prévus</span></div><div class="kpi"><b>${man.length}</b><span>exécutions manuelles</span></div><div class="kpi"><b>${ok.length}/${R.runs.length}</b><span>réussies</span></div><div class="kpi"><b>${age === null ? '—' : `${Math.round(age)} h`}</b><span>âge de la veille publiée</span></div></div>
      ${age !== null && age > 6 ? `<p class="warnbox">⚠ Données de veille âgées de ${Math.round(age)} h (plus de deux créneaux de 3 h) : la collecte automatique n’est pas fiable ; ne pas considérer ces données comme actuelles.</p>` : ''}
      <table class="tbl"><tbody><tr><th>Dernière collecte de données réussie</th><td>${fmt(P.state.lastSuccessfulUpdate)} · déclencheur réel <b>${esc(P.state.lastRun && P.state.lastRun.runner ? (P.state.lastRun.runner.kind === 'github-actions' ? (P.state.lastRun.runner.event === 'schedule' ? 'planifié (cron GitHub)' : 'manuel (GitHub Actions)') : 'manuel (machine locale)') : 'inconnu')}</b> (état publié dans data/feeds/state.json)</td></tr>
        <tr><th>Échecs de collecte</th><td>${R.runs.filter(r => r.conclusion === 'failure').map(r => `${fmt(r.created)} (${esc(r.event)})`).join(' · ') || 'aucun dans l’historique lu'}</td></tr>
        <tr><th>Dernière tentative</th><td>${lastTry ? `${fmt(lastTry.created)} · ${esc(lastTry.event)} · ${esc(lastTry.conclusion || lastTry.status)}` : '—'}</td></tr>
        <tr><th>Workflow</th><td>${esc(R.state || '—')} · créé ${fmt(R.created)} · cron <code>17 */3 * * *</code> (UTC)</td></tr></tbody></table>
      <p class="hint">Stratégie gratuite (Phase 9) : cron toutes les 3 h plus une tentative horaire ; une exécution planifiée ne collecte que si les données ont au moins 150 min (les exécutions sans collecte apparaissent aussi « réussies » dans l’API : la date de collecte réelle est celle de l’état publié ci-dessus). ${sch.length ? `Le cron fonctionne mais de façon <b>irrégulière</b> : ${sch.length} exécution(s) observée(s) pour ${slots ?? '?'} créneau(x) prévu(s) (GitHub ne garantit pas l’heure ni l’exécution des tâches planifiées). La collecte toutes les 3 h n’est donc pas revendiquée.` : '<b>Aucune exécution planifiée observée</b> : seules des exécutions manuelles existent.'} Lu le ${fmt(R.at)} depuis l’API publique GitHub.</p>
      <ul class="list">${R.runs.slice(0, 8).map(r => `<li class="item"><span class="m">${fmt(r.created)} · ${esc(r.event)} · ${esc(r.conclusion || r.status)} · <a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">détail</a></span></li>`).join('')}</ul>`;
  }
  G.CORE_CIV = { renderProblems, renderActivity, renderHealth, expectedSlots, state: C };
})();
