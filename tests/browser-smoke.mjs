import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const host='http://127.0.0.1:4173/';
const binary=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'});
let browser;
async function start(){
 for(let i=0;i<80;i++){
  try{const r=await fetch(host);if(r.ok)return}catch{}
  await delay(200);
 }
 throw Error('XZFORM preview server not reachable');
}
async function viewportCheck(w,h){
 const page=await browser.newPage();
 await page.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:w<=760,hasTouch:w<=760});
 const faults=[];
 page.on('pageerror',e=>faults.push(String(e)));
 await page.goto(host,{waitUntil:'networkidle0',timeout:60000});
 await page.evaluate(()=>localStorage.removeItem('xzform-3d-part-v1'));
 await page.reload({waitUntil:'networkidle0',timeout:60000});
 await page.waitForSelector('#points-body tr',{timeout:10000});
 let result=await page.evaluate(()=>{
  const dock=document.querySelector('.dock').getBoundingClientRect();
  return {width:dock.width,center:(dock.left+dock.right)/2,bottom:window.innerHeight-dock.bottom,
   client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
   title:document.title,points:document.querySelectorAll('#points-body tr').length,
   holes:document.querySelectorAll('#holes-body tr').length,
   drawing:document.querySelectorAll('#drawing-svg path').length};
 });
 if(Math.abs(result.width-Math.min(result.client*.87,640))>1.5||Math.abs(result.center-result.client/2)>1.5||Math.abs(result.bottom-2)>1.5)
  throw Error('Fixed dock differs from approved layout at '+w+': '+JSON.stringify(result));
 if(result.scroll>result.client+1)throw Error('Horizontal overflow '+w+': '+JSON.stringify(result));
 if(!result.title.includes('XZFORM 3D')||result.points!==4||result.holes!==1||result.drawing<3)
  throw Error('Initial CAD workspace wrong '+w+': '+JSON.stringify(result));
 // Change a real diameter and ensure the model remains valid.
 await page.$eval('#points-body tr:nth-child(2) input[name=x]',el=>{
  el.value='20';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('Модель проверена'));
 const newDiameter=await page.$eval('#points-body tr:nth-child(2) input[name=x]',el=>el.value);
 if(newDiameter!=='20.000')throw Error('Coordinate edit did not persist at '+w);
 // Undo/redo must restore values.
 await page.click('[data-action=undo].panel-actions button, .panel-actions [data-action=undo]');
 let previous=await page.$eval('#points-body tr:nth-child(2) input[name=x]',el=>el.value);
 if(previous!=='18.000')throw Error('Undo incorrect '+w+': '+previous);
 await page.click('.panel-actions [data-action=redo]');
 previous=await page.$eval('#points-body tr:nth-child(2) input[name=x]',el=>el.value);
 if(previous!=='20.000')throw Error('Redo incorrect '+w+': '+previous);
 // Invalid geometry must invalidate STEP, then recover.
 await page.$eval('#points-body tr:nth-child(3) input[name=z]',el=>{
  el.value='12';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 const invalid=await page.$eval('[data-action=export-step]',el=>el.disabled);
 if(!invalid)throw Error('STEP not blocked on nonmonotonic contour '+w);
 await page.$eval('#points-body tr:nth-child(3) input[name=z]',el=>{
  el.value='-37';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 const valid=await page.$eval('[data-action=export-step]',el=>!el.disabled);
 if(!valid)throw Error('Recovery after bad geometry failed '+w);
 // Mobile workspaces must appear on-demand, desktop canvas must be rendered.
 await page.click('.dock [data-view=holes]');
 const holesVisible=await page.$eval('.holes-panel',el=>getComputedStyle(el).display!=='none');
 if(!holesVisible)throw Error('Holes view invisible '+w);
 await page.click('.dock [data-view=drawing]');
 const drawingVisible=await page.$eval('.drawing-panel',el=>getComputedStyle(el).display!=='none');
 if(!drawingVisible)throw Error('Drawing view invisible '+w);
 await page.click('.dock [data-view=model]');
 await page.waitForFunction(()=>document.querySelector('#cad-canvas').width>100&&document.querySelector('#cad-canvas').height>100,{timeout:25000});
 await page.click('.dock [data-view=export]');
 const exportVisible=await page.$eval('.export-panel',el=>getComputedStyle(el).display!=='none');
 if(!exportVisible)throw Error('Export view invisible '+w);
 if(faults.length)throw Error('JavaScript runtime errors: '+faults.join(' | '));
 if(w===390){
  // Intercept the user's generated download to verify an actual B-Rep STEP rather than a mock.
  await page.evaluate(()=>{
   const original=URL.createObjectURL.bind(URL);
   URL.createObjectURL=blob=>{window.__generatedBlob=blob;return original(blob);};
  });
  await page.click('.export-content [data-action=export-step]');
  await page.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('STEP создан')||document.querySelector('#export-status').textContent.includes('Ошибка STEP'),{timeout:115000});
  const status=await page.$eval('#export-status',e=>e.textContent);
  if(!status.includes('STEP создан'))throw Error('Open CASCADE export failed: '+status);
  const step=await page.evaluate(async()=>{
   const b=window.__generatedBlob;const t=await b.text();
   return {size:b.size,header:t.slice(0,180),ok:t.includes('ISO-10303-21')&&t.includes('DATA;')};
  });
  if(!step.ok||step.size<1000)throw Error('Generated STEP is not a real CAD exchange file: '+JSON.stringify(step));
  console.log('PASS Open CASCADE STEP binary',step.size);
 }
 // Mobile regression: a two-point contour must not become a full-height blank card.
 if(w<=760){
  const fixture={version:2,name:'Two points',material:'AISI 304',origin:'right',
   points:[{id:'p0',x:31,z:0},{id:'p1',x:31,z:-5}],holes:[]};
  await page.evaluate(value=>localStorage.setItem('xzform-3d-part-v1',JSON.stringify(value)),fixture);
  await page.reload({waitUntil:'networkidle0',timeout:60000});
  await page.waitForSelector('#points-body tr:nth-child(2)');
  const compact=await page.evaluate(()=>{
   const card=document.querySelector('.contour-panel').getBoundingClientRect();
   const table=document.querySelector('.contour-panel .table-scroll').getBoundingClientRect();
   const footer=document.querySelector('.contour-panel .panel-bottom').getBoundingClientRect();
   return {cardHeight:card.height,tableHeight:table.height,
    gap:footer.top-table.bottom,
    dockTop:document.querySelector('.dock').getBoundingClientRect().top};
  });
  if(compact.cardHeight>=370||compact.tableHeight>=180||Math.abs(compact.gap)>4)
   throw Error('Sparse point table stretches to fill viewport at '+w+': '+JSON.stringify(compact));
  const many={...fixture,points:Array.from({length:45},(_,i)=>({id:'p'+i,x:31,z:-i}))};
  await page.evaluate(value=>localStorage.setItem('xzform-3d-part-v1',JSON.stringify(value)),many);
  await page.reload({waitUntil:'networkidle0',timeout:60000});
  await page.waitForSelector('#points-body tr:nth-child(45)');
  const dense=await page.evaluate(()=>{
   const card=document.querySelector('.contour-panel').getBoundingClientRect();
   const area=document.querySelector('.contour-panel .table-scroll');
   return {cardBottom:card.bottom,dockTop:document.querySelector('.dock').getBoundingClientRect().top,
    client:area.clientHeight,scroll:area.scrollHeight,footer:document.querySelector('.contour-panel .panel-bottom').getBoundingClientRect().bottom};
  });
  if(dense.scroll<=dense.client+30||dense.cardBottom>=dense.dockTop-5||dense.footer>=dense.dockTop-5)
   throw Error('Large point table hides actions behind dock at '+w+': '+JSON.stringify(dense));
  console.log('PASS content-sized mobile tables: short and 45-point contours',w);
 }
 console.log('PASS XZFORM browser',w,h);
 await page.close();
}
try{
 await start();
 browser=await puppeteer.launch({executablePath:binary,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const [w,h] of [[390,844],[375,740],[320,667],[768,900],[1280,800]])await viewportCheck(w,h);
}catch(error){console.error('XZFORM SMOKE FAILED:',error.stack||error);process.exitCode=1;}
finally{await browser?.close();server.kill('SIGTERM');}
