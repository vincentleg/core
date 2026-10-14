// CORE — agent memory (Phase 9). Local-first, persistent, inspectable. Node only (built-in node:sqlite, no dependency).
// Four layers:
//   identity      — versioned professional identity, permissions, boundaries, hierarchy (from the registry)
//   knowledge     — approved documents and datasets each agent may use, with provenance and version
//   episodes      — what an agent actually did in a mission (problem, tools, evidence, collaborators, errors, review)
//   institutional — shared candidate → verified → reviewed → approved | rejected | superseded entries (all kept)
// Promotion rules (enforced here, tested):
//   • a candidate needs evidence verification (refs resolve) before review, and review by a DIFFERENT agent than its origin;
//   • 'procedure' and 'lesson' entries derived only from deterministic execution records may be approved by that review;
//   • 'finding' entries (claims about the world) can only be approved by a human reviewer ("human:<name>");
//   • nothing here changes permissions, policies or code; rejected and superseded entries stay traceable.
// Every write appends to a SHA-256 hash-chained event log; mission checkpoints allow recovery after a restart.
'use strict';
const { sha256 } = require('./scheduler.js');
const STATUSES = ['candidate', 'verified', 'reviewed', 'approved', 'rejected', 'superseded'];
// Phase 10: verified and reviewed entries may also be superseded (a newer snapshot re-established the same claim).
const NEXT = { candidate: ['verified', 'rejected'], verified: ['reviewed', 'rejected', 'superseded'], reviewed: ['approved', 'rejected', 'superseded'], approved: ['superseded'], rejected: [], superseded: [] };
const HUMAN = /^human:[A-Za-z0-9._-]{2,40}$/;
const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);

