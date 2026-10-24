import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldSession, worldCommand, executeWorldCommand, rememberWorldCommand } from '../src/voice/world-commands.mjs';
import { speechOutput } from '../src/ui/speech-output.mjs';

test('English and French commands navigate real cities with truthful availability', async () => {
  const calls = [], world = { selectCity: async id => calls.push(id), goScale: async scale => calls.push(scale), showCity: async () => calls.push('city'), openMission: async id => calls.push(id) };
  const session = createWorldSession();
  let cmd = worldCommand('CORE, take me to Paris.', { session });
  assert.match(cmd.text, /No authorized local dataset/); await executeWorldCommand(cmd, world); rememberWorldCommand(session, 'CORE, take me to Paris.', cmd);
  assert.deepEqual(calls, ['paris']);
  assert.match(worldCommand('What missions are available here?', { session }).text, /No authorized local dataset/);
  cmd = worldCommand('Emmène-moi à San Francisco', { session, code: 'fr' });
  assert.match(cmd.text, /Deux missions/); await executeWorldCommand(cmd, world); rememberWorldCommand(session, 'Emmène-moi à San Francisco', cmd);
  assert.match(worldCommand('Quelles missions sont disponibles ici ?', { session, code: 'fr' }).text, /revue humaine/);
  assert.match(worldCommand('Compare the missions', { session }).text, /does not establish causality/);
  await executeWorldCommand(worldCommand('Show me Earth', { session }), world);
  assert.deepEqual(calls, ['paris', 'san-francisco', 'planet']);
  assert.equal(session.history.length, 2);
});

test('grounding, follow-ups, unavailable evidence and governance boundaries', () => {
  const s = createWorldSession();
  const sf = worldCommand('What can you analyze in San Francisco?', { session: s });
  assert.match(sf.text, /two runnable missions/); rememberWorldCommand(s, 'capabilities', sf);
  assert.match(worldCommand('Explain the mobility mission', { session: s }).text, /uncalibrated/);
  const evidence = worldCommand('Show the evidence', { session: s });
  assert.ok(evidence.sources.length > 0);
  assert.equal(evidence.action.type, 'city-intelligence');
  assert.match(worldCommand('Show the evidence in Nairobi', { session: s }).text, /No authorized scientific evidence/);
  assert.match(worldCommand('Approve the findings', { session: s }).text, /human governance/);
  assert.equal(worldCommand('Take me to Folsom Street in San Francisco', { session: s }), null);
  assert.equal(worldCommand('What is the live air quality in Tokyo?', { session: s }), null);
  assert.equal(worldCommand('Open My CORE', { session: s }).action.type, 'my-core');
  s.reset(); assert.deepEqual(s.history, []); assert.equal(s.cityId, null);
});

test('speech playback needs explicit call, reports support and stops immediately', () => {
  const original = [globalThis.speechSynthesis, globalThis.SpeechSynthesisUtterance];
  try {
    delete globalThis.speechSynthesis; delete globalThis.SpeechSynthesisUtterance;
    const absent = speechOutput(); assert.equal(absent.supported, false); assert.equal(absent.speak('Hello'), false);
    const calls = [], states = [];
    globalThis.speechSynthesis = { speak: u => { calls.push(['speak', u.text]); u.onstart(); }, cancel: () => calls.push(['cancel']) };
    globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    const voice = speechOutput({ onState: state => states.push(state) });
    assert.deepEqual(calls, []); assert.equal(voice.speak('Bonjour', 'fr'), true); assert.equal(states.at(-1), 'speaking');
    voice.stop(); assert.equal(states.at(-1), 'idle'); assert.deepEqual(calls, [['cancel'], ['speak', 'Bonjour'], ['cancel']]);
  } finally { [globalThis.speechSynthesis, globalThis.SpeechSynthesisUtterance] = original; }
});
