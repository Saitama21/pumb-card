/** Touch-first ShopTurn-like contour editor.
 * Mirrors the workflow of SINUMERIK Contour turning -> Contour -> New contour:
 * initial point, element softkey, parameter mask, Accept, next element.
 * Partial-geometry solver and undercuts are deliberately not simulated. */
import {makeShopElement,shopContourPath} from './contour-geometry.js';
const ns='http://www.w3.org/2000/svg',byId=id=>document.getElementById(id);
const fmt=x=>Number(x).toFixed(3).replace(/0+$/,'').replace(/\.$/,'').replace('.',',');
const num=x=>Number(String(x).replace(',','.').trim());
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const texts={start:'Начальная точка',X:'Прямая X',Z:'Прямая Z',ZX:'Прямая X/Z',arcCW:'Дуга ↻',arcCCW:'Дуга ↺'};
let active=0,action=null,mode='ZX',hint='',full=false;
function itemLabel(node){
 if(node.kind==='start')return texts.start;
 if(node.kind==='line')return texts[node.mode||'ZX'];
 return texts[node.kind];
}
function pointLabel(p){return 'X'+fmt(p.x)+'  Z'+fmt(p.z)}
function el(tag,attrs,text){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e}
function plot(svg,nodes,selected,ghost=null){
 svg.replaceChildren();const draw=ghost||nodes;
 let points;
 try{points=shopContourPath(draw)}
 catch{points=shopContourPath(nodes)}
 const extremes=[...points,...draw.map(n=>({z:n.z,r:n.x/2})),{z:0,r:0}];
 const zmin=Math.min(...extremes.map(p=>p.z)),zmax=Math.max(...extremes.map(p=>p.z));
 const ymin=Math.min(0,...extremes.map(p=>p.r)),ymax=Math.max(1,...extremes.map(p=>p.r));
 const w=410,h=155,offX=35,offY=37;
 const Z=z=>offX+((z-zmin)/Math.max(1,zmax-zmin))*w;
 const Y=r=>offY+h-((r-ymin)/Math.max(1,ymax-ymin))*h;
 for(let j=0;j<=5;j++){
  const x=offX+j*w/5,y=offY+j*h/5;
  svg.append(el('line',{x1:x,x2:x,y1:offY,y2:offY+h,stroke:'#2a516b','stroke-dasharray':'3 5','stroke-width':0.65}));
  svg.append(el('line',{x1:offX,x2:offX+w,y1:y,y2:y,stroke:'#2a516b','stroke-dasharray':'3 5','stroke-width':0.65}));
 }
 svg.append(el('line',{x1:offX,x2:offX+w,y1:Y(0),y2:Y(0),stroke:'#5c889e','stroke-width':1}));
 svg.append(el('path',{d:points.map((p,i)=>(i?'L':'M')+Z(p.z).toFixed(3)+' '+Y(p.r).toFixed(3)).join(' '),
  fill:'none',stroke:ghost?'#7ddfaa':'#6dd7ff','stroke-width':2.5,'stroke-linejoin':'round','stroke-linecap':'round'}));
 if(ghost){let main;try{main=shopContourPath(nodes)}catch{main=[]}if(main.length)svg.insertBefore(el('path',{d:main.map((p,i)=>(i?'L':'M')+Z(p.z).toFixed(3)+' '+Y(p.r).toFixed(3)).join(' '),fill:'none',stroke:'#72d0ff','stroke-width':1.7,'stroke-dasharray':'5 4'}),svg.lastChild)}
 nodes.forEach((node,i)=>{
  const x=Z(node.z),y=Y(node.x/2);
  if(i===selected&&i>0){
   const last=nodes[i-1];svg.append(el('line',{x1:Z(last.z),y1:Y(last.x/2),x2:x,y2:y,stroke:'#ffa24f','stroke-width':3,opacity:.75}));
  }
  const c=el('circle',{cx:x,cy:y,r:i===selected?6:4,fill:i===selected?'#ffa24f':'#081e2a',stroke:i===selected?'#ffda9f':'#a8e8ff','stroke-width':1.6,'data-point':i,role:'button',tabindex:0,'aria-label':'Выбрать элемент '+(i+1)});
  c.addEventListener('click',()=>{active=i;action=null;refresh()});
  c.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();active=i;action=null;refresh()}});
  svg.append(c);
 });
 svg.append(el('text',{x:offX,y:18,fill:'#84b5d0','font-size':10},'X Ø'+fmt(ymax*2)));
 svg.append(el('text',{x:offX,y:231,fill:'#84b5d0','font-size':10},'Z '+fmt(zmin)));
 svg.append(el('text',{x:offX+w-85,y:231,fill:'#84b5d0','font-size':10},'Z '+fmt(zmax)));
 svg.append(el('text',{x:offX+w-15,y:18,fill:'#78d5ff','font-size':10,'text-anchor':'end'},ghost?'ПРЕДПРОСМОТР':'SHOPTURN · X/Z'));
}
function renderPanel(root,plan,save,message){
 const nodes=plan.contour;
 active=Math.max(0,Math.min(active,nodes.length-1));
 root.innerHTML='<div class="st-toolbar"><b>Геометрический контур</b><span class="st-tag">SINUMERIK · G54</span></div>'+
 '<div class="sc-name"><label><span>Имя контура</span><input id="sc-name" maxlength="32" autocomplete="off" value="'+safe(plan.contourName||'CONT_1')+'"></label><button type="button" class="tiny-action" id="sc-save-name">Принять</button></div>'+
 '<div class="sc-workspace"><div class="sc-navigation"><div class="sc-caption"><b>ЭЛЕМЕНТЫ</b><small>'+nodes.length+' / 250</small></div>'+
 '<div class="sc-elements" id="sc-elements" aria-label="Последовательность элементов контура">'+nodes.map((p,i)=>'<button type="button" class="sc-element '+(i===active?'selected':'')+'" data-sc-index="'+i+'" aria-current="'+(i===active?'step':'false')+'"><span class="sc-symbol">'+(p.kind==='start'?'⊕':p.kind.startsWith('arc')?'⌒':p.mode==='Z'?'↔':p.mode==='X'?'↕':'⤢')+'</span><span><b>'+safe(itemLabel(p))+'</b><small>'+safe(pointLabel(p))+'</small>'+(p.transition?'<small class="sc-transition">↪ '+safe(p.transition.type)+' '+fmt(p.transition.value)+'</small>':'')+'</span><span class="sc-chevron">›</span></button>').join('')+
 '<div class="sc-end">■ END</div></div></div><div class="sc-graph"><div class="sc-caption"><b>ГРАФИКА КОНТУРА</b><small>mm · Ø X</small></div><svg id="sc-plot" class="sc-plot" viewBox="0 0 480 242" role="img" aria-label="Контур с выбранными элементами и координатами"></svg><div class="sc-selected"><span>Выбрано:</span><b>'+safe(itemLabel(nodes[active]))+'</b><span>'+safe(pointLabel(nodes[active]))+'</span></div></div></div>'+
 '<div class="sc-softkeys"><div class="sc-softkeys-head"><b>ЭЛЕМЕНТ КОНТУРА</b><span>Выбор типа → параметры → ✓ Принять</span></div><div class="sc-softkey-grid">'+
 '<button type="button" data-sc-key="Z"><span>↔</span>Прямая Z</button>'+
 '<button type="button" data-sc-key="X"><span>↕</span>Прямая X</button>'+
 '<button type="button" data-sc-key="ZX"><span>⤢</span>Прямая X/Z</button>'+
 '<button type="button" data-sc-key="arc"><span>⌒</span>Дуга</button></div></div>'+
 '<section class="sc-parameter" id="sc-parameter" aria-label="Параметры выбранного элемента"></section>'+
 '<div class="sc-menu"><button type="button" class="tiny-action" id="sc-edit">✎ Изменить</button><button type="button" class="tiny-action" id="sc-close">⌁ Замкнуть</button><button type="button" class="tiny-action" id="sc-delete">⌫ Удалить</button><button type="button" class="tiny-action" id="sc-cad">↻ Из CAD</button></div>'+
 '<p class="sc-hint" id="sc-hint">По Siemens: Контур → Новый контур → Начальная точка → Элемент → Принять. Прямые по X, Z, X/Z и дуги вводятся раздельными экранами.</p>'+
 '<p class="st-caution">Редактор повторяет последовательность ввода ShopTurn, но не заменяет геометрический решатель Siemens: касательная к предыдущему, альтернативные решения, подрезы E/F и неполные размеры пока недоступны. R/FS рассчитываются для пары прямых. Это геометрия, не готовый NC-код.</p>';
 byId('sc-save-name').onclick=()=>{
  const v=byId('sc-name').value.trim().toUpperCase();
  if(!/^[A-Z][A-Z0-9_]{0,31}$/.test(v)){message('Название: латинские буквы, цифры, _; первая — буква',true);return}
  const next=structuredClone(plan);next.contourName=v;save(next);
 };
 for(const b of root.querySelectorAll('[data-sc-index]'))b.onclick=()=>{active=Number(b.dataset.scIndex);action='edit';refresh()};
 for(const b of root.querySelectorAll('[data-sc-key]'))b.onclick=()=>{mode=b.dataset.scKey;action='new';refresh()};
 byId('sc-edit').onclick=()=>{action='edit';refresh()};
 byId('sc-close').onclick=()=>{
  const end=nodes.at(-1),first=nodes[0];
  if(Math.hypot((end.x-first.x)/2,end.z-first.z)<1e-7){message('Контур уже замкнут');return}
  const next=structuredClone(plan);next.contour.push({id:'close'+Date.now(),kind:'line',mode:'ZX',x:first.x,z:first.z});
  active=next.contour.length-1;action=null;if(save(next))message('Контур замкнут прямой к начальной точке.');
 };
 byId('sc-delete').onclick=()=>{
  if(active===0||nodes.length<=2){message('Нельзя удалить стартовую точку или оставить один элемент',true);return}
  if(!confirm('Удалить выбранный элемент '+active+'?'))return;
  const next=structuredClone(plan);next.contour.splice(active,1);active=Math.min(active,next.contour.length-1);action=null;save(next);
 };
 byId('sc-cad').onclick=()=>{root.dispatchEvent(new CustomEvent('contour-sync-request',{bubbles:true}))};
 plot(byId('sc-plot'),nodes,active);
 const holder=byId('sc-parameter');
 if(action==='edit'||action==='new')renderFields(holder,plan,save,message);
 else holder.innerHTML='<div class="sc-parameter-blank"><span>＋</span><div><b>Выбери элемент или нажми мягкую клавишу</b><small>Нажатие по Z, по X, X/Z или Дуга откроет соответствующий экран параметров. Новый элемент вставляется после выбранного.</small></div></div>';
}
let refresh=()=>{};
function renderFields(holder,plan,save,message){
 const nodes=plan.contour,isNew=action==='new',index=isNew?active+1:active,prev=nodes[index-1];
 const current=isNew?null:nodes[index];
 const kind=isNew?mode:(current.kind==='start'?'start':current.kind==='line'?(current.mode||'ZX'):'arc');
 const prevX=prev?.x??0,prevZ=prev?.z??0;
 const dx=current?.dimX||'ABS',dz=current?.dimZ||'ABS';
 const showX=kind!=='Z',showZ=kind!=='X',arc=kind==='arc';
 const label=kind==='start'?'Начальная точка':kind==='X'?'Прямая X':kind==='Z'?'Прямая Z':kind==='ZX'?'Прямая X/Z':'Дуга окружности';
 const dval=(v,old,dim)=>v===undefined?'':fmt(dim==='INC'?v-old:v);
 const dimField=(name,text,val,old,dim)=>'<label class="sc-field"><span>'+text+'</span><div class="sc-with-select"><input name="'+name+'" type="text" inputmode="decimal" autocomplete="off" required value="'+safe(dval(val,old,dim))+'"><select name="dim'+name.toUpperCase()+'" aria-label="Режим '+name+'"><option value="ABS"'+(dim==='ABS'?' selected':'')+'>ABS</option><option value="INC"'+(dim==='INC'?' selected':'')+'>INC</option></select></div></label>';
 const xVal=current?.x??(isNew?(kind==='Z'?prevX:kind==='X'?prevX-2:prevX-2):prevX);
 const zVal=current?.z??(isNew?(kind==='X'?prevZ:prevZ-5):prevZ);
 holder.innerHTML='<div class="sc-editor-top"><div><small>МАСКА ВВОДА · '+(isNew?'НОВЫЙ ЭЛЕМЕНТ':'РЕДАКТИРОВАНИЕ')+'</small><h3>'+safe(label)+'</h3></div><span class="sc-tag">'+(kind==='start'?'⊕':kind==='X'?'↕':kind==='Z'?'↔':arc?'⌒':'⤢')+'</span></div>'+
 '<form id="sc-form" novalidate><div class="sc-form-grid">'+
 (showX?dimField('x','Конечная координата X Ø, мм',xVal,prevX,dx):'')+
 (showZ?dimField('z','Конечная координата Z, мм',zVal,prevZ,dz):'')+
 (arc?'<label class="sc-field"><span>Направление дуги</span><select name="direction"><option value="cw"'+(current?.kind==='arcCW'?' selected':'')+'>↻ По часовой</option><option value="ccw"'+(current?.kind!=='arcCW'?' selected':'')+'>↺ Против часовой</option></select></label>'+
 '<label class="sc-field"><span>Дуга задана</span><select name="arcMode"><option value="radius"'+(current?.arcMode!=='center'?' selected':'')+'>Радиусом R</option><option value="center"'+(current?.arcMode==='center'?' selected':'')+'>Центром I / K</option></select></label>'+
 '<label class="sc-field sc-arc-radius"><span>Радиус дуги R, мм</span><input name="radius" inputmode="decimal" value="'+safe(fmt(current?.radius??10))+'"></label>'+
 '<label class="sc-field sc-arc-center"><span>Центр I Ø, мм (ABS)</span><input name="centerI" inputmode="decimal" value="'+safe(current?.centerI===undefined?'':fmt(current.centerI))+'"></label>'+
 '<label class="sc-field sc-arc-center"><span>Центр K, мм (ABS)</span><input name="centerK" inputmode="decimal" value="'+safe(current?.centerK===undefined?'':fmt(current.centerK))+'"></label>':'')+
 (!arc&&kind!=='start'?'<label class="sc-field"><span>Переход к следующему</span><select name="transition"><option value="">Без перехода</option><option value="R"'+(current?.transition?.type==='R'?' selected':'')+'>Радиус R</option><option value="FS"'+(current?.transition?.type==='FS'?' selected':'')+'>Фаска FS</option></select></label>'+
 '<label class="sc-field sc-transition-value"><span>R / FS, мм</span><input name="transitionValue" inputmode="decimal" value="'+safe(current?.transition?.value===undefined?'':fmt(current.transition.value))+'"></label>':'')+
 '</div><div class="sc-editor-actions"><button type="button" class="button ghost" id="sc-cancel">Отмена</button><button class="button primary" type="submit">✓ Принять элемент</button></div><p class="sc-form-feedback" role="status" aria-live="polite"></p></form>';
 const form=byId('sc-form');
 const refreshConditional=()=>{
  const arcMode=form.elements.namedItem('arcMode')?.value;
  form.querySelectorAll('.sc-arc-radius').forEach(e=>e.hidden=arcMode==='center');
  form.querySelectorAll('.sc-arc-center').forEach(e=>e.hidden=arcMode!=='center');
  form.querySelectorAll('.sc-transition-value').forEach(e=>e.hidden=!form.elements.namedItem('transition')?.value);
 };
 refreshConditional();
 form.elements.namedItem('arcMode')?.addEventListener('change',refreshConditional);
 form.elements.namedItem('transition')?.addEventListener('change',refreshConditional);
 for(const axis of ['x','z']){
  const ctrl=form.elements.namedItem('dim'+axis.toUpperCase()),input=form.elements.namedItem(axis);
  if(!ctrl||!input)continue;
  ctrl.onchange=e=>{
   const old=e.target.dataset.prev|| (current?.['dim'+axis.toUpperCase()]||'ABS');
   const v=num(input.value),baseline=axis==='x'?prevX:prevZ;
   if(Number.isFinite(v))input.value=fmt(e.target.value==='INC'?(old==='INC'?v:v-baseline):(old==='INC'?v+baseline:v));
   e.target.dataset.prev=e.target.value;
  };
 }
 const build=()=>{
  const data=new FormData(form);
  const dimX=data.get('dimX')||'ABS',dimZ=data.get('dimZ')||'ABS';
  let next;
  if(kind==='start'){
   const x=num(data.get('x')),z=num(data.get('z'));
   next={id:current.id,kind:'start',x,z};
  }else {
   const arcMode=data.get('arcMode')||'radius';
   next=makeShopElement(prev,kind,{
    x:data.get('x'),z:data.get('z'),dimX,dimZ,
    arcMode,radius:num(data.get('radius')||0),
    centerI:num(data.get('centerI')||0),centerK:num(data.get('centerK')||0),direction:data.get('direction')
   });
   next.id=current?.id||next.id;
   if(!arc&&data.get('transition'))next.transition={type:data.get('transition'),value:num(data.get('transitionValue'))};
  }
  const snapshot=structuredClone(plan);
  if(isNew)snapshot.contour.splice(index,0,next);else snapshot.contour[index]=next;
  return snapshot;
 };
 const feedback=form.querySelector('.sc-form-feedback');
 form.addEventListener('input',()=>{
  try{const d=build();const path=shopContourPath(d.contour);if(path.length){feedback.textContent='Геометрия корректна · предварительный просмотр';feedback.dataset.error='false';plot(byId('sc-plot'),nodes,active,d.contour)}}
  catch(e){feedback.textContent=e.message;feedback.dataset.error='true';plot(byId('sc-plot'),nodes,active)}
 });
 form.onsubmit=e=>{
  e.preventDefault();
  try{
   const d=build();shopContourPath(d.contour);
   active=index;action=null;if(save(d))message('Элемент принят. Выбери следующий элемент контура.');
   else {action=isNew?'new':'edit';refresh()}
  }catch(error){feedback.textContent=error.message;feedback.dataset.error='true';message(error.message,true)}
 };
 byId('sc-cancel').onclick=()=>{action=null;refresh()};
}
export function mountShopTurnContour(root,plan,save,message,sync){
 refresh=()=>renderPanel(root,plan,save,message);
 root.addEventListener('contour-sync-request',sync,{once:true});
 refresh();
}
