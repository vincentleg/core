'use strict';
// R2 visual agent command centre: authoritative counts, recorded status sources, missing-data labels, location search,
// honest contribution links and privacy boundaries.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const ARP = import('../src/earth/agent-records.mjs');
const REG = json('data/agents/sf-civilization.json'), WORK = json('data/intelligence/work.json'), URBAN = json('data/urban/latest.json'), CIV = json('data/civ/index.json');
const index = async () => (await ARP).buildIndex({ registry: REG.agents, work: WORK, urban: URBAN, civ: CIV });

test('authoritative agent counts come from the registry: 510 identities, 501 in San Francisco, 9 coordinators', async () => {
  const AR = await ARP, c = AR.registryCounts(REG);
  assert.deepEqual([c.total, c.sanFrancisco, c.outsideSanFrancisco], [REG.counts.total, REG.counts.sanFrancisco, REG.counts.total - REG.counts.sanFrancisco]);
  assert.deepEqual([c.total, c.sanFrancisco, c.outsideSanFrancisco], [510, 501, 9]);
  assert.ok(REG.agents.filter(a => a.city !== 'san-francisco').every(a => ['global', 'assembly', 'council', 'geo-director'].includes(a.level)));
  assert.equal(Object.values(c.modes).reduce((a, b) => a + b, 0), 510);
  // The urban map shows the San Francisco identities except the single city-level direction (scripts/urban-build.mjs).
  assert.equal(json('data/urban/catalog.json').agents.length, c.sanFrancisco - REG.agents.filter(a => a.city === 'san-francisco' && a.level === 'city').length);
  const { DEMO_AGENTS } = await import('../src/earth/demo.mjs');
  assert.ok(DEMO_AGENTS.every(a => REG.agents.some(r => r.id === a.id && r.code === a.code)), 'demo identities come from the registry');
});

test('records join only published runs, with tools, rejections, findings and their provenance', async () => {
  const AR = await ARP, I = await index();
  for (const t of WORK.run.tasks) assert.ok(I.records(t.agent).work.length, t.agent);
  const tools = WORK.events.filter(e => e.kind === 'tool_completed').length, rejected = WORK.events.filter(e => e.kind === 'tool_rejected').length;
  assert.equal(REG.agents.reduce((n, a) => n + I.records(a.id).tools.length, 0), tools);
  assert.equal(REG.agents.reduce((n, a) => n + I.records(a.id).rejected.length, 0), rejected);
  const housing = I.records('core.san-francisco.housing.lead');
  assert.deepEqual(housing.findings.map(f => [f.id, f.source]), [['F6', 'U.S. Census Bureau'], ['F7', 'U.S. Census Bureau'], ['F8', 'model core-fluid-queue-1']]);
  for (const t of URBAN.tasks) assert.ok(I.records(t.agent).urban.length, t.agent);
  for (const m of CIV.missions) for (const p of m.participants) assert.ok(I.records(p).civ.some(x => x.id === m.id));
  assert.deepEqual(AR.lastRecorded(I, 'core.council.geo.san-francisco'), { at: WORK.run.tasks.find(t => t.agent === 'core.council.geo.san-francisco').completed, source: AR.FILES.work });
  const withWork = REG.agents.filter(a => { const r = I.records(a.id); return r.work.length + r.urban.length + r.civ.length; }).length;
  assert.ok(withWork > 0 && withWork < 60, `only a minority of identities have recorded work (${withWork})`);
});

