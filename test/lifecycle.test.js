'use strict';
// R1 contribution lifecycle: legal transitions, refused authority, fabricated outcomes, privacy and audit history.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const LCP = import('../src/contrib/lifecycle.mjs');
const OWNER = 'local.owner-1', OTHER = 'local.other-2';
const ticker = (start = Date.parse('2026-10-23T10:00:00Z')) => { let t = start; return () => new Date((t += 60000)).toISOString(); };
const me = { id: OWNER, role: 'owner', mode: 'demonstration' };
const human = (id, role) => ({ id, role, mode: 'authenticated' });
// Test-only verifiers. The browser build passes none, so it refuses every authenticated actor and external record.
const VERIFIED = new Set(['h.mod', 'h.rev', 'h.ind', 'h.sign', 'h.ind2', OWNER]);
const verifyActor = a => VERIFIED.has(a.id);
const receipt = (subject, type = 'transmission-receipt', over = {}) => ({ kind: 'external-record', ref: 'receipt-1', source: 'city clerk', type, subject, issuer: 'Office of the City Clerk', url: 'https://example.org/r/1', observedAt: '2026-10-23T09:00:00Z', sha256: 'a'.repeat(64), ...over });

async function demoDraft(LC, lc) { return lc.create({ id: 'c1', owner: OWNER, mission: 'mission.sf.mobility', demonstration: true, reason: 'Draft from SF tour', evidence: [{ kind: 'user-claim', ref: 'c1', source: 'this browser' }] }); }
async function realPath(LC, opts = {}) {
  const lc = LC.createLifecycle({ clock: ticker(), verifyActor, ...opts });
  let r = await lc.create({ id: 'c2', owner: OWNER, mission: 'mission.sf.mobility', authenticated: true, reason: 'Real draft' });
  r = await lc.transition(r, { ...me, mode: 'authenticated' }, 'SUBMITTED', { reason: 'Submit', consent: { review: true } });
  return { lc, r };
}

test('demonstration journey: submission records consent, then the code gate lists the missing evidence', async () => {
  const LC = await LCP, lc = LC.createLifecycle({ clock: ticker() });
  const d = await demoDraft(LC, lc), r = await lc.transition(d, me, 'SUBMITTED', { reason: 'Submitted for demonstration review', consent: { review: true } });
  assert.equal(d.state, 'DRAFT', 'transitions return a new record and never mutate history');
  assert.deepEqual(r.events.map(e => e.to), ['DRAFT', 'SUBMITTED', 'NEEDS_EVIDENCE']);
  assert.equal(r.state, 'NEEDS_EVIDENCE');
  for (const e of r.events) { assert.ok(e.actor.id && e.actor.role && e.actor.mode && Date.parse(e.at) && e.reason.trim() && Array.isArray(e.evidence) && /^[0-9a-f]{64}$/.test(e.hash)); assert.equal(e.demonstration, true); }
  assert.deepEqual(r.events[1].consent, { review: true });
  assert.deepEqual(r.events.map(e => e.actor.mode), ['demonstration', 'demonstration', 'system']);
  assert.deepEqual(LC.missing(r).map(m => m.id), ['counts', 'signals', 'calibration', 'independent']);
  assert.equal(LC.requirementsFor(r.mission).limitations.length, 3);
  const pend = LC.pending(r).map(p => p.to); assert.deepEqual(pend.sort(), ['ARCHIVED', 'REJECTED', 'SIMULATION_CANDIDATE']);
  assert.deepEqual(await lc.verify(r), { ok: true, head: r.events.at(-1).hash, events: 3 });
  const a = await lc.transition(r, me, 'ARCHIVED', { reason: 'Archived by the author' });
  assert.equal(a.state, 'ARCHIVED'); await assert.rejects(lc.transition(a, me, 'SUBMITTED', { reason: 'x', consent: { review: true } }), /closed/);
});

