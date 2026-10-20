export function wav(samples,sampleRate){
 if(!Number.isFinite(sampleRate)||sampleRate<16000||samples.length/sampleRate>30.5)throw Error('Invalid audio duration/sample rate');
 const size=Math.floor(samples.length*16000/sampleRate),buffer=new ArrayBuffer(44+size*2),v=new DataView(buffer),put=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
 put(0,'RIFF');v.setUint32(4,36+size*2,true);put(8,'WAVE');put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);put(36,'data');v.setUint32(40,size*2,true);
 for(let i=0;i<size;i++){const start=Math.floor(i*sampleRate/16000),end=Math.max(start+1,Math.floor((i+1)*sampleRate/16000));let sum=0;for(let j=start;j<end&&j<samples.length;j++)sum+=samples[j];const s=Math.max(-1,Math.min(1,sum/(end-start)));v.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true);}return buffer;
}
export function createVoice({transcribe,onTranscript,onState,language=()=> 'en',host=globalThis}){
 let stream=null,context=null,node=null,source=null,rec=null,timer=null,parts=[],count=0,rate=0,started=0,lastSound=0,heard=false,processing=false,epoch=0,ctl=null;
 const stopSpeech=()=>host.speechSynthesis?.cancel();
 async function cleanup(){clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());stream=null;node?.disconnect();source?.disconnect();node=null;source=null;await context?.close().catch(()=>{});context=null;}
 async function stop({submit=false}={}){
  if(!submit)epoch++;if(rec){const r=rec;rec=null;r.abort();}if(processing&&!submit){ctl?.abort();epoch++;processing=false;}
  const snapshot=parts,total=count,frequency=rate;parts=[];count=0;await cleanup();
  if(submit&&heard&&total&&transcribe){processing=true;const generation=++epoch;ctl=new AbortController();onState('transcribing');try{const pcm=new Float32Array(total);let pos=0;for(const part of snapshot){pcm.set(part,pos);pos+=part.length;}const result=await transcribe(wav(pcm,frequency),language(),ctl.signal);if(generation===epoch&&result.text?.trim())await onTranscript(result.text.trim(),true);else if(generation===epoch)onState('idle');}catch(e){if(generation===epoch)onState('error',e.message);}finally{if(generation===epoch)processing=false;}}
  else onState('idle');
 }
 async function start({browser=false,consent=false}={}){
  await stop();stopSpeech();onState('connecting');
  if(browser){
   const SR=host.SpeechRecognition||host.webkitSpeechRecognition;if(!SR)throw Error('Browser speech recognition is unavailable');
   const onDevice='processLocally' in SR.prototype;if(!onDevice&&!consent)throw Error('Browser recognition may send audio to its provider; explicit consent is required');
   rec=new SR();if(onDevice&&!consent)rec.processLocally=true;rec.lang=language()==='fr'?'fr-FR':'en-US';rec.continuous=false;rec.interimResults=true;
   rec.onstart=()=>onState('listening');rec.onresult=e=>{let interim='',final='';for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)final+=r[0].transcript;else interim+=r[0].transcript;}if(interim)onTranscript(interim,false);if(final){rec=null;onTranscript(final,true);}};rec.onerror=e=>{rec=null;onState('error',e.error);};rec.onend=()=>{rec=null;};rec.start();return;
  }
  if(!transcribe)throw Error('Local Whisper is unavailable; type or explicitly choose browser recognition');
  if(!host.navigator?.mediaDevices?.getUserMedia)throw Error('Microphone access requires a supported secure browser');
  const current=++epoch;
  try{
   const media=await host.navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
   if(current!==epoch){media.getTracks().forEach(t=>t.stop());return;}
   stream=media;context=new (host.AudioContext||host.webkitAudioContext)();rate=context.sampleRate;started=Date.now();lastSound=started;heard=false;parts=[];count=0;
   source=context.createMediaStreamSource(stream);
   const receive=data=>{if(!stream)return;const part=new Float32Array(data);parts.push(part);count+=part.length;let energy=0;for(const x of part)energy+=x*x;const sound=Math.sqrt(energy/part.length)>.015;if(sound){heard=true;lastSound=Date.now();}if(count/rate>=29.5)stop({submit:true});};
   if(context.audioWorklet&&host.AudioWorkletNode){await context.audioWorklet.addModule(new URL('./capture-worklet.mjs',import.meta.url));node=new host.AudioWorkletNode(context,'core-microphone');node.port.onmessage=e=>receive(e.data);}
   else{node=context.createScriptProcessor(2048,1,1);node.onaudioprocess=e=>receive(e.inputBuffer.getChannelData(0));}
   source.connect(node);node.connect(context.destination);await context.resume();onState('listening');
   const silence=()=>{if(!stream)return;if(heard&&Date.now()-lastSound>1300&&Date.now()-started>700)stop({submit:true});else if(!heard&&Date.now()-started>10000)stop();else timer=setTimeout(silence,200);};timer=setTimeout(silence,200);
  }catch(e){await cleanup();onState('error',e.name==='NotAllowedError'?'Microphone permission denied':e.message);throw e;}
 }
 function speak(text,{onEnd=()=>{}}={}){
  stopSpeech();const synth=host.speechSynthesis,U=host.SpeechSynthesisUtterance;if(!synth||!U){onEnd();return false;}
  const voice=synth.getVoices().find(v=>v.localService&&v.lang.toLowerCase().startsWith(language()));if(!voice){onEnd();return false;}
  const u=new U(text.slice(0,1600));u.voice=voice;u.lang=voice.lang;u.onstart=()=>onState('speaking');u.onend=()=>{onState('idle');onEnd();};u.onerror=()=>onState('error','Speech output unavailable');synth.speak(u);return true;
 }
 return {start,stop,speak,stopSpeech,mute:async()=>{epoch++;ctl?.abort();stopSpeech();await stop();onState('muted');},get listening(){return !!stream||!!rec;}};
}
