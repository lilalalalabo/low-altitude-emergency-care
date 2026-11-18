// Coordinates are metres: x east, y height, z south. No visual height scaling here.
export function intersects(a,b,o){
 const c=Math.cos(o.angle||0),s=Math.sin(o.angle||0);
 const local=p=>[c*(p.x-o.x)-s*(p.z-o.z),p.y,s*(p.x-o.x)+c*(p.z-o.z)];
 const p=local(a),q=local(b),lo=[-o.width/2,o.bottom,-o.depth/2],hi=[o.width/2,o.top,o.depth/2];let enter=0,exit=1;
 for(let k=0;k<3;k++){const d=q[k]-p[k];if(Math.abs(d)<1e-10){if(p[k]<lo[k]||p[k]>hi[k])return false;}else{let t=(lo[k]-p[k])/d,u=(hi[k]-p[k])/d;if(t>u)[t,u]=[u,t];enter=Math.max(enter,t);exit=Math.min(exit,u);if(enter>exit)return false;}}return true;
}
export function obstacleIndex(buildings,zones=[],margin=0,vertical=0){
 const obstacles=[...buildings.map(b=>({...b,bottom:-vertical,top:b.height+vertical,width:b.width+2*margin,depth:b.depth+2*margin})),...zones.map(b=>({...b,bottom:b.bottom-vertical,top:b.top+vertical,width:b.width+2*margin,depth:b.depth+2*margin}))];
 const buckets=new Map(),cell=100;
 obstacles.forEach((o,i)=>{const c=Math.abs(Math.cos(o.angle||0)),s=Math.abs(Math.sin(o.angle||0)),w=(o.width*c+o.depth*s)/2,d=(o.width*s+o.depth*c)/2;for(let x=Math.floor((o.x-w)/cell);x<=Math.floor((o.x+w)/cell);x++)for(let z=Math.floor((o.z-d)/cell);z<=Math.floor((o.z+d)/cell);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}});
 function nearby(a,b){const ids=new Set();for(let x=Math.floor(Math.min(a.x,b.x)/cell);x<=Math.floor(Math.max(a.x,b.x)/cell);x++)for(let z=Math.floor(Math.min(a.z,b.z)/cell);z<=Math.floor(Math.max(a.z,b.z)/cell);z++)for(const i of buckets.get(x+','+z)||[])ids.add(i);return ids;}
 return {obstacles,candidates(a,b){return [...nearby(a,b)].map(i=>obstacles[i]);},clear(a,b,ignore){for(const i of nearby(a,b)){const o=obstacles[i];if(o.id!==ignore&&intersects(a,b,o))return false;}return true;}};
}
class Heap{a=[];push(v){let i=this.a.length;this.a.push(v);while(i){let p=(i-1)>>1;if(this.a[p].f<=v.f)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].f<this.a[c].f)c++;if(this.a[c].f>=last.f)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return first;}}
export function plan(input){
 const began=performance.now(),{buildings,zones=[],start,end,width,depth}=input,p=input.params;
 if(!start||!end)throw Error('请先选择起点和终点。');
 if(![p.speed,p.climb,p.ceiling,p.clearance,p.vertical,p.cell].every(Number.isFinite)||p.speed<=0||p.climb<=0||p.ceiling<30||p.ceiling>600||p.clearance<0||p.vertical<0||p.cell<10)throw Error('飞行参数无效。');
 const inside=a=>[a.x,a.y,a.z].every(Number.isFinite)&&Math.abs(a.x)<=width/2&&Math.abs(a.z)<=depth/2&&a.y>=0&&a.y<p.ceiling;
 if(!inside(start)||!inside(end))throw Error('起终点应在地图内，并低于高度上限。');
 const index=obstacleIndex(buildings,zones,p.clearance,p.vertical),cell=p.cell,nx=Math.floor(width/cell)+1,nz=Math.floor(depth/cell)+1,levels=[];
 for(let h=30;h<p.ceiling;h+=30)levels.push(h);levels.push(p.ceiling);
 const sx=Math.round((start.x+width/2)/cell),sz=Math.round((start.z+depth/2)/cell),ex=Math.round((end.x+width/2)/cell),ez=Math.round((end.z+depth/2)/cell);
 const pos=(x,z,l)=>({x:x*cell-width/2,y:levels[l],z:z*cell-depth/2}),key=(x,z,l)=>(l*nz+z)*nx+x;
 const decode=k=>{const x=k%nx,t=(k-x)/nx,z=t%nz;return [x,z,(t-z)/nz];};
 const time=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)/p.speed+Math.abs(a.y-b.y)/p.climb;
 function connector(point,x,z,l){const lift={x:point.x,y:levels[l],z:point.z},node=pos(x,z,l);if(lift.y<=point.y+p.vertical+.1)return null;const roof=point.buildingId&&buildings.find(b=>b.id===point.buildingId);if(point.buildingId&&(!roof||Math.abs(point.y-roof.height)>.01))return null;
  if(!index.clear(point,lift,point.buildingId)||!index.clear(lift,node))return null;return {lift,node,cost:time(point,lift)+time(lift,node)};}
 const heap=new Heap(),cost=new Map(),parent=new Map(),initial=new Map(),goals=new Map();
 for(let l=0;l<levels.length;l++){const g=connector(end,ex,ez,l);if(g)goals.set(key(ex,ez,l),g);const s=connector(start,sx,sz,l);if(s){const k=key(sx,sz,l);cost.set(k,s.cost);initial.set(k,s);heap.push({k,g:s.cost,f:s.cost+time(s.node,end)});}}
 if(!heap.a.length||!goals.size)throw Error('起降通道被建筑或禁飞区占用，或高度上限不足。请换点或调整参数。');
 let best=Infinity,finish=null,expanded=0;const closed=new Set(),dirs=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
 while(heap.a.length){const cur=heap.pop();if(cur.f>=best)break;if(closed.has(cur.k)||cur.g!==cost.get(cur.k))continue;closed.add(cur.k);if(++expanded>220000||performance.now()-began>20000)throw Error('搜索达到本地计算上限；请缩小范围、提高高度上限或使用较粗网格。');
  if(goals.has(cur.k)){const total=cur.g+goals.get(cur.k).cost;if(total<best){best=total;finish=cur.k;}}
  const [x,z,l]=decode(cur.k),a=pos(x,z,l),neighbors=dirs.map(([dx,dz])=>[x+dx,z+dz,l]);neighbors.push([x,z,l-1],[x,z,l+1]);
  for(const [xx,zz,ll]of neighbors){if(xx<0||zz<0||xx>=nx||zz>=nz||ll<0||ll>=levels.length)continue;const k=key(xx,zz,ll);if(closed.has(k))continue;const b=pos(xx,zz,ll),g=cur.g+time(a,b);if(g>=(cost.get(k)??Infinity)||!index.clear(a,b))continue;cost.set(k,g);parent.set(k,cur.k);heap.push({k,g,f:g+time(b,end)});}
 }
 if(finish===null)throw Error('当前高度与间隔条件下未找到路线。可提高上限、减少禁飞区或调整起终点。');
 const keys=[];let k=finish;while(k!==undefined){keys.push(k);k=parent.get(k);}keys.reverse();
 let points=[{...start},initial.get(keys[0]).lift,...keys.map(k=>pos(...decode(k))),goals.get(finish).lift,{...end}];
 points=points.filter((a,i)=>!i||Math.hypot(a.x-points[i-1].x,a.y-points[i-1].y,a.z-points[i-1].z)>1e-6);
 // Remove collinear intermediate waypoints only. No unchecked curved smoothing.
 for(let i=1;i<points.length-1;){const a=points[i-1],b=points[i],c=points[i+1],u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])<1e-5&&u.reduce((s,n,j)=>s+n*v[j],0)>0)points.splice(i,1);else i++;}
 let distance=0,climb=0,seconds=0;const timeline=[0];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],ignore=i===1?start.buildingId:i===points.length-1?end.buildingId:undefined;if(!index.clear(a,b,ignore))throw Error('路线复核失败。');distance+=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);climb+=Math.max(0,b.y-a.y);seconds+=time(a,b);timeline.push(seconds);}
 return {points,timeline,distance,climb,seconds,expanded,computeMs:performance.now()-began,levels,cell};
}
export function positionAt(route,t){t=Math.max(0,Math.min(route.seconds,t));let i=1;while(i<route.timeline.length-1&&route.timeline[i]<t)i++;const a=route.points[i-1],b=route.points[i],f=(t-route.timeline[i-1])/(route.timeline[i]-route.timeline[i-1]||1);return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,segment:i};}
