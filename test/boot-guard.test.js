const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');

test('World boot guard waits for Earth and Intelligence, retries a failed module once and then fails visibly', () => {
  let now = 0, reloads = 0; const timers = [], events = {}, storage = new Map(), boxes = [];
  const context = { URL, Date: { now: () => now }, console: { warn() {} }, navigator: { language: 'es' },
    location: { href: 'http://localhost/world.html', origin: 'http://localhost', pathname: '/world.html', reload() { reloads++; } },
    localStorage: { getItem: () => 'es' }, sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    document: { querySelector: () => ({ content: 'CORE_EARTH' }), body: { append: b => boxes.push(b) }, createElement: () => ({ style: {}, setAttribute() {}, append() {}, remove() {} }) },
    addEventListener: (name, fn) => { events[name] = fn; }, setTimeout: fn => timers.push(fn), CORE_EARTH: { state: { ready: true } } };
  context.window = context; vm.runInNewContext(fs.readFileSync('src/ui/boot-guard.mjs', 'utf8'), context);
  events.error({ target: { tagName: 'SCRIPT', src: 'http://localhost/src/intelligence/core/ui.mjs' } });
  now = 4000; timers.shift()(); assert.equal(reloads, 1, 'an Earth global alone must not suppress recovery');
  // Simulate the reloaded page with its one-retry marker, and the same persistent module failure.
  timers.length = 0; events.error = null; boxes.length = 0; now = 5000;
  vm.runInNewContext(fs.readFileSync('src/ui/boot-guard.mjs', 'utf8'), context);
  events.error({ target: { tagName: 'SCRIPT', src: 'http://localhost/src/intelligence/core/ui.mjs' } });
  now = 9000; timers.shift()(); assert.equal(reloads, 1); assert.ok(boxes.some(b => /no pudo iniciarse/.test(b.textContent)));
  // A complete World starts without another retry or a false loading message.
  timers.length = 0; boxes.length = 0; context.CORE_INTELLIGENCE = { engine: {} };
  vm.runInNewContext(fs.readFileSync('src/ui/boot-guard.mjs', 'utf8'), context); timers.shift()(); assert.equal(boxes.length, 0); assert.equal(timers.length, 0);
});

function world(extra = {}) {
  let now = 0, reloads = 0; const timers = [], events = {}, boxes = [];
  const box = () => { const b = { style: {}, attrs: {}, children: [], setAttribute(k, v) { b.attrs[k] = v; }, append(...c) { b.children.push(...c); }, remove() {} }; return b; };
  const context = { URL, Date: { now: () => now }, console: { warn() {} }, navigator: { language: 'es' },
    location: { href: 'http://localhost/world.html', origin: 'http://localhost', pathname: '/world.html', reload() { reloads++; } },
    localStorage: { getItem: () => 'es' }, sessionStorage: { getItem() {}, setItem() {}, removeItem() {} },
    document: { querySelector: () => ({ content: 'CORE_EARTH' }), body: { append: b => boxes.push(b) }, createElement: box },
    addEventListener: (name, fn) => { events[name] = fn; }, setTimeout: fn => timers.push(fn), ...extra };
  context.window = context; vm.runInNewContext(fs.readFileSync('src/ui/boot-guard.mjs', 'utf8'), context);
  return { context, events, timers, boxes, step(t) { now = t; timers.shift()(); }, get reloads() { return reloads; } };
}

test('boot guard ignores the benign ResizeObserver warning instead of declaring a failed start', () => {
  const w = world({ CORE_EARTH: { state: { ready: false } } });
  w.events.error({ target: null, message: 'ResizeObserver loop completed with undelivered notifications.', filename: 'http://localhost/world.html', lineno: 0 });
  w.step(5000);
  assert.equal(w.boxes.filter(b => b.attrs.role === 'alert').length, 0); assert.equal(w.reloads, 0);
});

test('boot guard names a degraded World start (command bar data failed) without blocking or reloading', () => {
  const w = world({ CORE_EARTH: { state: { ready: true } }, CORE_INTELLIGENCE: { engine: null, failed: 'data/intelligence/work.json : HTTP 404' } });
  w.step(1500);
  assert.equal(w.reloads, 0); assert.equal(w.timers.length, 0, 'done: no further polling');
  const b = w.boxes.at(-1); assert.equal(b.attrs.role, 'status');
  assert.match(b.textContent, /Iniciada con un problema: data\/intelligence\/work\.json : HTTP 404/);
  assert.ok(b.children.some(c => c.type === 'button'), 'offers a reload button');
});
