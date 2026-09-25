import React,{useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import {Maximize2,Play,Pause,RotateCcw} from 'lucide-react';
import {color} from './engine.mjs';
import {severityProfiles} from './severity.mjs';
import {pathMetrics,positionAlong} from './road-routing.mjs';
export default function TrafficMap({network,route,layer,focus,junctions=[],hero=false,reports=[],oldPoints=null,command=null,onJourney,locked=false}){
 const el=useRef(null),map=useRef(null),group=useRef(null),vehicleMarker=useRef(null);
 const [tileError,setTileError]=useState(false),[moving,setMoving]=useState(false),[progress,setProgress]=useState(0);
 const metrics=useMemo(()=>pathMetrics(route?.points||[]),[route?.points]);
 useEffect(()=>{const m=L.map(el.current,{zoomControl:!hero,scrollWheelZoom:!hero,attributionControl:true}).setView([12.975,77.617],11);map.current=m;
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://project-osrm.org">OSRM</a>',maxZoom:19}).addTo(m);tiles.on('tileerror',()=>setTileError(true));
  group.current=L.layerGroup().addTo(m);const resize=new ResizeObserver(()=>m.invalidateSize());resize.observe(el.current);
  return()=>{resize.disconnect();m.remove();map.current=null};
 },[]);
 useEffect(()=>{if(!group.current)return;group.current.clearLayers();
  network.forEach(c=>{if(c.points.length<2)return;L.polyline(c.points,{color:hero?'#629992':'#617986',weight:hero?2:2.5,opacity:hero?.7:.35}).bindTooltip(`${c.a} → ${c.b} · OpenStreetMap road connection`,{sticky:true}).addTo(group.current)});
  if(oldPoints)L.polyline(oldPoints,{color:'#f47779',weight:3,dashArray:'7 7',opacity:.8}).addTo(group.current);
  reports.forEach(r=>L.circle(r.position,{radius:severityProfiles[r.severity]?.radius||60,color:r.severity==='low'?'#e7c36d':'#ff6868',fillOpacity:.4}).bindTooltip('Reported accident · unverified').addTo(group.current));
  if(route){
   L.polyline(route.points,{color:'#5de0d2',weight:9,opacity:.65}).addTo(group.current);
   L.polyline(route.points,{color:'#0a2028',weight:6,opacity:1}).addTo(group.current);
   route.edges.forEach(e=>L.polyline(e.points,{color:layer?color(e.congestion):'#81ecdc',weight:4,opacity:1,dashArray:e.observed?undefined:'5 4'}).bindTooltip(`${e.name} · ${e.speed.toFixed(1)} km/h · ${e.observed?'matched historical road data':'OSRM estimate; no traffic match'}`,{sticky:true}).addTo(group.current));
   [route.points[0],route.points.at(-1)].forEach((p,i)=>L.circleMarker(p,{radius:7,color:'#dafff8',weight:2,fillColor:i?'#efa565':'#31c7b0',fillOpacity:1}).bindTooltip(i?'Destination':'Origin').addTo(group.current));
  }
  junctions.forEach((j,i)=>L.marker(j.position,{icon:L.divIcon({className:'junction-marker',html:`<span>${i===0?'C':'+'+i}</span>`,iconSize:[25,25]})}).bindTooltip(j.name).addTo(group.current));
 },[network,route,layer,junctions.length,reports,oldPoints]);
 useEffect(()=>{setMoving(false);setProgress(0);if(vehicleMarker.current){vehicleMarker.current.remove();vehicleMarker.current=null;}if(!route||hero||!map.current)return;
  map.current.fitBounds(route.points,{padding:[45,80],maxZoom:14});
  vehicleMarker.current=L.marker(route.points[0],{zIndexOffset:1500,icon:L.divIcon({className:'journey-vehicle',html:'<span aria-hidden="true">➤</span>',iconSize:[28,28],iconAnchor:[14,14]})}).bindTooltip('Journey preview').addTo(map.current);
 },[route?.id,hero]);
 useEffect(()=>{const p=positionAlong(metrics,progress);if(p)vehicleMarker.current?.setLatLng(p);onJourney?.({progress,moving});},[metrics,progress,moving]);
 useEffect(()=>{if(!command)return;if(command.action==='restart'||command.action==='reset')setProgress(0);setMoving(command.action==='start'||command.action==='restart');},[command]);
 useEffect(()=>{if(!moving||!route)return;let handle;const start=performance.now(),base=progress;
  const tick=now=>{const value=Math.max(0,Math.min(1,base+(now-start)/30000));setProgress(value);if(value>=1)setMoving(false);else handle=requestAnimationFrame(tick)};
  handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
 },[moving,route?.id]);
 useEffect(()=>{const c=network.find(n=>n.id===focus);if(c?.points.length&&map.current)map.current.fitBounds(c.points,{padding:[45,80],maxZoom:13});},[focus]);
 return <><div ref={el} className="traffic-map" aria-label="Interactive Bengaluru traffic map"/>{tileError&&<span className="tile-note">Basemap unavailable · cached road routes remain available</span>}{!hero&&<button className="map-reset" aria-label="Fit Bengaluru network" title="Fit Bengaluru network" onClick={()=>map.current.fitBounds(network.flatMap(c=>c.points),{padding:[25,25]})}><Maximize2 size={16}/></button>}
 {!hero&&route&&<div className="journey-controls"><button disabled={locked} aria-label={moving?'Pause journey':'Preview journey'} onClick={()=>{if(progress>=1)setProgress(0);setMoving(!moving)}}>{moving?<Pause size={14}/>:<Play size={14}/>} {moving?'Pause journey':progress>=1?'Replay journey':'Preview journey'}</button><button aria-label="Reset journey" onClick={()=>{setMoving(false);setProgress(0)}}><RotateCcw size={14}/></button><span>{Math.round(progress*100)}% · {progress>=1?'Arrived':'30-second preview'}</span><progress aria-label="Journey progress" value={progress} max="1"/></div>}
 </>;
}
