// Same-origin developer server. Loopback binding, host/origin checks and ephemeral CSRF token; never a public proxy.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {FILES} from './public-manifest.mjs';import {PLAN_SCHEMA,TOOLS,validate,planningSchema} from '../src/intelligence/core/tools.mjs';import {modelInstructions} from '../src/intelligence/core/engine.mjs';
const L=createRequire(import.meta.url)('../src/llm.js');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.bin':'application/octet-stream'};
export function validWav(buffer){return buffer.length>=44&&buffer.length<=1000000&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WAVE'&&buffer.toString('ascii',12,16)==='fmt '&&buffer.readUInt32LE(16)===16&&buffer.readUInt16LE(20)===1&&buffer.readUInt16LE(22)===1&&buffer.readUInt32LE(24)===16000&&buffer.readUInt16LE(34)===16&&buffer.toString('ascii',36,40)==='data'&&buffer.readUInt32LE(40)===buffer.length-44;}
export function createIntelligenceServer({port=8788,fetchImpl=fetch,whisperBin=process.env.CORE_WHISPER_BIN||path.join(ROOT,'.core-local/voice/whisper.cpp/build/bin/whisper-cli'),whisperModel=process.env.CORE_WHISPER_MODEL||path.join(ROOT,'.core-local/voice/ggml-base.bin')}={}){
 const token=crypto.randomBytes(32).toString('hex'),allowed=new Set(FILES),provider={...L.PROVIDERS.ollama,model:'qwen3:8b'};let busy=false,requests=[];
 function send(res,status,body,type='application/json'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'microphone=(self), camera=(), geolocation=()'});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));}
 async function body(req,max){const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>max)throw Error('Request too large');chunks.push(b);}return Buffer.concat(chunks);}
 const server=http.createServer(async(req,res)=>{
  let controller=null;
  try{
   const host=req.headers.host||'',actualPort=server.address()?.port||port;
   if(![`127.0.0.1:${actualPort}`,`localhost:${actualPort}`].includes(host))return send(res,421,{error:'Host refused'});
   if(req.headers.origin&&req.headers.origin!==`http://${host}`||['cross-site','same-site'].includes(req.headers['sec-fetch-site']))return send(res,403,{error:'Origin refused'});
   const url=new URL(req.url,`http://${host}`);
   if(req.method==='GET'&&url.pathname==='/api/intelligence/status'){
    const status=await L.probe(provider,{fetchImpl,timeoutMs:1200});return send(res,200,{mode:status.available?'local-model':'indexed-offline',model:provider.model,token,transcription:fs.existsSync(whisperBin)&&fs.existsSync(whisperModel)?'whisper.cpp-local':'unavailable',audioRetention:false});
   }
   if(url.pathname.startsWith('/api/')){
    if(req.method!=='POST')return send(res,405,{error:'POST required'});
    const supplied=req.headers['x-core-intelligence']||'';
    if(typeof supplied!=='string'||supplied.length!==token.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))return send(res,403,{error:'Local session token required'});
    if(!['/api/intelligence/plan','/api/intelligence/transcribe'].includes(url.pathname))return send(res,404,{error:'Unknown API'});
    requests=requests.filter(t=>Date.now()-t<60000);if(requests.length>=30||busy)return send(res,429,{error:'One local inference at a time; retry later'});requests.push(Date.now());busy=true;
    controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    try{
     if(url.pathname.endsWith('/plan')){
      const input=JSON.parse((await body(req,48000)).toString('utf8'));
      if(typeof input.question!=='string'||input.question.length<1||input.question.length>1200||!['en','fr'].includes(input.language)||JSON.stringify(input).length>36000)throw Error('Invalid bounded conversation input');
      const schema=planningSchema(input.context);
      const result=await L.chat(provider,{messages:[{role:'system',content:modelInstructions()},{role:'user',content:JSON.stringify(input)+'\n'+(input.observations?.length?'The observations above are outcomes of tools ALREADY EXECUTED for this request. Do not plan those actions again. Answer from their actual outcomes with calls:[] and citations. Only request an additional tool if something essential is missing.':'Select the tools needed for the request.')+'\nReturn this JSON contract: '+JSON.stringify(schema)}],schema,signal:controller.signal,fetchImpl:(url,init)=>fetchImpl(url,{...init,redirect:'error'}),limits:{...L.LIMITS,maxContextChars:46000,maxOutputTokens:700,numCtx:12288},timeoutMs:120000});
      if(result.doneReason==='length')throw Error('Model output was truncated');const plan=JSON.parse(result.content);validate(plan,schema,'plan');for(const c of plan.calls)validate(c.arguments,TOOLS[c.name].schema);
      return send(res,200,{...plan,model:result.model,usage:result.usage});
     }
     const wav=await body(req,1000000);if(!validWav(wav))throw Error('16 kHz mono PCM16 WAV required, maximum 30 seconds');
     if(!fs.existsSync(whisperBin)||!fs.existsSync(whisperModel))return send(res,503,{error:'Local Whisper is not installed'});
     const lang=url.searchParams.get('language')||'auto';if(!['auto','en','fr'].includes(lang))throw Error('Unsupported transcription language');
     const transcript=await new Promise((resolve,reject)=>{
      const child=spawn(whisperBin,['-m',whisperModel,'-f','-','-l',lang,'--prompt','CORE geographic vocabulary: Folsom Street, Howard Street, Golden Gate Bridge, Bay Bridge, San Francisco, Oakland, Berkeley, San Jose, Palo Alto.','-nt','-np','-otxt','-of','-','--no-gpu'],{stdio:['pipe','pipe','pipe'],shell:false});let output='',diagnostic='';
      const timer=setTimeout(()=>child.kill('SIGTERM'),45000),abort=()=>child.kill('SIGTERM');controller.signal.addEventListener('abort',abort,{once:true});
      child.stdout.on('data',b=>{output+=b;if(output.length>12000)child.kill('SIGTERM');});child.stderr.on('data',b=>{diagnostic=(diagnostic+b).slice(-1000);});child.stdin.on('error',()=>{});child.on('error',reject);
      child.on('close',code=>{clearTimeout(timer);controller.signal.removeEventListener('abort',abort);if(code!==0||controller.signal.aborted)return reject(Error('Local transcription failed or was cancelled'));resolve(output.trim().slice(0,1200));});child.stdin.end(wav);
     });return send(res,200,{text:transcript,system:'whisper.cpp-local',audioRetained:false});
    }finally{busy=false;}
   }
   if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Read-only static site'});
   const file=url.pathname==='/'?'world.html':decodeURIComponent(url.pathname.slice(1));
   if(!allowed.has(file))return send(res,404,'Not found','text/plain');const full=path.join(ROOT,file);return send(res,200,req.method==='HEAD'?'':fs.readFileSync(full),MIME[path.extname(file)]||'application/octet-stream');
  }catch(e){return send(res,400,{error:String(e.message).slice(0,240)});}
 });
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.CORE_INTELLIGENCE_PORT||8788);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');const server=createIntelligenceServer({port});server.listen(port,'127.0.0.1',()=>console.log(`CORE local intelligence: http://127.0.0.1:${port}/ — loopback only; no audio/conversation persistence`));
}
