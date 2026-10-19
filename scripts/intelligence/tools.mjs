import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { compare, DEFAULT } from '../../src/urban/model.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const readCatalog=()=>JSON.parse(fs.readFileSync('data/urban/catalog.json','utf8'));
const streetsURL='https://data.sf.gov/resource/3psu-pn9h.json?$query='+encodeURIComponent("SELECT cnn, streetname, f_st, t_st, active, line WHERE streetname = 'FOLSOM' AND active = true LIMIT 100");
const housingURL='https://data.sf.gov/resource/xdht-4php.json?$query='+encodeURIComponent("SELECT analysis_neighborhood AS neighborhood, sum(net_units_completed) AS net_units WHERE first_completion_date >= '2015-01-01' GROUP BY neighborhood ORDER BY net_units DESC LIMIT 100");
export function sources(catalog){return catalog.sources.map(s=>({...s,mode:'snapshot',path:({'sf-streets':'data/sf/corridor.geojson','sf-housing':'data/sf-housing/production-by-neighborhood.json','osm-walk':'data/osm/walk-network.json'})[s.id]})).concat([{...catalog.sources.find(s=>s.id==='sf-housing'),id:'sf-housing-refresh',mode:'external',url:housingURL,observationPeriod:'since 2015; incomplete current year',limitations:'Aggregated completions do not measure traffic, housing need or affordability; not Bay Area-wide.'},{...catalog.sources.find(s=>s.id==='sf-streets'),id:'sf-streets-refresh',mode:'external',coverage:'Folsom Street, San Francisco; query limited to 100 active centerlines',url:streetsURL,observationPeriod:'administrative records as retrieved; not measured traffic',limitations:'Mapped centerlines, not observed vehicle demand or signal timing.'}]);}
export async function boundedJSON(url,fetchImpl=fetch,maxBytes=1500000){
  const response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'CORE-local-research/9.6 (+https://github.com/vincentleg/core)'}});
  if(!response.ok)throw Error(`Source HTTP ${response.status}`);
  let size=0;const chunks=[];for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Error('Source exceeds byte budget');chunks.push(chunk);}
  const body=Buffer.concat(chunks);return {data:JSON.parse(body),sha256:sha(body)};
}
export async function tool(name,args,state,{catalog,fetchImpl=fetch}={}){
  const list=sources(catalog);
  if(name==='discover_sources')return {sources:list.map(({path,...s})=>s),scope:'Approved catalog only; no unrestricted web crawl. Oakland and other Bay Area feeds are not yet integrated.'};
  if(name==='retrieve_source'){
    const source=list.find(s=>s.id===args.source);if(!source)throw Error('Source not authorized');
    let result;
    if(source.mode==='external')result=await boundedJSON(source.url,fetchImpl);
    else {const body=fs.readFileSync(source.path);if(sha(body)!==source.sha256)throw Error('Snapshot integrity mismatch');result={data:JSON.parse(body),sha256:sha(body)};}
    // Retain only authorized aggregated data or a bounded geometric summary in shared findings.
    const data=source.id==='osm-walk'?{stats:result.data.stats,scope:result.data.scope,validation:result.data.validation}:source.id==='sf-streets'?{type:result.data.type,features:result.data.features.map(f=>({properties:f.properties,geometry:f.geometry}))}:result.data;
    return {source:source.id,publisher:source.publisher,url:source.url,license:source.license,coverage:source.coverage,observationPeriod:source.observationPeriod,retrieved:source.mode==='external'?new Date().toISOString():source.retrieved,accessed:new Date().toISOString(),snapshotRetrieved:source.retrieved,sha256:result.sha256,units:source.units,limitations:source.limitations,data};
  }
  if(name==='validate_evidence'){
    const records=state.findings.filter(f=>f.tool==='retrieve_source');
    if(!records.length)throw Error('Retrieve source evidence first');
    return {checked:records.map(f=>({id:f.id,provenanceComplete:['publisher','url','license','coverage','observationPeriod','retrieved','sha256','units','limitations'].every(k=>!!f.output[k]),coverage:f.output.coverage,period:f.output.observationPeriod})),missing:['Observed traffic counts','Authorized signal plans','Calibration','Independent review','Equivalent Oakland evidence'],meaning:'Metadata and checksum checks only; not verification of all source claims or field conditions.'};
  }
  if(name==='geographic_context'){
    const geography=fs.existsSync('data/intelligence/regions.json')?JSON.parse(fs.readFileSync('data/intelligence/regions.json')):{regions:[]};const regions=geography.regions;
    return {boundarySource:geography.source,municipalities:regions.map(r=>({name:r.name,geoid:r.geoid})),mappedApproaches:catalog.segments.map(s=>({id:s.id,label:s.label,lengthM:s.lengthM,source:s.source})),simulationScope:'SF mapped approach only; no validated forecast. Geometry and responsibilities are not citywide measurement coverage.'};
  }
  if(name==='calculate_scenarios'){
    const segment=catalog.segments.find(s=>s.id===args.segment);if(!segment)throw Error('Unknown supported approach. Call geographic_context and use a mappedApproaches id, not a street name or an unlisted CNN.');
    if(!Array.isArray(args.scenarios))throw Error('Scenarios required');
    const scenarios=args.scenarios.map(s=>{if(!s.parameters||typeof s.parameters!=='object'||Array.isArray(s.parameters)||Object.keys(s.parameters).some(k=>!(k in DEFAULT)))throw Error('Unknown scenario parameter');return {...s,parameters:{...DEFAULT,...s.parameters}};});
    const result=compare({scenarios},segment);
    return {model:'core-fluid-queue-1',segment:segment.id,request:{scenarios},assumedDefaults:args.scenarios.map(s=>({name:s.name,parameters:Object.keys(DEFAULT).filter(k=>!(k in s.parameters))})),calibrated:false,inputs:'All traffic inputs are explicit assumptions; mapped geometry only is sourced.',result,impact:'No real-world impact measured',limits:'No network assignment, turning traffic, spillback, transit or pedestrian effects. Do not transfer results to another city.'};
  }
  if(name==='inspect_findings')return {findings:state.findings,tasks:state.tasks.map(t=>({id:t.id,agent:t.agent,role:t.role,status:t.status,goal:t.goal,output:t.output}))};
  throw Error('Unknown or unauthorized tool');
}
export const TOOL_HELP=`discover_sources {} lists approved data. retrieve_source {source:ID} retrieves the actual dataset. validate_evidence {} checks retrieved metadata and reports missing measurements. geographic_context {} lists mapped segment IDs and geography. calculate_scenarios {segment:ID,scenarios:[{name,parameters:{demand,lanes,saturation,green,cycle,seconds,speed}},...]} executes 2–4 scenarios. Supply only changed parameter overrides (baseline parameters:{}). Omitted parameters use these explicit ASSUMPTIONS: demand=900, lanes=2, saturation=1600, green=0.45, cycle=90, seconds=900, speed=30. Change parameters to test alternatives, not to predetermine a winner. inspect_findings {} reads shared work. delegate {role,goal,geography?:municipality} queues a child task. finish {claims:[{text,cites:[findingID]}],uncertainty:[text],next:text,review?:'accept'|'reject'} submits an evidence-linked output; review belongs only to reviewer. Every factual sentence needs a finding citation. A reviewer can reject and delegate corrections before finishing.`;

