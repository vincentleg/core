import test from 'node:test';
import assert from 'node:assert/strict';
import { nearbyMissions } from '../src/earth/discovery.mjs';

test('geographic discovery includes only missions whose markers are near the map centre', () => {
  const missions = [
    { id: 'near', center: [-122.4038, 37.7793] },
    { id: 'far', center: [-122.4194, 37.7749] },
    { id: 'unlocated' }
  ];
  assert.deepEqual(nearbyMissions(missions, [-122.4038, 37.7793], 1).map(m => m.id), ['near']);
  assert.deepEqual(nearbyMissions(missions, [-122.4194, 37.7749], 1).map(m => m.id), ['far']);
  assert.deepEqual(nearbyMissions(missions, [0, 0]).map(m => m.id), []);
});