test('unauthorized transitions are refused: consent, reason, owner, role, mode, system and skipped states', async () => {
  const LC = await LCP, lc = LC.createLifecycle({ clock: ticker() }), d = await demoDraft(LC, lc);
  await assert.rejects(lc.transition(d, me, 'SUBMITTED', { reason: 'no consent' }), /consent/);
  await assert.rejects(lc.transition(d, me, 'SUBMITTED', { reason: '  ', consent: { review: true } }), /reason/);
  await assert.rejects(lc.transition(d, { ...me, id: OTHER }, 'SUBMITTED', { reason: 'x', consent: { review: true } }), /Owner/);
  await assert.rejects(lc.transition(d, me, 'UNDER_REVIEW', { reason: 'self-review' }), /not allowed/);
  const s = await lc.transition(d, me, 'SUBMITTED', { reason: 'ok', consent: { review: true } });
  for (const to of ['REJECTED', 'SIMULATION_CANDIDATE']) await assert.rejects(lc.transition(s, { id: 'demo.reviewer', role: 'reviewer', mode: 'demonstration' }, to, { reason: 'fictional reviewer', evidence: [{ kind: 'authorized-data', ref: 'x' }] }), /cannot set/);
  await assert.rejects(lc.transition(s, human('h.rev', 'reviewer'), 'REJECTED', { reason: 'no verifier in browser' }), /not verified/);
  await assert.rejects(lc.transition(s, { id: 'core.gate.evidence', role: 'system', mode: 'system' }, 'NEEDS_EVIDENCE', { reason: 'forged gate' }), /inside CORE gates/);
  await assert.rejects(lc.transition(s, me, 'RECOMMENDED', { reason: 'skip' }), /not allowed/);
  await assert.rejects(lc.create({ id: 'c9', owner: OWNER, authenticated: true }), /not verified/);
  // Even with a verifier, a demonstration draft cannot enter a real review.
  const lv = LC.createLifecycle({ clock: ticker(Date.parse('2026-10-24T00:00:00Z')), verifyActor });
  await assert.rejects(lv.transition(s, human('h.rev', 'reviewer'), 'REJECTED', { reason: 'real review of demo' }), /Demonstration drafts/);
});

test('consequential path needs verified, independent humans with evidence; authors cannot authorize themselves', async () => {
  const LC = await LCP, { lc, r: s } = await realPath(LC);
  assert.equal(s.state, 'NEEDS_EVIDENCE');
  const data = need => ({ kind: 'authorized-data', ref: `dataset-${need}`, source: 'official portal', need });
  await assert.rejects(lc.transition(s, human('h.rev', 'reviewer'), 'SIMULATION_CANDIDATE', { reason: 'no data' }), /authorized-data required/);
  let r = await lc.transition(s, human('h.rev', 'reviewer'), 'SIMULATION_CANDIDATE', { reason: 'Data obtained', evidence: [data('counts'), data('signals')] });
  assert.deepEqual(LC.missing(r).map(m => m.id), ['calibration', 'independent']);
  r = await lc.transition(r, human('h.rev', 'reviewer'), 'SIMULATED', { reason: 'Calibrated run', evidence: [{ kind: 'simulation', ref: 'fingerprint-1', need: 'calibration' }] });
  r = await lc.transition(r, human('h.rev', 'reviewer'), 'INDEPENDENT_REVIEW', { reason: 'Send to independent review' });
  await assert.rejects(lc.transition(r, human('h.rev', 'independent-reviewer'), 'RECOMMENDED', { reason: 'same person', evidence: [{ kind: 'review', ref: 'r1', need: 'independent' }] }), /Independent/);
  await assert.rejects(lc.transition(r, human(OWNER, 'independent-reviewer'), 'RECOMMENDED', { reason: 'author', evidence: [{ kind: 'review', ref: 'r1' }] }), /Authors cannot/);
  r = await lc.transition(r, human('h.ind', 'independent-reviewer'), 'RECOMMENDED', { reason: 'Recommended', evidence: [{ kind: 'review', ref: 'review-1', need: 'independent' }] });
  assert.deepEqual(LC.missing(r), []);
  await assert.rejects(lc.transition(r, human(OWNER, 'signer'), 'APPROVED_FOR_TRANSMISSION', { reason: 'self-sign', evidence: [{ kind: 'mandate', ref: 'm' }] }), /Authors cannot/);
  await assert.rejects(lc.transition(r, human('h.sign', 'signer'), 'APPROVED_FOR_TRANSMISSION', { reason: 'no mandate' }), /mandate required/);
  r = await lc.transition(r, human('h.sign', 'signer'), 'APPROVED_FOR_TRANSMISSION', { reason: 'Signed', evidence: [{ kind: 'mandate', ref: 'mandate-1' }] });
  assert.equal((await lc.verify(r)).ok, true);
  // The browser instance (no verifier) refuses the very same history: authenticated steps cannot be proven there.
  const browser = LC.createLifecycle();
  assert.equal((await browser.verify(r)).ok, false); assert.equal(browser.view(r, human('h.rev', 'reviewer')), null);
});

