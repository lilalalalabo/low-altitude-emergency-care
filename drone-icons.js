(function(root){'use strict';
const ns='http://www.w3.org/2000/svg';
function svg(parent,{x=0,y=0,size=24,color='#195e4c',label='',relay=false}={}){
 const el=(tag,attrs,p)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));p.appendChild(e);return e};
 const g=el('g',{transform:`translate(${x} ${y}) scale(${size/48})`,class:'drone-icon','aria-hidden':'true'},parent);
 el('circle',{r:22,fill:'white',opacity:'.95'},g);
 el('path',{d:'M-13 -12L13 12 M13 -12L-13 12',stroke:color,'stroke-width':5,'stroke-linecap':'round'},g);
 for(const [cx,cy] of [[-14,-13],[14,-13],[-14,13],[14,13]]){el('circle',{cx,cy,r:6,fill:color,stroke:'#fff','stroke-width':1.5},g);el('circle',{cx,cy,r:2,fill:'#fff',opacity:'.8'},g)}
 el('rect',{x:-8,y:-8,width:16,height:16,rx:4,fill:color,stroke:'#fff','stroke-width':1.5},g);
 if(relay){el('path',{d:'M-5 -15 Q0 -21 5 -15 M-3 -12 Q0 -15 3 -12',fill:'none',stroke:color,'stroke-width':2.5,'stroke-linecap':'round'},g)}else el('path',{d:'M-4 -2H4V5H-4Z M-4 0H4',fill:'#fff',stroke:'#fff','stroke-width':1},g);
 if(label){const text=el('text',{x:25,y:17,fill:color,stroke:'white','stroke-width':4,'paint-order':'stroke','font-size':14,'font-weight':800},g);text.textContent=label}return g;
}
function canvas(ctx,x,y,{size=30,color='#195e4c',label='',relay=false,opacity=1}={}){
 ctx.save();ctx.translate(x,y);ctx.scale(size/48,size/48);ctx.globalAlpha=opacity;
 ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
 ctx.strokeStyle=color;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,-12);ctx.lineTo(13,12);ctx.moveTo(13,-12);ctx.lineTo(-13,12);ctx.stroke();
 for(const [a,b] of [[-14,-13],[14,-13],[-14,13],[14,13]]){ctx.beginPath();ctx.arc(a,b,6,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='white';ctx.stroke();ctx.beginPath();ctx.arc(a,b,2,0,Math.PI*2);ctx.fillStyle='white';ctx.fill()}
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-8,-8,16,16,4);ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='white';ctx.stroke();
 if(relay){ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-5,-15);ctx.quadraticCurveTo(0,-21,5,-15);ctx.moveTo(-3,-12);ctx.quadraticCurveTo(0,-15,3,-12);ctx.stroke()}else{ctx.fillStyle='white';ctx.fillRect(-4,-2,8,7)}
 if(label){ctx.font='bold 14px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='white';ctx.strokeText(label,25,17);ctx.fillStyle=color;ctx.fillText(label,25,17)}ctx.restore();
}
root.DroneIcons={svg,canvas};
})(typeof globalThis!=='undefined'?globalThis:this);

