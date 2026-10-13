const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('committed corridor matches source assembly exactly', () => {
  const expected = fs.readFileSync('src/template.html', 'utf8')
    .replace('/*ENGINE*/', () => fs.readFileSync('src/engine.js', 'utf8'))
    .replace('/*APP*/', () => fs.readFileSync('src/app.js', 'utf8'));
  assert.equal(fs.readFileSync('corridor.html', 'utf8'), expected);
});

test('inline scripts in both pages parse as JavaScript', () => {
  for (const file of ['index.html', 'corridor.html']) {
    const html = fs.readFileSync(file, 'utf8');
    for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      new vm.Script(script[1], { filename: file });
    }
  }
});
