import {loadCatalog} from './catalog.mjs';import {createIntelligence} from './engine.mjs';import {earthMap} from './map.mjs';import {localConnection} from './connection.mjs';import {photon} from './geocoder.mjs';import {lang,setLang} from '../../i18n/i18n.mjs';
const root=document.getElementById('core-intelligence'),$=s=>root.querySelector(s),input=$('[data-ci-query]'),output=$('[data-ci-output]'),status=$('[data-ci-state]'),badge=$('[data-ci-mode]');
const words={idle:['Ready','Prêt'],connecting:['Connecting microphone…','Connexion du microphone…'],listening:['Listening — stop or speak','Écoute — parlez ou arrêtez'],transcribing:['Transcribing locally…','Transcription locale…'],thinking:['Thinking…','Réflexion…'],executing:['Executing verified tool…','Exécution de l’outil…'],speaking:['Speaking — microphone interrupts','Réponse vocale — le micro interrompt'],muted:['Microphone muted','Microphone coupé'],offline:['Conversational AI offline · indexed search','IA conversationnelle hors ligne · recherche indexée'],error:['Unavailable — typing still works','Indisponible — saisie toujours possible']};
const tr=(en,fr)=>lang()==='fr'?fr:en;let engine=null,voice=null,connection=null,busy=false,conversation=false,lastRequest=null,lastResult=null;
function setState(value,detail=''){status.dataset.state=value;status.textContent=(words[value]||words.error)[lang()==='fr'?1:0]+(detail?' · '+detail:'');$('[data-ci-mic]').setAttribute('aria-pressed',String(value==='listening'||value==='connecting'));$('[data-ci-cancel]').hidden=!['thinking','executing','connecting','listening','transcribing','speaking'].includes(value);}
function text(tag,content,cls=''){const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;}
function href(value){try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function render(result){
 output.hidden=false;root.classList.add('ci-active');const turn=document.createElement('article');turn.className='ci-turn';turn.append(text('p',result.text,result.error?'ci-error':'ci-answer'));
 turn.append(text('p',result.mode==='local-model'?tr('Local Ollama / Qwen3:8B · model synthesis; verify cited evidence','Ollama / Qwen3:8B local · synthèse du modèle ; vérifiez les preuves'):tr('AI offline · deterministic indexed search/navigation, no model response','IA hors ligne · recherche/navigation indexée déterministe, sans réponse de modèle'),'ci-fine'));
 for(const p of result.places||[]){const b=text('button',p.name+' · '+p.city);b.type='button';b.onclick=()=>choose('place',p.id);turn.append(b);}
 if(result.agents?.length){const list=document.createElement('ul');list.className='ci-agents';for(const a of result.agents){const li=document.createElement('li'),b=text('button',`${a.code} · ${a.domain} · ${a.city}`);b.type='button';b.onclick=()=>choose('agent',a.id);li.append(b,text('small',`${a.taskStatus} · ${tr('worker offline','travailleur hors ligne')}${a.distanceM!=null?' · '+a.distanceM+' m':''}`));list.append(li);}turn.append(list);}
 if(result.evidence?.length){const d=document.createElement('details');d.append(text('summary',tr('Evidence and limitations','Preuves et limites')));for(const e of result.evidence)d.append(text('p',`${e.id}: ${e.text}`,'ci-fine'));turn.append(d);}
 const sources=[...(result.sources||[]),...(result.evidence||[]).filter(e=>e.href).map(e=>({id:e.id,text:e.id,href:e.href}))];if(sources.length){const links=document.createElement('div');links.className='ci-sources';for(const s of sources.slice(0,12)){const target=href(s.href);if(!target)continue;const a=text('a',s.text||s.id);a.href=target;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}turn.append(links);}
 if(result.events?.length){const d=document.createElement('details');d.append(text('summary',tr('Actual tool outcomes','Résultats réels des outils')));for(const e of result.events)d.append(text('p',e.tool+' · '+e.status+(e.error?' · '+e.error:''),'ci-fine'));turn.append(d);}
 output.append(turn);while(output.querySelectorAll('.ci-turn').length>6)output.querySelector('.ci-turn').remove();turn.scrollIntoView({block:'nearest',behavior:'auto'});
}
const initialization=Promise.all([loadCatalog(),localConnection()]).then(([catalog,c])=>{
 connection=c;badge.textContent=c.model?tr('LOCAL AI · Qwen3:8B','IA LOCALE · Qwen3:8B'):tr('AI OFFLINE · indexed search','IA HORS LIGNE · recherche indexée');
 engine=createIntelligence({catalog,map:earthMap(),model:c.model,geocode:photon({enabled:()=>$('[data-ci-geocode]').checked}),onState:setState});return engine;
}).catch(e=>{setState('error',e.message);throw e;});initialization.catch(()=>{});
async function ensureVoice(){
 await initialization;if(voice)return voice;const {createVoice}=await import('./voice.mjs');
 voice=createVoice({transcribe:connection.transcription==='whisper.cpp-local'?connection.transcribe:null,language:()=>engine?.state.language||lang(),onState:setState,onTranscript:async(value,final)=>{input.value=value;if(final)await submit(value,{spoken:true});}});return voice;
}
async function listen(){
 try{const v=await ensureVoice();engine.cancel();v.stopSpeech();conversation=true;$('[data-ci-conversation]').checked=true;await v.start({browser:$('[data-ci-browser]').checked,consent:$('[data-ci-browser]').checked});}catch(e){conversation=false;$('[data-ci-conversation]').checked=false;setState('error',e.message);}
}
async function submit(value,{spoken=false}={}){
 const q=String(value||'').trim();if(!q)return;if(busy){engine?.cancel();return;}
 busy=true;root.classList.add('ci-active');output.hidden=false;output.append(text('p',q,'ci-question'));lastRequest=q;input.value='';$('[data-ci-submit]').disabled=true;setState('thinking');
 try{await initialization;const r=await engine.run(q);lastResult=r;if(r.language&&r.language!==lang())setLang(r.language);render(r);if(r.mode!=='local-model')setState('offline');if(spoken&&conversation&&!r.error){const v=await ensureVoice();const resume=()=>{if(conversation&&!document.hidden)setTimeout(()=>{if(conversation)listen();},500);};if($('[data-ci-speak]').checked){if(!v.speak(r.text,{onEnd:resume}))setState('idle',tr('No compatible local voice; text shown','Aucune voix locale compatible ; réponse écrite'));}else resume();}}catch(e){render({text:e.message,error:true,mode:'indexed-offline'});setState('error',e.message);}finally{busy=false;$('[data-ci-submit]').disabled=false;}
}
async function choose(type,id){
 if(busy)return;await initialization;busy=true;
 try{const result=await engine.choose(type,id);render(result);}catch(e){setState('error',e.message);}finally{busy=false;}
}
$('[data-ci-form]').onsubmit=e=>{e.preventDefault();submit(input.value);};
$('[data-ci-mic]').onclick=async()=>{const v=await ensureVoice();if(v.listening){conversation=false;$('[data-ci-conversation]').checked=false;await v.stop({submit:true});}else await listen();};
$('[data-ci-cancel]').onclick=()=>{conversation=false;$('[data-ci-conversation]').checked=false;engine?.cancel();voice?.mute();setState('muted');};
$('[data-ci-reset]').onclick=()=>{conversation=false;engine?.reset();voice?.mute();output.replaceChildren();output.hidden=true;input.value='';$('[data-ci-conversation]').checked=false;input.focus();};
$('[data-ci-collapse]').onclick=()=>{output.hidden=!output.hidden;};
$('[data-ci-conversation]').onchange=e=>{conversation=e.target.checked;if(conversation)listen();else voice?.mute();};
$('[data-ci-browser]').onchange=()=>{conversation=false;$('[data-ci-conversation]').checked=false;voice?.mute();};
root.querySelectorAll('[data-ci-example]').forEach(b=>b.onclick=()=>submit(b.textContent));
document.addEventListener('visibilitychange',()=>{if(document.hidden){conversation=false;$('[data-ci-conversation]').checked=false;voice?.mute();}});
document.addEventListener('core:lang',()=>{input.placeholder=tr('Ask CORE anything. Explore Earth, find agents, investigate problems…','Demandez à CORE. Explorez la Terre, trouvez des agents, examinez les preuves…');});
window.addEventListener('pagehide',()=>{voice?.mute();engine?.cancel();});
globalThis.CORE_INTELLIGENCE={submit,focus(){input.focus();},get engine(){return engine;},get lastRequest(){return lastRequest;},get lastResult(){return lastResult;},get voice(){return voice;}};
