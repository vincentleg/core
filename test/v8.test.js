// CORE V8 — Civilization Intelligence: scenario layer honesty, recorded mobility outputs, traces.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..'), read = p => fs.readFileSync(path.join(ROOT, p), 'utf8'), json = p => JSON.parse(read(p)), imp = p => import(path.join(ROOT, p));
const mobility = () => ({ results: json('data/mobility/results.json'), manifest: json('data/mobility/manifest.json'), geometry: json('data/mobility/geometry.json') });

test('scenarios: every scenario renders with its status, uncertainty, verdict and replay label; nothing reads as proven', async () => {
  const SC = await imp('src/earth/scenarios.mjs'), D = mobility();
  for (const s of D.results.scenarios) {
    const h = SC.panelHTML(D, s.id, false);
    assert.match(h, /modèle non calibré/); assert.match(h, /Ce que ce modèle ne sait pas/); assert.match(h, /une relecture, pas une simulation en direct/);
    assert.ok(h.includes('Verdict') && h.includes('Retirer de la carte'));
    assert.doesNotMatch(h, /prouvé|recommandé :|validé|vérifié dans la réalité/i);
  }
  for (const [k, [label, tone]] of Object.entries(SC.STATUS)) { assert.notEqual(tone, 'ok', `${k} must not use the "proven" green`); assert.doesNotMatch(label, /prouvé|validé/i); }
  assert.match(SC.STATUS['promising-uncalibrated'][0], /revue humaine requise/);
  for (const p of Object.values(SC.PRIMITIVES)) assert.doesNotMatch(p.color, /^#(2|3)[0-9a-f]c[0-9a-f]{3}$|green/i);
});

test('scenarios: statuses and verdict follow the recorded numbers (beyond-noise rule), never the other way round', () => {
  const R = json('data/mobility/results.json');
  for (const s of R.scenarios.filter(x => x.id !== 'S0')) {
    const worse = Object.entries(s.comparison).filter(([, c]) => c.beyondNoise && c.delta > 0).map(([k]) => k);
    if (worse.includes('carDelay') || worse.includes('busTravelTime')) assert.equal(s.status, 'unsupported', s.id);
    if (s.status === 'promising-uncalibrated') assert.ok(!worse.length && s.improves.length, s.id);
  }
  assert.match(R.verdict, /non calibré/); assert.match(R.verdict, /revue humaine/);
  assert.equal(R.search.generated, R.search.rejected.length + R.search.simulated.length);
});

test('traces: one per scenario, bounded, same window and step, ids stable, coordinates inside the study area', () => {
  const M = json('data/mobility/manifest.json'), ids = json('data/mobility/results.json').scenarios.map(s => s.id);
  for (const id of ids) {
    const t = json(`data/mobility/trace-${id}.json`); assert.equal(t.scenario, id); assert.equal(t.start, 600); assert.equal(t.step, 2); assert.equal(t.frames.length, 121);
    for (const f of t.frames) { assert.ok(f.length <= 200); for (const v of f) { assert.equal(v.length, 5); assert.ok(v[1] > -122.42 && v[1] < -122.39 && v[2] > 37.77 && v[2] < 37.79); assert.ok(v[4] === 0 || v[4] === 1); } }
  }
  assert.ok(M.calibration && M.synthetic.length && M.reproduce && M.blockers.length);
});

test('world: the scenario layer is reachable from the mobility mission and by link, and is reversible', () => {
  const app = read('src/earth/app.mjs'), panels = read('src/earth/civ-panels.mjs'), miss = read('src/civilization/missions.mjs');
  assert.match(panels, /data-sim="S0"/); assert.match(miss, /simulation: 'SUMO 1\.27\.1/);
  assert.match(app, /h\.get\('sim'\)/); assert.match(app, /function hideSimulation/); assert.match(app, /data-scn-off/);
});

test('companion: words become one typed action with validated parameters; sharing and deleting are never performed', async () => {
  const A = await imp('src/voice/actions.mjs'), reg = json('data/agents/sf-civilization.json');
  const ctx = { agents: reg.agents, missions: A.MISSION_INDEX };
  const P = s => A.parse(s, ctx);
  assert.deepEqual(P('Go to the Golden Gate'), { name: 'navigate_to_place', params: { place: 'golden-gate' } });
  assert.deepEqual(P('rejoue la simulation des feux'), { name: 'start_simulation', params: { scenario: 'B' } });
  assert.deepEqual(P('show the bus lane simulation'), { name: 'start_simulation', params: { scenario: 'A' } });
  assert.equal(P('compare scenarios').name, 'compare_scenarios');
  assert.deepEqual(P('open the mobility mission'), { name: 'open_mission', params: { mission: 'mission.sf.mobility' } });
  assert.deepEqual(P('switch to the hybrid layer'), { name: 'switch_world_layer', params: { layer: 'hybrid' } });
  assert.deepEqual(P('change language to Japanese'), { name: 'change_language', params: { lang: 'ja' } });
  const code = reg.agents.find(a => a.code).code;
  assert.equal(P(`follow ${code}`).name, 'follow_agent'); assert.equal(P(`find ${code.toLowerCase()}`).params.agent, reg.agents.find(a => a.code === code).id);
  const ask = P(`ask ${code}: why is Folsom congested?`); assert.equal(ask.name, 'ask_agent'); assert.equal(ask.params.question, 'why is Folsom congested?');
  assert.equal(P('open my profile').name, 'open_profile'); assert.equal(P('report on housing').params.mission, 'mission.sf.housing-resilience');
  assert.equal(P('blah blah').name, null); assert.equal(P('follow CORE-ZZZ-9999').name, null);
  // Injection: nothing outside the registry, no unvalidated values, no script in URLs.
  for (const bad of [{ name: 'eval', params: {} }, { name: 'navigate_to_place', params: { place: 'javascript:alert(1)' } }, { name: 'open_mission', params: { mission: '"><img src=x>' } }, { name: 'switch_world_layer', params: { layer: 'real', extra: 1 } }, { name: 'ask_agent', params: { agent: reg.agents[0].id, question: 'x'.repeat(301) } }])
    assert.equal(A.validate(bad, ctx).ok, false, JSON.stringify(bad).slice(0, 60));
  const p = A.plan(P('<script>alert(1)</script> go to soma'), ctx); assert.ok(p.ok); assert.doesNotMatch(p.href, /[<>"]/);
  for (const s of ['delete all my data', 'share my idea', 'publish this']) { const pl = A.plan(P(s), ctx); assert.equal(pl.confirm, true, s); assert.equal(pl.call, undefined, s); }
  for (const k of Object.keys(A.ACTIONS)) assert.ok(A.plan({ name: k, params: {} }, ctx).ok === (Object.keys(A.ACTIONS[k].params).length === 0), k);
});

test('companion: the mission index matches the runtime missions; voice is on-device only and never auto-starts', async () => {
  const A = await imp('src/voice/actions.mjs'), AN = await imp('src/civilization/analyses.mjs'), MS = await imp('src/civilization/missions.mjs');
  const D = {}; for (const [k, p] of Object.entries(AN.FILES)) D[k] = JSON.parse(read(p));
  const ids = MS.buildMissions(D, json('data/agents/sf-civilization.json'), { today: '2026-10-16T00:00:00Z' }).map(m => m.id);
  assert.deepEqual(A.MISSION_INDEX.map(m => m.id), ids);
  const src = read('src/voice/companion.mjs');
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /webkitSpeechRecognition/); assert.match(src, /processLocally = true/); assert.match(src, /localService/);
  assert.doesNotMatch(src, /\beval\(|new Function|innerHTML = [^`]*\$\{(?!esc)/);
  assert.match(src, /mic\.onclick = \(\) =>/); // the microphone starts only from an explicit press
  const nav = read('src/shell/nav.mjs'); assert.match(nav, /import\('\.\.\/voice\/companion\.mjs'\)/); // loaded only on demand
});

test('i18n: ten languages, English default and fallback, Arabic right-to-left, drafts labelled unreviewed', async () => {
  const I = await imp('src/i18n/i18n.mjs'), { STRINGS } = await imp('src/i18n/strings.mjs');
  assert.deepEqual(I.LANGS.map(l => l[0]), ['en', 'zh-Hans', 'hi', 'es', 'fr', 'ar', 'pt', 'bn', 'ru', 'ja']);
  const st = { m: new Map(), getItem(k) { return this.m.get(k) ?? null; }, setItem(k, v) { this.m.set(k, v); } };
  assert.equal(I.lang(st), 'en'); st.setItem('core.lang', 'xx'); assert.equal(I.lang(st), 'en'); st.setItem('core.lang', 'ar'); assert.equal(I.lang(st), 'ar'); assert.equal(I.dir('ar'), 'rtl'); assert.equal(I.dir('ja'), 'ltr');
  assert.equal(I.t('cmp.history', {}, 'ja'), STRINGS.en['cmp.history']);
  for (const [c] of I.LANGS) { for (const k of ['nav.explore', 'nav.create', 'nav.together', 'nav.me', 'nav.language', 'cmp.title', 'cmp.do', 'lang.draft']) assert.ok(STRINGS[c][k] || STRINGS.en[k], `${c} ${k}`); if (c !== 'en') assert.equal(I.STATUS[c], 'draft-unreviewed'); }
  for (const [c] of I.LANGS) for (const [k, v] of Object.entries(STRINGS[c])) { assert.ok(k in STRINGS.en, `${c}: unknown key ${k}`); assert.deepEqual((v.match(/\{\w+\}/g) || []).sort(), (STRINGS.en[k].match(/\{\w+\}/g) || []).sort(), `${c} ${k} placeholders`); }
});
