import assert from 'node:assert/strict';
import fs from 'node:fs';
import {firstConflict,scheduleFleet,reverseRoute} from './fleet.mjs';
import {plan,obstacleIndex,positionAt} from './planner.mjs';
const route=(points,timeline)=>({points,timeline,seconds:timeline.at(-1)});
const a={id:'A',requested:0,depart:0,route:route([{x:-100,y:60,z:0},{x:100,y:60,z:0}],[0,20])};
const b={id:'B',requested:0,depart:0,route:route([{x:0,y:60,z:-100},{x:0,y:60,z:100}],[0,20])};
assert(firstConflict(a,b,5,5));
assert.equal(firstConflict(a,{...b,depart:20},5,5),null);
assert.equal(firstConflict(a,{...b,route:route(b.route.points.map(p=>({...p,y:90})),[0,20])},5,30),null);
const c={...a,id:'C',route:route([{x:100,y:60,z:0},{x:-100,y:60,z:0}],[0,20])};
assert(firstConflict(a,c));
const scheduled=scheduleFleet([a,b,c]);assert.equal(scheduled.tasks[0].delay,0);assert(scheduled.totalDelay>0);
for(let i=0;i<scheduled.tasks.length;i++)for(let j=0;j<i;j++)assert.equal(firstConflict(scheduled.tasks[i],scheduled.tasks[j]),null);
assert.equal(scheduleFleet([b]).tasks[0].delay,0);
assert.throws(()=>scheduleFleet([a,b],{horizontal:NaN}));
assert.throws(()=>scheduleFleet([a,a]));
assert.throws(()=>scheduleFleet([a,b],{maxDelay:0}));
assert.throws(()=>scheduleFleet([{...a,requested:-1}]));
assert.throws(()=>scheduleFleet([{...a,route:route(a.route.points,[0,0])}]));
// A sub-second crossing which a 1 Hz sampler would miss must be detected.
const quick={...b,route:route([{x:0,y:60,z:-100},{x:0,y:60,z:100}],[0,1])};
assert(firstConflict({...a,route:route(a.route.points,[0,1])},quick,1,1));
const scene=JSON.parse(fs.readFileSync(new URL('./buildings.json',import.meta.url)));
const params={speed:15,climb:3,ceiling:150,cell:50,clearance:8,vertical:10};
const index=obstacleIndex(scene.buildings,[],8,10);
function find(x,z){for(let r=0;r<500;r+=25)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:x+Math.cos(a)*r,y:0,z:z+Math.sin(a)*r};if(index.clear(p,{...p,y:150}))return p;}throw Error('No empty point');}
const w=find(-810,0),e=find(810,0),n=find(0,-600),s=find(0,600);
const firstRoute=plan({...scene,zones:[],start:w,end:e,params});
const real=scheduleFleet([[w,e],[e,w],[n,s]].map(([start,end],i)=>({id:'UAV-'+i,requested:0,start,end,params,route:i===1?reverseRoute(firstRoute):i===0?firstRoute:plan({...scene,zones:[],start,end,params})})));
assert(real.totalDelay>0);
for(let i=0;i<real.tasks.length;i++)for(let j=0;j<i;j++)assert.equal(firstConflict(real.tasks[i],real.tasks[j]),null);
// Independently sample the scheduled result as an additional check.
for(let t=0;t<real.duration;t+=.2){const present=real.tasks.filter(a=>t>=a.depart&&t<=a.arrival);for(let i=0;i<present.length;i++)for(let j=0;j<i;j++){
 const p=positionAt(present[i].route,t-present[i].depart),q=positionAt(present[j].route,t-present[j].depart);assert(Math.hypot(p.x-q.x,p.z-q.z)>=50-1e-6||Math.abs(p.y-q.y)>=30-1e-6);
}}
console.log(JSON.stringify({checks:'continuous crossing, opposite direction, altitude separation, narrow crossing, reschedule, invalid input, real Tianjin fleet',tasks:real.tasks.map(t=>({id:t.id,depart:t.depart,delay:t.delay,arrival:t.arrival,distance:t.route.distance,conflicts:t.conflicts.length})),totalDelay:real.totalDelay}));
