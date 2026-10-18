// Bounded official boundaries + ODbL pedestrian study windows, never invented routes.
// One Census request and one Overpass request; no retries or unattended crawling.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { distance } from '../../src/urban/model.mjs';
import { boundedJSON } from './tools.mjs';
const places=[['San Francisco',-122.414,37.779],['Oakland',-122.272,37.805],['Berkeley',-122.273,37.871],['Richmond',-122.348,37.936],['Alameda',-122.243,37.766],['San Leandro',-122.156,37.725],['Hayward',-122.081,37.671],['Fremont',-121.988,37.548],['San Mateo',-122.325,37.564],['Redwood City',-122.232,37.486],['Palo Alto',-122.161,37.444],['Mountain View',-122.083,37.394],['Sunnyvale',-122.036,37.376],['Santa Clara',-121.955,37.354],['San Jose',-121.890,37.337],['Daly City',-122.469,37.687]];
const dir='data/intelligence';fs.mkdirSync(dir,{recursive:true});
const cache='.core-local/intelligence/geography';fs.mkdirSync(cache,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const service='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4';
const where="STATE='06' AND BASENAME IN ("+places.map(([n])=>`'${n}'`).join(',')+")";
const url=service+'/query?'+new URLSearchParams({where,outFields:'GEOID,NAME,BASENAME,AREALAND,INTPTLAT,INTPTLON',outSR:'4326',f:'geojson',maxAllowableOffset:'0.0001',returnGeometry:'true'});
let boundaries;
if(fs.existsSync(`${cache}/boundaries.json`))boundaries=JSON.parse(fs.readFileSync(`${cache}/boundaries.json`));else{boundaries=(await boundedJSON(url,fetch,5000000)).data;if(boundaries.error||boundaries.features?.length!==places.length)throw Error('Incomplete official boundaries: '+JSON.stringify(boundaries.error||boundaries.features?.length));fs.writeFileSync(`${cache}/boundaries.json`,JSON.stringify(boundaries));}
const inRing=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++)if((r[i][1]>p[1])!==(r[j][1]>p[1])&&p[0]<(r[j][0]-r[i][0])*(p[1]-r[i][1])/(r[j][1]-r[i][1])+r[i][0])c=!c;return c;};
const inside=(p,g)=>{const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polys.some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));};
const regions=places.map(([name,x,y])=>{const f=boundaries.features.find(f=>f.properties.BASENAME===name);if(!f||!inside([x,y],f.geometry))throw Error('Study anchor outside official boundary: '+name);return {name,geoid:f.properties.GEOID,center:[x,y],landM2:Number(f.properties.AREALAND),weight:Math.sqrt(Number(f.properties.AREALAND))*(name==='San Francisco'?2:1),geometry:f.geometry};});
const boxes=places.map(([,x,y])=>[y-.003,x-.003,y+.003,x+.003].join(','));
const query='[out:json][timeout:90];('+boxes.map(b=>`way[highway~"^(footway|pedestrian|path|living_street)$"](${b});way[building](${b});`).join('')+');out geom;';
let raw;
if(fs.existsSync(`${cache}/osm.json`))raw=JSON.parse(fs.readFileSync(`${cache}/osm.json`));else{
 const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',signal:AbortSignal.timeout(100000),headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'CORE-research/9.6 (+https://github.com/vincentleg/core)'},body:new URLSearchParams({data:query})});if(!r.ok)throw Error(`Overpass HTTP ${r.status}`);const text=await r.text();if(text.length>12000000)throw Error('OSM response exceeds bounded study budget');raw=JSON.parse(text);if(raw.remark)throw Error(raw.remark);fs.writeFileSync(`${cache}/osm.json`,text);
}
const buildings=raw.elements.filter(w=>w.tags?.building&&w.tags.building!=='roof'&&w.geometry?.length>3).map(w=>{const ring=w.geometry.map(p=>[p.lon,p.lat]);return {ring,bb:[Math.min(...ring.map(p=>p[0])),Math.min(...ring.map(p=>p[1])),Math.max(...ring.map(p=>p[0])),Math.max(...ring.map(p=>p[1]))]};});
const nodes=[],edges=[],index=new Map(),regionNodes=regions.map(()=>[]);let removed=0;
const node=p=>{const k=p.join(',');if(!index.has(k)){index.set(k,nodes.length);nodes.push(p);}return index.get(k);};
for(const w of raw.elements){const t=w.tags||{};if(!w.geometry||!['footway','pedestrian','path','living_street'].includes(t.highway)||['no','private'].includes(t.access)||['no','private'].includes(t.foot)||t.indoor==='yes'||t.tunnel==='building_passage'||t.covered==='yes'||(t.level&&!/^0(;|$)/.test(t.level)))continue;
 for(let i=1;i<w.geometry.length;i++){
  const a=[w.geometry[i-1].lon,w.geometry[i-1].lat],b=[w.geometry[i].lon,w.geometry[i].lat],r=regions.findIndex(r=>inside(a,r.geometry)&&inside(b,r.geometry));if(r<0)continue;
  const length=distance(a,b);if(length<.1||length>200)continue;
  const candidates=buildings.filter(v=>v.bb[0]<=Math.max(a[0],b[0])&&v.bb[2]>=Math.min(a[0],b[0])&&v.bb[1]<=Math.max(a[1],b[1])&&v.bb[3]>=Math.min(a[1],b[1]));
  let blocked=false;for(let j=1;j<Math.ceil(length);j++){const p=[a[0]+(b[0]-a[0])*j/Math.ceil(length),a[1]+(b[1]-a[1])*j/Math.ceil(length)];if(candidates.some(v=>inRing(p,v.ring))){blocked=true;break;}}
  if(blocked){removed++;continue;}const u=node(a),v=node(b);edges.push([u,v,0]);regionNodes[r].push(u,v);
 }
}
if(regions.some((r,i)=>!regionNodes[i].length))throw Error('Missing pedestrian coverage: '+regions.filter((r,i)=>!regionNodes[i].length).map(r=>r.name).join(','));
regions.forEach((r,i)=>{r.nodes=[...new Set(regionNodes[i])];r.center=nodes[r.nodes.reduce((best,n)=>distance(nodes[n],r.center)<distance(nodes[best],r.center)?n:best,r.nodes[0])];});
// Preserve the previously validated SF graph; do not invent connecting edges.
const old=JSON.parse(fs.readFileSync('data/osm/walk-network.json','utf8'));
const oldNodes=Array.from({length:old.n.length/2},(_,i)=>[(old.base[0]+old.n[2*i])/1e6,(old.base[1]+old.n[2*i+1])/1e6]);
for(let i=0;i<old.e.length;i+=3){const a=node(oldNodes[old.e[i]]),b=node(oldNodes[old.e[i+1]]);edges.push([a,b,0]);regions[0].nodes.push(a,b);}
regions[0].nodes=[...new Set(regions[0].nodes)];
const source={publisher:'OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright',licence:'ODbL 1.0',attribution:'© OpenStreetMap contributors',query,osm_base:raw.osm3s.timestamp_osm_base,retrieved_at:new Date().toISOString(),raw_sha256:sha(JSON.stringify(raw))};
const network={version:'core-walk-network-v2',base:[0,0],n:nodes.flatMap(p=>p.map(x=>Math.round(x*1e6))),e:edges.flat(),kinds:['footway'],source,stats:{nodes:nodes.length,edges:edges.length},scope:'16 Bay Area municipal pedestrian study windows, approximately 600 m wide each; plus the existing SF study graph; disconnected components intentionally retained',validation:{buildings:buildings.length,edges_removed_crossing_buildings:removed,sampling:'Interior samples at approximately 1 m; building=roof canopies excluded'},caveat:'Mapped pedestrian ways, not field verification. Disconnected components never linked across the Bay. Width, accessibility, closures and surface unknown.'};
fs.writeFileSync(`${dir}/walk-network.json`,JSON.stringify(network)+'\n');
fs.writeFileSync(`${dir}/regions.json`,JSON.stringify({version:'core-bay-geography-1',source:{publisher:'U.S. Census Bureau',url,license:'U.S. Government public domain; cite U.S. Census Bureau',terms:'https://www2.census.gov/geo/pdfs/maps-data/data/tiger/tgrshp2024/TGRSHP2024_TechDoc.pdf',observationPeriod:'January 1, 2026',retrieved:new Date().toISOString(),units:'WGS84 degrees; square metres',limitations:'Statistical boundaries, not legal land descriptions; simplified to 0.0001 degrees'},allocation:'Square root of official land area, with 2× SF weight for current evidence and missions; not population-weighted or a priority ranking.',regions},null,1)+'\n');
console.log(JSON.stringify({municipalities:regions.length,nodes:nodes.length,edges:edges.length,removed}));
