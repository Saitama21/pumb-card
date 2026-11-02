/** XZFORM: pure coordinate-to-solid geometry; X denotes diameter, Z is axial position. */
export const EPS=1e-7;
export const newId=()=>globalThis.crypto?.randomUUID?.()||'n'+Math.random().toString(36).slice(2,10);
export function examplePart(){return {version:2,name:'ДКК-007 · эскиз',material:'AISI 304',points:[
{id:'p1',x:18,z:0},{id:'p2',x:18,z:-37},{id:'p3',x:31,z:-37},{id:'p4',x:31,z:-58}
],holes:[{id:'h1',d:12.2,z0:-58,z1:0}],origin:'right'};}
export const round=n=>Math.round(n*1e6)/1e6;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function normalizePart(raw){
 if(!raw||!Array.isArray(raw.points)||!Array.isArray(raw.holes))throw Error('Неверный формат проекта XZFORM');
 return {version:2,name:String(raw.name||'Новая деталь').slice(0,80),material:String(raw.material||'').slice(0,60),origin:'right',
  points:raw.points.map((p,i)=>({id:String(p.id||'p'+i),x:Number(p.x),z:Number(p.z)})),
  holes:raw.holes.map((h,i)=>({id:String(h.id||'h'+i),d:Number(h.d),z0:Number(h.z0),z1:Number(h.z1)}))};
}
const nearly=(a,b)=>Math.abs(a-b)<EPS;
function push(arr,p){
 if(!arr.length||!nearly(arr.at(-1)[0],p[0])||!nearly(arr.at(-1)[1],p[1]))arr.push(p);
}
export function buildPart(input){
 const part=normalizePart(input),p=part.points,h=part.holes;
 if(p.length<2||p.length>250)throw Error('Укажи от 2 до 250 точек наружного контура');
 if(h.length>80)throw Error('Максимум 80 участков отверстий');
 for(const n of p)if(!finite(n.x)||n.x<=0||n.x>10000||!finite(n.z)||Math.abs(n.z)>10000)throw Error('Координаты X должны быть положительными, Z — конечными (мм)');
 let direction=0;
 for(let i=1;i<p.length;i++){
  const dz=p[i].z-p[i-1].z,dx=p[i].x-p[i-1].x;
  if(nearly(dx,0)&&nearly(dz,0))throw Error('Совпадающие соседние точки №'+i+' и №'+(i+1));
  if(!nearly(dz,0)){if(direction&&Math.sign(dz)!==direction)throw Error('Контур должен идти последовательно вдоль оси Z, без возврата назад');direction=Math.sign(dz);}
 }
 if(!direction)throw Error('Нужны минимум две разные координаты Z');
 const ordered=direction<0?[...p].reverse():[...p];
 const zMin=ordered[0].z,zMax=ordered.at(-1).z,L=round(zMax-zMin);
 if(L<EPS||L>10000)throw Error('Недопустимая общая длина');
 for(const b of h){
  if(!finite(b.d)||b.d<=0||b.d>10000||!finite(b.z0)||!finite(b.z1)||b.z1<=b.z0+EPS)throw Error('Укажи диаметр и интервал отверстия Z нач < Z кон');
  if(b.z0<zMin-EPS||b.z1>zMax+EPS)throw Error('Отверстие выходит за торцы детали');
 }
 if(h.length){
  const intervals=[...h].sort((a,b)=>a.z0-b.z0);
  let end=intervals[0].z1;
  for(let i=1;i<intervals.length;i++){
   if(intervals[i].z0>end+EPS)throw Error('Раздельные глухие отверстия пока не поддерживаются: оставь один связанный внутренний канал');
   end=Math.max(end,intervals[i].z1);
  }
  if(intervals[0].z0>zMin+EPS&&end<zMax-EPS)throw Error('Глухой внутренний канал должен выходить хотя бы на один торец');
 }
 const local=z=>round(z-zMin);
 const outer=[];for(const n of ordered)push(outer,[round(n.x/2),local(n.z)]);
 function boreAt(z,side){
  let r=0;
  for(const b of h)if((side>0?z>=b.z0-EPS&&z<b.z1-EPS:z>b.z0+EPS&&z<=b.z1+EPS))r=Math.max(r,b.d/2);
  return r;
 }
 // At a shoulder the smaller neighboring outer radius is the conservative wall check.
 const outsideAt=z=>{
  const candidates=[];
  for(let i=1;i<ordered.length;i++){
   const a=ordered[i-1],b=ordered[i],lo=a.z,hi=b.z;
   if(z>=lo-EPS&&z<=hi+EPS){
    if(nearly(hi,lo)){candidates.push(a.x/2,b.x/2);}
    else candidates.push((a.x+(b.x-a.x)*(z-lo)/(hi-lo))/2);
   }
  }
  return Math.min(...candidates);
 };
 const critical=[zMin,zMax,...ordered.map(n=>n.z),...h.flatMap(b=>[b.z0,b.z1])].sort((a,b)=>a-b);
 const stops=[...new Set(critical.map(round))];
 for(let i=0;i<stops.length;i++){
  const z=stops[i],r=Math.max(boreAt(z,-1),boreAt(z,1));
  if(r>EPS&&r>=outsideAt(z)-EPS)throw Error('Отверстие пересекает наружный контур около Z='+z);
  if(i<stops.length-1){
   const middle=(z+stops[i+1])/2;
   if(boreAt(middle,1)>=outsideAt(middle)-EPS)throw Error('Недостаточная стенка около Z='+round(middle));
  }
 }
 const inner=[];
 for(let i=0;i<stops.length;i++){
  const z=stops[i];
  if(i>0)push(inner,[round(boreAt(z,-1)),local(z)]);
  if(i<stops.length-1)push(inner,[round(boreAt(z,1)),local(z)]);
 }
 const polygon=[...outer];
 for(const q of [...inner].reverse())push(polygon,q);
 if(polygon.length<3)throw Error('Невозможно замкнуть сечение детали');
 const profile={outer,inner:inner.some(n=>n[0]>EPS)?inner:[],polygon,length:L,maxD:Math.max(...p.map(n=>n.x))};
 return {part,profile,zMin,zMax,length:L,maxD:profile.maxD};
}
/** Non-destructive migration of earlier step-based projects without unsupported extra features. */
export function fromLegacy(raw){
 if(!raw||!Array.isArray(raw.steps)||!raw.steps.length)throw Error('Неверный старый проект');
 if((raw.grooves?.length||0)||(raw.innerGrooves?.length||0)||(raw.innerSections?.length||0))throw Error('В проекте есть дополнительные операции. Сохранённый оригинал не изменён: для переноса необходима полная миграция');
 const L=raw.steps.reduce((s,n)=>s+Number(n.length),0);
 let z=0;const points=[],reverse=[...raw.steps].reverse();
 for(let i=0;i<reverse.length;i++){
  const s=reverse[i],from=s.type==='taper'?Number(s.dEnd):Number(s.d),to=Number(s.d);
  if(i===0)points.push({id:newId(),x:from,z:0});
  else if(!nearly(points.at(-1).x,from))points.push({id:newId(),x:from,z:round(-z)});
  z+=Number(s.length);points.push({id:newId(),x:to,z:round(-z)});
 }
 if(!nearly(z,L))throw Error('Ошибочная длина проекта');
 const bore=Number(raw.bore)||0;
 const res={version:2,name:String(raw.name||'Импортированная деталь'),material:'',origin:'right',points,holes:bore?[{id:newId(),d:bore,z0:round(-L),z1:0}]:[]};
 buildPart(res);return res;
}
