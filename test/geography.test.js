const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const fixture=JSON.parse(fs.readFileSync('test/fixtures/geography-photon.json'));
let C,E,G,X,catalog;const setup=(async()=>{C=await import('../src/intelligence/core/catalog.mjs');E=await import('../src/intelligence/core/engine.mjs');G=await import('../src/intelligence/core/geocoder.mjs');X=await import('../src/intelligence/core/lexicon.mjs');catalog=await C.loadCatalog(async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(p))}));})();
function harness({enabled=true,features}={}){
 let center=[-122.42,37.77],clock=1000,requests=0;const targets=[];
 const geocode=G.photon({enabled:()=>enabled,now:()=>clock+=13000,fetchImpl:async url=>{
  requests++;const u=new URL(url),q=u.searchParams.get('q');const row=fixture.queries.find(r=>C.normal(q).startsWith(C.normal(r.query)));
  if(row?.tag)assert.ok(u.searchParams.getAll('osm_tag').includes(row.tag));
  return {ok:true,json:async()=>features?{features}:row?.response||{features:[]}};
 }});
 const map={center:()=>center,async fly(p){center=p.coordinates;targets.push(p);},async highlight(){},cancel(){}};
 return {engine:E.createIntelligence({catalog,map,geocode}),targets,get requests(){return requests;}};
}
test('geographic grammar preserves entities, punctuation, signs and six-language intent',async()=>{await setup;
 for(const [q,entity] of [['Go to Golden Gate Park','Golden Gate Park'],['Montre-moi Market Street','Market Street'],['Montre-moi un hôpital à Lyon','hôpital à Lyon'],['Va devant le Golden Gate Park','Golden Gate Park'],['Zoom sur Market Street, San Francisco','Market Street, San Francisco'],['Take me to the Eiffel Tower','Eiffel Tower'],['Por favor, llévame a Golden Gate Park','Golden Gate Park'],['Bring mich zum Golden Gate Park','Golden Gate Park'],['Leve-me para Golden Gate Park','Golden Gate Park'],['请带我去Golden Gate Park','Golden Gate Park'],['Zoom to 37.7749, -122.4194','37.7749, -122.4194']])assert.equal(X.navigationQuery(q),entity,q);
});
test('local aliases cannot replace parks, complete POI names, addresses or unknown neighbourhoods with a bridge/city',async()=>{await setup;
 for(const q of ['Go to Golden Gate Park','Va devant le Golden Gate Park','Zoom sur Market Street, San Francisco','Go to 123 Folsom Street','Go to New Clinic, San Francisco','Go to SoMa in San Francisco'])assert.equal(C.searchPlaces(catalog,q).places.length,0,q);
 const partial=C.searchPlaces(catalog,'Go to Golden Gate National Recreation Area');assert.equal(partial.partial,true);assert.equal(partial.ambiguous,true);
 assert.equal(C.searchPlaces(catalog,'Go to Folsom Street').places[0].type,'street');
});
test('actual provider records resolve failed commands to feature identity and camera target, never the bridge',async()=>{await setup;const h=harness();
 for(const [q,name,type] of [['Go to Golden Gate Park','Golden Gate Park','park'],['Va devant Golden Gate Park','Golden Gate Park','park'],['Va devant le Golden Gate Park','Golden Gate Park','park'],['Zoom sur Market Street, San Francisco','Market Street','street'],['Go to Folsom Street','Folsom Street','street'],['Go to UCSF Medical Center','UCSF Medical Center at Mission Bay','hospital'],['Take me to Tokyo','Tokyo','city'],['Zoom to 37.7749, -122.4194','37.7749, -122.4194','coordinates']]){
  const r=await h.engine.run(q);assert.equal(r.navigated,true,q);assert.equal(h.engine.state.location.name,name,q);assert.equal(h.engine.state.location.type,type,q);assert.deepEqual(h.targets.at(-1).coordinates,h.engine.state.location.coordinates);assert.ok(r.events.some(e=>e.tool==='fly_to_place'&&e.status==='succeeded'));assert.notEqual(h.engine.state.location.id,'landmark:golden-gate-bridge');
 }
 assert.deepEqual(h.targets.at(-1).coordinates,[-122.4194,37.7749]);
});
test('all six interface languages share the same model-free geography pipeline',async()=>{await setup;
 for(const [language,q] of [['en','Go to Golden Gate Park'],['fr','Va devant le Golden Gate Park'],['es','Llévame a Golden Gate Park'],['de','Bring mich zum Golden Gate Park'],['pt','Leve-me para Golden Gate Park'],['zh-CN','带我去Golden Gate Park']]){
  const h=harness(),r=await h.engine.run(q,{language});assert.equal(r.navigated,true,q);assert.equal(r.mode,'indexed-offline');assert.equal(h.targets[0].type,'park');assert.equal(h.targets[0].city,'San Francisco');
 }
});
test('genuine landmark replicas are choices; selecting returned Paris record moves to actual Eiffel Tower',async()=>{await setup;const h=harness(),r=await h.engine.run('Take me to the Eiffel Tower');assert.equal(r.clarification,true);assert.equal(h.targets.length,0);
 const paris=r.places.find(p=>p.city==='Paris');assert.equal(paris.type,'monument');assert.ok(r.places.every(p=>p.type==='monument'));await h.engine.choose('place',paris.id);assert.deepEqual(h.targets.at(-1).coordinates,[2.2945006,48.8582599]);
});
const feature=(id,name,city,coordinates,osm_key='place',osm_value='city',extra={})=>({geometry:{type:'Point',coordinates},properties:{osm_id:id,osm_type:'N',name,city,osm_key,osm_value,...extra}});
test('same names in different cities need choice; nonexistent names never reuse previous camera target',async()=>{await setup;
 const h=harness({features:[feature(1,'Springfield','Springfield',[-89.65,39.78]),feature(2,'Springfield','Springfield',[-72.59,42.1])]});let r=await h.engine.run('Go to Springfield');assert.equal(r.clarification,true);assert.equal(h.targets.length,0);assert.equal(r.places.length,2);await h.engine.choose('place',r.places[1].id);assert.deepEqual(h.targets[0].coordinates,[-72.59,42.1]);
 r=await h.engine.run('Go to ZzqNonexistentPlace8675309');assert.equal(r.navigated,false);assert.equal(h.targets.length,1);
});
test('consent refusal sends no request and rate/HTTP failures do not announce navigation',async()=>{await setup;const h=harness({enabled:false});const r=await h.engine.run('Go to Golden Gate Park');assert.equal(h.requests,0);assert.equal(h.targets.length,0);assert.match(r.text,/Allow Photon/);
 const g=G.photon({enabled:()=>true,fetchImpl:async()=>({ok:false,status:503})}),targets=[];const e=E.createIntelligence({catalog,map:{center:()=>[-122.42,37.77],fly:async p=>targets.push(p)},geocode:g});const failed=await e.run('Go to Golden Gate Park');assert.match(failed.text,/retry/);assert.equal(failed.navigated,false);assert.equal(targets.length,0);
});
test('type-aware open search supports addresses, buildings, universities, neighborhoods, regions and countries',async()=>{await setup;
 for(const [q,props,expected] of [['Go to 12 Example Road',{osm_key:'building',osm_value:'yes',housenumber:'12',street:'Example Road',name:'Example Building'},'address'],['Go to Example Building',{osm_key:'building',osm_value:'office',name:'Example Building'},'building'],['Go to Example University',{osm_key:'amenity',osm_value:'university',name:'Example University'},'university'],['Go to Example Neighborhood',{osm_key:'place',osm_value:'neighbourhood',name:'Example Neighborhood'},'neighborhood'],['Go to Example Region',{osm_key:'place',osm_value:'state',name:'Example Region'},'region'],['Go to Example Country',{osm_key:'place',osm_value:'country',name:'Example Country'},'country']]){
  const h=harness({features:[feature(1,props.name,'Example City',[10,20],props.osm_key,props.osm_value,props)]}),r=await h.engine.run(q);assert.equal(r.navigated,true,q);assert.equal(h.targets[0].type,expected);assert.deepEqual(h.targets[0].coordinates,[10,20]);
 }
});
test('spelling variants remain explicit choices and provider category conflicts are rejected',async()=>{await setup;
 const rows=fixture.queries.find(r=>r.query==='Golden Gate Park').response.features,g=G.photon({enabled:()=>true,fetchImpl:async()=>({ok:true,json:async()=>({features:rows})})});const r=await g('Goldne Gate Park',{contextCity:'San Francisco'});assert.equal(r.ambiguous,true);assert.equal(r.places[0].name,'Golden Gate Park');assert.ok(r.places.every(p=>p.type==='park'));
});

