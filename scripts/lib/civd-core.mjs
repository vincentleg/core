// Scheduler core (Phase 10), shared by scripts/civd.mjs (CLI / daemon) and scripts/control-server.mjs (local control
// centre), so a cycle started from the control centre runs in the same process as its memory (one SQLite writer).
// See scripts/civd.mjs for the cycle description.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { STOP, DIR } from './civ-runtime.mjs';
const require = createRequire(import.meta.url);
const CT = require('../../src/civ-tools.js'), D = require('../../src/civ-discovery.js'), CITIES = require('../../src/cities.js');
const FETCH_PER_DAY = 4, WATCH = `${DIR}/watch`;
export function openScheduler(QFILE, { maxMissions = 4 } = {}) {
  const MAXM = Math.min(8, maxMissions); let args = [];
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(QFILE);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS queue (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE, kind TEXT, city TEXT, payload TEXT, priority REAL, status TEXT, attempts INTEGER DEFAULT 0, created TEXT, updated TEXT, result TEXT);
    CREATE TABLE IF NOT EXISTS log (n INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, kind TEXT, detail TEXT);`);
  const now = () => new Date().toISOString(), q = (s, ...a) => db.prepare(s).all(...a), run = (s, ...a) => db.prepare(s).run(...a);
  const log = (kind, detail) => run('INSERT INTO log (at, kind, detail) VALUES (?, ?, ?)', now(), kind, JSON.stringify(detail).slice(0, 2000));
  const enqueue = (key, kind, city, payload, priority, status = 'queued') => run('INSERT OR IGNORE INTO queue (key, kind, city, payload, priority, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', key, kind, city, JSON.stringify(payload), priority, status, now(), now()).changes;
  const set = (id, status, result) => run('UPDATE queue SET status = ?, result = ?, updated = ? WHERE id = ?', status, result ? JSON.stringify(result) : null, now(), id);
  const summary = () => ({ byStatus: Object.fromEntries(q('SELECT status, count(*) c FROM queue GROUP BY status').map(r => [r.status, r.c])), byKind: Object.fromEntries(q('SELECT kind, count(*) c FROM queue GROUP BY kind').map(r => [r.kind, r.c])) });

  function loadCx(dir, city) { const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')), data = {}; for (const d of man.datasets) data[d.file.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(dir, d.file), 'utf8')); return CT.context({ manifest: man, data, city }); }
  const SNAP = { 'san-francisco': 'scripts/civ-snapshot.mjs', 'new-york': 'scripts/nyc-snapshot.mjs' };
  function latestWatch(city) { const d = path.join(WATCH, city); if (!fs.existsSync(d)) return null; const s = fs.readdirSync(d).filter(x => fs.existsSync(path.join(d, x, 'manifest.json'))).sort().pop(); return s ? path.join(d, s) : null; }
  function fetchWatch(city) {
    const today = now().slice(0, 10), done = q("SELECT count(*) c FROM log WHERE kind = 'fetch' AND at >= ? AND detail LIKE ?", today, `%"${city}"%`)[0].c;
    if (done >= FETCH_PER_DAY) { log('budget', { city, reason: `au plus ${FETCH_PER_DAY} collectes par ville et par jour` }); return null; }
    const out = path.join(WATCH, city, now().replace(/[:.]/g, '-')), r = spawnSync(process.execPath, [SNAP[city], out], { encoding: 'utf8', timeout: 600000 });
    log('fetch', { city, ok: r.status === 0, out: path.basename(out), err: r.status === 0 ? null : String(r.stderr).slice(-300) });
    return r.status === 0 ? out : null;
  }

  async function cycle(rt) {
    if (fs.existsSync(STOP)) { log('stopped', { reason: 'arrêt d’urgence actif' }); console.log('STOP: aucun travail'); return { stopped: true }; }
    // Crash recovery: anything left 'running' by a dead process is resumed (engine checkpoints make this safe).
    const stale = run("UPDATE queue SET status = 'queued', updated = ? WHERE status = 'running'", now()).changes; if (stale) log('recovered', { items: stale });
    const report = { at: now(), recovered: stale, discovered: 0, signals: 0, triaged: 0, ran: [], followUps: 0, diffs: [] };
    // (2) Discovery on the published snapshots.
    for (const p of rt.engine.discoverAll()) report.discovered += enqueue(`investigate|${rt.missionId(p)}`, 'investigate', p.city, p, p.priority);
    // (2b) Snapshot comparison.
    for (const c of CITIES.operational()) {
      const dir = args.includes('--fetch') ? fetchWatch(c.id) : latestWatch(c.id); if (!dir) continue;
      const w = loadCx(dir, c.id); if (Date.parse(w.manifest.generated_at) <= Date.parse(rt.cxs[c.id].manifest.generated_at)) { log('skip', { city: c.id, reason: 'instantané de veille antérieur ou égal à l’instantané publié' }); continue; }
      const d = D.diff(rt.cxs[c.id], w); report.diffs.push({ city: c.id, baseline: d.baseline, current: d.current, totals: d.totals, signals: d.signals.length });
      for (const s of d.signals) report.signals += enqueue(`signal|${s.key}`, 'signal', c.id, { ...s, baseline: d.baseline, current: d.current }, s.priority);
    }
    // (3) Triage by the city coordinator (deterministic): link to the neighbourhood mission, open a follow-up.
    for (const it of q("SELECT * FROM queue WHERE kind = 'signal' AND status = 'queued' ORDER BY priority DESC")) {
      const s = JSON.parse(it.payload), mission = s.nhood ? rt.missionId({ city: s.city, workflow: s.workflow, nhood: s.nhood }) : null;
      if (mission) enqueue(`investigate|${mission}`, 'investigate', s.city, { city: s.city, workflow: s.workflow, nhood: s.nhood }, s.priority);
      enqueue(`follow-up|${s.key}`, 'follow-up', s.city, { signal: s.key, mission, action: 'réexaminer lors de la prochaine publication d’instantané' }, s.priority, 'awaiting-snapshot');
      set(it.id, 'triaged', { by: `core.${s.city}.manager`, mission, note: s.kind === 'crash-data-updated' ? 'nouvelles données d’accidents : toutes les missions de la ville à réexaminer' : 'nouveaux enregistrements sur un tronçon désigné : rattachés à la mission du quartier' }); report.triaged++;
    }
    // (4) Execution within budget.
    for (const it of q("SELECT * FROM queue WHERE kind = 'investigate' AND status = 'queued' ORDER BY priority DESC LIMIT ?", MAXM)) {
      if (fs.existsSync(STOP)) break;
      const p = JSON.parse(it.payload); run("UPDATE queue SET status = 'running', attempts = attempts + 1, updated = ? WHERE id = ?", now(), it.id);
      try { const [m] = await rt.engine.runQueue([p], { concurrency: 1 }); set(it.id, m.state === 'FAILED' || m.state === 'CANCELLED' ? 'failed' : m.state === 'HUMAN_REVIEW' ? 'awaiting-human' : 'done', { mission: m.id, state: m.state }); report.ran.push(`${m.id} → ${m.state}`); }
      catch (e) { set(it.id, it.attempts + 1 >= 3 ? 'failed' : 'queued', { error: e.message }); }
    }
    // (5) Follow-ups after a human decision.
    for (const it of q("SELECT * FROM queue WHERE kind = 'investigate' AND status = 'awaiting-human'")) { const r = JSON.parse(it.result || '{}'), m = r.mission && rt.load(r.mission);
      if (m && m.human) { set(it.id, 'done', { ...r, human: m.human.decision }); if (m.human.decision === 'APPROVED') report.followUps += enqueue(`follow-up|monitor|${m.id}`, 'follow-up', it.city, { mission: m.id, action: 'surveiller les tronçons de la mission à chaque nouvel instantané' }, it.priority, 'awaiting-snapshot');
        if (m.human.decision === 'NEEDS_MORE_EVIDENCE') report.followUps += enqueue(`follow-up|evidence|${m.id}`, 'follow-up', it.city, { mission: m.id, action: 'preuves supplémentaires demandées par un humain' }, it.priority + 1, 'awaiting-snapshot'); } }
    report.queue = summary(); log('cycle', report);
    fs.writeFileSync(`${DIR}/civd-status.json`, JSON.stringify({ ...report, pid: process.pid, items: q('SELECT id, kind, city, status, priority, key, updated, result FROM queue ORDER BY priority DESC LIMIT 200') }));
    if (args.includes('--publish')) {
      fs.mkdirSync('data/civ', { recursive: true });
      const items = q('SELECT kind, city, status, priority, payload, result, created, updated FROM queue ORDER BY priority DESC').map(r => ({ ...r, payload: JSON.parse(r.payload), result: r.result ? JSON.parse(r.result) : null }));
      fs.writeFileSync('data/civ/discovery.json', JSON.stringify({ version: 'core-civ-discovery-v1', recorded_at: now(), by: 'scripts/civd.mjs (Node, local)', note: 'Signaux = hypothèses de tri issues de la comparaison d’instantanés ; ce ne sont pas des constats. L’instantané publié n’est jamais remplacé automatiquement.', diffs: report.diffs, queue: summary(), signals: items.filter(i => i.kind === 'signal').map(i => ({ ...i.payload, status: i.status, triage: i.result })), followUps: items.filter(i => i.kind === 'follow-up').map(i => ({ city: i.city, status: i.status, ...i.payload })), investigations: items.filter(i => i.kind === 'investigate').map(i => ({ city: i.city, workflow: i.payload.workflow, nhood: i.payload.nhood, status: i.status, mission: i.result && i.result.mission })) }, null, 1) + '\n');
    }
    return report;
  }
  // opts: { fetch, publish } for this cycle only.
  const run1 = (rt, { fetch = false, publish = false } = {}) => { args = [...(fetch ? ['--fetch'] : []), ...(publish ? ['--publish'] : [])]; return cycle(rt); };
  return { cycle: run1, summary, items: () => q('SELECT id, kind, city, status, priority, key, updated, result FROM queue ORDER BY priority DESC LIMIT 200'), log: (n = 30) => q('SELECT at, kind, detail FROM log ORDER BY n DESC LIMIT ?', n), close: () => db.close() };
}
