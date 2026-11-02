const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const env={window:{}};
vm.runInNewContext(fs.readFileSync('dist/zhenlong-case-data.js','utf8'),env);
const d=env.window.ZHENLONG_CASE;
assert.equal(Object.keys(d.nodes).length,16);
assert.equal(d.trips.length,26);
assert.equal(new Set(d.trips.map(t=>t.drone_id)).size,8);
assert.equal(d.relay.length,3);
const boxes=d.trips.flatMap(t=>t.plan.box_ids);
assert.equal(boxes.length,80);
assert.equal(new Set(boxes).size,80);
assert.ok(Math.abs(Math.max(...d.trips.map(t=>t.return_s))-d.stats.makespan)<1e-6);
for(const t of d.trips){
 assert.ok(t.start_s<=t.takeoff_s && t.takeoff_s<t.return_s);
 assert.equal(t.legs[0].from,'O01');
 assert.equal(t.legs.at(-1).to,'O01');
 for(const leg of t.legs){
  assert.ok(d.nodes[leg.from]&&d.nodes[leg.to]);
  assert.ok(Math.abs(d.nodes[leg.from].workAlt+leg.climb_m-leg.cruise_altitude_m)<.01);
  assert.ok(Math.abs(d.nodes[leg.to].workAlt+leg.descent_m-leg.cruise_altitude_m)<.01);
  const drone=d.drones[t.plan.drone_type];
  assert.ok(Math.abs(leg.climb_m/drone.climb+leg.distance_m/drone.speed+leg.descent_m/drone.descent-leg.flight_s)<1e-6);
 }
}
for(const id of new Set(d.trips.map(t=>t.drone_id))){
 const flights=d.trips.filter(t=>t.drone_id===id).sort((a,b)=>a.start_s-b.start_s);
 for(let i=1;i<flights.length;i++)assert.ok(flights[i].start_s>=flights[i-1].return_s-1e-6);
}
for(const id of new Set(d.trips.map(t=>t.battery_id))){
 const flights=d.trips.filter(t=>t.battery_id===id).sort((a,b)=>a.takeoff_s-b.takeoff_s);
 for(let i=1;i<flights.length;i++)assert.ok(flights[i].takeoff_s>=flights[i-1].return_s+flights[i-1].charge_s-1e-6);
}
assert.equal(d.terrain.values.length,75);
assert.ok(d.terrain.values.every(row=>row.length===75));
console.log('Competition case: 26 flights, 8 aircraft, 80 distinct boxes, 3 relay assignments; trajectory times and resource reuse checked.');

