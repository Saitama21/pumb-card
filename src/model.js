/** Deterministic axial CAD model. Z=0 is the left face; all X values are DIAMETERS in mm. */
export const MODEL_VERSION=1;
export const MAX_FEATURES=80;
const EPS=1e-7;
const positive=x=>Number.isFinite(x)&&x>0&&x<=10000;
const nonnegative=x=>Number.isFinite(x)&&x>=0&&x<=10000;
export const round6=x=>Math.round(x*1e6)/1e6;
export const totalLength=m=>round6(m.steps.reduce((a,s)=>a+s.length,0));
/** Resize the total Z span by changing only the terminal axial step.
 * Keep all preceding step dimensions and feature coordinates; reject any
 * resulting geometric conflict instead of silently moving machining features. */
export function resizeTotalLength(model,length){
 if(!positive(length)||length<0.001)throw Error('Общая длина должна быть от 0,001 до 10 000 мм');
 if(!Array.isArray(model?.steps)||!model.steps.length)throw Error('Сначала создай ступень');
 const previous=round6(model.steps.slice(0,-1).reduce((sum,step)=>sum+step.length,0));
 const last=round6(length-previous);
 if(last<0.001)throw Error('Общая длина меньше суммы предыдущих ступеней ('+previous+' мм). Измени размеры ступеней.');
 const steps=model.steps.map((step,i)=>i===model.steps.length-1?{...step,length:last}:step);
 const resized={...model,steps};
 validateModel(resized);
 return resized;
}
export const newId=()=>globalThis.crypto?.randomUUID?.()??('f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
export const exampleModel=()=>({
 version:MODEL_VERSION,name:'Втулка Ø38',bore:24,
 steps:[{id:'s1',type:'cylinder',d:38,length:10},{id:'s2',type:'cylinder',d:30,length:12},{id:'s3',type:'cylinder',d:26,length:4},{id:'s4',type:'cylinder',d:34,length:11}],
 grooves:[],innerGrooves:[],innerSections:[]
});
const innerSections=m=>m.innerSections??[];
const boundaries=m=>{
 const z=[0,totalLength(m)];let acc=0;
 for(const step of m.steps){acc+=step.length;z.push(round6(acc))}
 for(const g of [...m.grooves,...m.innerGrooves])z.push(round6(g.z),round6(g.z+g.width));
 for(const s of innerSections(m))z.push(round6(s.z),round6(s.z+s.length));
 return [...new Set(z)].sort((a,b)=>a-b);
};
function inInterval(z,start,end,side){
 if(side===-1)return z>start+EPS&&z<=end+EPS;
 if(side===1)return z>=start-EPS&&z<end-EPS;
 return z>start+EPS&&z<end-EPS;
}
function rawOutsideAt(m,z,side=0){
 let acc=0;
 for(const s of m.steps){
  const end=acc+s.length;
  if(z<end-EPS||(Math.abs(z-end)<=EPS&&side<=0)){
   const t=Math.max(0,Math.min(1,(z-acc)/s.length));
   return s.type==='taper'?s.d+(s.dEnd-s.d)*t:s.d;
  }
  acc=end;
 }
 const last=m.steps.at(-1);
 return last.type==='taper'?last.dEnd:last.d;
}
export function outsideAt(m,z,side=0){
 let d=rawOutsideAt(m,z,side);
 for(const g of m.grooves)if(inInterval(z,g.z,g.z+g.width,side))d=Math.min(d,g.d);
 return d/2;
}
export function insideAt(m,z,side=0){
 let d=m.bore;
 for(const s of innerSections(m)){
  if(!inInterval(z,s.z,s.z+s.length,side))continue;
  const t=Math.max(0,Math.min(1,(z-s.z)/s.length));
  d=Math.max(d,s.type==='taper'?s.d+(s.dEnd-s.d)*t:s.d);
 }
 for(const g of m.innerGrooves)if(inInterval(z,g.z,g.z+g.width,side))d=Math.max(d,g.d);
 return d/2;
}
function validateAxialFeatures(m,L){
 const sections=innerSections(m);
 if(!Array.isArray(sections)||sections.length>MAX_FEATURES)throw Error('Слишком много внутренних участков');
 for(const s of sections){
  if(!s||!['cylinder','taper'].includes(s.type)||!nonnegative(s.z)||!positive(s.length)||s.length<0.001||s.z+s.length>L+EPS)throw Error('Внутренний участок выходит за длину детали');
  if(!positive(s.d)||(s.type==='taper'&&!positive(s.dEnd)))throw Error('Некорректный диаметр внутреннего участка');
  if(Math.min(s.d,s.type==='taper'?s.dEnd:s.d)<=m.bore+EPS)throw Error('Внутренний участок должен быть больше базового отверстия');
 }
 const sorted=[...sections].sort((a,b)=>a.z-b.z);
 for(let i=1;i<sorted.length;i++){
  if(sorted[i].z<sorted[i-1].z+sorted[i-1].length-EPS)throw Error('Внутренние участки перекрываются по Z');
 }
 if(m.bore===0&&sections.length){
  // Each connected interior region must meet at least one end face; isolated voids cannot be revolved from this profile.
  let start=sorted[0].z,end=sorted[0].z+sorted[0].length;
  const checkOpen=()=>{if(start>EPS&&end<L-EPS)throw Error('Глухое отверстие должно выходить на левый или правый торец')};
  for(let i=1;i<sorted.length;i++){
   const section=sorted[i];
   if(section.z>end+EPS){checkOpen();start=section.z;end=section.z+section.length}
   else end=section.z+section.length;
  }
  checkOpen();
 }

}
export function validateModel(m){
 if(!m||m.version!==MODEL_VERSION||typeof m.name!=='string'||!Array.isArray(m.steps)||!m.steps.length||m.steps.length>MAX_FEATURES)throw Error('Добавь хотя бы одну ступень, максимум 80');
 if(!nonnegative(m.bore))throw Error('Диаметр отверстия должен быть неотрицательным');
 let L=0,minD=Infinity;
 for(const step of m.steps){
  if(!step||!['cylinder','taper'].includes(step.type)||!positive(step.length)||step.length<0.001)throw Error('Неверная длина ступени');
  const ds=step.type==='taper'?[step.d,step.dEnd]:[step.d];
  if(!ds.every(positive))throw Error('Диаметр должен быть больше нуля');
  minD=Math.min(minD,...ds);L+=step.length;
 }
 if(L>10000)throw Error('Длина детали превышает 10 000 мм');
 if(m.bore>=minD)throw Error('Сквозное отверстие пересекает наружный контур');
 for(const [list,inner] of [[m.grooves,false],[m.innerGrooves,true]]){
  if(!Array.isArray(list)||list.length>MAX_FEATURES)throw Error('Слишком много канавок');
  for(const g of list){
   if(!g||!nonnegative(g.z)||!positive(g.width)||g.width<0.001||!positive(g.d)||g.z+g.width>L+EPS)throw Error('Канавка выходит за длину детали');
   if(!inner&&g.d<=m.bore)throw Error('Наружная канавка пересекает отверстие');
   if(inner&&g.d<=m.bore)throw Error('Внутренняя канавка должна быть шире отверстия');
   if(inner&&m.bore===0){
    const covering=innerSections(m).some(section=>section.z<=g.z+EPS&&section.z+section.length>=g.z+g.width-EPS);
    if(!covering)throw Error('Внутренняя канавка должна располагаться внутри существующей расточки');
   }
  }
 }
 validateAxialFeatures(m,L);
 const bounds=boundaries(m);
 const samples=[];
 for(let i=0;i<bounds.length;i++){
  const z=bounds[i];samples.push([z,-1],[z,1]);
  if(i<bounds.length-1)samples.push([(z+bounds[i+1])/2,0]);
 }
 for(const [z,side] of samples){
  const outer=outsideAt(m,z,side),inside=insideAt(m,z,side);
  if(inside>=outer-1e-7)throw Error('Отверстие, ступень или канавка пересекает стенку около Z='+fmtZ(z));
 }
 return m;
}
const fmtZ=z=>round6(z).toFixed(3);
const append=(arr,p)=>{if(!arr.length||Math.abs(arr.at(-1)[0]-p[0])>EPS||Math.abs(arr.at(-1)[1]-p[1])>EPS)arr.push(p)};
export function modelProfile(m){
 validateModel(m);
 const points=boundaries(m),L=points.at(-1),outer=[],inner=[];
 for(let i=0;i<points.length;i++){
  const z=points[i];
  if(i>0){append(outer,[round6(outsideAt(m,z,-1)),z]);append(inner,[round6(insideAt(m,z,-1)),z])}
  if(i<points.length-1){append(outer,[round6(outsideAt(m,z,1)),z]);append(inner,[round6(insideAt(m,z,1)),z])}
 }
 const poly=[...outer];
 if(inner.some(([r])=>r>EPS)){for(const p of [...inner].reverse())append(poly,p)}
 else{append(poly,[0,L]);append(poly,[0,0])}
 const result=[];for(const p of poly)append(result,p);
 if(result.length<3)throw Error('Не удалось построить замкнутый профиль');
 return {outer,inner:inner.some(([r])=>r>EPS)?inner:[],polygon:result,length:L,maxD:Math.max(...outer.map(p=>p[0]))*2};
}
export function sanitizeModel(raw){
 if(!raw||typeof raw!=='object')throw Error('Некорректный проект');
 const parseStep=(s,withZ=false)=>({
  id:String(s.id??newId()).slice(0,90),type:s.type,
  ...(withZ?{z:Number(s.z)}:{}),d:Number(s.d),
  ...(s.type==='taper'?{dEnd:Number(s.dEnd)}:{}),
  length:Number(s.length)
 });
 const parseGroove=g=>({id:String(g.id??newId()).slice(0,90),z:Number(g.z),width:Number(g.width),d:Number(g.d)});
 const model={version:MODEL_VERSION,name:String(raw.name??'Деталь').slice(0,70),bore:Number(raw.bore),
  steps:Array.isArray(raw.steps)?raw.steps.map(s=>parseStep(s)):[],
  grooves:Array.isArray(raw.grooves)?raw.grooves.map(parseGroove):[],
  innerGrooves:Array.isArray(raw.innerGrooves)?raw.innerGrooves.map(parseGroove):[],
  innerSections:Array.isArray(raw.innerSections)?raw.innerSections.map(s=>parseStep(s,true)):[]
 };
 validateModel(model);return model;
}
