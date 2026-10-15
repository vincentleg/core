import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createSandboxLedger } from './contributions.mjs';
const require = createRequire(import.meta.url), { stable } = require('../../src/science.js'), { sha256 } = require('../../src/scheduler.js');
export const DEMO_TIME = '2026-10-14T20:00:00Z';
export function demoInputs() {
  const counts = JSON.parse(fs.readFileSync(new URL('../../test/fixtures/pilot-synthetic.json', import.meta.url), 'utf8'));
  const source = (id, kind, payload) => ({ id, kind, source: 'fixture:' + id, observedAt: '2026-10-01T15:00:00Z', retrievedAt: DEMO_TIME, payloadSha256: sha256(stable(payload)), license: 'DEMO_ONLY_NO_COMMERCIAL_GRANT', uncertainty: 'Invented fixture; no measured SF observation or efficacy.', payload });
  return {
    evidence: [source('demo-testimony', 'SYNTHETIC_TESTIMONY', { statement: 'Invented recurring queue; not an actual resident report.' }), source('demo-counts', 'SYNTHETIC_COUNTS', counts)],
    profile: { pseudonym: 'Observateur-Cyan', avatar: { shape: 'hexagon', color: '#44bbff', textAlternative: 'Hexagone cyan, identité fictive' }, interests: ['mobilité'], expertise: ['Intérêt autodéclaré, aucune qualification vérifiée'], progressionEnabled: false },
    content: {
      mode: 'synthetic-demo', observation: { statement: 'Dans cet exemple inventé, une file revient à certaines heures.', at: '2026-10-01T15:00:00Z', epistemic: 'synthetic-testimony', uncertainty: 'Ni fréquence ni délai réellement mesurés.' },
      interpretation: 'Une capacité insuffisante est une hypothèse fictive, pas un constat vérifié.', proposal: 'Comparer deux capacités abstraites dans un calcul borné ; aucun réglage de feu réel.',
      privateContext: 'PRIVATE_SYNTHETIC_CONTEXT', location: { city: 'san-francisco', neighborhood: 'South of Market', privatePoint: { lat: 37.77777, lon: -122.41111 } },
      consent: { publication: false, pseudonym: false, approximateLocation: false, avatar: false, interests: false, expertise: false, thirdPartyProtected: true },
      evidenceRefs: ['demo-testimony', 'demo-counts'], relations: { problems: ['demo-queue'], reuses: [], supersedes: [] }
    }
  };
}
export function reviewCycle(ledger, actors, id, { simulate = true } = {}) {
  ledger.transition(actors.participant, id, 'SUBMITTED'); ledger.transition(actors.moderator, id, 'SCREENED'); ledger.transition(actors.reviewer, id, 'UNDER_REVIEW');
  ledger.transition(actors.reviewer, id, 'EVIDENCE_ASSESSED', { note: 'Témoignage inventé ; pas de corroboration indépendante, ni effet réel mesuré.', objection: 'TESTIMONY_NOT_CORROBORATED' });
  if (simulate) ledger.transition(actors.simulator, id, 'SIMULATED');
}
export function runContributionDemo({ memoryFile = ':memory:' } = {}) {
  const input = demoInputs(), sandbox = createSandboxLedger({ evidence: input.evidence, memoryFile, clock: () => DEMO_TIME }), { ledger, actors } = sandbox, id = 'contribution-sf-synthetic';
  try {
    ledger.create(actors.participant, id, input.content, input.profile); reviewCycle(ledger, actors, id);
    const beforeConsent = ledger.publicView(id);
    const revised = structuredClone(input.content), profile = structuredClone(input.profile);
    revised.consent = { ...revised.consent, publication: true, pseudonym: true, approximateLocation: true, avatar: true };
    revised.proposal += ' Révision : conserver explicitement la faisabilité inconnue et les objections.'; profile.progressionEnabled = true;
    ledger.revise(actors.participant, id, revised, profile); reviewCycle(ledger, actors, id);
    ledger.transition(actors.publisher, id, 'APPROVED_FOR_PUBLICATION'); ledger.transition(actors.publisher, id, 'PUBLISHED');
    const contribution = ledger.publicView(id);
    return { version: 'core-contribution-demo-v1', runtime: 'local deterministic synthetic demo; no LLM, users, partner or field execution', beforeConsent, historyVerified: ledger.verify(id), contribution };
  } finally { ledger.close(); }
}
