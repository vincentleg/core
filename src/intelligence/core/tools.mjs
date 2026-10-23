import {coordinates,distance,normal,searchPlaces,searchAgents,evidenceFor,mentions} from './catalog.mjs';
import {RELATIONAL,navigationQuery,coordinatePair} from './lexicon.mjs';
import {T} from '../../i18n/i18n.mjs';
export {RELATIONAL,navigationQuery,coordinatePair};
const text={type:'string',minLength:1,maxLength:240};
const object=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const place={place_id:text},agent={agent_id:text};
export const TOOLS={
 search_places:{description:'Find verified places by name. city restricts the city; ambiguous results need clarification.',schema:object({query:text,city:text},['query'])},
 resolve_location:{description:'Inspect a returned place ID; never invent coordinates.',schema:object(place)},
 fly_to_place:{description:'Move the actual Earth camera to a resolved place. $location means the last unambiguous location.',schema:object(place)},
 fly_to_coordinates:{description:'Move only to coordinates matching an already resolved place ID.',schema:object({...place,coordinates:{type:'array',items:{type:'number'},minItems:2,maxItems:2}})},
 zoom_to_area:{description:'Frame a resolved geographic area.',schema:object(place)},
 highlight_geographic_feature:{description:'Highlight a resolved place on the map.',schema:object(place)},
 search_agents:{description:'Search actual registry domains, roles, city, recorded tasks and source/tool terms. No identities are currently executing. Return a ranked small list.',schema:object({query:text,city:text,recorded_only:{type:'boolean'},nearest:{type:'boolean'},within_results:{type:'boolean'},status:{type:'string',enum:['registered','recorded','currently-executing']}},[])},
 show_nearby_agents:{description:'Search agents near the resolved location or current map. Same filters as search_agents.',schema:object({query:text,city:text,recorded_only:{type:'boolean'}},[])},
 filter_agents_by_location:{description:'Filter real agents by a municipality.',schema:object({city:text})},
 select_agent:{description:'Navigate, highlight and open a real returned agent; $best_agent means the best ranked returned match.',schema:object(agent)},
 follow_agent:{description:'Follow the returned agent visual position, not an inference worker.',schema:object(agent)},
 retrieve_evidence:{description:'Retrieve actual completed task records, claims and limitations for the selected agent, or the recorded investigation. Use all:true for the whole recorded investigation only when agent_id is omitted; an explicit agent_id always narrows scope.',schema:object({agent_id:text,all:{type:'boolean'}},[])},
 inspect_selected_problem:{description:'Read the actual problem selected on the Earth map, with status and source record.',schema:object({})},
 show_sources:{description:'Show actual source links for the current investigation.',schema:object({})},
 lookup_core_knowledge:{description:'Retrieve public facts about CORE, plans, pricing, methodology, available/planned/long-term capabilities.',schema:object({query:text})},
 restore_previous_view:{description:'Restore the previous camera view.',schema:object({})}
};
export const PLAN_SCHEMA=object({calls:{type:'array',maxItems:4,items:object({name:{type:'string',enum:Object.keys(TOOLS)},arguments:{type:'object'}})},message:{type:'string',maxLength:1600},citations:{type:'array',maxItems:12,items:{type:'string',maxLength:200}}});
// The decoding grammar restricts each tool's reference types before deterministic execution checks them again.
export function planningSchema(context={}){
 const schema=structuredClone(PLAN_SCHEMA),placeIds=['$location',context.location?.id].filter(Boolean),agentIds=['$best_agent','$selected_agent',context.agent?.id,...(context.results||[]).map(a=>a.id)].filter(Boolean);
 schema.properties.calls.items={anyOf:Object.entries(TOOLS).map(([name,tool])=>{
  const args=structuredClone(tool.schema);
  if(args.properties.place_id)args.properties.place_id.enum=[...new Set(placeIds)];
  if(args.properties.agent_id)args.properties.agent_id.enum=[...new Set(agentIds)];
  return object({name:{type:'string',enum:[name]},arguments:args});
 })};return schema;
}
export function validate(value,schema,path='arguments'){
 if(schema.anyOf){for(const option of schema.anyOf)try{return validate(value,option,path);}catch{}throw Error(path+': no permitted tool signature');}
 if(schema.type==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error(path+': object required');
  if(schema.additionalProperties===false&&Object.keys(value).some(k=>!Object.hasOwn(schema.properties,k)))throw Error(path+': unknown field');
  for(const k of schema.required||[])if(!Object.hasOwn(value,k))throw Error(path+': missing '+k);
  for(const [k,v]of Object.entries(value))if(schema.properties?.[k])validate(v,schema.properties[k],path+'.'+k);
 }else if(schema.type==='array'){
  if(!Array.isArray(value)||value.length<(schema.minItems||0)||value.length>(schema.maxItems??100))throw Error(path+': invalid array');
  value.forEach((v,i)=>validate(v,schema.items,path+'.'+i));
 }else if(typeof value!==schema.type||schema.type==='number'&&!Number.isFinite(value))throw Error(path+': invalid '+schema.type);
 if(schema.enum&&!schema.enum.includes(value))throw Error(path+': invalid choice');
 if(typeof value==='string'&&(value.length<(schema.minLength||0)||value.length>(schema.maxLength??2000)))throw Error(path+': invalid string length');
 return value;
}
const summary=a=>({id:a.id,code:a.code,name:a.name,role:a.role,domain:a.domain,city:a.geography,coordinates:a.assignment,identity:'registered',taskStatus:a.recorded?'recorded work':'idle identity',worker:'offline',recorded:a.recorded,match:a.match,distanceM:a.distance==null?null:Math.round(a.distance)});
export function createTools({catalog,map,geocode=null,state}){
 const known=new Map(catalog.places.map(p=>[p.id,p]));
 const assertCity=city=>{if(RELATIONAL.test(normal(state.query)))return;const mentioned=catalog.cities.filter(p=>mentions(normal(state.query),p));if(mentioned.length&&!mentioned.some(p=>normal(p.city)===normal(city)))throw Error('Destination conflicts with the explicitly requested municipality');};
 const getPlace=id=>{
  let p=known.get(id==='$location'?state.location?.id:id);
  if(!p){const exact=[...known.values()].filter(p=>[p.name,p.name+' '+p.city,...(p.aliases||[])].some(alias=>normal(alias)===normal(id)));if(exact.length===1)p=exact[0];}
  if(!p||!coordinates(p.coordinates))throw Error('Resolve a verified location before navigation');assertCity(p.city);return p;
 };
 const getAgent=id=>{const wanted=id==='$best_agent'?state.results[0]?.id:id==='$selected_agent'?state.agent?.id:id;const a=catalog.agents.find(a=>a.id===wanted);if(!a||!state.results.some(r=>r.id===a.id)&&state.agent?.id!==a.id)throw Error('Search for a matching real agent first');return a;};
 const findAgents=async(args,nearby=false)=>{
  if(args.status==='currently-executing')return {agents:[],text:T('No verified currently executing worker. Registered identities and recorded work remain available.','Aucun travailleur actif vérifié. Les affectations et travaux enregistrés restent consultables.',state.language)};
  const near=state.location?.coordinates||map.center();
  const city=args.city||state.location?.city||'';
  const all=searchAgents(catalog,{...args,recorded_only:args.recorded_only||args.status==='recorded',city,near:nearby||args.nearest?near:null,ids:args.within_results?state.results.map(a=>a.id):null});
  if(args.nearest||nearby)all.sort((a,b)=>(a.distance??0)-(b.distance??0)||b.score-a.score);
  state.results=all.slice(0,5).map(summary);await map.markAgents(state.results);
  if(args.within_results&&!all.length){state.results=[];await map.markAgents([]);return {agents:[],total:0,text:T('None of the agents shown has a completed investigation recorded.','Aucun des agents affichés n’a d’enquête terminée enregistrée.',state.language)};}
  return {agents:state.results,total:all.length,ranking:args.nearest||nearby?'distance to current reference, within matching role/city':'registry relevance, recorded work, stable identity',text:T(`${all.length} matching registered assignments; no hosted AI worker is active.`,`${all.length} affectations correspondantes ; aucun travailleur IA hébergé actif.`,state.language)};
 };
 return async function execute(name,args,{signal}={}){
  if(!Object.hasOwn(TOOLS,name))throw Error('Unknown tool');validate(args,TOOLS[name].schema);signal?.throwIfAborted();
  if(name==='search_places'){
   // A query that is itself a municipality ("Oakland") is the destination; a stray city filter must not erase it.
   const named=catalog.cities.find(c=>normal(c.city)===normal(args.query));let r=searchPlaces(catalog,args.query,named?'':args.city);
   const pair=coordinatePair(args.query);
   if(pair&&JSON.stringify(pair)!==JSON.stringify(coordinatePair(state.query)))throw Error('Coordinates must be explicitly supplied in the request');
   if(!pair&&(!r.places.length||r.fuzzy||r.partial)&&geocode){
    // At planetary zoom, use the published corridor as soft context, not an arbitrary continent-center city.
    const bias=map.zoom?.()<6&&!state.location?catalog.cities.find(c=>c.city===catalog.homeCity)?.coordinates||map.center():map.center(),near=coordinates(bias)?catalog.cities.filter(c=>distance(c.coordinates,bias)<50000).sort((a,b)=>distance(a.coordinates,bias)-distance(b.coordinates,bias))[0]:null;
    const explicit=catalog.cities.find(c=>mentions(normal(args.query),c));
    let external;try{external=await geocode(navigationQuery(args.query),{city:args.city||explicit?.city||'',contextCity:explicit?.city||near?.city||state.location?.city||catalog.homeCity||'',bias,language:state.language,signal});}catch(e){if(signal?.aborted)throw e;external={places:[],ambiguous:false,reason:/limit/.test(e.message)?'rate':'unavailable'};}
    if(external.places.length||!r.places.length||r.partial)r=external;
   }
   for(const p of r.places){if(!coordinates(p.coordinates))throw Error('Invalid geocoder coordinates');known.set(p.id,p);}
   if(r.ambiguous){state.clarification=true;return {...r,text:T('Which place do you mean? These references are ambiguous; the camera has not moved.','Quel lieu voulez-vous ? Les références sont ambiguës ; la caméra n’a pas bougé.',state.language)};}
   if(r.places.length===1)state.location=r.places[0];
   return {...r,text:r.reason==='unavailable'||r.reason==='rate'?T('External place search is unavailable or rate-limited. Wait a minute and retry, or refine the place and city. The camera has not moved.','La recherche externe est indisponible ou limitée. Attendez une minute puis réessayez, ou précisez le lieu et la ville. La caméra n’a pas bougé.',state.language):r.reason==='consent'?T('This place is not in the offline index. Allow Photon/komoot place search in AI and privacy settings, then retry; text chat still works.','Ce lieu n’est pas dans l’index hors ligne. Autorisez Photon/komoot dans les réglages IA et confidentialité, puis réessayez ; le chat écrit fonctionne toujours.',state.language):r.places.length?(T('Location resolved from geographic records.','Lieu résolu à partir de données géographiques.',state.language)):(T('No verified location found. Specify the city or enable external place search.','Aucun lieu vérifié. Précisez la ville ou activez la recherche géographique externe.',state.language))};
  }
  if(name==='resolve_location'){const p=getPlace(args.place_id);state.location=p;return {place:p};}
  if(['fly_to_place','fly_to_coordinates','zoom_to_area','highlight_geographic_feature'].includes(name)){
   if(state.clarification)throw Error('Clarification required before moving the camera');const p=getPlace(args.place_id);
   if(name==='fly_to_coordinates'&&(!coordinates(args.coordinates)||distance(args.coordinates,p.coordinates)>2))throw Error('Coordinates do not match resolved evidence');
   if(name==='highlight_geographic_feature'){await map.highlight(p);return {place:p,text:T('Destination highlighted.','Destination mise en évidence.',state.language)};}
   await map.fly(p,{signal});await map.highlight(p);state.location=p;
   return {place:p,navigated:true,text:T(`The camera reached ${p.name} (${p.city}).`,`La caméra a atteint ${p.name} (${p.city}).`,state.language)};
  }
  if(name==='search_agents'||name==='show_nearby_agents')return findAgents(args,name==='show_nearby_agents');
  if(name==='filter_agents_by_location')return findAgents(args);
  if(name==='select_agent'||name==='follow_agent'){
   if(state.clarification)throw Error('Clarification required');const a=getAgent(args.agent_id);assertCity(a.geography);await map.selectAgent(a,{signal,follow:name==='follow_agent'});state.agent=a;state.location={id:'assignment:'+a.id,city:a.geography,coordinates:a.assignment,name:a.geography};known.set(state.location.id,state.location);
   return {agent:summary(a),navigated:true,text:T(`Camera on ${a.code}, ${a.domain}, ${a.geography}. ${a.recorded?'Recorded work is available.':'No completed investigation is recorded for this identity.'}`,`Caméra sur ${a.code}, ${a.domain}, ${a.geography}. ${a.recorded?'Travail enregistré disponible.':'Aucune enquête terminée enregistrée pour cette identité.'}`,state.language)};
  }
  if(name==='retrieve_evidence'){
   const id=args.agent_id==='$selected_agent'?state.agent?.id:args.agent_id||(args.all?null:state.agent?.id);
   if(id&&!catalog.agents.some(a=>a.id===id))throw Error('Unknown agent');
   const claims=evidenceFor(catalog,id),accepted=claims.filter(c=>!c.flagged);state.evidence=accepted.slice(0,12);
   const tasks=catalog.work.run.tasks.filter(t=>(!id||t.agent===id)&&t.status==='completed').map(t=>({id:t.id,agent:t.agent,role:t.role,status:t.status,completed:t.completed,tools:catalog.work.events.filter(e=>e.task===t.id&&e.kind==='tool_completed').map(e=>e.tool)}));
   const references=new Set(accepted.flatMap(c=>c.cites||[]));const sources=catalog.work.run.findings.filter(f=>references.has(f.id)).map(f=>({id:f.id,href:f.output?.url||'data/intelligence/work.json',text:f.id+' · '+f.tool+' · recorded tool output'}));
   // With nothing recorded for this identity, name real identities that do have completed work instead of borrowing theirs.
   const target=id&&catalog.agents.find(a=>a.id===id),alternatives=target&&!accepted.length?catalog.agents.filter(a=>a.recorded&&a.id!==id).sort((a,b)=>Number(b.geography===target.geography)-Number(a.geography===target.geography)||a.id.localeCompare(b.id)).slice(0,3).map(summary):[];
   const list=alternatives.map(a=>`${a.code} (${a.domain}, ${a.city})`).join(', ');
   const none=(target?T(`No completed investigation is recorded for ${target.code}.`,`Aucune enquête terminée n’est enregistrée pour ${target.code}.`,state.language):T('No completed findings are recorded for this selection.','Aucun résultat terminé enregistré pour cette sélection.',state.language))+(alternatives.length?' '+T(`Recorded work exists for ${list}.`,`Travaux enregistrés disponibles : ${list}.`,state.language):'');
   return {evidence:state.evidence,tasks,sources,alternatives,excludedScopeClaims:claims.filter(c=>c.flagged).length,limitations:T('Recorded investigation; exploratory uncalibrated calculations, no measured real-world effect or validated transfer between cities.','Enquête enregistrée, calculs exploratoires non calibrés, aucun effet réel mesuré ni transfert intercommunal validé.',state.language),text:accepted.length?(T(`${accepted.length} recorded model claims${target?' for '+target.code:''}; inspect sources and limitations.`,`${accepted.length} constats enregistrés par le modèle${target?' pour '+target.code:''} ; consultez les sources et les limites.`,state.language)):none};
  }
  if(name==='inspect_selected_problem'){
   const p=map.problem?.();if(!p)return {text:T('No problem is selected on the map.','Aucun problème sélectionné sur la carte.',state.language),evidence:[]};
   const evidence=[{id:p.id,text:JSON.stringify(p),href:'data/problems/registry.json'}];state.evidence=evidence;return {problem:p,evidence,text:T('Selected problem and registry status, without an additional diagnosis.','Problème sélectionné et statut du registre, sans diagnostic supplémentaire.',state.language)};
  }
  if(name==='show_sources'){
   const sources=[...catalog.urban.sources.map(s=>({id:s.id,href:s.url,text:s.publisher+' · '+s.limitations})),...catalog.work.run.findings.filter(f=>f.output?.url).map(f=>({id:f.id,href:f.output.url,text:f.output.publisher||f.tool}))].filter(s=>/^https:\/\//.test(s.href));state.sources=sources;return {sources,text:T('Actual dossier sources; their presence does not validate the calculations.','Sources réelles du dossier ; leur présence ne valide pas les calculs.',state.language)};
  }
  if(name==='lookup_core_knowledge'){
   const stop=new Set(['what','which','can','does','this','that','why','would','how','the','are','core','est','les','des','que','quel','quelle','pourquoi','comment','faire','por','para','los','las','una','und','der','die','das','warum','wie','was','ist','uma','dos','das','porque','como']);const q=normal(args.query),han=[...q.matchAll(/[\u3400-\u9fff]{2}/gu)].map(m=>m[0]);const words=[...q.split(' ').filter(w=>!/[\u3400-\u9fff]/.test(w)&&(w.length>2||/^\d+$/.test(w))&&!stop.has(w)),...han];const ranked=catalog.knowledge.map(k=>({...k,score:words.filter(w=>normal(k.en+' '+k.fr+' '+T(k.en,k.fr,state.language)).includes(w)).length||(!words.length&&/\bcore\b/.test(q)&&k.id==='core-now'?1:0)})).sort((a,b)=>b.score-a.score);const evidence=ranked.filter(k=>k.score>0).slice(0,4).map(k=>({id:k.id,text:T(k.en,k.fr,state.language),href:k.href}));state.evidence=evidence;return {evidence,text:evidence.length?evidence.slice(0,2).map(e=>e.text).join('\n'):(T('No indexed fact answers this request. Conversational AI is offline.','Aucun fait indexé ne répond à cette demande. L’IA conversationnelle est hors ligne.',state.language)+' '+T('Try “Take me to Oakland”, “Find an energy agent” or ask about CORE. General generative answers require optional Advanced AI.','Essayez « Emmène-moi à Oakland », « Trouve un agent énergie » ou posez une question sur CORE. Les réponses génératives générales nécessitent l’IA avancée facultative.',state.language))};
  }
  if(name==='restore_previous_view'){await map.restore({signal});return {navigated:true,text:T('Previous view restored.','Vue précédente restaurée.',state.language)};}
 };
}
