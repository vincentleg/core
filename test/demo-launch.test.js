const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function page(hash='') {
 const events={},status={hidden:true,textContent:''},panel={hidden:true},hero={setAttribute(k,v){this[k]=v;}},nav={setAttribute(k,v){this[k]=v;}};
 let tour=false;
 const context={URLSearchParams,location:{hash},document:{documentElement:{lang:'en'},addEventListener(name,fn){events[name]=fn;},getElementById(id){return id==='ea-demo-loading'?status:id==='ea-panel'?panel:null;},querySelector(){return tour?{}:null;},querySelectorAll(){return [hero,nav];}}};
 vm.runInNewContext(fs.readFileSync('src/earth/demo-launch.js','utf8'),context);
 return {api:context.CORE_DEMO,status,hero,nav,click(){events.click({button:0,target:{closest:()=>hero},preventDefault(){}});},active(value){tour=value;panel.hidden=!value;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('early hero and navigation requests wait for readiness and launch exactly once',async()=>{
 const p=page();let calls=0,finish;
 p.click();p.api.request();p.click();assert.equal(p.hero['aria-busy'],'true');assert.equal(p.status.hidden,false);assert.match(p.status.textContent,/start automatically/);
 p.api.ready(async()=>{calls++;await new Promise(resolve=>finish=resolve);p.active(true);});assert.equal(calls,1);
 p.click();p.api.request();assert.equal(calls,1);finish();await tick();assert.equal(p.status.hidden,true);assert.equal(p.nav['aria-busy'],'false');
 p.click();assert.equal(calls,1,'An open tour is not restarted');
});
test('normal clicks can open again after the previous tour is closed',async()=>{
 const p=page();let calls=0;p.api.ready(()=>{calls++;p.active(true);});p.click();await tick();assert.equal(calls,1);
 p.active(false);p.click();await tick();assert.equal(calls,2);assert.equal(p.status.hidden,true);
});
test('demo deep links queue before application loading; failures clear busy state',async()=>{
 const p=page('#demo');let calls=0;assert.equal(p.hero['aria-busy'],'true');p.api.ready(()=>{calls++;throw Error('Data unavailable');});await tick();assert.equal(calls,1);assert.equal(p.hero['aria-busy'],'false');assert.match(p.status.textContent,/Reload to try again/);p.click();assert.equal(calls,1);
});
test('the capture script is loaded synchronously in the head and included in the public build',async()=>{
 const html=fs.readFileSync('world.html','utf8'),tag='<script src="src/earth/demo-launch.js"></script>';
 assert.ok(html.indexOf(tag)>0&&html.indexOf(tag)<html.indexOf('</head>'));
 assert.ok(html.indexOf('id="ea-demo-loading"')>html.indexOf('</section>'), 'Feedback is outside the hero so header requests remain visible');
 const {FILES}=await import('../scripts/public-manifest.mjs');assert.ok(FILES.includes('src/earth/demo-launch.js'));
});
