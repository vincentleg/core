// CORE — autonomous mission engine (Phase 9). Node. Hierarchical, bounded, logged, resumable.
// Lifecycle: DISCOVERED → TRIAGED → ASSIGNED → INVESTIGATING → CROSS_DOMAIN_REVIEW → EVIDENCE_VALIDATION
//            → PROPOSED_DECISION → HUMAN_REVIEW → APPROVED | REJECTED | NEEDS_MORE_EVIDENCE   (+ FAILED, CANCELLED)
// Organisation (functional, from src/org.js): CORE executive (priority) → city coordinator (triage, ownership) →
// department lead (plans, delegates, consolidates, recommends) → specialists (tools) ; cross-department work goes
// through the other department's lead (request → delegate) ; data verification challenges ; adversarial review ;
// decision gateway ; HUMAN decision. Every hand-off is a logged message (sender, recipient, mission, purpose,
// timestamp, evidence refs, outcome). Agents never approve their own work, never act on the world, never
// change permissions. Learning: leads consult APPROVED procedures from institutional memory before planning;
// model-assisted interpreters receive APPROVED lessons. Checkpoints after every stage allow recovery.
'use strict';
const ORG = require('./org.js'), CT = require('./civ-tools.js'), T = require('./tools.js'), CITIES = require('./cities.js');
const STAGES = ['DISCOVERED', 'TRIAGED', 'ASSIGNED', 'INVESTIGATING', 'CROSS_DOMAIN_REVIEW', 'EVIDENCE_VALIDATION', 'PROPOSED_DECISION', 'HUMAN_REVIEW'];
const FINAL = ['APPROVED', 'REJECTED', 'NEEDS_MORE_EVIDENCE', 'FAILED', 'CANCELLED'];
const LIMITS = { maxSubtasks: 14, maxDepth: 2, maxMsPerSubtask: 8000, attempts: 2, concurrency: 3, maxModelCalls: 2 };
const CITY = 'core.san-francisco', EXEC = 'core.global.coordinator', COORD = `${CITY}.manager`, GATEWAY = `${CITY}.governance.gateway`;
const REVIEWER = `${CITY}.safety.adversarial-reviewer`, VERIFIER = `${CITY}.research.evidence-verifier`;
const CORRIDOR_TOOLS = new Set(['works.windows', 'works.telecom', 'trees.near-works', 'buildings.frontage', 'energy.benchmarks', 'public-space.sidewalks', 'scenario.investigate']);

