// CORE V4 prototype — identity, idea vault, labs, arena, academy, progress (pure modules, WebCrypto in Node).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const load = m => import(path.join(ROOT, 'src/civic', m));
const json = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

test('identity: pseudonymous, private by default, declared ≠ verified, no public ranking for non-adults', async () => {
  const I = await load('identity.mjs');
  assert.match(I.newCoreId(), /^core:[a-z2-9]{10}$/);
  for (const bad of ['ab', ['x', 'y.fr'].join('@'), 'Jean 0612345678', 'http://me']) assert.equal(I.checkPseudonym(bad).ok, false, bad);
  let p = I.createProfile({ pseudonym: 'Arpenteur_42' });
  assert.ok(Object.values(p.visibility).every(v => v === 'private') && p.leaderboards === false && p.contact === 'none');
  assert.deepEqual(I.publicView(p), { id: p.id }, 'nothing is public until the person chooses');
  p = I.declareExpertise(p, 'Urbanisme', 8); p = I.setVisibility(p, 'expertise', 'public'); p = I.setVisibility(p, 'pseudonym', 'public');
  assert.deepEqual(I.publicView(p).expertise, [{ label: 'Urbanisme', basis: 'declared' }]);
  assert.equal(I.publicView(p).ageBand, undefined);
  assert.equal(I.attestCredential(p, 0, { id: 'self' }).ok, false, 'nobody can self-verify');
  const m = I.createProfile({ pseudonym: 'Eleve-test', ageBand: 'minor' });
  assert.throws(() => I.setLeaderboards(m, true), /aucun classement/); assert.throws(() => I.setVisibility(m, 'bio', 'public'), /reste privé/);
});

