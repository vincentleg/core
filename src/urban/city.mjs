import { createWalkers } from './movement.mjs';
export async function createCity(map,catalog,{onAgent,status=()=> 'idle'}={}) {
  const entered=performance.now();let firstUsefulMs=null,populationReadyMs=null;
  if(!globalThis.CORE_POPULATION)await import('../agent-population.js');
  const response=await fetch('data/osm/walk-network.json');if(!response.ok)throw Error('Pedestrian network unavailable');
  const net=globalThis.CORE_POPULATION.network(await response.json());
  const low=matchMedia('(pointer: coarse)').matches||navigator.hardwareConcurrency<=2;
  const agents=catalog.agents.slice(0,low?120:500),walkers=createWalkers(net,agents);
  for(let frame=0;frame<2;frame++) {
    const c=document.createElement('canvas');c.width=48;c.height=80;const x=c.getContext('2d');
    x.shadowColor='#62d8f2';x.shadowBlur=5;x.fillStyle='#b8f5ff';x.strokeStyle='#62d8f2';x.lineWidth=3;
    x.beginPath();x.arc(24,10,5,0,Math.PI*2);x.fill();
    x.fillStyle='rgba(98,216,242,.3)';x.beginPath();x.moveTo(17,20);x.lineTo(31,20);x.lineTo(34,45);x.lineTo(14,45);x.closePath();x.fill();x.stroke();
    const d=frame?5:-5;x.beginPath();x.moveTo(17,22);x.lineTo(9,39+d);x.moveTo(31,22);x.lineTo(39,39-d);x.moveTo(19,45);x.lineTo(17+d,67);x.moveTo(29,45);x.lineTo(31-d,67);x.stroke();
    x.lineWidth=1;x.globalAlpha=.5;for(let y=22;y<45;y+=5){x.beginPath();x.moveTo(17,y);x.lineTo(31,y);x.stroke();}
    x.beginPath();x.ellipse(24,73,15,3,0,0,Math.PI*2);x.stroke();
    map.addImage(`urban-human-${frame}`,x.getImageData(0,0,48,80),{pixelRatio:2});
  }
  map.addSource('urban-agents',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'urban-agents',type:'symbol',source:'urban-agents',minzoom:12.5,layout:{'icon-image':['get','sprite'],'icon-size':['interpolate',['linear'],['zoom'],12.5,.7,15.5,1.2,18,1.7],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-anchor':'bottom'},paint:{'icon-opacity':['case',['==',['get','state'],'working'],1,.72]}});
  map.on('click','urban-agents',e=>{const f=e.features?.[0];if(f)onAgent?.(f.properties.id);});
  map.on('mouseenter','urban-agents',()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave','urban-agents',()=>{map.getCanvas().style.cursor='';});
  let last=performance.now(),loaded=0,positions=[],visible=0,raf=0,previous=0,populationStart=null;
  function update(now) {
    const c=map.getCenter();if(map.getZoom()<12.5||c.lng< -122.55||c.lng> -122.34||c.lat<37.68||c.lat>37.84){last=now;raf=requestAnimationFrame(update);return;}
    if(populationStart===null)populationStart=now;
    const dt=Math.max(0,Math.min(.25,(now-last)/1000));
    if(now-previous>125&&!document.hidden){previous=now;last=now;loaded=Math.min(agents.length,Math.max(50,Math.floor((now-populationStart)/100)*50));const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
      positions=walkers.step(dt,still).slice(0,loaded);if(firstUsefulMs===null)firstUsefulMs=performance.now()-entered;if(loaded===agents.length&&populationReadyMs===null)populationReadyMs=performance.now()-entered;const bounds=map.getBounds();visible=positions.filter(p=>bounds.contains(p.coordinates)).length;
      map.getSource('urban-agents')?.setData({type:'FeatureCollection',features:positions.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:p.coordinates},properties:{id:p.id,state:status(p.id),sprite:`urban-human-${p.moving?Math.floor(now/400)%2:0}`}}))});
    }
    raf=requestAnimationFrame(update);
  }
  // No off-network legacy point representations while this routed city layer is active.
  for(const id of ['civ-agents','civ-agents-glow','civ-agents-label','civ-links'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  raf=requestAnimationFrame(update);
  return {net,agents,walkers,get positions(){return positions;},get counts(){return{registered:catalog.agents.length,represented:loaded,inView:visible,mobileReduced:low,firstUsefulMs,populationReadyMs};},destroy(){cancelAnimationFrame(raf);}};
}
