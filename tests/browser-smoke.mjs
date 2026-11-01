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
 await page.waitForSelector('#new-project',{timeout:10000});
 const result=await page.evaluate(()=>{
  const dock=document.querySelector('.dock').getBoundingClientRect();
  const shell=document.querySelector('.app-shell');
  return {width:dock.width,center:(dock.left+dock.right)/2,bottom:window.innerHeight-dock.bottom,
   clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
   height:shell.getBoundingClientRect().height,active:document.querySelector('.dock-tab.is-active')?.textContent?.trim()};
 });
 if(Math.abs(result.width-result.clientWidth*.87)>1.5||Math.abs(result.center-result.clientWidth/2)>1.5||Math.abs(result.bottom-2)>1.5)throw Error('Dock geometry differs at '+w+': '+JSON.stringify(result));
 if(result.scrollWidth>w+1)throw Error('Horizontal overflow at '+w+': '+result.scrollWidth);
 if(!result.active.includes('Главная'))throw Error('Wrong landing tab at '+w);
 await page.click('[data-go="edit"].dock-tab');
 await page.waitForSelector('#editor-stock:not([hidden])');
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
 await page.click('#add-od-groove');
 await page.waitForSelector('#feature-dialog[open]');
 await page.click('#submit-feature');
 await page.waitForSelector('#od-grooves .feature-row');
 await page.click('#features-next');
 await page.waitForSelector('#page-preview:not([hidden])');
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
  console.log('Verified exact Open CASCADE STEP export in Chromium');
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
