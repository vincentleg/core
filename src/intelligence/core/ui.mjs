import {speechReview} from '../../ui/speech-review.mjs';
import {loadCatalog} from './catalog.mjs';import {createIntelligence} from './engine.mjs';import {earthMap} from './map.mjs';import {localConnection} from './connection.mjs';import {photon} from './geocoder.mjs';import {lang,T} from '../../i18n/i18n.mjs';import {startDictation,dictationMessage} from '../../ui/dictation.mjs';
// Compact text command bar: one input, send, a status line and a collapsible answer card. Evidence, sources, engine
// and timings live behind "Details". The on-device model downloads only after an explicit choice.
const root=document.getElementById('core-intelligence'),$=s=>root.querySelector(s),input=$('[data-ci-query]'),output=$('[data-ci-output]'),status=$('[data-ci-state]'),modeChip=$('[data-ci-mode]'),toggle=$('[data-ci-collapse]'),settings=$('[data-ci-settings]');
const tr=T;
const store={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);}catch{}}};
const WORDS={idle:['Ready','Prêt'],thinking:['Thinking…','Réflexion…'],executing:['Thinking…','Réflexion…'],navigating:['Navigating…','Navigation…'],loading:['Loading…','Chargement…'],error:['Unavailable — try again or rephrase','Indisponible — réessayez ou reformulez']};
let engine=null,connection=null,busy=false,lastRequest=null,lastResult=null,generation=0,failure=null;
const ai={status:'checking',modelId:null,label:null,reason:'',progress:0,loadMs:null,handle:null};
function setState(value,detail=''){
 root.dataset.state=value;const w=WORDS[value]||WORDS.error;status.textContent=T(w[0],w[1])+(detail&&value!=='executing'&&value!=='navigating'?' · '+detail:'');
 const active=['thinking','executing','navigating'].includes(value);$('[data-ci-cancel]').hidden=!active;$('[data-ci-submit]').hidden=active;
}
function el(tag,content,cls=''){const e=document.createElement(tag);if(content!=null)e.textContent=content;if(cls)e.className=cls;return e;}
function href(value){try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function modeLabel(){
 if(engine?.modelKind==='local-model')return tr('Local AI · Qwen3 8B','IA locale · Qwen3 8B');
 if(engine?.modelKind==='browser-model')return tr('On-device AI · ','IA sur l’appareil · ')+ai.label;
 if(ai.status==='loading')return tr('AI loading ','IA en chargement ')+Math.round(ai.progress*100)+'%';
 return tr('Commands and recorded answers','Commandes et réponses enregistrées');
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
 const safety=r.responseKind==='safety',synthesized=!safety&&(/model-synthesis/.test(r.responseKind||'')||r.mode!=='indexed-offline'&&r.responseKind!=='fast-route'&&r.responseKind!=='model-planned-receipt');
 // Camera and count receipts become action chips; the selection sentence (with its recorded-work status) stays as text.
 const ok=(r.events||[]).filter(e=>e.status==='succeeded'),selected=ok.some(e=>e.result?.agent);
 const moved=new Set(ok.filter(e=>e.result?.navigated&&e.result?.place||selected&&['search_agents','show_nearby_agents'].includes(e.tool)).map(e=>e.result.text));
 // Navigation receipts become action chips; the answer keeps what the person actually needs to read.
 const answer=r.error||synthesized||safety?r.text:(r.actions||[r.text]).filter(t=>!moved.has(t)&&!/^(Location resolved|Lieu résolu)/.test(t)).join('\n');
 if(answer)turn.append(el('p',answer,r.error?'ci-answer ci-error':'ci-answer'));
 const acts=actionsOf(r);if(acts.length){const ul=el('ul',null,'ci-actions');for(const a of acts)ul.append(el('li',a));turn.append(ul);}
 const choices=el('div',null,'ci-choices');
 for(const p of r.places||[]){const b=el('button',[p.name,p.type,p.address,p.city,p.country].filter(Boolean).join(' · '));b.type='button';b.className='ghost';b.onclick=()=>choose('place',p.id);choices.append(b);}
 const agents=(r.agents||[]).filter(a=>a.id!==r.selectedAgent||(r.agents.length>1));
 if(agents.length>1||agents.length===1&&!r.selectedAgent)for(const a of agents.slice(0,5)){const b=el('button',`${a.code} · ${a.domain} · ${a.city}`);b.type='button';b.className='ghost';b.append(el('small',(a.recorded?tr('recorded work','travail enregistré'):tr('no recorded investigation','aucune enquête enregistrée'))+(a.distanceM!=null?' · '+(a.distanceM>=1000?(a.distanceM/1000).toFixed(1)+' km':a.distanceM+' m'):'')));b.onclick=()=>choose('agent',a.id);choices.append(b);}
 if(choices.childElementCount)turn.append(choices);
 const d=el('details');d.append(el('summary',tr('Details, evidence and sources','Détails, preuves et sources')));
 const engineLine={'local-model':tr('Local Qwen3:8B on this computer','Qwen3:8B local sur cet ordinateur'),'browser-model':tr('On-device ','Sur l’appareil : ')+ai.label+' (WebLLM/WebGPU)','indexed-offline':tr('Deterministic indexed search (no model)','Recherche indexée déterministe (sans modèle)'),safety:tr('Fixed safety message (no model)','Message de sécurité fixe (sans modèle)')}[r.mode]||r.mode;
 const route=safety?'':/fast-route/.test(r.responseKind||'')?tr('fast validated router','routeur rapide validé'):tr('model-planned tools','outils planifiés par le modèle');
 const t=r.timings||{};d.append(el('p',`${engineLine}${route?' · '+route:''}${synthesized&&/fast/.test(r.responseKind||'')?tr(' + model answer',' + réponse du modèle'):''}${t.firstMoveMs!=null?' · '+tr('camera started at ','caméra lancée à ')+t.firstMoveMs+' ms':''}${t.totalMs!=null?' · '+tr('total ','total ')+t.totalMs+' ms':''}${t.modelMs?' · '+tr('model ','modèle ')+t.modelMs+' ms':''}`,'ci-fine'));
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
 const box=$('[data-ci-ai]');box.replaceChildren(el('h3',tr('Advanced AI (optional)','IA avancée (facultative)')));
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
// ---------- requests ----------
async function submit(value,{keepInput=false}={}){
 const q=String(value||'').trim();if(!q)return;document.dispatchEvent(new Event('core:navigation-request'));if(busy){engine?.cancel();return;}
 if(globalThis.CORE_EARTH&&!CORE_EARTH.exploring&&CORE_EARTH.state?.map)CORE_EARTH.revealMap();
 const requestGeneration=++generation;busy=true;lastRequest=q;if(!keepInput)input.value='';setState('thinking');
 try{await initialization;let provisional=null;const r=await engine.run(q,{language:lang(),onProgress:p=>{if(requestGeneration===generation)provisional=render(p,q);}});if(requestGeneration!==generation)return;
  lastResult=r;render(r,q,provisional);}
 catch(e){render({text:e.message,error:true,mode:'indexed-offline'},q);setState('error',e.message);}
 finally{if(requestGeneration===generation){busy=false;if(root.dataset.state!=='error')setState('idle');}}
}
async function choose(type,id){
 if(busy)return;await initialization;busy=true;
 try{const result=await engine.choose(type,id);lastResult=result;render(result);}catch(e){setState('error',e.message);}finally{busy=false;}
}
const geocodeChoice=$('[data-ci-geocode]');
geocodeChoice.checked=store.get('core.geocode.consent')==='photon-v1';
geocodeChoice.onchange=()=>store.set('core.geocode.consent',geocodeChoice.checked?'photon-v1':'denied');
const allowGeocode=()=>{
 if(geocodeChoice.checked)return true;if(store.get('core.geocode.consent')==='denied')return false;
 geocodeChoice.checked=confirm(T('Search this place with Photon/komoot? It receives the place name, the map context center and your IP address, not audio or the full chat. OpenStreetMap/ODbL; free demo with no availability guarantee. Remember this choice in this browser?','Rechercher ce lieu avec Photon/komoot ? Le service reçoit le nom du lieu, le centre du contexte cartographique et votre adresse IP, pas le son ni toute la conversation. OpenStreetMap/ODbL ; démonstration gratuite sans garantie de disponibilité. Mémoriser ce choix dans ce navigateur ?'));
 geocodeChoice.onchange();return geocodeChoice.checked;
};
const initialization=Promise.all([loadCatalog(),localConnection()]).then(([catalog,c])=>{
 connection=c;engine=createIntelligence({catalog,map:earthMap(),model:c.model,modelKind:'local-model',initialLanguage:lang(),geocode:photon({enabled:allowGeocode}),onState:setState});
 refreshChrome();return engine;
}).catch(e=>{failure=String(e?.message||e).slice(0,200);setState('error',e.message);throw e;});initialization.catch(()=>{});
setState('idle');refreshChrome();
$('[data-ci-form]').onsubmit=e=>{e.preventDefault();submit(input.value);};
// Native voice input is independent of the optional LLM; final text uses the same command pipeline.
let stopDictation=null;const mic=$('[data-ci-mic]');
const review=speechReview(input,$('[data-ci-form]'),()=>{stopDictation?.();stopDictation=null;});
settings.prepend(review.languageControl);
mic.onclick=async()=>{if(stopDictation){stopDictation();stopDictation=null;return;}
 stopDictation=startDictation({code:review.code(),onText:review.receive,onState:(st,d)=>{
  const active=st==='preparing'||st==='listening';mic.setAttribute('aria-pressed',String(active));
  mic.setAttribute('aria-label',active?T('Stop listening','Arrêter l’écoute'):T('Speak a request','Dicter une demande'));
  if(active)status.textContent=dictationMessage(st==='preparing'?'preparing':d);
  else{stopDictation=null;if(st==='error')setState('error',dictationMessage(d));else if(!busy)setState('idle');}
 }});
};
document.addEventListener('core:lang',()=>stopDictation?.());
window.addEventListener('pagehide',()=>stopDictation?.());
$('[data-ci-cancel]').onclick=()=>{engine?.cancel();};
$('[data-ci-reset]').onclick=()=>{stopDictation?.();review.clear();generation++;busy=false;engine?.reset();output.replaceChildren();output.hidden=true;input.value='';refreshChrome();input.focus();};
toggle.onclick=()=>{output.hidden=!output.hidden;refreshChrome();};
const openSettings=()=>{settings.hidden=!settings.hidden;$('[data-ci-more]').setAttribute('aria-expanded',String(!settings.hidden));if(!settings.hidden)renderAI();};
$('[data-ci-more]').onclick=openSettings;modeChip.onclick=openSettings;
$('[data-ci-advanced]').ontoggle=()=>{if($('[data-ci-advanced]').open&&ai.status==='checking')detectAI().catch(e=>{ai.status='unsupported';ai.reason=e.message;refreshChrome();});};
document.addEventListener('keydown',e=>{if(e.key==='Escape')stopDictation?.();if(e.key==='Escape'&&!settings.hidden){settings.hidden=true;$('[data-ci-more]').setAttribute('aria-expanded','false');$('[data-ci-more]').focus();}});
document.addEventListener('core:lang',()=>{setState(root.dataset.state||'idle');refreshChrome();});
window.addEventListener('pagehide',()=>{engine?.cancel();});
globalThis.CORE_INTELLIGENCE={submit,enableAI,
 focus(){if(globalThis.CORE_EARTH&&!CORE_EARTH.exploring)CORE_EARTH.start?.();setTimeout(()=>input.focus(),50);},
 get engine(){return engine;},get failed(){return failure;},get lastRequest(){return lastRequest;},get lastResult(){return lastResult;},get ai(){return {status:ai.status,modelId:ai.modelId,label:ai.label,loadMs:ai.loadMs,reason:ai.reason,progress:ai.progress};}};

new ResizeObserver(()=>document.documentElement.style.setProperty('--ci-h',root.offsetHeight+'px')).observe(root);

try { const pending=sessionStorage.getItem('core.navigation.pending');sessionStorage.removeItem('core.navigation.pending');if(pending&&pending.length<=300)initialization.then(()=>submit(pending)); } catch {}
