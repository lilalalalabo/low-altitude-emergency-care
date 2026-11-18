(()=>{
 const host=document.getElementById('workbench'),intro=host?.querySelector('.page-intro');if(!intro)return;
 const nav=document.createElement('nav');nav.className='workbench-modules';nav.setAttribute('aria-label','工作台模块');
 nav.innerHTML='<a class="module-current" href="#workbench" aria-current="page"><span>01</span><div><strong></strong><small></small></div></a><a class="module-3d" href="./planner3d/"><span>02</span><div><strong></strong><small></small></div><b aria-hidden="true">↗</b></a>';
 intro.after(nav);
 function render(){const en=document.documentElement.lang.startsWith('en'),links=nav.querySelectorAll('a');links[0].querySelector('strong').textContent=en?'Grid flight simulation':'网格航线规划仿真';links[0].querySelector('small').textContent=en?'Custom height maps · mission scheduling':'自定义高程地图 · 任务调度';links[1].querySelector('strong').textContent=en?'3D map route planning':'3D 地图路径规划';links[1].querySelector('small').textContent=en?'Tianjin buildings · 3D avoidance · fleet replay':'天津城市建筑 · 三维避障 · 多机协同回放';}
 document.getElementById('language')?.addEventListener('click',render);render();
})();
