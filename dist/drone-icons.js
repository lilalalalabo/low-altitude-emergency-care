(function(root){'use strict';
const ns='http://www.w3.org/2000/svg',imageUrl=new URL('drone-silhouette.png?v=20261114',document.currentScript.src).href;
const image=new Image();image.onload=()=>root.dispatchEvent(new Event('drone-icon-ready'));image.src=imageUrl;
function svg(parent,{x=0,y=0,size=24,color='#195e4c',label=''}={}){
 const el=(tag,attrs,p)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));p.appendChild(e);return e};
 const g=el('g',{transform:`translate(${x} ${y}) scale(${size/48})`,class:'drone-icon','aria-hidden':'true'},parent);
 const viewport=el('svg',{x:-24,y:-24,width:48,height:48,viewBox:'225 226 802 806',overflow:'hidden'},g);
 el('image',{x:0,y:0,width:1254,height:1254,href:imageUrl},viewport);
 if(label){const text=el('text',{x:26,y:18,fill:color,stroke:'white','stroke-width':4,'paint-order':'stroke','font-size':14,'font-weight':800},g);text.textContent=label}return g;
}
function canvas(ctx,x,y,{size=30,color='#195e4c',label='',opacity=1}={}){
 ctx.save();ctx.translate(x,y);ctx.scale(size/48,size/48);ctx.globalAlpha=opacity;
 if(image.complete&&image.naturalWidth)ctx.drawImage(image,225,226,802,806,-24,-24,48,48);
 if(label){ctx.font='bold 14px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='white';ctx.strokeText(label,26,18);ctx.fillStyle=color;ctx.fillText(label,26,18)}ctx.restore();
}
root.DroneIcons={svg,canvas};
})(typeof globalThis!=='undefined'?globalThis:this);

