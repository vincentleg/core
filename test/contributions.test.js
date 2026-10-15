'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const clone = x => structuredClone(x);
async function fixture(options = {}) {
  const M = await import('../scripts/lib/contributions.mjs'), D = await import('../scripts/lib/contribution-demo.mjs'), input = D.demoInputs();
  return { M, D, input, ...M.createSandboxLedger({ evidence: input.evidence, clock: () => D.DEMO_TIME, ...options }) };
}
function publish(f, id = 'contribution-test') {
  const c = clone(f.input.content); c.consent.publication = true;
  f.ledger.create(f.actors.participant, id, c, f.input.profile); f.D.reviewCycle(f.ledger, f.actors, id); f.ledger.transition(f.actors.publisher, id, 'APPROVED_FOR_PUBLICATION'); f.ledger.transition(f.actors.publisher, id, 'PUBLISHED'); return f.ledger.publicView(id);
}
test('synthetic end-to-end demo is deterministic, versioned and claims no actual partner or impact', async () => {
  const { runContributionDemo } = await import('../scripts/lib/contribution-demo.mjs'), a = runContributionDemo(), b = runContributionDemo();
  assert.deepEqual(a, b); assert.equal(a.beforeConsent, null); assert.equal(a.historyVerified, true);
  assert.deepEqual(JSON.parse(fs.readFileSync('examples/contributions/synthetic-public.json')), a);
  const c = a.contribution; assert.equal(c.state, 'PUBLISHED'); assert.equal(c.revision, 2); assert.equal(c.history.length, 14); assert.equal(c.author, 'Observateur-Cyan');
  assert.equal(c.simulation.baseline, 6); assert.equal(c.simulation.alternative, 3); assert.equal(c.simulation.sensitivity.length, 3); assert.equal(c.simulation.calibrated, false);
  assert.equal(c.authorizesRealWorld, false); assert.equal(c.measuredImpact, null); assert.deepEqual(c.organizationsConsidering, []); assert.equal(c.rights.commercialReuse, 'NOT_AUTHORIZED');
  assert.equal(c.objections.length, 2); assert.ok(c.progression.badges.every(b => /demo/.test(b.id))); assert.equal(c.avatar.textAlternative, 'Hexagone cyan, identité fictive');
});
test('privacy defaults and publication consent reject accidental location/profile publication', async () => {
  const f = await fixture(); try {
    f.ledger.create(f.actors.participant, 'contribution-private', f.input.content, f.input.profile); f.D.reviewCycle(f.ledger, f.actors, 'contribution-private');
    assert.equal(f.ledger.publicView('contribution-private'), null); assert.throws(() => f.ledger.transition(f.actors.publisher, 'contribution-private', 'APPROVED_FOR_PUBLICATION'), /consent/);
    const view = publish(f); assert.equal(view.location, null); assert.equal(view.author, null); assert.equal(view.avatar, null); assert.deepEqual(view.interests, []); assert.deepEqual(view.expertise, []); assert.deepEqual(view.progression.badges, []);
    const json = JSON.stringify(view); assert.doesNotMatch(json, /PRIVATE_SYNTHETIC_CONTEXT|37\.77777|-122\.41111|privatePoint|privateContext|contentHash/);
    assert.throws(() => f.ledger.inspect(f.actors.other, 'contribution-private'), /Owner/);
  } finally { f.ledger.close(); }
});
test('public fingerprints do not hash private coordinates/context or expose private reviewer notes', async () => {
  const a = await fixture(), b = await fixture(); try {
    b.input.content.privateContext = 'SECOND_PRIVATE_CONTEXT'; b.input.content.location.privatePoint = { lat: 12.34567, lon: 45.67891 };
    const av = publish(a), bv = publish(b); assert.equal(av.publicFingerprint, bv.publicFingerprint);
    const id = 'contribution-note', c = clone(a.input.content); c.consent.publication = true; a.ledger.create(a.actors.participant, id, c, a.input.profile);
    a.ledger.transition(a.actors.participant, id, 'SUBMITTED'); a.ledger.transition(a.actors.moderator, id, 'SCREENED'); a.ledger.transition(a.actors.reviewer, id, 'UNDER_REVIEW');
    a.ledger.transition(a.actors.reviewer, id, 'EVIDENCE_ASSESSED', { note: 'PRIVATE_SYNTHETIC_CONTEXT 37.77777', objection: 'FEASIBILITY_UNKNOWN' });
    a.ledger.transition(a.actors.publisher, id, 'APPROVED_FOR_PUBLICATION'); a.ledger.transition(a.actors.publisher, id, 'PUBLISHED');
    assert.doesNotMatch(JSON.stringify(a.ledger.publicView(id)), /PRIVATE_SYNTHETIC_CONTEXT|37\.77777/); assert.match(a.ledger.inspect(a.actors.participant, id).objections[0].note, /PRIVATE_SYNTHETIC_CONTEXT/);
  } finally { a.ledger.close(); b.ledger.close(); }
});
test('forged roles, reordered transitions and all external-impact states fail closed', async () => {
  const f = await fixture(); try {
    publish(f);
    for (const state of ['CONSIDERED_BY_PARTNER', 'AUTHORIZED_FOR_PILOT', 'PILOT_RUNNING', 'IMPLEMENTED', 'IMPACT_MEASURED']) assert.throws(() => f.ledger.transition(f.actors.publisher, 'contribution-test', state), /disabled/);
    assert.throws(() => f.ledger.transition({ label: 'demo.publisher', authenticated: true }, 'contribution-test', 'PUBLISHED'), /capability/);
    const id = 'contribution-order'; f.ledger.create(f.actors.participant, id, f.input.content, f.input.profile);
    assert.throws(() => f.ledger.transition(f.actors.participant, id, 'PUBLISHED'), /Unauthorized/); assert.throws(() => f.ledger.transition(f.actors.reviewer, id, 'SUBMITTED'), /Unauthorized/);
  } finally { f.ledger.close(); }
});
test('contribution/avatar fields cannot grant agent privileges, biometrics or arbitrary public locations', async () => {
  const f = await fixture(); try {
    for (const key of ['roles', 'permissions', 'tools', 'authenticated', 'humanApproval']) { const c = clone(f.input.content); c[key] = ['govern']; assert.throws(() => f.ledger.create(f.actors.participant, 'contribution-' + key.toLowerCase(), c, f.input.profile), /Invalid model/); }
    const p = clone(f.input.profile); p.biometric = 'forbidden'; assert.throws(() => f.ledger.create(f.actors.participant, 'contribution-bio', f.input.content, p), /Invalid model/);
    const textOnly = clone(f.input.profile); delete textOnly.avatar; f.ledger.create(f.actors.participant, 'contribution-text-only', f.input.content, textOnly); assert.equal(f.ledger.inspect(f.actors.participant, 'contribution-text-only').versions[0].profile.avatar, undefined);
    const c = clone(f.input.content); c.location.neighborhood = 'precise private street'; assert.throws(() => f.ledger.create(f.actors.participant, 'contribution-place', c, f.input.profile), /coarse/);
  } finally { f.ledger.close(); }
});
test('missing, altered or real-world evidence cannot be promoted as verified synthetic input', async () => {
  const f = await fixture(); try {
    const c = clone(f.input.content); c.evidenceRefs = ['missing-evidence']; f.ledger.create(f.actors.participant, 'contribution-missing', c, f.input.profile);
    assert.throws(() => f.D.reviewCycle(f.ledger, f.actors, 'contribution-missing'), /provenance/);
    const e = clone(f.input.evidence); e[0].payload.statement = 'changed'; assert.throws(() => f.M.createSandboxLedger({ evidence: e }), /evidence/);
    const world = clone(f.input.evidence); world[0].kind = 'INDEPENDENT_IMPACT'; assert.throws(() => f.M.createSandboxLedger({ evidence: world }), /evidence/);
    const pkg = clone(f.input.evidence[1].payload); pkg.rows[0].count++; assert.throws(() => f.M.boundedSimulation(pkg), /synthetic inputs/);
  } finally { f.ledger.close(); }
});
test('correction hides prior publication and needs new review; withdrawal/deletion remove public access', async () => {
  const f = await fixture(); try {
    publish(f); const id = 'contribution-test', c = clone(f.input.content); c.proposal = 'Corrected synthetic hypothesis'; c.consent.publication = true;
    f.ledger.revise(f.actors.participant, id, c, f.input.profile); assert.equal(f.ledger.publicView(id), null);
    assert.throws(() => f.ledger.transition(f.actors.publisher, id, 'PUBLISHED'), /Unauthorized/);
    f.D.reviewCycle(f.ledger, f.actors, id); f.ledger.transition(f.actors.publisher, id, 'APPROVED_FOR_PUBLICATION'); f.ledger.transition(f.actors.publisher, id, 'PUBLISHED');
    assert.equal(f.ledger.publicView(id).revision, 2); assert.equal(f.ledger.inspect(f.actors.participant, id).versions.length, 2);
    f.ledger.withdraw(f.actors.participant, id); assert.equal(f.ledger.publicView(id), null); assert.equal(f.ledger.inspect(f.actors.participant, id).state, 'REJECTED_OR_WITHDRAWN');
    assert.equal(f.ledger.erase(f.actors.participant, id).erased, true); assert.throws(() => f.ledger.inspect(f.actors.participant, id), /unavailable/);
  } finally { f.ledger.close(); }
});
test('moderation rejection is reasoned, final and distinct from physical authorization', async () => {
  const f = await fixture(); try {
    const id = 'contribution-rejected'; f.ledger.create(f.actors.participant, id, f.input.content, f.input.profile); f.ledger.transition(f.actors.participant, id, 'SUBMITTED');
    assert.throws(() => f.ledger.transition(f.actors.moderator, id, 'REJECTED_OR_WITHDRAWN'), /disabled/);
    f.ledger.transition(f.actors.moderator, id, 'REJECTED_OR_WITHDRAWN', { note: 'Synthetic proposal insufficiently evidenced.' }); assert.equal(f.ledger.publicView(id), null);
    assert.throws(() => f.ledger.transition(f.actors.participant, id, 'SUBMITTED'), /Unauthorized/); assert.equal(f.ledger.verify(id), true);
  } finally { f.ledger.close(); }
});
test('local persistence survives reopening and detects revision/history corruption', async () => {
  const file = `.core-local/contributions-test-${process.pid}.sqlite`, f = await fixture({ memoryFile: file });
  try {
    const expected = publish(f); f.ledger.close(); const g = await fixture({ memoryFile: file });
    try { assert.deepEqual(g.ledger.publicView('contribution-test'), expected); assert.equal(g.ledger.verify('contribution-test'), true); } finally { g.ledger.close(); }
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    const changed = clone(f.input.evidence);changed[0].uncertainty = 'Changed source metadata requires a new source id and review.';
    const stale = f.M.createSandboxLedger({ evidence: changed, memoryFile: file });try { assert.throws(() => stale.ledger.inspect(stale.actors.participant, 'contribution-test'), /provenance changed/); } finally { stale.ledger.close(); }
    const { DatabaseSync } = require('node:sqlite'), db = new DatabaseSync(file), row = db.prepare('SELECT body FROM checkpoints WHERE mission=?').get('contribution-test'), r = JSON.parse(row.body); r.versions[0].content.proposal = 'tampered';
    db.prepare('UPDATE checkpoints SET body=? WHERE mission=?').run(JSON.stringify(r), 'contribution-test'); db.close();
    const h = await fixture({ memoryFile: file }); try { assert.throws(() => h.ledger.inspect(h.actors.participant, 'contribution-test'), /corruption/); assert.equal(h.ledger.publicView('contribution-test'), null); } finally { h.ledger.close(); }
  } finally { for (const s of ['', '-wal', '-shm']) fs.rmSync(file + s, { force: true }); }
});
test('private database rejects dangling symlinks instead of following them', async () => {
  const f = await fixture(), file = `.core-local/contributions-link-${process.pid}.sqlite`;
  try { fs.mkdirSync('.core-local', { recursive: true }); fs.symlinkSync('missing-contribution-target-' + process.pid, file); assert.throws(() => f.M.createSandboxLedger({ memoryFile: file }), /storage link/); }
  finally { f.ledger.close(); fs.rmSync(file, { force: true }); }
});
test('public linkage omits private contributions, and schemas expose the exact status vocabulary', async () => {
  const f = await fixture(); try {
    f.ledger.create(f.actors.participant, 'contribution-hidden', f.input.content, f.input.profile); f.input.content.relations.reuses = ['contribution-hidden']; const c = publish(f); assert.deepEqual(c.relations.reuses, []);
    const schema = JSON.parse(fs.readFileSync(path.join('schemas', 'contribution-history-v1.schema.json'))); assert.deepEqual(schema.items.properties.to.enum, f.M.STATUSES);
    assert.throws(() => f.M.createSandboxLedger({ memoryFile: 'data/public.sqlite' }), /Separate/);
  } finally { f.ledger.close(); }
});
