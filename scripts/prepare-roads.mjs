import fs from 'node:fs';
import {places} from '../src/engine.mjs';
const cache='data-raw/osrm-cache';fs.mkdirSync(cache,{recursive:true});
const pairs={};const names=Object.keys(places);let count=0;
for(let a=0;a<names.length;a++)for(let b=0;b<names.length;b++){
 if(a===b)continue;
 const from=names[a],to=names[b],file=`${cache}/${a}-${b}.json`;
 let data;
 if(fs.existsSync(file))data=JSON.parse(fs.readFileSync(file));
 else{
  const coords=[places[from],places[to]].map(([lat,lon])=>`${lon},${lat}`).join(';');
  const url=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=true&continue_straight=true`;
  const response=await fetch(url,{headers:{'User-Agent':'MargMitra-hackathon-prototype/1.1'},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Route ${from} to ${to}: HTTP ${response.status}`);
  data=await response.json();if(data.code!=='Ok'||!data.routes?.length)throw Error(`No driving route: ${from} to ${to}`);
  fs.writeFileSync(file,JSON.stringify(data));await new Promise(r=>setTimeout(r,1100));
 }
 pairs[`${from}|${to}`]=data.routes.slice(0,3).map((r,i)=>({id:`road-${a}-${b}-${i}`,distance:r.distance,duration:r.duration,points:r.geometry.coordinates.map(([lng,lat])=>[lat,lng]),steps:r.legs.flatMap(l=>l.steps).map(s=>({name:s.name||s.ref||'Unnamed road',ref:s.ref||'',distance:s.distance,duration:s.duration,points:s.geometry.coordinates.map(([lng,lat])=>[lat,lng]),maneuver:{type:s.maneuver.type,modifier:s.maneuver.modifier||'',position:[s.maneuver.location[1],s.maneuver.location[0]]}}))}));
 count++;if(count%12===0)console.log(`${count}/132 directional endpoint pairs cached`);
}
const result={source:'OpenStreetMap via OSRM',retrieved:new Date().toISOString(),attribution:'© OpenStreetMap contributors · ODbL; routes computed by OSRM',router:'https://router.project-osrm.org',pairs};
fs.writeFileSync('public/data/roads.json',JSON.stringify(result));console.log(`Saved ${count} directional route pairs, ${fs.statSync('public/data/roads.json').size} bytes`);
