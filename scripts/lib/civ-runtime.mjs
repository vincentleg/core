// Phase 9 runtime shared by `scripts/civ.mjs` (CLI) and `scripts/control-server.mjs` (local control centre).
// Local only. Memory: .core-local/memory.sqlite (git-ignored). Live status: .core-local/civ-live.json. Emergency stop:
// .core-local/STOP (same file as the Phase 8 supervisor). Publishing (data/civ, data/memory, data/agents/operational.json)
// happens only on explicit `record`, and still needs a human commit (git hooks run on commit and push).
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { loadEnv } from './core-env.mjs';
import { loadSnapshot } from './snapshot.mjs';
const require = createRequire(import.meta.url);
const CITIES = require('../../src/cities.js'), WD = require('../../src/civ-world.js'), CT = require('../../src/civ-tools.js'), E = require('../../src/civ-engine.js'), MEM = require('../../src/civ-memory.js'), ORG = require('../../src/org.js'), KN = require('../../src/knowledge.js');
export const DIR = '.core-local', LIVE = `${DIR}/civ-live.json`, STOP = `${DIR}/STOP`, MEMFILE = `${DIR}/memory.sqlite`;
const PERM_ACTIONS = { read: ['lire les sources autorisées'], analyze: ['exécuter ses outils autorisés', 'produire des constats sourcés'], propose: ['planifier une mission', 'déléguer des sous-tâches bornées', 'proposer une recommandation'], review: ['contester une source', 'rejeter un constat non étayé', 'vérifier les preuves'], govern: ['proposer une décision à la revue humaine'] };
const ROLE_CLASS = { executive: 'opérationnel autonome', coordinator: 'opérationnel autonome', lead: 'opérationnel autonome', 'lead (relais)': 'opérationnel autonome' };

