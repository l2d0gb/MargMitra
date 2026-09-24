export const places = {
  'MG Road': [12.9756,77.6068], 'Hebbal': [13.0358,77.5970], 'Indiranagar': [12.9784,77.6408],
  'Marathahalli': [12.9569,77.7011], 'Silk Board': [12.9177,77.6238], 'Koramangala': [12.9352,77.6245],
  'Electronic City': [12.8452,77.6602], 'Jayanagar': [12.925,77.5838], 'Mysore Road': [12.949,77.537],
  'Bellandur': [12.929,77.678], 'JP Nagar': [12.907,77.585], 'Yelahanka': [13.100,77.596]
};
export const corridors = [
  {id:'hosur',name:'Hosur Road',code:'VJRQ+2M|RMJJ+F4',a:'Silk Board',b:'Electronic City',km:11,via:[[12.901,77.632],[12.881,77.644]]},
  {id:'sarjapur',name:'Sarjapur Road',code:'WP44+W8|WJFH+XQ',a:'Koramangala',b:'Bellandur',km:8,via:[[12.921,77.643],[12.918,77.661]]},
  {id:'orr',name:'Outer Ring Road',code:'XMW9+G8|WMJR+V4',a:'Marathahalli',b:'Bellandur',km:5,via:[[12.943,77.697]]},
  {id:'mysore',name:'Mysore Road',code:'WGG8+G5|XH7P+G6',a:'Mysore Road',b:'MG Road',km:10,via:[[12.955,77.568],[12.967,77.583]]},
  {id:'bellary',name:'Bellary Road',code:null,a:'Hebbal',b:'Yelahanka',km:8,via:[[13.065,77.592]]},
  {id:'airport',name:'Old Airport Road',code:'XPC7+72|XM33+J3',a:'Indiranagar',b:'Marathahalli',km:7,via:[[12.959,77.65],[12.958,77.681]]},
  {id:'bannerghatta',name:'Bannerghatta Road',code:null,a:'Jayanagar',b:'JP Nagar',km:3,via:[[12.914,77.599]]},
  {id:'kanakapura',name:'Kanakapura Road',code:null,a:'Mysore Road',b:'JP Nagar',km:8,via:[[12.923,77.558]]},
  {id:'central',name:'Central Diagonal',code:'XHJ7+MG|WJM6+VC',a:'MG Road',b:'Koramangala',km:6,via:[[12.96,77.607],[12.949,77.618]]},
  {id:'inner',name:'East Inner Ring',code:'XJPW+92|WJP4+FF',a:'Indiranagar',b:'Koramangala',km:6,via:[[12.951,77.64]]},
  {id:'north',name:'North Inner Ring',code:'2HM2+P8|XJV5+RG',a:'Hebbal',b:'MG Road',km:8,via:[[13.017,77.585],[12.998,77.595]]},
  {id:'east',name:'MG Road connector',code:null,a:'MG Road',b:'Indiranagar',km:4,via:[[12.978,77.623]]},
  {id:'silk',name:'Hosur connector',code:null,a:'Koramangala',b:'Silk Board',km:3,via:[]},
  {id:'south',name:'South Outer Ring',code:'XG48+2W|VHWC+C3',a:'Jayanagar',b:'Mysore Road',km:7,via:[[12.932,77.558]]},
  {id:'jaya',name:'Jayanagar connector',code:null,a:'Jayanagar',b:'Silk Board',km:5,via:[[12.917,77.604]]},
  {id:'hsr',name:'ORR · HSR Layout',code:'WH5F+26|WJ8X+F5W',a:'Silk Board',b:'Bellandur',km:7,via:[[12.916,77.65]]}
];
export const trafficState = n => n < 25 ? 'LOW' : n < 50 ? 'MODERATE' : n < 75 ? 'HIGH' : 'CRITICAL';
export const color = n => n < 25 ? '#48d6bd' : n < 50 ? '#ebc16c' : n < 75 ? '#f2955f' : '#f26978';
export const densityState = n => n <= 10 ? 'LOW' : n <= 30 ? 'MEDIUM' : 'HIGH';
export function networkAt(data,index){
  const frame=data.frames[index]; const previous=data.frames[Math.max(0,index-1)];
  const observed=Object.values(frame.routes); const mean=observed.reduce((s,r)=>s+r.speed,0)/Math.max(1,observed.length);
  return corridors.map((c,i)=>{
    const reading=frame.routes[c.code]; const speed=reading?.speed ?? Math.max(8,mean*(0.78+(i%4)*.12));
    const congestion=Math.max(0,Math.min(95,Math.round((1-speed/45)*100)));
    const prev=previous.routes[c.code]?.speed ?? speed; const forecast=Math.max(5,Math.min(55,speed+(speed-prev)*.4));
    return {...c,speed:Math.round(speed*10)/10,congestion,forecast:Math.round(forecast*10)/10,state:trafficState(congestion),observed:!!reading,
      sourceDuration:reading?.duration,sourceDistance:reading?.distance,minutes:c.km/speed*60,points:[places[c.a],...c.via,places[c.b]]};
  });
}
export function routeOptions(network,origin,destination,vehicle='Normal'){
  if(origin===destination)return [];
  const candidates=[]; const emergency=vehicle!=='Normal';
  function visit(at,path,seen){
    if(at===destination){const minutes=path.reduce((s,e)=>s+e.minutes,0);const congestion=path.reduce((s,e)=>s+e.congestion,0)/path.length;
      const bottlenecks=path.filter(e=>e.congestion>=65).length;
      const score=minutes + congestion*(emergency?.13:.045) + bottlenecks*(emergency?4:1)+Math.max(0,path.length-2)*1.5;
      candidates.push({edges:path,minutes:Math.round(minutes),km:Math.round(path.reduce((s,e)=>s+e.km,0)*10)/10,congestion:Math.round(congestion),bottlenecks,score});return;}
    if(path.length>=7)return;
    for(const edge of network){const next=edge.a===at?edge.b:edge.b===at?edge.a:null;if(!next||seen.has(next))continue;visit(next,[...path,{...edge,from:at,to:next,points:edge.a===at?edge.points:[...edge.points].reverse()}],new Set([...seen,next]));}
  }
  visit(origin,[],new Set([origin]));
  return candidates.sort((a,b)=>a.score-b.score).slice(0,3).map((r,i)=>({...r,id:r.edges.map(e=>e.id).join('-'),rank:i+1}));
}
export function lookahead(route){
  if(!route)return [];
  // Interpolate decision points along the continuous demonstration route, even for short paths.
  const points=route.edges.flatMap((e,i)=>e.points.slice(i?1:0).map(p=>({p,e})));
  return Array.from({length:4},(_,i)=>{const {e,p}=points[Math.min(points.length-1,Math.round(i*(points.length-1)/3))];const predicted=Math.max(0,Math.min(95,Math.round((1-e.forecast/45)*100)));
    return {name:i===0?e.from:i===3?route.edges.at(-1).to:`${e.name} · checkpoint ${i}`,position:p,current:e.state,predicted:trafficState(predicted),delay:Math.round(Math.max(0,e.km/e.forecast*60-e.km/45*60)/Math.max(1,e.points.length-1)),bottleneck:predicted>=65,action:predicted>=65?'Prepare priority passage':predicted>=40?'Coordinate junction approach':'Maintain corridor readiness'};});
}
export const initialFleet=()=>[
  {id:'AMB-01',location:'Koramangala',status:'EN ROUTE'}, {id:'AMB-02',location:'Silk Board',status:'AVAILABLE'},
  {id:'AMB-03',location:'Hebbal',status:'AVAILABLE'},{id:'AMB-04',location:'Jayanagar',status:'AVAILABLE'},{id:'AMB-05',location:'Indiranagar',status:'MAINTENANCE'}
];
export function replacements(fleet,failedId,network,incident){return fleet.filter(u=>u.id!==failedId&&u.status==='AVAILABLE').map(u=>{
  const route=u.location===incident?null:routeOptions(network,u.location,incident,'Ambulance')[0];
  return {...u,response:u.location===incident?2:route?route.minutes+2:Infinity};}).filter(u=>Number.isFinite(u.response)).sort((a,b)=>a.response-b.response);}
