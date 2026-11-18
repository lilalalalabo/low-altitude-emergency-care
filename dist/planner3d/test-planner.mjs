import assert from 'node:assert/strict';
import fs from 'node:fs';
import {plan,intersects,obstacleIndex,positionAt} from './planner.mjs';
const params={speed:15,climb:3,ceiling:120,clearance:5,vertical:5,cell:25};
const base={width:400,depth:300,buildings:[],zones:[],start:{x:-150,y:0,z:0},end:{x:150,y:0,z:0},params};
const a={x:-20,y:20,z:0},b={x:20,y:20,z:0},box={id:'b',x:0,z:0,width:10,depth:40,bottom:0,top:50,angle:Math.PI/4};
assert.equal(intersects(a,b,box),true);assert.equal(intersects({...a,y:60},{...b,y:60},box),false);
const direct=plan(base);assert(Math.abs(direct.distance-360)<1e-6);assert.equal(positionAt(direct,0).x,-150);assert.equal(positionAt(direct,direct.seconds).x,150);
const wall={id:'wall',x:0,z:0,width:30,depth:300,height:65,angle:0};const over=plan({...base,buildings:[wall]});assert(over.points.some(p=>p.y>=90));
assert.throws(()=>plan({...base,buildings:[wall],params:{...params,ceiling:60}}),/未找到/);
const zone={id:'ZONE-1',x:0,z:0,width:60,depth:80,bottom:0,top:150,angle:0};const around=plan({...base,zones:[zone]});assert(around.points.some(p=>Math.abs(p.z)>40));const idx=obstacleIndex([], [zone],5,5);for(let i=1;i<around.points.length;i++)assert(idx.clear(around.points[i-1],around.points[i]));
const roof={id:'roof',x:-150,z:0,width:50,depth:50,height:45,angle:0};const rooftop=plan({...base,buildings:[roof],start:{x:-150,y:45,z:0,buildingId:'roof'}});assert.equal(rooftop.points[0].y,45);
assert.throws(()=>plan({...base,buildings:[roof]}),/起降通道/);
assert.throws(()=>plan({...base,zones:[{...zone,x:-150,width:100,depth:100}]}),/起降通道/);
const lowBand={...zone,bottom:80,top:150};const below=plan({...base,zones:[lowBand]});assert(below.points.every(p=>p.y<80));
assert.throws(()=>plan({...base,params:{...params,speed:0}}),/参数/);
const data=JSON.parse(fs.readFileSync(new URL('./buildings.json',import.meta.url))),actualIndex=obstacleIndex(data.buildings,[],8,10);
function find(target){for(let r=0;r<500;r+=25)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:target+Math.cos(a)*r,y:0,z:Math.sin(a)*r};if(actualIndex.clear(p,{...p,y:150}))return p;}throw Error('No demo point');}
const real=plan({...base,buildings:data.buildings,width:data.width,depth:data.depth,start:find(-810),end:find(810),params:{...params,ceiling:150,clearance:8,vertical:10}});
for(let i=1;i<real.points.length;i++)assert(actualIndex.clear(real.points[i-1],real.points[i]));
fs.writeFileSync(new URL('./verified-demo-route.json',import.meta.url),JSON.stringify(real));
console.log(JSON.stringify({checks:'rotated box, ascent, wall, ceiling, airspace detour, roof departure, blocked ground, vertical band, validation, real Tianjin route',tianjin:{distance:real.distance,seconds:real.seconds,waypoints:real.points.length,expanded:real.expanded,computeMs:real.computeMs}}));
for(const file of ['buildings-5km.json','buildings-10km.json']){
 const d=JSON.parse(fs.readFileSync(new URL(file,import.meta.url))),idx=obstacleIndex(d.buildings,[],8,10);
 const pick=target=>{for(let r=0;r<500;r+=25)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:target+Math.cos(a)*r,y:0,z:Math.sin(a)*r};if(idx.clear(p,{...p,y:150}))return p;}throw Error('No clear point');};
 const result=plan({...base,width:d.width,depth:d.depth,buildings:d.buildings,start:pick(-d.width*.27),end:pick(d.width*.27),params:{...params,ceiling:150,clearance:8,vertical:10}});
 for(let i=1;i<result.points.length;i++)assert(idx.clear(result.points[i-1],result.points[i]));
 console.log(JSON.stringify({map:file,buildings:d.buildings.length,distance:result.distance,computeMs:result.computeMs,expanded:result.expanded}));
}
