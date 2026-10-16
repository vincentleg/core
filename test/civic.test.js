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
  assert.match(L.review(idea).error, /not allowed/); // V9: English default (French in the fr interface)
  idea = V.grant(idea, 'labsAnalysis', true, 'core:me').value;
  const weak = L.review(idea).value;
  assert.equal(weak.items.length, 8); assert.ok(weak.items.every(i => i.status === 'missing' && i.note.length > 20));
  assert.ok(!('score' in weak) && /pas une note|ni une note/.test(weak.limits) && weak.method.kind.en.includes('no language model'));
  idea = await V.addVersion(idea, { title: 'T2', problem: 'Sur le tronçon Folsom 5e–Falmouth, le trottoir mesure 10 ft (relevé 2014), sous le minimum de 12 ft.', evidence: 'https://data.sf.gov/d/4g86-grxu',
    solution: 'Élargir le trottoir afin de laisser 12 ft, plutôt que de déplacer le mobilier ; coût et permis à estimer ; risque : réduction du stationnement ; mesurer la largeur avant/après et le débit piéton.' });
  const strong = L.review({ ...idea, reviews: [] }).value;
  assert.ok(strong.items.filter(i => i.status === 'present').length >= 7, JSON.stringify(strong.items.map(i => [i.id, i.status])));
  const at = '2026-10-15T12:00:00Z', recent = Array.from({ length: 5 }, () => ({ idea: 'i2', at: '2026-10-15T08:00:00Z' }));
  assert.match(L.review(idea, { at, recent }).error, /limit of 5/);
  assert.equal(L.contest({ ...idea, reviews: [strong] }, { reviewIndex: 0, reason: 'court', actor: 'core:me' }).ok, false);
  assert.match(L.contest({ ...idea, reviews: [strong] }, { reviewIndex: 0, reason: 'Le critère simulation ne s’applique pas ici.', actor: 'core:me' }).value.contests[0].status, /human/);
});

test('arena: fictional, no public voting, conflict-free independent judges, sealed sheets, median result authorises nothing', async () => {
  const A = await load('arena.mjs');
  let t = A.newTournament(); assert.ok(t.challenge.fictional && /FICTIONAL/.test(t.challenge.label.en) && /FICTIF/.test(t.challenge.label.fr));
  const ok = r => { assert.ok(r.ok, r.error); return r.value; };
  t = ok(A.register(t, { who: 'p1', role: 'participant' })); t = ok(A.register(t, { who: 'p2', role: 'participant' }));
  assert.match(A.register(t, { who: 'v', role: 'spectator-voter' }).error, /public voting disabled/);
  assert.match(A.register(t, { who: 'jx', role: 'judge', conflicts: ['p1'] }).error, /conflict/);
  for (const j of ['j1', 'j2', 'j3']) t = ok(A.register(t, { who: j, role: 'judge' }));
  assert.match(A.register(t, { who: 'p1', role: 'judge' }).error, /already registered/);
  t = ok(A.close(t, 'submission'));
  t = ok(A.submit(t, { who: 'p1', text: 'Voiles d’ombrage démontables et deux arbres en bacs, budget détaillé, mesure de température avant et après.' }));
  t = ok(A.submit(t, { who: 'p2', text: 'Peinture claire au sol et brumisateurs, budget estimé, risque de consommation d’eau surveillé.' }));
  assert.match(A.judge(t, { who: 'j1', entry: 'p1', scores: {}, notes: {} }).error, /outside the judging phase/);
  t = ok(A.close(t, 'judging'));
  const sheet = (s, n = 'justification suffisante') => ({ scores: { evidence: s, feasibility: s, equity: s, risks: s, measurement: s }, notes: Object.fromEntries(['evidence', 'feasibility', 'equity', 'risks', 'measurement'].map(k => [k, n])) });
  assert.match(A.judge(t, { who: 'j1', entry: 'p1', ...sheet(3, 'court') }).error, /justification/);
  for (const [j, a, b] of [['j1', 3, 2], ['j2', 4, 2], ['j3', 2, 3]]) { t = ok(A.judge(t, { who: j, entry: 'p1', ...sheet(a) })); t = ok(A.judge(t, { who: j, entry: 'p2', ...sheet(b) })); }
  assert.equal(A.visibleSheets(t, 'j1').every(s => s.judge === 'j1'), true, 'judges do not see each other before closure');
  assert.match(A.results(t).error, /closing/);
  t = ok(A.close(t, 'closed')); const r = ok(A.results(t));
  assert.deepEqual(r.ranking.map(x => [x.entry, x.total, x.rank]), [['p1', 15, 1], ['p2', 10, 2]]);
  assert.equal(r.authorizes, false); assert.equal(r.scientificValidation, false); assert.equal(r.sheets.length, 6);
});

