(()=>{
'use strict';
const host=document.getElementById('workbench'),intro=host?.querySelector('.page-intro'),shell=host?.querySelector('.flight-shell'),foot=host?.querySelector('.flight-foot');
if(!intro||!shell||!foot)return;
// Move the existing controls, retaining their event listeners and mission state.
const mapArea=host.querySelector('.flight-map-area'),timeline=document.createElement('section');timeline.className='map-timeline';
for(const selector of ['.timeline-heading','.flight-play','#flight-phase','.flight-tip']){const node=host.querySelector(selector);if(node)timeline.append(node)}
mapArea.append(timeline);
const oldTitle=intro.querySelector('h1');oldTitle.hidden=true;const chooser=document.createElement('div');chooser.className='mode-chooser';chooser.innerHTML='<label class="mode-select-label" for="simulation-mode"></label><div class="mode-select-row"><select id="simulation-mode"><option value="cargo"></option><option value="passenger"></option><option value="mixed"></option><option value="emergency"></option></select><span class="mode-select-hint"></span></div>';oldTitle.after(chooser);
const coming=document.createElement('section');coming.className='mode-coming';coming.hidden=true;coming.setAttribute('aria-live','polite');coming.innerHTML='<div class="overline">SIMULATION MODE</div><h2></h2><p></p><button type="button"></button>';shell.after(coming);
const select=chooser.querySelector('select'),badge=intro.querySelector('.status'),description=intro.querySelector('p');
const copy={zh:{label:'模拟模式',hint:'模式可选',cargo:'货运多机规划仿真',passenger:'客运多机规划仿真 · 开发中',mixed:'客货混运仿真 · 开发中',emergency:'应急物资配送仿真 · 开发中',cargoDesc:'设置多组任务，观察航线、时空避让与同步飞行；载重等货运约束尚未模拟。',pendingDesc:'该模式正在开发，敬请期待。',cargoBadge:'货运演示',pendingBadge:'开发中',pendingTitle:'该模拟模式正在开发中',pendingText:'功能尚未开放。可切换回货运模式，继续使用已创建的任务。',back:'返回货运模拟'},en:{label:'Simulation mode',hint:'Choose a mode',cargo:'Cargo flight simulation',passenger:'Passenger flight simulation · In development',mixed:'Passenger & cargo simulation · In development',emergency:'Emergency supplies simulation · In development',cargoDesc:'Explore coordinated routes and synchronized flight. Cargo constraints such as payload are not yet modeled.',pendingDesc:'This mode is in development.',cargoBadge:'Cargo demo',pendingBadge:'In development',pendingTitle:'Simulation mode in development',pendingText:'This mode is not available yet. Return to cargo mode to continue with your existing missions.',back:'Return to cargo simulation'}};
function lang(){return document.documentElement.lang.startsWith('en')?'en':'zh'}
function render(){const t=copy[lang()],isCargo=select.value==='cargo';chooser.querySelector('label').textContent=t.label;chooser.querySelector('.mode-select-hint').textContent=t.hint;Array.from(select.options).forEach(o=>o.textContent=t[o.value]);description.textContent=isCargo?t.cargoDesc:t.pendingDesc;badge.textContent=isCargo?t.cargoBadge:t.pendingBadge;shell.hidden=!isCargo;foot.hidden=!isCargo;coming.hidden=isCargo;coming.querySelector('h2').textContent=t.pendingTitle;coming.querySelector('p').textContent=t.pendingText;coming.querySelector('button').textContent=t.back;}
select.addEventListener('change',()=>{const play=document.getElementById('flight-play');if(select.value!=='cargo'&&play&&(play.textContent==='暂停'||play.textContent==='Pause'))play.click();render()});
coming.querySelector('button').addEventListener('click',()=>{select.value='cargo';render();select.focus()});document.getElementById('language').addEventListener('click',render);render();
})();

