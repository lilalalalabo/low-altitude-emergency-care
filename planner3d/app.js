import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createFlightLab} from './flight-lab.js';
import {enableResizableLayout} from './layout.js';
import {installRibbon} from './ribbon.js';
import {createFleetLab} from './fleet-ui.js';
const $=id=>document.getElementById(id);
try{await init()}catch(err){$('loading').style.display='block';$('loading').textContent='地图未能启动：'+err.message;$('status').textContent='请使用支持 WebGL 的浏览器';console.error(err)}
async function init(){
let data,bs=[],mesh,grid,ground,loadSerial=0,loading=false,bench=null,results=[],suite=false,suiteToken=0,lab=null,fleet=null;
const files=['buildings.json','buildings-5km.json','buildings-10km.json'];
const view=$('viewport'),scene=new THREE.Scene();scene.background=new THREE.Color('#eaf0e8');
const camera=new THREE.PerspectiveCamera(40,1,1,80000);camera.position.set(1900,2100,2300);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor('#eaf0e8');view.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=80;controls.maxDistance=6500;controls.maxPolarAngle=Math.PI/2-.06;controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x70877a,2.4));const sun=new THREE.DirectionalLight(0xffffff,2.1);sun.position.set(-900,1600,800);scene.add(sun);
const dummy=new THREE.Object3D();let factor=1,colorMode=false,selected=-1;
const high=new THREE.Color('#426b79'),low=new THREE.Color('#c2d9c9');
function baseColor(b){return colorMode?low.clone().lerp(high,Math.min(b.height/110,1)):new THREE.Color('#f5f4ec')}
function update(){bs.forEach((b,i)=>{dummy.position.set(b.x,b.height*factor/2,b.z);dummy.scale.set(b.width,b.height*factor,b.depth);dummy.rotation.set(0,b.angle,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,i===selected?new THREE.Color('#e0a365'):baseColor(b))});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
async function load(index){
 const serial=++loadSerial;loading=true;$('loading').style.display='block';$('loading').textContent='正在载入建筑…';const start=performance.now();
 try{const response=await fetch('./'+files[index]);if(!response.ok)throw Error('建筑数据读取失败');const next=await response.json();if(serial!==loadSerial)return;
 for(const obj of [mesh,grid,ground])if(obj){scene.remove(obj);obj.geometry.dispose();obj.material.dispose();if(obj.dispose)obj.dispose();}
 data=next;bs=data.buildings;selected=-1;
 ground=new THREE.Mesh(new THREE.BoxGeometry(data.width,12,data.depth),new THREE.MeshLambertMaterial({color:'#dce6da'}));ground.position.y=-7;scene.add(ground);
 const points=[],w=data.width/2,d=data.depth/2;for(let x=-w;x<=w;x+=100)points.push(x,0,-d,x,0,d);for(let z=-d;z<=d;z+=100)points.push(-w,0,z,w,0,z);
 grid=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),new THREE.LineBasicMaterial({color:0xb9ccbb,transparent:true,opacity:.42}));grid.visible=$('grid').checked;scene.add(grid);
 mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff}),bs.length);scene.add(mesh);update();
 controls.maxDistance=data.width*2.5;reset();$('range').value=String(index);$('range-size').textContent=`${data.width/1000} × ${data.depth/1000} km`;
 $('building-id').textContent='选择一栋建筑';$('empty').hidden=false;$('detail').hidden=true;refreshStats();data.loadMs=performance.now()-start;$('loading').style.display='none';lab?.setScene(data);
 }finally{if(serial===loadSerial)loading=false;}
}
const ring=new THREE.Mesh(new THREE.RingGeometry(15,20,40),new THREE.MeshBasicMaterial({color:'#397b63',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=1;scene.add(ring);
const pole=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,1,0),new THREE.Vector3(0,130,0)]),new THREE.LineBasicMaterial({color:'#397b63'}));scene.add(pole);
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointermove',e=>{if(suite||loading||!lab)return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);lab.handleHover(ray);});
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(suite||loading||!mesh||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(mesh)[0];if(lab?.handleClick(ray,hit))return;selected=hit?hit.instanceId:-1;update();lab?.selectBuilding(selected);$('empty').hidden=selected>=0;$('detail').hidden=selected<0;$('building-id').textContent=selected>=0?bs[selected].id:'选择一栋建筑';if(selected>=0){const b=bs[selected];$('detail').innerHTML=`<dt>估计楼高</dt><dd>${b.height.toFixed(1)} m</dd><dt>矩形长边 / 短边</dt><dd>${Math.max(b.width,b.depth).toFixed(1)} / ${Math.min(b.width,b.depth).toFixed(1)} m</dd><dt>相对中心东向</dt><dd>${b.x.toFixed(0)} m</dd><dt>相对中心北向</dt><dd>${(-b.z).toFixed(0)} m</dd>`}});
function reset(top=false){const s=(data?.width||3000)/3000;controls.target.set(0,0,0);camera.up.set(0,1,0);camera.position.set(...(top?[0,3400*s,.1]:[1900*s,2100*s,2300*s]));controls.update();$('top').classList.toggle('active',top);$('oblique').classList.toggle('active',!top)}
$('oblique').onclick=()=>reset();$('top').onclick=()=>reset(true);$('reset').onclick=()=>reset();$('zoom-in').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(.8).add(controls.target);controls.update()};$('zoom-out').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(1.25).add(controls.target);controls.update()};
for(const [id,mode]of [['white',false],['height-color',true]])$(id).onclick=()=>{colorMode=mode;$('white').classList.toggle('active',!mode);$('height-color').classList.toggle('active',mode);$('legend').hidden=!mode;update()};
$('exag').oninput=e=>{factor=Number(e.target.value);$('exag-value').value=factor.toFixed(1)+'×';update();lab?.setFactor(factor);fleet?.setFactor(factor)};$('grid').onchange=e=>grid.visible=e.target.checked;
function refreshStats(){const bins=[{label:'< 20 m',n:0},{label:'20–40 m',n:0},{label:'40–60 m',n:0},{label:'≥ 60 m',n:0}];let min=Infinity,maxHeight=0;bs.forEach(b=>{bins[b.height<20?0:b.height<40?1:b.height<60?2:3].n++;min=Math.min(min,b.height);maxHeight=Math.max(maxHeight,b.height)});const max=Math.max(...bins.map(b=>b.n));$('histogram').innerHTML=bins.map(b=>`<div class="row"><span>${b.label}</span><div><b style="width:${100*b.n/max}%"></b></div><span>${b.n}</span></div>`).join('');$('count').textContent=bs.length.toLocaleString();$('status').textContent=`建筑高度 ${min.toFixed(1)}–${maxHeight.toFixed(1)} m`;}
function lock(active){suite=active;lab?.pause();fleet?.pause();controls.enabled=!active;document.querySelectorAll('.workspace button,.workspace input,.ribbon-panel button,.ribbon-panel input,.ribbon-panel select,#range,#run-test').forEach(el=>{if(el.id!=='cancel-test')el.disabled=active});$('cancel-test').disabled=false;$('cancel-test').hidden=!active;if(!active){lab?.syncEnabled();fleet?.syncEnabled();$('export-test').disabled=!results.length;}}
function cancel(reason){suiteToken++;if(bench){bench.resolve(null);bench=null;}lock(false);$('test-status').textContent=reason;}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&suite)cancel('测试中断：页面切到后台。请保持前台后重新测试。')});window.addEventListener('resize',()=>{if(suite)cancel('窗口尺寸改变，测试已中断。请重新测试。')});
$('cancel-test').onclick=()=>cancel('已取消；未完成的档位不计入结果。');
$('range').onchange=async e=>{try{await load(Number(e.target.value))}catch(err){$('loading').textContent=err.message}};
function showResults(){ $('test-results').innerHTML=results.map(r=>`<tr><td>${r.range}</td><td>${r.buildings.toLocaleString()}</td><td>${r.fps.toFixed(1)}</td><td>${r.lowFps.toFixed(1)}</td><td>${r.p95Ms.toFixed(1)} ms</td><td>${r.stalls}</td><td>${r.loadMs.toFixed(0)} ms</td></tr>`).join('');$('export-test').disabled=!results.length; }
function report(){return {date:new Date().toISOString(),method:'3 s warmup + 12 s orbit/zoom, fixed relative camera path; stalls >100 ms; 1% low = reciprocal of mean slowest 1% frame intervals; load excludes first GPU upload',viewport:[view.clientWidth,view.clientHeight],pixelRatio:renderer.getPixelRatio(),userAgent:navigator.userAgent,results};}
$('export-test').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='tianjin-map-benchmark.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
async function run(){if(suite||loading||document.hidden)return;const token=++suiteToken;results=[];showResults();lock(true);factor=1;lab?.setFactor(1);fleet?.setFactor(1);colorMode=false;$('exag').value='1';$('exag-value').value='1.0×';$('white').classList.add('active');$('height-color').classList.remove('active');$('legend').hidden=true;$('grid').checked=true;
try{for(let i=0;i<files.length;i++){if(token!==suiteToken)return;$('test-status').textContent=`${i+1}/3 · 正在加载`;await load(i);if(token!==suiteToken)return;controls.enableDamping=false;const result=await new Promise(resolve=>bench={start:null,last:null,intervals:[],resolve});if(!result||token!==suiteToken)return;results.push(result);showResults();} $('test-status').textContent='测试完成 · 可下载记录。结果仅代表当前设备、窗口和建筑场景。';const payload=report();try{localStorage.setItem('tianjin-benchmark',JSON.stringify(payload));if(location.hostname==='127.0.0.1'&&location.port==='8783')await fetch('/benchmark-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch{} }catch(err){$('test-status').textContent='测试失败：'+err.message;}finally{if(token===suiteToken)lock(false);controls.enableDamping=true;}}
$('run-test').onclick=run;
const resize=new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()});resize.observe(view);
let frames=0,stamp=performance.now();const anchor=new THREE.Vector3(0,135,0);function frame(now){requestAnimationFrame(frame);
if(bench){if(bench.start===null)bench.start=now;const elapsed=now-bench.start,t=Math.max(0,(elapsed-3000)/12000),a=t*Math.PI*2,r=data.width*(.9-.35*Math.sin(t*Math.PI)**2);camera.position.set(Math.cos(a)*r,data.width*.65,Math.sin(a)*r);camera.lookAt(0,0,0);
 if(elapsed>=3000){if(bench.last!==null)bench.intervals.push(now-bench.last);bench.last=now;}$('test-status').textContent=`${results.length+1}/3 · ${elapsed<3000?'预热':'旋转与缩放'} · ${Math.max(0,Math.ceil((15000-elapsed)/1000))} 秒`;
 if(elapsed>=15000&&bench.intervals.length){const intervals=bench.intervals,sorted=[...intervals].sort((a,b)=>a-b),sum=intervals.reduce((a,b)=>a+b,0),tail=sorted.slice(-Math.max(1,Math.ceil(sorted.length*.01)));const result={range:`${data.width/1000} × ${data.depth/1000} km`,buildings:bs.length,fps:1000*intervals.length/sum,lowFps:1000/(tail.reduce((a,b)=>a+b,0)/tail.length),p95Ms:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],stalls:intervals.filter(x=>x>100).length,frames:intervals.length,durationMs:sum,loadMs:data.loadMs,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};const resolve=bench.resolve;bench=null;resolve(result);}
}else controls.update();lab?.tick(now);fleet?.tick(now);renderer.render(scene,camera);const p=anchor.clone().project(camera);$('campus').style.left=(p.x*.5+.5)*view.clientWidth+'px';$('campus').style.top=(-p.y*.5+.5)*view.clientHeight+'px';$('campus').style.display=p.z>1?'none':'';frames++;if(now-stamp>=1000){$('fps').textContent=Math.round(frames*1000/(now-stamp))+' FPS · 当前浏览器';frames=0;stamp=now;}}requestAnimationFrame(frame);
lab=createFlightLab({scene,camera,controls,replaceBuildings(next){bs=next;data.buildings=next;selected=-1;scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0xffffff}),bs.length);scene.add(mesh);update();refreshStats();$('building-id').textContent='选择一栋建筑';$('detail').hidden=true;$('empty').hidden=false;}});
fleet=createFleetLab({scene,camera,controls},lab);
installRibbon();
enableResizableLayout({controls,onChange(){if(suite)cancel('布局已改变，性能测试中止；可在新尺寸下重新测试。');}});
await load(0);if(new URLSearchParams(location.search).get('benchmark')==='1')run();
}



