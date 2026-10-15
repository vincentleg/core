// Constitution V1.1 / FD11 (2026-10-15): only art. 1 and 8 changed; every other safeguard is unchanged and V1 is kept.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const art = (text, n) => text.split('\n').find(l => l.startsWith(`${n}. **`));

test('Constitution V1.1 changes only articles 1 and 8; articles 2–7 are identical to V1, which is preserved', () => {
  const v1 = read('docs/CONSTITUTION_V1.md'), v11 = read('docs/CONSTITUTION_V1_1.md');
  for (const n of [2, 3, 4, 5, 6, 7]) assert.equal(art(v11, n), art(v1, n), `art. ${n} unchanged`);
  assert.match(art(v1, 1), /World est une extension B2C optionnelle et distante/, 'V1 text kept for history');
  assert.match(art(v11, 1), /CORE World est l’interface humaine centrale/);
  assert.match(art(v11, 1), /CORE Intelligence est la fondation scientifique/);
  assert.match(art(v11, 1), /CORE TRUST .* obligatoire .* aucune ne s’ouvre au public sans ses garanties ni sans autorisation du fondateur/);
  assert.match(art(v11, 8), /validation scientifique \(calibration et validation indépendante\) conditionne toute affirmation scientifique, toute recommandation, tout impact mesuré et toute action réelle conséquente/);
  assert.match(art(v11, 8), /jamais être présenté comme une validation scientifique/);
  assert.match(art(v11, 5), /Action réelle ou impact externe significatif : autorisation humaine obligatoire/, 'human authority intact');
  assert.match(v11, /FD11/);
});

test('FD11 is recorded, amends FD02 and FD10 R1 only, and the original texts remain visible', () => {
  const fd = read('docs/FOUNDER_DECISIONS.md'), row = id => fd.split('\n').find(l => l.startsWith(`| ${id} |`));
  assert.ok(row('FD11') && /COMPLETE PREVIOUSLY AUTHORIZED REMEDIATIONS/.test(row('FD11')));
  assert.match(row('FD11'), /FD02 devient.*avant toute affirmation scientifique, recommandation, impact mesuré ou action réelle conséquente/);
  assert.match(row('FD11'), /FD10 R1 devient.*ouverture publique dépend de CORE TRUST et d’une autorisation du fondateur/);
  assert.match(row('FD02'), /Science réelle, calibration et validation indépendante avant nouvelles fonctions visuelles.*Amendée par FD11/);
  assert.match(row('FD10'), /R1 amendé par FD11.*R2–R5 inchangés/);
  for (const id of ['FD01', 'FD03', 'FD04', 'FD05', 'FD06', 'FD07', 'FD08', 'FD09']) assert.doesNotMatch(row(id), /FD11/, `${id} untouched`);
  assert.match(read('AGENTS.md'), /Constitution V1\.1 : `docs\/CONSTITUTION_V1_1\.md`/);
});
