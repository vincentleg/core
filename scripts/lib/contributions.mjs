// Workstream 12: isolated synthetic domain sandbox, not public identity, moderation or deployment services.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { authorityGate } from './authority.mjs';
import { validateCounts } from './pilot.mjs';
const require = createRequire(import.meta.url), MEMORY = require('../../src/civ-memory.js'), { stable } = require('../../src/science.js'), { sha256 } = require('../../src/scheduler.js'), CITIES = require('../../src/cities.js');
const RESEARCH = require('../../src/research.js');
const clone = x => JSON.parse(JSON.stringify(x)), digest = x => sha256(stable(x));
const schemas = Object.fromEntries(['participant', 'contribution', 'impact-evidence', 'contribution-history'].map(k => [k, JSON.parse(fs.readFileSync(new URL(`../../schemas/${k}-v1.schema.json`, import.meta.url), 'utf8'))]));
// Only the documented schema subset used above; no claim of a general JSON Schema implementation.
export function validateModel(name, data) {
  const check = (s, x, p) => {
    const fail = () => { throw Error('Invalid model field: ' + p); };
    if (s.const !== undefined && x !== s.const || s.enum && !s.enum.includes(x)) fail();
    if (s.type === 'object') {
      if (!x || typeof x !== 'object' || Array.isArray(x)) fail();
      if ((s.required || []).some(k => !Object.hasOwn(x, k)) || s.additionalProperties === false && Object.keys(x).some(k => !Object.hasOwn(s.properties || {}, k))) fail();
      for (const [k, v] of Object.entries(x)) if (s.properties?.[k]) check(s.properties[k], v, p + '.' + k);
    } else if (s.type === 'array') {
      if (!Array.isArray(x) || x.length > s.maxItems || s.uniqueItems && new Set(x).size !== x.length) fail();
      x.forEach((v, i) => check(s.items, v, p + '[' + i + ']'));
    } else if (s.type === 'string') {
      if (typeof x !== 'string' || x.length < (s.minLength || 0) || x.length > (s.maxLength ?? Infinity) || s.pattern && !new RegExp(s.pattern).test(x)) fail();
      if (s.format === 'date-time') {
        if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(x) || !Number.isFinite(Date.parse(x))) fail();
        const day = x.slice(0, 10), parsed = Date.parse(day + 'T00:00:00Z');
        if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day) fail();
      }
    } else if (['number', 'integer'].includes(s.type) && (typeof x !== 'number' || !Number.isFinite(x) || s.type === 'integer' && !Number.isSafeInteger(x) || x < s.minimum || x > s.maximum)) fail();
    else if (s.type === 'boolean' && typeof x !== 'boolean') fail();
  };
  if (!schemas[name]) throw Error('Unknown model');
  check(schemas[name], data, name); return true;
}
export const STATUSES = Object.freeze(['DRAFT', 'SUBMITTED', 'SCREENED', 'UNDER_REVIEW', 'EVIDENCE_ASSESSED', 'SIMULATED', 'REVISED', 'APPROVED_FOR_PUBLICATION', 'PUBLISHED', 'CONSIDERED_BY_PARTNER', 'AUTHORIZED_FOR_PILOT', 'PILOT_RUNNING', 'IMPLEMENTED', 'IMPACT_MEASURED', 'REJECTED_OR_WITHDRAWN']);
const NEXT = { DRAFT: ['SUBMITTED'], SUBMITTED: ['SCREENED'], SCREENED: ['UNDER_REVIEW'], UNDER_REVIEW: ['EVIDENCE_ASSESSED'], EVIDENCE_ASSESSED: ['SIMULATED', 'APPROVED_FOR_PUBLICATION'], SIMULATED: ['APPROVED_FOR_PUBLICATION'], REVISED: ['SUBMITTED'], APPROVED_FOR_PUBLICATION: ['PUBLISHED'], PUBLISHED: [] };
const ROLE = { SUBMITTED: 'participant', SCREENED: 'moderator', UNDER_REVIEW: 'reviewer', EVIDENCE_ASSESSED: 'reviewer', SIMULATED: 'simulator', APPROVED_FOR_PUBLICATION: 'publisher', PUBLISHED: 'publisher' };
const OBJECTIONS = Object.freeze({ TESTIMONY_NOT_CORROBORATED: 'Testimony is context, not independently verified fact.', UNCALIBRATED: 'Synthetic calculation is not calibrated and establishes no field efficacy.', FEASIBILITY_UNKNOWN: 'Feasibility and real-world authorization are not established.' });
export function boundedSimulation(pkg) {
  if (validateCounts(pkg, { allowSynthetic: true }).state !== 'VALIDATED_INPUT' || pkg.manifest.kind !== 'synthetic-fixture' || pkg.rows.length > 24 || pkg.rows.some(r => r.count > 1000)) throw Error('Bounded synthetic inputs required');
  const arrivals = pkg.rows.map(r => r.count), run = (capacity, factor = 1) => RESEARCH.queue(arrivals, capacity, factor).sum;
  return { kind: 'SIMULATION', synthetic: true, calibrated: false, efficacyValidated: false, units: 'synthetic queue-count sum, not delay or safety benefit', inputHash: digest(pkg), baseline: run(12), alternative: run(15), sensitivity: [0.8, 1, 1.2].map(demandFactor => ({ demandFactor, baseline: run(12, demandFactor), alternative: run(15, demandFactor) })) };
}
export function createSandboxLedger({ evidence = [], memoryFile = ':memory:', clock = () => new Date().toISOString() } = {}) {
  if (memoryFile !== ':memory:') {
    if (!/^\.core-local\/contributions-[A-Za-z0-9-]+\.sqlite$/.test(memoryFile)) throw Error('Separate local contribution database required');
    fs.mkdirSync('.core-local', { recursive: true, mode: 0o700 });
    if (fs.realpathSync('.core-local') !== path.join(fs.realpathSync('.'), '.core-local')) throw Error('Private storage symlink refused');
    for (const suffix of ['', '-wal', '-shm']) { const entry = fs.lstatSync(memoryFile + suffix, { throwIfNoEntry: false }); if (entry && (!entry.isFile() || entry.nlink !== 1)) throw Error('Private storage link or non-file refused'); }
  }
  const memory = MEMORY.open(memoryFile, { clock }), capabilities = new WeakMap(), actors = {};
  for (const role of ['participant', 'moderator', 'reviewer', 'simulator', 'publisher', 'other']) { actors[role] = Object.freeze({ label: 'demo.' + role }); capabilities.set(actors[role], role); }
  if (memoryFile !== ':memory:') for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(memoryFile + suffix)) fs.chmodSync(memoryFile + suffix, 0o600);
  const sources = new Map();
  try { for (const e of evidence) {
    validateModel('impact-evidence', e);
    if (sources.has(e.id) || !['SYNTHETIC_TESTIMONY', 'SYNTHETIC_COUNTS'].includes(e.kind) || !/^fixture:[a-z0-9-]+$/.test(e.source) || digest(e.payload) !== e.payloadSha256 || Date.parse(e.observedAt) > Date.parse(e.retrievedAt)) throw Error('Unverified or non-synthetic evidence');
    sources.set(e.id, clone(e));
  } } catch (e) { memory.close(); throw e; }
  const roleOf = cap => { const r = cap && capabilities.get(cap); if (!r) throw Error('Untrusted sandbox capability'); return r; };
  const load = id => { if (!memory.verify().ok) throw Error('Memory audit corruption'); const r = memory.loadCheckpoint(id)?.body; if (!r || r.erased) throw Error('Contribution unavailable'); verify(r); return clone(r); };
  const own = (r, cap) => { if (roleOf(cap) !== 'participant' || r.author !== 'demo.participant') throw Error('Owner capability required'); };
  function verify(r) {
    let prev = '0'.repeat(64);
    validateModel('contribution-history', r.history);
    if (r.mode !== 'synthetic-demo' || r.versions.length > 32 || r.history.length > 256) throw Error('Invalid ledger bounds');
    for (const v of r.versions) { validateModel('contribution', v.content); validateModel('participant', v.profile); if (digest({ content: v.content, profile: v.profile }) !== v.hash) throw Error('Revision corruption'); }
    for (let i = 0; i < r.history.length; i++) {
      const { hash, ...e } = r.history[i], before = r.history[i - 1];
      let legal = e.detail.researchFingerprint ? e.from === 'SIMULATED' && e.to === 'SIMULATED' && e.actor === 'demo.simulator' && !!e.detail.questionId
        : !i ? e.to === 'DRAFT' && e.actor === 'demo.participant' && e.revision === 1
        : e.to === 'REVISED' ? ['UNDER_REVIEW', 'EVIDENCE_ASSESSED', 'SIMULATED', 'PUBLISHED'].includes(e.from) && e.actor === 'demo.participant' && e.revision === before.revision + 1
        : e.to === 'REJECTED_OR_WITHDRAWN' ? before.to !== 'REJECTED_OR_WITHDRAWN' && ['demo.participant', 'demo.moderator', 'demo.reviewer'].includes(e.actor)
        : (NEXT[e.from] || []).includes(e.to) && e.actor === 'demo.' + ROLE[e.to];
      if (e.sequence !== i + 1 || e.from !== (before?.to || null) || e.prev !== prev || digest(e) !== hash || !legal || !r.versions[e.revision - 1] || e.contentHash !== r.versions[e.revision - 1].hash || before && e.to !== 'REVISED' && e.revision !== before.revision) throw Error('History corruption'); prev = hash;
      if (e.to === 'EVIDENCE_ASSESSED') {
        const refs = r.versions[e.revision - 1].content.evidenceRefs;
        if (refs.some(id => !sources.has(id)) || digest(e.detail.evidence) !== digest(refs.map(id => ({ id, hash: digest(sources.get(id)) })))) throw Error('Assessed evidence provenance changed');
      }
    }
    if (r.state !== r.history.at(-1).to || r.revision !== r.versions.length) throw Error('Ledger head mismatch');
    const researchEvent = r.history.filter(e => e.revision === r.revision && e.detail.researchFingerprint).at(-1);
    if ((researchEvent?.detail.researchFingerprint || null) !== (r.research?.fingerprint || null) || researchEvent && researchEvent.detail.questionId !== r.research.questionId) throw Error('Research linkage corruption');
    const objections = r.history.filter(e => e.to === 'EVIDENCE_ASSESSED').map(e => ({ revision: e.revision, by: e.actor, note: e.detail.note, code: e.detail.objection, epistemic: 'synthetic-review-not-independent-validation' }));
    if (digest(objections) !== digest(r.objections)) throw Error('Review history mismatch');
    if (r.simulation) {
      const pkg = current(r).content.evidenceRefs.map(id => sources.get(id)).find(e => e?.kind === 'SYNTHETIC_COUNTS')?.payload;
      if (!pkg || digest(boundedSimulation(pkg)) !== digest(r.simulation)) throw Error('Irreproducible simulation');
    }
    return true;
  }
  const current = r => r.versions.at(-1);
  function append(r, cap, to, detail = {}) {
    if (r.history.length >= 256) throw Error('Sandbox history limit');
    const at = clock(); if (!Number.isFinite(Date.parse(at)) || r.history.length && Date.parse(at) < Date.parse(r.history.at(-1).at)) throw Error('Invalid event clock');
    const e = { sequence: r.history.length + 1, at, actor: 'demo.' + roleOf(cap), from: r.state || null, to, revision: r.revision, contentHash: current(r).hash, detail, prev: r.history.at(-1)?.hash || '0'.repeat(64) };
    r.history.push({ ...e, hash: digest(e) }); r.state = to; memory.checkpoint(r.id, to, r); return clone(r);
  }
  function publicBody(r) {
    const v = current(r), c = v.content, p = v.profile;
    return { id: r.id, revision: r.revision, mode: r.mode, author: c.consent.pseudonym ? p.pseudonym : null, avatar: c.consent.avatar ? p.avatar || null : null, interests: c.consent.interests ? p.interests : [], expertise: c.consent.expertise ? p.expertise : [],
      location: c.consent.approximateLocation ? { city: c.location.city, neighborhood: c.location.neighborhood, precision: 'neighborhood' } : null,
      observation: c.observation, interpretation: c.interpretation, proposal: c.proposal, relations: { problems: c.relations.problems, reuses: visible(c.relations.reuses), supersedes: visible(c.relations.supersedes) },
      evidence: c.evidenceRefs.map(id => { const { payload, ...meta } = sources.get(id); return meta; }),
      objections: r.objections.map(o => ({ revision: o.revision, by: o.by, code: o.code, explanation: OBJECTIONS[o.code], epistemic: o.epistemic })), simulation: r.simulation, rights: { permission: 'SYNTHETIC_DEMO_DISPLAY_ONLY', commercialReuse: 'NOT_AUTHORIZED', compensation: 'UNDECIDED' },
      progression: { enabled: c.consent.avatar && p.progressionEnabled, badges: c.consent.avatar && p.progressionEnabled ? [{ id: 'reviewed-demo-evidence', explanation: 'Synthetic evidence assessed in this sandbox; no real-world impact.' }, ...(r.revision > 1 ? [{ id: 'reviewed-demo-correction', explanation: 'A revised synthetic proposal passed a new review.' }] : [])] : [] }, ...(r.research ? { research: r.research } : {}), organizationsConsidering: [], realWorldStatus: 'NOT_AUTHORIZED', authorizesRealWorld: false, measuredImpact: null };
  }
  function visible(ids) { return ids.filter(id => { try { const r = load(id); return r.state === 'PUBLISHED' && current(r).content.consent.publication; } catch { return false; } }); }
  const api = {
    create(cap, id, content, profile) {
      if (roleOf(cap) !== 'participant' || !/^contribution-[a-z0-9-]{1,50}$/.test(id) || memory.loadCheckpoint(id)) throw Error('Invalid creator or contribution id');
      if (memory.checkpoints().length >= 100) throw Error('Sandbox contribution limit');
      validateModel('contribution', content); validateModel('participant', profile); checkLocation(content);
      const v = { content: clone(content), profile: clone(profile), hash: digest({ content, profile }) }, r = { id, mode: 'synthetic-demo', author: 'demo.participant', revision: 1, versions: [v], history: [], objections: [], simulation: null, approval: null };
      return append(r, cap, 'DRAFT');
    },
    inspect(cap, id) { const r = load(id); own(r, cap); return r; },
    async attachResearch(cap, id, { inputs, question, bundle }) {
      if (roleOf(cap) !== 'simulator') throw Error('Research simulator capability required');
      const before = load(id);
      if (before.state !== 'SIMULATED' || before.research || question?.domain !== 'synthetic-traffic' || question?.contribution?.id !== id || question.contribution.revision !== before.revision) throw Error('Research link out of scope');
      const pkg = current(before).content.evidenceRefs.map(id => sources.get(id)).find(e => e.kind === 'SYNTHETIC_COUNTS')?.payload;
      if (!pkg || stable(JSON.parse(inputs.countsRaw)) !== stable(pkg) || (await RESEARCH.verify(inputs, question, bundle)).state === 'BLOCKED') throw Error('Research result not reproducible from contribution evidence');
      const r = load(id); if (r.state !== before.state || r.revision !== before.revision || r.research) throw Error('Contribution changed during review');
      r.research = { questionId: question.id, fingerprint: bundle.fingerprint, kind: 'synthetic-research-result', authorizesRealWorld: false };
      return append(r, cap, 'SIMULATED', { questionId: question.id, researchFingerprint: bundle.fingerprint });
    },
    transition(cap, id, to, { note = '', objection = 'UNCALIBRATED' } = {}) {
      const role = roleOf(cap), r = load(id), c = current(r).content;
      if (typeof note !== 'string' || note.length > 600) throw Error('Invalid review note');
      if (to === 'REJECTED_OR_WITHDRAWN' && ['moderator', 'reviewer'].includes(role) && r.state !== 'DRAFT' && r.state !== 'REJECTED_OR_WITHDRAWN' && note.trim()) { r.approval = null; return append(r, cap, to, { note }); }
      if (!Object.hasOwn(NEXT, to)) { if (!authorityGate('real-world').allowed) throw Error('External contribution states disabled'); }
      if (!(NEXT[r.state] || []).includes(to) || role !== ROLE[to]) throw Error('Unauthorized status transition');
      if (to === 'EVIDENCE_ASSESSED') {
        if (!c.evidenceRefs.length || c.evidenceRefs.some(id => !sources.has(id) || digest(sources.get(id).payload) !== sources.get(id).payloadSha256)) throw Error('Missing or corrupt provenance');
        if (!note.trim() || !Object.hasOwn(OBJECTIONS, objection)) throw Error('Explicit evidence limits required');
        r.objections.push({ revision: r.revision, by: 'demo.reviewer', note, code: objection, epistemic: 'synthetic-review-not-independent-validation' });
      }
      if (to === 'SIMULATED') {
        const pkg = c.evidenceRefs.map(id => sources.get(id)).find(e => e?.kind === 'SYNTHETIC_COUNTS')?.payload;
        if (!pkg) throw Error('No supported simulation evidence'); r.simulation = boundedSimulation(pkg);
      }
      if (to === 'APPROVED_FOR_PUBLICATION') { if (!c.consent.publication) throw Error('Publication consent required'); r.approval = { revision: r.revision, digest: digest(publicBody(r)) }; }
      if (to === 'PUBLISHED' && (!c.consent.publication || r.approval?.revision !== r.revision || r.approval?.digest !== digest(publicBody(r)))) throw Error('Exact-version publication review required');
      return append(r, cap, to, { note, ...(to === 'EVIDENCE_ASSESSED' ? { objection, evidence: c.evidenceRefs.map(id => ({ id, hash: digest(sources.get(id)) })) } : {}), ...(to === 'APPROVED_FOR_PUBLICATION' ? { projectionDigest: r.approval.digest } : {}) });
    },
    revise(cap, id, content, profile) {
      const r = load(id); own(r, cap); if (!['UNDER_REVIEW', 'EVIDENCE_ASSESSED', 'SIMULATED', 'PUBLISHED'].includes(r.state) || r.versions.length >= 32) throw Error('Revision unavailable');
      validateModel('contribution', content); validateModel('participant', profile); checkLocation(content);
      r.versions.push({ content: clone(content), profile: clone(profile), hash: digest({ content, profile }) }); r.revision++; r.simulation = null; r.approval = null; delete r.research;
      return append(r, cap, 'REVISED');
    },
    withdraw(cap, id) { const r = load(id); own(r, cap); if (r.state === 'REJECTED_OR_WITHDRAWN') throw Error('Already withdrawn'); r.approval = null; return append(r, cap, 'REJECTED_OR_WITHDRAWN'); },
    erase(cap, id) { const r = load(id); own(r, cap); memory.checkpoint(id, 'ERASED', { id, erased: true, mode: 'synthetic-demo' }); return { erased: true, scope: 'local-logical-deletion; no remote copies or secure physical erasure guaranteed' }; },
    publicView(id) {
      let r; try { r = load(id); } catch { return null; }
      if (r.state !== 'PUBLISHED' || !current(r).content.consent.publication) return null;
      const body = publicBody(r); if (r.approval?.digest !== digest(body)) throw Error('Publication integrity failed');
      const history = r.history.map(e => ({ sequence: e.sequence, at: e.at, actor: e.actor, from: e.from, to: e.to, revision: e.revision, ...(e.detail.researchFingerprint ? { research: { questionId: e.detail.questionId, fingerprint: e.detail.researchFingerprint } } : {}) }));
      return clone({ ...body, state: r.state, history, publicFingerprint: digest({ body, history }), persistence: 'Local SQLite; not immutable or perpetual' });
    },
    verify(id) { return verify(load(id)) && memory.verify().ok; }, close() { memory.close(); }
  };
  return { ledger: api, actors: Object.freeze(actors) };
}
function checkLocation(c) { const city = CITIES.get(c.location.city); if (!city?.studyArea?.neighborhoods.includes(c.location.neighborhood)) throw Error('Only registered coarse study areas; no precise public location'); }
