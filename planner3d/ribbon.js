export function installRibbon(){
 const $=id=>document.getElementById(id),workspace=document.querySelector('.workspace');
 const ribbon=document.createElement('section');ribbon.className='office-ribbon';ribbon.setAttribute('aria-label','工作台功能区');
 ribbon.innerHTML=`<div class="ribbon-header"><div class="ribbon-tabs" role="tablist" aria-label="功能分类"></div><div class="ribbon-controls"><button id="pin-ribbon" aria-pressed="true" title="固定展开功能区">固定菜单</button><button id="collapse-ribbon" title="隐藏功能区，仅保留分类标签" aria-label="隐藏功能区">收起 ⌃</button></div></div><div id="ribbon-body"></div><div class="ribbon-status"><span id="ribbon-context"></span><span id="ribbon-selection"></span></div>`;
 workspace.before(ribbon);document.body.classList.add('ribbon-layout');
 const tabs=[['task','飞行任务'],['fleet','多机协同'],['edit','地图编辑'],['view','视图'],['test','测试与导出']],panels=new Map();let active='task',pinned=true,expanded=true;
 try{const value=JSON.parse(localStorage.getItem('tianjin-ribbon-v1'));if(typeof value?.pinned==='boolean')pinned=value.pinned;}catch{}expanded=pinned;
 function save(){try{localStorage.setItem('tianjin-ribbon-v1',JSON.stringify({pinned}));}catch{}}
 function refresh(){ribbon.classList.toggle('ribbon-pinned',pinned);ribbon.classList.toggle('ribbon-flyout',!pinned);$('ribbon-body').hidden=!expanded;$('pin-ribbon').setAttribute('aria-pressed',String(pinned));$('pin-ribbon').textContent=pinned?'已固定':'固定菜单';$('collapse-ribbon').textContent=expanded?'收起 ⌃':'展开 ⌄';$('collapse-ribbon').setAttribute('aria-label',expanded?'隐藏功能区':'展开功能区');$('collapse-ribbon').setAttribute('aria-expanded',String(expanded));for(const [id]of tabs){const tab=$('ribbon-tab-'+id);tab.setAttribute('aria-selected',String(active===id));tab.tabIndex=active===id?0:-1;panels.get(id).hidden=id!==active;} }
 function select(id){active=id;expanded=true;refresh();}
 for(const [id,label]of tabs){const tab=document.createElement('button');tab.id='ribbon-tab-'+id;tab.textContent=label;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','ribbon-panel-'+id);tab.onclick=()=>select(id);tab.ondblclick=()=>{pinned=!pinned;expanded=pinned;refresh();save()};tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=tabs.findIndex(t=>t[0]===active),n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[n][0]);$('ribbon-tab-'+active).focus();};ribbon.querySelector('.ribbon-tabs').append(tab);const panel=document.createElement('div');panel.id='ribbon-panel-'+id;panel.className='ribbon-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);$('ribbon-body').append(panel);panels.set(id,panel);}
 function group(tab,title,className=''){const group=document.createElement('section');group.className='ribbon-group '+className;const contents=document.createElement('div');contents.className='ribbon-group-content';group.append(contents);const caption=document.createElement('div');caption.className='ribbon-caption';caption.textContent=title;group.append(caption);panels.get(tab).append(group);return contents;}
 function move(target,ids){for(const id of ids)target.append($(id));}
 function field(target,id){target.append($(id).closest('label'));}
 const points=group('task','起终点','ribbon-buttons');move(points,['inspect-tool','pick-start','pick-end','demo-flight']);
 const flight=group('task','飞行参数','ribbon-fields');for(const id of ['flight-speed','flight-climb','flight-ceiling'])field(flight,id);
 const safety=group('task','避障与精度','ribbon-fields');for(const id of ['flight-margin','flight-vertical','flight-cell'])field(safety,id);
 const calculate=group('task','路线规划','ribbon-planning');move(calculate,['plan-flight','flight-message']);
 const player=group('task','飞行回放','ribbon-player');move(player,['play-flight','restart-flight','flight-rate']);field(player,'follow-flight');
 const timeline=document.createElement('div');timeline.className='ribbon-timeline';move(timeline,['flight-progress','flight-time']);document.querySelector('.playback').prepend(timeline);
 const fleet=group('fleet','任务编排与共同回放','ribbon-fleet');fleet.append($('fleet-controls'));
 const edit=group('edit','场景工具','ribbon-buttons');move(edit,['add-building','add-zone']);
 const building=group('edit','选中建筑','ribbon-building');building.innerHTML='<p class="ribbon-empty">点击地图中的建筑，查看或修改属性。</p>';building.append($('inspector'));
 const airspace=group('edit','禁飞区高度','ribbon-airspace');airspace.append($('zone-editor'));$('zone-editor').hidden=false;
 const restore=group('edit','恢复','ribbon-buttons');move(restore,['restore-map']);restore.insertAdjacentHTML('beforeend','<small>恢复原始地图，并清除当前任务。</small>');
 const camera=group('view','视角','ribbon-buttons');move(camera,['oblique','top','reset','zoom-in','zoom-out']);
 const appearance=group('view','建筑与图层','ribbon-appearance');appearance.append(document.querySelector('.display-content'));$('display-menu').hidden=true;
 const range=group('view','地图范围','ribbon-range');field(range,'range');range.insertAdjacentHTML('beforeend','<small>切换范围会清除当前实验编辑与任务。</small>');
 const layout=group('view','布局','ribbon-layout-options');layout.id='ribbon-layout-options';layout.insertAdjacentHTML('beforeend','<small>拖动地图底边可调整高度。</small>');
 const performance=group('test','性能测试','ribbon-performance');const tests=document.querySelector('.performance-panel');tests.open=true;performance.append(tests);
 const exports=group('test','导出','ribbon-buttons');move(exports,['export-flight','export-test']);exports.insertAdjacentHTML('beforeend','<small>分别导出航线方案和性能记录。</small>');
 move($('ribbon-context'),['mode-hint','exit-tool']);move($('ribbon-selection'),['point-summary']);
 const metrics=$('flight-metrics');metrics.classList.add('ribbon-metrics');document.querySelector('.playback').prepend(metrics);
 document.querySelector('.workspace-commands').hidden=true;document.querySelector('.workspace>aside').hidden=true;document.querySelector('.edit-hint').hidden=true;document.querySelector('.tools').hidden=true;document.querySelector('.playbar').hidden=true;
 // Keep the non-interactive frame counter on the map.
 const fps=$('fps');fps.classList.add('map-fps');document.querySelector('.map').append(fps);
 $('close-inspector').hidden=true;$('close-zone-editor').hidden=true;
 $('pin-ribbon').onclick=()=>{pinned=!pinned;expanded=true;refresh();save();};$('collapse-ribbon').onclick=()=>{if(expanded){pinned=false;expanded=false;}else expanded=true;refresh();save();};
 document.addEventListener('click',e=>{if(!pinned&&expanded&&!ribbon.contains(e.target)){expanded=false;refresh();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pinned){expanded=false;refresh();}});
 const mutation=new MutationObserver(()=>{building.querySelector('.ribbon-empty').hidden=!$('inspector').hidden;if(!$('inspector').hidden)select('edit');});mutation.observe($('inspector'),{attributes:true,attributeFilter:['hidden']});
 // The benchmark must stay visible when started through its dedicated URL.
 if(new URLSearchParams(location.search).get('benchmark')==='1'){active='test';expanded=true;pinned=true;}
 refresh();
 return {select};
}

