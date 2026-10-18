// Explicit local worker. Nothing is scheduled or exposed as a public inference endpoint.
import fs from 'node:fs';
import { localProvider } from './provider.mjs';
import { registry } from './registry.mjs';
import { readCatalog } from './tools.mjs';
import { openRuntime } from './runtime.mjs';
const args=process.argv.slice(2),at=k=>args.indexOf(k),value=k=>at(k)>=0?args[at(k)+1]:undefined;
const directory='.core-local/intelligence';fs.mkdirSync(directory,{recursive:true});
const lock=`${directory}/worker.lock`;let handle;
try{handle=fs.openSync(lock,'wx');fs.writeFileSync(handle,String(process.pid));}catch{throw Error('Worker lock exists. Check its PID and stop the prior worker before explicitly removing a stale lock.');}
let runtime;
try{
 const provider=localProvider({kind:value('--provider')||'ollama',model:value('--model')||'qwen3:8b',endpoint:value('--endpoint')||'http://127.0.0.1:11434'});
 const catalog=readCatalog(),regions=fs.existsSync('data/intelligence/regions.json')?JSON.parse(fs.readFileSync('data/intelligence/regions.json')).regions:undefined;
 runtime=openRuntime({directory,catalog,agents:registry(catalog,regions),provider});
 const report=await runtime.run({question:value('--question'),resume:value('--resume')});
 const events=runtime.events(report.id);
 // Publishing is explicit: never dump a database, private memory, question or raw chain-of-thought automatically.
 if(args.includes('--publish')){
  const recorded={version:'core-intelligence-1',recorded:new Date().toISOString(),availability:'Recorded local worker execution; hosted worker offline',provider:{id:provider.id,model:provider.model},workers:1,registry:runtime.agents.map(({id,code,startNode,name,role,domain,geography,assignment,mission,goals,tools,team,supervisor})=>({id,code,startNode,name,role,domain,geography,assignment,mission,goals,tools,team,supervisor,status:'idle'})),run:{...report,tasks:report.tasks.map(({messages,...t})=>({...t,status:t.status==='working'?'unavailable':t.status}))},events,humanReview:'Pending; model review is not human approval',verification:'Tool provenance, checksums and numerical claims checked; narrative remains model-generated and unvalidated.'};
  fs.mkdirSync('data/intelligence',{recursive:true});fs.writeFileSync('data/intelligence/work.json.tmp',JSON.stringify(recorded,null,1)+'\n');fs.renameSync('data/intelligence/work.json.tmp','data/intelligence/work.json');
 }
 console.log(JSON.stringify({id:report.id,status:report.status,calls:report.calls,tokens:report.tokens,tasks:report.tasks.length,completed:report.tasks.filter(t=>t.status==='completed').length,error:report.lastError||null}));
 if(report.status!=='completed')process.exitCode=2;
}finally{runtime?.close();if(handle!==undefined){fs.closeSync(handle);fs.unlinkSync(lock);}}