test('academy: teacher-demo only, synthetic learners, open answers reviewed by the teacher, no ranking', async () => {
  const C = await load('academy.mjs');
  assert.match(C.startSession({ teacher: 't', mode: 'classroom' }).error, /no real minor/);
  assert.match(C.startSession({ teacher: 't', learners: ['real-child'] }).error, /fictional/);
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
  assert.ok(e.every(i => /no trend/.test(i.trend.en) && /aucune tendance/.test(i.trend.fr)));
  assert.throws(() => G.indicator({ id: 'x', value: 42 }), /refusé/);
  assert.ok(!Object.keys(G).some(k => /score|index|civilization/i.test(k)), 'no universal score function exists');
  assert.equal(G.kardashev(1e16).K, 1); assert.equal(G.kardashev(1e26).K, 2); assert.throws(() => G.kardashev(0));
});

test('labs dossier: structured, missing evidence named, arithmetic only on recorded values, never a validation', async () => {
  const V = await load('vault.mjs'), L = await load('labs.mjs');
  const problem = json('data/problems/registry.json').problems.find(p => p.id === 'sidewalk-below-bsp-min:5665000');
  const sidewalk = json('data/sf/sidewalks.geojson').features.find(f => f.properties.record_id === '8562').properties;
  let idea = V.newIdea({ id: 'i9', owner: 'core:me' });
  idea = await V.addVersion(idea, { title: 'Élargir', problem: 'Trottoir étroit', solution: 'Élargir le trottoir', problemId: problem.id });
  let x = L.dossier(idea, { problem, sidewalk });
  assert.equal(x.level, 'draft'); assert.match(x.disclaimer, /neither a scientific validation/);
  assert.deepEqual(x.calculation.inputs, { width_ft: 10, min_ft: 12, recommended_ft: 15 });
  assert.deepEqual(x.calculation.result, { toMinimum_ft: 2, toMinimum_m: 0.61, toRecommended_ft: 5, toRecommended_m: 1.52 });
  assert.match(x.calculation.note, /2014/);
  assert.ok(['current-measure', 'usage', 'cost', 'authority', 'alternatives', 'mechanism', 'tests'].every(id => x.missingEvidence.some(m => m.id === id)));
  idea = { ...idea, dialogueDraft: { proposal: 'Élargir le trottoir', mechanism: 'afin de laisser passer deux fauteuils', assumptions: ['la chaussée peut céder 2 ft'], constraints: ['coût de 50000 dollars', 'permis de la ville'], alternatives: ['ne rien faire'], risks: ['moins de stationnement'], tests: ['compter les piétons avant et après pendant 3 mois'] } };
  x = L.dossier(idea, { problem, sidewalk });
  assert.deepEqual(x.missingEvidence.map(m => m.id), ['current-measure'], 'only the 2014 measurement remains missing');
  assert.equal(x.level, 'incomplete'); assert.notEqual(x.levelLabel, 'validé');
  assert.match(x.hypothesis, /If “Élargir le trottoir” is implemented, then laisser passer deux fauteuils; this would be checked by: compter/);
  assert.ok(x.evidence.some(e => e.ref === 'sidewalks:8562' && e.basis === 'observed'));
  const other = { id: 'z', versions: [{ n: 1, hash: 'h', problem: 'p', solution: 's', evidence: '' }] };
  assert.equal(L.dossier(other, {}).calculation.available, false, 'no recorded measurement, no calculation');
  assert.match(L.dossierMarkdown(x), /Ready for review|Incomplete/);
});