test('dossier names the source of every status and labels missing data instead of inventing it', async () => {
  const AR = await ARP, I = await index();
  const idle = REG.agents.find(a => a.executionMode === 'simulated' && !I.records(a.id).work.length && !I.records(a.id).urban.length && !I.records(a.id).civ.length);
  const h = AR.dossierHTML(I, idle.id, { mapState: { value: 'idle', source: 'no recorded or running task' } });
  for (const s of ['No recorded mission for this agent', 'Not recorded', 'No tool execution recorded', 'No evidence reference recorded', 'registered identity animated by the deterministic CORE engine', 'describes capability, not activity', 'Movement is a visualisation', 'no recorded or running task', 'No agent can approve a conclusion or authorise real-world action'])
    assert.ok(h.includes(s), s);
  for (const f of [AR.REGISTRY, AR.FILES.work, AR.FILES.urban, AR.FILES.civ]) assert.ok(h.includes(f), f);
  const w = AR.dossierHTML(I, 'core.san-francisco.housing.lead');
  assert.match(w, /Recorded local-model investigation/); assert.match(w, /calculate_scenarios/); assert.match(w, /Pending; model review is not human approval/);
  assert.match(w, /browser replay; not live telemetry/, 'without a map state the default label still denies live telemetry');
  assert.match(AR.dossierHTML(I, 'nobody'), /not in the published registry/);
  const evil = AR.buildIndex({ registry: [{ id: 'x', code: '<img src=x onerror=alert(1)>', role: '<script>', neighborhood: '"><svg onload=alert(2)>', executionMode: 'simulated', post: [-122.4, 37.77] }] });
  assert.doesNotMatch(AR.dossierHTML(evil, 'x') + AR.nearHTML(evil, [-122.4, 37.77]), /<script>|<img|<svg/);
});

