/** Pure axial profile modeller. Dimensions in mm, X is radius, Z runs from 0 to total length. */
export const MODEL_VERSION=1;
export const MAX_FEATURES=80;
export const exampleModel=()=>({
 version:MODEL_VERSION,name:'Втулка Ø38',bore:24,
 steps:[{id:'s1',type:'cylinder',d:38,length:10},{id:'s2',type:'cylinder',d:30,length:12},{id:'s3',type:'cylinder',d:26,length:4},{id:'s4',type:'cylinder',d:34,length:11}],
 grooves:[],innerGrooves:[]
});
const positive=(x)=>Number.isFinite(x)&&x>0&&x<=10000;
const nonnegative=(x)=>Number.isFinite(x)&&x>=0&&x<=10000;
export const round6=x=>Math.round(x*1e6)/1e6;
export const totalLength=m=>round6(m.steps.reduce((a,s)=>a+s.length,0));
export const newId=()=>globalThis.crypto?.randomUUID?.()??('f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
export function validateModel(m){
 if(!m||m.version!==MODEL_VERSION||typeof m.name!=='string'||!Array.isArray(m.steps)||!m.steps.length||m.steps.length>MAX_FEATURES)throw Error('Добавь хотя бы одну ступень, максимум 80');
 if(!nonnegative(m.bore))throw Error('Диаметр отверстия должен быть неотрицательным');
 let z=0,minD=Infinity;
 for(const step of m.steps){
  if(!step||!['cylinder','taper'].includes(step.type)||!positive(step.length))throw Error('Неверная длина ступени');
  const ds=step.type==='taper'?[step.d,step.dEnd]:[step.d];
  if(!ds.every(positive))throw Error('Диаметр должен быть больше нуля');
  minD=Math.min(minD,...ds);z+=step.length;
 }
 if(z>10000)throw Error('Длина детали превышает 10 000 мм');
 if(m.bore>=minD)throw Error('Сквозное отверстие пересекает наружный контур');
 for(const [list,inner] of [[m.grooves,false],[m.innerGrooves,true]]){
  if(!Array.isArray(list)||list.length>MAX_FEATURES)throw Error('Слишком много канавок');
  for(const g of list){
   if(!g||!nonnegative(g.z)||!positive(g.width)||g.width<0.001||!positive(g.d)||g.z+g.width>z+1e-8)throw Error('Канавка выходит за длину детали');
   if(!inner && g.d<=m.bore)throw Error('Наружная канавка пересекает отверстие');
   if(inner&&g.d<=m.bore)throw Error('Внутренняя канавка должна быть шире отверстия');
  }
 }
 // Local wall thickness at every transition is evaluated below.
 const bounds=buildBoundaries(m);
 const points=[...bounds,...bounds.slice(0,-1).map((v,i)=>(v+bounds[i+1])/2)];
 for(const zi of points){
  const outer=outsideAt(m,zi),inside=insideAt(m,zi);
  if(inside>=outer-1e-7)throw Error('Канавки пересекаются или стенка стала нулевой около Z='+zi.toFixed(2));
 }
 return m;
}
const EPS=1e-7;
function rawOutsideAt(m,z){
 let acc=0;
 for(const s of m.steps){
  const next=acc+s.length;
  if(z<=next+EPS){
   const t=Math.max(0,Math.min(1,(z-acc)/s.length));
   return s.type==='taper'?s.d+(s.dEnd-s.d)*t:s.d;
  }
  acc=next;
 }
 return m.steps.at(-1).type==='taper'?m.steps.at(-1).dEnd:m.steps.at(-1).d;
}
export function outsideAt(m,z){
 let d=rawOutsideAt(m,z);
 for(const g of m.grooves)if(z>g.z+EPS&&z<g.z+g.width-EPS)d=Math.min(d,g.d);
 return d/2;
}
export function insideAt(m,z){
 let d=m.bore;
 for(const g of m.innerGrooves)if(z>g.z+EPS&&z<g.z+g.width-EPS)d=Math.max(d,g.d);
 return d/2;
}
function buildBoundaries(m){
 let z=0;const items=[0,totalLength(m)];
 for(const step of m.steps){z+=step.length;items.push(round6(z))}
 for(const g of [...m.grooves,...m.innerGrooves])items.push(round6(g.z),round6(g.z+g.width));
 return [...new Set(items)].sort((a,b)=>a-b);
}
const append=(a,p)=>{if(!a.length||Math.abs(a.at(-1)[0]-p[0])>EPS||Math.abs(a.at(-1)[1]-p[1])>EPS)a.push(p);};
export function modelProfile(model){
 validateModel(model);
 const bounds=buildBoundaries(model),L=bounds.at(-1),outer=[],inner=[];
 const nudge=(v,sgn)=>Math.max(0,Math.min(L,v+sgn*1e-5));
 for(let i=0;i<bounds.length;i++){
  const z=bounds[i];
  if(i>0){
   append(outer,[round6(outsideAt(model,nudge(z,-1))),z]);
   append(inner,[round6(insideAt(model,nudge(z,-1))),z]);
  }
  if(i<bounds.length-1){
   append(outer,[round6(outsideAt(model,nudge(z,1))),z]);
   append(inner,[round6(insideAt(model,nudge(z,1))),z]);
  }
 }
 const full=[...outer];
 if(model.bore===0){
  append(full,[0,L]);append(full,[0,0]);
 }else{
  for(const p of [...inner].reverse())append(full,p);
 }
 const cleaned=[];
 for(const p of full)append(cleaned,p);
 if(cleaned.length<3)throw Error('Не удалось построить замкнутый профиль');
 return {outer,inner: model.bore?inner:[],polygon:cleaned,length:L,maxD:Math.max(...outer.map(p=>p[0]))*2};
}
export function sanitizeModel(raw){
 if(!raw||typeof raw!=='object')throw Error('Некорректный проект');
 const model={version:MODEL_VERSION,name:String(raw.name??'Деталь').slice(0,70),bore:Number(raw.bore),
  steps:Array.isArray(raw.steps)?raw.steps.map(s=>({id:String(s.id??newId()).slice(0,90),type:s.type,d:Number(s.d),dEnd:Number(s.dEnd??s.d),length:Number(s.length)})):[],
  grooves:Array.isArray(raw.grooves)?raw.grooves.map(g=>({id:String(g.id??newId()).slice(0,90),z:Number(g.z),width:Number(g.width),d:Number(g.d)})):[],
  innerGrooves:Array.isArray(raw.innerGrooves)?raw.innerGrooves.map(g=>({id:String(g.id??newId()).slice(0,90),z:Number(g.z),width:Number(g.width),d:Number(g.d)})):[]
 };
 validateModel(model);return model;
}
