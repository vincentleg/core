const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const catalog=read('data/urban/catalog.json');
test('demonstration idea stays a private, explicitly marked browser draft',async()=>{
 const store=await import('../src/contrib/store.mjs'),data=new Map(),local={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const idea=store.save({mission:'mission.sf.mobility',kind:'hypothesis',title:'Example',text:'Try a different signal plan',state:'private',demonstration:true},local);
 assert.equal(store.list(local)[0].demonstration,true);assert.equal(idea.state,'private');assert.equal(idea.sharedAs,null);
 assert.equal(store.markShared(idea.id,'mission.sf.mobility',local),null);assert.equal(store.list(local)[0].state,'private');
 assert.equal(store.save({title:'Ordinary private idea',text:'Example'},local).demonstration,false);
});
test('fluid queue conserves vehicles, reacts to interventions and rejects invalid inputs',async()=>{
 const M=await import('../src/urban/model.mjs'),s=catalog.segments[0],p=M.DEFAULT;
 for(const demand of [0,900,4000]){const r=M.solve({...p,demand},s);assert.ok(Math.abs(r.arrivals-r.served-r.remaining)<1e-7);assert.ok(r.meanQueue>=0);}
 const inputs={scenarios:[{name:'Baseline',parameters:p},{name:'Worse',parameters:{...p,green:.1}},{name:'Better',parameters:{...p,green:.7}}]};
 const a=M.compare(inputs,s);assert.deepEqual(a,M.compare(inputs,s));assert.ok(a.rows[1].metrics.accruedDelayPerArrivalS>a.rows[0].metrics.accruedDelayPerArrivalS);assert.ok(a.rows[2].metrics.accruedDelayPerArrivalS<a.rows[0].metrics.accruedDelayPerArrivalS);
 assert.throws(()=>M.solve({...p,lanes:0},s));assert.throws(()=>M.solve({...p,demand:NaN},s));assert.throws(()=>M.solve({...p,speed:'30'},s));assert.throws(()=>M.compare({scenarios:[]},s));assert.throws(()=>M.solve(p,{...s,lengthM:0}));
 const capped=M.compare({scenarios:[{name:'a',parameters:{...p,demand:8000}},{name:'b',parameters:{...p,demand:8000}}]},s);assert.deepEqual(capped.rows[0].sensitivityDemandVph,[6400,8000]);
 assert.equal(M.compare({scenarios:[{name:'a',parameters:p},{name:'b',parameters:p}]},s).best,null);
 assert.equal(M.compare({scenarios:[{name:'a',parameters:p},{name:'b',parameters:{...p,demand:0}}]},s).best,null,'lower demand is not automatically a winning intervention');
});
test('real task events, execution timestamps and reports are verified by recomputation',async()=>{
 const {execute,verifyReport}=await import('../src/urban/tasks.mjs');const {DEFAULT}=await import('../src/urban/model.mjs');const events=[];
 const request={segment:catalog.segments[0].id,scenarios:[{name:'Reference',parameters:DEFAULT},{name:'Alternative',parameters:{...DEFAULT,green:.65}}]};
 const r=await execute(catalog,request,e=>events.push(structuredClone(e)));
 assert.equal(r.tasks.length,10);assert.equal(events.filter(e=>e.task?.status==='working').length,10);assert.equal(events.filter(e=>e.task?.status==='completed').length,10);assert.ok(r.tasks.every(t=>Date.parse(t.completed)>=Date.parse(t.started)));
 assert.equal((await verifyReport(r,catalog)).id,r.id);
 const bad=structuredClone(r);bad.result.rows[0].metrics.maxQueue++;await assert.rejects(verifyReport(bad,catalog),/verification/);
 const missing=structuredClone(r);missing.tasks[0].status='working';await assert.rejects(verifyReport(missing,catalog),/Incomplete/);
 await assert.rejects(execute(catalog,{...request,segment:'unsupported'}),/unavailable/);
 const narrative=structuredClone(r);narrative.tasks[9].output.impact='invented impact';await assert.rejects(verifyReport(narrative,catalog),/narrative/);
 const broken=structuredClone(catalog);delete broken.sources[0].units;await assert.rejects(execute(broken,request),/provenance/);
 const replay=await execute(catalog,request);assert.equal(replay.fingerprint,r.fingerprint);assert.deepEqual(replay.result,r.result);
});
test('500 identities retain existing IDs and all visual movement stays on known graph edges',async()=>{
 const {createWalkers}=await import('../src/urban/movement.mjs');const P=require('../src/agent-population.js');const net=P.network(read('data/osm/walk-network.json'));
 const ids=new Set(read('data/agents/sf-civilization.json').agents.map(a=>a.id));assert.equal(new Set(catalog.agents.map(a=>a.id)).size,500);assert.ok(catalog.agents.every(a=>ids.has(a.id)&&a.lastExecution===null&&a.status==='idle'));
 const w=createWalkers(net,catalog.agents);for(let i=0;i<40;i++)for(const p of w.step(.2)){assert.ok(p.node===p.next||net.adj[p.node].some(e=>e[0]===p.next));const a=net.nodes[p.node],b=net.nodes[p.next];const error=P.dist(a,p.coordinates)+P.dist(p.coordinates,b)-P.dist(a,b);assert.ok(Math.abs(error)<.01);}
 const still=w.step(0,true);assert.deepEqual(still,w.step(.2,true));assert.throws(()=>w.step(10));
});
test('public manifest includes worker and sanitized artifacts, never the local SQLite backend',async()=>{
 const {FILES}=await import('../scripts/public-manifest.mjs');for(const f of ['src/urban/worker.mjs','data/urban/catalog.json','data/urban/latest.json'])assert.ok(FILES.includes(f),f);
 assert.ok(FILES.every(f=>!f.includes('.sqlite')&&!f.startsWith('.core-local/')));
 assert.equal(catalog.issues.length,41);assert.ok(catalog.sources.every(s=>s.publisher&&s.url&&s.license&&s.retrieved&&s.units));
});