test('location search lists the nearest registered posts within 500 m, and says so when there are none', async () => {
  const AR = await ARP, I = await index(), pt = [-122.4038, 37.7793], r = AR.near(I, pt);
  assert.ok(r.total > 0 && r.items.length <= 12);
  assert.ok(r.items.every(x => x.d <= 500)); assert.deepEqual(r.items.map(x => x.d), [...r.items.map(x => x.d)].sort((a, b) => a - b));
  const far = AR.near(I, [2.35, 48.85]); assert.equal(far.total, 0);
  assert.match(AR.nearHTML(I, [2.35, 48.85], AR.registryCounts(REG)), /No registered agent has a virtual post here[\s\S]*510 registered identities, 501 assigned to San Francisco and 9/);
  assert.match(AR.nearHTML(I, pt), /data-agent="core\./);
});

test('contributions link to the recorded investigation only for the same mission, after it, and never as "analysed"', async () => {
  const AR = await ARP, I = await index(), after = new Date(Date.parse(WORK.run.completed) + 3600e3).toISOString(), before = '2026-10-01T00:00:00Z';
  const rec = (mission, at) => ({ mission, events: [{ at }] });
  const rel = AR.relatedInvestigation(I, rec('mission.sf.mobility', after));
  assert.equal(rel.analysedContribution, false); assert.equal(rel.relation, 'same-mission-prior-investigation'); assert.equal(rel.agents.length, new Set(WORK.run.tasks.map(t => t.agent)).size);
  assert.equal(AR.relatedInvestigation(I, rec('mission.sf.mobility', before)), null);
  assert.equal(AR.relatedInvestigation(I, rec('mission.sf.housing', after)), null);
  assert.equal(AR.relatedInvestigation(AR.buildIndex({}), rec('mission.sf.mobility', after)), null);
  assert.match(AR.relatedHTML(I, rec('mission.sf.mobility', after)), /the agents did not analyse your text/);
  assert.match(AR.dossierHTML(I, 'core.san-francisco.housing.lead', { mine: [rec('mission.sf.mobility', after)] }), /1 private contribution\(s\) in this browser concern the same mission[\s\S]*did not analyse them/);
  assert.doesNotMatch(AR.dossierHTML(I, REG.agents.find(a => !I.records(a.id).work.length).id, { mine: [rec('mission.sf.mobility', after)] }), /Your contributions/);
});

test('mission workspace joins only the matching published investigation and fails closed on missing records', async () => {
  const AR = await ARP, I = await index();
  const h = AR.missionRunHTML(I, AR.MISSION_OF_WORK);
  assert.match(h, /data\/intelligence\/work\.json/);
  assert.match(h, /data-urban="intelligence"/);
  assert.match(h, /not live execution or a review of contributions/);
  assert.match(h, /Pending; model review is not human approval/);
  assert.match(AR.missionRunHTML(I, 'mission.sf.housing-resilience'), /No published agent investigation is linked/);
  const failed = AR.buildIndex({ failed: [AR.FILES.work] });
  assert.match(AR.missionRunHTML(failed, AR.MISSION_OF_WORK), /Could not load data\/intelligence\/work\.json/);
  assert.doesNotMatch(AR.missionRunHTML(failed, AR.MISSION_OF_WORK), /data-urban="intelligence"/);
});

test('privacy and execution boundaries: public files only, no private state, no agent execution from the inspector', async () => {
  const AR = await ARP, src = fs.readFileSync('src/earth/agent-records.mjs', 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\.core-local\/|localStorage|fetch\(|XMLHttpRequest|ollama|enableReasoning|runInvestigation|submit\(/);
  const { FILES } = await import('../scripts/public-manifest.mjs');
  for (const f of [AR.REGISTRY, ...Object.values(AR.FILES), 'src/earth/agent-records.mjs']) assert.ok(FILES.includes(f), `${f} is published`);
  const app = fs.readFileSync('src/earth/app.mjs', 'utf8');
  assert.match(app, /S\.layer\?\.mode === 'real'[^\n]*return/); assert.match(app, /queryRenderedFeatures\(e\.point, \{ layers \}\)/);
  assert.match(app, /records: recordsHTML/); assert.match(app, /mine: Object\.values\(STORE\.lifecycles\(\)\)/);
  const urban = fs.readFileSync('src/urban/app.mjs', 'utf8'); assert.equal((urban.match(/\+records\(id\)\+/g) || []).length, 2);
  assert.match(fs.readFileSync('src/me/me.mjs', 'utf8'), /AR\.relatedHTML\(records, r\)/);
});

test('edited browser modules parse as ES modules (catches duplicate declarations the Node imports cannot reach)', () => {
  const { execFileSync } = require('node:child_process');
  for (const f of ['src/earth/app.mjs', 'src/urban/app.mjs', 'src/me/me.mjs', 'src/earth/agent-records.mjs']) execFileSync(process.execPath, ['--check', f]);
});

test('mobile language selector is moved clear of an open panel', () => {
  const css = fs.readFileSync('src/earth/earth.css', 'utf8');
  assert.match(css, /:has\(#ea-panel:not\(\[hidden\]\), #ea-list:not\(\[hidden\]\)\) \.le-lang-floating \{ top: calc\(var\(--navh\) \+ 54px\); bottom: auto;/);
  assert.match(css, /body\.earth\.ea-explore:not\(\.twin-open\):has\([^)]*\)[^{]*\.le-lang-floating \{ top: calc\(var\(--ci-shell\) \+ var\(--ci-h\) \+ 54px\); \}/);
  assert.match(css, /@media \(min-width: 861px\) \{\s*body\.earth:not\(\.twin-open\) #ea-panel:not\(\[hidden\]\) \{ bottom: 64px; \}/);
});

test('a file that failed to load is shown as unavailable, never as an absence of records', async () => {
  const AR = await ARP;
  const noRegistry = AR.buildIndex({ work: WORK, urban: URBAN, civ: CIV, failed: [AR.REGISTRY] });
  for (const h of [AR.dossierHTML(noRegistry, 'core.san-francisco.housing.lead'), AR.nearHTML(noRegistry, [-122.4038, 37.7793])]) {
    assert.match(h, /Could not load data\/agents\/sf-civilization\.json[\s\S]*not as absent; reload to retry/);
    assert.doesNotMatch(h, /not in the published registry|No registered agent has a virtual post/);
  }
  const noWork = AR.buildIndex({ registry: REG.agents, urban: URBAN, civ: CIV, failed: [AR.FILES.work] });
  const idle = REG.agents.find(a => !noWork.records(a.id).urban.length && !noWork.records(a.id).civ.length).id, h = AR.dossierHTML(noWork, idle);
  assert.match(h, /Could not load data\/intelligence\/work\.json/); assert.match(h, /Unavailable: records could not be loaded/);
  assert.doesNotMatch(h, /No recorded mission for this agent|No tool execution recorded|No evidence reference recorded|>Not recorded</);
  assert.match(AR.nearHTML(noWork, [-122.4038, 37.7793]), /records unavailable/);
  assert.doesNotMatch(AR.dossierHTML(await index(), idle), /Could not load/, 'a complete load shows no failure notice');
});

test('Gate B execution class: recorded from published files only; replay and inactive otherwise; never live without a verified source', async () => {
  const AR = await ARP, ix = await index();
  const worker = WORK.run.tasks[0].agent, silent = REG.agents.find(a => AR.executionClass(ix, a.id) !== 'recorded' && a.executionMode !== 'unavailable').id;
  assert.equal(AR.executionClass(ix, worker), 'recorded');
  assert.equal(AR.executionClass(ix, worker, 'working'), 'recorded', 'map motion never upgrades or downgrades recorded work');
  assert.equal(AR.executionClass(ix, silent, 'working'), 'replay');
  assert.equal(AR.executionClass(ix, silent, 'idle'), 'inactive');
  assert.equal(AR.executionClass(ix, silent), 'inactive');
  for (const a of REG.agents) assert.notEqual(AR.executionClass(ix, a.id, 'working'), 'live');
  assert.equal(AR.executionClass(ix, silent, 'working', { verified: false, agent: silent }), 'replay');
  assert.equal(AR.executionClass(ix, silent, 'working', { verified: true, agent: 'other' }), 'replay');
});

test('Gate B mission card names mission, problem, evidence, tools, review and history with sources; escapes replay input', async () => {
  const AR = await ARP, ix = await index(), worker = WORK.run.tasks[0].agent;
  const card = AR.missionCardHTML(ix, worker, { state: 'working', stateLabel: 'at work', missionTitle: 'x' });
  assert.match(card, /data-exec="recorded"/); assert.match(card, /recorded investigation/); assert.match(card, /data\/intelligence\/work\.json|data\/urban|data\/civ/);
  for (const k of ['Responsibility', 'Why here', 'Problem', 'Evidence', 'Tools', 'Human review', 'History']) assert.ok(card.includes(`<dt>${k}</dt>`), k);
  assert.match(card, /replay/);
  const silent = REG.agents.find(a => AR.executionClass(ix, a.id) !== 'recorded' && a.executionMode !== 'unavailable').id;
  const replay = AR.missionCardHTML(ix, silent, { state: 'working', stateLabel: '<b>x</b>', missionTitle: '<img src=x onerror=alert(1)>' });
  assert.match(replay, /data-exec="replay"/); assert.match(replay, /browser replay assignment/); assert.match(replay, /no AI is running/);
  assert.doesNotMatch(replay, /<img|<b>x/);
  assert.equal(AR.missionCardHTML(AR.buildIndex({ registry: [], failed: [AR.REGISTRY] }), worker), '');
});

test('agent mission view follows saved investigation steps and keeps evidence, assumptions and inactivity distinct', async () => {
  const AR = await ARP, ix = await index(), worker = 'core.san-francisco.housing.lead';
  const h = AR.missionCardHTML(ix, worker);
  for (const field of ['Identity', 'Assigned location', 'Objective', 'Current status', 'Evidence examined', 'Next available action']) assert.match(h, new RegExp(`<dt>${field}</dt>`));
  assert.match(h, /Recorded investigation · 7 steps/);
  assert.match(h, /data-agent-location="core\.san-francisco\.housing\.lead"/);
  assert.match(h, /data-mission="mission\.sf\.mobility"/);
  assert.match(h, /data-urban="workbench"/);
  assert.match(h, /Computed, uncalibrated[\s\S]*\[F8\]/);
  assert.match(h, /Unverified hypothesis[\s\S]*authorized catalog cannot establish absence/);
  assert.match(h, /F6 \(evidence-backed geometry only\)/);
  assert.match(h, /Oakland location is unsupported/);
  const idle = REG.agents.find(a => !ix.records(a.id).work.length && !ix.records(a.id).urban.length && !ix.records(a.id).civ.length);
  const inactive = AR.missionCardHTML(ix, idle.id);
  assert.match(inactive, /No recorded objective/); assert.match(inactive, /Live execution is unavailable here/);
  assert.doesNotMatch(inactive, /Recorded investigation · 7 steps|data-urban="workbench"/);
});

test('Gate B: a visitor-run browser task is neither replay nor recorded work', async () => {
  const AR = await ARP, ix = await index();
  const silent = REG.agents.find(a => AR.executionClass(ix, a.id) !== 'recorded' && a.executionMode !== 'unavailable').id;
  const card = AR.missionCardHTML(ix, silent, { state: 'working', stateLabel: 'scenario task in this browser', kind: 'task' });
  assert.match(card, /data-exec="inactive"/); assert.doesNotMatch(card, /· replay/);
});
