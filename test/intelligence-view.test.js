const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('read-only intelligence views expose actual collaboration, uncertainty and reproducible numerical evidence',async()=>{
 const work=JSON.parse(fs.readFileSync('data/intelligence/work.json')),original=global.fetch;
 let requests=0;
 global.fetch=async url=>{assert.equal(url,'data/intelligence/work.json');requests++;return {ok:true,json:async()=>work};};
 try{
  const {loadIntelligence}=await import('../src/urban/intelligence-view.mjs'),view=await loadIntelligence();
  assert.equal(requests,1,'No visitor inference endpoint contacted');
  const overview=view.overview(),collaboration=view.collaboration(),calculation=view.calculation();
  assert.match(collaboration,/6 real delegations · 9 completed tool calls/);
  assert.match(overview,/Unverified scope claim — human review required/);
  assert.match(overview,/Hosted worker offline/);assert.match(overview,/working read-only research view/);
  assert.match(calculation,/18\.04/);assert.match(calculation,/12\.02/);assert.match(calculation,/not observed traffic improvements/);
  const task=work.run.tasks.find(t=>t.role==='quantitative'),html=view.agent(task.agent);
  assert.ok(html.includes(task.completed));assert.match(html,/calculate_scenarios/);assert.match(html,/Collaborat|collaborat/);assert.match(html,/no active model task/);
  const idle=work.registry.find(a=>!work.run.tasks.some(t=>t.agent===a.id));
  assert.match(view.agent(idle.id),/No completed local-model work claimed/);
  idle.name='<img src=x onerror=alert(1)>';assert.ok(view.agent(idle.id).includes('&lt;img'));assert.ok(!view.agent(idle.id).includes('<img'));
 }finally{global.fetch=original;}
});
