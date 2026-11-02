import {defaultPlan,defaultOperation,contourFromModel,contourPath,modelMatches,sanitizePlan,OP_TYPES} from './shopturn-core.js';
import {modelProfile} from './model.js';
import {mountShopTurnContour} from './contour-editor.js';

const KEY='cnc-toolbox-shopturn-v1';
const q=(id)=>document.getElementById(id);
const n=(v)=>Number(String(v).trim().replace(',','.'));
const fmt=(v)=>v===null||v===undefined||v===''?'':Number(v).toFixed(3).replace(/0+$/,'').replace(/[.,]$/,'').replace('.',',');
const html=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let getPart,notify,plan,tab='operations',editIndex=-1,editPoint=-1;
function message(t,err=false){const el=q('st-message');if(el){el.textContent=t;el.dataset.error=String(err)}if(err)notify?.(t)}
function load(){
 try{const raw=JSON.parse(localStorage.getItem(KEY));plan=sanitizePlan(raw)}
 catch{plan=defaultPlan(getPart())}
}
function save(next){
 try{
  const safe=sanitizePlan(next);
  localStorage.setItem(KEY,JSON.stringify(safe));
  plan=safe;render();return true;
 }catch(e){message(e.message,true);return false}
}
function field(name,label,value,other=''){
 return '<label class="st-field"><span>'+html(label)+'</span><input name="'+html(name)+'" type="text" inputmode="decimal" autocomplete="off" value="'+html(value??'')+'" '+other+'></label>';
}
function select(name,label,options,value){
 return '<label class="st-field"><span>'+html(label)+'</span><select name="'+html(name)+'">'+options.map(o=>'<option value="'+html(o[0])+'"'+(o[0]===value?' selected':'')+'>'+html(o[1])+'</option>').join('')+'</select></label>';
}
function render(){
 const root=q('st-content');if(!root)return;
 const stale=!modelMatches(plan,getPart());
 q('st-stale').hidden=!stale;
 for(const b of document.querySelectorAll('[data-st-tab]')){const on=b.dataset.stTab===tab;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',String(on))}
 const meta=q('st-meta');
 meta.textContent=plan.operations.length+' операций · '+(plan.contour.length-1)+' элементов контура · '+plan.header.g54;
 if(tab==='operations')drawOperations(root);
 if(tab==='contour')drawContourEditor(root);
 if(tab==='header')drawHeader(root);
 if(tab==='checks')drawChecks(root);
}
function drawOperations(root){
 root.innerHTML='<div class="st-toolbar"><b>Технологическая последовательность</b><span class="st-tag">SINUMERIK 828D</span></div>'+
 '<div class="st-create">'+select('newType','Цикл / операция',Object.entries(OP_TYPES).map(([k,v])=>[k,v.label]),'facing')+
 '<button type="button" class="button primary" id="st-add-operation">＋ Добавить</button></div>'+
 '<div class="st-list" id="st-ops"></div>'+
 '<p class="st-caution">Карточки описывают параметры для ввода на стойке, но НЕ являются проверенной NC-программой. Коррекции, безопасные подходы, патрон и направление инструмента требуют проверки на станке.</p>';
 q('st-add-operation').onclick=()=>{const type=root.querySelector('[name=newType]').value;const next=structuredClone(plan);next.operations.push(defaultOperation(type,plan));if(save(next))openOperation(next.operations.length-1)};
 const list=q('st-ops');
 if(!plan.operations.length)list.innerHTML='<p class="st-muted">Операций пока нет. Выбери цикл и добавь его.</p>';
 plan.operations.forEach((o,i)=>{
  const def=OP_TYPES[o.type];
  const row=document.createElement('div');row.className='st-op';
  const info=document.createElement('button');info.className='st-op-main';info.type='button';
  const fields=def.fields.map(([key])=>key.toUpperCase()+' '+fmt(o[key])).join(' · ');
  info.innerHTML='<span class="st-op-num">'+String(i+1).padStart(2,'0')+'</span><span class="st-op-info"><b>'+html(def.label)+'</b><small>'+html(def.cycle)+' · '+html(o.tool)+' D'+o.edge+' · F'+fmt(o.feed)+' S'+fmt(o.speed)+'</small><em>'+html(fields)+'</em></span><span class="st-op-chevron">✎</span>';
  info.onclick=()=>openOperation(i);row.append(info);
  const controls=document.createElement('div');controls.className='st-op-actions';
  for(const [symbol,delta,label] of [['↑',-1,'Выше'],['↓',1,'Ниже']]){
   const b=document.createElement('button');b.type='button';b.textContent=symbol;b.setAttribute('aria-label',label+' '+(i+1));b.disabled=i+delta<0||i+delta>=plan.operations.length;
   b.onclick=()=>{const next=structuredClone(plan);[next.operations[i],next.operations[i+delta]]=[next.operations[i+delta],next.operations[i]];save(next)};controls.append(b);
  }
  row.append(controls);list.append(row);
 });
}
function drawHeader(root){
 const h=plan.header;
 root.innerHTML='<div class="st-toolbar"><b>Заголовок ShopTurn</b><span class="st-tag">G54 / MM / Ø</span></div>'+
 '<p class="st-muted">X — диаметры. Z0 — передний торец заготовки, Z отрицательный вглубь детали. G54 зафиксирован.</p>'+
 '<form id="st-header-form" class="st-form">'+
 '<div class="st-field-grid">'+field('g54','Система отсчёта','G54','readonly')+
 select('toolChange','Точка смены', [['MCS','MCS · машина'],['WCS','WCS · деталь']],h.toolChange)+
 [['xa','XA · Наружный Ø'],['xi','XI · Внутренний Ø'],['za','ZA · Начало Z'],['zi','ZI · Конец Z'],['zb','ZB · Зона обработки'],['xra','XRA · Отвод X'],['xri','XRI · Отвод внутри'],['zra','ZRA · Отвод передний'],['zri','ZRI · Отвод задний'],['sc','SC · Безопасный зазор'],['maxS','Ограничение S, об/мин'],['xt','XT · Точка смены X'],['zt','ZT · Точка смены Z']].map(([k,label])=>field(k,label,h[k]===null?'':fmt(h[k]))).join('')+
 '</div><button class="button primary wide" type="submit">Сохранить заголовок</button></form>'+
 '<p class="st-caution">XT/ZT — координаты нуля револьверной головки, а не вершины резца. Отводы и положение кулачков не проверены автоматически.</p>';
 q('st-header-form').onsubmit=e=>{
  e.preventDefault();const data=new FormData(e.currentTarget),next=structuredClone(plan);
  for(const k of Object.keys(next.header)){
   if(k==='g54')continue;
   const v=data.get(k);
   if(k==='toolChange')next.header[k]=v;
   else if(k==='xt'||k==='zt')next.header[k]=String(v).trim()===''?null:n(v);
   else next.header[k]=n(v);
  }
  if(save(next))message('Заголовок сохранён. Проверь реальные вылеты и безопасные отводы.');
 };
}
function drawContourEditor(root){
 mountShopTurnContour(root,plan,save,message,()=>{
  if(!confirm('Заменить ручной контур геометрией CAD-детали? Изменения ручных дуг, фасок и радиусов будут потеряны.'))return;
  const next=structuredClone(plan),p=modelProfile(getPart());
  next.contour=contourFromModel(getPart());next.modelSignature=JSON.stringify(p.polygon);
  next.header.xa=p.maxD;next.header.xi=getPart().bore;next.header.za=0;next.header.zi=-p.length;next.header.zb=-p.length;
  if(save(next))message('Контур построен из CAD. Проверь последовательность элементов.');
 });
}
function drawChecks(root){
 const stale=!modelMatches(plan,getPart());
 const list=[
 ['G54','Зафиксирована система G54',true],
 ['Геометрия','Контур содержит '+(plan.contour.length-1)+' валидных элементов',true],
 ['Синхронизация CAD',stale?'CAD-модель изменена — обнови контур вручную':'Контур привязан к текущей версии CAD',!stale],
 ['Точка смены',plan.header.xt===null||plan.header.zt===null?'XT/ZT не заданы':'XT/ZT введены, но не проверены на станке',false],
 ['Режимы','Подачи и обороты проверены на положительность и лимит S',true],
 ['Инструмент','Наличие, вылет, ориентация, кромка D и коррекции не подтверждены',false],
 ['Коллизии','Столкновения с кулачками/револьвером не рассчитываются',false],
 ['NC-код','Постпроцессор и безопасное исполнение не реализованы',false]
 ];
 root.innerHTML='<div class="st-toolbar"><b>Предварительная проверка</b><span class="st-tag">НЕ ДОПУСК К СТАНКУ</span></div>'+
 '<div class="st-check-list">'+list.map(([name,desc,ok])=>'<div class="st-check"><span class="'+(ok?'st-ok':'st-warn')+'">'+(ok?'✓':'!')+'</span><div><b>'+html(name)+'</b><small>'+html(desc)+'</small></div></div>').join('')+'</div>'+
 '<p class="st-caution">Перед реальной обработкой: проверь зажим, инструмент и коррекции, G54, пределы перемещений, графическую симуляцию на стойке, одиночные блоки, сниженные подачи и безопасный первый проход. Это учебная технологическая карта, не CAM-постпроцессор.</p>';
}
function dialog(title,body,submit){
 const el=q('st-dialog');q('st-dialog-title').textContent=title;q('st-dialog-fields').innerHTML=body;
 q('st-dialog-error').textContent='';
 el.showModal();
 const form=q('st-dialog-form');form.onsubmit=e=>{e.preventDefault();submit(new FormData(form))};
}
function openOperation(index){
 editIndex=index;const o=plan.operations[index],def=OP_TYPES[o.type];
 const body='<div class="st-field-grid">'+
 field('tool','Инструмент (T)',o.tool,'inputmode="text"')+
 field('edge','Режущая кромка D',o.edge)+
 field('feed','Подача F, мм/об',fmt(o.feed))+
 field('speed','Шпиндель S, об/мин',fmt(o.speed))+
 select('area','Позиция', [['OD','Наружная OD'],['ID','Внутренняя ID']],o.area)+
 def.fields.map(([k,label])=>field(k,label,fmt(o[k]))).join('')+'</div>'+
 '<p class="st-muted">Цикл: '+html(def.cycle)+'. Параметры — предварительные и не заменяют экран цикла на стойке.</p>'+
 '<button type="button" class="st-delete" id="st-remove">Удалить операцию</button>';
 dialog(def.label,body,data=>{
  const next=structuredClone(plan),v=next.operations[index];
  v.tool=String(data.get('tool')).trim();v.edge=n(data.get('edge'));
  v.feed=n(data.get('feed'));v.speed=n(data.get('speed'));v.area=data.get('area');
  for(const [k] of def.fields)v[k]=n(data.get(k));
  if(save(next)){q('st-dialog').close();message('Операция сохранена.')}
  else q('st-dialog-error').textContent=q('st-message').textContent;
 });
 q('st-remove').onclick=()=>{
  if(!confirm('Удалить операцию '+(index+1)+'?'))return;
  const next=structuredClone(plan);next.operations.splice(index,1);
  if(save(next))q('st-dialog').close();
 };
}
function download(text,file,type){
 const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');
 a.href=url;a.download=file;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
}
function exportPlan(){
 const lines=['CNC TOOLBOX PRO — SHOPTURN / TECH PROCESS PLAN','NOT EXECUTABLE NC CODE','G54 / MILLIMETERS / X AS DIAMETER','',
 'Заготовка: XA '+fmt(plan.header.xa)+' XI '+fmt(plan.header.xi)+' ZA '+fmt(plan.header.za)+' ZI '+fmt(plan.header.zi)+' ZB '+fmt(plan.header.zb),
 'Отвод: XRA '+fmt(plan.header.xra)+' XRI '+fmt(plan.header.xri)+' ZRA '+fmt(plan.header.zra)+' ZRI '+fmt(plan.header.zri)+' SC '+fmt(plan.header.sc),
 'Смена: '+plan.header.toolChange+' XT '+(plan.header.xt??'НЕ ЗАДАНО')+' ZT '+(plan.header.zt??'НЕ ЗАДАНО'),'',
 'КОНТУР · ДАННЫЕ ДЛЯ РУЧНОГО ВВОДА'];
 lines.push('Имя контура: '+(plan.contourName||'CONT_1'));
 plan.contour.forEach((p,i)=>lines.push((i+1)+'. '+(p.kind==='line'?'LINE_'+(p.mode||'ZX'):p.kind)+' X'+fmt(p.x)+' Z'+fmt(p.z)+(p.radius?' R'+fmt(p.radius):'')+(p.arcMode==='center'?' I'+fmt(p.centerI)+' K'+fmt(p.centerK):'')+(p.transition?' → '+p.transition.type+' '+fmt(p.transition.value):'')));
 lines.push('','ОПЕРАЦИИ');
 plan.operations.forEach((o,i)=>lines.push((i+1)+'. '+OP_TYPES[o.type].label+' · '+o.tool+' D'+o.edge+' F'+fmt(o.feed)+' S'+fmt(o.speed)+' '+o.area+' · '+OP_TYPES[o.type].fields.map(([k])=>k+'='+fmt(o[k])).join(' ')));
 lines.push('','ПРОВЕРКА: геометрия, инструмент, коррекции, G54, патрон, безопасные отводы, пробный проход и симуляция SINUMERIK обязательны.');
 download(lines.join('\n'),'shopturn-plan.txt','text/plain;charset=utf-8');
}
export function refreshShopTurn(){if(plan&&q('page-shopturn')&&!q('page-shopturn').hidden)render()}
export function initShopTurn({getModel,toast}){
 getPart=getModel;notify=toast;load();
 for(const b of document.querySelectorAll('[data-st-tab]'))b.addEventListener('click',()=>{tab=b.dataset.stTab;render()});
 q('st-export').onclick=exportPlan;
 q('st-save-json').onclick=()=>download(JSON.stringify(plan,null,2),'shopturn-operations.json','application/json');
 q('st-reset').onclick=()=>{if(confirm('Сбросить только технологическую карту ShopTurn? CAD-деталь сохранится.'))save(defaultPlan(getPart()))};
 q('st-dialog-close').onclick=()=>q('st-dialog').close();
 q('st-dialog-cancel').onclick=()=>q('st-dialog').close();
 render();
}
