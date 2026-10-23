// Focused onboarding contract. Recognition events are synthetic: no microphone recording or model download.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const source = process.env.CORE_TEST_URL || 'http://127.0.0.1:8790/';
const local = ['localhost', '127.0.0.1'].includes(new URL(source).hostname);
assert.ok(local || source === 'https://creationofrebornearth.com/');
const base = local ? 'https://core-onboarding.invalid/' : source;
const port = Number(process.env.CORE_CDP_PORT || 9241); assert.notEqual(port, 9222);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const out = process.argv[2] || '.core-local/evidence/v99-voice-chat/browser.json';
const report = { at: new Date().toISOString(), source, browser: browser.version(), syntheticRecognition: true, checks: [], errors: [], modelRequests: [] };
const check = (name, value) => { report.checks.push({ name, ok: !!value }); assert.ok(value, name); };
const commands = { en:'Take me to Folsom Street in San Francisco.', fr:'Emmène-moi à Folsom Street.', es:'Llévame a Folsom Street en San Francisco.', de:'Bring mich zur Golden Gate Bridge.', 'zh-CN':'带我去旧金山', pt:'Leve-me para Oakland.' };
async function context(code, kind = 'standard', loading = false) {
  const ctx = await browser.newContext({viewport:{width:code === 'en' ? 1440 : 320,height:900},reducedMotion:'reduce'});
  if (local) await ctx.route(base+'**', async route => {
    const u = new URL(route.request().url());
    const file='public/'+(u.pathname==='/'?'world.html':u.pathname.slice(1));
    assert.ok(!file.includes('..'));
    if(fs.existsSync(file)&&fs.statSync(file).isFile())await route.fulfill({path:file});else await route.fulfill({status:404,body:'Not found'});
  });
  if (loading) await ctx.route(base+'src/intelligence/core/browser-model.mjs', route => route.fulfill({contentType:'text/javascript',body:`export const BROWSER_MODELS={'fixture':{label:'test model',downloadMB:984}};export async function browserAICapability(){return {supported:true,modelId:'fixture'}};export function loadBrowserModel(){return new Promise(()=>{})}`}));
  await ctx.addInitScript(({code,kind}) => {
    localStorage.setItem('core.lang',code); localStorage.setItem('core.ai.consent','Qwen3-1.7B-q4f16_1-MLC');
    globalThis.voiceFixture={instances:[],speech:0,installs:0};
    if(globalThis.speechSynthesis) speechSynthesis.speak=()=>voiceFixture.speech++;
    class SR {
      constructor(){voiceFixture.instances.push(this);}
      start(){this.onstart?.();} abort(){this.onend?.();}
      static async available(){return 'downloadable';} static async install(){voiceFixture.installs++;throw Error('Unexpected install');}
    }
    SR.prototype.processLocally=false;
    Object.defineProperty(globalThis,'SpeechRecognition',{configurable:true,value:kind==='standard'?SR:undefined});
    Object.defineProperty(globalThis,'webkitSpeechRecognition',{configurable:true,value:kind==='prefixed'?SR:undefined});
  },{code,kind});
  return ctx;
}
try {
  let index=0;
  for(const code of Object.keys(commands)) {
    const ctx=await context(code,index++%2?'prefixed':'standard'),page=await ctx.newPage(),prompts=[];
    let accept=true;
    page.on('dialog',async d=>{prompts.push(d.message());if(accept)await d.accept();else await d.dismiss();});
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('request',r=>{if(/huggingface\.co|hf\.co|raw\.githubusercontent\.com|web-llm\.mjs|llm-worker\.mjs/.test(r.url()))report.modelRequests.push(r.url());});
    try {
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>globalThis.CORE_EARTH?.state.ready&&globalThis.CORE_INTELLIGENCE?.engine,null,{timeout:90000});
      check(code+' homepage keeps command bar hidden',await page.locator('#core-intelligence').isHidden());
      await page.locator('.le-nav a').first().click();
      check(code+' chat and mic available in Explorer',await page.locator('[data-ci-query]').isVisible()&&await page.locator('[data-ci-mic]').isVisible());
      check(code+' initial language',await page.evaluate(c=>document.documentElement.lang===c,code));
      check(code+' settings and advanced AI closed',await page.locator('[data-ci-settings]').isHidden()&&!await page.locator('[data-ci-advanced]').evaluate(e=>e.open));
      check(code+' no capture before click',await page.evaluate(()=>voiceFixture.instances.length===0));
      check(code+' input fits viewport',await page.locator('[data-ci-query]').evaluate(e=>{const r=e.getBoundingClientRect();return r.width>70&&r.left>=0&&r.right<=innerWidth;}));
      if(code==='en'||code==='fr')await page.screenshot({path:out+'.'+code+'.png'});
      await page.locator('[data-ci-query]').fill('What is CORE?');await page.locator('[data-ci-form]').evaluate(f=>f.requestSubmit());
      await page.waitForFunction(()=>CORE_INTELLIGENCE.lastResult?.text);
      check(code+' useful text without model',await page.evaluate(()=>CORE_INTELLIGENCE.lastResult.mode==='indexed-offline'&&CORE_INTELLIGENCE.lastResult.evidence.some(e=>e.id==='core-now')));
      accept=false;await page.locator('[data-ci-mic]').click();
      await page.waitForFunction(()=>document.querySelector('[data-ci-mic]').getAttribute('aria-pressed')==='false');
      check(code+' declining consent prevents capture',await page.evaluate(()=>voiceFixture.instances.length===0));
      accept=true;await page.locator('[data-ci-mic]').click();await page.waitForFunction(()=>voiceFixture.instances.length===1);
      check(code+' locale matches interface',await page.evaluate(c=>voiceFixture.instances[0].lang===({en:'en-US',fr:'fr-FR',es:'es-ES',de:'de-DE','zh-CN':'zh-CN',pt:'pt-BR'})[c],code));
      await page.evaluate(()=>{const r=Object.assign([{transcript:'draft transcription'}],{isFinal:false});voiceFixture.instances[0].onresult({results:[r]});});
      check(code+' interim text visible',await page.locator('[data-ci-query]').inputValue()==='draft transcription');
      await page.evaluate(text=>{const r=Object.assign([{transcript:text}],{isFinal:true});voiceFixture.instances[0].onresult({results:[r]});},commands[code]);
      check(code+' transcript awaits confirmation',await page.locator('[data-ci-query]').inputValue()===commands[code]&&!await page.evaluate(()=>!!CORE_INTELLIGENCE.lastResult?.navigated));
      await page.locator('[data-ci-query]').press('Enter');
      await page.waitForFunction(()=>CORE_INTELLIGENCE.lastResult?.navigated,null,{timeout:30000});
      check(code+' voice command navigates without model',await page.evaluate(()=>CORE_INTELLIGENCE.lastResult.mode==='indexed-offline'&&CORE_INTELLIGENCE.lastResult.navigated));
      await page.locator('[data-ci-mic]').click();await page.waitForFunction(()=>voiceFixture.instances.length===2);await page.locator('[data-ci-mic]').click();
      check(code+' second click cancels',await page.locator('[data-ci-mic]').getAttribute('aria-pressed')==='false');
      if(code==='en')for(const error of ['not-allowed','no-speech','network']){
        await page.locator('[data-ci-mic]').click();await page.waitForFunction(()=>document.querySelector('[data-ci-mic]').getAttribute('aria-pressed')==='true');
        await page.evaluate(error=>{const r=voiceFixture.instances.at(-1);r.onerror({error});r.onend();},error);
        check('browser error fallback '+error,await page.locator('[data-ci-state]').textContent()!=='Ready'&&await page.locator('[data-ci-query]').isEnabled());
      }
      await page.locator('[data-ci-more]').click();await page.locator('[data-ci-advanced] > summary').click();
      await page.waitForFunction(()=>CORE_INTELLIGENCE.ai.status!=='checking');
      if(await page.evaluate(()=>CORE_INTELLIGENCE.ai.status==='available'))check(code+' model size before consent',/984|343/.test(await page.locator('[data-ci-ai]').textContent())&&await page.locator('[data-ci-enable-ai]').isVisible());
      check(code+' no pack installation or voice output',await page.evaluate(()=>voiceFixture.installs===0&&voiceFixture.speech===0));
      check(code+' provider consent localized',prompts.length>=3&&prompts[0].includes('Qwen')&&(code==='en'||!prompts[0].startsWith('Browser speech recognition')));
      if(code==='en'){
        await page.goto(new URL('solutions.html',base).href);await page.locator('[data-companion]').first().click();
        await page.locator('[data-cmp-mic]').click();
        await page.waitForFunction(()=>document.querySelector('[data-cmp-mic]').getAttribute('aria-pressed')==='true');
        await page.evaluate(()=>{const r=Object.assign([{transcript:'What evidence is missing?'}],{isFinal:true});voiceFixture.instances.at(-1).onresult({results:[r]});});
        await page.waitForFunction(()=>!!document.querySelector('[data-cmp-out]')?.textContent.trim());
        check('companion voice enters its existing response pipeline',await page.locator('[data-cmp-out]').textContent()!=='');
      }
    }finally{await ctx.close();}
  }
  for(const loading of [false,true]){
    const ctx=await context('en',loading?'standard':'unsupported',loading),page=await ctx.newPage();page.on('dialog',d=>d.accept());
    try{
      await page.goto(base);await page.waitForFunction(()=>globalThis.CORE_INTELLIGENCE?.engine,null,{timeout:90000});
      if(loading){await page.locator('[data-ci-more]').click();await page.locator('[data-ci-advanced] > summary').click();await page.locator('[data-ci-enable-ai]').click();await page.waitForFunction(()=>CORE_INTELLIGENCE.ai.status==='loading');await page.keyboard.press('Escape');}
      await page.locator('[data-ci-mic]').click();
      await page.waitForFunction(loading=>loading?voiceFixture.instances.length===1:document.querySelector('[data-ci-state]').textContent.includes('unavailable'),loading);
      check(loading?'mic works while optional model load is pending':'unsupported browser explains working text fallback',await page.locator('[data-ci-query]').isEnabled());
      if(loading)await page.locator('[data-ci-mic]').click();
      await page.locator('[data-ci-query]').fill('What is CORE?');await page.locator('[data-ci-form]').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>CORE_INTELLIGENCE.lastResult?.text);
      check(loading?'chat works during pending model load':'unsupported browser text chat works',await page.evaluate(()=>CORE_INTELLIGENCE.lastResult.mode==='indexed-offline'));
    }finally{await ctx.close();}
  }
  check('zero unexpected model downloads despite remembered old consent',report.modelRequests.length===0);
  check('zero uncaught application errors',report.errors.length===0);
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{await browser.close();fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(c=>!c.ok),failure:report.failure,errors:report.errors,modelRequests:report.modelRequests},null,2));}
