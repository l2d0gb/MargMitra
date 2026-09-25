const aliases={'bellary road':'ballari road','100 ft road':'100 feet road','100 feet rd':'100 feet road','hosur main road':'hosur road','sarjapura road':'sarjapur road'};
export function normalizeRoad(name){const n=name.toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();return aliases[n]||n;}
export function trafficForStep(step,readings){
 const key=normalizeRoad(step.name);return Object.entries(readings||{}).find(([name])=>normalizeRoad(name)===key)?.[1]||null;
}
export function roadRouteOptions(network,roads,origin,destination,vehicle){
 const routes=roads?.pairs?.[`${origin}|${destination}`]||[];
 return routes.map(r=>{
  let matchedDistance=0;const edges=r.steps.filter(s=>s.distance>0).map((s,i)=>{
   const reading=trafficForStep(s,network.readings);const km=s.distance/1000;
   const baseSpeed=s.duration>0?km/(s.duration/3600):30;const speed=reading?.speed??baseSpeed;
   if(reading)matchedDistance+=s.distance;
   const congestion=reading?.congestion??Math.max(0,Math.min(95,Math.round((1-speed/45)*100)));
   const forecast=reading?.forecast??speed;
   return {...s,id:`${r.id}-step-${i}`,km,speed,forecast,congestion,minutes:reading?km/speed*60:s.duration/60,observed:!!reading,source:reading?network.source:'OSRM driving profile',state:congestion<25?'LOW':congestion<50?'MODERATE':congestion<75?'HIGH':'CRITICAL',from:i===0?origin:s.name,to:i===r.steps.length-1?destination:s.name};
  });
  const minutes=edges.reduce((n,e)=>n+e.minutes,0);const congestion=edges.reduce((n,e)=>n+e.congestion*e.km,0)/(r.distance/1000||1);
  const bottlenecks=edges.filter(e=>e.congestion>=65&&e.distance>=100).length;
  const emergency=vehicle!=='Normal';const score=minutes+congestion*(emergency?.13:.045)+bottlenecks*(emergency?4:1);
  return {...r,edges,from:origin,to:destination,roadFollowing:true,minutes:Math.max(1,Math.round(minutes)),km:Math.round(r.distance/100)/10,congestion:Math.round(congestion),bottlenecks,score,matchedPercent:Math.round(matchedDistance/r.distance*100),trafficSource:network.source,roadNames:[...new Set(edges.filter(e=>e.distance>300).map(e=>e.name))]};
 }).sort((a,b)=>a.score-b.score).map((r,i)=>({...r,rank:i+1}));
}
export function metersBetween(a,b){const rad=Math.PI/180;const p1=a[0]*rad,p2=b[0]*rad;const h=Math.sin((p2-p1)/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin((b[1]-a[1])*rad/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function pathMetrics(points){let total=0;const cumulative=[0];for(let i=1;i<points.length;i++){total+=metersBetween(points[i-1],points[i]);cumulative.push(total);}return {points,cumulative,total};}
export function positionAlong(metrics,progress){const {points,cumulative,total}=metrics;if(!points.length)return null;if(progress<=0)return points[0];if(progress>=1)return points.at(-1);const distance=progress*total;let lo=1,hi=points.length-1;while(lo<hi){const m=(lo+hi)>>1;if(cumulative[m]<distance)lo=m+1;else hi=m;}const i=lo,span=cumulative[i]-cumulative[i-1],t=span?(distance-cumulative[i-1])/span:0;return points[i-1].map((v,k)=>v+(points[i][k]-v)*t);}
