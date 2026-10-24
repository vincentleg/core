'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const demo = import('../src/earth/demo.mjs');
const agents = require('../data/agents/sf-civilization.json').agents;
const work = require('../data/intelligence/work.json');
const model = require('../data/urban/latest.json');

test('R35 exposes exactly two world modes and defaults to Parallel World for a new session', () => {
  const html = fs.readFileSync('world.html', 'utf8');
  const modes = [...html.matchAll(/role="radio" data-layer="([^"]+)" aria-checked="([^"]+)"/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(modes, [['parallel', 'true'], ['real', 'false']]);
  const app = fs.readFileSync('src/earth/app.mjs', 'utf8');
  assert.match(app, /worldMode\(m\) \|\| 'parallel'/);
  assert.match(app, /sessionStorage\.setItem\(LAYER_KEY, m\)/);
  assert.match(app, /'agents', 'hybrid'\].includes\(m\) \? 'parallel'/);
  assert.match(app, /'urban-routes', 'urban-clusters', 'urban-agents'/);
  assert.match(app, /m === 'real' \? 'none' : 'visible'/);
  assert.match(fs.readFileSync('src/earth/agents-layer.mjs', 'utf8'), /m === 'real' \? 'none' : 'visible'/);
});

test('R35 mission uses fourteen geographic subjects with stable published agents and evidence', async () => {
  const { STAGES, DEMO_AGENTS, cameraAt } = await demo;
  assert.equal(STAGES.length, 14);
  assert.equal(new Set(STAGES.map(s => s.id)).size, 14);
  for (const s of STAGES) {
    assert.ok(s.subject && s.title[0] && s.detail[0] && s.panel);
    for (const p of [0, .5, 1]) {
      const c = cameraAt(s, p);
      assert.ok(c.center.every(Number.isFinite) && Number.isFinite(c.zoom));
    }
    assert.deepEqual(cameraAt(s, 0), s.from);
    assert.deepEqual(cameraAt(s, 1), s.to);
  }
  assert.equal(STAGES.at(-1).real, true);
  for (const a of DEMO_AGENTS) {
    assert.ok(agents.some(x => x.id === a.id && x.code === a.code));
    assert.ok(work.run.tasks.some(t => t.agent === a.id && t.status === 'completed'));
  }
  assert.equal(model.request.segment, '5665000');
  assert.ok(work.run.findings.some(f => f.id === 'F8' && f.tool === 'calculate_scenarios'));
  assert.match(STAGES.find(s => s.id === 'exchange').detail[0], /Scripted illustration/);
  assert.match(STAGES.find(s => s.id === 'reality').detail[0], /Verified real-world resolution: none/);
});

test('R35 single timeline pauses, resumes and resets without drifting', async () => {
  const { advanceTimeline, progress } = await demo;
  const state = { elapsed: 0, duration: 1000, paused: false };
  assert.equal(advanceTimeline(state, 250), .25);
  state.paused = true; assert.equal(advanceTimeline(state, 500), .25);
  state.paused = false; assert.equal(advanceTimeline(state, 750), 1);
  state.elapsed = 0; assert.equal(progress(state.elapsed, state.duration), 0);
  assert.equal(advanceTimeline(state, 400), .4);
});

test('R35 scene uses published records and keeps scripted movement separate from execution', () => {
  const code = fs.readFileSync('src/earth/demo.mjs', 'utf8');
  assert.match(code, /E\.state\.urban\?\.intelligence\?\.work/);
  assert.match(code, /report\?\.request\?\.segment === '5665000'/);
  assert.match(code, /Scripted exchange of published finding references/);
  assert.match(code, /E\.setLayer\(st\.real \? 'real' : 'parallel'/);
  assert.match(code, /E\.hideSimulation\(\{ quiet: true \}\)/);
  assert.doesNotMatch(code, /\.runMission\(|\.approve\(|\.publish\(/);
  // Avatars need the module's Marker class (no maplibregl global exists); stale async panels are discarded by stage token.
  assert.doesNotMatch(code, /globalThis\.maplibregl/);
  assert.match(fs.readFileSync('src/earth/app.mjs', 'utf8'), /createDemo\(globalThis\.CORE_EARTH, \{ mode, Marker: maplibregl\.Marker \}\)/);
  assert.match(code, /mine === token && state\.running/);
  assert.match(code, /REAL WORLD · MISSION HANDOFF/);
});

test('R35 legacy world-mode values never restore a third mode', () => {
  const app = fs.readFileSync('src/earth/app.mjs', 'utf8');
  // The pre-R35 persistent key held an automatic default, so it is removed and ignored; only the session key is read.
  assert.match(app, /LEGACY_LAYER_KEY = 'core\.world\.layer'/);
  assert.match(app, /m \|\|= sessionStorage\.getItem\(LAYER_KEY\); \} catch \{\} dropLegacyMode\(\);/);
  assert.doesNotMatch(app, /localStorage\.getItem\(LEGACY_LAYER_KEY\)/);
  const worldMode = eval(app.match(/const worldMode = (m => [^;]+);/)[1]);
  for (const [v, want] of [['real', 'real'], ['parallel', 'parallel'], ['agents', 'parallel'], ['hybrid', 'parallel'], ['bogus', null], [null, null]]) assert.equal(worldMode(v), want);
  assert.equal(worldMode('hybrid') || 'parallel', 'parallel');
  // No user-facing mode label for Real Earth, Hybrid View or CORE World-as-a-mode remains in the world interface.
  for (const f of ['src/earth/app.mjs', 'src/urban/app.mjs', 'src/voice/companion.mjs', 'src/voice/actions.mjs', 'src/civic/ui-journey.mjs', 'src/i18n/strings.mjs', 'world.html']) {
    const code = fs.readFileSync(f, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(code, /Hybrid View|Vue hybride|world\.hybrid|Begin on Real Earth|You are in CORE World|CORE World layer|label: 'Explain Real Earth/, f);
  }
  assert.doesNotMatch(fs.readFileSync('src/urban/app.mjs', 'utf8'), /setLayer\('(agents|hybrid)'/);
});
