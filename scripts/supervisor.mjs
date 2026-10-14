// CORE local supervisor (Phase 8): bounded, auditable agent work on the founder's machine.
//   node scripts/supervisor.mjs run [--limit N] [--pace-s S] [--cycles K --interval-min M] [--fresh] [--record]
//   node scripts/supervisor.mjs status | stop [--reason "…"] | resume --reviewer human:<name>
//   node scripts/supervisor.mjs approve <task-id> --reviewer human:<name> [--note "…"] | cancel <task-id>
// What it does: intake the World Problems Registry (one task per corridor segment, deduplicated by snapshot),
// classify, assign eligible rule-based specialists through the existing mission planner, run the deterministic
// mission (tools on the verified snapshot only), pass the mission gateway, then wait for a HUMAN reviewer.
// Safety: no network (fetch is disabled while running), no shell, no file writes outside .core-local/ (and
// data/operations/ with --record), tool permissions enforced by ORG.canUse, time budget per task, bounded attempts,
// emergency stop via `stop` (a STOP file checked before every step). Runs only while this process runs:
// when the machine sleeps or the process ends, work stops. No model is called (maxModelCalls = 0).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadEnv, M, C } from './lib/core-env.mjs';
const require = createRequire(import.meta.url);
const TQ = require('../src/task-queue.js');
const DIR = '.core-local', QF = `${DIR}/queue.json`, LIVE = `${DIR}/live.json`, STOP = `${DIR}/STOP`, LOCK = `${DIR}/supervisor.lock`;
// Single writer: while a supervisor runs it owns queue.json; other commands only drop the STOP file.
const alive = pid => { try { process.kill(pid, 0); return true; } catch (_) { return false; } };
const running = () => { try { const pid = +fs.readFileSync(LOCK, 'utf8'); return pid && pid !== process.pid && alive(pid) ? pid : 0; } catch (_) { return 0; } };
const args = process.argv.slice(2), cmd = args[0] || 'status', opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
fs.mkdirSync(DIR, { recursive: true });
const loadQ = () => TQ.create(fs.existsSync(QF) ? JSON.parse(fs.readFileSync(QF, 'utf8')) : null);
const saveQ = q => fs.writeFileSync(QF, JSON.stringify(q.toJSON(), null, 1));
const queuedAgents = q => [...new Set(q.state.tasks.filter(t => t.state === 'assigned').flatMap(t => t.agents.map(a => a.id)))];
const live = (q, extra = {}) => fs.writeFileSync(LIVE, JSON.stringify({ version: 'core-live-v1', mode: 'local-supervisor', pid: process.pid, updated: new Date().toISOString(), stopped: q.state.stopped || fs.existsSync(STOP), counts: q.counts(), queued: queuedAgents(q), chain: q.verify(), ...extra }, null, 1));

if (cmd === 'stop') { fs.writeFileSync(STOP, JSON.stringify({ at: new Date().toISOString(), reason: opt('--reason') || 'arrêt manuel' })); if (running()) { console.log(`STOP written; supervisor ${running()} records the stop and cancels pending tasks before its next step.`); process.exit(0); } const q = loadQ(); q.emergencyStop(opt('--reason') || 'arrêt manuel'); saveQ(q); live(q, { running: [] }); console.log('Emergency stop recorded; pending tasks cancelled; a running supervisor stops before its next step.'); process.exit(0); }
if (cmd === 'resume') { if (running()) { console.error('A supervisor is running: stop it first.'); process.exit(1); } const q = loadQ(); if (!q.reset(opt('--reviewer'))) { console.error('A human reviewer is required: --reviewer human:<name>'); process.exit(1); } fs.rmSync(STOP, { force: true }); saveQ(q); live(q, { running: [] }); console.log('Emergency stop lifted by', opt('--reviewer')); process.exit(0); }
if (cmd === 'approve') { if (running()) { console.error('A supervisor is running: stop it first.'); process.exit(1); } const q = loadQ(); const ok = q.approve(args[1], opt('--reviewer'), opt('--note') || ''); saveQ(q); console.log(ok ? `${args[1]} completed (human review recorded)` : 'Refused: unknown task, wrong state or non-human reviewer'); process.exit(ok ? 0 : 1); }
if (cmd === 'cancel') { if (running()) { console.error('A supervisor is running: stop it first.'); process.exit(1); } const q = loadQ(); const ok = q.cancel(args[1], 'annulée par l’opérateur'); saveQ(q); console.log(ok ? 'cancelled' : 'not cancellable'); process.exit(ok ? 0 : 1); }
if (cmd === 'status') { const q = loadQ(); console.log(JSON.stringify({ stopped: q.state.stopped || fs.existsSync(STOP), counts: q.counts(), chain: q.verify(), live: fs.existsSync(LIVE) ? JSON.parse(fs.readFileSync(LIVE, 'utf8')).updated : null }, null, 1)); process.exit(0); }
if (cmd !== 'run') { console.error('unknown command'); process.exit(1); }