test('fabricated outcomes: no transmitted, implemented or measured state without authority and verified external evidence', async () => {
  const LC = await LCP;
  const toApproved = async opts => {
    const { lc, r: s } = await realPath(LC, opts); let r = s;
    r = await lc.transition(r, human('h.rev', 'reviewer'), 'SIMULATION_CANDIDATE', { reason: 'd', evidence: [{ kind: 'authorized-data', ref: 'd' }] });
    r = await lc.transition(r, human('h.rev', 'reviewer'), 'SIMULATED', { reason: 's', evidence: [{ kind: 'simulation', ref: 'f' }] });
    r = await lc.transition(r, human('h.rev', 'reviewer'), 'INDEPENDENT_REVIEW', { reason: 'i' });
    r = await lc.transition(r, human('h.ind', 'independent-reviewer'), 'RECOMMENDED', { reason: 'r', evidence: [{ kind: 'review', ref: 'v' }] });
    return { lc, r: await lc.transition(r, human('h.sign', 'signer'), 'APPROVED_FOR_TRANSMISSION', { reason: 'a', evidence: [{ kind: 'mandate', ref: 'm' }] }) };
  };
  // Default (as in the browser and this phase): external states disabled even with a perfect receipt and verifier.
  { const { lc, r } = await toApproved({ verifyExternal: () => true });
    await assert.rejects(lc.transition(r, human('h.sign', 'signer'), 'TRANSMITTED', { reason: 'sent', evidence: [receipt('c2')] }), /External states are disabled/); }
  // Defence in depth: with an enabled authority (test only), malformed or unverified records are still refused.
  { const strict = e => e.ref === 'receipt-1', { lc, r } = await toApproved({ verifyExternal: strict, externalAuthority: { enabled: true } }), signer = human('h.sign', 'signer');
    for (const [bad, why] of [[[], 'none'], [[receipt('other')], 'wrong subject'], [[receipt('c2', 'impact-measurement')], 'wrong type'], [[receipt('c2', undefined, { url: 'http://x.org/1' })], 'not https'], [[receipt('c2', undefined, { observedAt: '2099-01-01T00:00:00Z' })], 'future'], [[receipt('c2', undefined, { sha256: 'zz' })], 'hash'], [[receipt('c2', undefined, { ref: 'invented' })], 'unverified']])
      await assert.rejects(lc.transition(r, signer, 'TRANSMITTED', { reason: why, evidence: bad }), /Verified external evidence required|Evidence/, why);
    const t = await lc.transition(r, signer, 'TRANSMITTED', { reason: 'Receipt verified', evidence: [receipt('c2')] });
    await assert.rejects(lc.transition(t, human('h.ind', 'independent-reviewer'), 'IMPACT_MEASURED', { reason: 'skip', evidence: [receipt('c2', 'impact-measurement')] }), /not allowed/);
    const i = await lc.transition(t, signer, 'EXTERNALLY_IMPLEMENTED', { reason: 'Implemented', evidence: [receipt('c2', 'implementation-record')] });
    await assert.rejects(lc.transition(i, human('h.ind', 'independent-reviewer'), 'IMPACT_MEASURED', { reason: 'not independent', evidence: [receipt('c2', 'impact-measurement')] }), /Independent/);
    assert.equal((await lc.transition(i, human('h.ind2', 'independent-reviewer'), 'IMPACT_MEASURED', { reason: 'Measured', evidence: [receipt('c2', 'impact-measurement')] })).state, 'IMPACT_MEASURED'); }
});

