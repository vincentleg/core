import { compare, digest, VERSION, REFERENCE } from './model.mjs';
export const ROLES = ['Data discovery', 'Data validation', 'Geographic analysis', 'Baseline analysis', 'Scenario parameters', 'Simulation', 'Comparison', 'Risk review', 'Evidence review', 'Report'];
export async function execute(catalog, request, notify = async () => {}) {
  if (!catalog || catalog.version !== 'core-urban-1' || !Array.isArray(catalog.sources)) throw Error('Unknown data catalog');
  if(!Array.isArray(catalog.taskAgents)||catalog.taskAgents.length!==10||new Set(catalog.taskAgents).size!==10||catalog.taskAgents.some(id=>!catalog.agents.some(a=>a.id===id)))throw Error('Invalid specialist assignments');
  const segment = catalog.segments.find(s=>s.id===request.segment);
  if (!segment) throw Error('Area unavailable: additional calibration required');
  const id = crypto.randomUUID(), created = new Date().toISOString(), start = performance.now();
  const tasks = ROLES.map((role,i)=>({id:`${id}:${i}`,role,agent:catalog.taskAgents[i],status:'queued',started:null,completed:null,output:null}));
  await notify({type:'queued',id,created,tasks:structuredClone(tasks)});
  let result, baseline, fingerprint;
  for (let i=0;i<tasks.length;i++) {
    const t=tasks[i];t.status='working';t.started=new Date().toISOString();const begin=performance.now();await notify({type:'task',id,task:{...t}});
    try {
      if(i===0)t.output={sources:catalog.sources.map(s=>s.id),freshness:'dated snapshots; not live feeds'};
      if(i===1){ for(const s of catalog.sources)if(!s.publisher||!s.url||!s.license||!s.coverage||!s.observationPeriod||!s.units||!s.updateFrequency||!s.limitations||!Number.isFinite(Date.parse(s.retrieved)))throw Error('Missing provenance'); t.output={validated:catalog.sources.length,missingTrafficCounts:true,missingSignalPlans:true}; }
      if(i===2)t.output={segment:segment.id,lengthM:segment.lengthM,source:segment.source,coverage:'mapped approach only'};
      if(i===3){baseline=compare({scenarios:[request.scenarios[0],request.scenarios[0]]},segment).rows[0].metrics;t.output=baseline;}
      if(i===4)t.output={parameters:request.scenarios,origin:'user-supplied assumptions, not observations'};
      if(i===5){result=compare(request,segment);t.output=result;}
      if(i===6)t.output={best:result.best,verdict:result.verdict};
      if(i===7)t.output={sensitivity:'demand ×0.8 and ×1.2, capped at 8,000 veh/h; not a confidence interval',limits:['Uncalibrated uniform-arrival fluid queue','No turns, spillback, pedestrian or transit effects','Delay accrued within the finite horizon; residual queues are censored','More green may disadvantage unmodeled cross-street traffic','Storage uses an assumed 7.5 m per vehicle']};
      if(i===8){fingerprint=await digest({model:VERSION,segment,request,sources:catalog.sources});t.output={fingerprint,observed:['mapped geometry only'],assumed:'all traffic demand, saturation, lanes, timings, speed and horizon',reference:REFERENCE};}
      if(i===9)t.output={next:'Collect authorized traffic counts and signal timings, calibrate and independently review before any intervention. Human authorization required.',impact:'No real-world impact measured'};
      t.status='completed';t.completed=new Date().toISOString();t.durationMs=performance.now()-begin;
      await notify({type:'task',id,task:{...t}});
    } catch(error){t.status='unavailable';t.error=String(error.message);await notify({type:'task',id,task:{...t}});throw error;}
  }
  return {id,created,completed:new Date().toISOString(),durationMs:performance.now()-start,model:VERSION,segment,request,fingerprint,sources:catalog.sources,result,tasks,calibrated:false,worker:'one bounded deterministic worker; no LLM',report:tasks[9].output};
}
export async function verifyReport(report,catalog) {
  if(!report||report.model!==VERSION||report.calibrated!==false||!Array.isArray(report.tasks)||report.tasks.length!==ROLES.length||report.tasks.some(t=>t.status!=='completed'||!Number.isFinite(Date.parse(t.completed))))throw Error('Incomplete or unknown run');
  const segment=catalog.segments.find(s=>s.id===report.request?.segment);if(!segment)throw Error('Unknown run geography');
  if(JSON.stringify(report.sources)!==JSON.stringify(catalog.sources)||JSON.stringify(report.segment)!==JSON.stringify(segment)||!Number.isFinite(report.durationMs)||report.durationMs<0)throw Error('Invalid provenance or duration');
  if(!Number.isFinite(Date.parse(report.created))||!Number.isFinite(Date.parse(report.completed))||Date.parse(report.completed)<Date.parse(report.created))throw Error('Invalid run timestamps');
  if(report.tasks.some((t,i)=>t.role!==ROLES[i]||t.agent!==catalog.taskAgents[i]||t.id!==`${report.id}:${i}`||t.output==null||!Number.isFinite(Date.parse(t.started))||!Number.isFinite(t.durationMs)||t.durationMs<0||Date.parse(t.completed)<Date.parse(t.started)))throw Error('Invalid task ownership or history');
  const recalculated=await execute(catalog,report.request);
  const expected=recalculated.fingerprint;
  if(report.fingerprint!==expected||JSON.stringify(report.result)!==JSON.stringify(recalculated.result))throw Error('Run failed deterministic verification');
  if(JSON.stringify(report.tasks[5].output)!==JSON.stringify(report.result)||report.tasks[8].output.fingerprint!==expected)throw Error('Task outputs failed verification');
  if(report.tasks.some((t,i)=>JSON.stringify(t.output)!==JSON.stringify(recalculated.tasks[i].output))||JSON.stringify(report.report)!==JSON.stringify(recalculated.report))throw Error('Task narrative failed deterministic verification');
  return report;
}