function open(file = ':memory:', { clock = () => new Date().toISOString() } = {}) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS identity (agent TEXT, version TEXT, body TEXT, at TEXT, PRIMARY KEY (agent, version));
    CREATE TABLE IF NOT EXISTS knowledge (agent TEXT, doc TEXT, version TEXT, source TEXT, at TEXT, PRIMARY KEY (agent, doc, version));
    CREATE TABLE IF NOT EXISTS episodes (id INTEGER PRIMARY KEY AUTOINCREMENT, agent TEXT, mission TEXT, workflow TEXT, role TEXT, body TEXT, at TEXT);
    CREATE INDEX IF NOT EXISTS ep_agent ON episodes(agent, workflow);
    CREATE TABLE IF NOT EXISTS institutional (id TEXT PRIMARY KEY, kind TEXT, workflow TEXT, statement TEXT, body TEXT, status TEXT, version INTEGER, origin TEXT, mission TEXT, history TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS checkpoints (mission TEXT PRIMARY KEY, stage TEXT, body TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS events (n INTEGER PRIMARY KEY, at TEXT, kind TEXT, ref TEXT, detail TEXT, prev TEXT, hash TEXT);`);
  const nul = a => a.map(v => v === undefined ? null : v), q = (sql, ...a) => db.prepare(sql).all(...nul(a)), run = (sql, ...a) => db.prepare(sql).run(...nul(a));
  function event(kind, ref, detail) {
    const last = q('SELECT n, hash FROM events ORDER BY n DESC LIMIT 1')[0], e = { n: last ? last.n + 1 : 1, at: clock(), kind, ref: ref || null, detail: detail ? JSON.stringify(detail).slice(0, 600) : null, prev: last ? last.hash : '0'.repeat(64) };
    e.hash = sha256(stable(e)); run('INSERT INTO events (n, at, kind, ref, detail, prev, hash) VALUES (?, ?, ?, ?, ?, ?, ?)', e.n, e.at, e.kind, e.ref, e.detail, e.prev, e.hash); return e;
  }
  const api = {
    putIdentity(agent, version, body) { run('INSERT OR REPLACE INTO identity VALUES (?, ?, ?, ?)', agent, version, JSON.stringify(body), clock()); },
    identity(agent) { const r = q('SELECT * FROM identity WHERE agent = ? ORDER BY at DESC LIMIT 1', agent)[0]; return r ? { ...JSON.parse(r.body), version: r.version } : null; },
    putKnowledge(agent, docs) { for (const d of docs) run('INSERT OR REPLACE INTO knowledge VALUES (?, ?, ?, ?, ?)', agent, d.id, String(d.version), d.source || null, clock()); },
    knowledge(agent) { return q('SELECT doc, version, source FROM knowledge WHERE agent = ? ORDER BY doc', agent); },
    addEpisode(e) { const r = run('INSERT INTO episodes (agent, mission, workflow, role, body, at) VALUES (?, ?, ?, ?, ?, ?)', e.agent, e.mission, e.workflow, e.role, JSON.stringify(e), e.at || clock()); event('episode', e.agent, { mission: e.mission, role: e.role }); return Number(r.lastInsertRowid); },
    episodes(agent, { workflow = null, limit = 50 } = {}) { return q(`SELECT body FROM episodes WHERE agent = ? ${workflow ? 'AND workflow = ?' : ''} ORDER BY id DESC LIMIT ?`, ...(workflow ? [agent, workflow, limit] : [agent, limit])).map(r => JSON.parse(r.body)); },
    // Institutional memory and its promotion workflow.
    propose({ kind, workflow, statement, evidence = [], origin, mission, basis, rule = null, agent = null }) {
      const id = `${kind}:${sha256(stable({ kind, workflow, statement })).slice(0, 12)}`, ex = q('SELECT id, status FROM institutional WHERE id = ?', id)[0];
      if (ex) return { id, existing: ex.status };
      const body = { evidence, basis: basis || null, rule, agent };
      run('INSERT INTO institutional VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', id, kind, workflow, statement, JSON.stringify(body), 'candidate', 1, origin, mission, JSON.stringify([{ status: 'candidate', by: origin, at: clock() }]), clock());
      event('memory-candidate', id, { kind, origin }); return { id };
    },
    transition(id, status, by, note = '') {
      const r = q('SELECT * FROM institutional WHERE id = ?', id)[0]; if (!r) throw new Error(`entrée inconnue ${id}`);
      if (!NEXT[r.status].includes(status)) throw new Error(`transition interdite ${r.status} → ${status}`);
      if (status === 'reviewed' && by === r.origin) throw new Error('la revue doit être faite par un autre agent que l’auteur');
      if (status === 'approved' && r.kind === 'finding' && !HUMAN.test(by)) throw new Error('un constat sur le monde ne peut être approuvé que par un humain');
      if (status === 'approved' && r.kind !== 'finding' && !(HUMAN.test(by) || JSON.parse(r.body).basis === 'deterministic-records')) throw new Error('approbation automatique réservée aux leçons issues d’enregistrements déterministes');
      const hist = JSON.parse(r.history); hist.push({ status, by, note, at: clock() });
      run('UPDATE institutional SET status = ?, history = ?, version = version + ? WHERE id = ?', status, JSON.stringify(hist), status === 'approved' ? 1 : 0, id);
      event('memory-' + status, id, { by, note }); return true;
    },
    // Phase 10: supersession by a newer entry (kept, linked both ways). A conflict is recorded when the numbers changed.
    supersede(oldId, newId, by, note = '') {
      const o = q('SELECT * FROM institutional WHERE id = ?', oldId)[0], n = q('SELECT * FROM institutional WHERE id = ?', newId)[0]; if (!o || !n) throw new Error('entrée inconnue');
      if (oldId === newId) throw new Error('une entrée ne peut se remplacer elle-même');
      const nums = t => (String(t).match(/\d+(?:[.,]\d+)?/g) || []).join(' '), conflict = o.workflow === n.workflow && nums(o.statement) !== nums(n.statement);
      api.transition(oldId, 'superseded', by, `${note} → ${newId}`.trim());
      const b = JSON.parse(n.body); b.supersedes = [...(b.supersedes || []), oldId]; run('UPDATE institutional SET body = ? WHERE id = ?', JSON.stringify(b), newId);
      if (conflict) event('memory-conflict', newId, { old: oldId, before: o.statement.slice(0, 200), after: n.statement.slice(0, 200) });
      return { conflict };
    },
    conflicts() { return q("SELECT ref, detail, at FROM events WHERE kind = 'memory-conflict' ORDER BY n").map(r => ({ entry: r.ref, ...JSON.parse(r.detail), at: r.at })); },
    entries({ kind = null, workflow = null, status = null } = {}) {
      return q('SELECT * FROM institutional ORDER BY at').filter(r => (!kind || r.kind === kind) && (!workflow || r.workflow === workflow) && (!status || r.status === status)).map(r => ({ ...r, body: JSON.parse(r.body), history: JSON.parse(r.history) }));
    },
    checkpoint(mission, stage, body) { run('INSERT OR REPLACE INTO checkpoints VALUES (?, ?, ?, ?)', mission, stage, JSON.stringify(body), clock()); event('checkpoint', mission, { stage }); },
    loadCheckpoint(mission) { const r = q('SELECT * FROM checkpoints WHERE mission = ?', mission)[0]; return r ? { stage: r.stage, body: JSON.parse(r.body), at: r.at } : null; },
    checkpoints() { return q('SELECT mission, stage, at FROM checkpoints ORDER BY at'); },
    event,
    verify() { let prev = '0'.repeat(64); for (const e of q('SELECT * FROM events ORDER BY n')) { const { hash, ...rest } = e; if (e.prev !== prev || sha256(stable(rest)) !== hash) return { ok: false, at: e.n }; prev = hash; } return { ok: true, head: prev, events: q('SELECT count(*) AS c FROM events')[0].c }; },
    // Public export (published by a human commit): episodes summarised per agent, institutional entries with history.
    export() {
      const eps = q('SELECT agent, workflow, body FROM episodes ORDER BY id').map(r => JSON.parse(r.body));
      return { version: 'core-memory-export-v1', generated_at: clock(), chain: api.verify(), episodes: eps, institutional: api.entries(), identities: q('SELECT agent, version FROM identity ORDER BY agent'), knowledge: q('SELECT agent, count(*) AS docs FROM knowledge GROUP BY agent') };
    },
    close() { db.close(); },
  };
  return api;
}
module.exports = { open, STATUSES, NEXT, HUMAN };
