import {coordinates,distance} from './catalog.mjs';
export function earthMap({earth=()=>globalThis.CORE_EARTH}={}){
 let previous=null,following=null,pending=null,followFrame=0;
 async function ready(signal){const started=Date.now();while(!earth()?.state.ready){signal?.throwIfAborted();if(Date.now()-started>15000)throw Error('Earth map is not ready');await new Promise(r=>setTimeout(r,80));}return earth();}
 function cancel(){following=null;cancelAnimationFrame(followFrame);earth()?.state.map?.stop();pending?.();pending=null;}
 function point(a){return earth()?.state.urban?.city.positions.find(p=>p.id===a.id)?.coordinates||a.assignment;}
 function paint(features){const map=earth()?.state.map;if(!map?.getStyle())throw Error('Map style unavailable');const data={type:'FeatureCollection',features};if(map.getSource('core-intelligence-results'))map.getSource('core-intelligence-results').setData(data);else{map.addSource('core-intelligence-results',{type:'geojson',data});map.addLayer({id:'core-intelligence-results',type:'circle',source:'core-intelligence-results',paint:{'circle-radius':9,'circle-color':'#67e8f9','circle-opacity':.6,'circle-stroke-color':'#e2fcff','circle-stroke-width':2}});}}
 const feature=(id,coord)=>({type:'Feature',geometry:{type:'Point',coordinates:coord},properties:{id}});
 async function move(center,zoom,{signal}={}){
  if(!coordinates(center)||!Number.isFinite(zoom)||zoom<1||zoom>19)throw Error('Invalid navigation target');const E=await ready(signal),map=E.state.map;
  cancel();signal?.throwIfAborted();previous={center:map.getCenter().toArray(),zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()};E.state.follow=null;E.revealMap();
  await new Promise((resolve,reject)=>{
   let timer;const finish=error=>{clearTimeout(timer);map.off('moveend',end);signal?.removeEventListener('abort',abort);pending=null;error?reject(error):resolve();};
   const end=()=>{if(signal?.aborted)return finish(Error('Navigation cancelled'));if(distance(map.getCenter().toArray(),center)>120)return finish(Error('Camera interrupted before reaching destination'));finish();};
   const abort=()=>{map.stop();finish(Error('Navigation cancelled'));};pending=abort;signal?.addEventListener('abort',abort,{once:true});map.on('moveend',end);timer=setTimeout(()=>finish(Error('Camera did not confirm destination')),5500);
   const options={center,zoom,pitch:zoom>14?45:25,bearing:0,padding:{left:0,right:0,top:0,bottom:0}};if(matchMedia('(prefers-reduced-motion: reduce)').matches)map.jumpTo(options);else map.flyTo({...options,duration:1400,essential:false});
   if(distance(map.getCenter().toArray(),center)<1&&!map.isMoving())end();
  });
 }
 async function selectAgent(a,{signal,follow=false}={}){
  const E=await ready(signal);await E.state.urbanReady;if(!E.state.urban?.catalog.agents.some(x=>x.id===a.id))throw Error('Agent panel unavailable');
  const target=point(a);await move(target,16,{signal});paint([feature(a.id,target)]);E.showAgent(a.id);
  if(!document.getElementById('ea-panel')||document.getElementById('ea-panel').hidden)throw Error('Agent panel did not open');
  if(follow){following=a;const tick=()=>{if(!following)return;const p=point(following);if(coordinates(p)){E.state.map.jumpTo({center:p});paint([feature(a.id,p)]);}followFrame=requestAnimationFrame(tick);};tick();}
 }
 return {center:()=>earth()?.state.map?.getCenter().toArray()||null,fly:(p,options)=>move(p.coordinates,p.zoom||15,options),highlight:async p=>{await ready();paint([feature(p.id,p.coordinates)]);},markAgents:async agents=>{await ready();paint(agents.map(a=>feature(a.id,a.coordinates)));},selectAgent,cancel,async restore(options){if(!previous)throw Error('No previous camera view');const target=previous;await move(target.center,target.zoom,options);},get following(){return following?.id||null;}};
}
