// CORE — multi-agent mission orchestration (Phase 3).
// A mission: receive question/event → identify domains → select qualified executable agents → assign bounded
// tasks → retrieve evidence → share findings → detect disagreements → run evaluators → independent adversarial
// review → sourced conclusion → mission gateway (fail closed) → human review. Real state transitions, bounded
// concurrency, timeouts, retries, cancellation, logs. Deterministic content is reproducible (fingerprint).
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const C = isNode ? require('./coord.js') : root.CORE_COORD;
  const ORG = isNode ? require('./org.js') : root.CORE_ORG;
  const T = isNode ? require('./tools.js') : root.CORE_TOOLS;
  const F = isNode ? require('./feeds.js') : root.CORE_FEEDS;
  const CI = isNode ? require('./city-agents.js') : root.CORE_CITY;

  const STATES = ['received', 'planning', 'assigned', 'running', 'reviewing', 'concluded', 'needs-human-review', 'needs-evidence', 'rejected', 'failed', 'cancelled'];
  const TASK_STATES = ['queued', 'running', 'succeeded', 'failed', 'retrying', 'timed-out', 'cancelled', 'denied'];
  const DECISION = CI.STATES;
  const DEFAULT_OPTS = { concurrency: 3, retries: 1, timeoutMs: 4000 };
  const SEGMENT_DOMAINS = ['infrastructure', 'nature', 'buildings', 'energy', 'public_space'];

  // ---------- Planning (city manager: coordination, no factual authority) ----------
  const segLabel = (env, seg) => { const f = env.ctx.segments.get(seg); return f ? `${f.properties.street} ${f.properties.from} → ${f.properties.to}` : `le tronçon ${seg}`; };
  function originToMission(origin, env) {
    if (origin.type === 'suggestion') {
      const s = origin.suggestion, it = env.feeds.items.find(i => i.id === s.item);
      return { type: s.type, segment: s.segment || null, item: s.item, question: s.type === 'corridor-change' ? `Que change « ${it ? it.title : s.item} » pour ${segLabel(env, s.segment)} ?` : it ? `Contexte de « ${it.title} » pour la ville` : s.reason, domains: it ? it.domains : [] };
    }
    if (origin.type === 'question') return { type: 'question', segment: origin.segment || null, item: null, question: String(origin.text || '').slice(0, 300), domains: F.classify(origin.text) };
    throw new TypeError('origine de mission inconnue');
  }
  function plan(registry, m) {
    const idx = ORG.index(registry), domains = [...new Set([...(m.domains || []), ...(m.segment ? SEGMENT_DOMAINS : [])])].sort();
    const independent = new Set(['evidence.verify', 'adversarial.review', 'decision.gateway', 'mission.plan']);
    const picked = new Map(); // tool → agent (first qualified, deterministic order)
    for (const a of registry.agents) {
      if (a.executionMode !== 'deterministic' || a.status !== 'available') continue;
      for (const t of a.tools) {
        if (independent.has(t) || picked.has(t) || !T.TOOLS[t] || !T.TOOLS[t].applies(m)) continue;
        const deptDomains = (registry.departments.find(d => d.id === a.department) || { domains: [] }).domains;
        const relevant = !deptDomains.length || deptDomains.some(d => domains.includes(d)) || t === 'graph.link' || t === 'knowledge.retrieve';
        if (relevant) picked.set(t, a);
      }
    }
    const byTool = t => (idx.byTool.get(t) || [])[0];
    const unavailable = registry.agents.filter(a => a.executionMode === 'unavailable' && (registry.departments.find(d => d.id === a.department) || { domains: [] }).domains.some(d => domains.includes(d)))
      .map(a => ({ agent: a.id, role: a.role, gap: a.gap }));
    return { domains, manager: `core.${registry.city.id}.manager`, specialists: [...picked].map(([tool, a]) => ({ tool, agent: a.id })),
      verifier: byTool('evidence.verify') && byTool('evidence.verify').id, reviewer: byTool('adversarial.review') && byTool('adversarial.review').id, gateway: byTool('decision.gateway') && byTool('decision.gateway').id, unavailable };
  }

  // ---------- Execution ----------
  function newMission(origin, env, opts = {}) {
    const m = originToMission(origin, env);
    return { id: `mission:${C.fingerprint({ origin, asOf: env.ctx.asOf }).slice(0, 12)}`, version: 'core-mission-v1', origin, state: 'received', target: m, plan: null, tasks: [], findings: [], verification: [], disagreements: [], adversarial: null, conclusion: null, decision: null, log: [], opts: { ...DEFAULT_OPTS, ...opts }, cancelled: false };
  }
  function cancel(mission) { mission.cancelled = true; }

  const logger = (mission, t0, onEvent) => (kind, data) => { const e = { seq: mission.log.length + 1, t: Date.now() - t0, kind, ...data }; mission.log.push(e); if (onEvent) onEvent(e, mission); return e; };

  function runTool(env, agent, tool, target) {
    const def = T.TOOLS[tool];
    if (!def) throw new Error(`outil inconnu ${tool}`);
    if (!ORG.canUse(agent, tool, def.permission)) { const e = new Error(`permission refusée : ${agent.id} → ${tool}`); e.denied = true; throw e; }
    const norm = out => ({ ...out, findings: out.findings.map(f => ({ ...f, agent: agent.id, tool })) });
    const out = def.run(env, target, agent);
    return out && typeof out.then === 'function' ? out.then(norm) : norm(out); // async tools (e.g. a future model provider) are supported
  }

  async function run(mission, env, { onEvent, registry } = {}) {
    const t0 = Date.now(), log = logger(mission, t0, onEvent), o = mission.opts, idx = ORG.index(registry);
    const set = s => { mission.state = s; log('mission', { state: s, text: `Mission → ${s}` }); };
    try {
      set('planning');
      mission.plan = plan(registry, mission.target);
      log('plan', { agent: mission.plan.manager, text: `Domaines : ${mission.plan.domains.join(', ')} ; ${mission.plan.specialists.length} spécialiste(s) exécutable(s) recruté(s) ; ${mission.plan.unavailable.length} profil(s) pertinent(s) indisponible(s) (pas d’outil ou de données).` });
      mission.tasks = mission.plan.specialists.map((s, i) => ({ id: `task-${i + 1}`, agent: s.agent, tool: s.tool, state: 'queued', attempts: 0, ms: 0, records: 0, error: null, findings: [] }));
      set('assigned');
      for (const t of mission.tasks) log('task', { task: t.id, agent: t.agent, tool: t.tool, state: 'queued', text: `${t.agent} ← ${t.tool}` });
      set('running');
      // bounded worker pool
      const queue = [...mission.tasks];
      const worker = async () => {
        while (queue.length) {
          const t = queue.shift();
          if (mission.cancelled) { t.state = 'cancelled'; log('task', { task: t.id, agent: t.agent, state: 'cancelled', text: 'annulée' }); continue; }
          for (;;) {
            t.attempts++; t.state = 'running'; log('task', { task: t.id, agent: t.agent, tool: t.tool, state: 'running', text: `exécution (tentative ${t.attempts})` });
            const s = Date.now();
            try {
              await new Promise(r => setTimeout(r, 0)); // yield: keeps the UI responsive and cancellation effective
              if (mission.cancelled) throw Object.assign(new Error('annulée'), { cancelled: true });
              const out = await Promise.race([Promise.resolve().then(() => runTool(env, idx.byId.get(t.agent), t.tool, { ...mission.target, question: mission.target.question })),
                new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(`délai dépassé (${o.timeoutMs} ms)`), { timeout: true })), o.timeoutMs))]);
              t.ms += Date.now() - s; t.records = out.records; t.findings = out.findings; t.extra = { brief: out.brief || null, decision: out.decision || null };
              t.state = 'succeeded'; log('task', { task: t.id, agent: t.agent, tool: t.tool, state: 'succeeded', text: `${out.findings.length} constat(s), ${out.records} enregistrement(s), ${Date.now() - s} ms` });
              break;
            } catch (err) {
              t.ms += Date.now() - s; t.error = String(err.message || err);
              t.state = err.denied ? 'denied' : err.cancelled ? 'cancelled' : err.timeout ? 'timed-out' : 'failed';
              log('task', { task: t.id, agent: t.agent, tool: t.tool, state: t.state, text: t.error });
              if (err.denied || err.cancelled || t.attempts > o.retries) break;
              t.state = 'retrying'; log('task', { task: t.id, agent: t.agent, state: 'retrying', text: `nouvelle tentative (${t.attempts}/${o.retries})` });
            }
          }
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, Math.min(o.concurrency, mission.tasks.length)) }, worker));
      if (mission.cancelled) { set('cancelled'); return mission; }
      conclude(mission, env, registry, log);
      return mission;
    } catch (err) { mission.error = String(err.message || err); set('failed'); return mission; }
  }

  // Review, synthesis and gateway (deterministic; shared by run and recomputation).
  function conclude(mission, env, registry, log = () => {}) {
    mission.state = 'reviewing'; log('mission', { state: 'reviewing', text: 'Mission → reviewing' });
    const ordered = mission.tasks.slice().sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    mission.findings = ordered.flatMap(t => t.state === 'succeeded' ? t.findings : []);
    mission.verification = T.verifyFindings(env, mission.findings);
    const unresolved = mission.verification.filter(v => !v.typeOk || v.resolved < v.evidence || v.evidence === 0);
    log('review', { agent: mission.plan.verifier, text: `Vérification indépendante : ${mission.verification.length - unresolved.length}/${mission.verification.length} constats entièrement sourcés.` });
    mission.disagreements = T.disagreements(mission.findings);
    const scen = ordered.find(t => t.tool === 'scenario.investigate' && t.state === 'succeeded');
    const brief = scen && scen.extra && scen.extra.brief;
    mission.adversarial = { reviewer: mission.plan.reviewer, disagreements: mission.disagreements.length, sensitivities: brief ? brief.adversarial.filter(a => !a.pass).map(a => a.label) : [], missing: brief ? brief.missingData : [],
      failedTasks: mission.tasks.filter(t => t.state !== 'succeeded').map(t => `${t.tool}: ${t.state}`), limitations: mission.findings.filter(f => f.limitation).map(f => f.claim) };
    log('review', { agent: mission.plan.reviewer, text: `Revue adversariale : ${mission.disagreements.length} désaccord(s), ${mission.adversarial.sensitivities.length} sensibilité(s), ${mission.adversarial.limitations.length} limite(s), ${mission.adversarial.failedTasks.length} tâche(s) non abouties.` });
    // Synthesis: each statement cites the findings it rests on (by index). The manager adds no new facts.
    const cite = topic => mission.findings.map((f, i) => f.topic === topic ? i : -1).filter(i => i >= 0);
    const statements = [...new Set(mission.findings.map(f => f.topic))].map(topic => ({ topic, text: mission.findings.filter(f => f.topic === topic).map(f => f.claim).join(' '), cites: cite(topic), epistemic: [...new Set(mission.findings.filter(f => f.topic === topic).map(f => f.epistemic))] }));
    const next = brief ? brief.recommendedAction.summary
      : mission.target.type === 'seismic-context' ? 'Aucune action proposée : surveiller les révisions USGS ; une évaluation d’impact exigerait des données structurelles et géotechniques non disponibles.'
      : 'Information à examiner par un humain ; aucune intervention proposée faute de relation inter-domaines vérifiée.';
    mission.conclusion = { statements, disagreements: mission.disagreements, nextAction: next, cityDecision: brief ? scen.extra.decision.state : null, humanReview: 'Revue humaine obligatoire. Aucun agent ne peut autoriser ni exécuter une action physique ou politique.' };
    log('synthesis', { agent: mission.plan.manager, text: `Synthèse : ${statements.length} énoncé(s) sourcé(s) ; action suivante : ${next}` });
    mission.fingerprint = C.fingerprint(deterministic(mission));
    mission.decision = issueMissionDecision(mission, env, registry);
    log('gateway', { agent: mission.plan.gateway, text: `${mission.decision.state} — ${mission.decision.reason}` });
    mission.state = mission.decision.state === DECISION.ELIGIBLE ? 'needs-human-review' : mission.decision.state === DECISION.MORE ? 'needs-evidence' : 'rejected';
    log('mission', { state: mission.state, text: `Mission → ${mission.state}` });
  }
  // Deterministic content (timings, attempts and logs excluded).
  const deterministic = m => ({ id: m.id, target: m.target, plan: m.plan, findings: m.findings.map(f => ({ topic: f.topic, claim: f.claim, epistemic: f.epistemic, evidence: f.evidence.map(e => e.ref), agent: f.agent })), conclusion: m.conclusion && { statements: m.conclusion.statements, nextAction: m.conclusion.nextAction, cityDecision: m.conclusion.cityDecision } });

  // Synchronous recomputation (no timers) used by the gateway and tests.
  function recompute(origin, env, registry) {
    const m = newMission(origin, env); m.plan = plan(registry, m.target);
    const idx = ORG.index(registry);
    m.tasks = m.plan.specialists.map((s, i) => { const t = { id: `task-${i + 1}`, agent: s.agent, tool: s.tool, state: 'queued', findings: [] };
      try { const out = runTool(env, idx.byId.get(s.agent), s.tool, { ...m.target, question: m.target.question }); if (out && typeof out.then === 'function') throw new Error('outil asynchrone : recalcul synchrone impossible'); t.findings = out.findings; t.extra = { brief: out.brief || null, decision: out.decision || null }; t.state = 'succeeded'; } catch (e) { t.state = 'failed'; t.error = e.message; }
      return t; });
    m._noGateway = true;
    conclude(m, env, registry);
    return m;
  }

  // ---------- Mission gateway (fail closed; never authorizes) ----------
  function issueMissionDecision(mission, env, registry) {
    const checks = [], add = (id, label, pass, detail) => { checks.push({ id, label, pass: !!pass, detail: detail || null }); return !!pass; };
    const out = (state, reason) => ({ state, reason, checks, authorizes: false, humanReview: 'Revue humaine obligatoire ; CORE n’exécute rien.' });
    if (mission._noGateway) return out(DECISION.MORE, 'recalcul');
    if (!add('contract', 'mission complète', mission && mission.plan && Array.isArray(mission.findings) && mission.conclusion)) return out(DECISION.REJECT, 'Mission incomplète.');
    const again = recompute(mission.origin, env, registry);
    // Hash the submitted content itself (never trust a claimed fingerprint) and compare with the recomputation.
    if (!add('recompute', 'contenu soumis identique au recalcul déterministe (empreinte)', C.fingerprint(deterministic(mission)) === again.fingerprint && mission.fingerprint === again.fingerprint)) return out(DECISION.REJECT, 'Les constats ne correspondent pas au recalcul déterministe.');
    const v = T.verifyFindings(env, mission.findings);
    if (!add('typed', 'chaque constat a un statut épistémique valide', v.every(x => x.typeOk))) return out(DECISION.REJECT, 'Statut épistémique invalide.');
    if (!add('sourced', 'chaque preuve citée est vérifiable', v.every(x => x.evidence > 0 && x.resolved === x.evidence), v.filter(x => x.resolved < x.evidence).map(x => x.claim.slice(0, 60)).join(' ; '))) return out(DECISION.REJECT, 'Preuves manquantes ou non vérifiables.');
    if (!add('cited', 'chaque énoncé de synthèse cite des constats', mission.conclusion.statements.every(s => s.cites.length > 0 && s.cites.every(i => mission.findings[i])))) return out(DECISION.REJECT, 'Synthèse non sourcée.');
    if (!add('no-llm-bypass', 'aucune affirmation de modèle de langage non validée', !mission.llm || mission.llm.validated === true)) return out(DECISION.REJECT, 'Affirmation de modèle non validée.');
    const failed = mission.tasks.filter(t => t.state !== 'succeeded');
    add('tasks', 'toutes les tâches ont abouti', !failed.length, failed.map(t => `${t.tool}:${t.state}`).join(', ') || null);
    if (mission.conclusion.cityDecision) {
      add('city-gateway', 'passerelle inter-domaines (issueCityDecision) consultée', true, mission.conclusion.cityDecision);
      return out(mission.conclusion.cityDecision, `Passerelle inter-domaines : ${mission.conclusion.cityDecision}. ${mission.conclusion.nextAction}`);
    }
    if (failed.length || mission.adversarial.limitations.length || mission.disagreements.length) return out(DECISION.MORE, `${mission.conclusion.nextAction}${mission.adversarial.limitations.length ? ` Limites : ${mission.adversarial.limitations.join(' ')}` : ''}`);
    return out(DECISION.ELIGIBLE, `Constats sourcés à examiner par un humain. ${mission.conclusion.nextAction}`);
  }

  const MISSIONS = { STATES, TASK_STATES, DEFAULT_OPTS, newMission, plan, run, cancel, recompute, issueMissionDecision, deterministic };
  if (typeof module !== 'undefined' && module.exports) module.exports = MISSIONS; else root.CORE_MISSIONS = MISSIONS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
