// CORE — bounded mission scheduler (Phase 7). A small, explicit queue for agent missions with hard limits.
// States: queued → running → completed | failed (after bounded retries); paused; awaiting-approval (a human must
// approve before the job may run); stopped (emergency stop). Every transition is appended to a SHA-256
// hash-chained audit log, so editing or removing an entry breaks verification.
// It never runs anything by itself on a timer: jobs run only when enqueued and `tick()` / `drain()` is called.
// It does not authorize real-world actions; jobs are analysis functions supplied by CORE code.
(function (root) {
  'use strict';
  // Compact synchronous SHA-256 (FIPS 180-4) so the chain works identically in Node and in the browser.
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(str) {
    const msg = new TextEncoder().encode(str), l = msg.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n); b.set(msg); b[l] = 0x80;
    const dv = new DataView(b.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), W = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) W[i] = (W[i - 16] + (r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3)) + W[i - 7] + (r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10))) >>> 0;
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
      H[0] += a; H[1] += bb; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return [...H].map(x => x.toString(16).padStart(8, '0')).join('');
  }
  const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);

  const LIMITS = { maxQueued: 20, maxConcurrent: 1, maxAttempts: 2, maxMsPerJob: 30000, maxJobsPerHour: 30 };
  const STATES = ['queued', 'running', 'completed', 'failed', 'paused', 'awaiting-approval', 'stopped'];

  function create(limits = {}, clock = () => new Date().toISOString()) {
    const L = { ...LIMITS, ...limits }, jobs = new Map(), log = [], S = { stopped: false, seq: 0, startedAt: [] };
    function audit(event, job, detail) {
      const prev = log.length ? log[log.length - 1].hash : '0'.repeat(64);
      const e = { n: log.length + 1, at: clock(), event, job: job ? job.id : null, state: job ? job.state : null, detail: detail || null, prev };
      e.hash = sha256(stable({ ...e, hash: undefined })); log.push(e); return e;
    }
    function set(job, state, detail) { job.state = state; job.updated = clock(); audit(state, job, detail); }
    function enqueue({ kind, label, run, requiresApproval = false, budgetMs }) {
      if (S.stopped) { audit('rejected', null, `arrêt d’urgence actif : ${label}`); return { ok: false, reason: 'emergency-stop' }; }
      if (typeof run !== 'function') throw new TypeError('run must be a function');
      const open = [...jobs.values()].filter(j => ['queued', 'paused', 'awaiting-approval'].includes(j.state)).length;
      if (open >= L.maxQueued) { audit('rejected', null, `file pleine (${L.maxQueued}) : ${label}`); return { ok: false, reason: 'queue-full' }; }
      const job = { id: `job-${++S.seq}`, kind, label, state: null, attempts: 0, budgetMs: Math.min(budgetMs || L.maxMsPerJob, L.maxMsPerJob), requiresApproval, approvedBy: null, result: null, error: null, created: clock(), run };
      jobs.set(job.id, job); set(job, requiresApproval ? 'awaiting-approval' : 'queued', label); return { ok: true, id: job.id };
    }
    // Only a human reviewer ("human:<name>") can approve; agents cannot approve their own or others' jobs.
    function approve(id, reviewer) {
      const j = jobs.get(id); if (!j || j.state !== 'awaiting-approval') return false;
      if (!/^human:\S+/.test(String(reviewer || ''))) { audit('approval-refused', j, `approbateur non humain : ${reviewer}`); return false; }
      j.approvedBy = reviewer; set(j, 'queued', `approuvé par ${reviewer}`); return true;
    }
    function pause(id) { const j = jobs.get(id); if (j && j.state === 'queued') { set(j, 'paused'); return true; } return false; }
    function resume(id) { const j = jobs.get(id); if (j && j.state === 'paused' && !S.stopped) { set(j, 'queued'); return true; } return false; }
    function emergencyStop(reason = 'arrêt manuel') {
      S.stopped = true; audit('emergency-stop', null, reason);
      for (const j of jobs.values()) if (['queued', 'paused', 'awaiting-approval', 'running'].includes(j.state)) set(j, 'stopped', reason);
    }
    function reset(reviewer) { if (!/^human:\S+/.test(String(reviewer || ''))) return false; S.stopped = false; audit('reset', null, `levée de l’arrêt par ${reviewer}`); return true; }
    const withTimeout = (p, ms) => new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error(`budget de temps dépassé (${ms} ms)`)), ms); Promise.resolve(p).then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); ko(e); }); });
    async function tick() {
      if (S.stopped) return null;
      if ([...jobs.values()].filter(j => j.state === 'running').length >= L.maxConcurrent) return null;
      const hourAgo = Date.parse(clock()) - 3600e3; S.startedAt = S.startedAt.filter(t => t > hourAgo);
      const j = [...jobs.values()].find(x => x.state === 'queued'); if (!j) return null;
      if (S.startedAt.length >= L.maxJobsPerHour) { audit('throttled', j, `limite horaire (${L.maxJobsPerHour})`); return null; }
      S.startedAt.push(Date.parse(clock())); j.attempts++; set(j, 'running', `tentative ${j.attempts}/${L.maxAttempts}`);
      try { j.result = await withTimeout(j.run(), j.budgetMs); if (j.state === 'stopped') return j; set(j, 'completed'); }
      catch (e) { j.error = String(e && e.message || e); if (j.state === 'stopped') return j; set(j, j.attempts < L.maxAttempts ? 'queued' : 'failed', j.error); }
      return j;
    }
    async function drain(max = L.maxQueued * L.maxAttempts) { let n = 0; while (n++ < max && await tick()); return snapshot(); }
    function verify() { let prev = '0'.repeat(64); for (const e of log) { if (e.prev !== prev || sha256(stable({ ...e, hash: undefined })) !== e.hash) return { ok: false, at: e.n }; prev = e.hash; } return { ok: true, entries: log.length }; }
    function snapshot() {
      const list = [...jobs.values()].map(({ run, ...j }) => j), counts = Object.fromEntries(STATES.map(s => [s, list.filter(j => j.state === s).length]));
      return { limits: L, stopped: S.stopped, counts, jobs: list, log: log.slice(), chain: verify() };
    }
    return { enqueue, approve, pause, resume, emergencyStop, reset, tick, drain, verify, snapshot, log };
  }
  const SCHED = { create, sha256, LIMITS, STATES };
  if (typeof module !== 'undefined' && module.exports) module.exports = SCHED; else root.CORE_SCHEDULER = SCHED;
})(typeof globalThis !== 'undefined' ? globalThis : this);
