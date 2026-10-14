// Re-validates every retained model statement of a recorded cognitive mission with the current validator
// (citations, numbers, decision language, semantic checks). Tool calls are replayed to rebuild typed evidence.
// Statements whose numbers no longer match because live inputs changed since recording are reported separately.
//   node scripts/revalidate-mission.mjs data/missions/cognitive/<file>.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../src/coord.js'), KN = require('../src/knowledge.js'), ORG = require('../src/org.js'), COG = require('../src/cognitive.js'), M = require('../src/missions.js');
const m = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const manifest = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}, verified = {};
for (const d of manifest.datasets) { const t = fs.readFileSync(`data/sf/${d.file}`, 'utf8'), k = d.file.replace('.geojson', ''); data[k] = JSON.parse(t); verified[k] = crypto.createHash('sha256').update(t).digest('hex') === d.sha256 ? 'ok' : 'mismatch'; }
const st = JSON.parse(fs.readFileSync('data/feeds/state.json', 'utf8'));
const env = { ctx: C.buildContext({ manifest, data, verified }), feeds: JSON.parse(fs.readFileSync('data/feeds/items.json', 'utf8')), feedState: st, feedHealth: st.health, knowledge: KN.load(JSON.parse(fs.readFileSync('data/knowledge/library.json', 'utf8'))), now: new Date().toISOString() };
const reg = ORG.buildRegistry(), r = COG.newCognitive(m.origin, env);
r.target = { ...m.target, label: m.target.segment ? M.segLabel(env, m.target.segment) : '' };
const item = env.feeds.items.find(i => i.id === m.target.item); r.places = item ? [item.title] : [];
for (const c of m.toolCalls) COG.execTool(r, env, reg, reg.agents.find(a => a.id === c.agent), c.tool, c.args);
const changed = new Set(r.evidence.filter((e, i) => m.evidence[i] && m.evidence[i].claim !== e.claim).map(e => e.id));
const out = { mission: m.id, statements: m.board.length, rejected: [], inputsChanged: [] };
for (const b of m.board) {
  const why = COG.checkStatement(r, b.statement, b.cites, b.kind); if (!why) continue;
  (b.cites.some(c => changed.has(c)) && /^\[numbers\]/.test(why) ? out.inputsChanged : out.rejected).push({ id: b.id, statement: b.statement, why });
}
console.log(JSON.stringify(out, null, 1));
