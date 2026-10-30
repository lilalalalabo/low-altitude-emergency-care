const assert=require('node:assert/strict');const P=require('./dist/planner.js');
assert.equal(P.WIDTH*P.CELL_METERS,3000);assert.equal(P.HEIGHT*P.CELL_METERS,2000);
const low=P.findPath({x:5,y:10},{x:19,y:10},60),high=P.findPath({x:5,y:10},{x:19,y:10},140);assert.ok(low.path&&high.path);assert.ok(low.distanceMeters>high.distanceMeters);assert.equal(high.distanceMeters,700);
const crossing=P.findPath({x:20,y:18},{x:42,y:18},180);assert.ok(crossing.path);assert.ok(crossing.path.every(c=>!P.occupied(c.x,c.y,180)));assert.ok(crossing.path.some(c=>c.y<13||c.y>=23));
assert.equal(P.findPath({x:26,y:15},{x:42,y:18},180).error,'invalid_endpoint');assert.equal(P.findPath({x:10,y:8},{x:42,y:18},180).error,'invalid_endpoint');assert.equal(P.findPath({x:1,y:1},{x:1,y:1},60).error,'same_point');
for(const route of [low.path,high.path,crossing.path])for(let i=1;i<route.length;i++){let a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y;assert.ok(Math.abs(dx)<=1&&Math.abs(dy)<=1);}
const h=60,v=12,d=low.distanceMeters,cruise=d/v,climb=h/P.VERTICAL_SPEED;assert.equal(P.positionAt(low.path,1,h,v).phase,'climb');assert.equal(P.positionAt(low.path,climb+1,h,v).phase,'cruise');assert.equal(P.positionAt(low.path,climb+cruise+1,h,v).phase,'descent');const arrival=P.positionAt(low.path,2*climb+cruise+1,h,v);assert.equal(arrival.phase,'arrived');assert.equal(arrival.altitude,0);assert.deepEqual(arrival.point,low.path.at(-1));console.log('Planner checks passed: height-dependent routes, restricted zones, invalid endpoints and flight phases.');
assert.equal(P.positionAt(low.path,5,60,12,6).altitude,30);assert.equal(P.positionAt(low.path,11,60,12,6).phase,'cruise');assert.equal(P.positionAt(low.path,10+cruise+5,60,12,6).altitude,30);
// Opposing aircraft meet between grid centres, including during climb/landing.
const path1=[{x:0,y:0},{x:1,y:0},{x:2,y:0}],path2=[...path1].reverse();
const a=P.trajectory(path1,60,10,3),b=P.trajectory(path2,60,10,3);
assert.equal(P.conflicts(a,0,b,0),true);
const scheduled=P.schedule(b,0,[{trajectory:a,departure:0}]);assert.ok(scheduled.delay>0);assert.equal(P.conflicts(a,0,b,scheduled.departure),false);
assert.equal(P.conflicts(a,0,b,1000),false);
// Crossing at a different cruise altitude does not conflict when departure and
// landing occur at different points; test continuous segment intersection.
const line=(x1,y1,z1,x2,y2,z2,start=0,end=10)=>({segments:[{start,end,a:{x:x1,y:y1,z:z1},b:{x:x2,y:y2,z:z2}}],duration:end});
assert.equal(P.conflicts(line(0,0,60,100,0,60),0,line(50,-100,60,50,100,60),0),true);
assert.equal(P.conflicts(line(0,0,60,100,0,60),0,line(50,-100,100,50,100,100),0),false);
assert.equal(P.conflicts(line(0,0,60,100,0,60),0,line(0,50,60,100,50,60),0),false);
const same=P.trajectory(path1,60,10,3);assert.equal(P.conflicts(a,0,same,0),true);
assert.deepEqual(P.schedule(a,0,[{trajectory:{segments:[{start:0,end:8000,a:{x:25,y:25,z:0},b:{x:25,y:25,z:0}}]},departure:0}]),{error:'no_schedule'});
console.log('Multi-aircraft checks passed: continuous crossing, separation, delay and scheduling limit.');

