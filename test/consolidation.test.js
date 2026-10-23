'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), cp = require('node:child_process');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-snapshot-')), dir = path.join(root,'data'); fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir,'counts.json'),'{"rows":[1,2]}');
  const m={generated_at:'2026-10-14T00:00:00Z',datasets:[{file:'counts.json',id:'counts',retrieved_at:'2026-10-14T00:00:00Z',sha256:sha('{"rows":[1,2]}')}]};
  const save=()=>fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(m));save();
  return {root,dir,m,save,close:()=>fs.rmSync(root,{recursive:true,force:true})};
};
test('historical integrity remains mandatory; freshness is explicit and current-data mode fails closed',async()=>{
  const {loadSnapshot}=await import('../scripts/lib/snapshot.mjs'),f=fixture();
  try{
    const opts={now:'2026-10-15T00:00:00Z',policies:{counts:{freshnessDays:7}}};
    assert.equal(loadSnapshot(f.dir,{...opts,mode:'current'}).freshness.currentEligible,true);
    const old={...opts,now:'2027-01-01T00:00:00Z'};
    assert.equal(loadSnapshot(f.dir,old).freshness.entries[0].status,'stale');
    assert.throws(()=>loadSnapshot(f.dir,{...old,mode:'current'}),/stale/);
    assert.throws(()=>loadSnapshot(f.dir,{...opts,policies:{},mode:'current'}),/unclassified/);
    fs.appendFileSync(path.join(f.dir,'counts.json'),' ');
    assert.throws(()=>loadSnapshot(f.dir,old),/checksum/);
  }finally{f.close();}
});
test('snapshot boundaries reject path traversal, duplicate entries, symlinks, missing hashes and future dates',async()=>{
  const {loadSnapshot}=await import('../scripts/lib/snapshot.mjs');
  for(const mode of ['path','duplicate','identity','key','hash','future','link']){
    const f=fixture();try{
      if(mode==='path')f.m.datasets[0].file='../counts.json';
      if(mode==='duplicate')f.m.datasets.push({...f.m.datasets[0]});
      if(mode==='identity')f.m.datasets.push({...f.m.datasets[0],file:'other.json'});
      if(mode==='key')f.m.datasets.push({...f.m.datasets[0],id:'other',file:'counts.geojson'});
      if(mode==='hash')delete f.m.datasets[0].sha256;
      if(mode==='future')f.m.datasets[0].retrieved_at='2099-01-01T00:00:00Z';
      if(mode==='link'){fs.writeFileSync(path.join(f.root,'outside.json'),'{"rows":[1,2]}');fs.unlinkSync(path.join(f.dir,'counts.json'));fs.symlinkSync(path.join(f.root,'outside.json'),path.join(f.dir,'counts.json'));}
      f.save();assert.throws(()=>loadSnapshot(f.dir,{now:'2026-10-15T00:00:00Z'}),undefined,mode);
    }finally{f.close();}
  }
});
test('shared snapshot validation preserves SF corridor, SF study area and NYC recordings',async()=>{
  const {loadSnapshot}=await import('../scripts/lib/snapshot.mjs');
  for(const dir of ['data/sf','data/sf9','data/nyc']){
    const r=loadSnapshot(dir,{now:'2026-10-15T00:00:00Z'});
    assert.ok(Object.keys(r.verified).length>=5);assert.ok(Object.values(r.verified).every(x=>x==='ok'));
    assert.equal(r.freshness.mode,'replay');
  }
});
test('corridor CSP independently matches both executable scripts and forbids network/eval',()=>{
  const s=fs.readFileSync('corridor.html','utf8'),csp=s.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const code=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.equal(code.length,2);
  for(const c of code)assert.ok(csp.includes("'sha256-"+crypto.createHash('sha256').update(c).digest('base64')+"'"));
  assert.match(csp,/connect-src 'none'/);assert.doesNotMatch(csp,/unsafe-eval/);
  assert.doesNotMatch(csp.split(';').find(s=>s.trim().startsWith('script-src')),/unsafe-inline/);
});
test('verification cache binds runtime content and Node, skips only markdown and reuses exact committed tree',async()=>{
  const V=await import('../scripts/lib/verification.mjs');
  assert.equal(V.needsTests(['docs/plan.md','README.md']),false);
  for(const f of ['src/a.js','data/a.json','.githooks/pre-push','.github/workflows/verify.yml','test/a.test.js'])assert.equal(V.needsTests([f]),true);
  const old=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'core-proof-'));
  const git=(...a)=>cp.execFileSync('git',a,{cwd:dir,stdio:'pipe'});
  try{
    git('init','-q');fs.writeFileSync(path.join(dir,'a.js'),'// initial\n');fs.writeFileSync(path.join(dir,'README.md'),'initial');git('add','.');process.chdir(dir);
    const key=V.fingerprint();fs.mkdirSync('.core-local/verification',{recursive:true});fs.writeFileSync('.core-local/verification/'+key+'.json',JSON.stringify({key,node:process.version,passed:true,at:new Date().toISOString()}));
    assert.equal(V.reusable(),true);
    fs.writeFileSync('.core-local/verification/'+key+'.json',JSON.stringify({key,node:process.version,passed:true,at:'2020-01-01T00:00:00Z'}));assert.equal(V.reusable(),false);
    fs.writeFileSync('.core-local/verification/'+key+'.json',JSON.stringify({key,node:process.version,passed:true,at:new Date().toISOString()}));
    fs.writeFileSync('README.md','changed docs');git('add','README.md');assert.equal(V.fingerprint(),key);assert.equal(V.reusable(),true);
    git('-c','user.name=Fixture','-c','user.email=fixture@'+'example.invalid','commit','-qm','fixture');assert.equal(V.fingerprint('HEAD'),key);assert.equal(V.reusable('HEAD'),true);
    fs.writeFileSync('a.js','// unverified runtime\n');assert.equal(V.reusable('HEAD'),false);git('add','a.js');assert.notEqual(V.fingerprint(),key);assert.equal(V.reusable(),false);
  }finally{process.chdir(old);fs.rmSync(dir,{recursive:true,force:true});}
});
test('general CI is read-only, pinned, runs on PR/push, and local pre-push retains history/security checks',()=>{
  const ci=fs.readFileSync('.github/workflows/verify.yml','utf8');assert.match(ci,/contents: read/);assert.match(ci,/persist-credentials: false/);assert.match(ci,/pull_request:/);assert.match(ci,/push:/);assert.match(ci,/checkout@[a-f0-9]{40}/);
  assert.doesNotMatch(ci,/pull_request_target|secrets\./);assert.match(ci,/scripts\/verify.mjs --ci/);
  const hook=fs.readFileSync('.githooks/pre-push','utf8');assert.match(hook,/scripts\/push-check.mjs/);assert.doesNotMatch(hook,/\/dev\/null/);
});
test('INC-2026-10-15-01: tracked instructions never serve the repository on all interfaces', () => {
  const out = cp.execFileSync('git', ['grep', '-n', '-E', 'python3? -m http\\.server', '--', '*.md', '*.mjs', '*.yml', '*.json', ':!docs/compliance'], { encoding: 'utf8' });
  const unbound = out.split('\n').filter(l => /-m http\.server \d+/.test(l) && !/--bind 127\.0\.0\.1/.test(l) && !/PHASE_6_MEASUREMENTS/.test(l));
  assert.deepEqual(unbound, [], 'serve with --bind 127.0.0.1 only');
});

