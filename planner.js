(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.FlightPlanner=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const WIDTH=60, HEIGHT=40, CELL_METERS=50, VERTICAL_SPEED=3, CLEARANCE=10;
 const profiles={A:{height:60,speed:12},B:{height:100,speed:15},C:{height:140,speed:18},D:{height:180,speed:21}};
 // Fictional obstacles for a schematic example, not real-world aeronautical information.
 const obstacles=[{id:'R1',type:'restricted',x:26,y:13,w:7,h:10,height:null},{id:'R2',type:'restricted',x:46,y:3,w:6,h:7,height:null},{id:'R3',type:'restricted',x:12,y:28,w:7,h:5,height:null},{id:'B1',type:'building',x:10,y:8,w:4,h:5,height:85},{id:'B2',type:'building',x:35,y:18,w:5,h:6,height:125},{id:'B3',type:'building',x:48,y:28,w:4,h:5,height:155},{id:'B4',type:'building',x:8,y:20,w:4,h:4,height:45},{id:'B5',type:'building',x:20,y:4,w:4,h:4,height:115},{id:'B6',type:'building',x:38,y:5,w:4,h:4,height:70},{id:'B7',type:'building',x:21,y:25,w:4,h:5,height:105},{id:'B8',type:'building',x:42,y:27,w:3,h:4,height:60},{id:'B9',type:'building',x:53,y:15,w:4,h:5,height:95},{id:'B10',type:'building',x:29,y:30,w:5,h:4,height:145},{id:'B11',type:'building',x:4,y:31,w:4,h:4,height:65},{id:'B12',type:'building',x:53,y:35,w:4,h:3,height:110}];
 const within=(x,y)=>x>=0&&y>=0&&x<WIDTH&&y<HEIGHT;
 const covers=(o,x,y)=>x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h;
 function occupied(x,y,height){return !within(x,y)||obstacles.some(o=>covers(o,x,y)&&(o.type==='restricted'||height<=o.height+CLEARANCE))}
 function groundBlocked(x,y){return !within(x,y)||obstacles.some(o=>covers(o,x,y));}
 function findPath(start,end,height){
  if(!start||!end||groundBlocked(start.x,start.y)||groundBlocked(end.x,end.y))return {error:'invalid_endpoint'};
  if(start.x===end.x&&start.y===end.y)return {error:'same_point'};
  const id=(x,y)=>y*WIDTH+x, point=i=>({x:i%WIDTH,y:Math.floor(i/WIDTH)}), source=id(start.x,start.y),target=id(end.x,end.y),count=WIDTH*HEIGHT;
  const dist=new Float64Array(count);dist.fill(Infinity);dist[source]=0;const prev=new Int32Array(count);prev.fill(-1);let open=[source];const closed=new Uint8Array(count);
  const h=p=>Math.hypot(end.x-p.x,end.y-p.y);
  while(open.length){let best=0;for(let i=1;i<open.length;i++){let a=point(open[i]),b=point(open[best]);if(dist[open[i]]+h(a)<dist[open[best]]+h(b))best=i;}const current=open.splice(best,1)[0];if(closed[current])continue;if(current===target){let route=[];for(let j=current;j!==-1;j=prev[j])route.push(point(j));route.reverse();return {path:route,distanceMeters:dist[target]*CELL_METERS};}closed[current]=1;let p=point(current);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const x=p.x+dx,y=p.y+dy;if(occupied(x,y,height))continue;if(dx&&dy&&(occupied(p.x+dx,p.y,height)||occupied(p.x,p.y+dy,height)))continue;const next=id(x,y);if(closed[next])continue;const candidate=dist[current]+Math.hypot(dx,dy);if(candidate<dist[next]){dist[next]=candidate;prev[next]=current;open.push(next)}}
  }return {error:'no_route'};
 }
 function positionAt(path,elapsed,height,speed,verticalSpeed=VERTICAL_SPEED){const climb=height/verticalSpeed;if(elapsed<=0)return {point:path[0],altitude:0,phase:'waiting'};if(elapsed<climb)return {point:path[0],altitude:elapsed*verticalSpeed,phase:'climb'};let remaining=(elapsed-climb)*speed;for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],length=Math.hypot(b.x-a.x,b.y-a.y)*CELL_METERS;if(remaining<length){let u=remaining/length;return {point:{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u},altitude:height,phase:'cruise'};}remaining-=length;}const descend=remaining/speed;if(descend<climb)return {point:path[path.length-1],altitude:Math.max(0,height-descend*verticalSpeed),phase:'descent'};return {point:path[path.length-1],altitude:0,phase:'arrived'};}
 return {WIDTH,HEIGHT,CELL_METERS,VERTICAL_SPEED,CLEARANCE,profiles,obstacles,within,covers,occupied,groundBlocked,findPath,positionAt};
});

