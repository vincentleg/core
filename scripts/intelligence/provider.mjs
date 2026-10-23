// Reuse CORE's loopback-only adapter; no credentials or paid-provider fallback.
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../../src/llm.js');
export function localProvider({kind='ollama', model='qwen3:8b', endpoint='http://127.0.0.1:11434'}={}) {
  if(!['ollama','openai-compatible-local'].includes(kind))throw Error('Only local inference is authorized');
  const provider={...L.PROVIDERS[kind],model,baseUrl:endpoint};
  const u=new URL(endpoint);L.assertLocal(provider);
  if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.protocol!=='http:')throw Error('Plain loopback endpoint required');
  return {id:kind,model,probe:()=>L.probe(provider),async invoke(messages,schema){
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),120000);
    try{return await L.chat(provider,{messages,schema,signal:ctl.signal,fetchImpl:(url,init)=>fetch(url,{...init,signal:ctl.signal,redirect:'error'}),limits:{...L.LIMITS,maxContextChars:18000,maxOutputTokens:850,numCtx:8192},timeoutMs:120000});}finally{clearTimeout(timer);}
  }};
}
