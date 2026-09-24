import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {networkAt,routeOptions,lookahead,initialFleet,replacements,densityState,answerFromState,places} from '../src/engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../public/data/traffic.json',import.meta.url)));
test('historical frames retain valid source observations and change network metrics',()=>{
 assert.ok(data.frames.length>24);const a=networkAt(data,0),b=networkAt(data,46);assert.notDeepEqual(a.map(c=>c.speed),b.map(c=>c.speed));
 for(let i=0;i<data.frames.length;i++)for(const c of networkAt(data,i)){assert.ok(c.speed>0);assert.ok(c.forecast>=5&&c.forecast<=55);assert.ok(c.congestion>=0&&c.congestion<=95);if(c.observed)assert.ok(Math.abs(c.speed-c.sourceDistance/c.sourceDuration*60)<=.051);}
});
test('all supported endpoint pairs have continuous, cycle-free alternatives',()=>{
 const n=networkAt(data,46);for(const a of Object.keys(places))for(const b of Object.keys(places)){if(a===b){assert.deepEqual(routeOptions(n,a,b),[]);continue;}const routes=routeOptions(n,a,b);assert.ok(routes.length);for(const r of routes){assert.equal(r.edges[0].from,a);assert.equal(r.edges.at(-1).to,b);assert.ok(r.minutes>0);for(let i=1;i<r.edges.length;i++)assert.equal(r.edges[i-1].to,r.edges[i].from);assert.equal(new Set([a,...r.edges.map(e=>e.to)]).size,r.edges.length+1);}}
});
test('emergency scoring penalizes bottlenecks and lookahead includes four checkpoints',()=>{
 const n=networkAt(data,46),normal=routeOptions(n,'Indiranagar','Electronic City'),emergency=routeOptions(n,'Indiranagar','Electronic City','Ambulance');assert.ok(emergency[0].score>normal[0].score);const j=lookahead(emergency[0]);assert.equal(j.length,4);assert.ok(j.every(x=>x.delay>=0&&x.action));
});
test('replacement selection excludes unavailable, en-route and maintenance units',()=>{
 const fleet=initialFleet().map(u=>u.id==='AMB-02'?{...u,status:'UNAVAILABLE'}:u);const a=replacements(fleet,'AMB-02',networkAt(data,46),'Indiranagar');assert.deepEqual(a.map(u=>u.id).sort(),['AMB-03','AMB-04']);assert.ok(a[0].response<=a[1].response);assert.equal(replacements(fleet.map(u=>({...u,status:'UNAVAILABLE'})),'AMB-02',networkAt(data,46),'Indiranagar').length,0);
});
test('density threshold boundaries are inclusive',()=>{assert.deepEqual([0,10,11,30,31].map(densityState),['LOW','LOW','MEDIUM','MEDIUM','HIGH'])});
test('assistant uses current state and is honest for unsupported questions',()=>{
 const n=networkAt(data,46),r=routeOptions(n,'Indiranagar','Electronic City')[0];const s={traffic:n,route:r,vehicleType:'Normal',ambulanceStatus:initialFleet(),upcomingJunctions:[],timestamp:'test time'};
 assert.match(answerFromState('Why was this route selected?',s),new RegExp(`${r.minutes} min`));assert.match(answerFromState('Tell me tomorrow’s rainfall probability',s),/cannot answer/);assert.match(answerFromState('Explain junction +2',s),/Activate an emergency/);
});
test('bundled density annotations are exactly 100 seed-42 samples from allowed train sets',()=>{const d=JSON.parse(fs.readFileSync(new URL('../public/data/density.json',import.meta.url)));assert.equal(d.seed,42);assert.equal(d.samples.length,100);assert.equal(new Set(d.samples.map(s=>s.id)).size,100);for(const s of d.samples){assert.ok(['BMD-45-Train','UVH-26-Train'].includes(s.dataset));assert.equal(s.total,Object.values(s.composition).reduce((a,b)=>a+b,0));assert.equal(s.density,densityState(s.total));}});
