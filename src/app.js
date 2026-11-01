import {exampleModel,newId,modelProfile,sanitizeModel,totalLength,outsideAt} from './model.js';
import {updatePreview,drawProfile,fitCamera,zoom} from './preview.js';
const $=id=>document.getElementById(id);
const STORAGE='cnc-toolbox-pro-current-v1',THEME='cnc-toolbox-pro-theme-v1';
const fmt=(n,d=2)=>Number(n).toFixed(d).replace('.',',');
const num=v=>Number(String(v).trim().replace(',','.'));
const clone=m=>structuredClone(m);
let model,profile,generatedFile=null,step='stock',active='home',editor=null,toastTimer,worker,workerJob=0;
function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2600)}
function restore(){
 try{model=sanitizeModel(JSON.parse(localStorage.getItem(STORAGE)||'null'))}catch{model=exampleModel()}
 try{document.documentElement.dataset.theme=localStorage.getItem(THEME)==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}
}
function store(){try{localStorage.setItem(STORAGE,JSON.stringify(model))}catch{toast('Не удалось сохранить. Скачай JSON проекта')}}
function applyModel(next){
 const m=sanitizeModel(next);model=m;profile=modelProfile(m);generatedFile=null;
 $('share-step').disabled=true;$('make-step').textContent='▤ Создать STEP';
 $('export-message').textContent='STEP ещё не создавался для этой версии модели. Создай файл после проверки размеров.';
 store();render();return m;
}
function page(next){
 if(next==='preview'){try{profile=modelProfile(model)}catch(error){toast(error.message);return}}
 active=next;
 for(const id of ['home','edit','preview','settings'])$('page-'+id).hidden=id!==next;
 for(const item of document.querySelectorAll('.dock-tab')){
  const selected=item.dataset.go===next;item.classList.toggle('is-active',selected);
  selected?item.setAttribute('aria-current','page'):item.removeAttribute('aria-current');
 }
 if(next==='preview'){updatePreview($('cad-canvas'),profile);drawProfile($('profile-svg'),profile);renderTree()}
 if(next==='edit')chooseStep(step);
 window.scrollTo({top:0,behavior:'instant'});
}
function chooseStep(next){
 step=next;$('editor-stock').hidden=next!=='stock';$('editor-features').hidden=next!=='features';
 for(const button of document.querySelectorAll('[data-step]'))button.classList.toggle('current',button.dataset.step===next);
}
function buttonFeature(title,detail,index,kind){
 const button=document.createElement('button');button.type='button';button.className='feature-row';
 const n=document.createElement('span');n.className='feature-num';n.textContent=index+1;
 const copy=document.createElement('span');copy.className='feature-copy';
 const strong=document.createElement('strong');strong.textContent=title;
 const small=document.createElement('small');small.textContent=detail;copy.append(strong,small);
 const arrow=document.createElement('span');arrow.className='feature-chevron';arrow.textContent='›';
 button.append(n,copy,arrow);button.addEventListener('click',()=>openEditor(kind,index));return button;
}
function render(){
 $('part-name').value=model.name;$('part-bore').value=fmt(model.bore);
 $('stock-length').textContent=fmt(totalLength(model))+' мм';
 $('home-name').textContent=model.name;
 $('home-size').textContent='⌀'+fmt(profile.maxD)+' × '+fmt(profile.length)+' мм · '+model.steps.length+' ступеней';
 $('steps-list').replaceChildren(...model.steps.map((s,i)=>buttonFeature(s.type==='taper'?'Конус':'Ступень',
  s.type==='taper'?'⌀'+fmt(s.d)+' → ⌀'+fmt(s.dEnd)+' · L '+fmt(s.length)+' мм':'⌀'+fmt(s.d)+' · L '+fmt(s.length)+' мм',i,'step')));
 const renderGrooves=(key,id,kind)=>{
  const el=$(id);el.replaceChildren();
  if(!model[key].length){const p=document.createElement('p');p.className='form-note';p.textContent='Нет операций — добавь при необходимости';el.append(p)}
  model[key].forEach((g,i)=>el.append(buttonFeature('Канавка '+kind,'Z '+fmt(g.z)+' · b '+fmt(g.width)+' · ⌀'+fmt(g.d)+' мм',i,key)));
 };
 renderGrooves('grooves','od-grooves','OD');renderGrooves('innerGrooves','id-grooves','ID');
 const s=$('summary-strip');s.replaceChildren();
 for(const t of ['⌀'+fmt(profile.maxD)+' макс.','L '+fmt(profile.length)+' мм','Отверстие ⌀'+fmt(model.bore)]){
  const span=document.createElement('span');span.textContent=t;s.append(span);
 }
 if(active==='preview'){drawProfile($('profile-svg'),profile);updatePreview($('cad-canvas'),profile);renderTree()}
}
function renderTree(){
 const list=$('tree-list');list.replaceChildren();
 const items=[['▣','Заготовка','⌀'+fmt(profile.maxD)+' × '+fmt(profile.length)],
  ...model.steps.map((s,i)=>['▤',(i+1)+'. '+(s.type==='taper'?'Конус':'Ступень'),'⌀'+fmt(s.d)+' · '+fmt(s.length)+' мм']),
  ...(model.bore>0?[['◉','Сквозное отверстие','⌀'+fmt(model.bore)]]:[]),
  ...model.grooves.map((g,i)=>['⌑','Канавка OD '+(i+1),'⌀'+fmt(g.d)+' · b '+fmt(g.width)]),
  ...model.innerGrooves.map((g,i)=>['⌑','Канавка ID '+(i+1),'⌀'+fmt(g.d)+' · b '+fmt(g.width)])];
 for(const [icon,title,dimensions] of items){
  const line=document.createElement('div');line.className='tree-entry';
  const a=document.createElement('span');a.textContent=icon;const b=document.createElement('b');b.textContent=title;
  const c=document.createElement('small');c.textContent=dimensions;line.append(a,b,c);list.append(line);
 }
}
const defs={
 step:[['d','Наружный диаметр Ø, мм'],['length','Длина участка, мм']],
 taper:[['d','Диаметр в начале Ø, мм'],['dEnd','Диаметр в конце Ø, мм'],['length','Длина конуса, мм']],
 grooves:[['z','Положение от левого торца Z, мм'],['width','Ширина канавки, мм'],['d','Диаметр по дну Ø, мм']],
 innerGrooves:[['z','Положение от левого торца Z, мм'],['width','Ширина канавки, мм'],['d','Диаметр канавки Ø, мм']]
};
function field(name,label,value){
 const wrapper=document.createElement('label');wrapper.className='field';
 const span=document.createElement('span');span.textContent=label;
 const input=document.createElement('input');input.name=name;input.inputMode='decimal';input.value=fmt(value);
 input.autocomplete='off';input.required=true;input.type='text';input.setAttribute('aria-label',label);
 wrapper.append(span,input);return wrapper;
}
function openEditor(kind,index=-1){
 let entry;const L=totalLength(model);
 if(kind==='step')entry=index<0?{id:newId(),type:'cylinder',d:model.steps.at(-1)?.d||38,length:8}:model.steps[index];
 else if(kind==='taper')entry={id:newId(),type:'taper',d:model.steps.at(-1)?.d||38,dEnd:model.steps.at(-1)?.d||38,length:8};
 else{
  const base=model.bore;
  if(kind==='innerGrooves'&&!base){toast('Сначала укажи внутреннее сквозное отверстие');return}
  const z=Math.max(0,Math.min(L-2,L*.4));
  entry=index<0?{id:newId(),z,width:Math.min(2,L/4),d:kind==='innerGrooves'?base+1:Math.max(base+1,outsideAt(model,z)*2-2)}:model[kind][index];
 }
 if(kind==='step'&&entry.type==='taper')kind='taper-existing';
 const fields=kind==='taper-existing'?defs.taper:defs[kind];
 editor={kind,index,entry};
 $('feature-title').textContent=kind==='step'?'Ступень':kind.startsWith('taper')?'Конус':kind==='grooves'?'Канавка OD':'Канавка ID';
 $('feature-fields').replaceChildren(...fields.map(([name,label])=>field(name,label,entry[name])));
 const del=$('remove-feature');if(del)del.remove();
 if(index>=0){
  const remove=document.createElement('button');remove.type='button';remove.id='remove-feature';remove.className='button ghost';remove.textContent='Удалить операцию';
  remove.addEventListener('click',()=>{
   const next=clone(model),key=editor.kind==='step'||editor.kind==='taper-existing'?'steps':editor.kind;
   if(key==='steps'&&next.steps.length===1){$('feature-error').textContent='Нельзя удалить последнюю ступень';return}
   next[key].splice(editor.index,1);
   try{applyModel(next);$('feature-dialog').close()}catch(error){$('feature-error').textContent=error.message}
  });$('feature-fields').append(remove);
 }
 $('feature-error').textContent='';$('feature-dialog').showModal();
}
function saveEditor(event){
 event.preventDefault();const {kind,index,entry}=editor;const next=clone(model),updated={...entry};
 const fields=kind==='taper-existing'?defs.taper:defs[kind];
 for(const [name] of fields){
  const value=num($('feature-form').elements.namedItem(name).value);
  if(!Number.isFinite(value)){$('feature-error').textContent='Введи корректное число';return}
  updated[name]=value;
 }
 try{
  if(kind==='step'||kind==='taper'||kind==='taper-existing'){
   updated.type=kind.startsWith('taper')?'taper':'cylinder';
   if(kind==='taper'||index<0)next.steps.push(updated);else next.steps[index]=updated;
  }else{if(index<0)next[kind].push(updated);else next[kind][index]=updated}
  applyModel(next);$('feature-dialog').close();
 }catch(error){$('feature-error').textContent=error.message}
}
function editBase(){
 const next=clone(model);next.name=$('part-name').value.trim()||'Деталь';next.bore=num($('part-bore').value);
 try{applyModel(next);return true}catch(error){toast(error.message);render();return false}
}
function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function createStep(){
 if(generatedFile){downloadBlob(generatedFile,generatedFile.name);return}
 const btn=$('make-step');btn.disabled=true;
 const msg=$('export-message');msg.textContent='Загружаю Open CASCADE и строю B-Rep… На iPhone это может занять время.';
 try{
  if(!worker)worker=new Worker(new URL('./cad.worker.js',import.meta.url),{type:'module'});
  const id=++workerJob;
  const data=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{worker.removeEventListener('message',handler);reject(Error('Превышено время построения STEP'))},120000);
   const handler=event=>{if(event.data?.id!==id)return;clearTimeout(timeout);worker.removeEventListener('message',handler);
    event.data.ok?resolve(event.data.buffer):reject(Error(event.data.error))};
   worker.addEventListener('message',handler);worker.postMessage({id,command:'step',profile:profile.polygon});
  });
  const blob=new Blob([data],{type:'application/step'});
  if(blob.size<200)throw Error('CAD-ядро вернуло пустой STEP');
  generatedFile=new File([blob],(model.name.replace(/[^\p{L}\p{N}_-]+/gu,'_')||'detail')+'.step',{type:'application/step'});
  btn.textContent='↓ Скачать STEP';$('share-step').disabled=false;
  msg.textContent='STEP построен Open CASCADE ('+Math.round(blob.size/1024)+' КБ). Для eDrawings нажми «Поделиться» либо открой через «Файлы».';
  toast('Настоящий STEP-файл готов!');
 }catch(error){msg.textContent='STEP не создан: '+error.message;toast('Ошибка CAD: '+error.message)}
 finally{btn.disabled=false}
}
async function shareStep(){
 if(!generatedFile){toast('Сначала создай STEP');return}
 try{
  if(navigator.canShare?.({files:[generatedFile]})&&navigator.share)await navigator.share({files:[generatedFile],title:model.name});
  else{downloadBlob(generatedFile,generatedFile.name);toast('Сохрани STEP и открой через «Файлы»')}
 }catch(error){if(error.name!=='AbortError')toast('Не удалось поделиться: '+error.message)}
}
function exportProject(){
 const blob=new Blob([JSON.stringify(model,null,2)],{type:'application/json'});
 downloadBlob(blob,model.name.replace(/[^\p{L}\p{N}_-]+/gu,'_')+'.cnc.json');
}
async function importProject(file){
 if(!file)return;
 try{
  if(file.size>250000)throw Error('Файл слишком большой');
  const candidate=sanitizeModel(JSON.parse(await file.text()));
  if(!confirm('Открыть этот проект? Текущая геометрия будет заменена.'))return;
  applyModel(candidate);page('edit');chooseStep('stock');toast('Проект загружен');
 }catch(error){toast('Невозможно открыть проект: '+error.message)}
}
function setTheme(theme){
 document.documentElement.dataset.theme=theme;
 try{localStorage.setItem(THEME,theme)}catch{}
 for(const b of document.querySelectorAll('[data-theme]'))b.classList.toggle('is-active',b.dataset.theme===theme);
 $('theme-toggle').setAttribute('aria-label',theme==='dark'?'Светлая тема':'Тёмная тема');
}
function bind(){
 for(const b of document.querySelectorAll('[data-go]'))b.addEventListener('click',()=>page(b.dataset.go));
 for(const b of document.querySelectorAll('[data-step]'))b.addEventListener('click',()=>{page('edit');chooseStep(b.dataset.step)});
 $('new-project').addEventListener('click',()=>{
  if(!confirm('Создать новую деталь? Текущая будет заменена. При необходимости сначала скачай JSON.'))return;
  applyModel({version:1,name:'Новая деталь',bore:0,steps:[{id:newId(),type:'cylinder',d:38,length:37}],grooves:[],innerGrooves:[]});
  page('edit');chooseStep('stock');
 });
 $('continue-project').addEventListener('click',()=>page('edit'));
 $('load-project').addEventListener('click',()=>$('project-file').click());
 $('settings-import').addEventListener('click',()=>$('project-file').click());
 $('project-file').addEventListener('change',async event=>{await importProject(event.target.files?.[0]);event.target.value=''});
 $('download-project').addEventListener('click',exportProject);
 $('part-name').addEventListener('change',editBase);$('part-bore').addEventListener('change',editBase);
 $('add-step').addEventListener('click',()=>openEditor('step'));$('add-taper').addEventListener('click',()=>openEditor('taper'));
 $('add-od-groove').addEventListener('click',()=>openEditor('grooves'));$('add-id-groove').addEventListener('click',()=>openEditor('innerGrooves'));
 $('close-feature').addEventListener('click',()=>$('feature-dialog').close());$('cancel-feature').addEventListener('click',()=>$('feature-dialog').close());
 $('feature-form').addEventListener('submit',saveEditor);
 $('stock-next').addEventListener('click',()=>{if(editBase())chooseStep('features')});
 $('features-next').addEventListener('click',()=>page('preview'));
 $('reset-model').addEventListener('click',()=>{if(confirm('Вернуть пример Ø38 и заменить текущую деталь?'))applyModel(exampleModel())});
 $('tab-model').addEventListener('click',()=>setView('model'));$('tab-drawing').addEventListener('click',()=>setView('drawing'));
 $('reset-camera').addEventListener('click',fitCamera);$('zoom-in').addEventListener('click',()=>zoom(.78));$('zoom-out').addEventListener('click',()=>zoom(1.28));
 $('make-step').addEventListener('click',createStep);$('share-step').addEventListener('click',shareStep);
 $('theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
 for(const b of document.querySelectorAll('[data-theme]'))b.addEventListener('click',()=>setTheme(b.dataset.theme));
}
function setView(name){
 const drawing=name==='drawing';
 $('cad-canvas').hidden=drawing;$('profile-svg').hidden=!drawing;
 $('tab-model').classList.toggle('is-active',!drawing);$('tab-drawing').classList.toggle('is-active',drawing);
 $('tab-model').setAttribute('aria-selected',String(!drawing));$('tab-drawing').setAttribute('aria-selected',String(drawing));
}
restore();profile=modelProfile(model);bind();render();setTheme(document.documentElement.dataset.theme);page('home');
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));
}
