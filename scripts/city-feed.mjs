// CORE City Intelligence collector (Phase 3). Dependency-free; official public sources only; rate-limited.
//   node scripts/city-feed.mjs            one pass over sources whose minimum interval has elapsed
//   node scripts/city-feed.mjs --force    ignore per-source intervals (still 1 request per source)
//   node scripts/city-feed.mjs --watch 30 repeat every 30 minutes WHILE THIS PROCESS RUNS (no background scheduler is installed)
// Writes data/feeds/items.json (deduplicated items with first/last seen and revisions) and data/feeds/state.json
// (source health, last success, next scheduled run, new/changed/failed counts). Failures keep previous items.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../src/feeds.js');
const C = require('../src/coord.js');

const OUT = 'data/feeds', UA = 'CORE-city-intel/1.0 (+https://github.com/vincentleg/core)';
const args = process.argv.slice(2), force = args.includes('--force'), wi = args.indexOf('--watch'), watchMin = wi >= 0 ? Math.max(5, +args[wi + 1] || 30) : null;
fs.mkdirSync(OUT, { recursive: true });
const read = (f, d) => fs.existsSync(path.join(OUT, f)) ? JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')) : d;
const corridorCnns = JSON.parse(fs.readFileSync('data/sf/corridor.geojson', 'utf8')).features.map(f => f.properties.cnn);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pass() {
  const store = { items: read('items.json', { items: [] }).items, sources: read('state.json', { sources: {} }).sources };
  const now = new Date(), nowIso = now.toISOString(), run = { started: nowIso, added: 0, changed: 0, failed: [], skipped: [] };
  const due = force ? F.SOURCES : F.dueSources(store, now.getTime());
  for (const s of F.SOURCES) if (!due.includes(s)) run.skipped.push(s.id);
  for (const s of due) {
    const st = store.sources[s.id] = store.sources[s.id] || {};
    st.lastAttempt = nowIso;
    try {
      const req = F.request(s.id, { now, corridorCnns });
      const res = await fetch(req.url, { headers: { 'User-Agent': UA, Accept: req.type === 'rss' ? 'application/rss+xml, application/xml' : req.type === 'geojson' ? 'application/geo+json, application/json' : 'application/json' } });
      const body = await res.text();
      if (!res.ok) throw Error(`HTTP ${res.status}`);
      const items = F.itemsFrom(s.id, body);
      const m = F.merge(store, items, nowIso);
      Object.assign(st, { lastSuccess: nowIso, lastError: null, lastCount: items.length, lastAdded: m.added, lastChanged: m.changed, request: req.url });
      run.added += m.added; run.changed += m.changed;
      console.log(`${s.id}: ${items.length} items (+${m.added} new, ${m.changed} changed)`);
    } catch (err) { st.lastError = String(err.message || err); run.failed.push(s.id); console.error(`${s.id}: FAILED ${st.lastError} — previous items kept`); }
    await sleep(1000); // politeness between sources
  }
  // Mission suggestions are deduplicated by key across runs.
  const ctx = (() => { const manifest = JSON.parse(fs.readFileSync('data/sf/manifest.json', 'utf8')), data = {}; for (const d of manifest.datasets) data[d.file.replace('.geojson', '')] = JSON.parse(fs.readFileSync(`data/sf/${d.file}`, 'utf8')); return C.buildContext({ manifest, data, verified: null }); })();
  const prevSug = read('state.json', { suggestions: [] }).suggestions || [];
  const keys = new Set(prevSug.map(x => x.key)), suggestions = [...prevSug];
  for (const it of store.items) { const sg = F.suggest(it, ctx); if (sg && !keys.has(sg.key)) { keys.add(sg.key); suggestions.push({ ...sg, created: nowIso }); } }
  const health = F.health(store, nowIso);
  const next = watchMin ? new Date(now.getTime() + watchMin * 60000).toISOString() : null;
  const state = { version: 'core-city-feed-state-v1', lastRun: run, lastSuccessfulUpdate: Object.values(store.sources).map(x => x.lastSuccess).filter(Boolean).sort().pop() || null,
    nextScheduledUpdate: next, scheduler: watchMin ? `processus local de surveillance toutes les ${watchMin} min (s’arrête avec le processus)` : 'exécution manuelle (aucun planificateur de fond installé)',
    sources: store.sources, health, coverageGaps: ['Pas d’actualités presse sous licence intégrées', 'Planning Department : pas de flux RSS public trouvé (404)', 'sf.gov : pas de flux RSS public trouvé (404)', 'Legistar et RSS non accessibles depuis le navigateur (pas de CORS) : collecte Node uniquement'],
    suggestions };
  fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify({ version: 'core-city-feed-items-v1', items: store.items }, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'state.json'), JSON.stringify(state, null, 1) + '\n');
  console.log(`items ${store.items.length} · new ${run.added} · changed ${run.changed} · failed ${run.failed.length} · suggestions ${suggestions.length}${next ? ` · next ${next}` : ''}`);
  return run;
}

await pass();
if (watchMin) for (;;) { await sleep(watchMin * 60000); await pass(); }
