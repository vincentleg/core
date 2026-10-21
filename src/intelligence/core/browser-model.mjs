// On-device language model for the public site: Qwen3 (Apache-2.0) through WebLLM on WebGPU, loaded only after consent.
// Model files come from their official sources at pinned revisions and are SRI-checked; CORE hosts no inference server.
// The model only proposes plans: the same schema validation and deterministic tools as the local Qwen3:8B bridge apply.
import {compactInstructions,synthesisInstructions} from './engine.mjs';
import {planningSchema,validate,TOOLS} from './tools.mjs';
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
// WebLLM compiles JSON schemas with unlimited whitespace, which small models fill until the token limit. This emits an
// equivalent whitespace-free EBNF grammar from CORE's own schema subset (object/array/string/enum/boolean/number/anyOf).
export function grammar(schema){
 const rules=['chr ::= [^"\\\\\\x00-\\x1f] | "\\\\" ["\\\\/bfnrt]'],memo=new Map();let n=0;const lit=v=>JSON.stringify(v);
 const rule=body=>{if(memo.has(body))return memo.get(body);const name='r'+(n++);memo.set(body,name);rules.push(name+' ::= '+body);return name;};
 const g=s=>{
  if(s.anyOf)return rule(s.anyOf.map(g).join(' | '));
  if(s.enum)return rule(s.enum.map(v=>lit(JSON.stringify(v))).join(' | '));
  // Unbounded repetition compiles fast; lengths are enforced by validate() afterwards and by max_tokens.
  if(s.type==='string')return rule(`"\\"" chr${s.minLength?'+':'*'} "\\""`);
  if(s.type==='boolean')return '("true" | "false")';
  if(s.type==='number')return rule('"-"? [0-9]{1,4} ("." [0-9]{1,8})?');
  if(s.type==='array'){if(s.maxItems===0)return '"[]"';const it=g(s.items);return rule(`"[" (${it} ("," ${it})*)? "]"`);}
  if(s.type==='object'){
   const props=Object.entries(s.properties||{}),req=new Set(s.required||[]);if(!props.length)return '"{}"';
   const seq=(i,first)=>{if(i===props.length)return '""';const [k,v]=props[i],entry=(first?'':'"," ')+lit(JSON.stringify(k)+':')+' '+g(v)+' '+seq(i+1,false);return rule(req.has(k)?entry:`(${entry}) | ${seq(i+1,first)}`);};
   return rule(`"{" ${seq(0,true)} "}"`);
  }
  throw Error('Unsupported schema for grammar');
 };
 const root=g(schema);rules.unshift('root ::= '+root);return rules.join('\n');
}
// Demonstrated turns: small models follow shown tool choices far more reliably than described rules.
const ask=(question,observations=[])=>JSON.stringify({question,language:'en',context:{location:null,agent:null,results:[]},observations});
const EXAMPLES=[[ask('Find someone working on bike lanes in Berkeley'),{calls:[{name:'search_agents',arguments:{query:'bike lanes mobility',city:'Berkeley'}},{name:'select_agent',arguments:{agent_id:'$best_agent'}}],message:'',citations:[]}],
 [ask('Show me the city across the bay from San Francisco'),{calls:[{name:'search_places',arguments:{query:'Oakland'}},{name:'fly_to_place',arguments:{place_id:'$location'}}],message:'',citations:[]}],
 [ask('How much does CORE cost?'),{calls:[{name:'lookup_core_knowledge',arguments:{query:'pricing plans'}}],message:'',citations:[]}],
 [ask('What is photosynthesis?'),{calls:[],message:'Photosynthesis is how plants use light, water and carbon dioxide to make sugars and release oxygen.',citations:[]}]].flatMap(([u,a])=>[{role:'user',content:u},{role:'assistant',content:JSON.stringify(a)}]);
