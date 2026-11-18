import {positionAt} from './planner.mjs';

export function reverseRoute(route){
 const points=route.points.toReversed(),timeline=route.timeline.toReversed().map(t=>route.seconds-t);
 return {...route,points,timeline,climb:points.reduce((n,p,i)=>n+(i?Math.max(0,p.y-points[i-1].y):0),0)};
}

// Intersect continuous time intervals, rather than sampling aircraft positions.
function horizontalWindow(p,v,r,duration){
 const a=v.x*v.x+v.z*v.z,b=2*(p.x*v.x+p.z*v.z),c=p.x*p.x+p.z*p.z-r*r;
 if(a<1e-14)return c<0?[0,duration]:null;
 const disc=b*b-4*a*c;if(disc<=0)return null;
 const lo=Math.max(0,(-b-Math.sqrt(disc))/(2*a)),hi=Math.min(duration,(-b+Math.sqrt(disc))/(2*a));
 return hi-lo>1e-8?[lo,hi]:null;
}
function verticalWindow(p,v,h,duration){
 if(Math.abs(v)<1e-12)return Math.abs(p)<h?[0,duration]:null;
 const a=(-h-p)/v,b=(h-p)/v,lo=Math.max(0,Math.min(a,b)),hi=Math.min(duration,Math.max(a,b));
 return hi-lo>1e-8?[lo,hi]:null;
}
export function firstConflict(a,b,horizontal=50,vertical=30){
 let first=null;
 for(let i=1;i<a.route.points.length;i++)for(let j=1;j<b.route.points.length;j++){
  const begin=Math.max(a.depart+a.route.timeline[i-1],b.depart+b.route.timeline[j-1]);
  const end=Math.min(a.depart+a.route.timeline[i],b.depart+b.route.timeline[j]);
  if(end<begin)continue;
  const pa=positionAt(a.route,begin-a.depart),pb=positionAt(b.route,begin-b.depart);
  const delta={x:pa.x-pb.x,y:pa.y-pb.y,z:pa.z-pb.z};
  if(end-begin<1e-8){if(Math.hypot(delta.x,delta.z)<horizontal&&Math.abs(delta.y)<vertical&&(!first||begin<first.time))first={time:begin,a:pa,b:pb,other:b.id};continue;}
  const velocity=(route,k)=>{const p=route.points[k-1],q=route.points[k],dt=route.timeline[k]-route.timeline[k-1];return {x:(q.x-p.x)/dt,y:(q.y-p.y)/dt,z:(q.z-p.z)/dt};};
  const va=velocity(a.route,i),vb=velocity(b.route,j),v={x:va.x-vb.x,y:va.y-vb.y,z:va.z-vb.z};
  const hw=horizontalWindow(delta,v,horizontal,end-begin),vw=verticalWindow(delta.y,v.y,vertical,end-begin);
  if(!hw||!vw)continue;const enter=Math.max(hw[0],vw[0]),exit=Math.min(hw[1],vw[1]);
  if(exit-enter<=1e-8)continue;
  const time=begin+enter+(exit-enter)/2;
  if(!first||time<first.time)first={time,a:positionAt(a.route,time-a.depart),b:positionAt(b.route,time-b.depart),other:b.id};
 }
 return first;
}
export function scheduleFleet(tasks,{horizontal=50,vertical=30,step=5,maxDelay=7200}={}){
 if(![horizontal,vertical,step,maxDelay].every(Number.isFinite)||horizontal<=0||vertical<=0||step<=0||maxDelay<0)throw Error('多机间隔和延迟步长必须为正数。');
 if(tasks.length>12)throw Error('当前最多支持 12 架飞机。');
 const ids=new Set(),scheduled=[];
 for(const task of tasks){
  if(ids.has(task.id))throw Error('任务编号重复。');ids.add(task.id);
  if(!Number.isFinite(task.requested)||task.requested<0||task.requested>86400)throw Error('出发时间应为 0–86400 秒。');
  const r=task.route;
  if(!r||r.points.length<2||r.points.length!==r.timeline.length||r.timeline[0]!==0||r.seconds!==r.timeline.at(-1)||r.points.some(p=>![p.x,p.y,p.z].every(Number.isFinite))||r.timeline.some((t,i)=>!Number.isFinite(t)||(i&&t<=r.timeline[i-1])))throw Error('任务航线或时间序列无效。');
  let candidate={...task,depart:task.requested,delay:0,conflicts:[]},found=false;const blocked=new Map();
  for(let delay=0;delay<=maxDelay;delay+=step){
   candidate.depart=task.requested+delay;candidate.delay=delay;
   const conflicts=scheduled.map(other=>firstConflict(candidate,other,horizontal,vertical)).filter(Boolean);
   if(!conflicts.length){found=true;break;}
   for(const conflict of conflicts)if(!blocked.has(conflict.other))blocked.set(conflict.other,conflict);
  }
  if(!found)throw Error(`${task.id} 在延迟上限内无法协调，请调整起点或出发时间。`);
  candidate.conflicts=[...blocked.values()];candidate.arrival=candidate.depart+r.seconds;scheduled.push(candidate);
 }
 return {tasks:scheduled,horizontal,vertical,step,maxDelay,duration:Math.max(0,...scheduled.map(t=>t.arrival)),totalDelay:scheduled.reduce((n,t)=>n+t.delay,0)};
}
