// CORE V7.2 — civilisation runtime. A deterministic, event-driven mission engine for the registered agents.
//  • Missions are task graphs (missions.mjs) moving through scientific stages:
//    OBSERVE → FORMULATE → RETRIEVE → ANALYZE → REQUEST_REVIEW → COLLABORATE → HYPOTHESES → SIMULATE → CRITIQUE → REVISE
//    → DOSSIER → HUMAN_REVIEW, then MONITOR. A stage is skipped when it does not apply; RECOMMENDATION never happens without
//    a verified human reviewer, so it is never reached in this prototype.
//  • A bounded scheduler starts ready tasks when enough agents of the right team are free (global and per-mission caps).
//  • Every hand-off is a TYPED message (request, evidence, analysis, challenge, alternative, review-request, review,
//    dossier-update, escalate, status, human-input) with sender, recipient, mission, task and evidence references.
//  • Events are appended to a hash-chained log (FNV-1a, tamper-evident locally, not a security boundary). State can be
//    saved and restored; the clock only advances while a page runs the runtime ("progresses while CORE is open").
//  • No agent here is a language model. Their "work" is the computation of findings on dated public data; positions are
//    a visualisation of where that work points (virtual posts, evidence locations, virtual meeting points).
import { evaluate as evaluateContribution } from '../contrib/contributions.mjs';
export const VERSION = 'core-civ-runtime-v2'; // v2: bilingual { en, fr } event text (older saved states are discarded)
const B = (en, fr) => ({ en, fr });
const tx = (x, c) => (x && typeof x === 'object' ? x[c] ?? x.en : x ?? '');
export const STAGES = ['OBSERVE', 'FORMULATE', 'RETRIEVE', 'ANALYZE', 'REQUEST_REVIEW', 'COLLABORATE', 'HYPOTHESES', 'SIMULATE', 'CRITIQUE', 'REVISE', 'DOSSIER', 'HUMAN_REVIEW', 'RECOMMENDATION', 'MONITOR'];
export const STAGE_EN = { REASON: 'Reason (local model)', OBSERVE: 'Observe', FORMULATE: 'Frame the question', RETRIEVE: 'Retrieve evidence', ANALYZE: 'Analyse', REQUEST_REVIEW: 'Request review', COLLABORATE: 'Collaborate', HYPOTHESES: 'Form hypotheses', SIMULATE: 'Simulate', CRITIQUE: 'Critique', REVISE: 'Revise', DOSSIER: 'Produce the dossier', HUMAN_REVIEW: 'Human review', RECOMMENDATION: 'Recommendation', MONITOR: 'Monitor' };
export const MSG_EN = { request: 'request', evidence: 'evidence', analysis: 'analysis', challenge: 'challenge', alternative: 'competing hypothesis', 'review-request': 'review request', review: 'review', 'dossier-update': 'dossier update', escalate: 'escalation', status: 'status', 'human-input': 'human contribution', delegate: 'delegation', 'model-proposal': 'local-model proposal' };
export const STAGE_FR = { REASON: 'Raisonner (modèle local)', OBSERVE: 'Observer', FORMULATE: 'Formuler la question', RETRIEVE: 'Récupérer les preuves', ANALYZE: 'Analyser', REQUEST_REVIEW: 'Demander une revue', COLLABORATE: 'Collaborer', HYPOTHESES: 'Former des hypothèses', SIMULATE: 'Simuler', CRITIQUE: 'Critiquer', REVISE: 'Réviser', DOSSIER: 'Produire le dossier', HUMAN_REVIEW: 'Revue humaine', RECOMMENDATION: 'Recommandation', MONITOR: 'Surveiller' };
export const MSG_FR = { request: 'demande', evidence: 'preuve', analysis: 'analyse', challenge: 'contestation', alternative: 'hypothèse concurrente', 'review-request': 'demande de revue', review: 'revue', 'dossier-update': 'mise à jour du dossier', escalate: 'escalade', status: 'état', 'human-input': 'contribution humaine', delegate: 'délégation', 'model-proposal': 'proposition du modèle local' };
export const REASON_KINDS = ['gaps', 'hypothesis', 'critique'];
const REASON_FR = { gaps: 'identifier les preuves manquantes', hypothesis: 'proposer une hypothèse testable', critique: 'contester une hypothèse' };
const REASON_EN = { gaps: 'identify missing evidence', hypothesis: 'propose a testable hypothesis', critique: 'challenge a hypothesis' };
const RS = k => B(REASON_EN[k] || '', REASON_FR[k] || ''), ST = k => B(STAGE_EN[k] || k, STAGE_FR[k] || k);
const ACT_EN = { OBSERVE: 'observing', FORMULATE: 'deliberating', RETRIEVE: 'retrieving data', ANALYZE: 'analysing', REQUEST_REVIEW: 'requesting a review', COLLABORATE: 'checking', HYPOTHESES: 'forming a hypothesis', SIMULATE: 'assessing the simulation', CRITIQUE: 'critiquing', REVISE: 'revising', DOSSIER: 'writing the dossier', HUMAN_REVIEW: 'handing over to human review', MONITOR: 'monitoring' };
const ACT = { OBSERVE: 'observe', FORMULATE: 'délibère', RETRIEVE: 'récupère des données', ANALYZE: 'analyse', REQUEST_REVIEW: 'demande une revue', COLLABORATE: 'vérifie', HYPOTHESES: 'formule une hypothèse', SIMULATE: 'évalue la simulation', CRITIQUE: 'critique', REVISE: 'révise', DOSSIER: 'rédige le dossier', HUMAN_REVIEW: 'transmet à la revue humaine', MONITOR: 'surveille' };
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const M_LAT = 110574, M_LON = lat => 111320 * Math.cos(lat * Math.PI / 180);
const meters = (a, b) => Math.hypot((a[0] - b[0]) * M_LON(a[1]), (a[1] - b[1]) * M_LAT);
const offset = (p, dx, dy) => [p[0] + dx / M_LON(p[1]), p[1] + dy / M_LAT];
const TRAVEL_MPS = 25; // accelerated holographic travel (×18 walking speed), stated in the UI

