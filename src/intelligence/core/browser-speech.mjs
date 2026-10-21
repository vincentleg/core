// On-device speech recognition for the public site, with the same transcribe(wav,language,signal) contract as the
// local whisper.cpp bridge, so voice.mjs and the shared intelligence engine are unchanged.
export function pcm(wav){const v=new DataView(wav),n=(wav.byteLength-44)/2,out=new Float32Array(n);for(let i=0;i<n;i++)out[i]=v.getInt16(44+i*2,true)/32768;return out;}
export function loadBrowserSpeech({onProgress=()=>{},WorkerImpl=globalThis.Worker}={}){
 const worker=new WorkerImpl(new URL('./speech-worker.mjs',import.meta.url),{type:'module'}),pending=new Map();let next=0;
 worker.onmessage=({data})=>{if(data.type==='progress')return onProgress(data);const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.type==='error'?p.reject(Error(data.message)):p.resolve(data);};
 worker.onerror=e=>{for(const p of pending.values())p.reject(Error(e.message||'Speech worker failed'));pending.clear();};
 const call=(message,transfer=[])=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});worker.postMessage({...message,id},transfer);});
 const ready=call({type:'load'});
 // Whisper detects English or French itself: visitors may speak either, whatever the page language.
 return {ready,async transcribe(wav,_language,signal){
  signal?.throwIfAborted();await ready;const audio=pcm(wav);
  const result=await new Promise((resolve,reject)=>{const abort=()=>reject(Error('Transcription cancelled'));signal?.addEventListener('abort',abort,{once:true});call({type:'transcribe',audio},[audio.buffer]).then(resolve,reject).finally(()=>signal?.removeEventListener('abort',abort));});
  return {text:result.text,system:'whisper-browser',ms:result.ms,audioRetained:false};
 },terminate(){worker.terminate();}};
}
