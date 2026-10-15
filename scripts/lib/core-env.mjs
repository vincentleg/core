// Shared Node environment for CORE scripts (Phase 8): verified snapshot context, feeds, knowledge, registry.
// Refuses to build a context when a snapshot checksum does not match the manifest (fail closed).
import fs from 'node:fs';
import { loadSnapshot } from './snapshot.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const C = require('../../src/coord.js'), ORG = require('../../src/org.js'), M = require('../../src/missions.js'), KN = require('../../src/knowledge.js');
export function loadEnv() {
  const { manifest, data, verified } = loadSnapshot('data/sf');
  const feedState = JSON.parse(fs.readFileSync('data/feeds/state.json', 'utf8'));
  const env = { ctx: C.buildContext({ manifest, data, verified }), feeds: JSON.parse(fs.readFileSync('data/feeds/items.json', 'utf8')), feedState, feedHealth: feedState.health,
    knowledge: KN.load(JSON.parse(fs.readFileSync('data/knowledge/library.json', 'utf8'))), now: new Date().toISOString() };
  return { env, manifest, registry: ORG.buildRegistry() };
}
