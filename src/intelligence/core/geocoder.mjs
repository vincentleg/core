import {coordinates,normal,distance,editDistance} from './catalog.mjs';
import {navigationQuery,featureType,FEATURE_TYPES} from './lexicon.mjs';
const tags={park:['leisure:park'],street:['highway'],hospital:['amenity:hospital'],university:['amenity:university'],monument:['man_made:tower','historic:monument','historic:memorial'],building:['building']};
const zooms={country:4,region:7,city:11,neighborhood:14,park:13,street:15,bridge:13,address:17,hospital:16,university:15,monument:17,building:17};
const clean=s=>normal(s).split(' ').filter(w=>!['the','le','la','les','du','de','des','del','da','do','der','die','das','of'].includes(w)).join(' ');
function entityName(value,type){
 let name=clean(value);
 for(const term of [...(FEATURE_TYPES[type]||[])].sort((a,b)=>b.length-a.length)){const tokens=name.split(' '),part=term.split(' ');for(let i=tokens.length-part.length;i>=0;i--)if(tokens.slice(i,i+part.length).join(' ')===term)tokens.splice(i,part.length);name=tokens.join(' ');}
 return name;
}
function kind(p){
 if(p.osm_value==='hospital')return 'hospital';if(p.osm_value==='university')return 'university';if(p.osm_value==='park')return 'park';
 if(['tower','monument','memorial'].includes(p.osm_value))return 'monument';
 if(p.type==='city'||['city','town','village'].includes(p.osm_value))return 'city';
 if(p.osm_value==='country'||p.type==='country')return 'country';
 if(['state','province','region','county'].includes(p.osm_value)||['state','county'].includes(p.type))return 'region';
 if(['suburb','quarter','neighbourhood','neighborhood'].includes(p.osm_value)||['district','locality'].includes(p.type))return 'neighborhood';
 if(p.osm_key==='highway'||p.type==='street')return featureType(normal(p.name))==='bridge'?'bridge':'street';
 if(p.osm_key==='building'||p.type==='house')return 'building';
 return p.osm_key?(p.osm_value||'landmark'):(featureType(normal(p.name))||'landmark');
}
// One consented submitted lookup; no typeahead/crawl. Official demo has no availability guarantee.
export function photon({fetchImpl=fetch,enabled=()=>false,now=Date.now}={}){
 const cache=new Map();let active=false,last=-Infinity,requests=[];
 const search=async(query,{city='',contextCity='',bias=null,language='en',signal}={})=>{
  if(typeof query!=='string'||!query.trim()||query.length>240)throw Error('Invalid place query');
  if(!await enabled())return {places:[],ambiguous:false,reason:'consent'};
  query=navigationQuery(query);const serviceLanguage=['en','fr','de'].includes(language)?language:'en',key=normal(query+' '+city+' '+contextCity)+' '+serviceLanguage;
  if(cache.has(key))return cache.get(key);
  requests=requests.filter(t=>now()-t<60000);if(active||now()-last<1200||requests.length>=5)throw Error('Geocoding limit reached; wait before another submitted search');
  active=true;last=now();requests.push(last);
  try{
   const parts=query.split(/,|\s+(?:in|à|en|em)\s+/iu),qualifier=normal(parts.slice(1).join(' ')),desired=featureType(normal(query)),name=entityName(parts[0],desired),words=name.split(' ').filter(Boolean);
   const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',(!words.length&&qualifier?parts.slice(1).join(' '):query)+(city&&!normal(query).includes(normal(city))?' '+city:''));url.searchParams.set('limit','6');url.searchParams.set('lang',serviceLanguage);
   for(const tag of tags[desired]||[])url.searchParams.append('osm_tag',tag);
   if(desired==='address')url.searchParams.set('layer','house');
   if(desired==='city'||desired==='country')url.searchParams.set('layer',desired);
   // The visible map is a soft bias, never device GPS or a hard restriction on global destinations.
   if(coordinates(bias)&&desired&&!['city','country','region'].includes(desired)){url.searchParams.set('lon',bias[0]);url.searchParams.set('lat',bias[1]);}
   const r=await fetchImpl(url.href,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000),credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
   if(!r.ok)throw Error('Geocoding unavailable (HTTP '+r.status+')');const json=await r.json();if(!Array.isArray(json.features)||json.features.length>10)throw Error('Invalid geocoder response');
   const places=[];
   for(const f of json.features){
    const p=f.properties;if(f.geometry?.type!=='Point'||!coordinates(f.geometry.coordinates)||!p||!['N','W','R'].includes(p.osm_type)||!/^\d+$/.test(String(p.osm_id))||!p.name&&!p.street)continue;
    const type=desired==='address'&&p.housenumber?'address':kind(p),locality=String(p.city||(['city','country','region'].includes(type)?p.name:p.state||p.country)||'').slice(0,100);
    if(desired&&type!==desired||city&&normal(locality)!==normal(city))continue;
    if(qualifier&&!normal([p.city,p.state,p.country,p.county,p.district,p.countrycode].filter(Boolean).join(' ')).includes(qualifier))continue;
    const label=type==='address'?[p.housenumber,p.street||p.name].filter(Boolean).join(' '):String(p.name||p.street),n=entityName(label,desired);
    const coverage=words.filter(w=>n.split(' ').some(x=>x===w||w.length>4&&editDistance(w,x)<=2)).length/words.length;
    const exact=!!name&&n===name,prefix=!!name&&n.startsWith(name+' ');if(words.length&&!exact&&!prefix&&coverage<0.8)continue;
    if(type==='address'&&!words.some(w=>/^\d+/.test(w)&&w===String(p.housenumber)))continue;
    const raw=clean(label),original=clean(parts[0]);
    const score=(exact?100:prefix?90:60)+(original&&(raw===original||raw.startsWith(original+' '))?30:0)+(!desired&&['city','country','region'].includes(type)?40:0)+(contextCity&&normal(locality)===normal(contextCity)?20:0);
    const address=[p.housenumber,p.street,p.locality||p.district].filter(Boolean).join(', ');
    const place={id:'osm:'+p.osm_type+':'+p.osm_id,name:label.slice(0,160),city:locality,country:String(p.country||'').slice(0,100),address:address.slice(0,200),coordinates:f.geometry.coordinates,zoom:zooms[type]||16,type,aliases:[label],score,fuzzy:!!name&&!exact&&!prefix,source:{id:'osm:'+p.osm_id,href:'https://www.openstreetmap.org/'+({N:'node',W:'way',R:'relation'}[p.osm_type])+'/'+p.osm_id,text:'OpenStreetMap contributors · ODbL · Photon/komoot; returned geometry is not field verification'}};
    // Named street segments are one entity within a municipality; separate campuses/cities remain choices.
    if(!places.some(a=>a.id===place.id||type==='street'&&a.type===type&&normal(a.name)===normal(place.name)&&a.city===place.city&&distance(a.coordinates,place.coordinates)<15000))places.push(place);
   }
   places.sort((a,b)=>b.score-a.score);const best=places[0];
   const ambiguous=!!best&&(best.fuzzy||places.some((p,i)=>i>0&&best.score-p.score<15&&distance(p.coordinates,best.coordinates)>150));
   const result={places:ambiguous?places.slice(0,5):places.slice(0,1),ambiguous};cache.set(key,result);if(cache.size>64)cache.delete(cache.keys().next().value);return result;
  }finally{active=false;}
 };
 search.clear=()=>cache.clear();return search;
}
