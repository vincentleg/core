// CORE — persistent problem-investigation queue (Phase 8). A deterministic state machine for agent work:
//   intake → classified → assigned → running → review → awaiting-human → completed (human reviewed)
//   with exits: needs-evidence, rejected, failed, cancelled; and a global emergency stop.
// Idempotent: a task key (problem scope + snapshot) is accepted once; re-intake of the same key is a no-op.
// Resumable: the whole queue serializes to JSON; a task found "running" after a restart goes back to "assigned".
// Every transition is appended to a SHA-256 hash-chained event log (tampering breaks verify()).
// Agents never approve: only a reviewer named "human:<name>" can complete a task or lift an emergency stop.
(function (root) {
  'use strict';
  const isNode = typeof require === 'function' && typeof module !== 'undefined';
  const { sha256 } = isNode ? require('./scheduler.js') : root.CORE_SCHEDULER;
  const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);

  const STATES = ['intake', 'classified', 'assigned', 'running', 'review', 'awaiting-human', 'completed', 'needs-evidence', 'rejected', 'failed', 'cancelled'];
  const TERMINAL = new Set(['completed', 'rejected', 'failed', 'cancelled']);
  const NEXT = {
    intake: ['classified', 'cancelled'], classified: ['assigned', 'cancelled'], assigned: ['running', 'cancelled'],
    running: ['review', 'failed', 'assigned', 'cancelled'], review: ['awaiting-human', 'needs-evidence', 'rejected', 'cancelled'],
    'awaiting-human': ['completed', 'rejected', 'cancelled'], 'needs-evidence': ['completed', 'rejected', 'cancelled', 'assigned'],
    completed: [], rejected: [], failed: [], cancelled: [],
  };
  const LIMITS = { maxTasks: 200, maxConcurrent: 1, maxAttempts: 2, maxMsPerTask: 20000, maxModelCalls: 0 };
  const HUMAN = /^human:[A-Za-z0-9._-]{2,40}$/;

  function create(saved = null, { limits = {}, clock = () => new Date().toISOString() } = {}) {
    const Q = saved ? JSON.parse(JSON.stringify(saved)) : { version: 'core-task-queue-v1', tasks: [], events: [], stopped: false, seq: 0 };
    Q.limits = { ...LIMITS, ...(Q.limits || {}), ...limits };
    const byId = id => Q.tasks.find(t => t.id === id);
    function log(event, task, detail) {
      const prev = Q.events.length ? Q.events[Q.events.length - 1].hash : '0'.repeat(64);
      const e = { n: Q.events.length + 1, at: clock(), event, task: task ? task.id : null, state: task ? task.state : null, detail: detail ?? null, prev };
      e.hash = sha256(stable({ ...e, hash: undefined })); Q.events.push(e); return e;
    }
    function move(task, to, detail) {
      if (!NEXT[task.state].includes(to)) throw new Error(`transition interdite : ${task.state} → ${to} (${task.id})`);
      task.state = to; task.updated = clock(); log(to, task, detail); return task;
    }
    // Resume after a restart: no task can stay "running" without a live process.
    for (const t of Q.tasks) if (t.state === 'running') { t.state = 'assigned'; log('resumed', t, 'processus interrompu : la tâche repasse en attente'); }

    function intake({ key, kind, title, problems = [], scope = {}, requiresModel = false }) {
      if (!key || !kind) throw new TypeError('key and kind required');
      const existing = Q.tasks.find(t => t.key === key);
      if (existing) return { ok: true, id: existing.id, duplicate: true };
      if (Q.stopped) { log('refused', null, `arrêt d’urgence actif : ${key}`); return { ok: false, reason: 'emergency-stop' }; }
      if (Q.tasks.filter(t => !TERMINAL.has(t.state)).length >= Q.limits.maxTasks) { log('refused', null, `file pleine : ${key}`); return { ok: false, reason: 'queue-full' }; }
      if (requiresModel && Q.limits.maxModelCalls <= 0) { log('refused', null, `tâche modèle non autorisée par les limites : ${key}`); return { ok: false, reason: 'model-not-allowed' }; }
      const t = { id: `task-${String(++Q.seq).padStart(4, '0')}`, key, kind, title, problems, scope, requiresModel, state: 'intake', attempts: 0, agents: [], result: null, error: null, reviewer: null, created: clock(), updated: clock() };
      Q.tasks.push(t); log('intake', t, title); return { ok: true, id: t.id };
    }
    const classify = (id, { domains, evidenceRequired }) => { const t = byId(id); t.domains = domains; t.evidenceRequired = evidenceRequired; return move(t, 'classified', domains.join(', ')); };
    const assign = (id, agents) => { const t = byId(id); if (!agents.length) throw new Error('aucun agent éligible'); t.agents = agents; return move(t, 'assigned', agents.map(a => `${a.code}:${a.tool || a.role}`).join(' ')); };
    function start(id) {
      const t = byId(id); if (Q.stopped) throw new Error('arrêt d’urgence actif');
      if (Q.tasks.filter(x => x.state === 'running').length >= Q.limits.maxConcurrent) throw new Error('limite de concurrence atteinte');
      if (t.attempts >= Q.limits.maxAttempts) throw new Error('tentatives épuisées');
      t.attempts++; t.started = clock(); return move(t, 'running', `tentative ${t.attempts}/${Q.limits.maxAttempts}`);
    }
    // Outcome of the deterministic review/gateway: human review is always the next step for analysis that passed.
    function finish(id, result) {
      const t = byId(id); t.result = result; move(t, 'review', result.decision);
      const to = result.gateway === 'blocked' ? 'rejected' : result.gateway === 'needs-evidence' ? 'needs-evidence' : 'awaiting-human';
      return move(t, to, result.summary);
    }
    function fail(id, error) { const t = byId(id); t.error = String(error); return move(t, t.attempts < Q.limits.maxAttempts ? 'assigned' : 'failed', t.error); }
    function approve(id, reviewer, note = '') {
      const t = byId(id); if (!t) return false;
      if (!HUMAN.test(String(reviewer || ''))) { log('approval-refused', t, `réviseur non humain : ${reviewer}`); return false; }
      if (!['awaiting-human', 'needs-evidence'].includes(t.state)) return false;
      t.reviewer = reviewer; move(t, 'completed', `revu par ${reviewer}${note ? ` — ${note}` : ''}`); return true;
    }
    function cancel(id, reason = 'annulée') { const t = byId(id); if (!t || TERMINAL.has(t.state)) return false; move(t, 'cancelled', reason); return true; }
    function emergencyStop(reason) { Q.stopped = true; log('emergency-stop', null, reason); for (const t of Q.tasks) if (['intake', 'classified', 'assigned', 'running'].includes(t.state)) move(t, 'cancelled', `arrêt d’urgence : ${reason}`); }
    function reset(reviewer) { if (!HUMAN.test(String(reviewer || ''))) return false; Q.stopped = false; log('reset', null, `levée par ${reviewer}`); return true; }
    function verify() { let prev = '0'.repeat(64); for (const e of Q.events) { if (e.prev !== prev || sha256(stable({ ...e, hash: undefined })) !== e.hash) return { ok: false, at: e.n }; prev = e.hash; } return { ok: true, events: Q.events.length, head: prev }; }
    const counts = () => Object.fromEntries(STATES.map(s => [s, Q.tasks.filter(t => t.state === s).length]));
    return { state: Q, intake, classify, assign, start, finish, fail, approve, cancel, emergencyStop, reset, verify, counts, get: byId, toJSON: () => JSON.parse(JSON.stringify(Q)) };
  }
  const TQ = { create, STATES, NEXT, LIMITS, HUMAN, TERMINAL: [...TERMINAL] };
  if (isNode && module.exports) module.exports = TQ; else root.CORE_TASK_QUEUE = TQ;
})(typeof globalThis !== 'undefined' ? globalThis : this);
