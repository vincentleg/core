// On-device language model for the public site: Qwen3 (Apache-2.0) through WebLLM on WebGPU, loaded only after consent.
// Model files come from their official sources at pinned revisions and are SRI-checked; CORE hosts no inference server.
// The model only proposes plans: the same schema validation and deterministic tools as the local Qwen3:8B bridge apply.
import {compactInstructions,synthesisInstructions} from './engine.mjs';
import {planningSchema,validate,TOOLS,PLAN_SCHEMA} from './tools.mjs';
const LIBS='https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/025bcaf3780fa8254f5e5efd3bfea0a5397248f4/web-llm-models/v0_2_84/base/';
const TOKENIZER={'tokenizer.json':'sha384-bBcp1iraOY8O3lJXFKDjSlRbqFZ2wbSX1HMscuq4lbj4bO+YyBt2tRf6Kj8+hxFw'};
export const BROWSER_MODELS={
 'Qwen3-1.7B-q4f16_1-MLC':{label:'Qwen3-1.7B',downloadMB:984,vramMB:2037,model:'https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC/resolve/80b3abcec6c3b3f5355dc0cc99cc4fb578f192bc/',lib:LIBS+'Qwen3-1.7B-q4f16_1_cs1k-webgpu.wasm',integrity:{config:'sha384-X+UwGfB2vtN1DuSZFxz1/41rzSrFguvyGeha2kgsNuD8HOxT7CgMQqI+8+70J0co',model_lib:'sha384-7QJDec7NGvNVHjD9ZRdHNFxHlk/iXvbqQ7xDxoO6lpVF7/GmSvWboR66CTWhsRL8',tokenizer:TOKENIZER}},
 'Qwen3-0.6B-q4f16_1-MLC':{label:'Qwen3-0.6B',downloadMB:352,vramMB:1404,model:'https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC/resolve/8c14ce481d4c692769976ad52afea453a102df19/',lib:LIBS+'Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm',integrity:{config:'sha384-9fxUxKNOFFPlaUNBJNRKF5bctTgaxIbd2eszFnw4jzDyqL0O7tuJxJYFqeBz54z4',model_lib:'sha384-/1lwl1XGZwvnrO/NGS5Vn0TBRBcOecaSo6tcVrmEwp5dYOmXWask7TkWfI0Ehw6v',tokenizer:TOKENIZER}}
};
// Honest capability check: WebGPU with 16-bit shaders is required; phones and small GPUs get the smaller model.
export async function browserAICapability(host=globalThis){
 try{
  if(!host.navigator?.gpu)return {supported:false,reason:'WebGPU unavailable in this browser'};
  const adapter=await host.navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)return {supported:false,reason:'No WebGPU adapter'};
  if(!adapter.features.has('shader-f16'))return {supported:false,reason:'This GPU lacks 16-bit shader support'};
  const small=/Mobi|Android|iPhone|iPad/i.test(host.navigator.userAgent||'')||(host.navigator.deviceMemory||8)<=4||adapter.limits.maxBufferSize<1073741824;
  return {supported:true,modelId:small?'Qwen3-0.6B-q4f16_1-MLC':'Qwen3-1.7B-q4f16_1-MLC'};
 }catch(e){return {supported:false,reason:e.message};}
}
export async function cachedBrowserModel(modelId){try{const {hasModelInCache}=await import('../../../assets/vendor/web-llm-0.2.85/web-llm.mjs');return await hasModelInCache(modelId,appConfig(modelId));}catch{return false;}}
function appConfig(modelId){const m=BROWSER_MODELS[modelId];return {model_list:[{model:m.model,model_id:modelId,model_lib:m.lib,vram_required_MB:m.vramMB,low_resource_required:true,overrides:{context_window_size:4096},integrity:{...m.integrity,onFailure:'error'}}]};}
const planText=(input,schema)=>JSON.stringify(input)+'\n'+(input.synthesis?'Answer now from the observations.':input.observations?.length?'Observations are outcomes of tools ALREADY executed. Do not repeat them. Answer with calls:[] unless something essential is missing.':'Select the tools needed.')+' Return JSON matching: '+JSON.stringify(schema);
// Returns the same model(input,{signal}) contract as the local bridge, plus the measured load time.
export async function loadBrowserModel(modelId,{onProgress=()=>{},WorkerImpl=globalThis.Worker}={}){
 if(!BROWSER_MODELS[modelId])throw Error('Unknown on-device model');
 const {CreateWebWorkerMLCEngine}=await import('../../../assets/vendor/web-llm-0.2.85/web-llm.mjs');
 const started=performance.now(),worker=new WorkerImpl(new URL('./llm-worker.mjs',import.meta.url),{type:'module'});
 let engine;try{engine=await CreateWebWorkerMLCEngine(worker,modelId,{appConfig:appConfig(modelId),initProgressCallback:p=>onProgress({progress:p.progress,text:p.text})});}catch(e){worker.terminate();throw e;}
 const loadMs=Math.round(performance.now()-started);let queue=Promise.resolve();
 async function infer(input,{signal}={}){
  signal?.throwIfAborted();
  const schema=input.synthesis?{...structuredClone(PLAN_SCHEMA),properties:{calls:{type:'array',maxItems:0,items:{type:'object'}},message:{type:'string',maxLength:700},citations:{type:'array',maxItems:6,items:input.allowed_citations?.length?{type:'string',enum:input.allowed_citations}:{type:'string',maxLength:200}}}}:planningSchema(input.context);
  const stop=()=>engine.interruptGenerate();signal?.addEventListener('abort',stop,{once:true});
  try{
   const reply=await engine.chat.completions.create({messages:[{role:'system',content:input.synthesis?synthesisInstructions():compactInstructions()},{role:'user',content:planText(input,schema)}],response_format:{type:'json_object',schema:JSON.stringify(schema)},temperature:0,max_tokens:input.synthesis?220:320,extra_body:{enable_thinking:false}});
   signal?.throwIfAborted();const choice=reply.choices[0];if(choice.finish_reason==='length')throw Error('On-device model output was truncated');
   const plan=JSON.parse(choice.message.content);validate(plan,schema,'plan');for(const c of plan.calls)validate(c.arguments,TOOLS[c.name].schema);
   return plan;
  }finally{signal?.removeEventListener('abort',stop);}
 }
 // One inference at a time; a new request waits for the previous one instead of interleaving in the worker.
 const model=(input,options)=>{const next=queue.then(()=>infer(input,options));queue=next.catch(()=>{});return next;};
 return {model,modelId,label:BROWSER_MODELS[modelId].label,loadMs,async unload(){await engine.unload().catch(()=>{});worker.terminate();}};
}