test('vault: word diff between versions, owner-only deletion and metadata', async () => {
  const V = await load('vault.mjs');
  assert.deepEqual(V.diffWords('élargir le trottoir', 'élargir vite le trottoir').map(d => d.op), ['same', 'add', 'same']);
  assert.equal(V.diffWords('a b', 'a b').every(d => d.op === 'same'), true);
  const vault = { owner: 'core:me', ideas: [V.newIdea({ id: 'x', owner: 'core:me' })] };
  assert.equal(V.removeIdea(vault, 'x', 'core:other').ok, false);
  assert.equal(V.removeIdea(vault, 'x', 'core:me').value.ideas.length, 0);
  assert.equal(V.setMeta(vault.ideas[0], { category: 'magie' }, 'core:me').ok, false);
  assert.equal(V.setMeta(vault.ideas[0], { category: 'accessibilité', notes: 'n' }, 'core:me').value.category, 'accessibilité');
});

test('expert network: fictional only, topic matching with reasons, explicit sharing, labelled fictional advice, author decides', async () => {
  const N = await load('network.mjs'), V = await load('vault.mjs');
  assert.ok(N.EXPERTS.every(x => /fictif/i.test(x.name) && /fictif/i.test(x.affiliation) && x.verification === 'synthetic'));
  assert.ok(!N.EXPERTS.some(x => /MIT|Stanford|Harvard|Berkeley|universit/i.test(JSON.stringify(x))), 'no real institution');
  const m = N.match('élargir le trottoir et compter les piétons', { domain: 'accessibility' });
  assert.equal(m[0].expert.id, 'xp-a'); assert.match(m[0].why, /sujets en commun/);
  let idea = await V.addVersion(V.newIdea({ id: 'i', owner: 'core:me' }), { title: 'T', problem: 'P secret', solution: 'S secret' });
  assert.match(N.request(idea, { expertId: 'xp-a', share: 'summary' }).error, /confirmez/);
  idea = N.request(idea, { expertId: 'xp-b', share: 'summary', confirmed: true, at: '2026-10-15T00:00:00Z' }).value;
  const rq = idea.reviewRequests[0];
  assert.deepEqual(Object.keys(rq.snapshot), ['title', 'problem'], 'summary shares no solution'); assert.ok(rq.coi, 'expert conflict surfaced');
  idea = N.fictionalResponse(idea, rq.id, { missing: [{ label: 'Mesure actuelle de la largeur' }] }).value;
  const r = idea.reviewRequests[0];
  assert.equal(r.state, 'answered-fictional'); assert.match(r.response.label, /AVIS FICTIF.*ni validation/); assert.match(r.response.text, /mesure actuelle de la largeur/);
  assert.equal(N.fictionalResponse(idea, rq.id).ok, false, 'one response per request');
  assert.equal(N.decide(idea, rq.id, { decision: 'accept', actor: 'core:other' }).ok, false);
  assert.match(N.decide(idea, rq.id, { decision: 'disagree', reason: 'non', actor: 'core:me' }).error, /motive/);
  assert.match(N.decide(idea, rq.id, { decision: 'accept', actor: 'core:me' }).value.reviewRequests[0].authorDecision.scope, /n’engage personne/);
});

