// CORE local civilisation control centre (Phase 9). Owner only, on this machine.
//   node scripts/control-server.mjs [--port 8787] [--model] [--memory .core-local/<name>.sqlite] [--queue .core-local/<q>.sqlite]
// Security: binds 127.0.0.1 only; a random token (printed once, in the URL fragment) is required on every API call
// (header X-Core-Token); Host must be 127.0.0.1:<port> or localhost:<port> (DNS-rebinding defence); Origin, when present,
// must match; no file path is ever taken from the client (static files come from a fixed allowlist); actions are an
// allowlist (start, decision, world, discover, decide, stop, resume, export); request bodies are size-limited JSON; human decisions require a
// reviewer name matching human:<name>. The public site has no access to this server and never contacts it.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRuntime, STOP, LIVE } from './lib/civ-runtime.mjs';
import { createInterpreter } from './lib/civ-llm.mjs';
import { openScheduler } from './lib/civd-core.mjs';
import { createRequire } from 'node:module';
const CITIES = createRequire(import.meta.url)('../src/cities.js');
const args = process.argv.slice(2), port = +(args[args.indexOf('--port') + 1] || 8787) || 8787, TOKEN = crypto.randomBytes(24).toString('hex');
const llm = args.includes('--model') ? await createInterpreter() : null;
const memArg = args.includes('--memory') ? args[args.indexOf('--memory') + 1] : null;
if (memArg && !/^\.core-local\/[A-Za-z0-9._-]+\.sqlite$/.test(memArg)) { console.error('--memory must be a .sqlite file inside .core-local/'); process.exit(1); }
const qArg = args.includes('--queue') ? args[args.indexOf('--queue') + 1] : '.core-local/civd.sqlite';
if (!/^\.core-local\/[A-Za-z0-9._-]+\.sqlite$/.test(qArg)) { console.error('--queue must be a .sqlite file inside .core-local/'); process.exit(1); }
const sched = openScheduler(qArg), t0 = Date.now(), cpu0 = process.cpuUsage();
let rt = await createRuntime({ llm: llm && llm.available ? llm : null, ...(memArg ? { memoryFile: memArg } : {}) }), busy = null;
const STATIC = { '/': ['control.html', 'text/html; charset=utf-8'], '/control.html': ['control.html', 'text/html; charset=utf-8'], '/assets/fonts/fonts.css': ['assets/fonts/fonts.css', 'text/css'], '/assets/brand/core-mark.svg': ['assets/brand/core-mark.svg', 'image/svg+xml'] };
for (const f of fs.readdirSync('assets/fonts').filter(f => f.endsWith('.woff2'))) STATIC[`/assets/fonts/${f}`] = [`assets/fonts/${f}`, 'font/woff2'];
const HUMAN = /^human:[A-Za-z0-9._-]{2,40}$/, MISSION = /^(?:civ:(?:[a-z-]+:)?[a-z-]+:[a-z-]+@\d{4}-\d{2}-\d{2}(?:T\d{4})?|world:[a-z-]+:[a-z-]+\/[a-z-]+@\d{4}-\d{2}-\d{2}(?:T\d{4})?\+[a-z-]+\/[a-z-]+@\d{4}-\d{2}-\d{2}(?:T\d{4})?)$/;
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
const body = req => new Promise((ok, ko) => { let n = 0, b = ''; req.on('data', c => { n += c.length; if (n > 8192) { ko(new Error('corps trop volumineux')); req.destroy(); } else b += c; }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (_) { ko(new Error('JSON invalide')); } }); });
const summary = m => ({ id: m.id, title: m.title, nhood: m.nhood, state: m.state, decision: m.decision, human: m.human || null, owner: m.owner, priority: m.priority, metrics: m.metrics || null, stages: m.stages, subtasks: m.subtasks, messages: m.messages, findings: m.findings, rejected: m.rejected, challenges: m.challenges, recommendation: m.recommendation, review: m.review, model: m.model, learning: m.learning || { proceduresApplied: [], lessonsProposed: [] }, question: m.question, city: m.city || null, cities: m.cities || null, decisionAnalysis: m.decisionAnalysis || null, comparability: m.comparability || null, figures: m.figures || null, memoryReused: m.memoryReused || null, conflicts: m.conflicts || [], results: Object.fromEntries(Object.entries(m.results || {}).map(([k, v]) => [k, { assumptions: v.assumptions || [] }])) });
// Phase 10: cities and source health, persistent queue and discoveries, memory state, resources.
const DAY = 864e5;
function world() {
  const cities = CITIES.operational().map(c => { const m = rt.manifests[c.id], cx = rt.cxs[c.id];
    return { id: c.id, name: c.name, stamp: cx.stamp, snapshot: m.generated_at, neighbourhoods: c.studyArea.neighborhoods, agents: rt.registry.agents.filter(a => a.scope.city === c.id).length, workflows: Object.entries(rt.engine.workflows).filter(([, W]) => W.cities.includes(c.id)).map(([k]) => k),
      sources: Object.entries(c.sources).map(([k, src]) => { const d = m.datasets.find(x => x.file.startsWith(k === 'crashes' ? 'crashes-agg' : k === 'works' ? 'permits' : k)); const age = d ? Math.round((Date.now() - Date.parse(d.retrieved_at)) / DAY) : null; return { key: k, title: src.title, retrieved: d ? d.retrieved_at : null, ageDays: age, budgetDays: src.freshnessDays, ok: age !== null && age <= src.freshnessDays }; }),
      lagDays: Math.round((Date.parse(m.generated_at) - Date.parse(cx.data['crashes-agg'].window.to)) / DAY) }; });
  const entries = rt.memory.entries(), st = fs.existsSync('.core-local/civd-status.json') ? JSON.parse(fs.readFileSync('.core-local/civd-status.json', 'utf8')) : null, cpu = process.cpuUsage(cpu0);
  return { cities, queue: { summary: sched.summary(), items: sched.items().slice(0, 40), lastCycle: st ? { at: st.at, diffs: st.diffs, discovered: st.discovered, signals: st.signals, ran: st.ran } : null, log: sched.log(12) },
    memoryState: { byKind: entries.reduce((o, e) => ({ ...o, [e.kind]: (o[e.kind] || 0) + 1 }), {}), byStatus: entries.reduce((o, e) => ({ ...o, [e.status]: (o[e.status] || 0) + 1 }), {}), conflicts: rt.memory.conflicts().slice(-10) },
    resources: { rssMB: Math.round(process.memoryUsage().rss / 1e6), cpuSec: +((cpu.user + cpu.system) / 1e6).toFixed(1), uptimeMin: Math.round((Date.now() - t0) / 60000), cost: '0 $ (calcul local, données publiques gratuites)' },
    allowed: { decision: CITIES.operational().filter(c => rt.engine.workflows['decision-safety-works'].cities.includes(c.id)).map(c => ({ city: c.id, nhoods: c.studyArea.neighborhoods })), world: CITIES.operational().map(c => ({ city: c.id, nhoods: c.studyArea.neighborhoods })) } };
}
const okNhood = (city, nh) => { const c = CITIES.get(city); return !!(c && c.status === 'operational' && c.studyArea.neighborhoods.includes(nh)); };
const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || '';
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 421, { error: 'hôte refusé' });
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(res, 403, { error: 'origine refusée' });
    const url = new URL(req.url, `http://${host}`);
    if (req.method === 'GET' && STATIC[url.pathname]) { const [f, type] = STATIC[url.pathname]; return send(res, 200, fs.readFileSync(f), type); }
    if (!url.pathname.startsWith('/api/')) return send(res, 404, { error: 'introuvable' });
    const tok = req.headers['x-core-token'] || ''; if (tok.length !== TOKEN.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(TOKEN))) return send(res, 401, { error: 'jeton requis' });
    const route = `${req.method} ${url.pathname}`;
    if (route === 'GET /api/status') return send(res, 200, { busy, stopped: fs.existsSync(STOP), problems: rt.engine.discoverAll(), missions: rt.missions().map(m => ({ id: m.id, title: m.title, nhood: m.nhood, state: m.state, decision: m.decision && m.decision.state, human: m.human || null, metrics: m.metrics || null })), live: fs.existsSync(LIVE) ? JSON.parse(fs.readFileSync(LIVE, 'utf8')) : null, memory: rt.memory.verify(), model: llm ? { available: llm.available, model: llm.model } : { available: false }, ...world() });
    if (route === 'GET /api/mission') { const id = url.searchParams.get('id') || ''; if (!MISSION.test(id)) return send(res, 400, { error: 'identifiant invalide' }); const m = rt.load(id); return m ? send(res, 200, summary(m)) : send(res, 404, { error: 'mission inconnue' }); }
    if (route === 'GET /api/memory') { const agent = url.searchParams.get('agent') || ''; if (!rt.registry.agents.some(a => a.id === agent)) return send(res, 400, { error: 'agent inconnu' }); return send(res, 200, { identity: rt.memory.identity(agent), knowledge: rt.memory.knowledge(agent), episodes: rt.memory.episodes(agent, { limit: 20 }), institutional: rt.memory.entries().filter(e => e.origin === agent || e.body.agent === agent) }); }
    if (route === 'POST /api/start') {
      if (busy) return send(res, 409, { error: 'une exécution est déjà en cours' }); if (fs.existsSync(STOP)) return send(res, 423, { error: 'arrêt d’urgence actif' });
      const b = await body(req), all = rt.engine.discoverAll(), pick = b.problem ? all.filter(p => `${p.workflow}|${p.nhood}` === String(b.problem)) : b.team ? all.filter(p => rt.engine.workflows[p.workflow].dept === String(b.team)) : all;
      if (!pick.length) return send(res, 400, { error: 'aucun problème autorisé ne correspond' });
      busy = { started: new Date().toISOString(), problems: pick.length }; rt.runAll({ problems: pick, concurrency: 2 }).catch(e => console.error(e)).finally(() => { busy = null; });
      return send(res, 202, { started: pick.length });
    }
    if (route === 'POST /api/decision' || route === 'POST /api/world' || route === 'POST /api/discover') {
      if (busy) return send(res, 409, { error: 'une exécution est déjà en cours' }); if (fs.existsSync(STOP)) return send(res, 423, { error: 'arrêt d’urgence actif' });
      const b = await body(req); let job;
      if (route === 'POST /api/decision') { if (!okNhood(String(b.city), String(b.nhood)) || !rt.engine.workflows['decision-safety-works'].cities.includes(b.city)) return send(res, 400, { error: 'ville ou quartier non autorisé pour l’aide à la décision' }); job = () => rt.runFocused('city', { city: b.city, workflow: 'decision-safety-works', nhood: b.nhood }); }
      else if (route === 'POST /api/world') { const pairs = Array.isArray(b.pairs) ? b.pairs.map(p => [String(p[0]), String(p[1])]) : []; if (pairs.length !== 2 || pairs[0][0] === pairs[1][0] || !pairs.every(([c, nh]) => okNhood(c, nh))) return send(res, 400, { error: 'deux quartiers de deux villes opérationnelles requis' }); job = () => rt.runFocused('world', { pairs }); }
      // Discovery from the control centre compares already-collected snapshots only: this server never starts a process
      // (snapshot collection stays a CLI action: node scripts/civd.mjs --once --fetch).
      else { if (b.fetch) return send(res, 400, { error: 'collecte réservée à la ligne de commande (civd --fetch)' }); job = () => sched.cycle(rt, { fetch: false, publish: false }); }
      busy = { started: new Date().toISOString(), problems: 1, kind: route.split('/').pop() }; job().catch(e => console.error(e)).finally(() => { busy = null; });
      return send(res, 202, { started: busy.kind });
    }
    if (route === 'POST /api/decide') { const b = await body(req); if (!MISSION.test(String(b.id)) || !HUMAN.test(String(b.reviewer)) || !['approve', 'reject', 'needs-evidence'].includes(b.decision)) return send(res, 400, { error: 'paramètres invalides (human:<nom> requis)' }); const m = rt.decide(b.id, b.reviewer, b.decision, String(b.note || '').slice(0, 500)); return send(res, 200, { id: m.id, state: m.state }); }
    if (route === 'POST /api/stop') { fs.writeFileSync(STOP, JSON.stringify({ at: new Date().toISOString(), reason: 'arrêt depuis le centre de contrôle' })); rt.engine.stopAll(); return send(res, 200, { stopped: true }); }
    if (route === 'POST /api/resume') { const b = await body(req); if (!HUMAN.test(String(b.reviewer))) return send(res, 400, { error: 'human:<nom> requis' }); fs.rmSync(STOP, { force: true }); rt.engine.resetStop(b.reviewer); return send(res, 200, { stopped: false }); }
    if (route === 'POST /api/export') { if (busy) return send(res, 409, { error: 'exécution en cours' }); return send(res, 200, { ...rt.record(), note: 'Enregistrements écrits dans data/civ, data/memory et data/agents/operational.json ; publication = commit humain.' }); }
    return send(res, 404, { error: 'action inconnue' });
  } catch (e) { return send(res, 400, { error: String(e.message || e).slice(0, 200) }); }
});
server.listen(port, '127.0.0.1', () => console.log(`CORE control centre (local only): http://127.0.0.1:${port}/#token=${TOKEN}`));
