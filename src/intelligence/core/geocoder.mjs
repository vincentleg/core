import {coordinates,normal} from './catalog.mjs';
// Photon explicitly permits reasonable project usage; one submitted lookup, never typeahead/crawling.
export function photon({fetchImpl=fetch,enabled=()=>false,now=Date.now}={}){
 const cache=new Map();let active=false,last=0,requests=[];
 const search=async(query,{city='',signal}={})=>{
  if(!enabled())return {places:[],ambiguous:false};
  const key=normal(query+' '+city);if(cache.has(key))return cache.get(key);
  requests=requests.filter(t=>now()-t<60000);if(active||now()-last<1200||requests.length>=5)throw Error('Geocoding limit reached; wait before another submitted search');
  if(typeof query!=='string'||query.length>240)throw Error('Invalid place query');
  active=true;last=now();requests.push(last);
  try{
   const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',query+(city?' '+city:''));url.searchParams.set('limit','4');
   const r=await fetchImpl(url.href,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(7000)]):AbortSignal.timeout(7000),credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
   if(!r.ok)throw Error('Geocoding unavailable (HTTP '+r.status+')');const json=await r.json();if(!Array.isArray(json.features)||json.features.length>10)throw Error('Invalid geocoder response');
   const places=json.features.filter(f=>f.geometry?.type==='Point'&&coordinates(f.geometry.coordinates)&&f.properties?.osm_id&&(!city||normal(f.properties.city||f.properties.name).includes(normal(city)))).map(f=>({id:'osm:'+f.properties.osm_type+':'+f.properties.osm_id,name:String(f.properties.name||f.properties.street||query).slice(0,160),city:String(f.properties.city||f.properties.state||f.properties.country||'').slice(0,100),coordinates:f.geometry.coordinates,zoom:f.properties.osm_value==='city'?12:16,type:'geocoded',aliases:[f.properties.name||query],source:{id:'osm:'+f.properties.osm_id,href:'https://www.openstreetmap.org/'+({N:'node',W:'way',R:'relation'}[f.properties.osm_type]||'node')+'/'+f.properties.osm_id,text:'OpenStreetMap contributors · ODbL · Photon/komoot; returned geometry is not field verification'}}));
   const result={places,ambiguous:places.length>1};cache.set(key,result);if(cache.size>64)cache.delete(cache.keys().next().value);return result;
  }finally{active=false;}
 };
 search.clear=()=>cache.clear();return search;
}