// ---------- run ----------
if (running()) { console.error(`Another supervisor is running (pid ${running()}).`); process.exit(1); }
fs.writeFileSync(LOCK, String(process.pid)); process.on('exit', () => { try { if (+fs.readFileSync(LOCK, 'utf8') === process.pid) fs.rmSync(LOCK); } catch (_) { /* gone */ } });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(130));
if (args.includes('--fresh') && fs.existsSync(QF)) fs.renameSync(QF, `${DIR}/queue-${Date.now()}.json`); // archive, never delete, the previous queue and its audit chain
const paceS = Math.min(120, Math.max(0, +(opt('--pace-s') || 0))), limit = +(opt('--limit') || 1000), cycles = +(opt('--cycles') || 1), intervalMin = Math.max(5, +(opt('--interval-min') || 30)), record = args.includes('--record');
const realFetch = globalThis.fetch; globalThis.fetch = () => Promise.reject(new Error('réseau interdit au superviseur (liste d’autorisation vide)'));
const stopped = () => fs.existsSync(STOP);
// Apply a STOP written while running: record it in this process's queue (the single writer) and save.
function applyStop(q) { if (!stopped() || q.state.stopped) return; let reason = 'arrêt manuel'; try { reason = JSON.parse(fs.readFileSync(STOP, 'utf8')).reason || reason; } catch (_) { /* default */ } q.emergencyStop(reason); saveQ(q); live(q, { running: [] }); console.log('Emergency stop applied:', reason); }
const withTimeout = (p, ms) => new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error(`budget de temps dépassé (${ms} ms)`)), ms); p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); ko(e); }); });

