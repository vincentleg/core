import {PUBLIC} from '../../env.mjs';
export async function localConnection(fetchImpl=fetch){
 if(PUBLIC)return {mode:'indexed-offline',transcription:'unavailable',model:null};
 try{const r=await fetchImpl('/api/intelligence/status',{signal:AbortSignal.timeout(2000),credentials:'same-origin'});if(!r.ok)throw Error('Local bridge unavailable');const status=await r.json();if(!/^[a-f0-9]{64}$/.test(status.token))throw Error('Invalid local session');
  const post=async(path,body,signal,type='application/json')=>{const r=await fetchImpl(path,{method:'POST',credentials:'same-origin',headers:{'content-type':type,'x-core-intelligence':status.token},body,signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Local service unavailable');return d;};
  return {...status,model:status.mode==='local-model'?async(input,{signal})=>{const {model,usage,...plan}=await post('/api/intelligence/plan',JSON.stringify(input),signal);return plan;}:null,transcribe:async(wav,language,signal)=>post('/api/intelligence/transcribe?language='+language,wav,signal,'audio/wav')};
 }catch{return {mode:'indexed-offline',transcription:'unavailable',model:null};}
}
