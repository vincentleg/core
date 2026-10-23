const test=require('node:test'),assert=require('node:assert/strict');
const {Readable}=require('node:stream'),{EventEmitter}=require('node:events');

test('local bridge refuses malformed/oversized inputs and never returns private upstream error details',async()=>{
 const {createIntelligenceServer}=await import('../scripts/intelligence-server.mjs');
 const server=createIntelligenceServer({fetchImpl:async url=>{if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'qwen3:8b'}]})};throw Error('private backend fixture details');}});
 const request=(url,body,token)=>new Promise(resolve=>{const req=Readable.from(body?[Buffer.from(body)]:[]);Object.assign(req,{url,method:body?'POST':'GET',headers:{host:'127.0.0.1:8788',...(token?{'x-core-intelligence':token}:{})}});const res=new EventEmitter();res.writeHead=status=>{res.status=status;};res.end=b=>{res.writableEnded=true;resolve({status:res.status,body:String(b)});};server.emit('request',req,res);});
 const {token}=JSON.parse((await request('/api/intelligence/status')).body);
 for(const body of ['{"private fixture":', 'null', '[]', 'x'.repeat(48001), JSON.stringify({question:'Hello',language:'en'})]){
  const response=await request('/api/intelligence/plan',body,token);assert.equal(response.status,400);assert.deepEqual(JSON.parse(response.body),{error:'Invalid or unavailable local request'});assert.ok(!response.body.includes(token));
 }
});

test('local navigation, assets and APIs keep Host, Origin and session boundaries',async()=>{
 const {createIntelligenceServer}=await import('../scripts/intelligence-server.mjs');
 let modelCalls=0;
 const server=createIntelligenceServer({fetchImpl:async url=>{if(!url.endsWith('/api/tags'))modelCalls++;return {
  ok:true,json:async()=>url.endsWith('/api/tags')?{models:[{name:'qwen3:8b'}]}:{message:{content:JSON.stringify({calls:[],message:'Local test',citations:[]})}}
 };}});
 async function request(url,{method='GET',headers={},body=''}={}){
  return new Promise(resolve=>{
   const req=Readable.from(body?[Buffer.from(body)]:[]);
   Object.assign(req,{url,method,headers:{host:'127.0.0.1:8788',...headers}});
   const res=new EventEmitter();res.writeHead=(status,headers)=>Object.assign(res,{status,headers});
   res.end=body=>{res.writableEnded=true;resolve({status:res.status,headers:res.headers,body:String(body)});};
   server.emit('request',req,res);
  });
 }
 const navigation={'sec-fetch-mode':'navigate','sec-fetch-dest':'document'};
 for(const host of ['127.0.0.1:8788','localhost:8788']){
  assert.equal((await request('/',{headers:{host}})).status,200,'legacy navigation without Origin or Fetch Metadata');
  for(const site of [undefined,'none','same-origin','same-site','cross-site']){
   const headers={host,...navigation,...(site?{'sec-fetch-site':site}:{})};
   const home=await request('/',{headers});assert.equal(home.status,200,`${host}: navigation ${site}`);
   assert.match(home.headers['Content-Type'],/text\/html/);assert.match(home.body,/<!doctype html>/i);
   assert.equal((await request('/world.html',{headers})).status,200);
  }
  for(const origin of [undefined,`http://${host}`]){
   const headers={host,'sec-fetch-site':'same-origin',...(origin?{origin}:{})};
   for(const asset of ['/src/intelligence/core/connection.mjs','/src/intelligence/core/ui.mjs','/src/intelligence/core/engine.mjs']){
    const response=await request(asset,{headers});assert.equal(response.status,200);assert.match(response.headers['Content-Type'],/javascript/);
   }
   const status=await request('/api/intelligence/status',{headers});assert.equal(status.status,200);
   const {token}=JSON.parse(status.body);assert.match(token,/^[a-f0-9]{64}$/);
   const authorized={...headers,'x-core-intelligence':token};
   for(const language of ['en','fr','es','de','zh-CN','pt'])assert.equal((await request('/api/intelligence/plan',{method:'POST',headers:authorized,body:JSON.stringify({question:'Hello',language})})).status,200,language);
   assert.equal((await request('/api/intelligence/transcribe',{method:'POST',headers:authorized,body:Buffer.alloc(64)})).status,404,'voice transcription was removed');
   for(const path of ['/api/intelligence/plan','/api/intelligence/transcribe']){
    assert.equal((await request(path,{method:'POST',headers})).status,403);
    assert.equal((await request(path,{method:'POST',headers:{...headers,'x-core-intelligence':'0'.repeat(64)}})).status,403);
   }
  }
 }
 const {token}=JSON.parse((await request('/api/intelligence/status')).body);
 const headers={'x-core-intelligence':token},before=modelCalls;
 const safety=await request('/api/intelligence/plan',{method:'POST',headers,body:JSON.stringify({question:'I want to end my life',language:'en'})});
 assert.equal(safety.status,200);assert.match(JSON.parse(safety.body).message,/988/);assert.deepEqual(JSON.parse(safety.body).calls,[]);assert.equal(modelCalls,before,'direct crisis API request never reaches the model');
 for(const language of ['it','__proto__',['en']])assert.equal((await request('/api/intelligence/plan',{method:'POST',headers,body:JSON.stringify({question:'Hello',language})})).status,400);
 for(const host of ['attacker.test:8788','127.0.0.1.attacker.test:8788','localhost.attacker.test:8788','127.0.0.1:8789','localhost','']){
  assert.equal((await request('/',{headers:{host,...navigation}})).status,421,host);
 }
 for(const origin of ['https://attacker.test','null','http://127.0.0.1:8789','http://localhost:8788','https://127.0.0.1:8788','http://127.0.0.1:8788.attacker.test']){
  assert.equal((await request('/',{headers:{origin,...navigation,'sec-fetch-site':'cross-site'}})).status,403,origin);
  assert.equal((await request('/api/intelligence/plan',{method:'POST',headers:{origin,'x-core-intelligence':token}})).status,403,origin);
 }
 for(const site of ['cross-site','same-site']){
  for(const path of ['/','/src/intelligence/core/ui.mjs','/api/intelligence/status']){
   assert.equal((await request(path,{headers:{'sec-fetch-site':site}})).status,403,`${site}: ${path}`);
  }
  assert.equal((await request('/api/intelligence/status',{headers:{...navigation,'sec-fetch-site':site}})).status,403);
  assert.equal((await request('/api/intelligence/transcribe',{method:'POST',headers:{...navigation,'sec-fetch-site':site,'x-core-intelligence':token}})).status,403);
  assert.equal((await request('/',{method:'POST',headers:{...navigation,'sec-fetch-site':site}})).status,403);
  assert.equal((await request('/',{headers:{...navigation,'sec-fetch-dest':'iframe','sec-fetch-site':site}})).status,403);
 }
 for(const path of ['/.env','/scripts/intelligence-server.mjs','/beta-lab/evidence/raw/x'])assert.equal((await request(path)).status,404);
});
