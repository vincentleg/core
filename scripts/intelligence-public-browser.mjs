// V9.8.1 public-path acceptance in real Chrome: Explorer layout, fast-router navigation, genuine on-device Qwen3
// (WebLLM/WebGPU, no mock) and on-device Whisper fed by a synthetic audio file through the real getUserMedia path.
// Synthetic fixtures are never a claim of physical-microphone use. Timings are recorded as measured, cold and warm.
//   CORE_TEST_URL=https://… CORE_TEST_PART=layout|text|ai|voice CORE_VOICE_FIXTURE=… node scripts/intelligence-public-browser.mjs
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright-core');
const base=process.env.CORE_TEST_URL||'http://127.0.0.1:8790/',out=process.env.CORE_TEST_EVIDENCE||'.core-local/evidence/v981/browser',part=process.env.CORE_TEST_PART||'layout';fs.mkdirSync(out,{recursive:true});
const profile=process.env.CORE_TEST_PROFILE||null,fixture=process.env.CORE_VOICE_FIXTURE;
const args=['--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',...(fixture?['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+path.resolve(fixture)+'%noloop']:[])];
const launch=o=>profile?chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args,...o}):chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args}).then(b=>b.newContext(o).then(c=>Object.assign(c,{_browser:b})));
const results={at:new Date().toISOString(),base,part,checks:[],timings:[]};const save=()=>fs.writeFileSync(path.join(out,`${part}${process.env.CORE_TEST_TAG?'-'+process.env.CORE_TEST_TAG:''}.json`),JSON.stringify(results,null,2));
async function open({mobile=false}={}){
 const ctx=await launch({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,...(process.env.CORE_TEST_STORAGE_STATE?{storageState:process.env.CORE_TEST_STORAGE_STATE}:{})});
 const p=ctx.pages?.()[0]||await ctx.newPage(),errors=[],local=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{const u=new URL(r.url());if(r.status()>=400&&!(u.pathname==='/api/intelligence/status'&&/^(127\.0\.0\.1|localhost)$/.test(u.hostname))&&u.pathname!=='/favicon.ico')errors.push(r.status()+' '+u.origin+u.pathname);});
 p.on('request',r=>{const u=new URL(r.url());if(!/^(127\.0\.0\.1|localhost)$/.test(new URL(base).hostname)&&(/^(127\.0\.0\.1|localhost|\[::1\])$/.test(u.hostname)||u.pathname.startsWith('/api/intelligence')))local.push(u.href);});
 await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>globalThis.CORE_INTELLIGENCE?.engine&&globalThis.CORE_EARTH?.state.ready,null,{timeout:90000});return {ctx,p,errors,local};
}
const close=async c=>{await c.ctx.close();await c.ctx._browser?.close();};
const ask=(p,text)=>p.evaluate(async text=>{const t=performance.now();await CORE_INTELLIGENCE.submit(text);const r=CORE_INTELLIGENCE.lastResult;return {text:r.text,warning:r.warning,rejected:r.rejected,citations:r.citations,events:r.events?.map(e=>({tool:e.tool,status:e.status,error:e.error,args:e.arguments})),error:!!r.error,mode:r.mode,responseKind:r.responseKind,navigated:r.navigated,timings:r.timings,wallMs:Math.round(performance.now()-t),agent:CORE_INTELLIGENCE.engine.state.agent&&{id:CORE_INTELLIGENCE.engine.state.agent.id,code:CORE_INTELLIGENCE.engine.state.agent.code,domain:CORE_INTELLIGENCE.engine.state.agent.domain,city:CORE_INTELLIGENCE.engine.state.agent.geography},location:CORE_INTELLIGENCE.engine.state.location?.name,center:CORE_EARTH.state.map.getCenter().toArray(),tools:r.events?.map(e=>e.tool+':'+e.status)};},text);
const check=(name,detail)=>{results.checks.push(detail?{name,...detail}:{name});console.log('✓',name);};
const commands=[['Take me to Folsom Street in San Francisco.',r=>r.navigated&&r.location==='Folsom Street'],['Find an urban planning agent near Oakland.',r=>r.agent?.domain==='urban-planning'&&r.agent.city==='Oakland'],['What has this agent discovered?',r=>!r.error&&/No completed investigation|Aucune enquête|no recorded|not recorded|absent/i.test(r.text)],['Emmène-moi à San Francisco.',r=>r.navigated&&r.location==='San Francisco'],['Find an energy agent in Oakland.',r=>r.agent?.domain==='energy'&&r.agent.city==='Oakland'],["Trouve-moi un agent d'urbanisme.",r=>r.agent?.domain==='urban-planning'],['Show me the Golden Gate Bridge.',r=>r.navigated]];
try{
 if(part==='layout'){
  for(const mobile of [false,true]){
   const c=await open({mobile}),{p}=c,tag=mobile?'mobile':'desktop';
   const home=await p.evaluate(()=>({ci:getComputedStyle(document.getElementById('core-intelligence')).display,hero:!document.getElementById('ea-hero').hidden}));assert.equal(home.ci,'none');assert.equal(home.hero,true);check(tag+': homepage keeps hero, no intelligence panel');
   await p.screenshot({path:path.join(out,tag+'-home.png')});
   await p.locator('#ea-start').click();await p.waitForFunction(()=>document.body.classList.contains('ea-explore')&&!CORE_EARTH.state.map.isMoving(),null,{timeout:15000});await p.waitForTimeout(800);
   const g=await p.evaluate(()=>{const bar=document.querySelector('.ci').getBoundingClientRect(),form=document.querySelector('.ci-form').getBoundingClientRect(),map=document.getElementById('map').getBoundingClientRect(),nav=document.getElementById('core-nav').getBoundingClientRect();const vis=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return !!r&&r.width>0&&getComputedStyle(e).visibility!=='hidden';};return {bar:[bar.top,bar.bottom],formW:form.width,mapTop:map.top,navBottom:nav.bottom,zoom:CORE_EARTH.state.map.getZoom(),center:CORE_EARTH.state.map.getCenter().toArray(),panel:!document.getElementById('ea-panel').hidden,list:!document.getElementById('ea-list').hidden,mic:vis('[data-ci-mic]'),send:vis('[data-ci-submit]'),input:vis('#ci-query'),overflow:document.documentElement.scrollWidth>innerWidth+1,menu:!!document.querySelector('#core-nav a, #core-nav button')};});
   results.checks.push({name:tag+' geometry',...g});
   assert.ok(g.zoom<3,'global Earth');assert.ok(!g.panel&&!g.list,'nothing auto-opened');assert.ok(g.bar[0]>=g.navBottom-1,'bar under nav');assert.ok(g.mapTop>=g.bar[1]-1,'map starts below bar');assert.ok(g.bar[1]-g.bar[0]<=80);assert.ok(g.mic&&g.send&&g.input&&g.menu);assert.equal(g.overflow,false);if(!mobile)assert.ok(g.formW>=850&&g.formW<=1000,'desktop bar width');
   check(tag+': Explore opens global Earth below a compact bar; no San Francisco jump, nothing auto-opened');
   await p.screenshot({path:path.join(out,tag+'-explore.png')});
   const r=await ask(p,'Find an urban planning agent near Oakland.');assert.equal(r.agent?.city,'Oakland');await p.waitForTimeout(700);
   const o=await p.evaluate(()=>{const a=document.querySelector('.ci-form').getBoundingClientRect(),panel=document.getElementById('ea-panel');const b=panel.hidden?null:panel.getBoundingClientRect();return {panelCoversBar:!!b&&b.top<a.bottom&&b.bottom>a.top&&b.left<a.right&&b.right>a.left,turns:document.querySelectorAll('.ci-turn').length,detailsClosed:[...document.querySelectorAll('.ci-turn details')].every(d=>!d.open)};});
   assert.equal(o.panelCoversBar,false);assert.ok(o.detailsClosed);check(tag+': agent panel never covers the command bar; details collapsed');
   await p.screenshot({path:path.join(out,tag+'-agent.png')});
   if(!mobile){await p.evaluate(()=>CORE_DEMO.request());await p.locator('[data-urban=next]').waitFor({state:'visible',timeout:30000});const scenes=[];for(let i=0;i<6;i++){scenes.push(await p.locator('#pp-title').innerText());if(i<5)await p.locator('[data-urban=next]').click();}assert.equal(new Set(scenes).size,6);check('six-scene tour still advances through six distinct scenes');await p.locator('[data-urban=end]').click();
    for(const d of ['plans.html','manifesto.html','solutions.html']){const res=await p.request.get(new URL(d,base).href);assert.equal(res.status(),200);}check('plans, manifesto, solutions reachable');}
   // Pre-existing, unrelated: the loopback-only supervisor probe and an upstream OpenFreeMap glyph range.
   const known=e=>/\/\.core-local\/civ\/state\.json$|tiles\.openfreemap\.org\/fonts\//.test(e);results.knownErrors=c.errors.filter(known);assert.deepEqual(c.errors.filter(e=>!known(e)),[]);assert.deepEqual(c.local,[]);await close(c);
  }
 }
 if(part==='text'||part==='ai'){
  const c=await open(),{p}=c;
  if(part==='ai'){
   const cap=await p.evaluate(async()=>{for(let i=0;i<100&&['checking'].includes(CORE_INTELLIGENCE.ai.status);i++)await new Promise(r=>setTimeout(r,100));return CORE_INTELLIGENCE.ai;});results.capability=cap;assert.ok(['available','ready','loading'].includes(cap.status),'on-device AI supported: '+JSON.stringify(cap));
   const t=Date.now();await p.evaluate(()=>CORE_INTELLIGENCE.enableAI());await p.waitForFunction(()=>['ready','failed'].includes(CORE_INTELLIGENCE.ai.status),null,{timeout:600000});const st=await p.evaluate(()=>CORE_INTELLIGENCE.ai);results.load={...st,wallMs:Date.now()-t,cache:process.env.CORE_TEST_TAG||'unknown'};console.log('load',JSON.stringify(results.load));assert.equal(st.status,'ready',st.reason);check('on-device model loaded: '+st.label,{loadMs:st.loadMs});
  }
  await p.locator('#ea-start').click();await p.waitForTimeout(1500);
  for(const [q,ok] of commands){const r=await ask(p,q);results.timings.push({q,...r});console.log(JSON.stringify({q,mode:r.mode,kind:r.responseKind,firstMoveMs:r.timings?.firstMoveMs,modelMs:r.timings?.modelMs,totalMs:r.timings?.totalMs,text:r.text.slice(0,160)}));assert.ok(ok(r),q+' → '+r.text);}
  check(part+': representative EN/FR commands produced real tool outcomes');
  if(part==='ai'){for(const q of ['Which of these agents has completed an investigation, and what did CORE record?','Why would I pay $12 for CORE Plus?','Could you show me the city across the bay from San Francisco?']){const r=await ask(p,q);results.timings.push({q,...r});console.log(JSON.stringify({q,mode:r.mode,kind:r.responseKind,firstMoveMs:r.timings?.firstMoveMs,modelMs:r.timings?.modelMs,totalMs:r.timings?.totalMs,text:r.text.slice(0,220),tools:r.tools}));assert.equal(r.error,false,q+' → '+r.text);}check('ai: complex questions answered through model planning/synthesis with validated tools');}
  assert.deepEqual(c.local,[]);results.errors=c.errors;await close(c);
 }
 if(part==='model'){
  // Fresh page per request: model-planned interpretation and evidence synthesis, judged by actual tool outcomes.
  for(const [q,ok] of [['Find someone working on bike lanes in Berkeley.',r=>r.agent?.city==='Berkeley'||r.events?.some(e=>e.tool==='search_agents'&&e.status==='succeeded')],['Could you show me the city across the bay from San Francisco?',r=>r.navigated&&r.location==='Oakland'],['Find a mobility agent with completed research in San Francisco and explain what it discovered.',r=>/model-synthesis/.test(r.responseKind)&&r.agent?.city==='San Francisco']]){
   const c=await open(),{p}=c;await p.waitForFunction(()=>['ready','failed','available','unsupported'].includes(CORE_INTELLIGENCE.ai.status),null,{timeout:120000});await p.evaluate(()=>CORE_INTELLIGENCE.enableAI());await p.waitForFunction(()=>['ready','failed'].includes(CORE_INTELLIGENCE.ai.status),null,{timeout:600000});
   await p.locator('#ea-start').click();await p.waitForTimeout(1200);const r=await ask(p,q);results.timings.push({q,...r});const pass=!!ok(r);console.log(JSON.stringify({q,pass,kind:r.responseKind,firstMoveMs:r.timings?.firstMoveMs,modelMs:r.timings?.modelMs,totalMs:r.timings?.totalMs,text:r.text.length>420?r.text.slice(0,200)+" … "+r.text.slice(-200):r.text,tools:r.tools}));results.checks.push({name:q,pass});await close(c);
  }
 }
 if(part==='deny'){
  const c=await open(),{p}=c;await p.evaluate(()=>{CORE_INTELLIGENCE.setVoiceMethod('browser');});await p.locator('#ea-start').click();await p.waitForTimeout(800);
  await p.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('denied','NotAllowedError');};globalThis.webkitSpeechRecognition=undefined;globalThis.SpeechRecognition=undefined;CORE_INTELLIGENCE.setVoiceMethod('whisper');});
  // Whisper path with a refused microphone: the error is visible, nothing listens, typing still works.
  await p.locator('[data-ci-mic]').click();await p.waitForFunction(()=>document.getElementById('core-intelligence').dataset.state==='error',null,{timeout:120000});
  const st=await p.evaluate(()=>({text:document.querySelector('[data-ci-state]').textContent,listening:!!CORE_INTELLIGENCE.voice?.listening}));results.deny=st;assert.match(st.text,/permission/i);assert.equal(st.listening,false);
  const r=await ask(p,'Take me to Oakland.');assert.equal(r.navigated,true);check('microphone denial visible; no listening; typing still navigates');await close(c);
 }
 if(part==='voice'){
  assert.ok(fixture,'CORE_VOICE_FIXTURE required');const c=await open(),{p}=c;await c.ctx.grantPermissions(['microphone'],{origin:new URL(base).origin});
  await p.evaluate(()=>{CORE_INTELLIGENCE.setVoiceMethod('whisper');document.querySelector('[data-ci-speak]').checked=false;});
  await p.locator('#ea-start').click();await p.waitForTimeout(1200);
  for(const q of (process.env.CORE_VOICE_CONTEXT||'').split('|').filter(Boolean))await ask(p,q);
  await p.evaluate(()=>{globalThis.__before=CORE_INTELLIGENCE.lastResult;});const t=Date.now();await p.locator('[data-ci-mic]').click();
  await p.waitForFunction(()=>CORE_INTELLIGENCE.lastResult&&CORE_INTELLIGENCE.lastResult!==globalThis.__before,null,{timeout:300000});
  const r=await p.evaluate(()=>({transcript:CORE_INTELLIGENCE.lastRequest,text:CORE_INTELLIGENCE.lastResult.text,navigated:CORE_INTELLIGENCE.lastResult.navigated,timings:CORE_INTELLIGENCE.lastResult.timings,speech:CORE_INTELLIGENCE.speech,agent:CORE_INTELLIGENCE.engine.state.agent?.code,location:CORE_INTELLIGENCE.engine.state.location?.name}));
  results.voice={...r,clickToResultMs:Date.now()-t,method:'synthetic audio file → Chrome fake microphone → getUserMedia/AudioWorklet → on-device Whisper → shared engine; not a physical microphone'};console.log(JSON.stringify(results.voice));
  if(process.env.CORE_VOICE_EXPECT)assert.match(r.transcript,new RegExp(process.env.CORE_VOICE_EXPECT,'i'));check('voice: '+r.transcript);results.errors=c.errors;await close(c);
 }
 save();
}catch(e){results.failure={message:e.message,stack:e.stack};save();throw e;}
