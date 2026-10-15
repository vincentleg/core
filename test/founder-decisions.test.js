'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const fixture = () => JSON.parse(fs.readFileSync('test/fixtures/pilot-synthetic.json'));
test('authority never grants external action, including forged labels and unknown actions', async () => {
  const A = await import('../scripts/lib/authority.mjs');
  for (const action of ['research', 'simulate', 'propose', 'critique', 'revise', 'record-review']) { const g = A.authorityGate(action); assert.equal(g.allowed, true); assert.equal(g.authorizesRealWorld, false); }
  for (const action of ['execute', 'real-world', 'human:founder', 'approve', '__proto__', null, { authenticated: true }]) assert.equal(A.authorityGate(action).allowed, false);
  for (const p of ['/api/execute', '/api/shell', '/api/authorize', '/api/__proto__']) assert.equal(A.controlAuthority(p).allowed, false);
  assert.equal(A.controlAuthority('/api/decide').authorizesRealWorld, false);
  assert.equal(A.AUTHORITY.externalActionsEnabled, false); assert.equal(Object.isFrozen(A.AUTHORITY), true);
});
test('synthetic input is explicit and cannot masquerade as licensed measured observations', async () => {
  const P = await import('../scripts/lib/pilot.mjs'), f = fixture();
  assert.equal(P.validateCounts(f).state, 'BLOCKED');
  const v = P.validateCounts(f, { allowSynthetic: true }); assert.equal(v.state, 'VALIDATED_INPUT'); assert.equal(v.calibrated, false); assert.equal(v.independentReview, false); assert.equal(v.authorizesRealWorld, false);
  const cli = cp.spawnSync(process.execPath, ['scripts/pilot.mjs', '--check', 'test/fixtures/pilot-synthetic.json'], { encoding: 'utf8' });assert.equal(cli.status, 1);assert.equal(JSON.parse(cli.stdout).state, 'BLOCKED');
  const explicit = cp.spawnSync(process.execPath, ['scripts/pilot.mjs', '--check', 'test/fixtures/pilot-synthetic.json', '--synthetic-fixture'], { encoding: 'utf8' });assert.equal(explicit.status, 0);assert.equal(JSON.parse(explicit.stdout).kind, 'synthetic-fixture');
  f.manifest.kind = 'measured'; assert.equal(P.validateCounts(f).state, 'BLOCKED');
  f.manifest.rights.status = 'UNVERIFIED'; assert.equal(P.validateCounts(f).state, 'BLOCKED');
});
test('pilot gate rejects missing counts, units, overlap, duplicate rows, hash changes and personal columns', async () => {
  const P = await import('../scripts/lib/pilot.mjs');
  for (const which of ['missing', 'negative', 'fraction', 'unit', 'scope', 'date', 'calendar', 'overlap', 'duplicate', 'privacy', 'hash', 'null']) {
    const f = fixture();
    if (which === 'missing') delete f.rows[0].count;
    if (which === 'negative') f.rows[0].count = -1;
    if (which === 'fraction') f.rows[0].count = 1.5;
    if (which === 'unit') f.rows[0].unit = 'vehicles/hour';
    if (which === 'scope') f.rows[0].corridor = 'different';
    if (which === 'date') f.rows[0].start = '2026-10-01T08:00:00';
    if (which === 'calendar') { f.rows[0].start = '2026-02-30T08:00:00Z'; f.rows[0].end = '2026-03-02T08:15:00Z'; }
    if (which === 'overlap') f.rows[1].start = '2026-10-01T08:10:00-07:00';
    if (which === 'duplicate') f.rows.push({ ...f.rows[0] });
    if (which === 'privacy') f.rows[0].person = 'fixture-person';
    if (which === 'null') f.rows[0] = null;
    if (which !== 'hash') f.manifest.payloadSha256 = P.payloadHash(f.rows); else f.rows[0].count++;
    assert.equal(P.validateCounts(f, { allowSynthetic: true }).state, 'BLOCKED', which);
  }
});
test('baseline metrics match independent hand calculation and fail closed on undefined comparisons', async () => {
  const P = await import('../scripts/lib/pilot.mjs');
  // |12-10| + |18-21| = 5; n=2, observed sum=30. These are fixtures, not SF evidence.
  const r = P.compareCounts([12, 18], [10, 21]); assert.equal(r.mae, 2.5); assert.equal(r.wape, 1 / 6); assert.equal(r.efficacyValidated, false);
  for (const [a, b] of [[[], []], [[0], [0]], [[1], []], [[1], [NaN]], [[-1], [0]]]) assert.throws(() => P.compareCounts(a, b));
});
test('pilot package rejects private metadata and future rights assertions outside observation rows', async () => {
  const P = await import('../scripts/lib/pilot.mjs');
  for (const mutate of [f => f.privateNotes = 'fictional-private', f => f.manifest.contact = 'fictional-private', f => f.manifest.rights.internalNotes = 'fictional-private', f => f.manifest.rights.checkedAt = '2099-01-01T00:00:00Z']) {
    const f = fixture(); mutate(f); assert.equal(P.validateCounts(f, { allowSynthetic: true }).state, 'BLOCKED');
  }
});
test('feed candidate rehearsal accepts only regular bounded generated JSON and never publishes', async () => {
  const F = await import('../scripts/lib/feed-candidate.mjs'), old = process.cwd(), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-feed-plan-'));
  const git = (...a) => cp.execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  try {
    git('init', '-q'); fs.mkdirSync(path.join(dir, 'data/feeds'), { recursive: true }); fs.writeFileSync(path.join(dir, 'data/feeds/state.json'), '{}\n');git('add', '.');git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@'+'example.invalid', 'commit', '-qm', 'initial'); process.chdir(dir);
    assert.equal(F.inspectCandidate().paths.length, 0);
    fs.writeFileSync('data/feeds/state.json', '{"changed":true}\n'); let plan = F.inspectCandidate(); assert.deepEqual(plan.paths, ['data/feeds/state.json']); assert.equal(plan.autoMerge, false); assert.equal(plan.externalWrites, false);
    fs.writeFileSync('unrelated.js', '// no\n'); assert.throws(() => F.inspectCandidate(), /outside/); fs.unlinkSync('unrelated.js');
    fs.writeFileSync('data/feeds/state.json', 'invalid'); assert.throws(() => F.inspectCandidate());
    fs.unlinkSync('data/feeds/state.json'); assert.throws(() => F.inspectCandidate(), /no deletion/);
    fs.writeFileSync('outside.json', '{}');fs.symlinkSync('../../outside.json', 'data/feeds/state.json');git('add', 'data/feeds/state.json');fs.unlinkSync('outside.json');assert.throws(() => F.inspectCandidate(), /Symlink/);
  } finally { process.chdir(old);fs.rmSync(dir, { recursive: true, force: true }); }
});
test('feed rehearsal is read-only/manual and the live scheduled workflow remains unchanged', () => {
  const s = fs.readFileSync('.github/workflows/feed-rehearsal.yml', 'utf8');assert.match(s, /workflow_dispatch:/);assert.match(s, /contents: read/);assert.match(s, /persist-credentials: false/);assert.doesNotMatch(s, /contents: write|pull-requests: write|git push|gh pr|schedule:|secrets\./);
  assert.match(s, /scripts\/feed-candidate.mjs/);assert.match(s, /scripts\/verify.mjs/);
  // Critical unchanged workflow fingerprint from 95a1cf4; works in the existing scheduled shallow checkout.
  const hash = require('node:crypto').createHash('sha256').update(fs.readFileSync('.github/workflows/city-feed.yml')).digest('hex');
  assert.equal(hash, 'f9355d1963ae57260ad88f278d2f3c63e22cc0c85d38754cbbdeff1042b63bc6');
});
test('prepared main protection binds CI issuer and grants no bot or administrator bypass', () => {
  const p = JSON.parse(fs.readFileSync('docs/github/main-protection.proposed.json'));
  assert.deepEqual(p.required_status_checks, { strict: true, checks: [{ context: 'core-verify', app_id: 15368 }] });
  assert.equal(p.enforce_admins, true); assert.equal(p.allow_force_pushes, false); assert.equal(p.allow_deletions, false);
  assert.ok(!p.required_pull_request_reviews.bypass_pull_request_allowances);
  const s = fs.readFileSync('docs/github/city-feed-pr.yml.example', 'utf8');
  assert.match(s, /workflow_dispatch:/); assert.match(s, /CORE_FEED_PR_ENABLED/);
  assert.match(s, /scripts\/feed-candidate.mjs/); assert.match(s, /scripts\/verify.mjs/);
  assert.match(s, /HEAD:refs\/heads\/\$candidate_branch/);
  assert.doesNotMatch(s, /schedule:|--force|--admin|--auto|gh pr merge|gh pr review|pull_request_target|secrets\./);
  assert.match(s, /startswith\("city-feed\/candidate-"\)/, 'one open candidate at a time'); assert.match(s, /gh workflow run verify\.yml --ref "\$candidate_branch"/, 'required check dispatched on the exact candidate');
  assert.match(s, /actions\/runs\/\$\{GITHUB_RUN_ID\}/, 'run provenance in PR body');
  assert.equal(fs.existsSync('.github/workflows/city-feed-pr-candidate.yml'), false, 'migration is not silently activated');
});