test('audit history: forged, edited, reordered or relabelled events fail verification and block further steps', async () => {
  const LC = await LCP, lc = LC.createLifecycle({ clock: ticker() }), r = await lc.transition(await demoDraft(LC, lc), me, 'SUBMITTED', { reason: 'ok', consent: { review: true } });
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);
  const clone = x => JSON.parse(JSON.stringify(x));
  const edited = clone(r); edited.events[1].reason = 'changed later';
  assert.match((await lc.verify(edited)).reason, /Hash chain/);
  const reordered = clone(r); [reordered.events[1], reordered.events[2]] = [reordered.events[2], reordered.events[1]];
  assert.equal((await lc.verify(reordered)).ok, false);
  // A correctly re-hashed forgery (as anyone with local storage access could write) is still illegal on replay.
  const forge = async (rec, ev) => { const f = clone(rec), { hash, ...e } = { seq: f.events.length + 1, prev: f.events.at(-1).hash, ...ev }; f.events.push({ ...e, hash: await sha(stable(e)) }); f.state = ev.to; return f; };
  const base = { at: '2026-10-23T11:00:00Z', reason: 'forged', evidence: [], demonstration: true };
  const asSigner = await forge(r, { ...base, from: 'NEEDS_EVIDENCE', to: 'TRANSMITTED', actor: human('h.sign', 'signer') });
  assert.equal((await lc.verify(asSigner)).ok, false);
  const asOwner = await forge(r, { ...base, from: 'NEEDS_EVIDENCE', to: 'RECOMMENDED', actor: me });
  assert.match((await lc.verify(asOwner)).reason, /not allowed|cannot set/);
  const flag = clone(r); flag.demonstration = false; assert.equal((await lc.verify(flag)).ok, false);
  const head = clone(r); head.state = 'IMPACT_MEASURED'; assert.match((await lc.verify(head)).reason, /Head state/);
  await assert.rejects(lc.transition(asSigner, me, 'ARCHIVED', { reason: 'x' }), /failed verification/);
  const back = LC.createLifecycle({ clock: () => '2026-10-22T00:00:00Z' });
  await assert.rejects(back.transition(r, me, 'ARCHIVED', { reason: 'x' }), /clock/);
});

test('privacy: only the owner reads a record; reviewers see a pseudonymous copy after real consented submission only', async () => {
  const LC = await LCP, lc = LC.createLifecycle({ clock: ticker() }), d = await demoDraft(LC, lc);
  assert.equal(lc.view(d, me).id, 'c1');
  assert.equal(lc.view(d, { ...me, id: OTHER }), null); assert.equal(lc.view(d, { id: OWNER, role: 'reviewer', mode: 'demonstration' }), null);
  const lv = LC.createLifecycle({ clock: ticker(), verifyActor }), demoSubmitted = await lv.transition(d, me, 'SUBMITTED', { reason: 'ok', consent: { review: true } });
  assert.equal(lv.view(demoSubmitted, human('h.rev', 'reviewer')), null, 'demonstration drafts never leave their owner');
  const { lc: rl, r } = await realPath(LC), draft = await rl.create({ id: 'c3', owner: OWNER, authenticated: true, reason: 'draft' });
  assert.equal(rl.view(draft, human('h.rev', 'reviewer')), null, 'drafts are private until submitted with consent');
  assert.equal(rl.view(r, human('h.unknown', 'reviewer')), null);
  const seen = rl.view(r, human('h.rev', 'reviewer'));
  assert.equal(seen.owner, null); assert.ok(seen.events.every(e => e.actor.id !== OWNER));
  assert.equal(rl.view(r, { id: 'h.rev', role: 'owner', mode: 'authenticated' }), null);
});