test('every HTML escaper escapes the five HTML-significant characters (S5 innerHTML review)', () => {
  const ROOT = path.join(__dirname, '..');
  const files = [...fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).map(f => 'src/' + f), 'control.html'];
  let seen = 0;
  for (const f of files) for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/\besc = s => (String\(.+?\}\[c\]\)\))/g)) {
    seen++;
    const esc = Function('return s => ' + m[1])();
    assert.equal(esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;', f);
    assert.equal(esc(undefined), '', f);
  }
  assert.ok(seen >= 15, `escapers found: ${seen}`);
});


test('a stopped activity playback cannot undo a mission replay that started after it (dim / return-to-post race)', async () => {
  const vm = require('node:vm');
  // Inert DOM and map: any property is a callable that returns another inert object.
  const inert = () => new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : k in t ? t[k] : (t[k] = inert()), set: (t, k, v) => { t[k] = v; return true; }, apply: () => inert() });
  const timers = [], dims = [], posts = [];
  const msg = { type: 'note', from: 'a', to: 'a', purpose: 'p', at: '2026-10-15T00:00:00Z' };
  const mission = { id: 'm1', title: 't', nhood: 'n', messages: [msg], subtasks: [] };
  const agents = new Map([['a', { agent: { id: 'a', code: 'A' }, pos: [0, 0], mode: 'coordinate' }], ['r', { agent: { id: 'r', code: 'R' }, pos: [0, 0], mode: 'replay' }]]);
  const ctx = { document: inert(), matchMedia: () => ({ matches: false }), performance: { now: () => 0 }, requestAnimationFrame: () => 0, CustomEvent: function () {},
    setTimeout: f => timers.push(f), fetch: async u => ({ ok: true, json: async () => (u.includes('index') ? { missions: [{ id: 'm1', file: 'm1.json' }] } : mission) }),
    CORE_MOTION: { state: { ready: true, map: inert(), agents, dirty: false }, ensure: async () => {}, dim: ids => dims.push(ids), toPost: id => posts.push(id), go() {} } };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/civ-activity.js'), 'utf8'), ctx);
  const A = ctx.CORE_ACTIVITY, tick = () => new Promise(r => setImmediate(r));
  const done = A.playOnly('m1');
  for (let i = 0; i < 5; i++) await tick();
  timers.shift()(); await tick();                 // the single recorded message has played; the 1.5 s pause is pending
  assert.equal(timers.length, 1);
  A.stop(); ctx.CORE_MOTION.dim(['r']); posts.length = 0; // a mission replay takes over the world
  while (timers.length) { timers.shift()(); await tick(); }
  await done;
  assert.deepEqual(dims.at(-1), ['r'], 'the replay keeps its dimming');
  assert.deepEqual(posts, [], 'no replay participant is sent back to its post by the stopped playback');
});

