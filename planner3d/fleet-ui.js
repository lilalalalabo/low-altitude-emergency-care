import * as THREE from './vendor/three.module.js';
import {positionAt,obstacleIndex} from './planner.mjs';

export function createFleetLab(api,lab){
 const $=id=>document.getElementById(id),colors=['#176d67','#d17b38','#596bb5','#a35e8d','#638042','#408ca4'];
 let tasks=[],result=null,worker=null,serial=0,elapsed=0,playing=false,last=0,factor=1,active=false,selected=null;
 const layer=new THREE.Group();layer.name='fleet-layer';api.scene.add(layer);let actors=[];
 const settings=document.createElement('section');settings.id='fleet-controls';
 settings.innerHTML=`<label>期望出发 <small>秒</small><input id="fleet-depart" type="number" min="0" max="86400" value="0" step="5"></label><label>机间水平间隔 m<input id="fleet-horizontal" type="number" min="1" max="500" value="50"></label><label>机间垂直间隔 m<input id="fleet-vertical" type="number" min="1" max="200" value="30"></label><div class="fleet-actions"><button id="fleet-add">＋ 当前航线入队</button><button id="fleet-demo">载入三机交会示例</button></div><div class="fleet-actions"><button id="fleet-play" disabled>▶ 多机播放</button><button id="fleet-reset" disabled>回到起点</button></div><label>播放速度<select id="fleet-rate"><option value="1">1×</option><option value="5" selected>5×</option><option value="10">10×</option><option value="30">30×</option></select></label><div class="fleet-actions"><button id="fleet-export" disabled>导出任务记录</button><button id="fleet-clear" disabled>清空队列</button></div>`;
 document.querySelector('.workspace').before(settings);
 const section=document.createElement('section');section.className='fleet-board';section.innerHTML=`<div class="fleet-board-head"><div><span class="eyebrow">MULTI-AIRCRAFT / 3D</span><h2>多机任务队列 <small id="fleet-count">0 / 12</small></h2></div><span id="fleet-summary">先计算一条三维航线，再加入队列。</span></div><div class="fleet-scrubber"><input id="fleet-progress" type="range" min="0" max="1000" value="0" aria-label="多机回放进度" disabled><span id="fleet-clock">00:00 / 00:00</span></div><p id="fleet-message" role="status">按加入顺序协调；冲突时后加入的任务等待起飞。</p><div class="table-wrap"><table><thead><tr><th>任务</th><th>飞行参数</th><th>期望 / 实际起飞</th><th>等待</th><th>到达</th><th>共同时间轴</th><th>状态</th><th></th></tr></thead><tbody id="fleet-rows"></tbody></table></div><details id="fleet-detail"><summary>选中任务 · 配置与协调记录</summary><div id="fleet-record">点击任务编号，查看路径和交会处理。</div></details>`;
 document.querySelector('.playback').before(section);
 const time=t=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
 const message=s=>$('fleet-message').textContent=s;
 function dispose(){for(const c of [...layer.children]){layer.remove(c);c.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}});}actors=[];}
 function stop(){playing=false;last=0;$('fleet-play').textContent='▶ 多机播放';}
 function activate(){lab.pause();$('inspect-tool').click();lab.setPreviewVisible(false);layer.visible=true;active=true;}
 function controls(){const ready=!!result?.tasks.length;for(const id of ['fleet-play','fleet-reset','fleet-progress','fleet-export'])$(id).disabled=!ready||!!worker;$('fleet-clear').disabled=!tasks.length&&!worker;$('fleet-add').disabled=!!worker||tasks.length>=12;$('fleet-demo').disabled=!!worker;}
 function clear(text='队列已清空。'){worker?.terminate();worker=null;tasks=[];result=null;selected=null;elapsed=0;stop();dispose();render();controls();message(text);lab.setPreviewVisible(true);active=false;}
 function configuration(){return {horizontal:Number($('fleet-horizontal').value),vertical:Number($('fleet-vertical').value),step:5,maxDelay:7200};}
 function calculate(proposed){
  if(!proposed.length){clear();return;}
  const scene=lab.getScene();if(!scene)return;worker?.terminate();stop();
  const current=new Worker(new URL('./fleet-worker.js',import.meta.url),{type:'module'});worker=current;controls();message('正在计算三维航线与机间时间协调…');
  current.onmessage=e=>{if(worker!==current)return;current.terminate();worker=null;if(e.data.error){message(e.data.error);controls();return;}result=e.data.result;tasks=result.tasks.map(({depart,delay,conflicts,arrival,...t})=>t);selected=tasks.at(-1).id;elapsed=0;activate();draw();render();controls();message(`已复核 ${tasks.length} 条航线 · 水平 ${result.horizontal} m / 垂直 ${result.vertical} m · 延迟步长 ${result.step} s`);};
  current.onerror=()=>{if(worker!==current)return;current.terminate();worker=null;message('多机模块加载失败，请刷新重试。');controls();};
  current.postMessage({tasks:proposed,scene,settings:configuration()});
 }
 $('fleet-add').onclick=()=>{const draft=lab.getDraft();if(!draft){message('请先在“飞行任务”中计算一条航线，再加入队列。');return;}calculate([...tasks,{...draft,id:'UAV-'+String(++serial).padStart(2,'0'),requested:Number($('fleet-depart').value)}]);};
 $('fleet-demo').onclick=()=>{
  const scene=lab.getScene();if(!scene)return;const params={...lab.getParams(),cell:50};const index=obstacleIndex(scene.buildings,scene.zones,params.clearance,params.vertical);
  function find(x,z){for(let radius=0;radius<500;radius+=25)for(let a=0;a<Math.PI*2;a+=Math.PI/8){const p={x:x+Math.cos(a)*radius,y:0,z:z+Math.sin(a)*radius};if(Math.abs(p.x)>scene.width/2-50||Math.abs(p.z)>scene.depth/2-50)continue;if(index.clear(p,{...p,y:params.ceiling}))return p;}return null;}
  const west=find(-scene.width*.27,0),east=find(scene.width*.27,0),north=find(0,-scene.depth*.3),south=find(0,scene.depth*.3);
  if(!west||!east||!north||!south){message('当前场景没有找到示例起降空地，请手动选点。');return;}
  const pairs=[[west,east],[east,west],[north,south]],demo=pairs.map(([start,end])=>({id:'UAV-'+String(++serial).padStart(2,'0'),requested:0,start,end,params}));demo[1].reverseOf=demo[0].id;calculate(demo);
 };
 for(const id of ['fleet-horizontal','fleet-vertical'])$(id).onchange=()=>{if(tasks.length)calculate(tasks);};
 $('fleet-clear').onclick=()=>clear();
 function label(text,color){const c=document.createElement('canvas');c.width=192;c.height=64;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,192,64);g.fillStyle='white';g.font='bold 27px sans-serif';g.textAlign='center';g.fillText(text,96,42);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.scale.set(82,27,1);s.renderOrder=20;return s;}
 function draw(){dispose();if(!result)return;result.tasks.forEach((t,i)=>{
  const group=new THREE.Group(),color=colors[i%colors.length];group.userData.task=t.id;layer.add(group);
  const pts=t.route.points.map(p=>new THREE.Vector3(p.x,p.y,p.z));
  for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],d=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(3.8,3.8,d.length(),6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7}));mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());group.add(mesh);}
  for(let s=.15;s<1;s+=.2){const p=positionAt(t.route,t.route.seconds*s),q=positionAt(t.route,Math.min(t.route.seconds,t.route.seconds*s+1)),dir=new THREE.Vector3(q.x-p.x,q.y-p.y,q.z-p.z);if(dir.length())group.add(new THREE.ArrowHelper(dir.normalize(),new THREE.Vector3(p.x,p.y,p.z),32,new THREE.Color(color).getHex(),12,8));}
  for(const [p,s]of [[t.start,'S'],[t.end,'E']]){const marker=label(`${t.id.slice(-2)} · ${s}`,color);marker.position.set(p.x,p.y+24+i*5,p.z);group.add(marker);}
  const drone=new THREE.Group();drone.add(new THREE.Mesh(new THREE.BoxGeometry(15,6,13),new THREE.MeshLambertMaterial({color})));
  for(const x of [-13,13])for(const z of [-13,13]){const rotor=new THREE.Mesh(new THREE.TorusGeometry(7,1.7,5,12),new THREE.MeshBasicMaterial({color:0x1e322c}));rotor.rotation.x=Math.PI/2;rotor.position.set(x,0,z);drone.add(rotor);const arm=new THREE.Mesh(new THREE.BoxGeometry(2,2,36),new THREE.MeshBasicMaterial({color:0x1e322c}));arm.rotation.y=x*z>0?Math.PI/4:-Math.PI/4;drone.add(arm);}
  const badge=label(t.id,color);badge.position.y=28;drone.add(badge);group.add(drone);actors.push({task:t,drone,group});
 });update();}
 function render(){
  $('fleet-count').textContent=`${tasks.length} / 12`;$('fleet-summary').textContent=result?`${tasks.length} 架 · 完成 ${time(result.duration)} · 累计等待 ${result.totalDelay.toFixed(0)} s`:'先计算一条三维航线，再加入队列。';
  $('fleet-rows').replaceChildren();(result?.tasks||[]).forEach((t,i)=>{const row=document.createElement('tr');row.classList.toggle('selected',selected===t.id);row.innerHTML=`<td><button class="task-select" style="--task-color:${colors[i%colors.length]}">${t.id}</button></td><td>${t.params.speed} m/s · 上限 ${t.params.ceiling} m</td><td>${time(t.requested)} → ${time(t.depart)}</td><td>${t.delay} s</td><td>${time(t.arrival)}</td><td><div class="schedule-track"><i class="wait" style="left:${100*t.requested/result.duration}%;width:${100*t.delay/result.duration}%"></i><i style="background:${colors[i%colors.length]};left:${100*t.depart/result.duration}%;width:${100*t.route.seconds/result.duration}%"></i></div></td><td data-state="${t.id}"></td><td><button class="task-remove" aria-label="移除 ${t.id}">移除</button></td>`;
   row.querySelector('.task-select').onclick=()=>{selected=t.id;activate();render();};row.querySelector('.task-remove').onclick=()=>calculate(tasks.filter(task=>task.id!==t.id));$('fleet-rows').append(row);
  });
  const task=result?.tasks.find(t=>t.id===selected);$('fleet-record').replaceChildren();
  if(task){const p=document.createElement('p');p.textContent=`${task.id} · 航程 ${task.route.distance.toFixed(0)} m · 飞行 ${task.route.seconds.toFixed(1)} s · 起降速度 ${task.params.climb} m/s · 建筑间隔 ${task.params.clearance} / ${task.params.vertical} m · 网格 ${task.params.cell} m。`;const coord=document.createElement('p');coord.textContent=`起点 (东 ${task.start.x.toFixed(0)}, 高 ${task.start.y.toFixed(0)}, 北 ${(-task.start.z).toFixed(0)}) → 终点 (东 ${task.end.x.toFixed(0)}, 高 ${task.end.y.toFixed(0)}, 北 ${(-task.end.z).toFixed(0)}) m。`;const note=document.createElement('p');note.textContent=task.conflicts.length?`顺序延时：与 ${task.conflicts.map(c=>c.other).join('、')} 的原时段接近，地面等待 ${task.delay} s 后起飞；已检查调整后的完整起飞、巡航与降落轨迹。`:'该任务与已安排任务没有时间冲突，按期望时间起飞。';const list=document.createElement('p');list.textContent=task.conflicts.map(c=>`交会记录：与 ${c.other} 于原方案 ${time(c.time)}，本机高度 ${c.a.y.toFixed(0)} m / 对方 ${c.b.y.toFixed(0)} m，东 ${c.a.x.toFixed(0)} / 北 ${(-c.a.z).toFixed(0)} m。`).join(' ');$('fleet-record').append(p,coord,note,list);}
  else $('fleet-record').textContent='点击任务编号，查看路径和交会处理。';
  update();
 }
 function update(){
  $('fleet-clock').textContent=time(elapsed)+' / '+time(result?.duration||0);$('fleet-progress').value=result?Math.round(elapsed/result.duration*1000):0;
  for(const {task:t,drone,group}of actors){const p=positionAt(t.route,elapsed-t.depart),next=positionAt(t.route,elapsed-t.depart+.5);drone.position.set(p.x,p.y,p.z);if(Math.hypot(next.x-p.x,next.z-p.z)>.01)drone.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);drone.visible=elapsed<=t.arrival;
   for(const child of group.children){if(child.material?.transparent&&child.geometry?.type==='CylinderGeometry')child.material.opacity=selected===t.id ? .95 : .38;if(child.isSprite)child.visible=selected===t.id;}
   const status=document.querySelector(`[data-state="${t.id}"]`);if(status)status.textContent=elapsed<t.requested?'待出发':elapsed<t.depart?'等待放行':elapsed<t.arrival?'飞行中':'已到达';
  }
 }
 $('fleet-play').onclick=()=>{if(!result)return;activate();if(elapsed>=result.duration)elapsed=0;playing=!playing;last=0;$('fleet-play').textContent=playing?'❚❚ 暂停':'▶ 多机播放';};
 $('fleet-reset').onclick=()=>{stop();elapsed=0;activate();update();};$('fleet-progress').oninput=e=>{if(!result)return;stop();activate();elapsed=result.duration*Number(e.target.value)/1000;update();};
 $('fleet-export').onclick=()=>{if(!result)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({version:1,method:'layered-a-star + prioritized departure delay; continuous segment separation',scene:lab.getSceneRecord(),...result},null,2)],{type:'application/json'}));a.href=url;a.download='tianjin-3d-fleet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 lab.subscribe(event=>{if(event==='scene')clear('地图已更新，旧队列已清除。');if(event==='preview'){stop();active=false;layer.visible=false;lab.setPreviewVisible(true);}});
 controls();return {pause:stop,syncEnabled:controls,setFactor(v){factor=v;layer.scale.y=factor;},tick(now){if(playing&&active&&result){if(last)elapsed=Math.min(result.duration,elapsed+(now-last)/1000*Number($('fleet-rate').value));last=now;update();if(elapsed>=result.duration)stop();}else last=0;},getResult:()=>result};
}