test('vault: chained fingerprints detect tampering, encryption round-trips, permissions and explicit publication', async () => {
  const V = await load('vault.mjs');
  let idea = V.newIdea({ id: 'i1', owner: 'core:me' });
  idea = await V.addVersion(idea, { title: 'Ombre', problem: 'Cour sans ombre', solution: 'Planter des arbres', at: '2026-10-15T00:00:00Z' });
  idea = await V.addVersion(idea, { title: 'Ombre v2', problem: 'Cour sans ombre', solution: 'Arbres et voiles', at: '2026-10-15T01:00:00Z' });
  assert.equal(idea.versions[1].prev, idea.versions[0].hash); assert.match(idea.versions[0].hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(await V.verifyChain(idea), { ok: true, length: 2 });
  const tampered = structuredClone(idea); tampered.versions[0].solution = 'autre';
  assert.deepEqual(await V.verifyChain(tampered), { ok: false, at: 1 });
  assert.equal(V.canAnalyse(idea), false, 'no analysis without explicit permission');
  assert.equal(V.grant(idea, 'labsAnalysis', true, 'core:other').ok, false);
  assert.equal(V.canRead(idea, 'core:other'), false); assert.equal(V.canRead(idea, 'public'), false);
  assert.match(V.publish(idea, { actor: 'core:me', version: 2, licence: 'CC-BY-4.0', pseudonym: 'Moi' }).error, /brevet/);
  const pub = V.publish(idea, { actor: 'core:me', version: 2, licence: 'CC-BY-4.0', pseudonym: 'Moi', confirmDisclosure: true });
  assert.ok(pub.ok && pub.value.permissions.publication.hash === idea.versions[1].hash && V.canRead(pub.value, 'public'));
  const box = await V.seal(idea, 'correct horse battery staple', 1000);
  assert.ok(!JSON.stringify(box).includes('Arbres'));
  assert.deepEqual(await V.open(box, 'correct horse battery staple', 1000), idea);
  await assert.rejects(V.open(box, 'wrong'), /incorrecte/);
});

test('labs: explainable checklist, no score, permission required, throttled, contest goes to a human', async () => {
  const V = await load('vault.mjs'), L = await load('labs.mjs');
  let idea = V.newIdea({ id: 'i2', owner: 'core:me' });
  idea = await V.addVersion(idea, { title: 'T', problem: 'Court', solution: 'Faire quelque chose' });
  assert.match(L.review(idea).error, /non autorisée/);
  idea = V.grant(idea, 'labsAnalysis', true, 'core:me').value;
  const weak = L.review(idea).value;
  assert.equal(weak.items.length, 8); assert.ok(weak.items.every(i => i.status === 'missing' && i.note.length > 20));
  assert.ok(!('score' in weak) && /pas une note|ni une note/.test(weak.limits) && weak.method.kind.includes('no language model'));
  idea = await V.addVersion(idea, { title: 'T2', problem: 'Sur le tronçon Folsom 5e–Falmouth, le trottoir mesure 10 ft (relevé 2014), sous le minimum de 12 ft.', evidence: 'https://data.sf.gov/d/4g86-grxu',
    solution: 'Élargir le trottoir afin de laisser 12 ft, plutôt que de déplacer le mobilier ; coût et permis à estimer ; risque : réduction du stationnement ; mesurer la largeur avant/après et le débit piéton.' });
  const strong = L.review({ ...idea, reviews: [] }).value;
  assert.ok(strong.items.filter(i => i.status === 'present').length >= 7, JSON.stringify(strong.items.map(i => [i.id, i.status])));
  const at = '2026-10-15T12:00:00Z', recent = Array.from({ length: 5 }, () => ({ idea: 'i2', at: '2026-10-15T08:00:00Z' }));
  assert.match(L.review(idea, { at, recent }).error, /limite de 5/);
  assert.equal(L.contest({ ...idea, reviews: [strong] }, { reviewIndex: 0, reason: 'court', actor: 'core:me' }).ok, false);
  assert.match(L.contest({ ...idea, reviews: [strong] }, { reviewIndex: 0, reason: 'Le critère simulation ne s’applique pas ici.', actor: 'core:me' }).value.contests[0].status, /humain/);
});

test('arena: fictional, no public voting, conflict-free independent judges, sealed sheets, median result authorises nothing', async () => {
  const A = await load('arena.mjs');
  let t = A.newTournament(); assert.ok(t.challenge.fictional && /FICTIF/.test(t.challenge.label));
  const ok = r => { assert.ok(r.ok, r.error); return r.value; };
  t = ok(A.register(t, { who: 'p1', role: 'participant' })); t = ok(A.register(t, { who: 'p2', role: 'participant' }));
  assert.match(A.register(t, { who: 'v', role: 'spectator-voter' }).error, /vote public désactivé/);
  assert.match(A.register(t, { who: 'jx', role: 'judge', conflicts: ['p1'] }).error, /conflit/);
  for (const j of ['j1', 'j2', 'j3']) t = ok(A.register(t, { who: j, role: 'judge' }));
  assert.match(A.register(t, { who: 'p1', role: 'judge' }).error, /déjà inscrit/);
  t = ok(A.close(t, 'submission'));
  t = ok(A.submit(t, { who: 'p1', text: 'Voiles d’ombrage démontables et deux arbres en bacs, budget détaillé, mesure de température avant et après.' }));
  t = ok(A.submit(t, { who: 'p2', text: 'Peinture claire au sol et brumisateurs, budget estimé, risque de consommation d’eau surveillé.' }));
  assert.match(A.judge(t, { who: 'j1', entry: 'p1', scores: {}, notes: {} }).error, /hors phase/);
  t = ok(A.close(t, 'judging'));
  const sheet = (s, n = 'justification suffisante') => ({ scores: { evidence: s, feasibility: s, equity: s, risks: s, measurement: s }, notes: Object.fromEntries(['evidence', 'feasibility', 'equity', 'risks', 'measurement'].map(k => [k, n])) });
  assert.match(A.judge(t, { who: 'j1', entry: 'p1', ...sheet(3, 'court') }).error, /justification/);
  for (const [j, a, b] of [['j1', 3, 2], ['j2', 4, 2], ['j3', 2, 3]]) { t = ok(A.judge(t, { who: j, entry: 'p1', ...sheet(a) })); t = ok(A.judge(t, { who: j, entry: 'p2', ...sheet(b) })); }
  assert.equal(A.visibleSheets(t, 'j1').every(s => s.judge === 'j1'), true, 'judges do not see each other before closure');
  assert.match(A.results(t).error, /clôture/);
  t = ok(A.close(t, 'closed')); const r = ok(A.results(t));
  assert.deepEqual(r.ranking.map(x => [x.entry, x.total, x.rank]), [['p1', 15, 1], ['p2', 10, 2]]);
  assert.equal(r.authorizes, false); assert.equal(r.scientificValidation, false); assert.equal(r.sheets.length, 6);
});

test('academy: teacher-demo only, synthetic learners, open answers reviewed by the teacher, no ranking', async () => {
  const C = await load('academy.mjs');
  assert.match(C.startSession({ teacher: 't', mode: 'classroom' }).error, /aucun mineur réel/);
  assert.match(C.startSession({ teacher: 't', learners: ['real-child'] }).error, /fictifs/);
  let s = C.startSession({ teacher: 'prof' }).value; assert.deepEqual(s.features, { learnerChat: false, ranking: false, publicProfiles: false });
  s = C.answer(s, { learner: 'eleve-A', question: 'q1', value: 0 }).value; s = C.answer(s, { learner: 'eleve-B', question: 'q1', value: 2 }).value;
  s = C.answer(s, { learner: 'eleve-A', question: 'q4', value: 'mesurer à nouveau' }).value;
  assert.deepEqual(C.summary(s)[0], { question: 'q1', answered: 2, correct: 1, toReview: 0 });
  assert.equal(C.summary(s)[3].toReview, 1);
  assert.equal(C.feedback(s, { actor: 'eleve-A', learner: 'eleve-A', question: 'q4', text: 'bien' }).ok, false);
  assert.equal(C.summary(C.feedback(s, { actor: 'prof', learner: 'eleve-A', question: 'q4', text: 'Oui, avec la même méthode.' }).value)[3].toReview, 0);
  const rec = json('data/problems/registry.json').problems.find(p => p.id === C.LESSON.source.record);
  assert.ok(rec && /2014/.test(rec.caveat) && /règle de conception/.test(rec.caveat), 'the lesson answers come from the real record');
});

test('progress: virtual and Earth systems separate, sourced indicators only, no composite score, Kardashev is educational', async () => {
  const G = await load('progress.mjs');
  const v = G.virtualProgress({ problems: json('data/problems/registry.json'), civIndex: json('data/civ/index.json'), agents: json('data/agents/registry.json') });
  assert.equal(v.find(x => x.id === 'real-impact').value, 0); assert.equal(v.find(x => x.id === 'problems-recorded').value, 98);
  const e = G.earthIndicators({ energy: json('data/sf/energy-benchmarks.geojson'), sidewalks: json('data/sf/sidewalks.geojson') });
  for (const i of e) for (const k of ['source', 'url', 'period', 'method', 'uncertainty', 'scope']) assert.ok(i[k], `${i.id}.${k}`);
  assert.ok(e.every(i => /aucune tendance/.test(i.trend)));
  assert.throws(() => G.indicator({ id: 'x', value: 42 }), /refusé/);
  assert.ok(!Object.keys(G).some(k => /score|index|civilization/i.test(k)), 'no universal score function exists');
  assert.equal(G.kardashev(1e16).K, 1); assert.equal(G.kardashev(1e26).K, 2); assert.throws(() => G.kardashev(0));
});
