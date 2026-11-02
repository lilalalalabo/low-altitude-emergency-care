const assert=require('node:assert/strict');
const zlib=require('node:zlib');
const H=require('./dist/height-map.js'),Base=require('./dist/planner.js');
const m=H.parseCsv('10,0,20\n10,100,20\n10,0,20',30,60),p=Base.createPlanner(m);
assert.deepEqual([m.width,m.height,m.cellWidth,m.cellHeight],[3,3,30,60]);
const start={x:0,y:1},end={x:2,y:1};
const low=p.findPath(start,end,80),high=p.findPath(start,end,120);
assert.ok(low.path && high.path);
assert.equal(low.distanceMeters,180);assert.equal(high.distanceMeters,60);
assert.equal(p.findPath(start,end,30).error,'altitude');
const trajectory=p.trajectory(low.path,80,10,5);
assert.equal(trajectory.duration,44);
assert.equal(trajectory.segments[0].a.z,10);assert.equal(trajectory.segments.at(-1).b.z,20);
assert.equal(p.positionAt(low.path,1,80,10,5).altitude,15);
assert.equal(p.positionAt(low.path,100,80,10,5).altitude,20);
assert.equal(p.trajectory(high.path,120,10,5).segments[1].b.x-p.trajectory(high.path,120,10,5).segments[1].a.x,30);
const unknown=H.parseCsv('0,,0\n0,0,0',25,40);assert.equal(unknown.elevations[0][1],null);assert.equal(Base.createPlanner(unknown).groundBlocked(1,0),true);
assert.throws(()=>H.parseCsv('1,2\n3',10,10),/csv/);assert.throws(()=>H.parseCsv('a,b\n1,2',10,10),/csv/);assert.throws(()=>H.parseCsv('1,2\n3,4',0,10),/scale/);
const grid=Array.from({length:101},(_,y)=>Array.from({length:101},(_,x)=>x===3&&y===3?'1000':x===4&&y===4?'':'0').join(',')).join('\n');
const coarse=H.parseCsv(grid,30,40);assert.equal(coarse.factor,2);assert.deepEqual([coarse.width,coarse.height,coarse.cellWidth,coarse.cellHeight],[51,51,60,80]);assert.equal(coarse.elevations[1][1],1000);assert.equal(coarse.elevations[2][2],null);assert.equal(coarse.elevations[50][10],null);assert.equal(coarse.elevations[10][50],null);
function makeTiff(compression){
 const values=[10,0,20,10,100,20,10,0,20],data=Buffer.alloc(values.length*4);values.forEach((v,i)=>data.writeFloatLE(v,i*4));
 let body=compression===1?data:compression===32773?Buffer.concat([Buffer.from([data.length-1]),data]):zlib.deflateSync(data);
 const fields=[[256,4,1,3],[257,4,1,3],[258,3,1,32],[259,3,1,compression],[273,4,1,0],[277,3,1,1],[278,4,1,3],[279,4,1,body.length],[339,3,1,3]],offset=8+2+fields.length*12+4;fields[4][3]=offset;
 const header=Buffer.alloc(offset);header.write('II',0);header.writeUInt16LE(42,2);header.writeUInt32LE(8,4);header.writeUInt16LE(fields.length,8);fields.forEach((f,i)=>{const at=10+i*12;header.writeUInt16LE(f[0],at);header.writeUInt16LE(f[1],at+2);header.writeUInt32LE(f[2],at+4);if(f[1]===3)header.writeUInt16LE(f[3],at+8);else header.writeUInt32LE(f[3],at+8)});return Buffer.concat([header,body]);
}
(async()=>{for(const compression of [1,32773,8]){const b=makeTiff(compression),map=await H.parseGeoTiff(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),30,60);assert.deepEqual(map.elevations,[[10,0,20],[10,100,20],[10,0,20]])}console.log('Elevation import checks passed: CSV, TIFF compression, no-data, conservative resampling, rectangular cell distances and surface-based flight phases.')})().catch(e=>{console.error(e);process.exitCode=1});

