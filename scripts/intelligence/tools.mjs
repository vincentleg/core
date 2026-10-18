import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { compare } from '../../src/urban/model.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const readCatalog=()=>JSON.parse(fs.readFileSync('data/urban/catalog.json','utf8'));
const streetsURL='https://data.sf.gov/resource/3psu-pn9h.json?$query='+encodeURIComponent("SELECT cnn, streetname, f_st, t_st, active, line WHERE streetname = 'FOLSOM' AND active = true LIMIT 100");
const housingURL='https://data.sf.gov/resource/xdht-4php.json?$query='+encodeURIComponent("SELECT analysis_neighborhood AS neighborhood, sum(net_units_completed) AS net_units WHERE first_completion_date >= '2015-01-01' GROUP BY neighborhood ORDER BY net_units DESC LIMIT 100");
export function sources(catalog){return catalog.sources.map(s=>({...s,mode:'snapshot',path:({'sf-streets':'data/sf/corridor.geojson','sf-housing':'data/sf-housing/production-by-neighborhood.json','osm-walk':'data/osm/walk-network.json'})[s.id]})).concat([{...catalog.sources.find(s=>s.id==='sf-housing'),id:'sf-housing-refresh',mode:'external',url:housingURL,observationPeriod:'since 2015; incomplete current year',limitations:'Aggregated completions do not measure traffic, housing need or affordability; not Bay Area-wide.'},{...catalog.sources.find(s=>s.id==='sf-streets'),id:'sf-streets-refresh',mode:'external',url:streetsURL,observationPeriod:'administrative records as retrieved; not measured traffic',limitations:'Mapped centerlines, not observed vehicle demand or signal timing.'}]);}
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
    const regions=fs.existsSync('data/intelligence/regions.json')?JSON.parse(fs.readFileSync('data/intelligence/regions.json')).regions:[];
    return {municipalities:regions.map(r=>({name:r.name,geoid:r.geoid})),mappedApproaches:catalog.segments.map(s=>({id:s.id,label:s.label,lengthM:s.lengthM,source:s.source})),simulationScope:'SF mapped approach only; no validated forecast. Geometry and responsibilities are not citywide measurement coverage.'};
  }
  if(name==='calculate_scenarios'){
    const segment=catalog.segments.find(s=>s.id===args.segment);if(!segment)throw Error('Unknown supported approach');
    const result=compare({scenarios:args.scenarios},segment);
    return {model:'core-fluid-queue-1',segment:segment.id,request:{scenarios:args.scenarios},calibrated:false,inputs:'All traffic inputs are explicit assumptions; mapped geometry only is sourced.',result,impact:'No real-world impact measured',limits:'No network assignment, turning traffic, spillback, transit or pedestrian effects. Do not transfer results to another city.'};
  }
  if(name==='inspect_findings')return {findings:state.findings,tasks:state.tasks.map(t=>({id:t.id,agent:t.agent,role:t.role,status:t.status,goal:t.goal,output:t.output}))};
  throw Error('Unknown or unauthorized tool');
}
export const TOOL_HELP=`discover_sources {} lists approved data. retrieve_source {source:ID} retrieves the actual dataset. validate_evidence {} checks retrieved metadata and reports missing measurements. geographic_context {} lists mapped segment IDs and geography. calculate_scenarios {segment:ID,scenarios:[{name,parameters:{demand,lanes,saturation,green,cycle,seconds,speed}},...]} executes 2–4 scenarios; defaults to USE AS ASSUMPTIONS: demand=900, lanes=2, saturation=1600, green=0.45, cycle=90, seconds=900, speed=30. Change parameters to test alternatives, not to predetermine a winner. inspect_findings {} reads shared work. delegate {role,goal,agent?:ID} queues a child task. finish {claims:[{text,cites:[findingID]}],uncertainty:[text],next:text,review?:'accept'|'reject'} submits an evidence-linked output; review belongs only to reviewer. Every factual sentence needs a finding citation. A reviewer can reject and delegate corrections before finishing.`;