// Compact actual tool results for inference; full outputs remain in the durable audit record.
export function contextOutput(name,out){
 if(name==='discover_sources')return {...out,sources:out.sources.map(({id,publisher,mode,coverage,limitations})=>({id,publisher,mode,coverage,limitations}))};
 if(name==='retrieve_source'){const {data,...meta}=out;return {...meta,recordCount:Array.isArray(data)?data.length:data.features?.length,sample:Array.isArray(data)?data.slice(0,4).map(({line,...r})=>r):data.features?.slice(0,3).map(f=>f.properties)||data,sampleOnly:true};}
 if(name==='geographic_context')return {...out,boundarySource:out.boundarySource?{publisher:out.boundarySource.publisher,observationPeriod:out.boundarySource.observationPeriod,limitations:out.boundarySource.limitations}:undefined,mappedApproaches:out.mappedApproaches.slice(0,4),approachCount:out.mappedApproaches.length,sampleOnly:true};
 if(name==='calculate_scenarios')return {...out,result:{best:out.result.best,verdict:out.result.verdict,rows:out.result.rows.map(r=>({name:r.name,metrics:r.metrics,delta:r.delta}))}};
 if(name==='inspect_findings')return {tasks:out.tasks,findings:out.findings.map(f=>({id:f.id,tool:f.tool,output:contextOutput(f.tool,f.output)}))};
 return out;
}
// A bounded catalog cannot establish universal absence; retain model text, flag it for human review.
export function scopeFlags(claims){return [...new Set(claims.filter(c=>/no (?:existing )?(?:evidence|studies)|no .*studies have/i.test(c.text)).map(c=>c.text))].map(text=>({text,reason:'The authorized catalog cannot establish absence of evidence or studies outside its coverage.'}));}