test('store: lifecycle records are scoped to the local owner and deleted with their contribution', async () => {
  const S = await import('../src/contrib/store.mjs'), LC = await LCP, mem = new Map(), st = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  const c = S.save({ id: 'c1', kind: 'hypothesis', title: 't', text: 'x', demonstration: true }, st), owner = S.localOwner(st);
  assert.match(owner, /^local\./); assert.equal(S.localOwner(st), owner);
  const lc = LC.createLifecycle(), r = await lc.create({ id: c.id, owner, demonstration: true, reason: 'draft' });
  assert.equal(S.saveLifecycle({ ...r, owner: OTHER }, st), false); assert.equal(S.saveLifecycle(r, st), true);
  assert.equal(S.lifecycles(st)[c.id].state, 'DRAFT');
  S.remove(c.id, st); assert.equal(S.lifecycles(st)[c.id], undefined); assert.deepEqual(S.list(st), []);
  const broken = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.equal(S.localOwner(broken), null); assert.deepEqual(S.lifecycles(broken), {});
});

test('browser wiring passes no verifier or authority, makes no network call, and keeps the SF tour untouched', () => {
  const lifecycle = fs.readFileSync('src/contrib/lifecycle.mjs', 'utf8'), me = fs.readFileSync('src/me/me.mjs', 'utf8');
  assert.doesNotMatch(lifecycle, /fetch\(|XMLHttpRequest|localStorage|document\./);
  assert.match(me, /LC\.createLifecycle\(\)/); assert.doesNotMatch(me, /verifyActor|verifyExternal|externalAuthority/);
  assert.match(me, /mode: 'demonstration'/); assert.doesNotMatch(me, /mode: 'authenticated'/);
  assert.match(fs.readFileSync('src/civic/ui-journey.mjs', 'utf8'), /'core\.lifecycle\.v1'/);
});

test('R10 review request: pseudonymous author, integrity and gaps included, no state change, honest relation, mismatch refused', async () => {
  const LC = await LCP, lc = LC.createLifecycle({ clock: ticker() });
  const r = await lc.create({ id: 'c7', owner: OWNER, mission: 'mission.sf.mobility', reason: 'Draft recorded in this browser', evidence: [{ kind: 'user-claim', ref: 'c7', source: 'this browser' }] });
  const entry = { id: 'c7', kind: 'idea', title: 'Bus lane', text: 'Idea text', mission: 'mission.sf.mobility', place: [-122.41, 37.78], at: '2026-10-23T10:00:00Z', structuredBy: 'deterministic' };
  const before = JSON.stringify(r), v = await lc.verify(r);
  const p = LC.reviewPacket(r, entry, { verification: v, related: { mission: 'mission.sf.mobility', runId: 'x', analysedContribution: true }, at: '2026-10-23T11:00:00Z' });
  assert.equal(JSON.stringify(r), before, 'building a packet never changes the record');
  assert.equal(p.format, 'core.review-request.v1'); assert.equal(p.lifecycle.state, r.state); assert.equal(p.lifecycle.integrity.ok, true);
  assert.ok(!JSON.stringify(p).includes(OWNER), 'local owner id never leaves the browser in the packet');
  assert.ok(p.lifecycle.events.every(e => e.actor.role !== 'owner' || e.actor.id === 'author'));
  assert.equal(p.relatedRecordedInvestigation.analysedContribution, false, 'a related recorded run is never presented as analysing the contribution');
  assert.deepEqual(p.missingEvidence.map(g => g.id), ['counts', 'signals', 'calibration', 'independent']);
  assert.match(p.notice, /has not transmitted, reviewed, validated or endorsed/); assert.equal(p.contribution.status, 'claim, not a verified observation');
  assert.equal(LC.reviewPacket(r, entry, {}).lifecycle.integrity.ok, false, 'unverified history is declared, not assumed');
  assert.throws(() => LC.reviewPacket(r, { ...entry, id: 'other' }, { verification: v }), /do not match/);
});
