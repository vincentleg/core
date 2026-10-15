import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { authorityGate } from './authority.mjs';
import { validateResearch, researchKnowledge } from './civilization-research.mjs';
const require = createRequire(import.meta.url), R = require('../../src/research.js'), M = require('../../src/civ-memory.js'), ORG = require('../../src/org.js'), KNOW = require('../../src/knowledge.js');
export function researchInputs() {
  const catalogRaw = fs.readFileSync(new URL('../../data/research/civilization.json', import.meta.url), 'utf8');
  if (validateResearch(JSON.parse(catalogRaw)).state !== 'VALIDATED_PROVENANCE') throw Error('Atlas review overdue or invalid');
  return { catalogRaw, countsRaw: fs.readFileSync(new URL('../../test/fixtures/pilot-synthetic.json', import.meta.url), 'utf8'), registry: ORG.buildRegistry() };
}
export function createResearchRunner({ memoryFile = ':memory:', inputs = researchInputs() } = {}) {
  if (memoryFile !== ':memory:') {
    if (!/^\.core-local\/research-[a-z0-9-]+\.sqlite$/.test(memoryFile)) throw Error('Private research database required');
    fs.mkdirSync('.core-local', { recursive: true, mode: 0o700 });
    if (fs.realpathSync('.core-local') !== path.join(fs.realpathSync('.'), '.core-local')) throw Error('Private root symlink refused');
    for (const suffix of ['', '-wal', '-shm']) { const e = fs.lstatSync(memoryFile + suffix, { throwIfNoEntry: false }); if (e && (!e.isFile() || e.nlink !== 1)) throw Error('Private storage link refused'); }
  }
  const memory = M.open(memoryFile);
  if (memoryFile !== ':memory:') for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(memoryFile + suffix)) fs.chmodSync(memoryFile + suffix, 0o600);
  return {
    memory, inputs,
    async execute(requested) {
      if (fs.existsSync('.core-local/STOP') || !authorityGate(requested?.action).allowed) throw Error('STOP or unauthorized research action');
      if (!memory.verify().ok) throw Error('Memory audit corruption');
      const bundle = await R.run(inputs, requested);
      const key = 'research:' + bundle.fingerprint, ex = memory.loadCheckpoint(key);
      if (ex) { if ((await R.verify(inputs, requested, ex.body)).state === 'BLOCKED') throw Error('Stored research corruption'); return { bundle: ex.body, reused: true, writes: 0 }; }
      const indexKey = 'research-history:' + bundle.question.id, history = memory.loadCheckpoint(indexKey)?.body || [];
      if (history.length >= 32) throw Error('Research version budget exhausted');
      const retrieved = bundle.question.domain === 'historical-energy' ? KNOW.retrieve(researchKnowledge(JSON.parse(inputs.catalogRaw)), 'energy power civilization', { limit: 3 }) : [];
      memory.transaction(() => {
        memory.checkpoint(key, 'RESEARCH_REVIEW_ONLY', bundle);
        memory.checkpoint(indexKey, 'VERSIONED', [...history, { fingerprint: bundle.fingerprint, previous: history.at(-1)?.fingerprint || null, evidence: bundle.sources.map(s => s.sha256) }]);
        for (const e of bundle.discussion) memory.addEpisode({ agent: e.agent, mission: key, workflow: 'research-v1', role: e.kind, evidence: e.evidence.length, claim: e.claim });
        memory.propose({ kind: 'finding', workflow: 'research-v1', statement: bundle.title + ' @' + bundle.fingerprint, evidence: bundle.sources, origin: bundle.discussion[0].agent, mission: key, basis: 'exploratory-research-not-field-efficacy' });
      });
      return { bundle, reused: false, writes: 7, retrieved };
    },
    close() { memory.close(); }
  };
}