// ---------- Workflows (real problem definitions over the verified snapshot) ----------
// Phase 10: workflows declare the cities they run in; wording follows the city's labels (San Francisco text unchanged).
const NY = cx => cx.city === 'new-york';
// Tools that need upstream results (points, segments) are only called through dependencies, never by broad delegation.
const NEEDS_INPUT = new Set(['works.near-points', 'decision.interventions']);
const AGENCY = cx => NY(cx) ? 'NYC DOT' : 'SFMTA et SF Public Works';
const WORKFLOWS = {
  'safety-works': {
    title: 'Sécurité routière × chantiers', dept: 'mobility', domains: ['mobility', 'infrastructure', 'public_space'], cities: ['san-francisco', 'new-york'],
    question: (nh, cx) => NY(cx) ? `Sur les corridors prioritaires Vision Zero de ${nh}, quels tronçons cumulent des collisions avec blessés ou tués et des fermetures de rue pour travaux à venir, et que faut-il examiner avant ces travaux ?` : `Sur le réseau à forte accidentalité (HIN 2024) de ${nh}, quels tronçons cumulent des accidents avec blessés et des chantiers approuvés à venir, et que faut-il examiner avant ces travaux ?`,
    first: ['safety.crash-profile'], verify: ['crashes-agg', 'hin', 'permits'], interpreter: 'core.san-francisco.public-space.accessibility-analyst',
    discover(cx, nh) { const s = CT.TOOLS['safety.crash-profile'].run(cx, { nhood: nh }), w = CT.TOOLS['works.area-windows'].run(cx, { segments: s.rows.map(r => r.cnn) }); return { signal: w.rows.length, evidence: [{ type: 'record', dataset: 'neighborhoods', ref: `neighborhoods:${nh}` }], severity: s.rows.reduce((a, r) => a + r.severe_fatal, 0) }; },
    cross(res, cx) {
      const cp = res['safety.crash-profile'], wk = res['works.area-windows']; if (!cp || !wk) return { rows: [], findings: [] };
      const byCnn = new Map(cp.rows.map(r => [r.cnn, r])), rows = wk.rows.map(w => ({ ...byCnn.get(w.cnn), permits: w.permits.length, orgs: w.orgs.length, excavation: w.excavation })).filter(r => r.cnn).sort((a, b) => b.severe_fatal - a.severe_fatal || b.crashes - a.crashes);
      const top = rows.slice(0, 5), sev = rows.filter(r => r.severe_fatal > 0).length;
      const head = NY(cx) ? `${rows.length} tronçon(s) de corridor prioritaire cumulent des collisions avec blessés ou tués (5 ans) et des fermetures de rue pour travaux dans les ${CT.H} j ; ${sev} avec au moins une collision mortelle.` : `${rows.length} tronçon(s) HIN cumulent des accidents avec blessés (5 ans) et des fenêtres de travaux approuvées dans les ${CT.H} j ; ${sev} avec au moins un accident grave ou mortel.`;
      return { rows, findings: [
        { topic: 'cross', claim: head, epistemic: 'derived', evidence: rows.slice(0, 15).flatMap(r => [{ type: 'record', dataset: 'crashes-agg', ref: `crashes-agg:${r.cnn}` }, { type: 'record', dataset: 'hin', ref: `hin:${r.cnn}` }]), values: { segments: rows.length, severe: sev } },
        ...top.map(r => ({ topic: 'cross', claim: NY(cx) ? `${r.street} (id ${r.cnn}) : ${r.severe_fatal} collision(s) mortelle(s), ${r.crashes} au total, et ${r.permits} fermeture(s) de rue pour travaux à venir.` : `${r.street} (CNN ${r.cnn}) : ${r.severe_fatal} accident(s) grave(s)/mortel(s), ${r.crashes} au total, et ${r.permits} permis de travaux (${r.orgs} organisation(s)) à venir.`, epistemic: 'derived', evidence: [{ type: 'record', dataset: 'hin', ref: `hin:${r.cnn}` }, { type: 'record', dataset: 'crashes-agg', ref: `crashes-agg:${r.cnn}` }], values: r })),
      ] };
    },
    recommend: (x, cx) => x.rows.length ? { kind: 'recommandation (hypothèse à vérifier)', text: NY(cx) ? `Pour les ${Math.min(5, x.rows.length)} tronçons de corridor prioritaire les plus touchés avec fermetures à venir, demander à ${AGENCY(cx)} de vérifier, avant le début des travaux, le plan de circulation piétonne et cycliste temporaire (cheminement, traversées, signalisation). Hypothèse : ces fermetures méritent une attention particulière ; aucun effet des travaux sur les collisions n’est démontré.` : `Pour les ${Math.min(5, x.rows.length)} tronçons HIN les plus accidentogènes avec chantiers à venir, demander à SFMTA et SF Public Works de vérifier, avant le début des travaux, le plan de circulation piétonne et cycliste temporaire (cheminement, traversées, signalisation). Hypothèse : les chantiers sur ces tronçons méritent une attention particulière ; aucun effet des travaux sur les accidents n’est démontré.` } : null,
  },
  'flood-works': {
    title: 'Risque d’inondation × chantiers', dept: 'water', domains: ['infrastructure', 'climate', 'emergency'], cities: ['san-francisco'],
    question: nh => `Quels chantiers approuvés à venir à ${nh} sont situés dans la zone de risque de tempête centennale (SFPUC 2022), et quelles précautions de calendrier examiner ?`,
    first: ['flood.exposure', 'resilience.weather-alerts'], verify: ['flood-zone', 'permits'], interpreter: 'core.san-francisco.environmental.environmental-analyst',
    discover(cx, nh) { const f = CT.TOOLS['flood.exposure'].run(cx, { nhood: nh }); return { signal: f.rows.length, evidence: [{ type: 'record', dataset: 'flood-zone', ref: 'flood-zone:2022' }], severity: f.rows.filter(r => /Exc|Boring/i.test(r.type)).length }; },
    cross(res) {
      const fl = res['flood.exposure'], wx = res['resilience.weather-alerts']; if (!fl) return { rows: [], findings: [] };
      const exc = fl.rows.filter(r => /Exc|Boring/i.test(r.type));
      return { rows: fl.rows, findings: [{ topic: 'cross', claim: `${exc.length} excavation(s) planifiée(s) dans la zone d’inondation modélisée ; ${fl.hinInZone.length} tronçon(s) HIN dans la zone ; alertes météo : ${wx ? wx.findings[0].claim : 'non consultées'}`, epistemic: 'modeled', evidence: [{ type: 'record', dataset: 'flood-zone', ref: 'flood-zone:2022' }, ...exc.slice(0, 15).map(r => ({ type: 'record', dataset: 'study-permits', ref: `study-permits:${r.id}` }))], values: { excavation: exc.length, hinInZone: fl.hinInZone.length } }] };
    },
    recommend: x => x.rows.length ? { kind: 'recommandation (hypothèse à vérifier)', text: `Pour les ${x.rows.length} chantier(s) situés dans la zone d’inondation modélisée, demander à SF Public Works et au SFPUC de vérifier la protection des fouilles et la gestion des eaux pluviales prévues, en tenant compte des alertes NWS au moment des travaux. Hypothèse : zone modélisée (pas d’inondation observée) ; aucun dommage n’est prévu ni démontré.` } : null,
  },
  // Phase 10 — New York accessibility: measured ramp deficiencies near construction closures (coordination opportunity).
  'ramps-works': {
    title: 'Accessibilité des rampes × chantiers', dept: 'public-space', domains: ['public_space', 'infrastructure'], cities: ['new-york'],
    question: nh => `À ${nh}, quelles rampes piétonnes relevées dépassent des seuils d’accessibilité déclarés à proximité de fermetures de rue pour travaux, et quelle coordination examiner ?`,
    first: ['accessibility.ramps'], verify: ['ramps', 'permits'], interpreter: null,
    discover(cx, nh) { const r = CT.TOOLS['accessibility.ramps'].run(cx, { nhood: nh }), n = CT.TOOLS['works.near-points'].run(cx, { points: r.rows.map(x => ({ id: x.id, at: x.at })) }); return { signal: n.rows.length, evidence: [{ type: 'record', dataset: 'neighborhoods', ref: `neighborhoods:${nh}` }], severity: n.rows.length }; },
    cross(res) {
      const rp = res['accessibility.ramps'], nr = res['works.near-points']; if (!rp || !nr) return { rows: [], findings: [] };
      const byId = new Map(rp.rows.map(r => [r.id, r])), rows = nr.rows.map(n => ({ ...byId.get(n.id), works: n.works })).filter(r => r.issues);
      const cnt = k => rows.filter(r => r.issues.includes(k)).length;
      return { rows, findings: [{ topic: 'cross', claim: `${rows.length} rampe(s) dépassant un seuil déclaré sont à moins de 30 m d’une fermeture pour travaux en cours ou à venir (pente > 8,33 % : ${cnt('pente > 8,33 %')} ; bande d’éveil absente : ${cnt('bande d’éveil absente')}).`, epistemic: 'derived', evidence: rows.slice(0, 15).flatMap(r => [{ type: 'record', dataset: 'ramps', ref: `ramps:${r.id}` }, ...r.works.slice(0, 1).map(w => ({ type: 'record', dataset: 'study-permits', ref: `study-permits:${w}` }))]), values: { ramps: rows.length, slope: cnt('pente > 8,33 %'), dws: cnt('bande d’éveil absente') } }] };
    },
    recommend: x => x.rows.length ? { kind: 'recommandation (hypothèse à vérifier)', text: `Pour les ${x.rows.length} rampe(s) concernées, demander à NYC DOT si les travaux voisins peuvent inclure une vérification ou une remise à niveau de la rampe (relevés de 2017 à 2019 à confirmer sur place). Hypothèse : une coordination pourrait éviter une seconde intervention ; aucun gain n’est chiffré.` } : null,
  },
  // Phase 10 — decision intelligence (San Francisco): compare interventions for the road-safety × works problem.
  'decision-safety-works': {
    title: 'Aide à la décision : sécurité routière × chantiers', dept: 'mobility', domains: ['mobility', 'infrastructure'], cities: ['san-francisco'], focused: true,
    question: (nh, cx) => `Quelles interventions comparer pour les chantiers à venir sur les tronçons à forte accidentalité de ${nh}, avec quels compromis et quelles incertitudes ?`,
    first: ['safety.crash-profile', 'decision.interventions'], verify: ['crashes-agg', 'hin', 'permits'], interpreter: null,
    discover(cx, nh) { return WORKFLOWS['safety-works'].discover(cx, nh); },
    cross(res, cx) {
      const d = res['decision.interventions']; if (!d) return { rows: [], findings: [] };
      const a = d.analysis, urgent = !NY(cx); return { rows: a.rows, decision: { options: a.options, sensitivity: d.sensitivity, quality: d.quality, urgencyKnown: urgent }, findings: [] };
    },
    recommend: (x, cx) => x.decision && x.rows.length ? (() => { const o = Object.fromEntries(x.decision.options.map(q => [q.id, q]));
      return { kind: 'recommandation (prochaine étape, hypothèse à vérifier)', text: `Prochaine étape proposée : appliquer d’abord I1 (revue préalable du plan piéton, sans changer les calendriers ; ${Math.round((o.I1.coveredShare || 0) * 100)} % de l’indice couvert), puis demander à ${AGENCY(cx)} d’étudier la faisabilité de I2 (coordination, indice ${Math.round(o.I2.change * 100)} %)${x.decision.urgencyKnown ? ` et de I3 (report des travaux non urgents, indice ${Math.round(o.I3.change * 100)} %, ${o.I3.permitsAffected} autorisation(s) à reporter)` : ' ; I3 n’est pas évaluable ici car la source ne distingue pas les travaux urgents'}. Hypothèse : indice exploratoire non calibré ; aucune réduction d’accidents n’est démontrée ni chiffrée ; aucun coût n’est calculé.` }; })() : null,
  },
};

