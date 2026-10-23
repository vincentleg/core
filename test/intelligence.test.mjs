// Protocol fixtures below are scripted tests, never evidence of real model intelligence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { localProvider } from '../scripts/intelligence/provider.mjs';
import { registry } from '../scripts/intelligence/registry.mjs';
import { checkOutput, openRuntime } from '../scripts/intelligence/runtime.mjs';
import { tool, readCatalog, contextOutput, scopeFlags } from '../scripts/intelligence/tools.mjs';
import { createWalkers } from '../src/urban/movement.mjs';
import { DEFAULT } from '../src/urban/model.mjs';
import { createRequire } from 'node:module';
const Population=createRequire(import.meta.url)('../src/agent-population.js');
const catalog=readCatalog(), regions=JSON.parse(fs.readFileSync('data/intelligence/regions.json')).regions;
test('500 stable identities have regional responsibility, role permissions and valid distributed starts',()=>{
 const agents=registry(catalog,regions),raw=JSON.parse(fs.readFileSync('data/intelligence/walk-network.json')),net=Population.network(raw);
 assert.equal(new Set(agents.map(a=>a.id)).size,500);assert.equal(new Set(agents.map(a=>a.geography)).size,16);assert.equal(new Set(agents.map(a=>a.startNode)).size,500);
 for(const a of agents){assert.ok(regions.find(r=>r.name===a.geography).nodes.includes(a.startNode));assert.ok(net.adj[a.startNode].length);assert.equal(a.tools.includes('delegate'),['planner','supervisor','reviewer'].includes(a.role));}
 const walkers=createWalkers(net,agents);for(let i=0;i<40;i++){const positions=walkers.step(.2);assert.ok(positions.every(p=>p.node===p.next||net.adj[p.node].some(e=>e[0]===p.next)));}
});
test('provider rejects paid/non-loopback endpoints; claim gate rejects unknown citations and fabricated numbers',()=>{
 assert.throws(()=>localProvider({endpoint:'https://example.com'}));assert.throws(()=>localProvider({endpoint:'http://127.0.0.1:11434/private'}));
 const out={claims:[{text:'Delay is 9999 seconds',cites:['F1']}],uncertainty:['Not calibrated'],next:'Human review'};
 assert.throws(()=>checkOutput(out,[{id:'F1',output:{delay:2}}]));out.claims[0]={text:'Unknown evidence',cites:['missing']};assert.throws(()=>checkOutput(out,[{id:'F1',output:{}}]));
});
test('authorized analytical tools calculate reproducible alternatives and refuse unsupported geography',async()=>{
 const args={segment:catalog.segments[0].id,scenarios:[{name:'Base',parameters:DEFAULT},{name:'Less green',parameters:{...DEFAULT,green:.2}}]};
 const a=await tool('calculate_scenarios',args,{}, {catalog}),b=await tool('calculate_scenarios',args,{}, {catalog});assert.deepEqual(a,b);assert.equal(a.calibrated,false);assert.ok(a.result.rows[1].delta.accruedDelayS>0);
 await assert.rejects(()=>tool('calculate_scenarios',{...args,segment:'Oakland'}, {},{catalog}));await assert.rejects(()=>tool('retrieve_source',{source:'https://unapproved.example'}, {},{catalog}));
});
test('LangGraph checkpoints resume after provider failure; real delegation and tools are durably recorded',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'core-intelligence-'));let calls=0;
 const agents=registry(catalog,regions),child=agents.find(a=>a.role==='geography');
 const fixture={id:'scripted-test-only',model:'not-an-LLM',async invoke(messages){calls++;if(calls===1)return {content:JSON.stringify({action:'delegate',arguments:{role:'geography',goal:'Inspect supported geography'}}),usage:{promptTokens:1,outputTokens:1},model:this.model};throw Error('Injected unavailable provider');}};
 let runtime=openRuntime({directory,agents,catalog,provider:fixture});
 let result=await runtime.run({question:'Protocol fixture: check persistent delegation, not a real investigation.'});assert.equal(result.status,'blocked');const id=result.id;assert.equal(result.tasks.length,2);
 const interrupted=JSON.parse(runtime.db.prepare('SELECT record FROM runs WHERE id=?').get(id).record);interrupted.calls++;interrupted.activeModel={id:'interrupted-test-request',task:result.tasks[1].id};runtime.db.prepare('UPDATE runs SET record=? WHERE id=?').run(JSON.stringify(interrupted),id);runtime.close();
 const outputs=[{action:'geographic_context',arguments:{}},{action:'finish',arguments:{claims:[{text:'Mapped approaches have limited geographic coverage.',cites:['F1']}],uncertainty:['Not a calibrated forecast'],next:'Human review'}}];
 const resumeProvider={...fixture,async invoke(){const next=outputs.shift();if(!next)throw Error('Stop fixture after child completion');return {content:JSON.stringify(next),usage:{promptTokens:1,outputTokens:1},model:this.model};}};
 runtime=openRuntime({directory,agents,catalog,provider:resumeProvider});result=await runtime.run({resume:id});assert.equal(result.tasks[1].status,'completed');assert.ok(result.calls>=interrupted.calls);assert.ok(runtime.events(id).some(e=>e.kind==='model_interrupted'&&e.usage.includes('unknown')));assert.ok(runtime.events(id).some(e=>e.kind==='delegation'));assert.ok(runtime.events(id).some(e=>e.kind==='tool_completed'&&e.tool==='geographic_context'));assert.ok(runtime.events(id).some(e=>e.kind==='model_failed'));runtime.close();fs.rmSync(directory,{recursive:true});
});

test('compact tool context preserves every calculated alternative and explicitly labels data samples',async()=>{
 const args={segment:catalog.segments[0].id,scenarios:[{name:'Base',parameters:DEFAULT},{name:'Alternative',parameters:{...DEFAULT,green:.55}}]};
 const full=await tool('calculate_scenarios',args,{}, {catalog}),compact=contextOutput('calculate_scenarios',full);
 assert.deepEqual(compact.result.rows.map(r=>r.metrics),full.result.rows.map(r=>r.metrics));assert.equal(compact.calibrated,false);
 const sampled=contextOutput('retrieve_source',{data:Array.from({length:8},(_,i)=>({n:i})),source:'fixture'});assert.equal(sampled.recordCount,8);assert.equal(sampled.sample.length,4);assert.equal(sampled.sampleOnly,true);
});

test('universal absence claims are flagged rather than certified from a limited catalog',()=>{
 assert.equal(scopeFlags([{text:'No existing evidence or studies have analyzed this intervention.'}]).length,1);
 assert.equal(scopeFlags([{text:'No observed traffic counts are integrated in this catalog.'}]).length,0);
});
