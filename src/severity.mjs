// Planning assumptions, not learned closure-duration predictions or medical triage.
export const severityProfiles={
 low:{label:'Low',closure:'5–15 min',closureMinutes:15,delayMinutes:3,radius:35,halo:100,congestion:35,blocked:false,response:'Traffic assistance; vehicle clearance if needed'},
 moderate:{label:'Moderate',closure:'20–45 min',closureMinutes:45,delayMinutes:12,radius:80,halo:220,congestion:70,blocked:false,response:'Traffic police and recovery vehicle; emergency review if needed'},
 high:{label:'High',closure:'60–120 min',closureMinutes:120,delayMinutes:30,radius:150,halo:400,congestion:95,blocked:true,response:'Urgent dispatcher review; assess rescue, fire and recovery needs'},
};
export function validateAssessment(value){
 if(!value||!['low','moderate','high','uncertain'].includes(value.severity)||!['low','medium','high'].includes(value.confidence)||!Array.isArray(value.evidence)||value.evidence.some(x=>typeof x!=='string'||x.length>500)||typeof value.summary!=='string'||value.summary.length>1000)throw Error('Invalid image assessment');
 const review=value.severity==='uncertain'||value.confidence==='low';
 return {severity:review?'uncertain':value.severity,confidence:value.confidence,evidence:value.evidence.slice(0,4),summary:value.summary,requiresReview:review,source:'Image model'};
}
