import {loadCatalog} from './catalog.mjs';import {createIntelligence} from './engine.mjs';import {earthMap} from './map.mjs';import {localConnection} from './connection.mjs';import {photon} from './geocoder.mjs';import {lang,setLang} from '../../i18n/i18n.mjs';
// Compact command bar: one input, microphone, send, a status line and a collapsible answer card. Evidence, sources,
// engine and timings live behind "Details". Downloads and microphone use always follow an explicit choice.
const root=document.getElementById('core-intelligence'),$=s=>root.querySelector(s),input=$('[data-ci-query]'),output=$('[data-ci-output]'),status=$('[data-ci-state]'),modeChip=$('[data-ci-mode]'),toggle=$('[data-ci-collapse]'),settings=$('[data-ci-settings]'),consent=$('[data-ci-consent]');
const tr=(en,fr)=>lang()==='fr'?fr:en;
const store={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch{}}};
const WORDS={idle:['Ready','Prêt'],muted:['Ready','Prêt'],connecting:['Listening…','Écoute…'],listening:['Listening — speak, then pause','Écoute — parlez, puis marquez une pause'],transcribing:['Thinking…','Réflexion…'],thinking:['Thinking…','Réflexion…'],executing:['Thinking…','Réflexion…'],navigating:['Navigating…','Navigation…'],speaking:['Speaking — tap the microphone to interrupt','Réponse vocale — touchez le micro pour interrompre'],loading:['Loading…','Chargement…'],error:['Unavailable — typing still works','Indisponible — la saisie fonctionne toujours']};
let engine=null,voice=null,connection=null,busy=false,conversation=false,lastRequest=null,lastResult=null,generation=0,speech=null,voiceMark=null,voiceStart=null;
const ai={status:'checking',modelId:null,label:null,reason:'',progress:0,loadMs:null,handle:null};
function setState(value,detail=''){
 root.dataset.state=value;const w=WORDS[value]||WORDS.error;status.textContent=w[lang()==='fr'?1:0]+(detail&&value!=='executing'&&value!=='navigating'?' · '+detail:'');
 if(value==='transcribing')voiceMark=performance.now();
 $('[data-ci-mic]').setAttribute('aria-pressed',String(value==='listening'||value==='connecting'));
 $('[data-ci-cancel]').hidden=!['thinking','executing','navigating','connecting','listening','transcribing','speaking'].includes(value);$('[data-ci-submit]').hidden=!$('[data-ci-cancel]').hidden;
}
function el(tag,content,cls=''){const e=document.createElement(tag);if(content!=null)e.textContent=content;if(cls)e.className=cls;return e;}
function href(value){try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function modeLabel(){
 if(engine?.modelKind==='local-model')return tr('Local AI · Qwen3 8B','IA locale · Qwen3 8B');
 if(engine?.modelKind==='browser-model')return tr('On-device AI · ','IA sur l’appareil · ')+ai.label;
 if(ai.status==='loading')return tr('AI loading ','IA en chargement ')+Math.round(ai.progress*100)+'%';
 return ai.status==='available'?tr('Fast search · enable AI','Recherche rapide · activer l’IA'):tr('Fast search','Recherche rapide');
}
function refreshChrome(){modeChip.textContent=modeLabel();const turns=output.querySelectorAll('.ci-turn').length;toggle.hidden=!turns;toggle.textContent=output.hidden?tr('Show answer','Voir la réponse'):tr('Hide','Masquer');renderAI();}
function actionsOf(r){
 const out=[];for(const e of r.events||[]){if(e.status!=='succeeded')continue;const x=e.result||{};
  if(x.navigated&&x.place)out.push('✓ '+tr('Moved to ','Caméra sur ')+x.place.name+(x.place.city&&x.place.city!==x.place.name?', '+x.place.city:''));
  else if(e.tool==='search_agents'||e.tool==='show_nearby_agents')out.push('✓ '+(x.total??x.agents?.length??0)+tr(' matching agents',' agents correspondants'));
  else if(e.tool==='retrieve_evidence')out.push('✓ '+(x.evidence?.length||0)+tr(' recorded claims checked',' constats enregistrés vérifiés'));
  else if(e.tool==='restore_previous_view')out.push('✓ '+tr('Previous view','Vue précédente'));}
 return [...new Set(out)];
}
function render(r,question,replace=null){
 output.hidden=false;const turn=el('article',null,'ci-turn');if(question)turn.append(el('p',question,'ci-q'));
 const synthesized=/model-synthesis/.test(r.responseKind||'')||r.mode!=='indexed-offline'&&r.responseKind!=='fast-route'&&r.responseKind!=='model-planned-receipt';
 // Camera and count receipts become action chips; the selection sentence (with its recorded-work status) stays as text.
 const ok=(r.events||[]).filter(e=>e.status==='succeeded'),selected=ok.some(e=>e.result?.agent);
 const moved=new Set(ok.filter(e=>e.result?.navigated&&e.result?.place||selected&&['search_agents','show_nearby_agents'].includes(e.tool)).map(e=>e.result.text));
 // Navigation receipts become action chips; the answer keeps what the person actually needs to read.
 const answer=r.error||synthesized?r.text:(r.actions||[r.text]).filter(t=>!moved.has(t)&&!/^(Location resolved|Lieu résolu)/.test(t)).join('\n');
 if(answer)turn.append(el('p',answer,r.error?'ci-answer ci-error':'ci-answer'));
 const acts=actionsOf(r);if(acts.length){const ul=el('ul',null,'ci-actions');for(const a of acts)ul.append(el('li',a));turn.append(ul);}
 const choices=el('div',null,'ci-choices');
 for(const p of r.places||[]){const b=el('button',p.name+' · '+p.city);b.type='button';b.className='ghost';b.onclick=()=>choose('place',p.id);choices.append(b);}
 const agents=(r.agents||[]).filter(a=>a.id!==r.selectedAgent||(r.agents.length>1));
 if(agents.length>1||agents.length===1&&!r.selectedAgent)for(const a of agents.slice(0,5)){const b=el('button',`${a.code} · ${a.domain} · ${a.city}`);b.type='button';b.className='ghost';b.append(el('small',(a.recorded?tr('recorded work','travail enregistré'):tr('no recorded investigation','aucune enquête enregistrée'))+(a.distanceM!=null?' · '+(a.distanceM>=1000?(a.distanceM/1000).toFixed(1)+' km':a.distanceM+' m'):'')));b.onclick=()=>choose('agent',a.id);choices.append(b);}
 if(choices.childElementCount)turn.append(choices);
 const d=el('details');d.append(el('summary',tr('Details, evidence and sources','Détails, preuves et sources')));
 const engineLine={'local-model':tr('Local Qwen3:8B on this computer','Qwen3:8B local sur cet ordinateur'),'browser-model':tr('On-device ','Sur l’appareil : ')+ai.label+' (WebLLM/WebGPU)','indexed-offline':tr('Deterministic indexed search (no model)','Recherche indexée déterministe (sans modèle)')}[r.mode]||r.mode;
 const route=/fast-route/.test(r.responseKind||'')?tr('fast validated router','routeur rapide validé'):tr('model-planned tools','outils planifiés par le modèle');
 const t=r.timings||{};d.append(el('p',`${engineLine} · ${route}${synthesized&&/fast/.test(r.responseKind||'')?tr(' + model answer',' + réponse du modèle'):''}${t.firstMoveMs!=null?' · '+tr('camera started at ','caméra lancée à ')+t.firstMoveMs+' ms':''}${t.totalMs!=null?' · '+tr('total ','total ')+t.totalMs+' ms':''}${t.modelMs?' · '+tr('model ','modèle ')+t.modelMs+' ms':''}`,'ci-fine'));
 if(r.warning)d.append(el('p',r.warning,'ci-fine'));
 if(synthesized&&!r.error)d.append(el('p',tr('Model-written answer, checked against the returned records; verify the cited evidence.','Réponse rédigée par le modèle, contrôlée sur les enregistrements renvoyés ; vérifiez les preuves citées.'),'ci-fine'));
 for(const e of r.evidence||[])d.append(el('p',`${e.id}: ${e.text}`,'ci-fine'));
 const sources=[...new Map([...(r.sources||[]),...(r.evidence||[]).filter(e=>e.href).map(e=>({id:e.id,text:e.id,href:e.href}))].map(s=>[s.id,s])).values()];
 if(sources.length){const links=el('div',null,'ci-sources');for(const s of sources.slice(0,10)){const target=href(s.href);if(!target)continue;const a=el('a',s.text||s.id);a.href=target;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}d.append(links);}
 for(const e of r.events||[])d.append(el('p',e.tool+' · '+e.status+(e.error?' · '+e.error:'')+(e.durationMs!=null?' · '+e.durationMs+' ms':''),'ci-fine'));
 if(r.pending)turn.append(el('p',tr('Writing the answer…','Rédaction de la réponse…'),'ci-fine'));
 turn.append(d);if(replace?.isConnected)replace.replaceWith(turn);else output.append(turn);while(output.querySelectorAll('.ci-turn').length>3)output.querySelector('.ci-turn').remove();output.scrollTop=turn.offsetTop-4;refreshChrome();return turn;
}
// ---------- on-device AI (public site) ----------
function renderAI(){
 const box=$('[data-ci-ai]');box.replaceChildren(el('h3',tr('Intelligence','Intelligence')));
 if(connection?.model){box.append(el('p',tr('Local Qwen3:8B through the loopback bridge on this computer. Clear commands use the fast router; the model handles complex questions and writes answers.','Qwen3:8B local via la passerelle de cet ordinateur. Les commandes claires passent par le routeur rapide ; le modèle traite les questions complexes et rédige les réponses.'),'ci-fine'));return;}
 if(ai.status==='unsupported'||ai.status==='checking'){box.append(el('p',tr('Fast validated search and navigation work here. On-device AI is unavailable in this browser','La recherche et la navigation validées fonctionnent ici. L’IA sur l’appareil est indisponible dans ce navigateur')+(ai.reason?' ('+ai.reason+')':'')+tr('; it needs WebGPU with 16-bit shaders (recent Chrome, Edge or Safari).','; elle exige WebGPU avec shaders 16 bits (Chrome, Edge ou Safari récents).'),'ci-fine'));return;}
 if(ai.status==='ready'){box.append(el('p',tr(`On-device AI ready: ${ai.label} running in this browser (WebLLM, WebGPU)`,`IA sur l’appareil prête : ${ai.label} dans ce navigateur (WebLLM, WebGPU)`)+(ai.loadMs!=null?tr(`, loaded in ${(ai.loadMs/1000).toFixed(1)} s`,`, chargée en ${(ai.loadMs/1000).toFixed(1)} s`):'')+tr('. Your requests are not sent to CORE.','. Vos demandes ne sont pas envoyées à CORE.'),'ci-fine'));const b=el('button',tr('Turn off on-device AI','Désactiver l’IA sur l’appareil'),'ghost small');b.type='button';b.onclick=disableAI;box.append(b);return;}
 const m=ai.modelId&&MODELS?.[ai.modelId];
 box.append(el('p',tr(`Run CORE’s AI in this browser: ${m?.label||'Qwen3'} (Apache-2.0), about ${m?.downloadMB||1000} MB downloaded once from Hugging Face and cached. It then interprets complex requests and writes grounded answers; your requests are not sent to CORE. Small models can be wrong: every action is still validated by CORE’s tools.`,`Exécuter l’IA de CORE dans ce navigateur : ${m?.label||'Qwen3'} (Apache-2.0), environ ${m?.downloadMB||1000} Mo téléchargés une fois depuis Hugging Face puis mis en cache. Elle interprète les demandes complexes et rédige des réponses étayées ; vos demandes ne sont pas envoyées à CORE. Un petit modèle peut se tromper : chaque action reste validée par les outils de CORE.`),'ci-fine'));
 if(ai.status==='loading'){const bar=el('div',null,'ci-progress'),i=el('i');i.style.width=Math.round(ai.progress*100)+'%';bar.append(i);box.append(bar,el('p',tr('Downloading and compiling… ','Téléchargement et compilation… ')+Math.round(ai.progress*100)+'%','ci-fine'));return;}
 if(ai.status==='failed')box.append(el('p',tr('Loading failed: ','Échec du chargement : ')+ai.reason,'ci-fine'));
 const b=el('button',tr('Enable on-device AI','Activer l’IA sur l’appareil'),'primary small');b.type='button';b.dataset.ciEnableAi='';b.onclick=()=>enableAI();box.append(b);
}
let MODELS=null;
async function detectAI(){
 if(connection?.model){ai.status='local';return refreshChrome();}
 const B=await import('./browser-model.mjs');MODELS=B.BROWSER_MODELS;const cap=await B.browserAICapability();
 if(!cap.supported){ai.status='unsupported';ai.reason=cap.reason;return refreshChrome();}
 ai.status='available';ai.modelId=cap.modelId;ai.label=MODELS[cap.modelId].label;refreshChrome();
 if(store.get('core.ai.consent')===cap.modelId)enableAI();
}
async function enableAI(){
 if(ai.status==='loading'||ai.status==='ready'||!ai.modelId)return;await initialization;
 store.set('core.ai.consent',ai.modelId);ai.status='loading';ai.progress=0;refreshChrome();
 try{const B=await import('./browser-model.mjs');ai.handle=await B.loadBrowserModel(ai.modelId,{onProgress:p=>{ai.progress=p.progress||0;modeChip.textContent=modeLabel();const i=root.querySelector('.ci-progress i');if(i)i.style.width=Math.round(ai.progress*100)+'%';}});
  ai.loadMs=ai.handle.loadMs;engine.setModel(ai.handle.model,'browser-model');ai.status='ready';}
 catch(e){ai.status='failed';ai.reason=String(e.message||e).slice(0,200);store.set('core.ai.consent',null);}
 refreshChrome();
}
async function disableAI(){store.set('core.ai.consent',null);engine?.setModel(null);await ai.handle?.unload();ai.handle=null;ai.status='available';refreshChrome();}
// ---------- voice ----------
const SR=()=>globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
function voiceMethod(){return connection?.transcription==='whisper.cpp-local'?'local':store.get('core.voice.method');}
function renderVoiceChoice(){
 const box=$('[data-ci-voice-choice]');box.replaceChildren();
 if(voiceMethod()==='local'){box.append(el('p',tr('Local whisper.cpp on this computer; audio is never stored.','whisper.cpp local sur cet ordinateur ; l’audio n’est jamais conservé.'),'ci-fine'));return;}
 for(const [id,en,fr] of [['whisper','On-device Whisper: about 150 MB downloaded once from Hugging Face; audio is transcribed in this browser and never stored.','Whisper sur l’appareil : environ 150 Mo téléchargés une fois depuis Hugging Face ; l’audio est transcrit dans ce navigateur et jamais conservé.'],...(SR()?[['browser','Browser speech service: starts instantly, but your browser may send the audio to its provider (Google for Chrome, Apple for Safari).','Service vocal du navigateur : démarrage immédiat, mais le navigateur peut envoyer l’audio à son fournisseur (Google pour Chrome, Apple pour Safari).']]:[])]){
  const l=el('label'),i=el('input');i.type='radio';i.name='ci-voice';i.value=id;i.checked=voiceMethod()===id;i.onchange=()=>{store.set('core.voice.method',id);voice?.mute();};l.append(i,el('span',tr(en,fr)));box.append(l);}
}
async function ensureSpeech(){
 if(speech)return speech;const {loadBrowserSpeech}=await import('./browser-speech.mjs');setState('loading',tr('on-device speech','voix sur l’appareil'));
 speech=loadBrowserSpeech({onProgress:p=>setState('loading',tr('on-device speech ','voix sur l’appareil ')+Math.round((p.progress||0)*100)+'%')});
 try{speech.info=await speech.ready;}catch(e){speech.terminate();speech=null;throw e;}return speech;
}
async function ensureVoice(){
 await initialization;if(voice)return voice;const {createVoice}=await import('./voice.mjs');
 voice=createVoice({transcribe:(wav,language,signal)=>voiceMethod()==='local'?connection.transcribe(wav,language,signal):speech.transcribe(wav,language,signal),language:()=>engine?.state.language||lang(),onState:setState,onTranscript:async(value,final)=>{input.value=value;if(final)await submit(value,{spoken:true});}});return voice;
}
function askVoice(){
 consent.replaceChildren(el('h3',tr('Choose how CORE hears you','Choisissez comment CORE vous entend')));renderVoiceChoice();
 const choices=[['whisper',tr('Use on-device Whisper','Utiliser Whisper sur l’appareil')],...(SR()?[['browser',tr('Use browser speech service','Utiliser le service du navigateur')]]:[])];
 consent.append(el('p',tr('On-device Whisper downloads about 150 MB once from Hugging Face and keeps audio in this browser. The browser speech service may send audio to Google or Apple. CORE never stores audio. Typing always works.','Whisper sur l’appareil télécharge environ 150 Mo une fois depuis Hugging Face et garde l’audio dans ce navigateur. Le service du navigateur peut envoyer l’audio à Google ou Apple. CORE ne conserve jamais l’audio. La saisie fonctionne toujours.'),'ci-fine'));
 for(const [id,label] of choices){const b=el('button',label,id==='whisper'?'primary small':'small');b.type='button';b.dataset.ciVoice=id;b.onclick=()=>{store.set('core.voice.method',id);consent.hidden=true;listen();};consent.append(b);}
 const c=el('button',tr('Cancel','Annuler'),'ghost small');c.type='button';c.onclick=()=>{consent.hidden=true;input.focus();};consent.append(c);consent.hidden=false;settings.hidden=true;
}
async function listen(){
 const method=voiceMethod();if(!method)return askVoice();
 try{voiceStart=performance.now();if(method==='whisper')await ensureSpeech();const v=await ensureVoice();engine.cancel();v.stopSpeech();voiceStart=performance.now();await v.start({browser:method==='browser',consent:method==='browser'});}
 catch(e){conversation=false;$('[data-ci-conversation]').checked=false;setState('error',e.name==='NotAllowedError'?tr('microphone permission denied','permission du micro refusée'):e.message);}
}
// ---------- requests ----------
async function submit(value,{spoken=false}={}){
 const q=String(value||'').trim();if(!q)return;if(busy){engine?.cancel();return;}
 if(globalThis.CORE_EARTH&&!CORE_EARTH.exploring&&CORE_EARTH.state?.map)CORE_EARTH.revealMap();
 const requestGeneration=++generation;busy=true;lastRequest=q;input.value='';setState('thinking');
 try{await initialization;let provisional=null;const begun=performance.now(),r=await engine.run(q,{onProgress:p=>{if(requestGeneration===generation)provisional=render(p,q);}});if(requestGeneration!==generation)return;
  if(spoken&&voiceMark!=null){r.timings={...r.timings,transcribeMs:Math.round(begun-voiceMark),speechEndToFirstMoveMs:r.timings?.firstMoveMs!=null?Math.round(begun-voiceMark+r.timings.firstMoveMs):null,activationToFirstMoveMs:voiceStart!=null&&r.timings?.firstMoveMs!=null?Math.round(begun-voiceStart+r.timings.firstMoveMs):null};voiceMark=null;}
  lastResult=r;if(r.language&&r.language!==lang())setLang(r.language);render(r,q,provisional);
  if(spoken&&!r.error){const v=await ensureVoice();const resume=()=>{if(conversation&&!document.hidden)setTimeout(()=>{if(conversation)listen();},400);};if($('[data-ci-speak]').checked){if(!v.speak(r.text,{onEnd:resume}))resume();}else resume();}}
 catch(e){render({text:e.message,error:true,mode:'indexed-offline'},q);setState('error',e.message);}
 finally{if(requestGeneration===generation){busy=false;if(root.dataset.state!=='speaking'&&root.dataset.state!=='error'&&root.dataset.state!=='listening')setState('idle');}}
}
async function choose(type,id){
 if(busy)return;await initialization;busy=true;
 try{const result=await engine.choose(type,id);render(result);}catch(e){setState('error',e.message);}finally{busy=false;}
}
const initialization=Promise.all([loadCatalog(),localConnection()]).then(([catalog,c])=>{
 connection=c;engine=createIntelligence({catalog,map:earthMap(),model:c.model,modelKind:'local-model',initialLanguage:lang(),geocode:photon({enabled:()=>$('[data-ci-geocode]').checked}),onState:setState});
 detectAI().catch(e=>{ai.status='unsupported';ai.reason=e.message;refreshChrome();});return engine;
}).catch(e=>{setState('error',e.message);throw e;});initialization.catch(()=>{});
setState('idle');refreshChrome();
$('[data-ci-form]').onsubmit=e=>{e.preventDefault();submit(input.value);};
$('[data-ci-mic]').onclick=async()=>{if(voice?.listening){conversation=false;$('[data-ci-conversation]').checked=false;await voice.stop({submit:true});}else if(root.dataset.state==='speaking'){voice?.stopSpeech();listen();}else listen();};
$('[data-ci-cancel]').onclick=()=>{conversation=false;$('[data-ci-conversation]').checked=false;engine?.cancel();voice?.mute();};
$('[data-ci-reset]').onclick=()=>{generation++;busy=false;conversation=false;engine?.reset();voice?.mute();output.replaceChildren();output.hidden=true;input.value='';$('[data-ci-conversation]').checked=false;refreshChrome();input.focus();};
toggle.onclick=()=>{output.hidden=!output.hidden;refreshChrome();};
const openSettings=()=>{settings.hidden=!settings.hidden;consent.hidden=true;$('[data-ci-more]').setAttribute('aria-expanded',String(!settings.hidden));if(!settings.hidden){renderAI();renderVoiceChoice();}};
$('[data-ci-more]').onclick=openSettings;modeChip.onclick=openSettings;
$('[data-ci-conversation]').onchange=e=>{conversation=e.target.checked;if(conversation)listen();else voice?.mute();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!settings.hidden||!consent.hidden)){settings.hidden=true;consent.hidden=true;$('[data-ci-more]').setAttribute('aria-expanded','false');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){conversation=false;$('[data-ci-conversation]').checked=false;voice?.mute();}});
document.addEventListener('core:lang',()=>{setState(root.dataset.state||'idle');refreshChrome();});
window.addEventListener('pagehide',()=>{voice?.mute();engine?.cancel();});
globalThis.CORE_INTELLIGENCE={submit,enableAI,listen,
 focus(){if(globalThis.CORE_EARTH&&!CORE_EARTH.exploring)CORE_EARTH.start?.();setTimeout(()=>input.focus(),50);},
 setVoiceMethod(id){store.set('core.voice.method',id);},
 get engine(){return engine;},get lastRequest(){return lastRequest;},get lastResult(){return lastResult;},get voice(){return voice;},get ai(){return {status:ai.status,modelId:ai.modelId,label:ai.label,loadMs:ai.loadMs,reason:ai.reason,progress:ai.progress};},get speech(){return speech?.info||null;}};
