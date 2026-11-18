export function enableResizableLayout({controls,onChange=()=>{}}){
 const workspace=document.querySelector('.workspace'),key='tianjin-workspace-layout-v1';
 const small=matchMedia('(max-width:800px)');let state={height:610,width:280},drag=null;
 try{const saved=JSON.parse(localStorage.getItem(key));if(Number.isFinite(saved?.height))state.height=saved.height;if(Number.isFinite(saved?.width))state.width=saved.width;}catch{}
 const widthHandle=document.createElement('div'),heightHandle=document.createElement('div');
 widthHandle.className='workspace-width-handle';heightHandle.className='workspace-height-handle';
 for(const [handle,orientation,label]of [[widthHandle,'vertical','拖动调整地图与参数栏宽度'],[heightHandle,'horizontal','拖动调整地图高度']]){handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation',orientation);handle.setAttribute('aria-label',label);handle.title=label+'；双击恢复，方向键微调';}
 widthHandle.innerHTML='<span></span>';heightHandle.innerHTML='<span class="resize-grip"></span><span class="resize-caption">拖动调整高度</span>';
 const reset=document.createElement('button');reset.className='reset-layout';reset.textContent='恢复布局';reset.title='恢复默认高度与参数栏宽度';heightHandle.append(reset);
 const ribbonLayout=document.body.classList.contains('ribbon-layout');
 if(!ribbonLayout)workspace.append(widthHandle);workspace.append(heightHandle);workspace.classList.add('resize-ready');
 if(ribbonLayout){document.getElementById('ribbon-layout-options').prepend(reset);reset.textContent='恢复地图高度';reset.title='恢复默认地图高度';}
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function widthLimit(){return Math.max(240,Math.min(520,workspace.clientWidth-340));}
 function apply(){state.height=clamp(state.height,360,1200);state.width=clamp(state.width,240,widthLimit());workspace.style.setProperty('--map-height',state.height+'px');workspace.style.setProperty('--sidebar-width',state.width+'px');
 for(const [el,value,min,max]of [[heightHandle,state.height,360,1200],[widthHandle,state.width,240,widthLimit()]]){el.setAttribute('aria-valuenow',String(Math.round(value)));el.setAttribute('aria-valuemin',String(min));el.setAttribute('aria-valuemax',String(max));}widthHandle.tabIndex=small.matches?-1:0;
 }
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
 function change(){onChange();apply();}
 function finish(cancel=false){if(!drag)return;const current=drag;drag=null;if(cancel){state={...current.initial};apply();}controls.enabled=current.enabled;workspace.classList.remove('resizing-width','resizing-height');document.body.classList.remove('workspace-dragging');if(current.handle.hasPointerCapture(current.id))current.handle.releasePointerCapture(current.id);save();}
 function bind(handle,axis){handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button')||(axis==='width'&&small.matches))return;e.preventDefault();onChange();drag={axis,id:e.pointerId,handle,x:e.clientX,y:e.clientY,initial:{...state},enabled:controls.enabled};controls.enabled=false;handle.setPointerCapture(e.pointerId);handle.focus();workspace.classList.add('resizing-'+axis);document.body.classList.add('workspace-dragging');});
 handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;state[axis]=drag.initial[axis]+(axis==='width'?drag.x-e.clientX:e.clientY-drag.y);apply();});
 handle.addEventListener('pointerup',()=>finish());handle.addEventListener('pointercancel',()=>finish(true));handle.addEventListener('lostpointercapture',()=>finish());
 handle.addEventListener('dblclick',e=>{if(e.target.closest('button'))return;state[axis]=axis==='width'?280:610;change();save();});
 handle.addEventListener('keydown',e=>{if(e.target!==handle)return;const step=e.shiftKey?50:10;let delta=axis==='width'?{ArrowLeft:step,ArrowRight:-step}:{ArrowDown:step,ArrowUp:-step};if(e.key in delta){e.preventDefault();state[axis]+=delta[e.key];change();save();}else if(e.key==='Home'||e.key==='End'){e.preventDefault();state[axis]=e.key==='Home'?(axis==='width'?240:360):(axis==='width'?widthLimit():1200);change();save();}});
 }
 bind(widthHandle,'width');bind(heightHandle,'height');reset.onclick=()=>{finish();state={height:610,width:280};change();save();};
 window.addEventListener('blur',()=>finish());window.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)finish(true)});window.addEventListener('resize',()=>{finish();apply()});small.addEventListener('change',apply);apply();
}
