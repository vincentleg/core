// One bounded local SQLite worker. Explicit runs only; sanitized completed output can be published statically.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { execute } from '../src/urban/tasks.mjs';
import { DEFAULT } from '../src/urban/model.mjs';
const catalog=JSON.parse(fs.readFileSync('data/urban/catalog.json','utf8'));
const file=process.argv[2];
if(file && fs.statSync(file).size>16000)throw Error('Request exceeds 16 KB');
const request=file?JSON.parse(fs.readFileSync(file,'utf8')):{segment:catalog.segments.find(s=>s.id==='5665000')?.id||catalog.segments[0].id,scenarios:[{name:'Baseline',parameters:DEFAULT},{name:'Alternative A',parameters:{...DEFAULT,green:0.55}},{name:'Alternative B',parameters:{...DEFAULT,lanes:1}}]};
fs.mkdirSync('.core-local/urban',{recursive:true});
const db=new DatabaseSync('.core-local/urban/jobs.sqlite');
db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, status TEXT NOT NULL, request TEXT NOT NULL, result TEXT, created TEXT NOT NULL); CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, run TEXT NOT NULL, agent TEXT NOT NULL, status TEXT NOT NULL, record TEXT NOT NULL);");
db.prepare("UPDATE runs SET status='interrupted' WHERE status='working'").run();
for (const t of db.prepare("SELECT id,record FROM tasks WHERE status IN ('working','queued') AND run IN (SELECT id FROM runs WHERE status='interrupted')").all()) { const record={...JSON.parse(t.record),status:'unavailable',error:'Local worker interrupted; rerun explicitly'}; db.prepare('UPDATE tasks SET status=?,record=? WHERE id=?').run('unavailable',JSON.stringify(record),t.id); }
let run;
try {
 const report=await execute(catalog,request,async e=>{
  if(e.type==='queued'){run=e.id;db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO runs VALUES (?,?,?,?,?)').run(e.id,'working',JSON.stringify(request),null,e.created);for(const t of e.tasks)db.prepare('INSERT INTO tasks VALUES (?,?,?,?,?)').run(t.id,e.id,t.agent,t.status,JSON.stringify(t));db.exec('COMMIT');}catch(err){db.exec('ROLLBACK');throw err;}}
  else db.prepare('UPDATE tasks SET status=?,record=? WHERE id=?').run(e.task.status,JSON.stringify(e.task),e.task.id);
 });
 db.prepare('UPDATE runs SET status=?,result=? WHERE id=?').run('completed',JSON.stringify(report),report.id);
 // Only this run's generated public findings; never copy the DB or any user store.
 fs.writeFileSync('data/urban/latest.json.tmp',JSON.stringify({...report,hosting:'Recorded local SQLite worker result; no continuously running public backend'},null,1)+'\n');
 fs.renameSync('data/urban/latest.json.tmp','data/urban/latest.json');
 console.log(JSON.stringify({id:report.id,tasks:report.tasks.length,durationMs:report.durationMs,fingerprint:report.fingerprint,workers:1}));
} catch(e){if(run){db.prepare('UPDATE runs SET status=?,result=? WHERE id=?').run('failed',JSON.stringify({error:e.message}),run);for(const t of db.prepare("SELECT id,record FROM tasks WHERE run=? AND status IN ('working','queued')").all(run))db.prepare('UPDATE tasks SET status=?,record=? WHERE id=?').run('unavailable',JSON.stringify({...JSON.parse(t.record),status:'unavailable',error:e.message}),t.id);}throw e;}
finally{db.close();}