test('ordinary punctuated questions are not geographic requests',async()=>{await setup;const h=harness();const r=await h.engine.run('Explain photosynthesis.');assert.equal(h.requests,0);assert.equal(h.targets.length,0);assert.ok(r.events.some(e=>e.tool==='lookup_core_knowledge'));});

test('global administrative names outrank local namesakes and do not send a local bias',async()=>{await setup;let url;const tokyo=fixture.queries.find(r=>r.query==='Tokyo').response.features[0];const f=G.photon({enabled:()=>true,fetchImpl:async u=>{url=new URL(u);return {ok:true,json:async()=>({features:[feature(123,'Tokyo','San Francisco',[-122.4,37.78],'amenity','restaurant',{type:'house'}),tokyo]})}}});const r=await f('Tokyo',{contextCity:'San Francisco',bias:[-122.4,37.78]});assert.equal(url.searchParams.has('lat'),false);assert.equal(r.ambiguous,false);assert.equal(r.places[0].type,'city');assert.equal(r.places[0].country,'Japan');});

test('French category search retains the requested city, not the generic hospital keyword', async () => {
 await setup; let requested; // Synthetic provider response (names/coordinates are fixtures, not observations).
 const data={response:{features:[feature(9001,'Hôpital A','Lyon',[4.83,45.75],'amenity','hospital'),feature(9002,'Hôpital B','Lyon',[4.87,45.74],'amenity','hospital')]}};
 const search=G.photon({enabled:()=>true,fetchImpl:async url=>{requested=new URL(url);return {ok:true,json:async()=>data.response};}});
 const result=await search('Montre-moi un hôpital à Lyon.',{language:'fr'});
 assert.equal(requested.searchParams.get('q'),'Lyon'); assert.equal(result.ambiguous,true);
 assert.ok(result.places.length>=2);assert.ok(result.places.every(p=>p.city==='Lyon'&&p.type==='hospital'));
 assert.equal(X.navigationIntent('Montre-moi Market Street.'),true);
});
