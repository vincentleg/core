// CORE local civilisation control centre (Phase 9). Owner only, on this machine.
//   node scripts/control-server.mjs [--port 8787] [--model] [--memory .core-local/<name>.sqlite]
// Security: binds 127.0.0.1 only; a random token (printed once, in the URL fragment) is required on every API call
// (header X-Core-Token); Host must be 127.0.0.1:<port> or localhost:<port> (DNS-rebinding defence); Origin, when present,
// must match; no file path is ever taken from the client (static files come from a fixed allowlist); actions are an
// allowlist (start, decide, stop, resume, export); request bodies are size-limited JSON; human decisions require a
// reviewer name matching human:<name>. The public site has no access to this server and never contacts it.
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRuntime, STOP, LIVE } from './lib/civ-runtime.mjs';
import { createInterpreter } from './lib/civ-llm.mjs';
const args = process.argv.slice(2), port = +(args[args.indexOf('--port') + 1] || 8787) || 8787, TOKEN = crypto.randomBytes(24).toString('hex');
const llm = args.includes('--model') ? await createInterpreter() : null;
const memArg = args.includes('--memory') ? args[args.indexOf('--memory') + 1] : null;
if (memArg && !/^\.core-local\/[A-Za-z0-9._-]+\.sqlite$/.test(memArg)) { console.error('--memory must be a .sqlite file inside .core-local/'); process.exit(1); }
let rt = await createRuntime({ llm: llm && llm.available ? llm : null, ...(memArg ? { memoryFile: memArg } : {}) }), busy = null;
const STATIC = { '/': ['control.html', 'text/html; charset=utf-8'], '/control.html': ['control.html', 'text/html; charset=utf-8'], '/assets/fonts/fonts.css': ['assets/fonts/fonts.css', 'text/css'], '/assets/brand/core-mark.svg': ['assets/brand/core-mark.svg', 'image/svg+xml'] };
for (const f of fs.readdirSync('assets/fonts').filter(f => f.endsWith('.woff2'))) STATIC[`/assets/fonts/${f}`] = [`assets/fonts/${f}`, 'font/woff2'];
const HUMAN = /^human:[A-Za-z0-9._-]{2,40}$/, MISSION = /^civ:[a-z-]+:[a-z-]+@\d{4}-\d{2}-\d{2}$/;
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
const body = req => new Promise((ok, ko) => { let n = 0, b = ''; req.on('data', c => { n += c.length; if (n > 8192) { ko(new Error('corps trop volumineux')); req.destroy(); } else b += c; }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (_) { ko(new Error('JSON invalide')); } }); });
const summary = m => ({ id: m.id, title: m.title, nhood: m.nhood, state: m.state, decision: m.decision, human: m.human || null, owner: m.owner, priority: m.priority, metrics: m.metrics || null, stages: m.stages, subtasks: m.subtasks, messages: m.messages, findings: m.findings, rejected: m.rejected, challenges: m.challenges, recommendation: m.recommendation, review: m.review, model: m.model, learning: m.learning });
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
    if (route === 'GET /api/status') return send(res, 200, { busy, stopped: fs.existsSync(STOP), problems: rt.engine.discoverAll(), missions: rt.missions().map(m => ({ id: m.id, title: m.title, nhood: m.nhood, state: m.state, decision: m.decision && m.decision.state, human: m.human || null, metrics: m.metrics || null })), live: fs.existsSync(LIVE) ? JSON.parse(fs.readFileSync(LIVE, 'utf8')) : null, memory: rt.memory.verify(), model: llm ? { available: llm.available, model: llm.model } : { available: false } });
    if (route === 'GET /api/mission') { const id = url.searchParams.get('id') || ''; if (!MISSION.test(id)) return send(res, 400, { error: 'identifiant invalide' }); const m = rt.load(id); return m ? send(res, 200, summary(m)) : send(res, 404, { error: 'mission inconnue' }); }
    if (route === 'GET /api/memory') { const agent = url.searchParams.get('agent') || ''; if (!rt.registry.agents.some(a => a.id === agent)) return send(res, 400, { error: 'agent inconnu' }); return send(res, 200, { identity: rt.memory.identity(agent), knowledge: rt.memory.knowledge(agent), episodes: rt.memory.episodes(agent, { limit: 20 }), institutional: rt.memory.entries().filter(e => e.origin === agent || e.body.agent === agent) }); }
    if (route === 'POST /api/start') {
      if (busy) return send(res, 409, { error: 'une exécution est déjà en cours' }); if (fs.existsSync(STOP)) return send(res, 423, { error: 'arrêt d’urgence actif' });
      const b = await body(req), all = rt.engine.discoverAll(), pick = b.problem ? all.filter(p => `${p.workflow}|${p.nhood}` === String(b.problem)) : b.team ? all.filter(p => rt.engine.workflows[p.workflow].dept === String(b.team)) : all;
      if (!pick.length) return send(res, 400, { error: 'aucun problème autorisé ne correspond' });
      busy = { started: new Date().toISOString(), problems: pick.length }; rt.runAll({ problems: pick, concurrency: 2 }).catch(e => console.error(e)).finally(() => { busy = null; });
      return send(res, 202, { started: pick.length });
    }
    if (route === 'POST /api/decide') { const b = await body(req); if (!MISSION.test(String(b.id)) || !HUMAN.test(String(b.reviewer)) || !['approve', 'reject', 'needs-evidence'].includes(b.decision)) return send(res, 400, { error: 'paramètres invalides (human:<nom> requis)' }); const m = rt.decide(b.id, b.reviewer, b.decision, String(b.note || '').slice(0, 500)); return send(res, 200, { id: m.id, state: m.state }); }
    if (route === 'POST /api/stop') { fs.writeFileSync(STOP, JSON.stringify({ at: new Date().toISOString(), reason: 'arrêt depuis le centre de contrôle' })); rt.engine.stopAll(); return send(res, 200, { stopped: true }); }
    if (route === 'POST /api/resume') { const b = await body(req); if (!HUMAN.test(String(b.reviewer))) return send(res, 400, { error: 'human:<nom> requis' }); fs.rmSync(STOP, { force: true }); rt.engine.resetStop(b.reviewer); return send(res, 200, { stopped: false }); }
    if (route === 'POST /api/export') { if (busy) return send(res, 409, { error: 'exécution en cours' }); return send(res, 200, { ...rt.record(), note: 'Enregistrements écrits dans data/civ, data/memory et data/agents/operational.json ; publication = commit humain.' }); }
    return send(res, 404, { error: 'action inconnue' });
  } catch (e) { return send(res, 400, { error: String(e.message || e).slice(0, 200) }); }
});
server.listen(port, '127.0.0.1', () => console.log(`CORE control centre (local only): http://127.0.0.1:${port}/#token=${TOKEN}`));