test('communities: fictional members, adults only, local drafts never published, report → simulated moderation with rule → appeal to a human', async () => {
  const N = await load('network.mjs');
  assert.ok(N.COMMUNITIES.every(c => c.adultsOnly && c.members.every(([, n]) => /fictif/.test(n))));
  assert.ok(N.COMMUNITIES.find(c => c.id === 'cm-folsom').threads[0].posts[0].evidence.includes('sidewalks:8562'));
  assert.equal(N.draftPost('cm-folsom', { text: 'connard' }).ok, false);
  const d = N.draftPost('cm-folsom', { thread: 't1', text: 'Je peux mesurer samedi ; écrivez-moi à ' + ['x', 'y.org'].join('@') }).value;
  assert.equal(d.state, 'draft-local'); assert.ok(!d.text.includes('y.org'));
  const post = N.COMMUNITIES[0].threads[0].posts[1];
  assert.equal(N.report(post, { reason: '' }).ok, false);
  const rep = N.report(post, { reason: 'hors sujet' }).value;
  assert.match(N.moderate(rep, { outcome: 'removed' }).error, /cite la règle/);
  const mod = N.moderate(rep, { outcome: 'kept', rule: 'Le désaccord argumenté est bienvenu' }).value;
  assert.match(mod.mod.by, /SIMULÉE/);
  const ap = N.appeal(mod, { reason: 'Je pense que la règle a été mal appliquée.' }).value;
  assert.equal(ap.mod.state, 'appealed'); assert.match(N.MOD.appealed, /humain/);
});

test('debate: fictional debate on a real record, arguments cite existing records, unresolved objections computed, no winner', async () => {
  const Db = await load('debate.mjs');
  const records = new Map([['sidewalks:8562', {}]]);
  let d = Db.DEBATE; assert.ok(d.fictional && /FICTIF/.test(d.label));
  assert.match(Db.addArgument(d, { target: 'pa', kind: 'argument', text: 'Un argument assez long pour passer.', evidence: ['invented:1'], records }).error, /preuve inconnue/);
  assert.match(Db.addArgument(d, { target: 'pa', kind: 'counter', text: 'Un contre-argument assez long.', records }).error, /vise un argument/);
  assert.match(Db.addArgument(d, { target: 'a1', kind: 'argument', text: 'Un argument mal placé ici.', records }).error, /soutient une proposition/);
  let a = Db.analyse(d); assert.deepEqual(a.unresolved.map(x => x.id), ['a2', 'a4']); assert.deepEqual(a.unsourced.map(x => x.id), ['a3']);
  d = Db.addArgument(d, { target: 'a2', kind: 'rebuttal', text: 'D’accord : il faut d’abord une mesure actuelle.', evidence: ['sidewalks:8562'], records, at: '2026-10-15T00:00:00Z' }).value;
  assert.deepEqual(Db.analyse(d).unresolved.map(x => x.id), ['a4']);
  d = Db.addProposal(d, { title: 'Mesurer d’abord', summary: 'Relever la largeur actuelle avant toute option.' }).value;
  assert.equal(Db.addProposal(d, { title: 'Encore', summary: 'Une deuxième proposition.' }).ok, false);
  const o = Db.outcome(d);
  assert.equal(o.winner, null); assert.equal(o.authorizes, false); assert.equal(o.scientificValidation, false);
  assert.match(o.explanation.join(' '), /1 objection\(s\).*sans réponse.*Aucune proposition n’est déclarée gagnante/s);
});

test('academy: three lessons, each tied to the real record, teacher-demo only, unknown lesson refused', async () => {
  const C = await load('academy.mjs');
  assert.equal(C.LESSONS.length, 3); assert.ok(C.LESSONS.every(l => l.source.record === 'sidewalk-below-bsp-min:5665000' && l.questions.some(q => q.kind === 'open')));
  assert.equal(C.startSession({ teacher: 't', lesson: 'nope' }).ok, false);
  let s = C.startSession({ teacher: 't', lesson: 'academy-ai-limits-001' }).value;
  s = C.answer(s, { learner: 'eleve-A', question: 'q1', value: 0 }).value;
  assert.deepEqual(C.summary(s).map(r => r.question), ['q1', 'q2', 'q3']); assert.equal(C.summary(s)[0].correct, 1);
});
