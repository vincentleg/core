import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYERS, canEnable } from '../src/earth/evidence-layers.mjs';
import { CITIES } from '../src/execution/city-registry.mjs';

test('geographic layers declare provenance and block unsupported data', () => {
  assert.equal(new Set(LAYERS.map(l => l.id)).size, LAYERS.length);
  for (const l of LAYERS) for (const key of ['id', 'scope', 'source', 'authorization', 'scientificStatus', 'availability', 'render', 'limitation']) assert.ok(l[key], `${l.id}.${key}`);
  assert.equal(canEnable('city-readiness'), true);
  assert.equal(canEnable('sf-boundaries'), false);
  assert.equal(canEnable('sf-boundaries', { boundaryChecksum: true }), true);
  for (const id of ['environment', 'infrastructure', 'unknown']) assert.equal(canEnable(id, { boundaryChecksum: true }), false);
  assert.equal(CITIES['san-francisco'].readiness, 'operational');
  for (const city of Object.values(CITIES).filter(c => c.id !== 'san-francisco')) assert.notEqual(city.readiness, 'operational');
});
