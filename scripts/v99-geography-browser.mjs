// Real Photon + actual camera acceptance. Only the single voice-event case is synthetic; never records audio.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const{chromium}=createRequire(import.meta.url)('playwright-core');
const live=process.env.CORE_TEST_URL==='https://creationofrebornearth.com/';assert.ok(!process.env.CORE_TEST_URL||live);
const base=live?process.env.CORE_TEST_URL:'https://core-geography.invalid/';
const report={at:new Date().toISOString(),base,checks:[],commands:[],requests:[],providerResponses:[],dialogs:[],errors:[],modelRequests:[]};
const out=process.argv[2]||'.core-local/evidence/v99-geography/browser.json';
const check=(name,ok)=>{report.checks.push({name,ok:!!ok});assert.ok(ok,name)};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9241');
const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
if(!live)await ctx.route(base+'**',async r=>{const u=new URL(r.request().url()),f='public/'+(u.pathname==='/'?'world.html':u.pathname.slice(1));assert.ok(!f.includes('..'));await r.fulfill(fs.existsSync(f)&&fs.statSync(f).isFile()?{path:f}:{status:404,body:'Not found'})});
await ctx.addInitScript(()=>localStorage.setItem('core.lang','en'));
const page=await ctx.newPage();let accept=false;
page.on('dialog',async d=>{report.dialogs.push(d.message());if(accept)await d.accept();else await d.dismiss()});
page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(r.url().startsWith('https://photon.komoot.io/api/'))report.requests.push({at:Date.now(),url:r.url()});if(/huggingface\.co|hf\.co|raw\.githubusercontent\.com/.test(r.url()))report.modelRequests.push(r.url())});
page.on('response',async r=>{if(r.url().startsWith('https://photon.komoot.io/api/'))report.providerResponses.push({url:r.url(),status:r.status(),body:await r.json().catch(()=>null)})});
async function ready(){await page.waitForFunction(()=>globalThis.CORE_EARTH?.state.ready&&globalThis.CORE_INTELLIGENCE?.engine,null,{timeout:90000})}
async function language(code){await page.selectOption('[data-lang]',code);await page.waitForFunction(c=>document.documentElement.lang===c,code)}
async function rate(){const times=report.requests.map(r=>r.at).filter(t=>Date.now()-t<61000);if(times.length>=5)await page.waitForTimeout(Math.min(59000,61000-(Date.now()-times[0])));const last=report.requests.at(-1)?.at;if(last&&Date.now()-last<1300)await page.waitForTimeout(1300-(Date.now()-last))}
async function submit(q){await rate();await page.evaluate(q=>CORE_INTELLIGENCE.submit(q),q)}
async function target(q,type,bounds,{choose,voice=false}={}){
 await rate();if(voice){await page.evaluate(q=>{globalThis.SpeechRecognition=class{start(){queueMicrotask(()=>{this.onstart?.();this.onresult?.({results:[Object.assign([{transcript:q}],{isFinal:true})]})})}abort(){this.onend?.()}}},q);await page.locator('[data-ci-mic]').click();await page.waitForFunction(q=>document.querySelector('[data-ci-query]').value===q,q);await page.locator('[data-ci-query]').press('Enter');await page.waitForFunction(q=>CORE_INTELLIGENCE.lastRequest===q&&document.querySelector('.ci-turn:last-child .ci-q')?.textContent===q,q,{timeout:30000})}else await submit(q);
 let result=await page.evaluate(()=>({clarification:CORE_INTELLIGENCE.lastResult?.clarification,places:CORE_INTELLIGENCE.lastResult?.places,error:CORE_INTELLIGENCE.lastResult?.error,text:CORE_INTELLIGENCE.lastResult?.text}));
 if(result.clarification&&choose){const button=page.locator('.ci-turn').last().locator('.ci-choices button').filter({hasText:choose}).first();await button.click();await page.waitForFunction(()=>CORE_INTELLIGENCE.lastResult?.navigated,null,{timeout:20000})}
 const r=await page.evaluate(()=>({place:CORE_INTELLIGENCE.engine.state.location,center:CORE_EARTH.state.map.getCenter().toArray(),zoom:CORE_EARTH.state.map.getZoom(),navigated:CORE_INTELLIGENCE.lastResult?.navigated,highlight:!!CORE_EARTH.state.map.getSource('core-intelligence-results')}));
 report.commands.push({q,voice,...r,clarificationBeforeChoice:!!result.clarification});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 check(q+' executed camera action',r.navigated===true);check(q+' correct feature class',r.place?.type===type);
 check(q+' intended geographic area',r.center[0]>=bounds[0]&&r.center[0]<=bounds[2]&&r.center[1]>=bounds[1]&&r.center[1]<=bounds[3]);
 check(q+' camera agrees with resolved coordinates',Math.abs(r.center[0]-r.place.coordinates[0])<0.001&&Math.abs(r.center[1]-r.place.coordinates[1])<0.001);
 check(q+' correct zoom and visible destination marker',Math.abs(r.zoom-r.place.zoom)<0.25&&r.highlight);
 console.log('PASS',q,r.place.name,r.place.type,r.center);
}
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});await ready();
 await submit('Go to Golden Gate Park');check('rejecting geographic consent sends no request',report.requests.length===0);check('rejection does not move camera',!await page.evaluate(()=>CORE_INTELLIGENCE.lastResult.navigated));
 await page.reload();await ready();const dialogs=report.dialogs.length;await submit('Go to Golden Gate Park');check('refusal survives reload without repeated prompt',report.dialogs.length===dialogs&&report.requests.length===0);
 await page.locator('[data-ci-more]').click();check('settings disclose map context',/map context center/.test(await page.locator('[data-ci-geocode]').locator('..').textContent()));await page.locator('[data-ci-geocode]').check();await page.keyboard.press('Escape');accept=true;
 await target('Go to Golden Gate Park','park',[-122.52,37.75,-122.44,37.79]);
 await language('fr');await target('Va devant Golden Gate Park','park',[-122.52,37.75,-122.44,37.79]);await target('Va devant le Golden Gate Park','park',[-122.52,37.75,-122.44,37.79]);
 await target('Zoom sur Market Street, San Francisco','street',[-122.44,37.75,-122.38,37.81]);await target('Zoom sur Market Street','street',[-122.44,37.75,-122.38,37.81]);
 await language('en');await target('Go to Folsom Street','street',[-122.43,37.76,-122.39,37.80]);
 for(const[code,q]of[['es','Llévame a Golden Gate Park'],['de','Bring mich zum Golden Gate Park'],['pt','Leve-me para Golden Gate Park'],['zh-CN','带我去Golden Gate Park']]){await language(code);await target(q,'park',[-122.52,37.75,-122.44,37.79])}
 await language('fr');await target('Va devant le Golden Gate Park','park',[-122.52,37.75,-122.44,37.79],{voice:true});
 await language('en');await target('Take me to the Eiffel Tower','monument',[2.29,48.85,2.30,48.87],{choose:'Paris'});
 await target('Go to UCSF Medical Center','hospital',[-122.46,37.75,-122.38,37.80]);await target('Take me to Tokyo','city',[139.5,35.4,139.95,35.9]);await target('Zoom to 37.7749, -122.4194','coordinates',[-122.4195,37.7748,-122.4193,37.7750]);
 await submit('Go to Springfield');const ambiguous=await page.evaluate(()=>CORE_INTELLIGENCE.lastResult);check('different cities with same name remain choices',ambiguous.clarification&&ambiguous.places.length>1&&!ambiguous.navigated);
 const before=await page.evaluate(()=>CORE_EARTH.state.map.getCenter().toArray());await submit('Go to ZzqNonexistentPlace8675309');check('unknown location does not move camera',!await page.evaluate(()=>CORE_INTELLIGENCE.lastResult.navigated)&&JSON.stringify(before)===JSON.stringify(await page.evaluate(()=>CORE_EARTH.state.map.getCenter().toArray())));
 const count=report.requests.length;await page.reload();await ready();check('affirmative consent survives reload',await page.locator('[data-ci-geocode]').isChecked());check('no automatic geocoding on reload',report.requests.length===count);
 check('no unexpected model downloads',report.modelRequests.length===0);check('no uncaught browser exceptions',report.errors.length===0);
 await page.screenshot({path:out+'.png'});
}catch(e){report.failure=e.stack;process.exitCode=1}
finally{await ctx.close();await browser.close();fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,commands:report.commands.length,requests:report.requests.length,failed:report.checks.filter(c=>!c.ok),errors:report.errors,failure:report.failure},null,2))}
