import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {networkAt,routeOptions,lookahead,initialFleet,replacements,densityState,answerFromState,places} from '../src/engine.mjs';
import {trafficForStep,pathMetrics,positionAlong,metersBetween} from '../src/road-routing.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../public/data/${name}.json`,import.meta.url)));
const data=read('traffic'),roads=read('roads'),kaggle=read('kaggle-traffic');
test('Monitor Lizard preserves source speed arithmetic and changing frames',()=>{
 assert.notDeepEqual(networkAt(data,0).map(c=>c.speed),networkAt(data,46).map(c=>c.speed));
 for(let i=0;i<data.frames.length;i++)for(const c of networkAt(data,i,roads)){assert.ok(c.speed>0);assert.ok(c.forecast>=5&&c.forecast<=55);assert.ok(c.points.length>2);if(c.observed)assert.ok(Math.abs(c.speed-c.sourceDistance/c.sourceDuration*60)<=.051);}
});
test('all 132 directional pairs use cached road geometry, never a straight fallback',()=>{
 assert.equal(Object.keys(roads.pairs).length,132);const n=networkAt(kaggle,0,roads);
 for(const a of Object.keys(places))for(const b of Object.keys(places)){
  const routes=routeOptions(n,a,b,'Normal',roads);if(a===b){assert.deepEqual(routes,[]);continue;}
  assert.ok(routes.length>=1);for(const r of routes){const original=roads.pairs[`${a}|${b}`].find(x=>x.id===r.id);assert.deepEqual(r.points,original.points);assert.ok(r.points.length>5);assert.ok(r.minutes>0);assert.ok(metersBetween(r.points[0],places[a])<300);assert.ok(metersBetween(r.points.at(-1),places[b])<300);assert.ok(r.matchedPercent>=0&&r.matchedPercent<=100);}
 }
 assert.deepEqual(routeOptions(n,'MG Road','Hebbal'),[]);
 assert.notDeepEqual(roads.pairs['Indiranagar|Electronic City'][0].points,[...roads.pairs['Electronic City|Indiranagar'][0].points].reverse());
});
test('Kaggle retains dated road values without inventing times',()=>{
 assert.equal(kaggle.rowCount,8936);assert.equal(kaggle.frames.length,952);assert.equal(kaggle.frames[0].time,'DAILY');assert.equal(kaggle.frames[0].readings['100 Feet Road'].volume,50590);
 assert.equal(kaggle.frames[0].readings['100 Feet Road'].speed,50.23);assert.equal(kaggle.frames[0].readings['100 Feet Road'].congestion,100);
});
test('only road-name matches adjust ETA; unmatched steps retain OSRM estimates',()=>{
 const n=networkAt(kaggle,0,roads);assert.equal(trafficForStep({name:'100 Feet Road'},n.readings).speed,50.23);assert.equal(trafficForStep({name:'An unrelated nearby road'},n.readings),null);
 const r=routeOptions(n,'Indiranagar','Electronic City','Normal',roads)[0];assert.ok(r.matchedPercent>0&&r.matchedPercent<100);
 for(const e of r.edges)assert.ok(Math.abs(e.minutes-(e.observed?e.km/e.speed*60:e.duration/60))<1e-9);
 const changed=networkAt(kaggle,0,roads);changed.readings=Object.fromEntries(Object.entries(changed.readings).map(([name,v])=>[name,{...v,speed:v.speed/2}]));
 const slowed=routeOptions(changed,'Indiranagar','Electronic City','Normal',roads).find(x=>x.id===r.id);assert.ok(slowed.minutes>r.minutes);
});
test('journey positions follow polyline distance and clamp to endpoints',()=>{
 const points=roads.pairs['Indiranagar|Electronic City'][0].points,m=pathMetrics(points);assert.deepEqual(positionAlong(m,0),points[0]);assert.deepEqual(positionAlong(m,1),points.at(-1));
 assert.deepEqual(positionAlong(m,-1),points[0]);assert.deepEqual(positionAlong(m,2),points.at(-1));
 const p=positionAlong(m,.5);const i=m.cumulative.findIndex(v=>v>=m.total*.5);assert.ok(Math.abs(metersBetween(points[i-1],p)+metersBetween(p,points[i])-metersBetween(points[i-1],points[i]))<1);
});
test('emergency scoring and lookahead use OSRM maneuver locations',()=>{
 const n=networkAt(kaggle,0,roads),normal=routeOptions(n,'Indiranagar','Electronic City','Normal',roads),emergency=routeOptions(n,'Indiranagar','Electronic City','Ambulance',roads);
 assert.ok(emergency[0].score>normal[0].score);const j=lookahead(emergency[0]);assert.equal(j.length,4);for(const next of j.slice(1))assert.ok(emergency[0].edges.some(e=>JSON.stringify(e.maneuver.position)===JSON.stringify(next.position)));
});
test('replacement candidates exclude unavailable, en-route and maintenance units',()=>{
 const f=initialFleet().map(u=>u.id==='AMB-02'?{...u,status:'UNAVAILABLE'}:u);const n=networkAt(kaggle,0,roads),a=replacements(f,'AMB-02',n,'Indiranagar',roads);assert.deepEqual(a.map(u=>u.id).sort(),['AMB-03','AMB-04']);assert.ok(a[0].response<=a[1].response);assert.equal(replacements(f.map(u=>({...u,status:'UNAVAILABLE'})),'AMB-02',n,'Indiranagar',roads).length,0);
});
test('density boundaries and independent annotation counts remain intact',()=>{
 assert.deepEqual([0,10,11,30,31].map(densityState),['LOW','LOW','MEDIUM','MEDIUM','HIGH']);const d=read('density');assert.equal(d.seed,42);assert.equal(d.samples.length,100);for(const s of d.samples){assert.equal(s.total,Object.values(s.composition).reduce((a,b)=>a+b,0));assert.equal(s.density,densityState(s.total));assert.ok(fs.existsSync(new URL('../public'+s.image,import.meta.url)));}
});
test('assistant identifies current source and road geometry',()=>{
 const n=networkAt(kaggle,0,roads),r=routeOptions(n,'Indiranagar','Electronic City','Normal',roads)[0];const s={traffic:n,route:r,vehicleType:'Normal',ambulanceStatus:initialFleet(),upcomingJunctions:[],timestamp:'2022-01-01 daily record',datasetInformation:{traffic:kaggle.source,trafficKind:'kaggle'}};
 assert.match(answerFromState('Why this route?',s),/OpenStreetMap via OSRM/);assert.match(answerFromState('What dataset is used?',s),/Kaggle/);assert.match(answerFromState('Tomorrow rainfall?',s),/cannot answer/);
});
