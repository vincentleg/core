'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const S = require('../src/science'), ORG = require('../src/org'), CT = require('../src/civ-tools');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function bundle() { return { manifest: read('data/sf9/manifest.json'), raw: Object.fromEntries(['neighborhoods','hin','crashes-agg','permits'].map(k => [k, fs.readFileSync('data/sf9/' + k + '.json','utf8')])), registry: ORG.buildWorld(), mission: read('data/science/sf-traffic.json').sourceMission }; }
const copy = x => JSON.parse(JSON.stringify(x));
test('scientific recording reproduces with dated provenance, independent critique and no authorization', async () => {
  const b = bundle(), saved = read('data/science/sf-traffic.json'), d = await S.run(b);
  assert.deepEqual(d,saved.dossier); assert.equal((await S.verify(b,d)).state,'HUMAN_REVIEW');
  assert.equal(d.gate.authorizes,false);assert.equal(d.gate.implementation,'BLOCKED'); assert.equal(d.modelCalls,0);
  assert.equal(new Set(d.discussion.map(e=>e.agent)).size,4); assert.deepEqual(d.discussion.map(e=>e.kind),['proposal','counterproposal','dissent','evidence-review','revision']);
  assert.ok(d.discussion.at(-1).respondsTo==='D3' && d.dissent.includes('D3'));
  assert.equal(d.sensitivity.length,18); assert.equal(d.sources.length,4);
  for(const src of d.sources){assert.ok(src.retrievedAt&&src.provider&&src.modifications&&src.licence);assert.match(src.sha256,/^[a-f0-9]{64}$/);}
});
test('arithmetic agrees with an independent row oracle and displacement is conserved', async () => {
  const d = await S.run(bundle()), rows=d.result.rows;
  const baseline=+rows.reduce((n,r)=>n+r.rate*r.sumDays,0).toFixed(1), union=+rows.reduce((n,r)=>n+r.rate*r.unionDays,0).toFixed(1);
  assert.equal(d.result.baseline,baseline); assert.equal(d.result.options[1].exposure,+(baseline-.5*(baseline-union)).toFixed(1));
  assert.ok(Math.abs(d.result.options[2].exposure+d.result.options[2].displaced-baseline)<.11);assert.equal(d.result.options[2].eligible,false);
});
test('zero coordination feasibility removes the assumed advantage; full feasibility stays bounded', async () => {
  const b=bundle(), zero=await S.run(b,{coordination:0}), full=await S.run(b,{coordination:1});
  assert.equal(zero.result.options[1].exposure,zero.result.baseline);
  assert.match(zero.discussion.at(-1).claim,/conserver I0/);
  assert.ok(full.result.options[1].exposure<=zero.result.options[1].exposure);
  for(const row of full.sensitivity)assert.ok(row.coordinated>=0&&row.coordinated<=row.baseline);
});
test('missing evidence, hash corruption and unresolvable claims fail closed', async () => {
  const saved=read('data/science/sf-traffic.json').dossier;
  for(const change of [b=>delete b.raw.permits,b=>b.raw.hin+=' ',b=>b.manifest.datasets.find(d=>d.file==='hin.json').page='javascript:bad',b=>delete b.manifest.generated_at]){
    const b=bundle();change(b);const g=await S.verify(b,saved);assert.equal(g.state,'BLOCKED');assert.equal(g.authorizes,false);
  }
  const d=copy(saved);d.discussion[0].evidence[0].ref='hin:missing';assert.equal((await S.verify(bundle(),d)).state,'BLOCKED');
});
test('altered result, erased dissent, forged gate and truncated sensitivity fail closed', async () => {
  const saved=read('data/science/sf-traffic.json').dossier;
  for(const change of [d=>d.result.options[1].exposure=0,d=>d.dissent=[],d=>d.gate.authorizes=true,d=>d.sensitivity.pop(),d=>delete d.discussion[2]]){
    const d=copy(saved);change(d);assert.equal((await S.verify(bundle(),d)).state,'BLOCKED');
  }
});
test('invalid parameter domain and source mission forgery fail closed', async () => {
  for(const p of [{horizon:Infinity},{horizon:121},{coordination:-1},{coordination:'0.5'},{topN:1e9},{weight:'invented'}])assert.throws(()=>S.parameters(p));
  const b=bundle();b.mission.decisionAnalysis.options[0].exposure=0;
  assert.equal((await S.verify(b,read('data/science/sf-traffic.json').dossier)).state,'BLOCKED');
});
test('invalid counts, reversed work windows, licences and missing agents are rejected', async () => {
  for(const mode of ['count','window','licence','agent']){
    const b=bundle();
    if(mode==='licence')b.manifest.datasets.find(d=>d.file==='hin.json').license.name='unverified';
    else if(mode==='agent')b.registry.agents=b.registry.agents.filter(a=>a.id!==S.ROLES.critic);
    else {const k=mode==='count'?'crashes-agg':'permits', d=JSON.parse(b.raw[k]);if(mode==='count')d.rows[0].n=-1;else{d.features[0].properties.start='2027-01-01';d.features[0].properties.end='2026-01-01';}b.raw[k]=JSON.stringify(d);b.manifest.datasets.find(x=>x.file===k+'.json').sha256=await S.hash(b.raw[k]);}
    assert.equal((await S.verify(b,read('data/science/sf-traffic.json').dossier)).state,'BLOCKED',mode);
  }
});
test('source and generated claims resolve through the existing deterministic reviewer', async()=>{
  const b=bundle(),d=read('data/science/sf-traffic.json').dossier,data=Object.fromEntries(Object.entries(b.raw).map(([k,v])=>[k,JSON.parse(v)])),cx=CT.context({manifest:b.manifest,data});
  for(const e of d.discussion)assert.ok(e.evidence.every(r=>CT.resolve(cx,r)));
  assert.equal(CT.review(cx,d.discussion,null).rejected.length,0);
});
test('hand-calculated overlap fixture: emergency work is retained and deferral conserves load', async()=>{
  const b=bundle(),old=read('data/science/sf-traffic.json').dossier.result.rows[0],data=Object.fromEntries(Object.entries(b.raw).map(([k,v])=>[k,JSON.parse(v)]));
  const h=data.hin.features.find(f=>f.properties.cnn===old.cnn);h.properties.length_mi=1/1.609344;data.hin.features=[h];
  data['crashes-agg'].rows=[{cnn:old.cnn,n:100,severity:'Fatal'}];
  const template=data.permits.features[0];
  data.permits.features=[['fixture-regular','Construction','2026-10-14','2026-10-16'],['fixture-emergency','Emergency','2026-10-15','2026-10-17']].map(([id,type,start,end])=>({...copy(template),properties:{...template.properties,record_id:id,cnn:old.cnn,permit_type:type,start,end,status_class:'active'}}));
  for(const key of Object.keys(b.raw)){b.raw[key]=JSON.stringify(data[key]);b.manifest.datasets.find(d=>d.file===key+'.json').sha256=await S.hash(b.raw[key]);}
  const cx=CT.context({manifest:b.manifest,data}),expected=CT.TOOLS['decision.interventions'].run(cx,{nhood:'Tenderloin'});
  b.mission.decisionAnalysis.options=expected.analysis.options;b.mission.decisionAnalysis.sensitivity=expected.sensitivity;
  const d=await S.run(b);
  assert.equal(d.result.baseline,120);assert.equal(d.result.options[1].exposure,100);
  assert.equal(d.result.options[2].exposure,60);assert.equal(d.result.options[2].displaced,60);
  assert.equal(d.result.options[2].eligible,false);assert.equal(d.gate.implementation,'BLOCKED');
});
