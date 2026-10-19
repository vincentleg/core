const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');

test('public build includes both product pages and their shared assets', async () => {
  const { FILES } = await import('../scripts/public-manifest.mjs');
  for (const p of ['solutions.html', 'plans.html', 'src/product/product.mjs', 'src/product/product.css']) assert.ok(FILES.includes(p), p);
  for (const p of ['solutions.html', 'plans.html']) {
    const html = read(p);
    assert.match(html, /script-src 'self';/);
    assert.doesNotMatch(html, /<form\b|onclick=|<script(?![^>]*src=)/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
  }
});

test('pricing distinguishes hypotheses, availability and civic equality', () => {
  const html = read('plans.html');
  assert.equal((html.match(/<article class="plan[" ]/g) || []).length, 6);
  for (const text of ['Pricing hypotheses in USD', 'No paid plan is available to buy or activate', 'equal public participation rights', '$12/month', '$299/month', '$2,500/month', '$10,000/month', 'Custom pricing', 'status-available', 'status-limited', 'status-planned']) assert.ok(html.includes(text), text);
  assert.match(read('solutions.html'), /world.html#mission=mission.sf.mobility/);
});

test('six editorial plans separate current tools from future products and retain their prices', () => {
  const html = read('plans.html');
  for (const slug of ['free', 'plus', 'business', 'city', 'region', 'government']) {
    const start = html.indexOf(`id="${slug}-details"`), end = html.indexOf('</section>', start);
    assert.ok(start > html.indexOf('</table>'), `${slug} follows comparison`);
    const section = html.slice(start, end);
    for (const horizon of ['AVAILABLE NOW', 'NEXT · PLANNED', 'LONG-TERM VISION']) assert.ok(section.includes(horizon));
    assert.ok((section.match(/<p>/g) || []).length >= 3, `${slug} explains its use`);
  }
  assert.ok(html.includes('These prices represent proposed future offerings. Availability, capabilities, limits and commercial terms are subject to validation.'));
  assert.match(html, /No unlimited agent conversations or compute is promised/);
});