function createEngine({ city = 'san-francisco', registry = ORG.buildRegistry(), cx, env = null, memory, clock = () => new Date().toISOString(), limits = {}, onEvent = null, llm = null, learn = true } = {}) {
  const L = { ...LIMITS, ...limits }, idx = ORG.index(registry), byId = id => idx.byId.get(id);
  // Phase 10: one engine per city; every role is resolved inside the city's organisation.
  const CFG = CITIES.get(city); if (!CFG || CFG.status !== 'operational') throw new Error(`ville non opérationnelle : ${city}`);
  const CITY = CFG.agentPrefix, COORD = `${CITY}.manager`, GATEWAY = `${CITY}.governance.gateway`, REVIEWER = `${CITY}.safety.adversarial-reviewer`, VERIFIER = `${CITY}.research.evidence-verifier`;
  const inCity = a => a.id.startsWith(CITY + '.');
  const lead = dept => `${CITY}.${dept}.lead`;
  const owner = tool => (idx.byTool.get(tool) || []).find(a => inCity(a) && a.executionMode === 'deterministic' && a.status === 'available');
  const stopped = { all: false };

  function newMission(workflow, nhood) {
    const W = WORKFLOWS[workflow]; if (!W) throw new Error(`workflow inconnu ${workflow}`); if (!W.cities.includes(city)) throw new Error(`workflow ${workflow} non disponible à ${CFG.name}`);
    // San Francisco ids keep their Phase 9 form (recorded data); other cities carry the city in the id.
    const id = `civ:${city === 'san-francisco' ? '' : city + ':'}${workflow}:${nhood.toLowerCase().replace(/[^a-z]+/g, '-')}@${cx.asOf}`;
    return { id, version: 'core-civ-mission-v1', workflow, title: W.title, nhood, question: W.question(nhood, cx), city, state: 'DISCOVERED', stages: [], subtasks: [], messages: [], results: {}, findings: [], rejected: [], challenges: [], conflicts: [], recommendation: null, review: null, decision: null, model: { calls: 0, accepted: [], rejected: [], lessonsUsed: [] }, learning: { proceduresApplied: [], lessonsProposed: [] }, owner: null, priority: null, errors: [] };
  }
  const now = () => clock();
  function msg(m, from, to, type, purpose, evidence = [], outcome = null) { const e = { id: `M${m.messages.length + 1}`, mission: m.id, at: now(), from, to, type, purpose, evidence: evidence.slice(0, 20).map(r => r.ref || r), outcome }; m.messages.push(e); emit(m, 'message', e); return e; }
  function emit(m, kind, data) { if (onEvent) onEvent({ mission: m.id, kind, at: now(), state: m.state, data }); }
  function stage(m, s) { m.state = s; m.stages.push({ stage: s, at: now() }); if (memory) memory.checkpoint(m.id, s, m); emit(m, 'stage', { stage: s }); }

  // ---------- tool execution with permission, scope, time budget and bounded retries ----------
  function scopeError(tool, t) { if (CORRIDOR_TOOLS.has(tool) && !(env && t.segment && env.ctx.segments.has(String(t.segment)))) return `hors périmètre : l’outil ${tool} ne couvre que l’instantané du corridor Folsom/Howard (tronçon ${t.segment || '—'})`; return null; }
  async function exec(agentId, tool, target) {
    const a = byId(agentId), def = CT.TOOLS[tool] || T.TOOLS[tool]; if (!def) throw new Error(`outil inconnu ${tool}`);
    if (!ORG.canUse(a, tool, def.permission)) throw new Error(`permission refusée : ${a.code} → ${tool}`);
    const m = { type: 'question', ...target };
    if (T.TOOLS[tool] && !CT.TOOLS[tool] && !scopeError(tool, target) && !T.TOOLS[tool].applies(m)) { const e = new Error(`précondition de ${tool} non remplie pour cette cible`); e.precondition = true; throw e; }
    const run = () => CT.TOOLS[tool] ? CT.TOOLS[tool].run(cx, target) : T.TOOLS[tool].run(env, m);
    // A corridor tool on an out-of-scope segment either crashes or "succeeds" with an absence claim that is not
    // evidence: the scope is checked first and the call is refused (recorded as a failure the lead can learn from).
    const scope = scopeError(tool, target); if (scope) { const e = new Error(scope); e.scope = true; throw e; }
    return Promise.race([Promise.resolve().then(run), new Promise((_, ko) => setTimeout(() => ko(new Error('budget de temps dépassé')), L.maxMsPerSubtask))]);
  }

  // Where the evidence used by a subtask is located (the place an agent may be shown travelling to); null = no location.
  function siteOf(m, st, out) {
    if (st.tool === 'safety.crash-profile' && out.rows && out.rows[0]) { const h = cx.hin.get(out.rows[0].cnn); m.site = m.site || { coord: h.mid, label: `${h.street} (CNN ${h.cnn})`, kind: 'tronçon HIN cité' }; return m.site; }
    if (st.tool === 'flood.exposure' && out.rows && out.rows[0]) { m.site = m.site || { coord: out.rows[0].at, label: `permis ${out.rows[0].id}`, kind: 'permis situé dans la zone modélisée' }; return m.site; }
    if (st.tool === 'accessibility.ramps' && out.rows && out.rows[0]) { m.site = m.site || { coord: out.rows[0].at, label: `rampe ${out.rows[0].id} (${out.rows[0].street || ''})`, kind: 'rampe relevée' }; return m.site; }
    if (st.tool === 'works.area-windows' || st.tool === 'works.near-points' || st.tool === 'decision.interventions') return m.site || null;
    if (CORRIDOR_TOOLS.has(st.tool) && st.target.segment && env.ctx.segments.get(String(st.target.segment))) return { coord: CT.mid(env.ctx.segments.get(String(st.target.segment)).geometry), label: `tronçon ${st.target.segment}`, kind: 'tronçon du corridor' };
    return null;
  }
  // ---------- stages ----------
  function triage(m) {
    const W = WORKFLOWS[m.workflow], d = W.discover(cx, m.nhood);
    m.priority = { score: d.severity * 2 + d.signal, basis: `sévérité ${d.severity} × 2 + signal ${d.signal} (règle déclarée)` };
    msg(m, EXEC, COORD, 'assign', `Problème découvert (${W.title}, ${m.nhood}), priorité ${m.priority.score}`, d.evidence, 'transmis à la coordination');
    m.owner = lead(W.dept); msg(m, COORD, m.owner, 'assign', `Responsabilité de la mission confiée à ${byId(m.owner).code} (${W.title})`, d.evidence, 'accepté');
    stage(m, 'TRIAGED');
  }
  function plan(m) {
    const W = WORKFLOWS[m.workflow], deptDomains = d => (registry.departments.find(x => x.id === d) || { domains: [] }).domains;
    // Candidate tools: the workflow's first tools, plus every executable specialist whose department serves the workflow domains.
    const broad = W.focused ? [] : registry.agents.filter(a => inCity(a) && a.executionMode === 'deterministic' && a.status === 'available' && a.scope.level === 'specialist' && !a.independent && deptDomains(a.department).some(d => W.domains.includes(d))).flatMap(a => a.tools).filter(t => !NEEDS_INPUT.has(t));
    const tools = [...new Set([...W.first, ...broad])].filter(t => t !== 'evidence.verify' && t !== 'adversarial.review' && t !== 'works.area-windows' && (CT.TOOLS[t] || T.TOOLS[t]));
    const procs = memory ? memory.entries({ kind: 'procedure', workflow: m.workflow, status: 'approved' }) : [];
    for (const t of tools) {
      const p = procs.find(x => x.body.rule && x.body.rule.skipTool === t);
      if (p && p.body.rule.when === 'always') { m.learning.proceduresApplied.push({ procedure: p.id, tool: t, version: p.version, effect: 'non délégué' }); msg(m, m.owner, m.owner, 'note', `Procédure approuvée ${p.id} appliquée : ${t} non délégué`, [], 'expérience réutilisée'); continue; }
      const target = t === 'resilience.weather-alerts' ? { type: 'weather-alert-context' } : CT.TOOLS[t] ? { nhood: m.nhood } : { segment: null, pending: 'top-segment' };
      const st = addSubtask(m, t, target, m.owner); if (st && p) st.skipIfOutsideCorridor = p.id;
    }
    stage(m, 'ASSIGNED');
  }
  function addSubtask(m, tool, target, requester, depth = 1) {
    if (m.subtasks.length >= L.maxSubtasks) { m.errors.push(`budget de sous-tâches atteint (${L.maxSubtasks}) : ${tool} non délégué`); return null; }
    if (depth > L.maxDepth) { m.errors.push(`profondeur de délégation maximale atteinte : ${tool}`); return null; }
    const key = `${tool}|${JSON.stringify(target)}`; if (m.subtasks.some(s => s.key === key)) return null; // no duplicate work
    const ag = owner(tool); if (!ag) { m.errors.push(`aucun agent exécutable pour ${tool}`); return null; }
    const viaLead = lead(ag.department), st = { id: `S${m.subtasks.length + 1}`, key, tool, target, agent: ag.id, code: ag.code, requester, via: viaLead === m.owner ? null : viaLead, depth, state: 'queued', attempts: 0, ms: 0, error: null, findings: 0 };
    if (st.via) { msg(m, requester, viaLead, 'request', `Demande d’appui (${tool}) pour ${m.nhood}`, [], 'accepté par la direction'); msg(m, viaLead, ag.id, 'delegate', `Sous-tâche bornée ${st.id} : ${tool}`, [], 'assignée'); }
    else msg(m, requester, ag.id, 'delegate', `Sous-tâche bornée ${st.id} : ${tool}`, [], 'assignée');
    m.subtasks.push(st); return st;
  }
  async function runSubtask(m, st) {
    if (stopped.all) { st.state = 'cancelled'; return; }
    // Corridor tools need a segment: the most severe segment found by the first tools.
    if (st.target.pending === 'top-segment') { const top = ((m.results['safety.crash-profile'] || {}).rows || [])[0] || (((m.results['flood.exposure'] || {}).rows || [])[0]); st.target = { segment: top ? String(top.cnn) : null }; }
    // Learned procedure: do not run a corridor-only tool on a target outside the corridor snapshot.
    if (st.skipIfOutsideCorridor && scopeError(st.tool, st.target)) { st.state = 'skipped'; st.note = `procédure ${st.skipIfOutsideCorridor} : cible hors périmètre, non exécuté`; m.learning.proceduresApplied.push({ procedure: st.skipIfOutsideCorridor, tool: st.tool, effect: 'non exécuté (hors périmètre)' }); msg(m, st.agent, st.via || st.requester, 'note', `Sous-tâche ${st.id} non exécutée : procédure apprise`, [], st.note); return; }
    st.state = 'running'; emit(m, 'subtask', { id: st.id, agent: st.agent, tool: st.tool, state: 'running' });
    for (; st.attempts < L.attempts;) {
      st.attempts++; const t0 = Date.now();
      try { const out = await exec(st.agent, st.tool, st.target); st.ms = Date.now() - t0; st.state = 'succeeded'; st.findings = out.findings.length; m.results[st.tool] = out; st.site = siteOf(m, st, out);
        msg(m, st.agent, st.via || st.requester, 'result', `Résultat ${st.id} (${st.tool})`, out.findings.flatMap(f => f.evidence || []), `${out.findings.length} constat(s)`);
        // Specialist-initiated request: crash or flood findings need the works picture on those segments.
        const segs = st.tool === 'safety.crash-profile' ? out.rows.map(r => r.cnn) : null;
        if (segs && segs.length) { const sub = addSubtask(m, 'works.area-windows', { segments: segs }, st.agent, 2); if (sub) await runSubtask(m, sub); }
        // Ramp specialist asks the works analyst which closures are near the deficient ramps (through the civil lead).
        if (st.tool === 'accessibility.ramps' && out.rows.length) { const sub = addSubtask(m, 'works.near-points', { points: out.rows.map(r => ({ id: r.id, at: r.at })) }, st.agent, 2); if (sub) await runSubtask(m, sub); }
        return;
      } catch (e) { st.ms = Date.now() - t0; st.error = e.message; if (e.scope || e.precondition || /permission/.test(e.message)) break; }
    }
    st.state = 'failed'; msg(m, st.agent, st.via || st.requester, 'error', `Échec ${st.id} (${st.tool})`, [], st.error);
  }
  async function investigate(m) {
    const queue = m.subtasks.filter(s => s.state === 'queued' && !s.target.pending), later = m.subtasks.filter(s => s.state === 'queued' && s.target.pending);
    for (let i = 0; i < queue.length; i += L.concurrency) await Promise.all(queue.slice(i, i + L.concurrency).map(s => runSubtask(m, s)));
    for (const s of later) await runSubtask(m, s);
    // Data verification challenges the freshness and nature of every dataset used.
    const ver = await exec(VERIFIER, 'data.freshness', { datasets: WORKFLOWS[m.workflow].verify });
    m.challenges = ver.challenges; msg(m, lead('research'), VERIFIER, 'delegate', 'Vérification de fraîcheur des sources', [], 'assignée');
    for (const c of ver.challenges.filter(c => c.level === 'warn')) msg(m, VERIFIER, m.owner, 'challenge', c.text, [{ ref: `dataset:${c.dataset}` }], 'confiance abaissée');
    stage(m, 'INVESTIGATING');
  }
  function crossReview(m) {
    const W = WORKFLOWS[m.workflow], x = W.cross(m.results, cx); if (x.decision) m.decisionAnalysis = x.decision;
    m.findings = [...Object.values(m.results).flatMap(r => r.findings || []), ...x.findings];
    // Conflict detection: a failed or out-of-scope specialist is a disagreement about coverage, not a silent gap.
    for (const s of m.subtasks.filter(s => s.state === 'failed')) { m.conflicts.push({ between: [s.agent, m.owner], about: s.tool, text: s.error }); msg(m, m.owner, REVIEWER, 'coverage-gap', `Lacune de couverture signalée : ${s.tool} (${s.code})`, [], s.error); }
    m.recommendation = W.recommend(x, cx); m.cross = { rows: x.rows.slice(0, 25) };
    msg(m, m.owner, REVIEWER, 'review-request', `Revue adversariale de ${m.findings.length} constat(s) et de la recommandation`, m.findings.flatMap(f => f.evidence || []), 'transmis');
    stage(m, 'CROSS_DOMAIN_REVIEW');
  }
  function validate(m) {
    const extra = r => r.type === 'knowledge' ? !!(env.knowledge && env.knowledge.lib.documents.some(d => d.id === r.ref)) : r.type === 'dataset' ? !!env.ctx.datasets[r.ref] : r.type === 'record' ? (env.ctx.byRecord.has(r.ref) || (([ds, ...id]) => !!(env.ctx.data[ds] && env.ctx.data[ds].features.some(f => String(f.properties.record_id) === id.join(':'))))(String(r.ref).split(':'))) : r.type === 'feed-source' || r.type === 'feed' ? true : false;
    const r = CT.review(cx, m.findings, m.recommendation, extra);
    // Absence claims from out-of-scope tools are rejected even if the tool returned without error.
    m.findings = r.accepted; m.rejected = r.rejected; m.review = { by: REVIEWER, accepted: r.accepted.length, rejected: r.rejected.length, recommendation: r.recommendation };
    msg(m, REVIEWER, m.owner, 'review', `Revue : ${r.accepted.length} accepté(s), ${r.rejected.length} rejeté(s)${r.recommendation ? ` ; recommandation ${r.recommendation.ok ? 'recevable' : `refusée (${r.recommendation.issues.join(', ')})`}` : ''}`, [], r.recommendation && !r.recommendation.ok ? 'à reprendre' : 'recevable');
    stage(m, 'EVIDENCE_VALIDATION');
  }
  async function interpret(m) {
    // Optional model-assisted interpretation (local Ollama only), validated deterministically.
    const W = WORKFLOWS[m.workflow]; if (!llm || !llm.available || m.model.calls >= L.maxModelCalls || !W.interpreter || !W.interpreter.startsWith(CITY + '.')) return;
    const agent = byId(W.interpreter), lessons = memory ? memory.entries({ kind: 'lesson', status: 'approved' }).filter(e => !e.body.agent || e.body.agent === agent.id) : [];
    m.model.lessonsUsed = lessons.map(e => e.id);
    const F = m.findings.slice(0, 8).map((f, i) => ({ id: `F${i + 1}`, claim: f.claim, values: f.values, epistemic: f.epistemic }));
    msg(m, m.owner, agent.id, 'delegate', 'Interprétation bornée des constats validés (modèle local)', [], 'assignée');
    const out = await llm.interpret({ agent, findings: F, lessons: lessons.map(e => e.statement), question: m.question }); m.model.calls += out.calls;
    for (const s of out.statements) { const v = validateStatement(s, F); (v.ok ? m.model.accepted : m.model.rejected).push({ ...s, reason: v.reason, agent: agent.id }); }
    m.model.usage = out.usage; msg(m, agent.id, m.owner, 'result', `Interprétation : ${m.model.accepted.length} énoncé(s) validé(s), ${m.model.rejected.length} rejeté(s)`, [], m.model.rejected.map(r => r.reason).join(' ; ') || 'tous validés');
  }
  function decide(m) {
    const ok = m.findings.length > 0 && m.recommendation && m.review.recommendation && m.review.recommendation.ok, negative = m.findings.length > 0 && !m.recommendation;
    m.decision = { by: GATEWAY, state: ok ? 'ÉLIGIBLE À LA REVUE HUMAINE' : negative ? 'RÉSULTAT NÉGATIF — À CONFIRMER PAR UN HUMAIN' : 'PREUVES SUPPLÉMENTAIRES REQUISES', caveats: m.challenges.filter(c => c.level === 'warn').map(c => c.text), authorizes: 'rien — décision humaine requise' };
    msg(m, GATEWAY, 'human', 'decision', `Proposition : ${m.decision.state}`, [], m.decision.caveats.join(' ') || 'aucune réserve');
    stage(m, 'PROPOSED_DECISION'); stage(m, 'HUMAN_REVIEW');
  }
  // ---------- memory: episodes, candidate findings, lessons and procedures (with promotion) ----------
  function remember(m) {
    if (!memory || !learn) return; // learn:false freezes memory (used for controlled before/after comparisons)
    const part = new Map(); const add = (id, role) => { if (!part.has(id)) part.set(id, new Set()); part.get(id).add(role); };
    add(EXEC, 'executive'); add(COORD, 'coordinator'); add(m.owner, 'lead'); add(VERIFIER, 'data-verification'); add(REVIEWER, 'review'); add(GATEWAY, 'gateway');
    for (const s of m.subtasks) { add(s.agent, 'specialist'); if (s.via) add(s.via, 'lead (relais)'); }
    for (const [agent, roles] of part) {
      const sts = m.subtasks.filter(s => s.agent === agent);
      memory.addEpisode({ agent, mission: m.id, workflow: m.workflow, role: [...roles].join(', '), problem: m.question, nhood: m.nhood, tools: sts.map(s => ({ tool: s.tool, state: s.state, findings: s.findings, error: s.error, target: s.target })),
        collaborators: [...part.keys()].filter(x => x !== agent), evidence: sts.reduce((n, s) => n + s.findings, 0), outcome: m.decision && m.decision.state, review: m.review && { accepted: m.review.accepted, rejected: m.review.rejected }, errors: sts.filter(s => s.error).map(s => s.error), at: now() });
    }
    // Procedural lessons from failures (deterministic records) → verify → independent review → approved procedure.
    for (const s of m.subtasks.filter(s => s.state === 'failed' && (/hors périmètre/.test(s.error) || /précondition/.test(s.error)))) {
      const rule = { skipTool: s.tool, when: /précondition/.test(s.error) ? 'always' : 'target-outside-corridor' };
      const p = memory.propose({ kind: 'procedure', workflow: m.workflow, statement: rule.when === 'always' ? `Ne pas déléguer ${s.tool} pour « ${WORKFLOWS[m.workflow].title} » : sa précondition n’est jamais remplie (échec enregistré).` : `Ne pas exécuter ${s.tool} quand la cible est hors de l’instantané du corridor Folsom/Howard (échec enregistré : ${s.error.slice(0, 60)}…).`, evidence: [`episode:${s.agent}:${m.id}`], origin: m.owner, mission: m.id, basis: 'deterministic-records', rule });
      if (p.existing) continue;
      memory.transition(p.id, 'verified', VERIFIER, 'échec présent dans l’épisode enregistré');
      memory.transition(p.id, 'reviewed', REVIEWER, 'règle de périmètre cohérente avec la liste des outils du corridor');
      memory.transition(p.id, 'approved', REVIEWER, 'procédure issue d’enregistrements déterministes');
      m.learning.lessonsProposed.push(p.id);
    }
    // Model lessons from deterministic validator rejections.
    for (const r of m.model.rejected) { const L2 = lessonFor(r); if (!L2) continue;
      // Shared institutional lesson (any model-assisted agent may reuse it), quoting the verified rejected pattern.
      const p = memory.propose({ kind: 'lesson', workflow: null, statement: L2, evidence: [`rejection:${m.id}`], origin: r.agent, mission: m.id, basis: 'deterministic-records' }); if (p.existing) continue;
      memory.transition(p.id, 'verified', VERIFIER, 'rejet présent dans le registre de la mission'); memory.transition(p.id, 'reviewed', REVIEWER, 'leçon dérivée de la règle du validateur'); memory.transition(p.id, 'approved', REVIEWER, 'leçon issue d’enregistrements déterministes'); m.learning.lessonsProposed.push(p.id); }
    // World findings stay candidates until a human approves the mission.
    for (const f of m.findings.filter(f => f.topic === 'cross')) { const p = memory.propose({ kind: 'finding', workflow: m.workflow, statement: f.claim, evidence: f.evidence.map(e => e.ref), origin: m.owner, mission: m.id });
      if (!p.existing) { memory.transition(p.id, 'verified', VERIFIER, 'références résolues dans l’instantané'); memory.transition(p.id, 'reviewed', REVIEWER, 'accepté par la revue adversariale'); } }
    // Phase 10: a newer snapshot of the same problem supersedes the findings of older snapshots (kept and linked);
    // changed numbers are recorded as conflicts for human attention. The newest finding of this mission is the successor.
    const key = m.id.replace(/@.*$/, ''), mine = memory.entries({ kind: 'finding', workflow: m.workflow }).filter(e => e.mission === m.id && e.status !== 'rejected');
    if (mine.length) for (const old of memory.entries({ kind: 'finding', workflow: m.workflow }).filter(e => e.mission !== m.id && e.mission.replace(/@.*$/, '') === key && e.mission < m.id && ['verified', 'reviewed', 'approved'].includes(e.status))) {
      const r = memory.supersede(old.id, mine[0].id, VERIFIER, `remplacé par l’instantané du ${cx.asOf}`); if (r.conflict) m.conflicts.push({ entry: old.id, successor: mine[0].id, note: 'valeurs différentes entre instantanés' });
    }
  }
  async function run(workflow, nhood, { resume = true, crashAfter = null } = {}) {
    let m = newMission(workflow, nhood); const t0 = Date.now();
    const cp = resume && memory ? memory.loadCheckpoint(m.id) : null;
    if (cp && !FINAL.includes(cp.body.state) && cp.body.state !== 'HUMAN_REVIEW') { m = cp.body; m.resumedFrom = cp.stage; emit(m, 'resume', { from: cp.stage }); }
    else if (cp) return cp.body; // already done: idempotent
    else stage(m, 'DISCOVERED');
    const order = ['DISCOVERED', 'TRIAGED', 'ASSIGNED', 'INVESTIGATING', 'CROSS_DOMAIN_REVIEW', 'EVIDENCE_VALIDATION'];
    try {
      // crashAfter (tests only) simulates the process dying right after a checkpoint, to test recovery.
      const crash = st => { if (crashAfter === st) { const e = new Error('arrêt simulé du processus'); e.crash = true; throw e; } };
      if (order.indexOf(m.state) < 1) { guard(); triage(m); crash('TRIAGED'); }
      if (order.indexOf(m.state) < 2) { guard(); plan(m); crash('ASSIGNED'); }
      if (order.indexOf(m.state) < 3) { guard(); await investigate(m); crash('INVESTIGATING'); }
      if (order.indexOf(m.state) < 4) { guard(); crossReview(m); }
      if (order.indexOf(m.state) < 5) { guard(); validate(m); await interpret(m); }
      guard(); decide(m); remember(m);
    } catch (e) { if (e.crash) throw e; if (e.stopped) { m.state = 'CANCELLED'; m.errors.push('arrêt d’urgence'); } else { m.state = 'FAILED'; m.errors.push(e.message); m.errorStack = e.stack; } if (memory) memory.checkpoint(m.id, m.state, m); emit(m, 'stage', { stage: m.state }); }
    m.metrics = { wallMs: Date.now() - t0, subtasks: m.subtasks.length, failed: m.subtasks.filter(s => s.state === 'failed').length, toolCalls: m.subtasks.reduce((n, s) => n + s.attempts, 0) + 1, messages: m.messages.length, modelCalls: m.model.calls };
    if (memory) memory.checkpoint(m.id, m.state, m); // final record includes memory updates and metrics
    return m;
  }
  // Executive discovery: scan every workflow × neighbourhood; only real signals become problems, ordered by priority.
  function discoverAll(nhoods = [...cx.nh.keys()]) {
    const out = []; for (const [w, W] of Object.entries(WORKFLOWS)) { if (!W.cities.includes(city) || W.focused) continue; for (const nh of nhoods) { const d = W.discover(cx, nh); if (d.signal > 0) out.push({ workflow: w, nhood: nh, city, priority: d.severity * 2 + d.signal, signal: d.signal, severity: d.severity, title: W.title }); } }
    return out.sort((a, b) => b.priority - a.priority || a.workflow.localeCompare(b.workflow) || a.nhood.localeCompare(b.nhood));
  }
  async function runQueue(problems, { concurrency = 2 } = {}) { const res = [], q = problems.slice(); await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, 4)) }, async () => { while (q.length && !stopped.all) { const p = q.shift(); res.push(await run(p.workflow, p.nhood)); } })); return res; }
  function guard() { if (stopped.all) { const e = new Error('arrêt d’urgence'); e.stopped = true; throw e; } }
  // Human decision (control centre only): approve, reject or ask for more evidence; findings of an approved mission are promoted by the human.
  function humanDecision(m, reviewer, decision, note = '') {
    if (!/^human:[A-Za-z0-9._-]{2,40}$/.test(String(reviewer))) throw new Error('décision réservée à un humain (human:<nom>)');
    if (m.state !== 'HUMAN_REVIEW') throw new Error(`mission non soumise à la revue humaine (${m.state})`);
    const to = { approve: 'APPROVED', reject: 'REJECTED', 'needs-evidence': 'NEEDS_MORE_EVIDENCE' }[decision]; if (!to) throw new Error('décision inconnue');
    m.human = { reviewer, decision: to, note: String(note).slice(0, 500), at: now() }; msg(m, reviewer, m.owner, 'human-decision', `Décision humaine : ${to}`, [], note || null); stage(m, to);
    if (memory && to === 'APPROVED') for (const e of memory.entries({ kind: 'finding', workflow: m.workflow, status: 'reviewed' }).filter(e => e.mission === m.id)) memory.transition(e.id, 'approved', reviewer, 'mission approuvée par un humain');
    return m;
  }
  return { run, discoverAll, runQueue, humanDecision, stopAll: () => { stopped.all = true; }, resetStop: reviewer => { if (!/^human:/.test(reviewer)) return false; stopped.all = false; return true; }, newMission, limits: L, workflows: WORKFLOWS };
}
// Deterministic validation of model statements: must cite known F#, use only numbers present in cited findings,
// no unqualified causal claim, no decision language, bounded length.
const LESSON = {
  causal: 'Ne pas affirmer de relation causale (cause, provoque, entraîne) : la qualifier explicitement d’hypothèse et ne l’avancer que si une preuve d’effet est citée.',
  numbers: 'N’utiliser que les nombres présents dans les constats cités ; ne jamais calculer ni arrondir soi-même.',
  citation: 'Chaque énoncé doit citer au moins un constat F# existant.',
  decision: 'Ne jamais employer de langage de décision ou d’autorisation : les décisions sont humaines.',
  length: 'Rester concis : un énoncé de moins de 280 caractères.',
  impact: 'Ne pas présenter un effet (danger, dommage, aggravation) comme établi : les constats ne mesurent aucun impact ; le formuler comme une incertitude ou une hypothèse.',
};
// Phase 9 v2: a lesson quotes the pattern that the validator actually rejected (v1 generic lessons did not help: see
// data/civ/experiments/learning-v1-generic-lessons.json).
const PATTERNS = { causal: /(en raison d[eu’'][^,.;]*|à cause de[^,.;]*|dûs? à[^,.;]*|dues? à[^,.;]*|parce que[^,.;]*|\b(?:cause|provoque|entraîne)\w*[^,.;]*)/i, impact: /([^,.;]*\b(?:danger|dommage|aggrav|risque accru|plus dangereu|menace)\w*[^,.;]*)/i, numbers: /(\d+(?:[.,]\d+)?)/ };
function lessonFor(r) {
  const cat = String(r.reason || '').split(':')[0], base = LESSON[cat]; if (!base) return null;
  const m = PATTERNS[cat] && String(r.statement).match(PATTERNS[cat]), quote = m ? m[1].trim().slice(0, 90) : null;
  return quote ? `${base} Formulation rejetée lors d’une mission vérifiée : « ${quote} ». À la place, décrire seulement ce que disent les constats cités, ou écrire explicitement « hypothèse : … ».` : base;
}
function validateStatement(s, F) {
  const text = String(s.statement || ''), cites = (text.match(/F\d+/g) || []).concat(s.cites || []), known = new Set(F.map(f => f.id));
  if (!cites.length || cites.some(c => !known.has(c))) return { ok: false, reason: 'citation: constat cité absent ou inexistant' };
  if (text.length > 280) return { ok: false, reason: 'length: énoncé trop long' };
  const hedge = /hypoth|pourrai|possibl|incertain|incertitude|à vérifier|non démontr/i.test(text);
  if (/\b(cause|causent|provoque|provoquent|entraîne|entraînent|à cause de|responsable de|en raison d[eu’']|dû à|dus à|due à|parce que)/i.test(text) && !/hypoth/i.test(text)) return { ok: false, reason: 'causal: relation causale ou justification non qualifiée' };
  if (/\b(danger|dommage|aggrav|risque accru|plus dangereu|menace)/i.test(text) && !hedge) return { ok: false, reason: 'impact: effet non démontré présenté comme établi' };
  // Decision verbs only: "permis approuvés" (an administrative status) is a fact, not decision language.
  if (/\b(autoris(?:e|er|ons|ez|ent)|approuv(?:e|er|ons|ez|ent)\b|ordonn\w*|décid(?:e|er|ons|ez|ent)\b|il faut interdire)/i.test(text)) return { ok: false, reason: 'decision: langage de décision' };
  const src = F.filter(f => cites.includes(f.id)).map(f => `${f.claim} ${JSON.stringify(f.values || {})}`).join(' ');
  const nums = (text.replace(/F\d+/g, '').match(/\d+(?:[.,]\d+)?/g) || []).filter(n => !new RegExp(`(^|[^0-9.])${n.replace(',', '.').replace('.', '\\.')}([^0-9]|$)`).test(src.replace(/(\d),(\d)/g, '$1.$2')));
  if (nums.length) return { ok: false, reason: `numbers: nombres absents des constats cités (${nums.join(', ')})` };
  return { ok: true, reason: null };
}
module.exports = { createEngine, WORKFLOWS, STAGES, FINAL, LIMITS, validateStatement, lessonFor, LESSON, CORRIDOR_TOOLS };
