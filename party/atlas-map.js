import { REGIONS, regionCenter } from '../src/world/regions';
import { CAKE_SPOT } from '../shared/party-layout.js';

/** One geographical map for the existing lands, elevated causeway and palace. */
export function appendAtlas(host, game, travel) {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','-1850 -3300 3700 5300');svg.setAttribute('class','world-atlas');
  svg.setAttribute('role','img');svg.setAttribute('aria-label','The twenty Golden Thread lands with the Great Palace to the north. Select a place to travel.');
  const add=(tag,attrs,label)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(label)n.textContent=label;svg.append(n);return n;};
  add('path',{d:'M 0 190 L 0 -2450 L -86 -2885',stroke:'#edcd92','stroke-width':22,fill:'none','stroke-dasharray':'28 18'});
  const stops=[{name:'The Great Palace',x:CAKE_SPOT.x,z:CAKE_SPOT.z,y:CAKE_SPOT.y,palace:true},...REGIONS.map(r=>({...regionCenter(r),name:r.name,land:r}))];
  for(const d of stops){
    if(d.land)add('rect',{x:d.x-320,y:d.z-320,width:640,height:640,rx:80,fill:d.land.ground+'44',stroke:d.land.ground,'stroke-width':5});
    const b=add('g',{role:'button',tabindex:0,'aria-label':`Travel to ${d.name}`,class:'atlas-stop'});
    const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',d.x);circle.setAttribute('cy',d.z);circle.setAttribute('r',d.palace?90:35);circle.setAttribute('fill',d.palace?'#edcd92':'#fae5cc');b.append(circle);
    const label=document.createElementNS(ns,'text');label.setAttribute('x',d.x);label.setAttribute('y',d.z+(d.palace?190:110));label.setAttribute('text-anchor','middle');label.setAttribute('fill','#fff3e0');label.setAttribute('font-size',d.palace?'100':'65');label.textContent=d.name;b.append(label);
    const go=()=>travel({x:d.x+(d.land?12:0),z:d.z+(d.land?70:10),...(d.y===undefined?{}:{y:d.y}),name:d.name});
    b.addEventListener('click',go);b.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();go();}});
  }
  add('circle',{cx:game.pos.x,cy:game.pos.z,r:45,fill:'#f8a8cc',stroke:'#ffffff','stroke-width':10});
  add('text',{x:-1700,y:-3040,fill:'#c4b9d2','font-size':75},'N ↑');
  host.append(svg);
}