async function cycle() {
  const { env, manifest, registry } = loadEnv(), q = loadQ(), reg = new Map(registry.agents.map(a => [a.id, a]));
  if (stopped()) { console.log('STOP present: nothing runs.'); live(q, { running: [] }); return q; }
  const problems = JSON.parse(fs.readFileSync('data/problems/registry.json', 'utf8')).problems;
  // Intake: one investigation per segment carrying registered problems (deduplicated per snapshot).
  const bySeg = new Map(); for (const p of problems.filter(x => x.segment)) { if (!bySeg.has(p.segment)) bySeg.set(p.segment, []); bySeg.get(p.segment).push(p); }
  for (const [seg, ps] of [...bySeg].sort((a, b) => a[0].localeCompare(b[0]))) {
    const f = env.ctx.segments.get(seg); if (!f) continue;
    q.intake({ key: `investigate:${seg}@${manifest.generated_at}`, kind: 'segment-investigation', title: `${f.properties.street} ${f.properties.from} → ${f.properties.to} : ${ps.length} problème(s) enregistré(s)`, problems: ps.map(p => p.id), scope: { segment: seg } });
  }
  saveQ(q);
  // Planning pass: classify and assign every open task (deterministic planner), so waiting work is visible as queued.
  const plans = new Map();
  for (const t of q.state.tasks.filter(x => ['intake', 'classified', 'assigned'].includes(x.state))) {
    if (stopped()) break;
    const ps = problems.filter(p => t.problems.includes(p.id)), text = `Investigation des problèmes enregistrés : ${[...new Set(ps.map(p => p.title))].join(' ; ')}`.slice(0, 300);
    const m = M.newMission({ type: 'question', text, segment: t.scope.segment }, env); plans.set(t.id, m);
    if (t.state === 'intake') q.classify(t.id, { domains: [...new Set(ps.map(p => p.domain))], evidenceRequired: [...new Set(ps.map(p => p.status === 'observed' ? 'enregistrement public cité' : p.status === 'simulated' ? 'paramètres et empreinte du modèle' : 'enregistrements des permis concernés'))] });
    if (q.get(t.id).state === 'classified') { const pl = M.plan(registry, m.target); q.assign(t.id, pl.specialists.map(sp => ({ id: sp.agent, code: reg.get(sp.agent).code, tool: sp.tool })).concat([pl.verifier, pl.reviewer, pl.gateway].filter(Boolean).map(id => ({ id, code: reg.get(id).code, role: 'review' })))); }
  }
  saveQ(q); live(q, { running: [] });
  let done = 0;
  for (const t of q.state.tasks.filter(x => x.state === 'assigned')) {
    if (done >= limit || stopped()) break;
    const m = plans.get(t.id); if (!m) continue;
    q.start(t.id); saveQ(q);
    live(q, { running: [{ task: t.id, title: t.title, segment: t.scope.segment, agents: t.agents.map(a => a.id), startedAt: t.started }] });
    try {
      const t0 = Date.now(); await withTimeout(M.run(m, env, { registry }), q.state.limits.maxMsPerTask);
      const gateway = ['rejected', 'failed', 'cancelled'].includes(m.state) ? 'blocked' : m.state === 'needs-evidence' ? 'needs-evidence' : 'ok';
      q.finish(t.id, { mission: m.id, fingerprint: m.fingerprint, missionState: m.state, decision: m.decision.state, gateway, findings: m.findings.length, disagreements: m.disagreements.length, wallMs: Date.now() - t0,
        tools: m.tasks.map(x => ({ agent: x.agent, code: reg.get(x.agent).code, tool: x.tool, state: x.state, records: x.records, ms: x.ms })), summary: `${m.findings.length} constat(s) → ${m.decision.state}` });
      done++;
    } catch (e) { q.fail(t.id, e.message); }
    saveQ(q); live(q, { running: [] });
    console.log(`${t.id} ${t.title.slice(0, 60)} → ${q.get(t.id).state}`);
    // Pacing between tasks (bounded load; the next task stays visibly queued). Stop is checked every second.
    for (let k = 0; k < paceS && !stopped(); k++) await new Promise(r => setTimeout(r, 1000));
  }
  applyStop(q); live(q, { running: [], lastCycle: new Date().toISOString() });
  if (record) {
    const out = { version: 'core-operations-v1', generated_at: new Date().toISOString(), by: 'scripts/supervisor.mjs (Node, local, deterministic tools only; no model, no network)', snapshot: manifest.generated_at,
      limits: q.state.limits, chain: q.verify(), counts: q.counts(), tasks: q.state.tasks, events: q.state.events };
    fs.mkdirSync('data/operations', { recursive: true }); fs.writeFileSync('data/operations/log.json', JSON.stringify(out, null, 1) + '\n');
    console.log(`recorded data/operations/log.json: ${q.state.tasks.length} task(s), chain ${out.chain.ok ? 'ok' : 'BROKEN'}`);
  }
  return q;
}
for (let k = 0; k < cycles; k++) {
  const q = await cycle(); console.log(JSON.stringify(q.counts()));
  if (k + 1 < cycles && !stopped()) { console.log(`next cycle in ${intervalMin} min (Ctrl+C or \`node scripts/supervisor.mjs stop\` to stop)`); for (let s = 0; s < intervalMin * 60 && !stopped(); s += 5) await new Promise(r => setTimeout(r, 5000)); }
}
globalThis.fetch = realFetch;
