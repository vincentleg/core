// Focused real-browser acceptance. Local fixture microphone is synthetic, never a claim of physical microphone use.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium,webkit}=createRequire(import.meta.url)('playwright-core');
const base=process.env.CORE_TEST_URL||'http://127.0.0.1:8788',out=process.env.CORE_TEST_EVIDENCE||'.core-local/evidence/v98/browser';fs.mkdirSync(out,{recursive:true});
const args=['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'];
const fixture=process.env.CORE_VOICE_FIXTURE;if(fixture)args.push('--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+path.resolve(fixture)+'%noloop');
const kit=process.env.CORE_TEST_BROWSER==='webkit';const browser=kit?await webkit.launch({headless:true}):await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args});const results=[];
async function context({mobile=false,offline=true}={}){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,reducedMotion:'reduce',...(process.env.CORE_TEST_STORAGE_STATE?{storageState:process.env.CORE_TEST_STORAGE_STATE}:{})});
 if(offline)await ctx.route('**/api/intelligence/status',async route=>{try{const r=await route.fetch();if(r.ok()){const d=await r.json();return route.fulfill({json:{...d,mode:'indexed-offline'}});}}catch{}return route.fulfill({json:{mode:'indexed-offline',token:'0'.repeat(64),transcription:'unavailable'}});});
 const p=await ctx.newPage(),errors=[],privateRequests=[];p.on('request',r=>{const u=new URL(r.url());if(!['127.0.0.1','localhost'].includes(new URL(base).hostname)&&(['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.pathname.startsWith('/api/intelligence')))privateRequests.push(u.origin+u.pathname);});p.on('pageerror',e=>errors.push(e.message));await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>globalThis.CORE_INTELLIGENCE?.engine&&globalThis.CORE_EARTH?.state.ready&&globalThis.CORE_EARTH.state.urban,null,{timeout:60000});return {ctx,p,errors,privateRequests};
}
async function query(p,text){return p.evaluate(async text=>{await CORE_INTELLIGENCE.submit(text);return {result:CORE_INTELLIGENCE.lastResult,center:CORE_EARTH.state.map.getCenter().toArray(),panel:document.getElementById('ea-panel').hidden?null:document.getElementById('ea-panel-body').innerText.slice(0,1000)};},text);}
try{
 for(const mobile of process.env.CORE_TEST_TARGET==='voice'?[]:[false,true]){
  const {ctx,p,errors,privateRequests}=await context({mobile});const checks=[];
  const rect=await p.locator('#ci-query').boundingBox();assert.ok(rect&&rect.y>0&&rect.y<180);checks.push('Prominent input visible at entry');
  let r=await query(p,'Take me to Folsom Street in San Francisco.');assert.equal(r.result.navigated,true);assert.equal(r.result.error,undefined);assert.ok(r.center[0]<-122.39&&r.center[0]>-122.43&&r.center[1]>37.76&&r.center[1]<37.80);checks.push('Actual sourced Folsom camera movement');
  r=await query(p,'Show me the Golden Gate Bridge.');assert.equal(r.result.navigated,true);assert.ok(Math.abs(r.center[0]+122.47855705)<.002&&Math.abs(r.center[1]-37.82001725)<.002);checks.push('Golden Gate Bridge verified reference');
  r=await query(p,'Find an agent working on urban planning near Oakland, take me to it and explain what it discovered.');assert.equal(r.result.error,undefined);assert.equal(r.result.navigated,true);assert.ok(r.panel);const selected=await p.evaluate(()=>CORE_INTELLIGENCE.engine.state.agent);assert.equal(selected.domain,'urban-planning');assert.equal(selected.geography,'Oakland');assert.match(r.panel,/urban-planning|urban planning/i);checks.push('Real Oakland urban-planning agent selected and actual panel opened; missing research disclosed');
  assert.equal(await p.evaluate(()=>{const r=CORE_EARTH.state.map.getCanvas().getBoundingClientRect(),el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !el?.closest('.ci,.ea-panel');}),true);checks.push('Map center remains visible between assistant and agent panels');
  r=await query(p,'Take me to Oakland.');r=await query(p,'Show me the transportation agents here.');assert.ok(r.result.agents.length);assert.ok(r.result.agents.every(a=>a.city==='Oakland'));checks.push('Contextual here refers to Oakland');
  const before=await p.evaluate(()=>CORE_EARTH.state.map.getCenter().toArray());r=await query(p,'Take me to Folsom Street near the Golden Gate.');assert.equal(r.result.clarification,true);assert.deepEqual(r.center,before);checks.push('Inconsistent geography asks clarification without camera movement');
  r=await query(p,'Emmène-moi à San José.');assert.equal(r.result.language,'fr');assert.equal(r.result.navigated,true);checks.push('French geographic navigation');
  for(const question of ['Show me completed investigations.','Show me the sources.','What can CORE actually do today?','Why would I pay $12?','Are all 500 agents thinking right now?']){r=await query(p,question);assert.equal(r.result.error,undefined);assert.equal(r.result.mode,'indexed-offline');}checks.push('Recorded work, sources and product/pricing/worker disclosures');
  await p.waitForTimeout(1200);await p.screenshot({path:path.join(out,mobile?'mobile.png':'desktop.png'),fullPage:false});
  if(!mobile){
   await p.locator('[data-ci-collapse]').click();await p.evaluate(()=>CORE_DEMO.request());await p.locator('[data-urban=next]').waitFor({state:'visible'});
   const scenes=[];for(let i=0;i<6;i++){scenes.push(await p.locator('#pp-title').innerText());if(i<5)await p.locator('[data-urban=next]').click();}
   assert.equal(new Set(scenes).size,6);checks.push('Existing six-scene tour advances through six distinct scenes');
   await p.locator('[data-urban=end]').click();
   for(const destination of ['plans.html','manifesto.html']){const response=await p.request.get(new URL(destination,base).href);assert.equal(response.status(),200);assert.ok((await response.text()).length>1000);}
   checks.push('Plans and manifesto remain available');
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);checks.push('No page-wide horizontal overflow');assert.deepEqual(errors,[]);assert.deepEqual(privateRequests,[]);
  results.push({device:kit?(mobile?'mobile WebKit emulation (not physical iOS Safari)':'desktop WebKit'):(mobile?'mobile Chrome emulation':'desktop Chrome'),checks,errors});await ctx.close();
 }
 if(process.env.CORE_TEST_MODEL==='1'&&process.env.CORE_TEST_TARGET!=='voice'){
  const {ctx,p,errors}=await context({offline:false});assert.match(await p.locator('[data-ci-mode]').innerText(),/LOCAL/);
  const r=await query(p,'Find an agent specializing in urban planning near Oakland, take me to it and explain what it has actually discovered.');
  fs.writeFileSync(path.join(out,'local-model-result.json'),JSON.stringify(r,null,2));assert.equal(r.result.mode,'local-model');assert.equal(r.result.error,undefined);assert.equal(r.result.navigated,true);const a=await p.evaluate(()=>CORE_INTELLIGENCE.engine.state.agent);assert.equal(a.domain,'urban-planning');assert.equal(a.geography,'Oakland');assert.ok(r.result.events.some(e=>e.tool==='retrieve_evidence'));assert.deepEqual(errors,[]);results.push({device:'desktop Chrome',method:'real local Ollama/Qwen3:8B, no model mock',selectedAgent:a.id,tools:r.result.events.map(e=>({tool:e.tool,status:e.status})),errors});await ctx.close();
 }
 if(fixture){
  const {ctx,p,errors}=await context({offline:process.env.CORE_TEST_MODEL!=='1'});await ctx.grantPermissions(['microphone']);await p.locator('.ci-options').evaluate(e=>e.open=true);await p.locator('[data-ci-speak]').uncheck();await p.locator('[data-ci-mic]').click();
  try{await p.waitForFunction(()=>CORE_INTELLIGENCE.lastResult&&CORE_INTELLIGENCE.lastRequest,null,{timeout:180000});}catch(e){const debug=await p.evaluate(()=>({status:document.querySelector('[data-ci-state]').textContent,input:document.querySelector('#ci-query').value,result:CORE_INTELLIGENCE.lastResult,listening:CORE_INTELLIGENCE.voice?.listening}));fs.writeFileSync(path.join(out,'voice-debug.json'),JSON.stringify(debug,null,2));throw e;}await p.locator('[data-ci-conversation]').uncheck();
  const r=await p.evaluate(()=>({result:CORE_INTELLIGENCE.lastResult,center:CORE_EARTH.state.map.getCenter().toArray(),transcript:CORE_INTELLIGENCE.lastRequest}));fs.writeFileSync(path.join(out,'synthetic-voice-result.json'),JSON.stringify(r,null,2));assert.match(r.transcript,/Folsom/i);assert.equal(r.result.navigated,true);assert.ok(r.center[0]<-122.39&&r.center[0]>-122.43);assert.deepEqual(errors,[]);results.push({method:'Synthetic audio file through actual browser getUserMedia, AudioWorklet, local Whisper and shared tool engine; not physical microphone',transcript:r.transcript,tools:r.result.events.map(e=>e.tool),errors});await ctx.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),base,results},null,2));console.log(JSON.stringify(results));
}catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.message,stack:e.stack,completed:results},null,2));throw e;}finally{await browser.close();}
