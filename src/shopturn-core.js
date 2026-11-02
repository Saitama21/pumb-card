/** ShopTurn-inspired OFFLINE process planner. Deliberately NOT an NC postprocessor. */
import {modelProfile} from './model.js';
export const PLAN_VERSION=1;
export const OP_TYPES={
 facing:{label:'Торцевание',cycle:'Точение / Торец',fields:[['z','Z торца, мм'],['x','Конечный X Ø, мм']]},
 rough:{label:'Снятие припуска',cycle:'CYCLE952 · Черновая',fields:[['ap','Глубина резания, мм'],['ux','Припуск X, мм'],['uz','Припуск Z, мм']]},
 finish:{label:'Чистовой контур',cycle:'CYCLE952 · Чистовая',fields:[['ux','Припуск X, мм'],['uz','Припуск Z, мм']]},
 drill:{label:'Сверление по центру',cycle:'CYCLE82 / CYCLE83',fields:[['x','Диаметр сверла Ø, мм'],['z','Глубина Z, мм']]},
 bore:{label:'Внутренняя расточка',cycle:'Точение / Внутри',fields:[['x','Конечный диаметр Ø, мм'],['z','Конечная координата Z, мм']]},
 groove:{label:'Канавка',cycle:'CYCLE930',fields:[['x','Диаметр дна Ø, мм'],['z','Позиция Z, мм'],['width','Ширина, мм']]},
 thread:{label:'Резьба',cycle:'CYCLE99',fields:[['x','Номинальный диаметр Ø, мм'],['z','Конец Z, мм'],['pitch','Шаг, мм']]},
 cutoff:{label:'Отрезание',cycle:'CYCLE92',fields:[['x','Конечный X2 Ø, мм'],['z','Позиция Z, мм']]}
};
const NUMERIC_HEADER=['xa','xi','za','zi','zb','xra','xri','zra','zri','sc','maxS'];
const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
const round=(x)=>Math.round(x*1e6)/1e6;
const uid=()=>globalThis.crypto?.randomUUID?.()||('op-'+Math.random().toString(36).slice(2));
export function contourFromModel(model){
 const p=modelProfile(model),L=p.length,raw=[...p.outer].reverse().map(([r,z])=>({x:round(r*2),z:round(z-L)}));
 const result=[];
 for(const v of raw){
  if(result.length&&Math.abs(result.at(-1).x-v.x)<1e-6&&Math.abs(result.at(-1).z-v.z)<1e-6)continue;
  result.push({id:uid(),kind:result.length?'line':'start',...v});
 }
 return result;
}
export function defaultOperation(type,plan){
 if(!OP_TYPES[type])throw Error('Неизвестная операция');
 const h=plan.header;
 const defaults={facing:{z:0,x:0},rough:{ap:1.5,ux:0.4,uz:0.2},finish:{ux:0,uz:0},drill:{x:12,z:round(h.zi/2)},bore:{x:Math.max(h.xi,12),z:round(h.zi/2)},groove:{x:round(h.xa-3),z:round(h.zi/2),width:3},thread:{x:20,z:round(h.zi/2),pitch:1.5},cutoff:{x:0,z:round(h.zi)}};
 return {id:uid(),type,tool:'T1',edge:1,feed:type==='finish'?0.08:0.12,speed:800,area:type==='bore'?'ID':'OD',...defaults[type]};
}
export function defaultPlan(model){
 const p=modelProfile(model),h={g54:'G54',xa:round(p.maxD),xi:round(model.bore),za:0,zi:-p.length,zb:-p.length,
 xra:2,xri:0,zra:2,zri:0,sc:2,maxS:2000,xt:null,zt:null,toolChange:'MCS'};
 const plan={version:PLAN_VERSION,header:h,contour:contourFromModel(model),operations:[],modelSignature:JSON.stringify(modelProfile(model).polygon)};
 plan.operations=[defaultOperation('facing',plan),defaultOperation('rough',plan),defaultOperation('finish',plan)];
 return plan;
}
export function validateContour(nodes){
 if(!Array.isArray(nodes)||nodes.length<2||nodes.length>160)throw Error('Контур: требуется от 2 до 160 точек');
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i];if(!n||!finite(n.x)||!finite(n.z)||n.x<0||n.x>10000||Math.abs(n.z)>10000)throw Error('Контур: неверные X/Z в точке '+(i+1));
  if(n.kind!==(i===0?'start':n.kind)||!['start','line','arcCW','arcCCW'].includes(n.kind)||(i>0&&n.kind==='start'))throw Error('Контур: неверный тип элемента');
  if(i>0){
   const prev=nodes[i-1];
   if(Math.hypot((n.x-prev.x)/2,n.z-prev.z)<1e-7)throw Error('Контур: совпадающие точки '+i+' и '+(i+1));
   if(n.kind.startsWith('arc')){
    const chord=Math.hypot((n.x-prev.x)/2,n.z-prev.z);
    if(!finite(n.radius)||n.radius<=0||n.radius<chord/2-1e-7)throw Error('Контур: радиус дуги меньше половины хорды в точке '+(i+1));
   }
  }
 }
 if(nodes[0].kind!=='start')throw Error('Первая точка должна иметь тип «Старт»');
 return nodes;
}
/** Path samples are in physically scaled X(radius)/Z plane, NOT encoded CNC G2/G3. */
export function contourPath(nodes){
 validateContour(nodes);
 const out=[{z:nodes[0].z,r:nodes[0].x/2}];
 for(let i=1;i<nodes.length;i++){
  const s=nodes[i-1],e=nodes[i];
  if(e.kind==='line'){out.push({z:e.z,r:e.x/2});continue}
  const ax=s.z,ay=s.x/2,bx=e.z,by=e.x/2;
  const dx=bx-ax,dy=by-ay,chord=Math.hypot(dx,dy),radius=e.radius;
  const mx=(ax+bx)/2,my=(ay+by)/2,h=Math.sqrt(Math.max(0,radius*radius-chord*chord/4));
  const nx=-dy/chord,ny=dx/chord,sign=e.kind==='arcCCW'?1:-1;
  let chosen=null;
  for(const mult of [1,-1]){
   const cx=mx+nx*h*mult,cy=my+ny*h*mult;
   const a0=Math.atan2(ay-cy,ax-cx),a1=Math.atan2(by-cy,bx-cx);
   const delta=sign>0?((a1-a0+Math.PI*4)%(Math.PI*2)):-((a0-a1+Math.PI*4)%(Math.PI*2));
   if(Math.abs(delta)<=Math.PI+1e-6){chosen={cx,cy,a0,delta};break}
  }
  if(!chosen)throw Error('Не удалось рассчитать дугу');
  const count=Math.max(8,Math.ceil(Math.abs(chosen.delta)/Math.PI*48));
  for(let j=1;j<=count;j++){
   const a=chosen.a0+chosen.delta*j/count;
   out.push({z:round(chosen.cx+radius*Math.cos(a)),r:round(chosen.cy+radius*Math.sin(a))});
  }
 }
 return out;
}
export function validatePlan(plan){
 if(!plan||plan.version!==PLAN_VERSION||!plan.header||!Array.isArray(plan.operations)||plan.operations.length>80)throw Error('Некорректная карта обработки');
 const h=plan.header;
 if(h.g54!=='G54')throw Error('На этой конфигурации используем G54');
 for(const k of NUMERIC_HEADER)if(!finite(h[k])||Math.abs(h[k])>10000)throw Error('Неверное поле заголовка: '+k);
 if(h.xa<=0||h.xi<0||h.xi>=h.xa||h.zi>=h.za||h.zb<h.zi||h.zb>h.za||h.maxS<=0||h.sc<0||h.xra<0||h.zra<0)throw Error('Противоречивые размеры заготовки или отводов');
 if(h.xt!==null&&!finite(h.xt)||h.zt!==null&&!finite(h.zt))throw Error('Некорректная точка смены инструмента');
 if(!['MCS','WCS'].includes(h.toolChange))throw Error('Неверная система смены инструмента');
 validateContour(plan.contour);
 for(const [i,o] of plan.operations.entries()){
  const def=OP_TYPES[o?.type];
  if(!def||typeof o.id!=='string'||typeof o.tool!=='string'||!o.tool.trim()||o.tool.length>60||
   !Number.isInteger(o.edge)||o.edge<1||o.edge>20||!finite(o.feed)||o.feed<=0||o.feed>20||!finite(o.speed)||o.speed<=0||o.speed>20000||
   !['OD','ID'].includes(o.area))throw Error('Операция '+(i+1)+': ошибка инструмента или режимов');
  for(const [key] of def.fields){
   if(!finite(o[key])||Math.abs(o[key])>10000)throw Error('Операция '+(i+1)+': неверное поле '+key);
  }
  for(const key of ['ap','width','pitch'])if(key in o&&o[key]<=0)throw Error('Операция '+(i+1)+': '+key+' должен быть больше нуля');
  if(o.speed>h.maxS)throw Error('Операция '+(i+1)+': S выше ограничения заголовка');
 }
 return plan;
}
export function sanitizePlan(raw){
 const h={...raw?.header},p={version:raw?.version,header:h,modelSignature:String(raw?.modelSignature||''),operations:[],contour:[]};
 for(const k of NUMERIC_HEADER)h[k]=Number(h[k]);
 for(const k of ['xt','zt'])h[k]=h[k]===''||h[k]===null||h[k]===undefined?null:Number(h[k]);
 h.g54=String(h.g54||'');h.toolChange=String(h.toolChange||'');
 p.contour=(raw?.contour||[]).map(n=>({id:String(n.id||uid()),kind:String(n.kind),x:Number(n.x),z:Number(n.z),...(n.kind?.startsWith('arc')?{radius:Number(n.radius)}:{})}));
 p.operations=(raw?.operations||[]).map(o=>{
  const item={id:String(o.id||uid()),type:String(o.type),tool:String(o.tool||''),edge:Number(o.edge),feed:Number(o.feed),speed:Number(o.speed),area:String(o.area)};
  for(const [key] of OP_TYPES[item.type]?.fields||[])item[key]=Number(o[key]);
  return item;
 });
 return validatePlan(p);
}
export function modelMatches(plan,model){return plan.modelSignature===JSON.stringify(modelProfile(model).polygon)}
