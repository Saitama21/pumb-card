import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const host='http://127.0.0.1:4173/';
const binary=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const server=spawn('node',['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'pipe'});
let browser;
async function start(){
 for(let i=0;i<70;i++){
  try{const res=await fetch(host);if(res.ok)return}catch{}
  await delay(200);
 }
 throw Error('Preview server not reachable');
}
async function checkSize(w,h){
 const page=await browser.newPage();
 await page.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:w<700,hasTouch:w<700});
 const faults=[];
 page.on('pageerror',error=>faults.push(String(error)));
 await page.goto(host,{waitUntil:'networkidle0',timeout:45000});
 // Each viewport gets its own geometry. Prevent previous viewport's saved operations from creating overlaps.
 await page.evaluate(()=>{localStorage.removeItem('cnc-toolbox-pro-current-v1');localStorage.removeItem('cnc-toolbox-shopturn-v1')});
 await page.reload({waitUntil:'networkidle0',timeout:45000});
 await page.waitForSelector('#new-project',{timeout:10000});
 const result=await page.evaluate(()=>{
  const dock=document.querySelector('.dock').getBoundingClientRect();
  const shell=document.querySelector('.app-shell');
  return {width:dock.width,center:(dock.left+dock.right)/2,bottom:window.innerHeight-dock.bottom,
   clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
   height:shell.getBoundingClientRect().height,active:document.querySelector('.dock-tab.is-active')?.textContent?.trim()};
 });
 if(Math.abs(result.width-Math.min(result.clientWidth*.87,w>=700?560:640))>1.5||Math.abs(result.center-result.clientWidth/2)>1.5||Math.abs(result.bottom-2)>1.5)throw Error('Dock geometry differs at '+w+': '+JSON.stringify(result));
 if(result.scrollWidth>w+1)throw Error('Horizontal overflow at '+w+': '+result.scrollWidth);
 if(!result.active.includes('Главная'))throw Error('Wrong landing tab at '+w);
 // ShopTurn workflow: 5-tab dock, operation list, contour editing and fixed G54.
 await page.click('[data-go="shopturn"].dock-tab');
 await page.waitForSelector('#st-ops .st-op');
 const initialOps=await page.$('#st-ops .st-op');
 if(initialOps.length!==3)throw Error('ShopTurn initial process has wrong operation count at '+w);
 await page.click('[data-st-tab="contour"]');
 await page.waitForSelector('#st-contour-svg polyline');
 const originalPoints=await page.$('#st-points .st-point');
 if(originalPoints.length<2)throw Error('ShopTurn contour points missing at '+w);
 await page.click('#st-add-line');
 await page.waitForSelector('#st-dialog[open]');
 await page.click('#st-dialog-form button[type="submit"]');
 await page.waitForSelector('#st-dialog:not([open])');
 const currentPoints=await page.$('#st-points .st-point');
 if(currentPoints.length!==originalPoints.length+1)throw Error('ShopTurn G1 contour edit was not saved at '+w);
 await page.click('[data-st-tab="header"]');
 const origin=await page.$eval('#st-header-form [name="g54"]',el=>el.value);
 if(origin!=='G54')throw Error('ShopTurn origin must always be G54');
 const toolChange=await page.$eval('#st-header-form [name="xt"],#st-header-form [name="zt"]',els=>els.map(el=>el.value));
 if(toolChange.length!==2||toolChange.some(v=>v!==''))throw Error('Unverified tool-change coordinates must stay blank');
 await page.click('[data-st-tab="checks"]');
 const statusChecks=await page.$('#st-content .st-check');
 if(statusChecks.length<6)throw Error('ShopTurn verification checklist missing');
 await page.click('[data-go="edit"].dock-tab');
 await page.waitForSelector('#editor-stock:not([hidden])');
 const blueprint=await page.evaluate(()=>({
  paths:document.querySelectorAll('#live-blueprint path').length,
  label:document.querySelector('#blueprint-description').textContent,
  viewBox:document.querySelector('#live-blueprint').getAttribute('viewBox'),
  headerClash:document.querySelector('.brand').getBoundingClientRect().right>document.querySelector('.header-right').getBoundingClientRect().left+1
 }));
 if(blueprint.paths<5||!blueprint.viewBox||blueprint.headerClash)throw Error('Live blueprint/header not ready at '+w+': '+JSON.stringify(blueprint));
 await page.click('#steps-list .feature-row:nth-child(2)');
 await page.waitForSelector('#feature-dialog[open]');
 const focus=await page.$eval('#blueprint-description',e=>e.textContent);
 if(!focus.includes('Наружная ступень')||!focus.includes('Z10,00–22,00'))throw Error('Feature selection not projected at '+w+': '+focus);
 await page.click('#cancel-feature');
 const beforeAxis=await page.$eval('#steps-list .feature-row:nth-child(2) .feature-copy small',e=>e.textContent);
 await page.click('[data-origin="right"]');
 const afterAxis=await page.$eval('#steps-list .feature-row:nth-child(2) .feature-copy small',e=>e.textContent);
 if(beforeAxis===afterAxis||!afterAxis.includes('Z15,00–27,00'))throw Error('Z origin transform failed at '+w+': '+afterAxis);
 await page.click('[data-origin="left"]');
 await page.click('#blueprint-edit');
 await page.waitForSelector('#feature-dialog[open]');
 await page.click('#cancel-feature');
 const count=await page.$$('#steps-list .feature-row');
 if(count.length!==4)throw Error('Sample has wrong operation tree at '+w);
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await delay(100);
 const target=await page.evaluate(()=>{
  const rect=document.querySelector('#stock-next').getBoundingClientRect();
  return {bottom:rect.bottom,dockTop:document.querySelector('.dock').getBoundingClientRect().top};
 });
 if(target.bottom>target.dockTop)throw Error('Primary action obscured by dock: '+JSON.stringify(target));
 await page.click('#stock-next');
 await delay(120);
 const nextStep=await page.evaluate(()=>({hidden:document.querySelector('#editor-features').hidden,toast:document.querySelector('#toast').textContent,bore:document.querySelector('#part-bore').value,errors:document.querySelector('#feature-error').textContent}));
 if(nextStep.hidden)throw Error('Stock-to-features navigation failed: '+JSON.stringify(nextStep)+' | '+faults.join(' | '));
 await page.click('#add-id-section');
 await page.waitForSelector('#feature-dialog[open]');
 await page.click('#submit-feature');
 await page.waitForSelector('#id-sections .feature-row');
 const boreCount=await page.$$('#id-sections .feature-row');
 if(boreCount.length!==1)throw Error('Dimension-based inner turning operation missing at '+w+': count='+boreCount.length+' status='+JSON.stringify(await page.evaluate(()=>({error:document.querySelector('#feature-error').textContent,dialog:document.querySelector('#feature-dialog').open,sections:document.querySelector('#id-sections').textContent,form:[...document.querySelectorAll('#feature-fields input')].map(x=>({name:x.name,value:x.value}))})))+' faults='+faults.join(' | '));
 await page.click('#id-sections .feature-row');
 await page.waitForSelector('#feature-dialog[open]');
 await page.$eval('[name="d"]',el=>el.value='25,2');
 await page.click('#submit-feature');
 const innerText=await page.$eval('#id-sections',el=>el.textContent);
 if(!innerText.includes('25,20'))throw Error('Inner bore diameter edit not reflected at '+w);
 await page.click('#group-od summary');
 await page.click('#add-od-groove');
 await page.waitForSelector('#feature-dialog[open]');
 await page.click('#submit-feature');
 await page.waitForSelector('#od-grooves .feature-row');
 const chosen=await page.$eval('#blueprint-description',el=>el.textContent);
 if(!chosen.includes('Канавка OD'))throw Error('Edited groove did not highlight on live drawing at '+w+': '+chosen);
 const selectedRegion=await page.$eval('#live-blueprint',el=>el.querySelector('[clip-path="url(#blueprint-part)"]')!==null);
 if(!selectedRegion)throw Error('Blueprint selection highlight absent at '+w);
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await delay(140);
 const bottomAction=await page.evaluate(()=>{
  const button=document.querySelector('#features-next').getBoundingClientRect(),dock=document.querySelector('.dock').getBoundingClientRect();
  return {top:button.top,bottom:button.bottom,dockTop:dock.top,scrollY:window.scrollY};
 });
 if(bottomAction.bottom>bottomAction.dockTop)throw Error('Model button under dock: '+JSON.stringify(bottomAction));
 await page.click('#features-next');
 await delay(150);
 const went=await page.$eval('#page-preview',node=>!node.hidden);
 if(!went){
  const state=await page.evaluate(()=>({stepVisible:!document.querySelector('#editor-features').hidden,
   error:document.querySelector('#toast').textContent,
   blueprint:document.querySelector('#blueprint-description').textContent,
   z:localStorage.getItem('cnc-toolbox-pro-z-origin-v1'),
   sections:document.querySelector('#id-sections').textContent,
   grooves:document.querySelector('#od-grooves').textContent}));
  throw Error('Failed to reach 3D: '+JSON.stringify(state)+' | '+faults.join(' | '));
 }
 const preview=await page.evaluate(()=>{
  const canvas=document.querySelector('#cad-canvas');
  return {rendered:canvas.width>100&&canvas.height>100,tree:document.querySelectorAll('.tree-entry').length,
   tab:document.querySelector('#tab-model').getAttribute('aria-selected')};
 });
 if(!preview.rendered||preview.tree<7||preview.tab!=='true')throw Error('Model viewer not ready at '+w+': '+JSON.stringify(preview));
 await page.click('#tab-drawing');
 const drawing=await page.$eval('#profile-svg',el=>!el.hidden&&el.querySelectorAll('path').length>1);
 if(!drawing)throw Error('Dimensional profile missing at '+w);
 await page.click('#tab-model');
 if(faults.length)throw Error('Runtime errors at '+w+': '+faults.join(' | '));
 if(w===390){
  await page.click('#make-step');
  await page.waitForFunction(()=>!document.querySelector('#share-step').disabled||document.querySelector('#export-message').textContent.startsWith('STEP не создан'),{timeout:110000});
  const status=await page.$eval('#export-message',el=>el.textContent);
  if(!status.includes('STEP построен Open CASCADE'))throw Error('Real CAD STEP export failed: '+status);
  await page.evaluate(()=>{
   Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
   Object.defineProperty(navigator,'share',{configurable:true,value:async ({files})=>{window.__stepContent=await files[0].text()}});
  });
  await page.click('#share-step');
  await page.waitForFunction(()=>typeof window.__stepContent==='string',{timeout:10000});
  const validStep=await page.evaluate(()=>window.__stepContent.includes('ISO-10303-21')&&window.__stepContent.includes('DATA;'));
  if(!validStep)throw Error('Exported shared file is not a real STEP exchange document');
  console.log('Verified actual Open CASCADE ISO-10303-21 STEP bytes and share workflow');
 }
 await page.close();
 console.log('PASS responsive CAD',w,h);
}
try{
 await start();
 browser=await puppeteer.launch({executablePath:binary,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 for(const [w,h] of [[390,844],[375,740],[320,667],[768,900]])await checkSize(w,h);
}catch(error){console.error('SMOKE FAILED:',error.stack||error);process.exitCode=1}
finally{await browser?.close();server.kill('SIGTERM')}
