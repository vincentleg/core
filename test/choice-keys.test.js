const test = require('node:test'), assert = require('node:assert/strict');
for (const role of ['tab', 'radio']) test(`Dialogue ${role} arrow keys wrap, activate, and leave ordinary keys alone`, async () => {
  const { bindChoiceKeys } = await import('../src/ui/choice-keys.mjs');
  let handler, focused = -1, clicked = -1, prevented = false;
  const buttons = Array.from({ length: 3 }, (_, i) => ({ getAttribute: () => role, focus: () => { focused = i; }, click: () => { clicked = i; } }));
  bindChoiceKeys({ addEventListener: (name, fn) => { assert.equal(name, 'keydown'); handler = fn; }, querySelectorAll: () => buttons });
  const press = (key, i, expected) => {
    focused = clicked = -1; prevented = false;
    handler({ key, target: buttons[i], preventDefault: () => { prevented = true; } });
    assert.equal(focused, expected, key); assert.equal(clicked, expected, key); assert.equal(prevented, expected !== -1, key);
  };
  press('ArrowRight', 2, 0); press('ArrowLeft', 0, 2); press('Home', 2, 0); press('End', 0, 2);
  press('ArrowDown', 0, role === 'radio' ? 1 : -1); press('ArrowUp', 0, role === 'radio' ? 2 : -1);
  for (const key of ['Tab', 'Enter', ' ', 'Escape', 'a']) press(key, 1, -1);
  handler({ key: 'ArrowRight', target: {}, preventDefault: () => assert.fail('unrelated child') });
});