export async function createRuntime({ llm = null, memoryFile = MEMFILE, onEvent = null, snapshotMode = 'replay', snapshotNow = new Date().toISOString() } = {}) {
  fs.mkdirSync(DIR, { recursive: true });
  // Phase 10: every operational city (src/cities.js) gets its own verified snapshot and engine; one shared memory.
  const { env, manifest: corridor } = loadEnv(), registry = ORG.buildWorld(), cxs = {}, manifests = {};
  for (const c of CITIES.operational()) {
    const policies = Object.fromEntries(Object.values(c.sources).map(s => [s.id, s]));
    const { manifest: man, data, freshness } = loadSnapshot(c.studyArea.dataDir, { mode: snapshotMode, policies, now: snapshotNow });
    cxs[c.id] = CT.context({ manifest: man, data, city: c.id }); cxs[c.id].snapshotHealth = freshness; manifests[c.id] = man;
  }
  const manifest = manifests['san-francisco'], cx = cxs['san-francisco'];
  const memory = MEM.open(memoryFile), live = { version: 'core-civ-live-v1', mode: 'local-civ', pid: process.pid, running: [], events: [], updated: null, stopped: fs.existsSync(STOP) };
  const writeLive = () => { live.updated = new Date().toISOString(); live.stopped = fs.existsSync(STOP); live.queued = []; fs.writeFileSync(LIVE, JSON.stringify(live)); };
  const handle = ev => {
    if (fs.existsSync(STOP)) engine.stopAll();
    live.events.push(ev); live.events = live.events.slice(-300);
    if (ev.kind === 'subtask') { const r = live.running.find(x => x.mission === ev.mission); if (r) r.agents = [...new Set([...r.agents, ev.data.agent])]; }
    writeLive(); if (onEvent) onEvent(ev);
  };
  const engines = Object.fromEntries(Object.keys(cxs).map(c => [c, E.createEngine({ city: c, registry, cx: cxs[c], env: c === 'san-francisco' ? env : null, memory, llm, onEvent: handle })]));
  const world = WD.createWorld({ registry, cxs, memory, onEvent: handle });
  const missionId = p => `civ:${p.city === 'san-francisco' ? '' : p.city + ':'}${p.workflow}:${p.nhood.toLowerCase().replace(/[^a-z]+/g, '-')}@${cxs[p.city].stamp}`;
  const cityOf = id => /^world:/.test(id) ? 'world' : (Object.keys(cxs).find(c => c !== 'san-francisco' && id.startsWith(`civ:${c}:`)) || 'san-francisco');
  // Facade with the Phase 9 engine API, spanning all cities.
  const engine = {
    discoverAll: () => Object.values(engines).flatMap(e => e.discoverAll()).sort((a, b) => b.priority - a.priority || a.city.localeCompare(b.city) || a.workflow.localeCompare(b.workflow) || a.nhood.localeCompare(b.nhood)),
    async runQueue(list, o) { const out = []; for (const c of Object.keys(engines)) { const sub = list.filter(p => (p.city || 'san-francisco') === c); if (sub.length) out.push(...await engines[c].runQueue(sub, o)); } return out; },
    humanDecision: (m, r, d, n) => (cityOf(m.id) === 'world' ? world : engines[cityOf(m.id)]).humanDecision(m, r, d, n),
    stopAll: () => { for (const e of Object.values(engines)) e.stopAll(); world.stopAll(); },
    resetStop: r => Object.values(engines).every(e => e.resetStop(r)) && world.resetStop(r),
    workflows: E.WORKFLOWS, limits: engines['san-francisco'].limits,
  };
  // Identity and knowledge layers (versioned) for every registered profile.
  const version = `${registry.version}@${corridor.generated_at.slice(0, 10)}`;
  for (const a of registry.agents) { memory.putIdentity(a.id, version, { code: a.code, role: a.role, department: a.department, permission: a.permission, tools: a.tools, supervisor: a.supervisor, executionMode: a.executionMode }); memory.putKnowledge(a.id, KN.collection(env.knowledge, a).map(d => ({ id: d.id, version: d.version, source: d.source }))); }

  async function runAll({ concurrency = 2, problems = null } = {}) {
    if (fs.existsSync(STOP)) return { refused: 'arrêt d’urgence actif' };
    const list = problems || engine.discoverAll();
    for (const p of list) live.running.push({ mission: missionId(p), city: p.city, workflow: p.workflow, nhood: p.nhood, agents: [], startedAt: new Date().toISOString() });
    writeLive(); const t0 = Date.now(), cpu0 = process.cpuUsage();
    const missions = await engine.runQueue(list, { concurrency });
    live.running = []; writeLive();
    const cpu = process.cpuUsage(cpu0);
    return { missions, metrics: { wallMs: Date.now() - t0, cpuMs: Math.round((cpu.user + cpu.system) / 1000), concurrency, rssMB: Math.round(process.memoryUsage().rss / 1e6), machine: `${os.cpus()[0].model}, ${os.cpus().length} cœurs` } };
  }
  // Focused missions started explicitly (not by discovery): decision analysis, cross-city comparison.
  async function runFocused(kind, args) { if (fs.existsSync(STOP)) return { refused: 'arrêt d’urgence actif' }; return kind === 'world' ? world.compare(args.pairs, { resume: !args.fresh }) : engines[args.city].run(args.workflow, args.nhood); }
  const load = id => { const cp = memory.loadCheckpoint(id); return cp ? cp.body : null; };
  function decide(id, reviewer, decision, note) { const m = load(id); if (!m) throw new Error('mission inconnue'); engine.humanDecision(m, reviewer, decision, note); memory.checkpoint(m.id, m.state, m); return m; }
  function missions() { return memory.checkpoints().map(c => load(c.mission)).filter(Boolean); }

  // Operational registry v2: identity + class + hierarchy + memory namespace + actual history (never inflated).
  function operationalRegistry() {
    const ms = missions(), idx = ORG.index(registry), eps = new Map();
    for (const a of registry.agents) eps.set(a.id, memory.episodes(a.id, { limit: 500 }));
    const cog = JSON.parse(fs.readFileSync('data/missions/cognitive/index.json', 'utf8')).missions, det = JSON.parse(fs.readFileSync('data/missions/index.json', 'utf8')), ops = fs.existsSync('data/operations/log.json') ? JSON.parse(fs.readFileSync('data/operations/log.json', 'utf8')) : { tasks: [] };
    const evals = JSON.parse(fs.readFileSync('data/agents/evaluations.json', 'utf8')).results;
    const agents = registry.agents.map(a => {
      const e = eps.get(a.id), roles = new Set(e.flatMap(x => x.role.split(', ')));
      const cls = a.executionMode === 'llm' ? 'assisté par modèle' : [...roles].some(r => ROLE_CLASS[r]) ? 'opérationnel autonome' : a.executionMode === 'deterministic' ? 'spécialiste déterministe exécutable' : a.executionMode === 'coordination-only' ? 'coordination seule' : 'enregistré, non implémenté';
      const last = [...e.map(x => x.at), ...cog.filter(m => m.agents.includes(a.id)).map(m => m.recorded_at), ...(det.missions.some(m => (m.agentIds || []).includes(a.id)) ? [det.recorded_at] : []), ...ops.tasks.filter(t => t.result && t.agents.some(x => x.id === a.id)).map(t => t.updated)].sort().pop() || null;
      const ev = evals.filter(r => r.agent === a.id);
      return { id: a.id, code: a.code, title: a.role, department: a.department, specialty: a.specialization, class: cls, executionMode: a.executionMode, capabilities: a.tools,
        knowledgeBoundaries: { domains: (registry.departments.find(d => d.id === a.department) || { domains: [] }).domains, documents: memory.knowledge(a.id).map(k => k.doc) },
        territory: a.scope.city === 'new-york' ? (a.scope.level === 'specialist' || a.scope.level === 'department' ? `New York — ${manifests['new-york'].study_area.neighborhoods.join(', ')}` : 'New York') : a.scope.level === 'specialist' || a.scope.level === 'department' ? `San Francisco — ${manifest.study_area.neighborhoods.join(', ')} et corridor Folsom/Howard` : a.scope.level === 'global' || a.scope.level === 'global-domain' ? 'CORE (toutes villes opérationnelles)' : 'San Francisco', city: a.scope.city || null,
        supervisor: a.supervisor || null, directReports: registry.agents.filter(x => x.supervisor === a.id).map(x => x.id), collaborators: [...new Set(e.flatMap(x => x.collaborators || []))].slice(0, 30),
        dependencies: [...new Set(a.tools.flatMap(t => ({ 'safety.crash-profile': ['crashes-agg', 'hin'], 'works.area-windows': ['study-permits'], 'flood.exposure': ['flood-zone', 'study-permits'], 'data.freshness': ['manifest'] }[t] || [])))],
        allowedActions: Object.entries(PERM_ACTIONS).filter(([p]) => ORG.PERMISSIONS.indexOf(p) <= ORG.PERMISSIONS.indexOf(a.permission)).flatMap(([, x]) => x), permission: a.permission,
        requiredApprovals: ['toute décision : revue humaine (human:<nom>)', 'mémoire institutionnelle : revue par un autre agent ; constats sur le monde : approbation humaine'],
        memoryNamespace: `mem:${a.code}`, currentTask: 'aucune exécution en cours (enregistrement)', pastMissions: { civ: e.length, cognitive: cog.filter(m => m.agents.includes(a.id)).length, ruleBased: det.missions.filter(m => (m.agentIds || []).includes(a.id)).length, operations: ops.tasks.filter(t => t.result && t.agents.some(x => x.id === a.id)).length },
        evidenceProduced: e.reduce((n, x) => n + (x.evidence || 0), 0), evaluations: { passed: ev.filter(r => r.pass).length, total: ev.length }, lastGenuineExecution: last, version };
    });
    const counts = agents.reduce((o, a) => ({ ...o, [a.class]: (o[a.class] || 0) + 1 }), {});
    const hierarchy = { executive: 'core.global.coordinator', cityCoordinator: 'core.san-francisco.manager', leads: registry.agents.filter(a => a.id.endsWith('.lead')).map(a => ({ id: a.id, reports: registry.agents.filter(x => x.supervisor === a.id).map(x => x.id) })), reviewers: ['core.san-francisco.research.evidence-verifier', 'core.san-francisco.safety.adversarial-reviewer', 'core.san-francisco.research.evidence-reviewer'], gateway: 'core.san-francisco.governance.gateway', cities: Object.fromEntries(Object.keys(cxs).map(c => [c, { manager: `core.${c}.manager`, gateway: `core.${c}.governance.gateway`, leads: registry.agents.filter(a => a.id.startsWith(`core.${c}.`) && a.id.endsWith('.lead')).map(a => a.id) }])), world: { director: WD.DIRECTOR, methodology: WD.METHOD }, humanAuthority: 'human:<nom> (revue et décision)' };
    return { version: 'core-agent-registry-v2', generated_at: new Date().toISOString(), base: registry.version, counts, hierarchy, agents };
  }
  const fileOf = id => `${id.replace(/[:@/+]/g, '-')}.json`; // Phase 9 file names unchanged for San Francisco ids
  function record() {
    fs.mkdirSync('data/civ/missions', { recursive: true }); fs.mkdirSync('data/memory', { recursive: true });
    // Only missions on each city's CURRENT published snapshot are published (their evidence resolves); missions on
    // superseded snapshots stay in local memory (traceable) and are counted in the index.
    const current = m => m.cities ? m.cities.every(c => cxs[c] && new RegExp(`${c}/[a-z-]+@${cxs[c].stamp}(\\+|$)`).test(m.id)) : !!cxs[cityOf(m.id)] && m.id.endsWith(`@${cxs[cityOf(m.id)].stamp}`);
    const all = missions().filter(m => m.state !== 'DISCOVERED'), ms = all.filter(current), index = ms.map(m => ({ id: m.id, file: fileOf(m.id), city: cityOf(m.id) === 'world' ? null : cityOf(m.id), cities: m.cities || [cityOf(m.id)], scope: m.scope || 'city', participants: [...new Set(m.messages.flatMap(x => [x.from, x.to]).filter(id => registry.agents.some(a => a.id === id)))], workflow: m.workflow, title: m.title, nhood: m.nhood, state: m.state, decision: m.decision && m.decision.state, human: m.human || null, owner: m.owner, priority: m.priority, metrics: m.metrics, findings: m.findings.length, memoryReused: (m.memoryReused || []).length, messages: m.messages.length, model: { calls: m.model.calls, accepted: m.model.accepted.length, rejected: m.model.rejected.length }, at: m.stages[m.stages.length - 1].at }));
    for (const m of ms) fs.writeFileSync(`data/civ/missions/${fileOf(m.id)}`, JSON.stringify({ ...m, results: Object.fromEntries(Object.entries(m.results).map(([k, v]) => [k, { findings: v.findings, rows: (v.rows || []).slice(0, 40), assumptions: v.assumptions || null }])), recorded: { at: new Date().toISOString(), by: 'scripts/civ.mjs (Node, local)', snapshot: m.cities ? Object.fromEntries(m.cities.map(c => [c, manifests[c].generated_at])) : manifests[cityOf(m.id)].generated_at } }, null, 1) + '\n');
    fs.writeFileSync('data/civ/index.json', JSON.stringify({ version: 'core-civ-index-v1', recorded_at: new Date().toISOString(), study_area: manifest.study_area, study_areas: Object.fromEntries(Object.entries(manifests).map(([c, m]) => [c, m.study_area])), missions: index, notPublished: { supersededSnapshots: all.length - ms.length, note: 'missions sur un instantané remplacé : conservées dans la mémoire locale, non publiées' } }, null, 1) + '\n');
    fs.writeFileSync('data/memory/export.json', JSON.stringify(memory.export(), null, 1) + '\n');
    fs.writeFileSync('data/agents/operational.json', JSON.stringify(operationalRegistry(), null, 1) + '\n');
    return { missions: index.length };
  }
  return { engine, engines, world, cxs, manifests, missionId, runFocused, memory, cx, registry, runAll, decide, missions, load, record, operationalRegistry, live, writeLive };
}
