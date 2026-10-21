const test=require('node:test'),assert=require('node:assert/strict');
const {Readable}=require('node:stream'),{EventEmitter}=require('node:events');

test('local navigation, assets and APIs keep Host, Origin and session boundaries',async()=>{
 const {createIntelligenceServer}=await import('../scripts/intelligence-server.mjs');
 const server=createIntelligenceServer({whisperBin:'/nonexistent/core-whisper',fetchImpl:async url=>({
  ok:true,json:async()=>url.endsWith('/api/tags')?{models:[{name:'qwen3:8b'}]}:{message:{content:JSON.stringify({calls:[],message:'Local test',citations:[]})}}
 })});
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
   for(const asset of ['/src/intelligence/core/connection.mjs','/src/intelligence/core/voice.mjs','/src/intelligence/core/capture-worklet.mjs']){
    const response=await request(asset,{headers});assert.equal(response.status,200);assert.match(response.headers['Content-Type'],/javascript/);
   }
   const status=await request('/api/intelligence/status',{headers});assert.equal(status.status,200);
   const {token}=JSON.parse(status.body);assert.match(token,/^[a-f0-9]{64}$/);
   const authorized={...headers,'x-core-intelligence':token};
   assert.equal((await request('/api/intelligence/plan',{method:'POST',headers:authorized,body:JSON.stringify({question:'Hello',language:'en'})})).status,200);
   const {wav}=await import('../src/intelligence/core/voice.mjs');
   assert.equal((await request('/api/intelligence/transcribe',{method:'POST',headers:authorized,body:Buffer.from(wav(new Float32Array(1600),16000))})).status,503,'valid audio reaches the explicit missing-Whisper response');
   for(const path of ['/api/intelligence/plan','/api/intelligence/transcribe']){
    assert.equal((await request(path,{method:'POST',headers})).status,403);
    assert.equal((await request(path,{method:'POST',headers:{...headers,'x-core-intelligence':'0'.repeat(64)}})).status,403);
   }
  }
 }
 const {token}=JSON.parse((await request('/api/intelligence/status')).body);
 for(const host of ['attacker.test:8788','127.0.0.1.attacker.test:8788','localhost.attacker.test:8788','127.0.0.1:8789','localhost','']){
  assert.equal((await request('/',{headers:{host,...navigation}})).status,421,host);
 }
 for(const origin of ['https://attacker.test','null','http://127.0.0.1:8789','http://localhost:8788','https://127.0.0.1:8788','http://127.0.0.1:8788.attacker.test']){
  assert.equal((await request('/',{headers:{origin,...navigation,'sec-fetch-site':'cross-site'}})).status,403,origin);
  assert.equal((await request('/api/intelligence/plan',{method:'POST',headers:{origin,'x-core-intelligence':token}})).status,403,origin);
 }
 for(const site of ['cross-site','same-site']){
  for(const path of ['/','/src/intelligence/core/voice.mjs','/api/intelligence/status']){
   assert.equal((await request(path,{headers:{'sec-fetch-site':site}})).status,403,`${site}: ${path}`);
  }
  assert.equal((await request('/api/intelligence/status',{headers:{...navigation,'sec-fetch-site':site}})).status,403);
  assert.equal((await request('/api/intelligence/transcribe',{method:'POST',headers:{...navigation,'sec-fetch-site':site,'x-core-intelligence':token}})).status,403);
  assert.equal((await request('/',{method:'POST',headers:{...navigation,'sec-fetch-site':site}})).status,403);
  assert.equal((await request('/',{headers:{...navigation,'sec-fetch-dest':'iframe','sec-fetch-site':site}})).status,403);
 }
 for(const path of ['/.env','/scripts/intelligence-server.mjs','/beta-lab/evidence/raw/x'])assert.equal((await request(path)).status,404);
});
