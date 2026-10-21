// Module worker: on-device Whisper (Transformers.js + ONNX Runtime Web). Audio arrives as PCM in memory, is transcribed
// here and is never stored or sent anywhere; only the pinned model files are downloaded, once, from Hugging Face.
import {pipeline,env} from '../../../assets/vendor/transformers-4.3.0/transformers.mjs';
env.allowLocalModels=false;env.useBrowserCache=true;env.backends.onnx.wasm.wasmPaths=new URL('../../../assets/vendor/transformers-4.3.0/',import.meta.url).href;
const MODELS={webgpu:{id:'onnx-community/whisper-base',revision:'1846881b6b3a3024392c1eea3ad983695bc23925',dtype:{encoder_model:'fp16',decoder_model_merged:'q4'}},wasm:{id:'onnx-community/whisper-tiny',revision:'ff4177021cc41f7db950912b73ea4fdf7d01d8e7',dtype:{encoder_model:'q8',decoder_model_merged:'q8'}}};
let asr=null,info=null;
async function load(){
 if(asr)return info;const started=performance.now();
 const adapter=await self.navigator.gpu?.requestAdapter().catch(()=>null),device=adapter?.features.has('shader-f16')?'webgpu':'wasm',m=MODELS[device];
 asr=await pipeline('automatic-speech-recognition',m.id,{revision:m.revision,device,dtype:m.dtype,progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'progress',file:p.file,progress:p.progress/100});}});
 const loadMs=Math.round(performance.now()-started),warm=performance.now();await asr(new Float32Array(8000),{task:'transcribe'});
 info={device,model:m.id.split('/')[1],loadMs,warmupMs:Math.round(performance.now()-warm)};return info;
}
self.onmessage=async({data})=>{
 try{
  if(data.type==='load')return self.postMessage({type:'ready',id:data.id,...await load()});
  if(data.type==='transcribe'){await load();const started=performance.now(),out=await asr(data.audio,{task:'transcribe',...(data.language?{language:data.language}:{})});data.audio.fill(0);return self.postMessage({type:'result',id:data.id,text:String(out.text||'').trim().slice(0,1200),ms:Math.round(performance.now()-started)});}
 }catch(e){self.postMessage({type:'error',id:data.id,message:String(e?.message||e).slice(0,240)});}
};
