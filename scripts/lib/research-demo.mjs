import { createSandboxLedger } from './contributions.mjs';
import { demoInputs, reviewCycle, DEMO_TIME } from './contribution-demo.mjs';
import { createResearchRunner } from './research-runner.mjs';
export async function researchDemo({ memoryFile = ':memory:' } = {}) {
  const input = demoInputs(), { ledger, actors } = createSandboxLedger({ evidence: input.evidence, clock: () => DEMO_TIME }), runner = createResearchRunner({ memoryFile }), id = 'contribution-phase13-queue';
  try {
    ledger.create(actors.participant, id, input.content, input.profile);
    reviewCycle(ledger, actors, id); const beforeConsent = ledger.publicView(id);
    const content = structuredClone(input.content); content.consent = { ...content.consent, publication: true, pseudonym: true, approximateLocation: true };
    ledger.revise(actors.participant, id, content, input.profile); reviewCycle(ledger, actors, id);
    // Content never supplies actions, tools, role identities or arbitrary simulation instructions.
    const question = { version: 1, id: 'ws12-queue', domain: 'synthetic-traffic', action: 'research', parameters: { factor: 1 }, contribution: { id, revision: 2 } };
    const traffic = await runner.execute(question);
    await ledger.attachResearch(actors.simulator, id, { inputs: runner.inputs, question, bundle: traffic.bundle });
    ledger.transition(actors.publisher, id, 'APPROVED_FOR_PUBLICATION'); ledger.transition(actors.publisher, id, 'PUBLISHED');
    const energy = await runner.execute({ version: 1, id: 'civilization-energy', domain: 'historical-energy', action: 'research', parameters: { factor: 1 } });
    return { version: 'core-research-demo-v1', mode: 'recorded-offline-research; no live LLM or public accounts', beforeConsent, historyVerified: ledger.verify(id), contribution: ledger.publicView(id), traffic: traffic.bundle, energy: energy.bundle };
  } finally { ledger.close(); runner.close(); }
}
