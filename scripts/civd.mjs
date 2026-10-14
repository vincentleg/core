// CORE persistent mission scheduler (Phase 10). Local only; Node built-ins (node:sqlite). The queue survives restarts.
//   node scripts/civd.mjs --once [--fetch] [--publish] [--max-missions N]     one cycle, then exit
//   node scripts/civd.mjs [--fetch] [--interval 60]                              loop (minimum interval 30 min)
//   options: --queue .core-local/<q>.sqlite --memory .core-local/<m>.sqlite (isolated runs, tests)
//   node scripts/civd.mjs status                                                 queue summary
// Cycle: (1) emergency stop check (.core-local/STOP: no work at all); (2) discovery — problems found in the published
// snapshots, plus, with --fetch, a fresh "watch" snapshot per city (free public APIs, bounded, at most 4 per city per
// day) diffed against the published baseline (src/civ-discovery.js); signals are deduplicated by key; (3) triage by the
// city coordinator — a signal links to the mission of its neighbourhood and opens a follow-up awaiting the next snapshot
// publication (the published snapshot is never replaced automatically: publication stays a human commit);
// (4) execution of queued missions by priority within budgets; items found 'running' at start-up (crash) are resumed
// from their checkpoints; (5) follow-ups for missions a human approved. --publish writes data/civ/discovery.json.
import fs from 'node:fs';
import { createRuntime, DIR } from './lib/civ-runtime.mjs';
import { openScheduler } from './lib/civd-core.mjs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const QFILE = opt('--queue', `${DIR}/civd.sqlite`);
if (!/^\.core-local\/[A-Za-z0-9._-]+\.sqlite$/.test(QFILE)) { console.error('--queue must be a .sqlite file inside .core-local/'); process.exit(1); }
fs.mkdirSync(DIR, { recursive: true });
const S = openScheduler(QFILE, { maxMissions: +opt('--max-missions', 4) });
if (args[0] === 'status') { console.log(JSON.stringify(S.summary(), null, 1)); for (const r of S.items().slice(0, 40)) console.log(r.id, r.kind, r.city, r.status, r.priority.toFixed(1), r.key); process.exit(0); }
const memArg = opt('--memory', null); if (memArg && !/^\.core-local\/[A-Za-z0-9._-]+\.sqlite$/.test(memArg)) { console.error('--memory must be a .sqlite file inside .core-local/'); process.exit(1); }
const rt = await createRuntime(memArg ? { memoryFile: memArg } : {}), o = { fetch: args.includes('--fetch'), publish: args.includes('--publish') };
if (args.includes('--once')) { const r = await S.cycle(rt, o); console.log(JSON.stringify({ ...r, ran: r.ran && r.ran.length ? r.ran : 0 }, null, 1)); rt.memory.close(); process.exit(0); }
const every = Math.max(30, +opt('--interval', 60)) * 60000; console.log(`civd: cycle every ${every / 60000} min (Ctrl-C to quit; STOP file pauses all work)`);
for (;;) { try { await S.cycle(rt, o); } catch (e) { console.error(e.message); } await new Promise(r => setTimeout(r, every)); }
