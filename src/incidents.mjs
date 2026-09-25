import {metersBetween,pathMetrics,positionAlong,trafficForStep} from './road-routing.mjs';
const key=p=>p.map(n=>n.toFixed(5)).join(',');
export function buildRoadGraph(roads,network){
 const graph=new Map();
 for(const routes of Object.values(roads.pairs))for(const r of routes)for(const s of r.steps){
  const reading=trafficForStep(s,network.readings);const speed=Math.max(5,reading?.speed||(s.duration?s.distance/s.duration*3.6:30));
  for(let i=1;i<s.points.length;i++){const a=s.points[i-1],b=s.points[i],from=key(a),to=key(b);if(from===to)continue;
   if(!graph.has(from))graph.set(from,new Map());
   const distance=metersBetween(a,b),edge={from,to,a,b,distance,minutes:distance/1000/speed*60,speed,name:s.name||'Connecting road',observed:!!reading,congestion:reading?.congestion||0};
   if(!graph.get(from).has(to))graph.get(from).set(to,edge);
  }
 }return graph;
}
function nearSegment(p,a,b){const scale=Math.cos(p[0]*Math.PI/180),x=(b[1]-a[1])*scale,y=b[0]-a[0],t=Math.max(0,Math.min(1,(((p[1]-a[1])*scale*x)+(p[0]-a[0])*y)/(x*x+y*y||1)));return metersBetween(p,[a[0]+y*t,a[1]+(b[1]-a[1])*t]);}
export const blockedEdge=(a,b,reports)=>reports.some(r=>nearSegment(r.position,a,b)<60);
export function reportOnRoute(route,progress=0){const m=pathMetrics(route.points),distance=m.total*progress;return route.points.some((p,i)=>i>0&&m.cumulative[i]>distance);}
export function routeAffected(route,progress,report){const m=pathMetrics(route.points),p=positionAlong(m,progress);let i=m.cumulative.findIndex(d=>d>m.total*progress);if(i<0)return false;for(;i<m.points.length;i++){if(blockedEdge(i===m.cumulative.findIndex(d=>d>m.total*progress)?p:m.points[i-1],m.points[i],[report]))return true;}return false;}
// Directed cached road graph: no invented connectors or reversed one-way edges.
export function reroute(graph,route,progress,reports){
 const m=pathMetrics(route.points),start=positionAlong(m,progress),idx=m.cumulative.findIndex(d=>d>=m.total*progress);
 if(idx<0||progress>=1)return null;
 const anchor=route.points[idx],target=key(route.points.at(-1)),source=key(anchor);
 if(blockedEdge(start,anchor,reports))return null;
 const dist=new Map([[source,0]]),prev=new Map(),heap=[[0,source]];
 function push(v){heap.push(v);let i=heap.length-1;while(i){let p=(i-1)>>1;if(heap[p][0]<=v[0])break;heap[i]=heap[p];i=p;}heap[i]=v;}
 function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;}
 while(heap.length){const [cost,node]=pop();if(cost!==dist.get(node))continue;if(node===target)break;
  for(const e of graph.get(node)?.values()||[]){if(blockedEdge(e.a,e.b,reports))continue;const next=cost+e.minutes;if(next<(dist.get(e.to)??Infinity)){dist.set(e.to,next);prev.set(e.to,e);push([next,e.to]);}}
 }
 if(!dist.has(target))return null;
 const edges=[];let cursor=target;while(cursor!==source){const e=prev.get(cursor);if(!e)return null;edges.unshift(e);cursor=e.from;}
 const lead=metersBetween(start,anchor);if(lead>.01)edges.unshift({a:start,b:anchor,distance:lead,minutes:lead/1000/30*60,speed:30,name:'Current road',observed:false,congestion:0});
 if(!edges.length)return null;
 const points=[start,...edges.map(e=>e.b)],distance=edges.reduce((s,e)=>s+e.distance,0),minutes=edges.reduce((s,e)=>s+e.minutes,0);
 return {...route,id:`incident-${reports.map(r=>r.id).join('-')}`,points,edges:edges.map((e,i)=>({...e,id:`detour-${i}`,points:[e.a,e.b],km:e.distance/1000,forecast:e.speed,state:'LOW',maneuver:{type:'notification',position:e.a}})),distance,minutes:Math.max(1,Math.ceil(minutes)),km:Math.round(distance/100)/10,roadNames:[...new Set(edges.map(e=>e.name))],matchedPercent:Math.round(edges.filter(e=>e.observed).reduce((s,e)=>s+e.distance,0)/distance*100),congestion:Math.round(edges.reduce((s,e)=>s+e.congestion*e.distance,0)/distance),bottlenecks:0,rank:1,incidentAdjusted:true};
}