test('pre-approval states are never styled as a passed check (Prêt pour signature ≠ approuvé)', () => {
  const ROOT = path.join(__dirname, '..');
  const PENDING = /'(ÉLIGIBLE À LA REVUE HUMAINE|PRÊT POUR REVUE HUMAINE|PRÊT POUR SIGNATURE)'\s*(:|\?)\s*'ok'/;
  // src/coord.js is excluded: its 'ok' is an event-log status inside recorded, fingerprinted missions, not a style.
  for (const f of ['app.js', 'city-view.js', 'cognitive-view.js', 'coord-view.js', 'platform.js', 'cities-view.js', 'civ.js', 'civ-activity.js'])
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), PENDING, f);
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /\.state\.info \{/);
  assert.match(fs.readFileSync(path.join(ROOT, 'src/template.html'), 'utf8'), /\.pill\.info \{/);
});

test('local backup plan: SQLite via .backup, no WAL/SHM, no nested backups, never inside the repository (F7)', async () => {
  const { plan } = await import('../scripts/backup-local.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-backup-')), L = path.join(root, '.core-local');
  fs.mkdirSync(path.join(L, 'backups'), { recursive: true }); fs.mkdirSync(path.join(L, 'watch'));
  for (const f of ['memory.sqlite', 'memory.sqlite-wal', 'memory.sqlite-shm', 'live.json', 'backups/old.sqlite', 'watch/a.json']) fs.writeFileSync(path.join(L, f), 'x');
  const items = plan(root, path.join(os.tmpdir(), 'core-backup-dest'));
  assert.deepEqual(items.map(i => `${i.kind}:${path.relative(L, i.from)}`).sort(), ['file:live.json', 'file:watch/a.json', 'sqlite:memory.sqlite']);
  assert.throws(() => plan(root, path.join(root, 'inside')), /outside the repository/);
});
