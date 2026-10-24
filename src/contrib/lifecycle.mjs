// CORE R1 — contribution lifecycle: an explicit state machine with a SHA-256 hash-chained history.
// Every transition records actor (id, role, mode), time, reason and evidence. Modes: 'demonstration' (this browser's
// owner, or a labelled demo step), 'system' (a deterministic code gate in this module) and 'authenticated' (a human
// whose identity a trusted verifier confirms). The browser has no such verifier, so authenticated actions, and with
// them every review, recommendation, authorization and external state, are refused (fail closed). The last three
// states also need a verified external record and an enabled external authority; neither exists (Constitution V1.1,
// product constitution §4–§5). Pure module: no DOM, storage or network; usable in Node tests and in the browser.
import { cleanLink } from '../earth/mission-intel.mjs';
export const STATES = Object.freeze(['DRAFT', 'SUBMITTED', 'NEEDS_EVIDENCE', 'UNDER_REVIEW', 'SIMULATION_CANDIDATE', 'SIMULATED', 'INDEPENDENT_REVIEW', 'RECOMMENDED', 'NOT_RECOMMENDED', 'APPROVED_FOR_TRANSMISSION', 'TRANSMITTED', 'EXTERNALLY_IMPLEMENTED', 'IMPACT_MEASURED', 'REJECTED', 'ARCHIVED']);
export const MAIN_PATH = Object.freeze(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SIMULATION_CANDIDATE', 'SIMULATED', 'INDEPENDENT_REVIEW', 'RECOMMENDED', 'APPROVED_FOR_TRANSMISSION', 'TRANSMITTED', 'EXTERNALLY_IMPLEMENTED', 'IMPACT_MEASURED']);
export const EXTERNAL_STATES = Object.freeze(['TRANSMITTED', 'EXTERNALLY_IMPLEMENTED', 'IMPACT_MEASURED']);
export const TERMINAL = Object.freeze(['IMPACT_MEASURED', 'ARCHIVED']);
export const LABELS = Object.freeze({
  DRAFT: { en: 'Draft', fr: 'Brouillon' }, SUBMITTED: { en: 'Submitted', fr: 'Soumise' }, NEEDS_EVIDENCE: { en: 'Needs evidence', fr: 'Preuves manquantes' },
  UNDER_REVIEW: { en: 'Under review', fr: 'En revue' }, SIMULATION_CANDIDATE: { en: 'Simulation candidate', fr: 'Candidate à la simulation' }, SIMULATED: { en: 'Simulated', fr: 'Simulée' },
  INDEPENDENT_REVIEW: { en: 'Independent review', fr: 'Revue indépendante' }, RECOMMENDED: { en: 'Recommended', fr: 'Recommandée' }, NOT_RECOMMENDED: { en: 'Not recommended', fr: 'Non recommandée' },
  APPROVED_FOR_TRANSMISSION: { en: 'Approved for transmission', fr: 'Approuvée pour transmission' }, TRANSMITTED: { en: 'Transmitted', fr: 'Transmise' },
  EXTERNALLY_IMPLEMENTED: { en: 'Externally implemented', fr: 'Mise en œuvre externe' }, IMPACT_MEASURED: { en: 'Impact measured', fr: 'Impact mesuré' },
  REJECTED: { en: 'Rejected', fr: 'Rejetée' }, ARCHIVED: { en: 'Archived', fr: 'Archivée' }
});
export const ROLES = Object.freeze({
  owner: { en: 'you (author)', fr: 'vous (auteur)' }, system: { en: 'CORE evidence gate (code)', fr: 'contrôle des preuves CORE (code)' },
  moderator: { en: 'moderator', fr: 'modérateur' }, reviewer: { en: 'reviewer', fr: 'relecteur' }, 'independent-reviewer': { en: 'independent reviewer', fr: 'relecteur indépendant' }, signer: { en: 'authorized human signer', fr: 'signataire humain habilité' }
});
const AUTH = ['authenticated'], ANY_OWNER = ['demonstration', 'authenticated'];
const OPEN = ['SUBMITTED', 'NEEDS_EVIDENCE', 'UNDER_REVIEW', 'SIMULATION_CANDIDATE', 'SIMULATED', 'INDEPENDENT_REVIEW'];
// to → who may move a record there, from where, and what proof the event must carry.
export const RULES = Object.freeze({
  SUBMITTED: { from: ['DRAFT'], roles: ['owner'], modes: ANY_OWNER, consent: true },
  NEEDS_EVIDENCE: { from: ['SUBMITTED', 'UNDER_REVIEW'], roles: ['system', 'reviewer'], modes: ['system', ...AUTH] },
  UNDER_REVIEW: { from: ['SUBMITTED'], roles: ['moderator'], modes: AUTH },
  SIMULATION_CANDIDATE: { from: ['UNDER_REVIEW', 'NEEDS_EVIDENCE'], roles: ['reviewer'], modes: AUTH, needs: ['authorized-data'] },
  SIMULATED: { from: ['SIMULATION_CANDIDATE'], roles: ['reviewer'], modes: AUTH, needs: ['simulation'] },
  INDEPENDENT_REVIEW: { from: ['SIMULATED'], roles: ['reviewer'], modes: AUTH },
  RECOMMENDED: { from: ['INDEPENDENT_REVIEW'], roles: ['independent-reviewer'], modes: AUTH, needs: ['review'], independent: true },
  NOT_RECOMMENDED: { from: ['INDEPENDENT_REVIEW'], roles: ['independent-reviewer'], modes: AUTH, needs: ['review'], independent: true },
  APPROVED_FOR_TRANSMISSION: { from: ['RECOMMENDED'], roles: ['signer'], modes: AUTH, needs: ['mandate'], consequential: true },
  TRANSMITTED: { from: ['APPROVED_FOR_TRANSMISSION'], roles: ['signer'], modes: AUTH, external: 'transmission-receipt', consequential: true },
  EXTERNALLY_IMPLEMENTED: { from: ['TRANSMITTED'], roles: ['signer'], modes: AUTH, external: 'implementation-record', consequential: true },
  IMPACT_MEASURED: { from: ['EXTERNALLY_IMPLEMENTED'], roles: ['independent-reviewer'], modes: AUTH, external: 'impact-measurement', independent: true, consequential: true },
  REJECTED: { from: OPEN, roles: ['moderator', 'reviewer'], modes: AUTH },
  ARCHIVED: { from: ['DRAFT', ...OPEN, 'RECOMMENDED', 'NOT_RECOMMENDED', 'REJECTED', 'APPROVED_FOR_TRANSMISSION'], roles: ['owner'], modes: ANY_OWNER }
});
export const EVIDENCE_KINDS = Object.freeze(['user-claim', 'recorded-agent-work', 'illustrative-scenario', 'authorized-data', 'simulation', 'review', 'mandate', 'external-record']);
// Evidence a mission needs before any recommendation; a user claim or an uncalibrated scenario never satisfies it.
export const REQUIREMENTS = Object.freeze({
  'mission.sf.mobility': {
    needs: [
      { kind: 'authorized-data', id: 'counts', label: { en: 'Authorized, observed traffic counts for the Folsom/Howard approach', fr: 'Comptages de trafic observés et autorisés pour l’approche Folsom/Howard' } },
      { kind: 'authorized-data', id: 'signals', label: { en: 'Official signal timing plans', fr: 'Plans de feux officiels' } },
      { kind: 'simulation', id: 'calibration', label: { en: 'Model calibrated against held-out observations', fr: 'Modèle calibré sur des observations réservées' } },
      { kind: 'review', id: 'independent', label: { en: 'Independent expert review', fr: 'Revue experte indépendante' } }
    ],
    limitations: [
      { en: 'Your idea is a claim, not a verified observation.', fr: 'Votre idée est une affirmation, pas une observation vérifiée.' },
      { en: 'The recorded agent investigation predates your idea and did not analyse it.', fr: 'L’enquête enregistrée des agents précède votre idée et ne l’a pas analysée.' },
      { en: 'Queue scenarios use assumed demand and signal timing; they are not calibrated.', fr: 'Les scénarios de file utilisent une demande et des feux supposés ; ils ne sont pas calibrés.' }
    ]
  },
  default: {
    needs: [
      { kind: 'authorized-data', id: 'observation', label: { en: 'Authorized observations for the place concerned', fr: 'Observations autorisées pour le lieu concerné' } },
      { kind: 'review', id: 'independent', label: { en: 'Independent expert review', fr: 'Revue experte indépendante' } }
    ],
    limitations: [{ en: 'Your contribution is a claim, not a verified observation.', fr: 'Votre contribution est une affirmation, pas une observation vérifiée.' }]
  }
});
export const requirementsFor = mission => REQUIREMENTS[mission] || REQUIREMENTS.default;
const refuse = () => false;
const ZERO = '0'.repeat(64), HEX64 = /^[0-9a-f]{64}$/, MAX_EVENTS = 64, SYSTEM = Symbol('core.lifecycle.system');
const stable = v => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);
async function sha256(s) { const b = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const clone = x => JSON.parse(JSON.stringify(x));
const text = (s, max) => typeof s === 'string' && s.trim() && s.length <= max;

function checkEvidence(items) {
  if (!Array.isArray(items) || items.length > 8) throw Error('Invalid evidence list');
  return items.map(e => {
    if (!e || !EVIDENCE_KINDS.includes(e.kind) || !text(e.ref, 200) || (e.source != null && !text(e.source, 200))) throw Error('Invalid evidence item');
    const out = { kind: e.kind, ref: e.ref, source: e.source ?? null };
    if (e.need != null) { if (!text(e.need, 40)) throw Error('Invalid evidence item'); out.need = e.need; }
    if (e.kind === 'external-record') Object.assign(out, { type: e.type, subject: e.subject, issuer: e.issuer, url: e.url, observedAt: e.observedAt, sha256: e.sha256 });
    return out;
  });
}
// Structural checks only; a record that passes still needs the injected verifier (none in the browser).
function externalWellFormed(e, record, type, at) {
  return e.kind === 'external-record' && e.type === type && e.subject === record.id && text(e.issuer, 120) && /^https:\/\/[^\s]{4,300}$/.test(e.url || '')
    && Number.isFinite(Date.parse(e.observedAt)) && Date.parse(e.observedAt) <= Date.parse(at) && HEX64.test(e.sha256 || '');
}
// Requirements still open on a record: satisfied only by evidence carried by an authenticated (verified) event.
export function missing(record) {
  const have = new Set(record.events.filter(e => e.actor.mode === 'authenticated').flatMap(e => e.evidence.filter(x => x.need).map(x => `${x.kind}:${x.need}`)));
  return requirementsFor(record.mission).needs.filter(n => !have.has(`${n.kind}:${n.id}`));
}
// Next steps that remain possible from the current state, with who would have to act.
export const pending = record => Object.entries(RULES).filter(([, r]) => r.from.includes(record.state)).map(([to, r]) => ({ to, roles: r.roles, modes: r.modes, consequential: !!r.consequential, external: !!r.external }));

export function createLifecycle({ clock = () => new Date().toISOString(), verifyActor = refuse, verifyExternal = refuse, externalAuthority = { enabled: false } } = {}) {
  async function seal(e) { return { ...e, hash: await sha256(stable(e)) }; }
  function legal(record, actor, to, { reason, evidence, consent }, at, priorEvents) {
    const rule = RULES[to];
    if (!rule) throw Error('Unknown state');
    if (TERMINAL.includes(record.state)) throw Error('Contribution is closed');
    if (!rule.from.includes(record.state)) throw Error(`Transition ${record.state} → ${to} not allowed`);
    if (!actor || !text(actor.id, 80) || !Object.hasOwn(ROLES, actor.role) || !['demonstration', 'system', 'authenticated'].includes(actor.mode)) throw Error('Invalid actor');
    if (!rule.roles.includes(actor.role) || !rule.modes.includes(actor.mode)) throw Error(`Role ${actor.role} (${actor.mode}) cannot set ${to}`);
    if (actor.role === 'owner' && actor.id !== record.owner) throw Error('Owner capability required');
    if (actor.role !== 'owner' && actor.id === record.owner) throw Error('Authors cannot review or authorize their own contribution');
    if (actor.mode === 'authenticated' && verifyActor(actor) !== true) throw Error('Authenticated actor not verified');
    if (actor.mode === 'authenticated' && record.demonstration) throw Error('Demonstration drafts cannot enter a real review');
    if (!text(reason, 600)) throw Error('A reason is required for every transition');
    if (rule.consent && consent?.review !== true) throw Error('Explicit consent to review is required');
    if (rule.independent && priorEvents.some(e => e.actor.id === actor.id)) throw Error('Independent review requires an actor with no earlier role on this contribution');
    for (const kind of rule.needs || []) if (!evidence.some(e => e.kind === kind)) throw Error(`Evidence of kind ${kind} required`);
    if (rule.external) {
      if (externalAuthority?.enabled !== true) throw Error('External states are disabled: no authorized external integration');
      const recs = evidence.filter(e => e.kind === 'external-record');
      if (!recs.length || !recs.every(e => externalWellFormed(e, record, rule.external, at) && verifyExternal(e) === true)) throw Error('Verified external evidence required');
    }
  }
  async function append(record, actor, to, opts) {
    const r = clone(record), at = clock(), last = r.events.at(-1);
    if (!Number.isFinite(Date.parse(at)) || (last && Date.parse(at) < Date.parse(last.at))) throw Error('Invalid event clock');
    if (r.events.length >= MAX_EVENTS) throw Error('History limit reached');
    const evidence = checkEvidence(opts.evidence || []);
    legal(r, actor, to, { ...opts, evidence }, at, r.events);
    const e = { seq: r.events.length + 1, at, actor: { id: actor.id, role: actor.role, mode: actor.mode }, from: r.state, to, reason: opts.reason, evidence, demonstration: r.demonstration || actor.mode === 'demonstration', ...(RULES[to].consent ? { consent: { review: true } } : {}), prev: last?.hash || ZERO };
    r.events.push(await seal(e)); r.state = to; return r;
  }
  // Deterministic gate: after a submission, list what is missing; never approves anything.
  async function evidenceGate(record) {
    const gaps = missing(record); if (!gaps.length) return record;
    return append(record, { id: 'core.gate.evidence', role: 'system', mode: 'system', [SYSTEM]: true }, 'NEEDS_EVIDENCE', { reason: `Missing: ${gaps.map(g => g.id).join(', ')}`, evidence: [] });
  }
  const api = {
    async create({ id, owner, mission = null, demonstration = false, authenticated = false, reason = 'Draft created', evidence = [] }) {
      if (!text(id, 80) || !text(owner, 80)) throw Error('Invalid contribution or owner id');
      const at = clock(); if (!Number.isFinite(Date.parse(at))) throw Error('Invalid event clock');
      if (!text(reason, 600)) throw Error('A reason is required for every transition');
      const e = { seq: 1, at, actor: { id: owner, role: 'owner', mode: authenticated && !demonstration ? 'authenticated' : 'demonstration' }, from: null, to: 'DRAFT', reason, evidence: checkEvidence(evidence), demonstration: !!demonstration, prev: ZERO };
      if (e.actor.mode === 'authenticated' && verifyActor(e.actor) !== true) throw Error('Authenticated actor not verified');
      return { v: 1, id, owner, mission, demonstration: !!demonstration, state: 'DRAFT', events: [await seal(e)] };
    },
    async transition(record, actor, to, opts = {}) {
      if (!(await api.verify(record)).ok) throw Error('History failed verification');
      if (actor?.mode === 'system' && !actor[SYSTEM]) throw Error('System steps run only inside CORE gates');
      const next = await append(record, actor, to, opts);
      return to === 'SUBMITTED' ? evidenceGate(next) : next;
    },
    // Replays the whole history: hash chain, legality and proof of every event under the same verifiers.
    async verify(record) {
      try {
        if (!record || record.v !== 1 || !Array.isArray(record.events) || !record.events.length || record.events.length > MAX_EVENTS) return { ok: false, reason: 'Malformed record' };
        let prev = ZERO, replay = null;
        for (const [i, ev] of record.events.entries()) {
          const { hash, ...e } = ev;
          if (e.seq !== i + 1 || e.prev !== prev || await sha256(stable(e)) !== hash) return { ok: false, at: i + 1, reason: 'Hash chain broken' };
          if (i === 0) {
            if (e.to !== 'DRAFT' || e.from !== null || e.actor.id !== record.owner || e.actor.role !== 'owner' || e.demonstration !== record.demonstration) return { ok: false, at: 1, reason: 'Invalid creation event' };
            if (!['demonstration', 'authenticated'].includes(e.actor.mode) || (record.demonstration && e.actor.mode !== 'demonstration') || (e.actor.mode === 'authenticated' && verifyActor(e.actor) !== true)) return { ok: false, at: 1, reason: 'Unverified creator' };
            replay = { ...record, state: 'DRAFT', events: [ev] };
          } else {
            if (e.from !== replay.state || (e.actor.mode === 'system' && (e.actor.id !== 'core.gate.evidence' || e.to !== 'NEEDS_EVIDENCE'))) return { ok: false, at: i + 1, reason: 'Illegal transition' };
            if (e.demonstration !== (record.demonstration || e.actor.mode === 'demonstration')) return { ok: false, at: i + 1, reason: 'Demonstration flag altered' };
            legal(replay, e.actor, e.to, { reason: e.reason, evidence: e.evidence, consent: e.consent }, e.at, replay.events);
            replay = { ...replay, state: e.to, events: [...replay.events, ev] };
          }
          prev = hash;
        }
        return replay.state === record.state ? { ok: true, head: prev, events: record.events.length } : { ok: false, reason: 'Head state mismatch' };
      } catch (err) { return { ok: false, reason: err.message }; }
    },
    // Owner sees everything. A verified reviewer/moderator sees a pseudonymous copy only after a consented, real
    // submission. Demonstration drafts never leave their owner. Everyone else: nothing.
    view(record, viewer) {
      if (!record || !viewer) return null;
      if (viewer.id === record.owner && viewer.role === 'owner') return clone(record);
      if (record.demonstration || viewer.mode !== 'authenticated' || verifyActor(viewer) !== true || !['moderator', 'reviewer', 'independent-reviewer', 'signer'].includes(viewer.role)) return null;
      if (!record.events.some(e => e.to === 'SUBMITTED' && e.consent?.review === true) || ['DRAFT', 'ARCHIVED'].includes(record.state)) return null;
      const c = clone(record); c.owner = null; c.events = c.events.map(e => e.actor.role === 'owner' ? { ...e, actor: { ...e.actor, id: 'author' } } : e); return c;
    }
  };
  return api;
}

// R10 Gate C: a review request the author can download and give to a human reviewer of their choice. CORE transmits
// nothing, endorses nothing and stays in the same state; the owner's local id is replaced by "author". `verification` is
// the result of verify(record); `related` is relatedInvestigation(...) or null (never "analysed by agents").
export function reviewPacket(record, entry, { verification, related = null, at = new Date().toISOString() } = {}) {
  if (!record || !entry || record.id !== entry.id) throw Error('Record and contribution do not match');
  const req = requirementsFor(record.mission);
  return {
    format: 'core.review-request.v1', preparedAt: at,
    notice: 'Prepared by the author in their own browser. CORE has not transmitted, reviewed, validated or endorsed this request; a human reviewer decides whether further investigation is justified.',
    reviewerQuestion: 'Is further investigation of this contribution justified? Answer yes, no, or name the specific evidence needed.',
    contribution: { id: entry.id, kind: entry.kind, title: entry.title, text: entry.text, mission: entry.mission, place: Array.isArray(entry.place) ? entry.place : null, createdAt: entry.at, structuredBy: entry.structuredBy || null, status: 'claim, not a verified observation', relatesTo: cleanLink(entry.relates)?.mission === record.mission ? cleanLink(entry.relates) : null },
    lifecycle: { state: record.state, demonstration: !!record.demonstration, events: record.events.map(e => ({ ...clone(e), actor: { ...e.actor, id: e.actor.role === 'owner' ? 'author' : e.actor.id } })), integrity: verification ? { ok: verification.ok === true, head: verification.head || null, reason: verification.reason || null } : { ok: false, reason: 'not verified' } },
    missingEvidence: missing(record).map(g => ({ kind: g.kind, id: g.id, label: g.label.en })),
    limitations: req.limitations.map(x => x.en),
    relatedRecordedInvestigation: related ? { ...related, analysedContribution: false } : null
  };
}
