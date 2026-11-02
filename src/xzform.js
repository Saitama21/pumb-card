import {examplePart,normalizePart,buildPart,fromLegacy,newId,round} from './xzform-core.js';
import {updatePreview,fitCamera,zoom} from './preview.js';
const $=id=>document.getElementById(id);
const STORAGE='xzform-3d-part-v1',THEME='xzform-3d-theme-v1';
let part=examplePart(),geometry=null,selected=0,view='contour',lastError='',history=[],future=[],rev=0,last3D=-1,busy=false;
let showGrid=false,showDims=true,showSection=true,autoSpin=false,worker=null;
const fmt=n=>Number(n).toFixed(3),number=s=>Number(String(s).trim().replace(',','.'));
const clone=()=>structuredClone(part);
function toast(message){const t=$('toast');t.textContent=String(message);t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,3200);}
function restore(){
 try{
  const saved=localStorage.getItem(STORAGE);
  if(saved)part=normalizePart(JSON.parse(saved));
  else {
   const legacy=localStorage.getItem('cnc-toolbox-pro-current-v1');
   if(legacy){try{part=fromLegacy(JSON.parse(legacy))}catch{part=examplePart();}}
  }
 }catch{part=examplePart();}
 try{document.documentElement.dataset.theme=localStorage.getItem(THEME)==='dark'?'dark':'light';}catch{document.documentElement.dataset.theme='light';}
}
function saveLocal(){try{localStorage.setItem(STORAGE,JSON.stringify(part));}catch{toast('Локальное сохранение недоступно. Экспортируй JSON');}}
function syncMetadata(){
 $('project-name-sidebar').textContent=part.name;
 $('project-material-sidebar').textContent=part.material||'Материал не указан';
 $('part-name').value=part.name;
 $('part-material').value=part.material;
 document.title='XZFORM 3D · '+part.name;
}
function commit(change){
 const previous=clone();
 change();rev++;history.push(previous);if(history.length>80)history.shift();future=[];
 renderAll();
 if(!lastError)saveLocal();
}
function setPart(next){const normal=normalizePart(next);buildPart(normal);history.push(clone());if(history.length>80)history.shift();future=[];part=normal;selected=0;rev++;renderAll();saveLocal();}
function moveHistory(stack,other){if(!stack.length)return toast('История пуста');other.push(clone());part=stack.pop();selected=Math.min(selected,part.points.length-1);rev++;renderAll();if(!lastError)saveLocal();}
function renderTables(){
 const tbody=$('points-body');tbody.replaceChildren();
 part.points.forEach((p,i)=>{
  const tr=document.createElement('tr');tr.dataset.index=i;if(i===selected)tr.className='active';
  const kind=i===0?'◉ Старт':'→ Линия';
  tr.innerHTML='<td>'+(i+1)+'</td><td class="point-kind">'+kind+'</td>'+
   '<td><input name="x" inputmode="decimal" aria-label="Точка '+(i+1)+' диаметр X" value="'+fmt(p.x)+'"></td>'+
   '<td><input name="z" inputmode="decimal" aria-label="Точка '+(i+1)+' координата Z" value="'+fmt(p.z)+'"></td>'+
   '<td><div class="row-tools"><button class="row-move" data-move="-1" aria-label="Поднять точку">↑</button><button class="row-move" data-move="1" aria-label="Опустить точку">↓</button></div></td>';
  tbody.append(tr);
 });
 const holes=$('holes-body');holes.replaceChildren();
 part.holes.forEach((h,i)=>{
  const tr=document.createElement('tr');tr.dataset.index=i;
  tr.innerHTML='<td>'+(i+1)+'</td><td><input name="d" inputmode="decimal" aria-label="Диаметр отверстия '+(i+1)+'" value="'+fmt(h.d)+'"></td>'+
   '<td><input name="z0" inputmode="decimal" aria-label="Начало отверстия '+(i+1)+'" value="'+fmt(h.z0)+'"></td>'+
   '<td><input name="z1" inputmode="decimal" aria-label="Конец отверстия '+(i+1)+'" value="'+fmt(h.z1)+'"></td>'+
   '<td><button class="hole-delete" data-delete-hole aria-label="Удалить отверстие">×</button></td>';
  holes.append(tr);
 });
}
function svgDraw(){
 const svg=$('drawing-svg');
 if(!geometry){svg.replaceChildren();return;}
 const {profile,zMin,zMax,maxD,length}=geometry;
 const W=680,H=300,cy=147,scale=Math.min(470/length,172/maxD),X=z=>113+z*scale,Y=r=>cy-r*scale;
 const path=(nodes,sign)=>nodes.map((v,i)=>(i?'L':'M')+X(v[1]).toFixed(2)+' '+Y(sign*v[0]).toFixed(2)).join(' ')+'Z';
 const outer=(sign)=>profile.outer.map((v,i)=>(i?'L':'M')+X(v[1]).toFixed(2)+' '+Y(sign*v[0]).toFixed(2)).join(' ');
 const hatch='<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V8" stroke="#b6d4fa" stroke-width="2"/></pattern></defs>';
 let markup=hatch;
 if(showGrid){for(let n=0;n<=W;n+=25)markup+='<path d="M'+n+' 0V300" stroke="#e7eef6" stroke-width=".8"/>';for(let n=0;n<=H;n+=25)markup+='<path d="M0 '+n+'H680" stroke="#e7eef6" stroke-width=".8"/>';}
 if(showSection){
  markup+='<path d="'+path(profile.polygon,1)+'" fill="url(#hatch)" stroke="none"/>';
  markup+='<path d="'+path(profile.polygon,-1)+'" fill="url(#hatch)" stroke="none"/>';
 }
 markup+='<path d="'+outer(1)+' '+outer(-1)+'" fill="none" stroke="#2163a3" stroke-width="2.5" stroke-linejoin="round"/>';
 if(profile.inner.length){
  const q=profile.inner;
  for(const s of [1,-1])markup+='<path d="'+q.map((v,i)=>(i?'L':'M')+X(v[1]).toFixed(2)+' '+Y(s*v[0]).toFixed(2)).join(' ')+'" fill="none" stroke="#2163a3" stroke-width="2.3"/>';
 }
 markup+='<path d="M60 '+cy+'H625" stroke="#7f94a9" stroke-dasharray="10 7" stroke-width="1.1"/>';
 const last=X(length),first=X(0);
 if(showDims){
  const dimY=261,top=cy-maxD*scale/2,bot=cy+maxD*scale/2;
  markup+='<g fill="#263d59" stroke="#41566a" font-family="Arial,sans-serif">'+
   '<path d="M'+first+' '+(bot+4)+'v34M'+last+' '+(bot+4)+'v34M'+first+' '+dimY+'H'+last+'" fill="none" stroke-width="1.15"/>'+
   '<path d="M'+first+' '+dimY+'l7 -3v6zM'+last+' '+dimY+'l-7 -3v6z" fill="#41566a" stroke="none"/>'+
   '<text x="'+(first+last)/2+'" y="'+(dimY-8)+'" stroke="none" font-size="16" text-anchor="middle" font-weight="700">'+fmt(length)+' мм</text>'+
   '<path d="M'+(first-20)+' '+(cy-profile.outer[0][0]*scale)+'V'+(cy+profile.outer[0][0]*scale)+'" fill="none" stroke-width="1.2"/>'+
   '<text x="'+(first-29)+'" y="'+(cy+5)+'" text-anchor="end" stroke="none" font-size="17" font-weight="700">Ø'+fmt(part.points.find(p=>Math.abs(p.z-zMin)<1e-6)?.x||maxD)+'</text>'+
   '<text x="'+(last+13)+'" y="'+(cy+5)+'" stroke="none" font-size="16" font-weight="700">Ø'+fmt(part.points.find(p=>Math.abs(p.z-zMax)<1e-6)?.x||maxD)+'</text></g>';
 }
 const selectedPoint=part.points[selected];
 if(selectedPoint){
  const x=X(selectedPoint.z-zMin),y=Y(selectedPoint.x/2);
  markup+='<circle cx="'+x+'" cy="'+y+'" r="6" fill="#ec9f27" stroke="#fff" stroke-width="2"/>';
 }
 markup+='<text x="14" y="20" font-size="11" fill="#617e9a" font-family="Arial,sans-serif">XZFORM · X = Ø мм · Z0 справа</text>';
 svg.innerHTML=markup;
}
function update3D(){
 if(!geometry||last3D===rev||!(window.innerWidth>760||view==='model'))return;
 try{updatePreview($('cad-canvas'),geometry.profile);last3D=rev;$('model-error').hidden=true;}
 catch(error){$('model-error').hidden=false;$('model-error').textContent='3D недоступно: '+error.message;}
}
function renderAll(){
 syncMetadata();renderTables();
 try{geometry=buildPart(part);lastError='';$('drawing-error').hidden=true;$('model-error').hidden=true;svgDraw();update3D();}
 catch(error){geometry=null;lastError=error.message;svgDraw();$('drawing-error').hidden=false;$('drawing-error').textContent=error.message;$('model-error').hidden=false;$('model-error').textContent='Исправь геометрию: '+error.message;}
 document.querySelectorAll('[data-action="export-step"]').forEach(b=>b.disabled=!!lastError||busy);
 document.querySelectorAll('[data-action="undo"]').forEach(b=>b.disabled=!history.length);
 document.querySelectorAll('[data-action="redo"]').forEach(b=>b.disabled=!future.length);
 $('export-status').textContent=lastError?'Ошибка геометрии: '+lastError:'Модель проверена · '+fmt(geometry.length)+' мм · Ø'+fmt(geometry.maxD);
}
function setView(next){
 if(!['contour','holes','drawing','model','settings','export'].includes(next))return;
 view=next;$('workspace').dataset.view=next;
 document.querySelectorAll('[data-view]').forEach(b=>{
  const on=b.dataset.view===next;
  b.classList.toggle('active',on&&b.closest('.sidebar')!==null);
  b.classList.toggle('is-active',on&&b.closest('.dock')!==null);
  if(b.closest('.dock'))on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
  if(b.closest('.menu-bar'))b.classList.toggle('selected',on||(next==='holes'&&b.dataset.view==='contour')||(next==='settings'&&b.dataset.view==='contour'));
 });
 requestAnimationFrame(update3D);
}
function addPoint(mode){
 commit(()=>{
  const at=selected,p=part.points,q=part.points[at],next=p[at+1];
  if(mode==='append'){
   const last=p.at(-1),dir=p.length>1?Math.sign(last.z-p[0].z)||-1:-1;
   p.push({id:newId(),x:last.x,z:round(last.z+dir*5)});selected=p.length-1;
  }else if(mode==='insert'||mode==='duplicate'){
   const z=next?(q.z+next.z)/2:q.z+(p.length>1?(Math.sign(q.z-p[0].z)||-1): -1)*5;
   const x=mode==='duplicate'?q.x:next?(q.x+next.x)/2:q.x;
   p.splice(at+1,0,{id:newId(),x:round(x),z:round(z)});selected=at+1;
  }
 });
 setView('contour');
}
function action(kind){
 if(kind==='add')return addPoint('append');
 if(kind==='insert')return addPoint('insert');
 if(kind==='duplicate')return addPoint('duplicate');
 if(kind==='delete'){
  if(part.points.length<=2)return toast('Необходимо минимум две точки');
  commit(()=>{part.points.splice(selected,1);selected=Math.max(0,selected-1);});return;
 }
 if(kind==='undo')return moveHistory(history,future);
 if(kind==='redo')return moveHistory(future,history);
 if(kind==='new'){
  if(!window.confirm('Создать новую деталь? Текущий проект можно сохранить в JSON.'))return;
  const next={version:2,name:'Новая деталь',material:'',origin:'right',points:[{id:newId(),x:20,z:0},{id:newId(),x:20,z:-30}],holes:[]};
  return setPart(next);
 }
 if(kind==='add-hole'){
  if(!geometry)return toast('Сначала исправь наружный контур');
  const sample=geometry.part,mid=Math.min(...sample.points.map(p=>p.x))*.3;
  commit(()=>part.holes.push({id:newId(),d:round(mid),z0:geometry.zMin,z1:geometry.zMax}));
  return setView('holes');
 }
 if(kind==='validate'){try{const x=buildPart(part);toast('Геометрия корректна: L '+fmt(x.length)+' мм, Ø '+fmt(x.maxD)+' мм');}catch(error){toast(error.message)}return;}
 if(kind==='save')return saveJSON();
 if(kind==='open')return $('open-file').click();
 if(kind==='export-step')return exportSTEP();
}
function saveJSON(){
 if(lastError)return toast('Исправь геометрию перед сохранением');
 download(new Blob([JSON.stringify(part,null,2)],{type:'application/json'}),part.name+'.json');
 toast('Проект JSON сохранён');
}
function download(blob,name){
 const a=document.createElement('a'),url=URL.createObjectURL(blob);
 a.href=url;a.download=name.replace(/[/\\:*?"<>|]/g,'_');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function importJSON(file){
 try{
  if(file.size>2_000_000)throw Error('Слишком большой JSON');
  const raw=JSON.parse(await file.text());
  const next=raw?.version===2&&Array.isArray(raw.points)?normalizePart(raw):fromLegacy(raw);
  setPart(next);toast('Проект открыт: '+part.name);
 }catch(error){toast('Импорт не выполнен: '+error.message);}
}
async function exportSTEP(){
 if(busy)return;
 let profile;try{profile=buildPart(part).profile;}catch(error){return toast(error.message)}
 busy=true;document.querySelectorAll('[data-action="export-step"]').forEach(b=>b.disabled=true);
 $('export-status').textContent='Open CASCADE: построение STEP…';
 try{
  worker??=new Worker(new URL('./cad.worker.js',import.meta.url),{type:'module'});
  const id=newId(),reply=await new Promise((resolve,reject)=>{
   const handler=e=>{if(e.data?.id!==id)return;worker.removeEventListener('message',handler);e.data.ok?resolve(e.data.buffer):reject(Error(e.data.error||'STEP не создан'));};
   worker.addEventListener('message',handler);worker.postMessage({id,command:'step',profile:profile.polygon});
  });
  const blob=new Blob([reply],{type:'application/step'});
  download(blob,part.name+'.step');$('export-status').textContent='STEP создан · '+Math.round(blob.size/1024)+' КБ';toast('STEP сформирован Open CASCADE');
 }catch(error){$('export-status').textContent='Ошибка STEP: '+error.message;toast(error.message);}
 finally{busy=false;document.querySelectorAll('[data-action="export-step"]').forEach(b=>b.disabled=!!lastError);}
}
function updateRow(target,collection){
 const input=target.closest('input'),tr=target.closest('tr');if(!input||!tr)return;
 const index=Number(tr.dataset.index),key=input.name,n=number(input.value);
 if(!Number.isFinite(n)){toast('Введите числовое значение');input.focus();return;}
 commit(()=>{part[collection][index][key]=round(n);});
 if(lastError)toast(lastError);
}
function bind(){
 document.addEventListener('click',event=>{
  const actionBtn=event.target.closest('[data-action]');
  if(actionBtn){action(actionBtn.dataset.action);return;}
  const viewBtn=event.target.closest('[data-view]');if(viewBtn){setView(viewBtn.dataset.view);return;}
 });
 $('points-body').addEventListener('click',event=>{
  const tr=event.target.closest('tr');if(!tr)return;
  const i=Number(tr.dataset.index),move=event.target.closest('[data-move]');
  if(move){const j=i+Number(move.dataset.move);if(j<0||j>=part.points.length)return;
   commit(()=>{[part.points[i],part.points[j]]=[part.points[j],part.points[i]];selected=j;});if(lastError)toast(lastError);return;}
  if(selected!==i){selected=i;document.querySelectorAll('#points-body tr').forEach((r,n)=>r.classList.toggle('active',n===i));svgDraw();}
 });
 $('points-body').addEventListener('change',event=>updateRow(event.target,'points'));
 $('holes-body').addEventListener('change',event=>updateRow(event.target,'holes'));
 $('holes-body').addEventListener('click',event=>{
  const b=event.target.closest('[data-delete-hole]');if(!b)return;
  const i=Number(b.closest('tr').dataset.index);commit(()=>part.holes.splice(i,1));
 });
 $('open-file').addEventListener('change',async e=>{const file=e.target.files[0];if(file)await importJSON(file);e.target.value='';});
 $('rename-project').addEventListener('click',()=>setView('settings'));
 $('settings-top').addEventListener('click',()=>setView('settings'));
 const setTheme=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem(THEME,next);};
 $('theme-toggle').addEventListener('click',setTheme);$('settings-theme').addEventListener('click',setTheme);
 $('part-name').addEventListener('change',e=>commit(()=>part.name=String(e.target.value||'Деталь').slice(0,80)));
 $('part-material').addEventListener('change',e=>commit(()=>part.material=String(e.target.value).slice(0,60)));
 $('toggle-grid').addEventListener('click',e=>{showGrid=!showGrid;e.currentTarget.classList.toggle('selected',showGrid);svgDraw();});
 $('toggle-dims').addEventListener('click',e=>{showDims=!showDims;e.currentTarget.classList.toggle('selected',showDims);svgDraw();});
 $('toggle-section').addEventListener('click',e=>{showSection=!showSection;e.currentTarget.classList.toggle('selected',showSection);svgDraw();});
 $('drawing-dims').addEventListener('click',()=>{showDims=true;$('toggle-dims').classList.add('selected');svgDraw();setView('drawing');});
 $('profile-tab').addEventListener('click',()=>{showDims=false;$('toggle-dims').classList.remove('selected');svgDraw();setView('drawing');});
 $('fit-drawing').addEventListener('click',()=>svgDraw());
 $('model-fit').addEventListener('click',()=>fitCamera());
 $('model-rotate').addEventListener('click',e=>{autoSpin=!autoSpin;e.currentTarget.classList.toggle('selected',autoSpin);toast(autoSpin?'Для вращения модели перетащи её пальцем или мышью':'Вид модели зафиксирован');});
 $('model-zoom-in').addEventListener('click',()=>zoom(.8));
 $('model-zoom-out').addEventListener('click',()=>zoom(1.25));
 window.addEventListener('online',networkStatus);window.addEventListener('offline',networkStatus);
 window.addEventListener('resize',()=>update3D());
 document.addEventListener('keydown',event=>{
  if(event.target.matches('input,textarea')||event.target.isContentEditable)return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();action(event.shiftKey?'redo':'undo');}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveJSON();}
  if(event.key==='Insert'){event.preventDefault();addPoint('insert');}
 });
}
function networkStatus(){
 $('offline-status').textContent=navigator.onLine?'● PWA · локально':'● Офлайн (PWA)';
}
async function registerWorker(){
 if(!('serviceWorker' in navigator)||!import.meta.env.PROD)return;
 try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});}catch(error){console.warn('Offline SW unavailable:',error);}
}
restore();bind();networkStatus();renderAll();setView('contour');registerWorker();
