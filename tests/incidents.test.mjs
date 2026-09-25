import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRoadGraph,reroute,routeAffected,blockedEdge} from '../src/incidents.mjs';
import {pathMetrics,positionAlong,metersBetween} from '../src/road-routing.mjs';
import {networkAt,routeOptions} from '../src/engine.mjs';
const roads=JSON.parse(fs.readFileSync('public/data/roads.json')),traffic=JSON.parse(fs.readFileSync('public/data/kaggle-traffic.json'));
const network=networkAt(traffic,618,roads),route=routeOptions(network,'Indiranagar','Electronic City','Ambulance',roads)[0],graph=buildRoadGraph(roads,network),progress=.18;
const report={id:'test',position:positionAlong(pathMetrics(route.points),.65)};
test('accident ahead triggers continuous road detour from current position',()=>{
 assert.equal(routeAffected(route,progress,report),true);const detour=reroute(graph,route,progress,[report]);assert.ok(detour);
 assert.ok(metersBetween(detour.points[0],positionAlong(pathMetrics(route.points),progress))<.01);
 assert.ok(metersBetween(detour.points.at(-1),route.points.at(-1))<2);
 assert.notDeepEqual(detour.points,route.points);assert.ok(detour.minutes>0);
 for(let i=1;i<detour.points.length;i++)assert.equal(blockedEdge(detour.points[i-1],detour.points[i],[report]),false);
 const key=p=>p.map(n=>n.toFixed(5)).join(',');
 for(const e of detour.edges.slice(1))assert.ok(graph.get(key(e.a))?.has(key(e.b)),'every detour segment is a directed cached road');
});
test('off-route and already-passed reports do not affect remaining path',()=>{
 assert.equal(routeAffected(route,.8,{position:route.points[0]}),false);
 assert.equal(routeAffected(route,.2,{position:[13.4,77.1]}),false);
 assert.equal(routeAffected(route,1,report),false);
});
test('closure with no graph path returns unavailable, never a straight connector',()=>{
 assert.equal(reroute(new Map(),route,progress,[report]),null);
 assert.equal(reroute(graph,route,1,[report]),null);
});