export function createRuntime({ registry, missions, maxTasks = 140, perMission = 8, keepEvents = 3000 }) {
  const agents = registry.agents, byId = new Map(agents.map(a => [a.id, a]));
  const team = t => agents.filter(a => a.team === `team.${t}` && a.level !== 'team-lead');
  const lead = t => byId.get(`core.san-francisco.${t}.lead`);
  const hub = t => registry.departments.find(d => d.id === t)?.hub.post || [-122.4194, 37.7749];
  const director = agents.find(a => a.level === 'city')?.id;
  const S = { v: VERSION, registry: registry.version, clock: 0, seq: 0, hash: '00000000', events: [], eventCount: 0, missions: {}, busy: {}, rr: {}, move: {}, memory: {}, integrity: 'ok', reasoning: false, jobs: {}, jobSeq: 0 };
  for (const m of missions) S.missions[m.id] = { status: 'open', stage: m.plan[0].stage, tasks: Object.fromEntries(m.plan.map(t => [t.id, { state: 'queued', agents: [], attempts: 0 }])), monitorN: 0, nextMonitor: null, humanInputs: [], modelWork: [], reasonN: 0, nextReason: null, audits: Object.fromEntries((m.audits || []).map(a => [a.id, { cursor: 0, pass: 0, running: [], tallies: {}, checked: 0, seq: 0 }])) };
  const M = new Map(missions.map(m => [m.id, m]));

  function emit(e) {
    const ev = { seq: ++S.seq, t: +S.clock.toFixed(2), ...e }; ev.prev = S.hash; ev.h = S.hash = fnv(S.hash + JSON.stringify({ ...ev, h: undefined }));
    S.events.push(ev); S.eventCount++; if (S.events.length > keepEvents) S.events.splice(0, S.events.length - keepEvents);
    for (const id of new Set([e.from, e.to, ...(e.agents || [])].filter(x => byId.has(x)))) { const m = S.memory[id] ||= { tasks: 0, messages: 0, collaborators: [], errors: 0, reviews: 0, last: null };
      m.last = ev.seq; if (e.kind === 'message') m.messages++; if (e.kind === 'task.done' && e.agents?.includes(id)) m.tasks++; if (e.kind === 'task.failed') m.errors++; if (e.type === 'review' || e.type === 'challenge') m.reviews++;
      for (const o of e.agents || []) if (o !== id && !m.collaborators.includes(o)) { m.collaborators.push(o); if (m.collaborators.length > 24) m.collaborators.shift(); } }
    return ev;
  }
  const where = (m, t, k) => {
    if (Array.isArray(t.at)) return t.at;
    const ms = S.missions[m.id], pick = list => list.length ? list[(ms.monitorN + k + t.id.length) % list.length] : hub(t.team);
    if (t.at === 'pipe') return pick(m.monitor?.sites || []);
    if (t.at === 'flood') return pick((m.findings.find(f => f.id === 'h.flood-exposure')?.sites || []).map(s => s.at));
    if (t.at === 'sites') return pick(m.monitor?.sites || []);
    return hub(t.team || 'administration');
  };
  const recipient = (m, key, from) => key === 'lead' ? m.coordinator : key === 'city' ? director : key === 'council' ? m.council : byId.has(`core.san-francisco.${key}.lead`) ? `core.san-francisco.${key}.lead` : from;
  function candidates(m, t) {
    if (t.agentIds) return t.agentIds.filter(id => byId.has(id));
    if (t.council) return (byId.get(m.council)?.members || []).filter(id => byId.has(id));
    if (t.lead) return [lead(t.team)?.id].filter(Boolean);
    const all = team(t.team), byRole = t.role ? all.filter(a => a.id.includes(`.${t.role}.`) || a.id.includes(`.${t.role}-`)) : [];
    return (byRole.length >= t.n ? byRole : all).map(a => a.id);
  }
  function tryStart(m, tid, t) {
    const free = candidates(m, t).filter(id => !S.busy[id]); if (free.length < Math.min(t.n, candidates(m, t).length || 1) || !free.length) return false;
    const key = `${m.id}:${t.team || 'council'}:${t.role || ''}`, start = (S.rr[key] || 0) % free.length; S.rr[key] = (S.rr[key] || 0) + t.n;
    const chosen = Array.from({ length: Math.min(t.n, free.length) }, (_, i) => free[(start + i) % free.length]), rec = S.missions[m.id].tasks[tid];
    Object.assign(rec, { state: 'running', agents: chosen, start: S.clock, end: S.clock + t.dur, attempts: rec.attempts + 1 });
    const target = where(m, t, 0);
    chosen.forEach((id, i) => { S.busy[id] = `${m.id}#${tid}`; const from = posOf(id), ang = (i / chosen.length) * Math.PI * 2, to = offset(target, Math.cos(ang) * (2.2 + chosen.length * 0.4), Math.sin(ang) * (2.2 + chosen.length * 0.4));
      S.move[id] = { from, to, t0: S.clock, t1: S.clock + Math.min(t.dur * 0.35, Math.max(2, meters(from, to) / TRAVEL_MPS)) }; });
    emit({ kind: 'task.start', mission: m.id, task: tid, stage: t.stage, agents: chosen, at: target, text: B(`${STAGE_EN[t.stage]} · ${chosen.length} agent(s)`, `${t.stage === 'MONITOR' ? 'Surveillance' : STAGE_FR[t.stage]} · ${chosen.length} agent(s)`) });
    return true;
  }
  function finish(m, tid, t) {
    const rec = S.missions[m.id].tasks[tid], from = rec.agents[0] || m.coordinator;
    if (t.fail) { rec.state = 'failed'; rec.reason = t.fail; emit({ kind: 'task.failed', mission: m.id, task: tid, stage: t.stage, agents: rec.agents, text: t.fail }); }
    else { rec.state = 'done'; emit({ kind: 'task.done', mission: m.id, task: tid, stage: t.stage, agents: rec.agents }); }
    for (const [type, to, text, evidence] of t.msgs || []) emit({ kind: 'message', mission: m.id, task: tid, stage: t.stage, type, from, to: recipient(m, to, from), text, evidence: evidence || [], agents: rec.agents });
    for (const id of rec.agents) { delete S.busy[id]; const a = byId.get(id), here = posOf(id), home = a?.post || hub(t.team); S.move[id] = { from: here, to: home, t0: S.clock, t1: S.clock + Math.max(2, Math.min(40, meters(here, home) / TRAVEL_MPS)) }; }
  }
  function stageOf(m) {
    const ms = S.missions[m.id], open = m.plan.find(t => !['done', 'failed', 'cancelled'].includes(ms.tasks[t.id].state));
    return open ? open.stage : m.monitor ? 'MONITOR' : m.plan.at(-1).stage;
  }
  function step(dt) {
    S.clock += dt;
    for(const m of missions) if(S.missions[m.id].paused) {
      for(const r of Object.values(S.missions[m.id].tasks)) if(r.state==='running'){r.start+=dt;r.end+=dt;}
      for(const a of agents.filter(a=>a.mission===m.id)){const mv=S.move[a.id];if(mv){mv.t0+=dt;mv.t1+=dt;}}
    }
    for (const m of missions) for (const t of m.plan) { const r = S.missions[m.id].tasks[t.id]; if (!S.missions[m.id].paused && r.state === 'running' && r.end <= S.clock) finish(m, t.id, t); }
    for (const m of missions) { const ms = S.missions[m.id]; if (ms.monitorTask && ms.monitorTask.state === 'running' && ms.monitorTask.end <= S.clock) finishMonitor(m); }
    let running = Object.values(S.missions).reduce((n, ms) => n + Object.values(ms.tasks).filter(r => r.state === 'running').length + (ms.monitorTask?.state === 'running' ? 1 : 0) + (ms.session?.state === 'running' ? 1 : 0) + Object.values(ms.audits).reduce((k, a) => k + a.running.length, 0), 0);
    for (const m of missions) {
      const ms = S.missions[m.id]; if (ms.paused || ms.status === 'cancelled') continue;
      let mine = Object.values(ms.tasks).filter(r => r.state === 'running').length;
      for (const t of m.plan) {
        if (running >= maxTasks || mine >= (m.maxParallel || perMission)) break;
        const r = ms.tasks[t.id]; if (r.state !== 'queued') continue;
        if ((t.after || []).some(d => !(t.requiresSuccess ? ['done'] : ['done', 'failed']).includes(ms.tasks[d].state))) continue;
        if (tryStart(m, t.id, t)) { running++; mine++; }
      }
      const stage = stageOf(m);
      if (stage !== ms.stage) { ms.stage = stage; emit({ kind: 'stage', mission: m.id, stage, text: B(`Stage: ${STAGE_EN[stage]}`, `Étape : ${STAGE_FR[stage]}`) }); }
      const planDone = m.plan.every(t => ['done', 'failed', 'cancelled'].includes(ms.tasks[t.id].state));
      if (planDone && ms.status === 'open') { ms.status = m.plan.some(t => t.stage === 'HUMAN_REVIEW') ? 'awaiting-human' : m.findings.every(f => f.status === 'gap') ? 'gap' : 'monitoring'; ms.nextMonitor = S.clock + 5;
        emit({ kind: 'mission.state', mission: m.id, text: { 'awaiting-human': B('Dossier ready: awaiting human review (no verified human reviewer exists)', 'Dossier prêt, en attente d’une revue humaine (aucun relecteur humain vérifié)'), gap: B('Declared gap: team waiting for data', 'Lacune déclarée : équipe en attente de données'), monitoring: B('Finding added to the dossier, monitoring', 'Constat versé au dossier : surveillance') }[ms.status] }); }
      if (planDone && m.monitor && ms.status !== 'gap' && ms.status !== 'cancelled' && !ms.monitorTask?.state?.match(/running/) && S.clock >= (ms.nextMonitor ?? Infinity) && running < maxTasks) { if (startMonitor(m)) running++; }
      // V8 — bounded reasoning cycles with the shared local-model pool (only when the person switched it on).
      // Budget: flagship missions only, at most 2 outstanding jobs city-wide (one local worker answers in ~15–45 s).
      const outstanding = Object.values(S.jobs).filter(j => ['pending', 'running'].includes(j.state)).length;
      if (planDone && S.reasoning && m.flagship && outstanding < 2 && ms.status !== 'cancelled' && !Object.values(S.jobs).some(j => j.mission === m.id && ['pending', 'running'].includes(j.state)) && S.clock >= (ms.nextReason ?? 0) && running < maxTasks) startReasoning(m);
      for (const j of Object.values(S.jobs)) if (j.mission === m.id && ['pending', 'running'].includes(j.state) && S.clock - j.createdAt > 3600) { j.state = 'expired'; delete S.busy[j.agent]; emit({ kind: 'message', mission: m.id, task: j.id, stage: 'REASON', type: 'status', from: j.agent, to: m.coordinator, agents: [j.agent], text: B(`Reasoning task expired (no local model answered): ${REASON_EN[j.kind]}.`, `Tâche de raisonnement expirée (aucun modèle local n’a répondu) : ${REASON_FR[j.kind]}.`), evidence: [] }); }
      // Council sessions: after the dossier, the mission council meets periodically to review the latest audit passes and
      // human contributions. Its output states what changed; it never closes a dispute by itself.
      if (planDone && m.sessions && ms.status !== 'cancelled') {
        if (ms.session?.state === 'running' && ms.session.end <= S.clock) finishSession(m);
        else if (!(ms.session?.state === 'running') && S.clock >= (ms.nextSession ?? (ms.nextSession = S.clock + 10)) && running < maxTasks && startSession(m)) running++;
      }
      // Record-by-record audits, once the mission's evidence has been retrieved.
      const retrieved = m.plan.filter(t => t.stage === 'RETRIEVE').every(t => ['done', 'failed'].includes(ms.tasks[t.id].state));
      if (retrieved && ms.status !== 'cancelled') for (const a of m.audits || []) {
        const st = ms.audits[a.id]; if (!a.items.length) continue;
        for (const r of st.running.filter(r => r.end <= S.clock)) finishAudit(m, a, st, r);
        const lanes = st.pass === 0 ? a.lanes : Math.max(1, Math.ceil(a.lanes / 3));
        while (st.running.length < lanes && running < maxTasks) { if (!startAudit(m, a, st)) break; running++; }
      }
      // Human inputs are triaged by the research team (no automatic acceptance).
      for (const h of ms.humanInputs) if (h.state === 'reçue' && running < maxTasks) { const t = { id: `triage-${h.id}`, stage: 'COLLABORATE', team: 'research', role: 'sources', n: 1, at: 'hub', dur: 12 };
        const free = candidates(m, t).find(id => !S.busy[id]); if (!free) continue; h.state = 'en revue'; h.by = free; h.reviewAt = S.clock;
        emit({ kind: 'message', mission: m.id, task: t.id, stage: 'COLLABORATE', type: 'review-request', from: free, to: m.council, agents: [free], text: B(`Human contribution “${h.title}” passed to the council as ${h.kind === 'evidence' ? 'evidence to check' : 'a hypothesis to examine'}; no automatic validation, no verified human reviewer yet.`, `Contribution humaine « ${h.title} » transmise au conseil comme ${h.kind === 'evidence' ? 'preuve à vérifier' : 'hypothèse à examiner'} ; aucune validation automatique, aucun relecteur humain vérifié pour l’instant.`), evidence: [] }); }
      // V8: after 30 runtime seconds in review, a deterministic FORM check (sources, numbers, overclaims, personal data,
      // relation to the findings). The outcome is reported to the person; nothing is accepted automatically.
      for (const h of ms.humanInputs) if (h.state === 'en revue' && S.clock - (h.reviewAt ?? S.clock) >= 30) {
        h.evaluation = evaluateContribution(h, m.findings); h.state = h.evaluation.outcome === 'to-investigate' ? 'en attente de revue humaine' : 'évaluée';
        emit({ kind: 'message', mission: m.id, task: `triage-${h.id}`, stage: 'COLLABORATE', type: 'review', from: h.by, to: 'human:local', agents: [h.by], text: B(`Contribution “${h.title}”: ${tx(h.evaluation.label, 'en')}.${h.evaluation.related.length ? ` Related findings: ${h.evaluation.related.join(', ')}.` : ''} Automatic form check; not a validation.`, `Contribution « ${h.title} » : ${tx(h.evaluation.label, 'fr')}.${h.evaluation.related.length ? ` Constats liés : ${h.evaluation.related.join(', ')}.` : ''} Contrôle de forme automatique ; pas une validation.`), evidence: h.evaluation.related });
      }
    }
  }
  function startAudit(m, a, st) {
    const pool = team(a.team).map(x => x.id).filter(id => !S.busy[id]); if (!pool.length) return false;
    const key = `${m.id}:audit:${a.id}`, k = S.rr[key] || 0; S.rr[key] = k + 1; const id = pool[k % pool.length];
    const items = Array.from({ length: Math.min(a.batch, a.items.length) }, (_, i) => a.items[(st.cursor + i) % a.items.length]); st.cursor += items.length;
    const r = { id: `audit:${a.id}:${++st.seq}`, agent: id, items, end: S.clock + 14 + 5 * items.length }; st.running.push(r);
    S.busy[id] = `${m.id}#${r.id}`; const from = posOf(id), to = offset(items[0].at, 1.5, 0); S.move[id] = { from, to, t0: S.clock, t1: S.clock + Math.min(12, Math.max(2, meters(from, to) / TRAVEL_MPS)) };
    emit({ kind: 'task.start', mission: m.id, task: r.id, stage: 'ANALYZE', agents: [id], at: items[0].at, text: B(`${tx(a.label, 'en')} · ${items.length} record(s)`, `${tx(a.label, 'fr')} · ${items.length} fiche(s)`) });
    return true;
  }
  function finishAudit(m, a, st, r) {
    st.running = st.running.filter(x => x !== r); delete S.busy[r.agent];
    for (const it of r.items) { const k = tx(it.flag, 'en'); st.tallies[k] = (st.tallies[k] || 0) + 1; (st.flagText ||= {})[k] = it.flag; st.checked++; }
    emit({ kind: 'message', mission: m.id, task: r.id, stage: 'ANALYZE', type: 'analysis', from: r.agent, to: m.coordinator, agents: [r.agent], text: B(`${tx(a.label, 'en')}: ${r.items.map(i => tx(i.note, 'en')).join('; ')}.`, `${tx(a.label, 'fr')} : ${r.items.map(i => tx(i.note, 'fr')).join(' ; ')}.`), evidence: [] });
    const here = posOf(r.agent), home = byId.get(r.agent).post; S.move[r.agent] = { from: here, to: home, t0: S.clock, t1: S.clock + Math.max(2, Math.min(30, meters(here, home) / TRAVEL_MPS)) };
    if (st.cursor >= a.items.length * (st.pass + 1)) { st.pass++;
      emit({ kind: 'message', mission: m.id, task: r.id, stage: 'DOSSIER', type: 'dossier-update', from: m.coordinator, to: m.council, agents: [], text: B(`${tx(a.label, 'en')} · pass ${st.pass} complete (${a.items.length} records): ${Object.entries(st.tallies).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${n} “${f}”`).join(', ')}.`, `${tx(a.label, 'fr')} · passe ${st.pass} terminée (${a.items.length} fiches) : ${Object.entries(st.tallies).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${n} « ${tx(st.flagText?.[f], 'fr') || f} »`).join(', ')}.`), evidence: [] });
      st.lastTallies = st.tallies; st.tallies = {}; }
  }
  const byRole = (team, role) => agents.filter(a => a.team === `team.${team}` && a.teamRole === role && !S.busy[a.id]);
  function startReasoning(m) {
    const ms = S.missions[m.id], kind = REASON_KINDS[ms.reasonN % REASON_KINDS.length], home = byId.get(m.coordinator)?.department;
    const pool = kind === 'critique' ? byRole('safety', 'skeptical-reviewer').concat(byRole(home, 'skeptical-reviewer')) : byRole(home, kind === 'gaps' ? 'researcher' : 'scientific-analyst').concat(byRole('research', kind === 'gaps' ? 'researcher' : 'scientific-analyst'));
    const agent = pool[ms.reasonN % Math.max(1, pool.length)]; if (!agent) return false;
    const lastHyp = [...ms.modelWork].reverse().find(w => w.kind === 'hypothesis' && w.status === 'validé')?.output?.hypotheses?.[0];
    const id = `job-${++S.jobSeq}`; S.jobs[id] = { id, kind, mission: m.id, agent: agent.id, state: 'pending', createdAt: S.clock, target: kind === 'critique' ? (lastHyp ? { title: lastHyp.title, statement: lastHyp.statement, source: 'modèle' } : { title: m.hypotheses[0]?.title, statement: m.hypotheses[0]?.statement, source: m.hypotheses[0]?.id }) : null };
    ms.reasonN++; S.busy[agent.id] = `${m.id}#reason:${id}`;
    emit({ kind: 'task.start', mission: m.id, task: id, stage: 'REASON', agents: [agent.id], at: agent.post, text: B(`Reasoning (local model, shared queue) · ${REASON_EN[kind]}`, `Raisonnement (modèle local, file partagée) · ${REASON_FR[kind]}`) });
    return true;
  }
  function pendingJobs() { return Object.values(S.jobs).filter(j => j.state === 'pending'); }
  function markJobRunning(id) { const j = S.jobs[id]; if (j && j.state === 'pending') { j.state = 'running'; j.startedAt = S.clock; } }
  function completeJob(id, res) {
    const j = S.jobs[id]; if (!j || !['pending', 'running'].includes(j.state)) return false;
    const m = M.get(j.mission), ms = S.missions[j.mission]; j.state = res.ok ? 'done' : 'rejected'; delete S.busy[j.agent];
    const w = { id, kind: j.kind, agent: j.agent, status: res.ok ? 'validé' : 'rejeté', output: res.output || null, issues: res.issues || [], ms: res.entry?.ms ?? null, tokens: res.entry?.tokens ?? null, model: res.entry?.model ?? null, target: j.target, at: S.clock };
    ms.modelWork.push(w); if (ms.modelWork.length > 30) ms.modelWork.shift();
    // Model output is kept in the language the model wrote it in (English prompts); only the frame is translated.
    const o = res.output || {}, issues = (res.issues || []).slice(0, 2).join('; '), body = j.kind === 'gaps' ? (o.questions || []).map(q => q.question).join(' / ') : j.kind === 'hypothesis' ? (o.hypotheses || []).map(h => `${h.title} · ${h.statement}`).join(' / ') : (o.objections || []).map(x => x.text).join(' / ');
    const text = !res.ok ? B(`Local-model proposal rejected by validation (${issues}).`, `Proposition du modèle local écartée par la validation (${issues}).`)
      : j.kind === 'gaps' ? B(`Missing evidence proposed: ${body}`, `Preuves manquantes proposées (texte du modèle, non traduit) : ${body}`)
      : j.kind === 'hypothesis' ? B(`Hypothesis(es) proposed, not reviewed: ${body}`, `Hypothèse(s) proposée(s), non revue(s) (texte du modèle, non traduit) : ${body}`)
      : B(`Objections to “${tx(j.target?.title, 'en')}”: ${body}`, `Objections à « ${tx(j.target?.title, 'fr')} » (texte du modèle, non traduit) : ${body}`);
    emit({ kind: 'message', mission: j.mission, task: id, stage: 'REASON', type: 'model-proposal', from: j.agent, to: j.kind === 'critique' ? m.council : m.coordinator, agents: [j.agent], text, evidence: j.kind === 'gaps' ? [...new Set((o.questions || []).flatMap(q => q.related || []))] : j.kind === 'hypothesis' ? [...new Set((o.hypotheses || []).flatMap(h => h.supports || []))] : [], model: true, validated: !!res.ok });
    ms.nextReason = S.clock + 45; return true;
  }
  const setReasoning = on => { S.reasoning = !!on; };
  function startSession(m) {
    const ms = S.missions[m.id], members = (byId.get(m.council)?.members || []).filter(id => !S.busy[id]); if (members.length < 3) return false;
    const n = (ms.sessionN = (ms.sessionN || 0) + 1), chosen = members.slice(0, 6), at = m.sessions.at;
    ms.session = { id: `session-${n}`, state: 'running', agents: chosen, end: S.clock + m.sessions.dur };
    chosen.forEach((id, i) => { S.busy[id] = `${m.id}#${ms.session.id}`; const from = posOf(id), ang = (i / chosen.length) * Math.PI * 2, to = offset(at, Math.cos(ang) * 3.4, Math.sin(ang) * 3.4); S.move[id] = { from, to, t0: S.clock, t1: S.clock + Math.min(14, Math.max(2, meters(from, to) / TRAVEL_MPS)) }; });
    emit({ kind: 'task.start', mission: m.id, task: ms.session.id, stage: 'CRITIQUE', agents: chosen, at, text: B(`Mission council session ${n} · ${chosen.length} members`, `Séance ${n} du conseil de mission · ${chosen.length} membres`) }); return true;
  }
  function finishSession(m) {
    const ms = S.missions[m.id], r = ms.session; r.state = 'done';
    const lab = (id, c) => tx(m.audits.find(x => x.id === id)?.label, c) || id;
    const passes = c => Object.entries(ms.audits).map(([id, a]) => c === 'fr' ? `${lab(id, c)} : ${a.pass} passe(s), ${a.checked} fiche(s)` : `${lab(id, c)}: ${a.pass} pass(es), ${a.checked} record(s)`).join(c === 'fr' ? ' ; ' : '; ');
    const pending = ms.humanInputs.filter(h => h.state !== 'clôturée').length;
    emit({ kind: 'message', mission: m.id, task: r.id, stage: 'CRITIQUE', type: 'review', from: m.coordinator, to: m.council, agents: r.agents,
      text: B(`Council session: ${passes('en') || 'no audit'}. Hypotheses kept open (no new data separates them); ${pending} human contribution(s) in the queue; the dossier still awaits human review.`, `Séance du conseil : ${passes('fr') || 'aucun audit'}. Hypothèses maintenues ouvertes (aucune donnée nouvelle ne les départage) ; ${pending} contribution(s) humaine(s) en file ; dossier toujours en attente de revue humaine.`), evidence: [] });
    for (const id of r.agents) { delete S.busy[id]; const here = posOf(id), home = byId.get(id).post || hub(byId.get(id).department); S.move[id] = { from: here, to: home, t0: S.clock, t1: S.clock + Math.max(2, Math.min(30, meters(here, home) / TRAVEL_MPS)) }; }
    ms.nextSession = S.clock + m.sessions.every;
  }
  function startMonitor(m) {
    const ms = S.missions[m.id], t = { id: `monitor-${ms.monitorN + 1}`, stage: 'MONITOR', team: m.monitor.team, n: 2, at: m.monitor.sites.length ? 'sites' : 'hub', dur: 22 };
    const free = candidates(m, t).filter(id => !S.busy[id]); if (free.length < 2) return false;
    ms.monitorN++; const key = `${m.id}:monitor`, k = (S.rr[key] || 0); S.rr[key] = k + 2; const chosen = [free[k % free.length], free[(k + 1) % free.length]];
    const target = where(m, t, ms.monitorN);
    ms.monitorTask = { id: t.id, state: 'running', agents: chosen, start: S.clock, end: S.clock + t.dur };
    chosen.forEach((id, i) => { S.busy[id] = `${m.id}#${t.id}`; const from = posOf(id), to = offset(target, i ? 2.5 : -2.5, 1); S.move[id] = { from, to, t0: S.clock, t1: S.clock + Math.min(8, Math.max(2, meters(from, to) / TRAVEL_MPS)) }; });
    emit({ kind: 'task.start', mission: m.id, task: t.id, stage: 'MONITOR', agents: chosen, at: target, text: B('Monitoring: 2 agent(s)', 'Surveillance: 2 agent(s)') }); return true;
  }
  function finishMonitor(m) {
    const ms = S.missions[m.id], r = ms.monitorTask; r.state = 'done';
    emit({ kind: 'message', mission: m.id, task: r.id, stage: 'MONITOR', type: 'status', from: r.agents[0], to: m.coordinator, agents: r.agents, text: m.monitor.text, evidence: [] });
    for (const id of r.agents) { delete S.busy[id]; const a = byId.get(id), here = posOf(id); S.move[id] = { from: here, to: a.post, t0: S.clock, t1: S.clock + Math.max(2, Math.min(40, meters(here, a.post) / TRAVEL_MPS)) }; }
    ms.nextMonitor = S.clock + m.monitor.every;
  }
  function posOf(id) {
    const mv = S.move[id], a = byId.get(id);
    if (!mv) return a?.post || hub(a?.department || 'administration');
    if (S.clock >= mv.t1) return mv.to; const k = Math.max(0, (S.clock - mv.t0) / (mv.t1 - mv.t0)), e = k * k * (3 - 2 * k);
    return [mv.from[0] + (mv.to[0] - mv.from[0]) * e, mv.from[1] + (mv.to[1] - mv.from[1]) * e];
  }
  function activity(id) {
    const key = S.busy[id], a = byId.get(id);
    if (!key) { const mv = S.move[id]; return { state: mv && S.clock < mv.t1 ? 'returning' : 'idle', label: mv && S.clock < mv.t1 ? B('returning to its virtual post', 'regagne son poste virtuel') : B('idle, no task in progress', 'inactif : aucune tâche en cours'), mission: null }; }
    const [mid, tid] = key.split('#'), m = M.get(mid), mv = S.move[id];
    if (tid.startsWith('reason:')) { const j = S.jobs[tid.slice(7)]; return { state: 'reasoning', label: B(`reasoning with the local model · ${REASON_EN[j?.kind] || ''} (${j?.state === 'running' ? 'running' : 'queued'})`, `raisonne avec le modèle local · ${REASON_FR[j?.kind] || ''} (${j?.state === 'running' ? 'en cours' : 'en file'})`), mission: mid, task: tid, stage: 'REASON', role: byId.get(id)?.role }; }
    if (tid.startsWith('audit:')) { const a = (m.audits || []).find(x => x.id === tid.split(':')[1]); return { state: mv && S.clock < mv.t1 ? 'travelling' : 'inspecting', label: mv && S.clock < mv.t1 ? B(`going to the record’s location · ${tx(a?.label, 'en')}`, `se rend sur le lieu de la fiche · ${tx(a?.label, 'fr')}`) : B(`checking records · ${tx(a?.label, 'en')}`, `vérifie des fiches · ${tx(a?.label, 'fr')}`), mission: mid, task: tid, stage: 'ANALYZE', role: a ? byId.get(id)?.role : null }; }
    const t = m.plan.find(x => x.id === tid) || (tid.startsWith('session-') ? { stage: 'CRITIQUE', council: true } : { stage: 'MONITOR' });
    const moving = mv && S.clock < mv.t1, meeting = !!t.council || ['FORMULATE', 'COLLABORATE', 'CRITIQUE', 'DOSSIER'].includes(t.stage);
    return { state: moving ? 'travelling' : meeting ? 'meeting' : t.at === 'pipe' || t.at === 'flood' || t.at === 'sites' || t.stage === 'MONITOR' ? 'inspecting' : 'working',
      label: moving ? B(`going to the work location (${STAGE_EN[t.stage]})`, `se rend au lieu de travail (${STAGE_FR[t.stage]})`) : B(`${ACT_EN[t.stage]} · ${tx(m.title, 'en')}`, `${ACT[t.stage]} · ${tx(m.title, 'fr')}`), mission: mid, task: tid, stage: t.stage, role: a?.role };
  }
  function cancel(missionId, reason = 'cancelled') {
    const m = M.get(missionId), ms = S.missions[missionId]; if (!ms || ms.status === 'cancelled') return false;
    for (const t of m.plan) { const r = ms.tasks[t.id]; if (r.state === 'running') for (const id of r.agents) delete S.busy[id]; if (['queued', 'running'].includes(r.state)) r.state = 'cancelled'; }
    if (ms.monitorTask?.state === 'running') { for (const id of ms.monitorTask.agents) delete S.busy[id]; ms.monitorTask.state = 'cancelled'; }
    if (ms.session?.state === 'running') { for (const id of ms.session.agents) delete S.busy[id]; ms.session.state = 'cancelled'; }
    for (const st of Object.values(ms.audits)) { for (const r of st.running) delete S.busy[r.agent]; st.running = []; }
    ms.status = 'cancelled'; emit({ kind: 'mission.state', mission: missionId, text: B(`Mission cancelled: ${reason}`, `Mission annulée : ${reason}`) }); return true;
  }
  function submitHumanInput(missionId, { kind, title, text, consent }) {
    if (!consent) throw Error('explicit consent required to share a contribution with the mission (consentement explicite requis)');
    if (!['observation', 'hypothesis', 'evidence', 'question', 'challenge'].includes(kind)) throw Error('unknown contribution type');
    const ms = S.missions[missionId]; if (!ms) throw Error('unknown mission');
    const h = { id: `h${ms.humanInputs.length + 1}`, kind, title: String(title || '').slice(0, 120), text: String(text || '').slice(0, 1000), state: 'reçue', at: S.clock };
    ms.humanInputs.push(h); emit({ kind: 'message', mission: missionId, type: 'human-input', from: 'human:local', to: M.get(missionId).council, text: B(`${{ observation: 'Observation', hypothesis: 'Hypothesis', evidence: 'Evidence', question: 'Question', challenge: 'Challenge' }[kind]} proposed by a person: “${h.title}”`, `${{ observation: 'Observation', hypothesis: 'Hypothèse', evidence: 'Preuve', question: 'Question', challenge: 'Contestation' }[kind]} proposée par une personne : « ${h.title} »`), evidence: [] });
    return h;
  }
  // V9: a visitor-triggered investigation (src/intelligence/investigate.mjs) is recorded in the mission log, one typed
  // message per step, with its provenance. Model-written text is flagged (model: true) and kept in English.
  function recordInvestigation(missionId, res) {
    const m = M.get(missionId); if (!m || !res?.steps) return 0; const id = `inv-${S.seq + 1}`; let n = 0;
    const TYPE = { coordinator: 'request', evidence: 'evidence', simulation: 'analysis', analyst: 'analysis', critic: 'challenge', synthesis: 'dossier-update' };
    for (const st of res.steps) {
      const from = st.agent && byId.has(st.agent) ? st.agent : m.coordinator, o = st.output || {};
      const body = st.status === 'unavailable' ? B('Local AI reasoning is unavailable; this step did not run.', 'Le raisonnement local par IA est indisponible ; cette étape n’a pas été exécutée.')
        : st.role === 'coordinator' ? B(`Sub-questions: ${(o.subquestions || []).map(q => q.question).join(' / ')}`, `Sous-questions (texte du modèle, en anglais) : ${(o.subquestions || []).map(q => q.question).join(' / ')}`)
        : st.role === 'evidence' ? B(`Retrieved ${(o.findings || []).length} finding(s) and ${(o.gaps || []).length} declared gap(s) (deterministic retrieval).`, `${(o.findings || []).length} constat(s) et ${(o.gaps || []).length} lacune(s) récupérés (recherche déterministe).`)
        : st.role === 'simulation' ? (o.scenarios ? B(`Read the recorded SUMO results for ${o.scenarios.length} scenarios (uncalibrated).`, `Lecture des résultats SUMO enregistrés pour ${o.scenarios.length} scénarios (non calibrés).`) : B('No simulation exists for this mission.', 'Aucune simulation n’existe pour cette mission.'))
        : st.role === 'analyst' ? B(`Analysis: ${(o.points || []).map(p => p.text).join(' / ')}`, `Analyse (texte du modèle, en anglais) : ${(o.points || []).map(p => p.text).join(' / ')}`)
        : st.role === 'critic' && st.tool === 'verifier' ? B(o.issues?.length ? `Verifier flagged: ${o.issues.join('; ')}` : 'Verifier: no unsupported number or overclaim found.', o.issues?.length ? `Le vérificateur signale : ${o.issues.join(' ; ')}` : 'Vérificateur : aucun chiffre non étayé ni affirmation excessive.')
        : st.role === 'critic' ? B(`Objections: ${(o.objections || []).map(x => x.text).join(' / ')}`, `Objections (texte du modèle, en anglais) : ${(o.objections || []).map(x => x.text).join(' / ')}`)
        : B(`Draft synthesis (unreviewed): ${o.summary || ''}`, `Synthèse provisoire, non revue (texte du modèle, en anglais) : ${o.summary || ''}`);
      const status = st.status === 'rejected' ? B(`: rejected by validation (${(st.issues || []).join('; ')})`, ` : écartée par la validation (${(st.issues || []).join(' ; ')})`) : B('', '');
      emit({ kind: 'message', mission: missionId, task: id, stage: st.role === 'critic' ? 'CRITIQUE' : st.role === 'synthesis' ? 'DOSSIER' : st.role === 'simulation' ? 'SIMULATE' : st.role === 'evidence' ? 'RETRIEVE' : 'ANALYZE', type: TYPE[st.role], from, to: st.role === 'synthesis' ? m.council : m.coordinator, agents: [from],
        text: B(`${body.en}${status.en}`, `${body.fr}${status.fr}`), evidence: st.role === 'evidence' ? (o.findings || []).map(f => f.id) : st.role === 'analyst' ? [...new Set((o.points || []).flatMap(p => p.cites || []))] : [], model: st.provenance === 'local-model' && st.status !== 'unavailable', validated: st.status === 'validated', investigation: id });
      n++;
    }
    (S.missions[missionId].investigations ||= []).push({ id, question: res.question, at: S.clock, runtime: res.runtime, model: res.model, answer: res.answer }); return n;
  }
  function setMissionPaused(id, value) {
    if(!M.get(id)?.optional) throw Error('Mission does not support isolated activity controls');
    S.missions[id].paused=!!value;
  }
  function restartMission(id) {
    const m=M.get(id);if(!m?.optional)throw Error('Mission does not support scenario revisions');
    const ms=S.missions[id];
    for(const t of m.plan){for(const agent of ms.tasks[t.id].agents){delete S.busy[agent];const p=posOf(agent);S.move[agent]={from:p,to:p,t0:S.clock,t1:S.clock};}ms.tasks[t.id]={state:'queued',agents:[],attempts:0};}
    ms.revision=(ms.revision||0)+1;ms.status='open';ms.stage=m.plan[0].stage;
    emit({kind:'scenario.revised',mission:id,revision:ms.revision,text:B('Synthetic scenario revised; modeled tasks queued again, prior history retained','Scénario synthétique révisé ; tâches modélisées relancées, historique conservé')});
  }
  const serialize = () => JSON.stringify(S);
  function restore(json) {
    const o = JSON.parse(json); if (o.v !== VERSION || o.registry !== registry.version || Object.keys(o.missions).some(id=>!M.has(id)) || missions.some(m=>!m.optional&&!o.missions[m.id])) return false;
    let prev = o.events[0]?.prev ?? '00000000', ok = true;
    for (const e of o.events) { const h = fnv(prev + JSON.stringify({ ...e, h: undefined })); if (e.prev !== prev || e.h !== h) { ok = false; break; } prev = e.h; }
    o.missions={...S.missions,...o.missions}; Object.assign(S, o); S.integrity = ok ? 'ok' : 'broken'; return true;
  }
  const verify = () => { let prev = S.events[0]?.prev ?? '00000000'; for (const e of S.events) { if (e.prev !== prev || e.h !== fnv(prev + JSON.stringify({ ...e, h: undefined }))) return false; prev = e.h; } return true; };
  function summary() {
    const act = agents.filter(a => a.city === 'san-francisco').map(a => activity(a.id).state);
    const count = s => act.filter(x => x === s).length;
    return { registered: agents.length, sanFrancisco: act.length, busy: Object.keys(S.busy).length, reasoning: count('reasoning'), jobs: Object.values(S.jobs).reduce((m, j) => (m[j.state] = (m[j.state] || 0) + 1, m), {}), travelling: count('travelling'), meeting: count('meeting'), inspecting: count('inspecting'), working: count('working'), idle: count('idle') + count('returning'),
      missions: missions.map(m => ({ id: m.id, title: m.title, stage: S.missions[m.id].stage, status: S.missions[m.id].status, flagship: !!m.flagship })), events: S.eventCount, clock: S.clock };
  }
  return { S, step, posOf, activity, setMissionPaused, restartMission, cancel, submitHumanInput, recordInvestigation, serialize, restore, verify, summary, missions, M, byId, agents, setReasoning, pendingJobs, markJobRunning, completeJob };
}
