import fs from 'node:fs';
export const DOMAINS=['mobility','housing','infrastructure','energy','water','climate','public-safety','economic-development','public-transport','urban-planning','environment','cross-domain'];
export const FUNCTIONS=['discovery','evidence','geography','quantitative','reviewer','reporter','analyst'];
export const TOOLS=['discover_sources','retrieve_source','validate_evidence','geographic_context','calculate_scenarios','inspect_findings','delegate','finish'];
export function registry(catalog,regions=[{name:'San Francisco',center:[-122.405,37.776],weight:1}]) {
  const total=regions.reduce((n,r)=>n+r.weight,0),slots=regions.map(r=>({...r,count:Math.floor(500*r.weight/total)}));
  for(let n=slots.reduce((n,r)=>n+r.count,0),i=0;n<500;n++,i++)slots[i%slots.length].count++;
  const locations=slots.flatMap(r=>Array.from({length:r.count},(_,local)=>({...r,local,count:r.count})));
  if(catalog.agents.length!==500)throw Error('Expected 500 stable identities');
  return catalog.agents.map((a,i)=>{const domain=DOMAINS[i>=1&&i<=12?i-1:i%DOMAINS.length],r=locations[i],role=i===0?'planner':i<=12?'supervisor':FUNCTIONS[(i-13)%FUNCTIONS.length];return{
    id:a.id,code:a.code,startNode:r.nodes?.[Math.floor(r.local*r.nodes.length/r.count)],name:`${r.name} · ${domain} · ${role}`,role,domain,geography:r.name,assignment:r.center,
    mission:`Investigate ${domain} questions in ${r.name}; identify evidence, uncertainty and validation needs.`,
    goals:['Use authorized sources','Share findings','Preserve uncertainty and human authority'],
    tools:TOOLS.filter(t=>t!=='delegate'||['planner','supervisor','reviewer'].includes(role)),team:domain,supervisor:i===0?null:catalog.agents[i<=12?0:1+DOMAINS.indexOf(domain)].id,
    memory:[],history:[],outputs:[],status:'idle',lastExecution:null
  };});
}