const signatures=()=>Object.entries(TOOLS).map(([k,v])=>k+'('+Object.keys(v.schema.properties).map(a=>a+((v.schema.required||[]).includes(a)?'':'?')).join(',')+')').join(' ');
// Grammars are kept identical across requests: compiling one costs seconds, a cached one nothing. Request-specific IDs and
// citations are therefore checked after decoding (validate here, then the engine's citation and execution checks).
const SYNTHESIS={type:'object',additionalProperties:false,properties:{calls:{type:'array',maxItems:0,items:{type:'object'}},message:{type:'string',minLength:1,maxLength:600},citations:{type:'array',maxItems:4,items:{type:'string',maxLength:200}}},required:['calls','message','citations']};
const PLAN=planningSchema({});for(const o of PLAN.properties.calls.items.anyOf)for(const k of ['place_id','agent_id'])if(o.properties.arguments.properties[k])o.properties.arguments.properties[k]={type:'string',minLength:1,maxLength:240};
const GRAMMAR={plan:grammar(PLAN),synthesis:grammar(SYNTHESIS)};
const planText=input=>JSON.stringify(input)+'\n'+(input.synthesis?'Answer now from the observations. Output {"calls":[],"message":"…","citations":[…]}.':(input.observations?.length?'Observations are outcomes of tools ALREADY executed. Do not repeat them. Answer with calls:[] unless something essential is missing. ':'Select the tools needed. ')+'Output {"calls":[{"name":"tool","arguments":{…}}],"message":"","citations":[]}. Tool signatures: '+signatures());
// Returns the same model(input,{signal}) contract as the local bridge, plus the measured load time.
export async function loadBrowserModel(modelId,{onProgress=()=>{},WorkerImpl=globalThis.Worker}={}){
 if(!BROWSER_MODELS[modelId])throw Error('Unknown on-device model');
 const {CreateWebWorkerMLCEngine}=await import('../../../assets/vendor/web-llm-0.2.85/web-llm.mjs');
 const started=performance.now(),worker=new WorkerImpl(new URL('./llm-worker.mjs',import.meta.url),{type:'module'});
 let engine;try{engine=await CreateWebWorkerMLCEngine(worker,modelId,{appConfig:appConfig(modelId),initProgressCallback:p=>onProgress({progress:p.progress,text:p.text})});}catch(e){worker.terminate();throw e;}
 let queue=Promise.resolve(),last=null;
 // Warm-up (included in the reported load time): the first grammar use initialises the tokenizer tables and each grammar is compiled once.
 for(const g of [GRAMMAR.plan,GRAMMAR.synthesis])await engine.chat.completions.create({messages:[{role:'user',content:'Reply.'}],response_format:{type:'grammar',grammar:g},max_tokens:8,temperature:0,extra_body:{enable_thinking:false}}).catch(()=>{});
 const loadMs=Math.round(performance.now()-started);
 async function infer(input,{signal}={}){
  signal?.throwIfAborted();
  const schema=input.synthesis?SYNTHESIS:planningSchema(input.context);
  const stop=()=>engine.interruptGenerate();signal?.addEventListener('abort',stop,{once:true});
  try{
   const reply=await engine.chat.completions.create({messages:[{role:'system',content:input.synthesis?synthesisInstructions():compactInstructions()},...(input.synthesis?[]:EXAMPLES),{role:'user',content:planText(input)}],response_format:{type:'grammar',grammar:input.synthesis?GRAMMAR.synthesis:GRAMMAR.plan},temperature:0,max_tokens:input.synthesis?200:260,extra_body:{enable_thinking:false}});
   signal?.throwIfAborted();const choice=reply.choices[0];if(choice.finish_reason==='length')throw Error('On-device model output was truncated');
   // Qwen3 emits an empty think block before the constrained output when thinking is disabled.
   const plan=JSON.parse(choice.message.content.replace(/^\s*<think>[\s\S]*?<\/think>\s*/,''));last={usage:reply.usage};
   if(input.synthesis&&input.allowed_citations)plan.citations=plan.citations.filter(id=>input.allowed_citations.includes(id));validate(plan,schema,'plan');for(const c of plan.calls)validate(c.arguments,TOOLS[c.name].schema);
   return plan;
  }finally{signal?.removeEventListener('abort',stop);}
 }
 // One inference at a time; a new request waits for the previous one instead of interleaving in the worker.
 const model=(input,options)=>{const next=queue.then(()=>infer(input,options));queue=next.catch(()=>{});return next;};
 return {model,modelId,label:BROWSER_MODELS[modelId].label,loadMs,get lastUsage(){return last?.usage||null;},async unload(){await engine.unload().catch(()=>{});worker.terminate();}};
}
