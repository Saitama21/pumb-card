/** Dimensioned axial blueprint. Coordinates are exact model millimetres, not machine G54. */
import {totalLength} from './model.js';
export function toDisplayZ(z,span,length,origin='left'){
 return origin==='right'?round(length-z-span):round(z);
}
export function fromDisplayZ(z,span,length,origin='left'){
 return origin==='right'?round(length-z-span):round(z);
}
const round=n=>Math.round(n*1e6)/1e6;
export function featureBounds(model,kind,index){
 const L=totalLength(model);
 if(kind==='steps'){
  if(index<0||index>=model.steps.length)return null;
  const z0=model.steps.slice(0,index).reduce((s,x)=>s+x.length,0);
  const s=model.steps[index];
  return {kind,index,z0:round(z0),z1:round(z0+s.length),d:s.d,dEnd:s.type==='taper'?s.dEnd:null,title:s.type==='taper'?'Наружный конус':'Наружная ступень'};
 }
 if(kind==='innerSections'){
  const s=model.innerSections?.[index];if(!s)return null;
  return {kind,index,z0:s.z,z1:round(s.z+s.length),d:s.d,dEnd:s.type==='taper'?s.dEnd:null,title:s.type==='taper'?'Внутренний конус':'Внутренняя ступень'};
 }
 const isOuter=kind==='grooves',items=model[kind];
 if((!isOuter&&kind!=='innerGrooves')||!items?.[index])return null;
 const g=items[index];
 return {kind,index,z0:g.z,z1:round(g.z+g.width),d:g.d,dEnd:null,title:isOuter?'Канавка OD':'Канавка ID'};
}
export function selectionDetails(model,selection,origin='left'){
 if(!selection)return null;
 const f=featureBounds(model,selection.kind,selection.index);
 if(!f)return null;
 const L=totalLength(model),start=toDisplayZ(f.z0,f.z1-f.z0,L,origin),end=round(start+f.z1-f.z0);
 const d=round(f.d).toFixed(3).replace('.',',');
 return {...f,displayStart:start,displayEnd:end,label:'Ø'+d+(f.dEnd!==null?'→Ø'+round(f.dEnd).toFixed(3).replace('.',','):'')+' · Z'+format(start)+'–'+format(end)};
}
export const format=n=>round(n).toFixed(2).replace('.',',');
export function selectAt(model,physicalZ,preferInner=false){
 const L=totalLength(model);
 const z=Math.min(L,Math.max(0,physicalZ));
 const hits=[];
 for(const kind of ['innerSections','innerGrooves','grooves']){
  for(let i=0;i<(model[kind]||[]).length;i++){
   const f=featureBounds(model,kind,i);
   if(z>=f.z0-1e-7&&z<=f.z1+1e-7)hits.push({kind,index:i});
  }
 }
 const priority=preferInner?['innerSections','innerGrooves','grooves']:['grooves'];
 for(const kind of priority){const chosen=hits.find(h=>h.kind===kind);if(chosen)return chosen}
 let start=0;
 for(let i=0;i<model.steps.length;i++){
  const end=start+model.steps[i].length;
  if(z<=end+1e-7)return {kind:'steps',index:i};
  start=end;
 }
 return {kind:'steps',index:model.steps.length-1};
}
const NS='http://www.w3.org/2000/svg';
function node(parent,tag,attrs={},content){
 const e=document.createElementNS(NS,tag);
 for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));
 if(content!==undefined)e.textContent=content;
 parent.append(e);return e;
}
export function drawLiveBlueprint(svg,model,profile,selection=null,origin='left',onSelect){
 const W=480,H=240,C=115,L=profile.length,D=profile.maxD;
 const scale=Math.min(395/Math.max(L,.001),156/Math.max(D,.001));
 const begin=(W-L*scale)/2;
 const x=z=>begin+z*scale,y=r=>C-r*scale;
 const shape=points=>points.map(([r,z],i)=>(i?'L':'M')+x(z).toFixed(3)+' '+y(r).toFixed(3)).join(' ')+' Z';
 const upper=shape(profile.polygon),lower=shape(profile.polygon.map(([r,z])=>[-r,z]));
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 480 240');
 const defs=node(svg,'defs');const mask=node(defs,'clipPath',{id:'blueprint-part'});
 node(mask,'path',{d:upper});node(mask,'path',{d:lower});
 for(let gx=35;gx<W;gx+=28)node(svg,'path',{d:'M'+gx+' 10V210',stroke:'#4281a0','stroke-opacity':'.13'});
 for(let gy=25;gy<215;gy+=25)node(svg,'path',{d:'M24 '+gy+'H456',stroke:'#4281a0','stroke-opacity':'.13'});
 node(svg,'path',{d:upper,fill:'#164f774c',stroke:'#74ceff','stroke-width':2.25,'stroke-linejoin':'round'});
 node(svg,'path',{d:lower,fill:'#164f774c',stroke:'#74ceff','stroke-width':2.25,'stroke-linejoin':'round'});
 node(svg,'path',{d:'M18 '+C+' H462',stroke:'#b1cee0','stroke-width':1,'stroke-dasharray':'7 6','stroke-opacity':'.7'});
 const focus=selectionDetails(model,selection,origin);
 if(focus){
  const x0=x(focus.z0),x1=x(focus.z1);
  node(svg,'rect',{x:x0,y:0,width:Math.max(1,x1-x0),height:H,fill:'#57e6c7','fill-opacity':'.34','clip-path':'url(#blueprint-part)'});
  for(const px of [x0,x1]){
   node(svg,'path',{d:'M'+px+' 34V200',stroke:'#6ff6cb','stroke-width':1.1,'stroke-dasharray':'4 4','stroke-opacity':'.8'});
   node(svg,'path',{d:'M'+(px-3)+' 34H'+(px+3),stroke:'#73ffcb','stroke-width':1.2});
  }
  node(svg,'path',{d:'M'+x0+' 36H'+x1,stroke:'#7af9d0','stroke-width':1.5});
  node(svg,'text',{x:Math.max(85,Math.min(395,(x0+x1)/2)),y:25,'text-anchor':'middle',fill:'#7bf9d5','font-size':14,'font-weight':800},'L '+format(focus.z1-focus.z0)+' мм');
  node(svg,'text',{x:240,y:218,'text-anchor':'middle',fill:'#7bf9d5','font-size':12,'font-weight':800},
   focus.title+' · '+focus.label);
 }else{
  node(svg,'text',{x:240,y:217,'text-anchor':'middle',fill:'#7bd4fc','font-size':12,'font-weight':750},
   'Ø '+format(D)+' мм   ·   L '+format(L)+' мм');
 }
 const ticks=[{z:0,label:'Z'+(origin==='left'?'0':format(L))},{z:L,label:'Z'+(origin==='right'?'0':format(L))}];
 for(const {z,label} of ticks){
  node(svg,'path',{d:'M'+x(z)+' 178V190',stroke:'#93b6d1','stroke-width':1});
  node(svg,'text',{x:x(z),y:202,'text-anchor':z===0?'start':'end',fill:'#b0c6d6','font-size':11},label);
 }
 // The svg handles touch and pointer input; all location-to-model mappings are physical.
 if(typeof onSelect==='function'){
  node(svg,'rect',{x:begin,y:45,width:Math.max(1,L*scale),height:139,fill:'transparent',style:'cursor:crosshair'}).addEventListener('click',event=>{
   const rect=svg.getBoundingClientRect();const ratio=(event.clientX-rect.left)/rect.width;
   const yRatio=(event.clientY-rect.top)/rect.height;
   const z=(ratio*W-begin)/scale;
   const nearAxis=Math.abs(yRatio*H-C)<D*scale*.3;
   onSelect(selectAt(model,z,nearAxis));
  });
 }
 return {scale,focus,origin};
}