export function answerFromState(question,state){
  const q=question.toLowerCase();const most=[...state.traffic].sort((a,b)=>b.congestion-a.congestion)[0];let parts=[];
  const match=state.traffic.find(c=>q.includes(c.name.toLowerCase())||q.includes(c.id));
  if(/route|select|recommend|change|why|fast|journey/.test(q)){const r=state.route;parts.push(r?`The selected ${state.vehicleType.toLowerCase()} route uses ${r.edges.map(e=>e.name).join(' → ')}: ${r.km} km, approximately ${r.minutes} min, ${r.congestion}% congestion and ${r.bottlenecks} bottleneck(s). Ranking balances modeled travel time, congestion and continuity${state.vehicleType!=='Normal'?', with extra penalties for bottlenecks in emergency mode':''}. These are illustrative graph routes, not turn-by-turn navigation.`:'Choose different origin and destination locations to generate a route.');}
  if(/congest|traffic|slow|busy|corridor|speed/.test(q)){const c=match||most;parts.push(`${c.name} ${match?'is':'has the highest modeled congestion in this frame at'} ${c.congestion}% (${c.state}), with ${c.speed} km/h speed and a ${c.forecast} km/h 15-minute trend estimate. ${c.observed?'Speed comes from the historical route observation.':'This corridor uses an explicitly modeled network speed.'}`);}
  if(/junction|lookahead|checkpoint|bottleneck/.test(q)){const n=Number(q.match(/(?:junction|checkpoint)\s*\+?\s*(\d)/)?.[1]||2);const j=state.upcomingJunctions[n];parts.push(j?`Junction +${n}: ${j.name}. Current ${j.current}; predicted ${j.predicted}; modeled delay +${j.delay} min. ${j.action}. Checkpoints are illustrative decision-support locations; no traffic signals are controlled.`:'Activate an emergency vehicle type to see the junction lookahead.');}
  if(/ambulance|unavailable|fleet|dispatch|replacement/.test(q))parts.push(`Fleet: ${state.ambulanceStatus.map(u=>`${u.id} ${u.status.toLowerCase()}`).join('; ')}. ${state.emergencyStatus||'Simulate a unit becoming unavailable to compare available replacements by modeled response time. Acknowledgement changes only this demo fleet.'}`);
  if(/density|vehicle|composition|car|bike|bus|truck/.test(q))parts.push(state.density?`The independent ${state.density.dataset} sample has ${state.density.total} annotated vehicles (${densityState(state.density.total)} density): ${Object.entries(state.density.composition).map(([k,v])=>`${k}: ${v}`).join(', ')}. Image samples are not synchronized with the replay and cannot establish which vehicles caused congestion.`:'Vehicle annotations are unavailable.');
  if(/safety|crash|accident/.test(q))parts.push(state.safety?`Historical safety intelligence: the ${state.safety.year} OpenCity / Bengaluru Traffic Police table reports ${state.safety.totalCrashes} total crashes and ${state.safety.fatalCrashes} fatal crashes across ${state.safety.stations.length} stations. Fatal crashes are events, not a count of people killed. Station aggregates are not geocoded crash locations and cannot establish route safety or predict accidents.`:'Historical safety records are not loaded. No crash-hotspot, route-safety or accident-prediction claim can be made.');
  if(/data|source|history|historical|forecast|predict/.test(q))parts.push(`Replay timestamp: ${state.timestamp} IST. Traffic Monitor Lizard observations are bundled locally. Forecasts use the current speed plus 0.4 times the change from the previous frame; this heuristic is not a validated predictive model. Density uses a separate seed-42 sample from BMD-45-Train / UVH-26-Train.`);
  if(!parts.length)parts.push(`I cannot answer “${question}” from the available system data. At ${state.timestamp} IST, ${most.name} is the most congested modeled corridor (${most.congestion}%). I can explain the current route, congestion, forecast, density annotations, emergency checkpoints, fleet or data limitations.`);
  return parts.join('\n\n');
}
