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
