// CORE — agent profile card (Phase 8). Clicking any agent (avatar, figure, list, collaborator) opens THIS agent's
// floating card: overview first, then tabs (Mission, Organisation, Connaissances, Activité, Déplacement, Sécurité).
// Every field comes from the registry, recorded missions, recorded local operations, the problems registry or
// the motion engine. Missing information is stated, never filled in.
(function () {
  'use strict';
  const G = globalThis, $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pill = (t, k = '') => `<span class="pill ${k}">${esc(t)}</span>`;
  const fmt = iso => (iso ? `${String(iso).slice(0, 16).replace('T', ' ')} UTC` : '—');
  const safeUrl = u => (/^https:\/\//i.test(String(u || '')) ? u : '#');
  const S = { id: null, tab: 'overview', problems: null };
  const TABS = [['overview', 'Aperçu'], ['mission', 'Mission'], ['org', 'Organisation'], ['knowledge', 'Connaissances'], ['memory', 'Mémoire'], ['activity', 'Activité'], ['movement', 'Déplacement'], ['safety', 'Sécurité']];
  const ENGINE = { deterministic: 'code déterministe (règles), sans modèle', llm: 'modèle local open-weight qwen3:8b (Ollama) pour choisir les outils et interpréter ; calculs par code déterministe', 'coordination-only': 'aucun moteur (profil de coordination)', unavailable: 'aucun moteur (outil ou donnée manquant)' };
  const CAP = { deterministic: 'à règles', llm: 'assisté par modèle', 'coordination-only': 'coordination seule', unavailable: 'indisponible' };
  const PROHIBITED = ['modifier ses propres permissions ou sa politique', 'créer des agents subordonnés', 'accéder à des identifiants ou secrets', 'exécuter des commandes système ou naviguer librement sur le web', 'agir sur une infrastructure réelle, envoyer des messages ou effectuer des achats', 'contourner la passerelle ou l’approbation humaine', 'réécrire le journal d’audit'];

  async function data() {
    const P = G.CORE_PLATFORM.state;
    if (!S.problems) { try { S.problems = (G.CORE_CIV && G.CORE_CIV.state.problems) || await G.CORE_PLATFORM.getJSON('data/problems/registry.json'); if (G.CORE_CIV) G.CORE_CIV.state.problems = S.problems; } catch (_) { S.problems = { problems: [] }; } }
    if (P.opsReady) await P.opsReady;
    if (S.operational === undefined) { try { S.operational = await G.CORE_PLATFORM.getJSON('data/agents/operational.json'); } catch (_) { S.operational = null; } }
    const civ = G.CORE_ACTIVITY ? (await G.CORE_ACTIVITY.load(), G.CORE_ACTIVITY.state.missions) : [];
    return { P, cog: await G.CORE_PLATFORM.cogRecords(), ops: P.operations, problems: S.problems.problems, reg: P.registry, civ, mem: P.memoryExport, operational: S.operational };
  }
  const agentBtn = (reg, id, extra = '') => { const a = reg.agents.find(x => x.id === id); return a ? `<button type="button" class="linkish" data-open-agent="${esc(id)}">${esc(a.code)}</button> <span class="hint">${esc(a.role)}${extra}</span>` : esc(id); };

  function facts(d, id) {
    const a = d.reg.agents.find(x => x.id === id), M = G.CORE_MOTION && G.CORE_MOTION.state.agents.get(id);
    const cog = d.cog.filter(r => r.agents.includes(id) || r.log.some(l => l.agent === id)).map(r => ({ r, calls: r.toolCalls.filter(t => t.agent === id), ev: r.evidence.filter(e => e.agent === id), acc: r.board.filter(b => b.agent === id), rej: (r.rejected || []).filter(x => x.agent === id), dOut: (r.disagreements || []).filter(x => x.between[1] === id), dIn: (r.disagreements || []).filter(x => x.between[0] === id), req: (r.requests || []).filter(q => q.agent === id || q.fulfilledBy === id) }));
    const det = d.P.recorded ? d.P.recorded.missions.filter(m => (m.agentIds || []).includes(id)) : [];
    const ops = d.ops ? d.ops.tasks.filter(t => t.agents.some(x => x.id === id)) : [];
    const probs = d.problems.filter(p => (p.assignedAgents || []).includes(id));
    const civ = (d.civ || []).filter(m => m.messages.some(x => x.from === id || x.to === id));
    const episodes = d.mem ? d.mem.episodes.filter(e => e.agent === id) : [], inst = d.mem ? d.mem.institutional.filter(e => e.origin === id || (e.body && e.body.agent === id) || e.history.some(h => h.by === id)) : [];
    const op = d.operational ? d.operational.agents.find(x => x.id === id) : null;
    const collab = new Map(); const addC = (x, why) => { if (x && x !== id) { if (!collab.has(x)) collab.set(x, new Set()); collab.get(x).add(why); } };
    for (const c of cog) { for (const l of c.r.log) if (l.agent) addC(l.agent, 'mission enregistrée (modèle)'); }
    for (const m of det) for (const x of m.agentIds || []) addC(x, 'mission à règles enregistrée');
    for (const t of ops) for (const x of t.agents) addC(x.id, 'opération locale enregistrée');
    const last = [...cog.map(c => c.r.recorded.at), ...(det.length ? [d.P.recorded.recorded_at] : []), ...ops.map(t => t.updated)].sort().pop() || null;
    const audit = d.ops ? d.ops.events.filter(e => ops.some(t => t.id === e.task)).pop() : null;
    for (const m of civ) for (const x of m.messages) for (const y of [x.from, x.to]) addC(y, 'mission autonome enregistrée');
    return { a, M, cog, det, ops, probs, collab, last, audit, civ, episodes, inst, op };
  }

  function overview(d, f) {
    const { a, M } = f, POP = G.CORE_POPULATION, st = M ? M.st : POP.status(a, POP.facts({ cogIndex: d.P.cogIndex, detIndex: d.P.recorded, operations: d.ops }));
    const zone = M ? M.zone.name : POP.ZONES.find(z => z.id === POP.zoneOf(a)).name;
    const locType = !M ? 'non affiché' : M.mode === 'replay' ? 'lieu journalisé d’une mission enregistrée (relecture)' : M.mode === 'live' ? 'tronçon de la tâche en cours d’exécution locale' : M.mode === 'post' ? 'poste virtuel (rattachement illustratif, pas un bureau réel)' : 'lieu de la preuve citée par une mission enregistrée (relecture) — pas une inspection physique';
    return `<p class="pc-role">${esc(a.role)}</p>
      <div class="pc-pills">${pill(CAP[a.executionMode] || a.executionMode, a.executionMode === 'deterministic' || a.executionMode === 'llm' ? 'ok' : a.executionMode === 'unavailable' ? 'warn' : 'info')} ${pill(POP.STATUS[st], st === 'executing' ? 'ok' : 'info')} ${pill(`zone virtuelle : ${zone}`)}</div>
      <table class="tbl"><tbody>
        <tr><th>Domaine</th><td>${esc((d.reg.departments.find(x => x.id === a.department) || { name: a.scope.level }).name)}</td></tr>
        <tr><th>Spécialisation</th><td>${esc(a.specialization)}</td></tr>
        <tr><th>Moteur réel</th><td>${esc(ENGINE[a.executionMode])}${a.executionMode === 'llm' && !d.P.local ? ' — <b>non exécuté sur ce site public</b>' : ''}</td></tr>
        <tr><th>Outils autorisés</th><td>${a.tools.length ? a.tools.map(esc).join(', ') : 'aucun'}</td></tr>
        <tr><th>Classe opérationnelle</th><td>${esc(f.op ? f.op.class : '—')}</td></tr>
        <tr><th>Travail enregistré</th><td>${f.civ.length} mission(s) autonome(s) · ${f.cog.length} mission(s) avec modèle · ${f.det.length} mission(s) à règles · ${f.ops.length} opération(s) locale(s)${f.civ.length + f.cog.length + f.det.length + f.ops.length ? '' : ' — <i>Aucune exécution enregistrée.</i>'}</td></tr>
        <tr><th>Position affichée</th><td>${esc(locType)}${M && M.note ? `<br><span class="hint">${esc(M.note)}</span>` : ''}</td></tr>
        <tr><th>Dernière activité</th><td>${fmt(f.last)}</td></tr></tbody></table>
      <div class="pc-actions"><button type="button" class="small" data-pc="follow">${G.CORE_MOTION && G.CORE_MOTION.state.follow === a.id ? 'Arrêter le suivi' : 'Suivre l’agent'}</button><button type="button" class="small ghost" data-tab="mission">Voir la mission</button><button type="button" class="small ghost" data-tab="org">Collaborateurs</button><button type="button" class="small ghost" data-tab="activity">Preuves</button></div>`;
  }
  function mission(d, f) {
    const { a, M } = f, live = M && M.mode === 'live', rep = M && M.mode === 'replay';
    const cur = live ? `${pill('exécution locale réelle', 'ok')} ${esc(M.note)}` : rep ? `${pill('relecture', 'info')} ${esc(M.note)} <span class="hint">— exécution passée enregistrée, pas une activité actuelle</span>` : '<i>Aucune exécution en cours.</i>';
    const probs = f.probs.slice(0, 12);
    const items = [...f.civ.map(m => `<li class="item"><span class="t">${esc(m.title)} — ${esc(m.nhood)} <span class="pill info">autonome</span></span><span class="m">${esc(m.state)} · ${esc(m.decision ? m.decision.state : '')} · responsable ${esc((d.reg.agents.find(a => a.id === m.owner) || {}).code || m.owner)} · ${m.messages.length} échanges</span><span class="m">Participants : ${[...new Set(m.messages.flatMap(x => [x.from, x.to]).filter(x => d.reg.agents.some(a => a.id === x)))].map(x => `<button type="button" class="linkish" data-open-agent="${esc(x)}">${esc(d.reg.agents.find(a => a.id === x).code)}</button>`).join(' ')}</span></li>`), ...f.cog.map(c => `<li class="item"><button type="button" class="linkish" data-replay="${esc(c.r.id)}">Relire : ${esc(c.r.target.question.slice(0, 90))}…</button><span class="m">${fmt(c.r.recorded.at)} · ${esc(c.r.decision.state)} · ${c.calls.length} appel(s) d’outils</span></li>`),
      ...f.ops.slice(0, 8).map(t => `<li class="item"><span class="t">${esc(t.id)} · ${esc(t.title)}</span><span class="m">${esc(t.state)} · mission ${esc(t.result ? t.result.mission : '—')} (empreinte ${esc(t.result ? t.result.fingerprint : '—')}) · début ${fmt(t.started)} · fin ${fmt(t.updated)}</span></li>`),
      ...f.det.slice(0, 6).map(m => `<li class="item"><span class="t">${esc(m.origin)}</span><span class="m">mission à règles ${esc(m.id)} · ${esc(m.decision)}</span></li>`)];
    return `<h4>Affectation actuelle</h4><p>${cur}</p>
      <h4>Problèmes assignés (${f.probs.length})</h4>${probs.length ? `<ul class="list">${probs.map(p => `<li class="item"><button type="button" class="linkish" data-open-problem="${esc(p.id)}">${esc(p.title)}</button><span class="m">${esc(p.place || '—')} · statut ${esc(p.status)} · priorité (sévérité) ${esc(p.severity.level)} · ${esc(p.investigation.label)}</span></li>`).join('')}</ul>${f.probs.length > 12 ? `<p class="hint">+${f.probs.length - 12} autres</p>` : ''}` : '<p class="hint">Aucun problème assigné.</p>'}
      <h4>Livrable attendu</h4><p class="hint">${a.executionMode === 'coordination-only' || a.executionMode === 'unavailable' ? 'Aucun : profil non exécutable.' : 'Constats sourcés pour un dossier soumis à la passerelle puis à la revue humaine ; aucune décision.'}</p>
      <h4>Missions</h4>${items.length ? `<ul class="list">${items.join('')}</ul>` : '<p class="hint">Aucune exécution enregistrée.</p>'}`;
  }
  function org(d, f) {
    const { a } = f, reg = d.reg, sup = [], team = reg.agents.filter(x => x.supervisor === a.id);
    for (let x = a; x && x.supervisor;) { const y = reg.agents.find(z => z.id === x.supervisor); if (!y || sup.includes(y)) break; sup.push(y); x = y; }
    const reviewers = [...new Set(f.ops.flatMap(t => t.agents.filter(x => x.role === 'review').map(x => x.id)))].filter(x => x !== a.id);
    return `<h4>Superviseur</h4><p>${a.supervisor ? agentBtn(reg, a.supervisor) : 'aucun (sommet de la hiérarchie)'}</p>
      <h4>Agents supervisés (${team.length})</h4>${team.length ? `<ul class="plain">${team.map(x => `<li>${agentBtn(reg, x.id)}</li>`).join('')}</ul>` : '<p class="hint">Aucun.</p>'}
      <h4>Collaborateurs (travail enregistré)</h4>${f.collab.size ? `<ul class="plain">${[...f.collab].slice(0, 20).map(([x, why]) => `<li>${agentBtn(reg, x, ` · ${[...why].join(', ')}`)}</li>`).join('')}</ul>` : '<p class="hint">Aucune collaboration enregistrée.</p>'}
      <h4>Réviseurs</h4>${reviewers.length ? `<ul class="plain">${reviewers.map(x => `<li>${agentBtn(reg, x)}</li>`).join('')}</ul>` : '<p class="hint">Aucun réviseur enregistré pour cet agent.</p>'}
      <h4>Chemin d’escalade</h4><p class="hint">${[...sup.map(y => `<code>${esc(y.code)}</code>`), '<code>passerelle de décision</code>', '<b>revue humaine</b>'].join(' → ')}</p>
      <p><button type="button" class="small ghost" data-pc="dossier">Ouvrir le dossier dans l’organisation</button></p>`;
  }
  function knowledge(d, f) {
    const { a } = f, P = d.P, KN = G.CORE_KNOWLEDGE, docs = P.K ? KN.collection(P.K, a) : [], TS = G.CORE_PLATFORM.TOOL_SOURCES || {};
    const consulted = new Map(); for (const c of f.cog) for (const e of c.ev) for (const r of e.evidence || []) consulted.set(r.ref, r.url);
    for (const t of f.ops) for (const x of (t.result ? t.result.tools : []).filter(x => x.agent === a.id)) if (TS[x.tool]) consulted.set(`dataset:${TS[x.tool]}`, null);
    const missing = [...f.cog.flatMap(c => c.req.filter(q => q.agent === a.id && q.status === 'unfulfillable').map(q => q.need))];
    return `<h4>Sources approuvées (via ses outils)</h4><p class="hint">${[...new Set(a.tools.map(t => TS[t]).filter(Boolean))].map(esc).join(' · ') || 'aucune'}</p>
      <h4>Sources effectivement consultées (${consulted.size})</h4>${consulted.size ? `<ul class="plain">${[...consulted].slice(0, 20).map(([ref, url]) => `<li>${url ? `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener">${esc(ref)}</a>` : esc(ref)}</li>`).join('')}</ul>` : '<p class="hint">Aucune consultation enregistrée.</p>'}
      <h4>Collection de connaissances</h4>${docs.length ? `<ul class="plain">${docs.map(x => `<li><a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.title)}</a> v${esc(x.version)}</li>`).join('')}</ul>` : '<p class="hint">Source de connaissances pas encore disponible.</p>'}
      <p class="hint">Version de la bibliothèque : ${esc(P.K ? P.K.lib.version : '—')}. Les agents ne se ré-entraînent pas : leurs connaissances sont des documents approuvés par un humain, indexés et versionnés.</p>
      <h4>Informations manquantes</h4>${missing.length || a.gap ? `<ul class="plain">${[...(a.gap ? [a.gap] : []), ...missing].map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="hint">Aucune demande de preuve restée sans réponse.</p>'}
      <p class="hint">${esc(a.disclaimer)}</p>`;
  }
  function activity(d, f) {
    const tools = new Map(); for (const c of f.cog) for (const t of c.calls) tools.set(t.tool, (tools.get(t.tool) || 0) + 1);
    for (const t of f.ops) for (const x of (t.result ? t.result.tools : []).filter(x => x.agent === f.a.id)) tools.set(x.tool, (tools.get(x.tool) || 0) + 1);
    const acc = f.cog.flatMap(c => c.acc), rej = f.cog.flatMap(c => c.rej), ev = f.cog.flatMap(c => c.ev), dis = f.cog.flatMap(c => [...c.dOut.map(x => ({ ...x, dir: 'émis' })), ...c.dIn.map(x => ({ ...x, dir: 'reçu' }))]);
    const opsDone = f.ops.filter(t => t.result), opsOpen = f.ops.filter(t => !t.result);
    return `<div class="kpis"><div class="kpi"><b>${f.cog.length + f.det.length + opsDone.length}</b><span>missions terminées</span></div><div class="kpi"><b>${f.ops.filter(t => ['rejected', 'failed'].includes(t.state)).length}</b><span>rejetées / échouées</span></div><div class="kpi"><b>${opsOpen.length}</b><span>en attente</span></div></div>
      <h4>Outils utilisés</h4>${tools.size ? `<p class="hint">${[...tools].map(([t, n]) => `${esc(t)} ×${n}`).join(' · ')}</p>` : '<p class="hint">Aucun outil utilisé dans un travail enregistré.</p>'}
      <h4>Preuves produites (${ev.length})</h4>${ev.length ? `<ul class="plain">${ev.slice(0, 8).map(e => `<li><b>${esc(e.id)}</b> ${esc(String(e.claim).slice(0, 140))} ${(e.evidence || []).slice(0, 3).map(r => `<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener">${esc(r.ref)}</a>`).join(' ')}</li>`).join('')}</ul>` : '<p class="hint">Aucune preuve produite par cet agent dans les missions enregistrées.</p>'}
      <h4>Énoncés acceptés (${acc.length}) / rejetés (${rej.length})</h4>${acc.length + rej.length ? `<ul class="plain">${acc.slice(0, 5).map(b => `<li>${pill('accepté', 'ok')} ${esc(b.statement)}</li>`).join('')}${rej.slice(0, 4).map(b => `<li>${pill('rejeté', 'fail')} ${esc(b.statement || '')} <span class="hint">${esc((b.reasons || []).join(' ; '))}</span></li>`).join('')}</ul>` : '<p class="hint">Aucun énoncé enregistré.</p>'}
      <h4>Désaccords et revues (${dis.length})</h4>${dis.length ? `<ul class="plain">${dis.map(x => `<li>${pill(x.dir)} ${esc(x.id)} : ${esc(x.statement)}</li>`).join('')}</ul>` : '<p class="hint">Aucun désaccord enregistré.</p>'}
      <h4>Recommandations émises</h4><p class="hint">Aucune : CORE produit des dossiers ; seules des personnes décident.</p>`;
  }
  function movement(d, f) {
    const { M } = f, AW = G.CORE_AGENTS_WORLD, rp = AW && AW.state.replay, steps = rp ? rp.plan.steps.filter(s => s.agent === f.a.id) : [];
    const type = !M ? '—' : M.mode === 'replay' ? 'lieu journalisé (relecture) : localisation des données utilisées par l’outil' : M.mode === 'live' ? 'tâche exécutée localement en ce moment' : M.mode === 'post' ? 'poste virtuel (rattachement illustratif)' : 'relecture d’activité enregistrée — pas une inspection physique';
    return `<table class="tbl"><tbody><tr><th>Position affichée</th><td>${M ? `${M.pos[1].toFixed(5)}, ${M.pos[0].toFixed(5)}` : '—'}</td></tr><tr><th>Type</th><td>${esc(type)}</td></tr>
      <tr><th>Réseau</th><td>Trottoirs, passages piétons et voies piétonnes cartographiés par OpenStreetMap (ODbL) ; largeur et accessibilité non vérifiées.</td></tr>
      <tr><th>Vitesse affichée</th><td>${M && M.mode !== 'replay' && M.mode !== 'post' ? `marche ×${G.CORE_MOTION.SPEED} (relecture d’activité enregistrée)` : rp ? `relecture ×${rp.speed}, rythme compressé` : '—'}</td></tr></tbody></table>
      <h4>Historique de trajets enregistrés</h4>${steps.length ? `<ol class="plain">${steps.map(s => `<li>journal +${(s.t / 1000).toFixed(1)} s · ${esc(s.kind)}${s.call ? ` · ${esc(s.call)}` : ''}${s.path ? ` · ${Math.round(s.path.length)} m${s.path.approx ? ' (approximatif)' : ''}` : ''} — ${esc(s.why || '')}</li>`).join('')}</ol>` : `<p class="hint">${f.cog.length ? 'Lancez la relecture d’une de ses missions pour voir ses trajets journalisés.' : 'Aucun trajet enregistré : les déplacements affichés sont illustratifs.'}</p>`}
      <p><button type="button" class="small" data-pc="follow">${G.CORE_MOTION && G.CORE_MOTION.state.follow === f.a.id ? 'Arrêter le suivi' : 'Suivre l’agent'}</button>${G.CORE_MOTION && G.CORE_MOTION.state.prevCam ? ' <button type="button" class="small ghost" data-pc="back">Revenir à la vue précédente</button>' : ''}</p>`;
  }
  function safety(d, f) {
    const { a } = f;
    return `<table class="tbl"><tbody><tr><th>Permission</th><td>${esc(a.permission)} — fixée dans le registre ; l’agent ne peut pas la modifier (objet gelé, test)</td></tr>
      <tr><th>Exécution autonome</th><td>Non. Il n’agit que dans une mission bornée (session, relecture ou superviseur local) avec liste d’outils autorisés, budget de temps et arrêt d’urgence.</td></tr>
      <tr><th>Approbation humaine</th><td>Toujours requise : la passerelle recalcule, puis un humain (<code>human:…</code>) décide.</td></tr>
      <tr><th>Dernier évènement d’audit</th><td>${f.audit ? `${fmt(f.audit.at)} · ${esc(f.audit.event)} · ${esc(f.audit.task)} · <code>${esc(f.audit.hash.slice(0, 12))}</code> (chaîne SHA-256)` : 'Aucun évènement d’audit enregistré.'}</td></tr></tbody></table>
      <h4>Actions interdites</h4><ul class="plain">${PROHIBITED.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  function memory(d, f) {
    const op = f.op;
    return `<p class="hint">Mémoire locale de l’agent (SQLite sur la machine du propriétaire), publiée ici par export. Espace : <code>${esc(op ? op.memoryNamespace : 'mem:' + f.a.code)}</code>${d.mem ? ` · chaîne d’audit ${d.mem.chain && d.mem.chain.ok ? 'intègre' : 'à vérifier'} · export du ${esc(String(d.mem.generated_at).slice(0, 16).replace('T', ' '))} UTC` : ' · aucun export publié'}.</p>
      <h4>Identité (version ${esc(op ? op.version : '—')})</h4><p class="hint">${op ? `${esc(op.class)} · permission ${esc(op.permission)} · actions autorisées : ${op.allowedActions.map(esc).join(', ') || 'aucune'} · approbations requises : ${op.requiredApprovals.map(esc).join(' ; ')}` : 'Registre opérationnel non publié.'}</p>
      <h4>Connaissances</h4><p class="hint">${op && op.knowledgeBoundaries.documents.length ? op.knowledgeBoundaries.documents.map(esc).join(', ') : 'Aucun document approuvé.'} · domaines : ${op ? op.knowledgeBoundaries.domains.map(esc).join(', ') || '—' : '—'}</p>
      <h4>Épisodes (${f.episodes.length})</h4>${f.episodes.length ? `<ul class="plain">${f.episodes.slice(-12).reverse().map(e => `<li>${esc(e.mission)} · rôle ${esc(e.role)} · ${esc(e.outcome || '')}${e.tools && e.tools.length ? ` · outils : ${e.tools.map(t => `${esc(t.tool)} (${esc(t.state)})`).join(', ')}` : ''}${e.errors && e.errors.length ? ` · <span style="color:#ffb3ba">erreur : ${esc(e.errors[0].slice(0, 90))}</span>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Aucun épisode enregistré.</p>'}
      <h4>Mémoire institutionnelle liée (${f.inst.length})</h4>${f.inst.length ? `<ul class="plain">${f.inst.map(e => `<li><span class="pill ${e.status === 'approved' ? 'ok' : e.status === 'rejected' ? 'fail' : 'info'}">${esc(e.status)}</span> <i>${esc(e.kind)}</i> ${esc(e.statement.slice(0, 200))}<br><span class="hint">${e.history.map(h => `${esc(h.status)} par ${esc(h.by)}`).join(' → ')}</span></li>`).join('')}</ul>` : '<p class="hint">Aucune entrée.</p>'}
      <p class="hint">Apprentissage borné : procédures et leçons issues d’enregistrements déterministes, vérifiées puis revues par un autre agent ; les constats sur le monde n’entrent en mémoire approuvée qu’après décision humaine. Aucune modification de permission, de politique ou de code.</p>`;
  }
  const RENDER = { overview, mission, org, knowledge, memory, activity, movement, safety };

  async function open(id, tab) {
    S.id = id; if (tab) S.tab = tab; else if (S.lastId !== id) S.tab = 'overview'; S.lastId = id;
    let el = $('agent-card'); if (!el) { el = document.createElement('aside'); el.id = 'agent-card'; el.className = 'panel agent-card'; el.setAttribute('aria-label', 'Profil de l’agent'); document.body.appendChild(el); }
    if (G.CORE_MOTION && G.CORE_MOTION.state.selected !== id) G.CORE_MOTION.select(id, { open: false });
    const d = await data(), f = facts(d, id); if (!f.a || S.id !== id) return;
    if ($('ws') && !$('ws').hidden) G.CORE_PLATFORM.show('world'); const pc = $('problem-card'); if (pc) pc.hidden = true;
    document.body.classList.add('card-open'); el.hidden = false; el.dataset.agent = id;
    el.innerHTML = `<header><div><code class="mid">${esc(f.a.code)}</code><h3>${esc(f.a.role)}</h3></div><button type="button" class="ghost small" id="pc-close" aria-label="Fermer le profil">✕</button></header>
      <nav class="pc-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${l}</button>`).join('')}</nav>
      <div class="pc-body" id="pc-body">${RENDER[S.tab](d, f)}</div>`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => open(id, b.dataset.tab));
    el.querySelectorAll('[data-open-agent]').forEach(b => b.onclick = () => { if (G.CORE_MOTION) G.CORE_MOTION.select(b.dataset.openAgent); else open(b.dataset.openAgent); });
    el.querySelectorAll('[data-open-problem]').forEach(b => b.onclick = () => G.CORE_PROBLEMS_VIEW && G.CORE_PROBLEMS_VIEW.open(b.dataset.openProblem));
    el.querySelectorAll('[data-replay]').forEach(b => b.onclick = async () => { const rid = b.dataset.replay; if (G.CORE_CAMERA) G.CORE_CAMERA.view('mission'); await G.CORE_AGENTS_WORLD.startReplay(m => m.id === rid); open(id); });
    el.querySelectorAll('[data-pc=follow]').forEach(b => b.onclick = () => { G.CORE_MOTION.follow(id); open(id); });
    el.querySelectorAll('[data-pc=back]').forEach(b => b.onclick = () => { G.CORE_MOTION.unfollow(true); open(id); });
    el.querySelectorAll('[data-pc=dossier]').forEach(b => b.onclick = () => { close(); G.CORE_PLATFORM.openAgentDossier(id); });
    $('pc-close').onclick = close;
  }
  function close() { const el = $('agent-card'); if (el) el.hidden = true; document.body.classList.remove('card-open'); S.id = null; if (G.CORE_MOTION) { G.CORE_MOTION.state.selected = null; } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.id && !document.body.classList.contains('landing')) close(); });
  G.CORE_AGENT_PROFILE = { open, close, state: S, TABS, PROHIBITED };
})();
