import test from 'node:test';
import assert from 'node:assert/strict';
import {severityProfiles,validateAssessment} from '../src/severity.mjs';
import {incidentCost,blockedEdge,reroute} from '../src/incidents.mjs';
import {assessImage,validImage} from '../api/assess-accident.mjs';
const jpeg='data:image/jpeg;base64,/9j/AAAAAAAAAAAAAAAAAAAA';
test('severity increases modeled disruption and congestion',()=>{
 const e={a:[0,0],b:[0,.001],distance:111,minutes:1,congestion:0};let previous=0;
 for(const severity of ['low','moderate','high']){const report={position:[0,.0005],severity};const cost=incidentCost(e,[report]);assert.ok(cost.minutes>previous);previous=cost.minutes;assert.equal(blockedEdge(e.a,e.b,[report]),severity==='high');}
 assert.ok(severityProfiles.high.closureMinutes>severityProfiles.moderate.closureMinutes);
});
test('severity changes preferred path instead of always forcing a detour',()=>{
 const a=[0,0],b=[0,.005],c=[.02,0],d=[0,.01],k=p=>p.map(n=>n.toFixed(5)).join(',');
 const edge=(a,b,minutes)=>({a,b,from:k(a),to:k(b),distance:111,minutes,congestion:0,speed:30,name:'Test road'});
 const g=new Map([[k(a),new Map([[k(b),edge(a,b,1)],[k(c),edge(a,c,10)]])],[k(b),new Map([[k(d),edge(b,d,1)]])],[k(c),new Map([[k(d),edge(c,d,10)]])]]);
 const route={points:[a,b,d]},position=b;
 const low=reroute(g,route,0,[{id:'low',position,severity:'low'}]);const high=reroute(g,route,0,[{id:'high',position,severity:'high'}]);
 assert.ok(low.points.some(p=>p===b));assert.ok(high.points.some(p=>p===c));assert.ok(high.minutes>low.minutes);
});
test('uncertain or low confidence photos require manual review',()=>{
 assert.equal(validateAssessment({severity:'high',confidence:'low',evidence:[],summary:'Unclear'}).severity,'uncertain');
 assert.throws(()=>validateAssessment({severity:'severe',confidence:'high',evidence:[],summary:'Bad'}));
});
test('image API rejects invalid files and unavailable credentials honestly',async()=>{
 assert.equal(validImage('https://example.com/image.jpg'),false);assert.equal(validImage('data:image/jpeg;base64,aGVsbG8='),false);
 assert.equal((await assessImage(jpeg,{apiKey:''})).status,503);
});
test('vision request carries image and validates structured results',async()=>{
 let input;const result=await assessImage(jpeg,{apiKey:'test-key',fetcher:async(url,options)=>{input=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({severity:'moderate',confidence:'medium',evidence:['Debris in a lane'],summary:'Visible lane obstruction'})}]}]})};}});
 assert.equal(input.input[0].content[1].image_url,jpeg);assert.equal(input.store,false);assert.equal(result.body.severity,'moderate');
 const failed=await assessImage(jpeg,{apiKey:'test-key',fetcher:async()=>({ok:true,json:async()=>({output:[]})})});assert.equal(failed.status,502);
});
