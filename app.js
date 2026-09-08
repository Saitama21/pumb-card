const CARD_RAW='4314140211726887';
const NBU_ENDPOINT='https://bank.gov.ua/NBUStatService/v1/statdirectory/exchangenew?json';
const RATE_CACHE_KEY='pumb-personal-nbu-rates-v3';
const RATE_TTL=15*60*1000;
const VISUAL_REFRESH_MS=50*1000;

const tg=window.Telegram?.WebApp;
try{tg?.ready();tg?.expand();tg?.disableVerticalSwipes?.();tg?.setHeaderColor?.('#02050d');tg?.setBackgroundColor?.('#02050d')}catch{}

function syncViewport(){
  const tgHeight=Number(tg?.viewportStableHeight||tg?.viewportHeight||0);
  const visualHeight=Number(window.visualViewport?.height||0);
  const innerHeight=Number(window.innerHeight||0);
  const inTelegram=Boolean(tg?.initData||tgHeight);
  const height=Math.max(320,Math.round(inTelegram&&tgHeight?tgHeight:(visualHeight||innerHeight)));
  document.documentElement.style.setProperty('--app-h',`${height}px`);
}
syncViewport();
window.addEventListener('resize',syncViewport,{passive:true});
window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
tg?.onEvent?.('viewportChanged',syncViewport);

const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const heroCard=document.getElementById('heroCard');
const copyBtn=document.getElementById('copyBtn');
const copyStatus=document.getElementById('copyStatus');
const copyStage=document.getElementById('copyStage');
let copyTimer=0;

async function copyWithFallback(text){
  if(window.isSecureContext&&navigator.clipboard?.writeText){
    try{await navigator.clipboard.writeText(text);return true}catch{}
  }
  const textarea=document.createElement('textarea');
  textarea.value=text;
  textarea.setAttribute('readonly','');
  textarea.setAttribute('aria-hidden','true');
  Object.assign(textarea.style,{position:'fixed',top:'0',left:'0',width:'1px',height:'1px',opacity:'0',pointerEvents:'none',fontSize:'16px'});
  document.body.appendChild(textarea);
  try{textarea.focus({preventScroll:true})}catch{textarea.focus()}
  textarea.select();
  textarea.setSelectionRange(0,text.length);
  let copied=false;
  try{copied=Boolean(document.execCommand?.('copy'))}catch{}
  textarea.remove();
  return copied;
}

function burstSuccessBubbles(){
  if(reduceMotion||!copyStage)return;
  const vectors=[[-31,-18,8],[29,-23,6],[35,6,7],[-27,17,5],[12,-34,5],[-5,31,6]];
  vectors.forEach(([x,y,size],index)=>{
    const bubble=document.createElement('i');
    bubble.className='burst-bubble';
    bubble.style.width=`${size}px`;bubble.style.height=`${size}px`;bubble.style.left='50%';bubble.style.top='34px';
    copyStage.appendChild(bubble);
    bubble.animate([
      {transform:'translate(-50%,-50%) scale(.45)',opacity:0},
      {transform:'translate(-50%,-50%) scale(1)',opacity:.96,offset:.18},
      {transform:`translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(.72)`,opacity:0}
    ],{duration:620+index*45,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'}).finished.finally(()=>bubble.remove());
  });
}

function setCopyState(state){
  heroCard?.classList.remove('is-copied','is-error');
  if(state==='success'){
    heroCard?.classList.add('is-copied');
    if(copyStatus)copyStatus.textContent='Номер скопійовано';
  }else if(state==='error'){
    heroCard?.classList.add('is-error');
    if(copyStatus)copyStatus.textContent='Не вдалося — скопіюй вручну';
  }else if(copyStatus){copyStatus.textContent='Скопіювати'}
}

async function handleCopy(){
  clearTimeout(copyTimer);
  const ok=await copyWithFallback(CARD_RAW);
  if(ok){
    setCopyState('success');
    burstSuccessBubbles();
    copyBtn?.animate?.([{transform:'scale(.9)'},{transform:'scale(1.06)',offset:.55},{transform:'scale(1)'}],{duration:520,easing:'cubic-bezier(.16,1,.3,1)'});
    try{tg?.HapticFeedback?.notificationOccurred?.('success')}catch{}
  }else{
    setCopyState('error');
    try{tg?.HapticFeedback?.notificationOccurred?.('error')}catch{}
  }
  copyTimer=window.setTimeout(()=>setCopyState('idle'),ok?2400:3200);
}
copyBtn?.addEventListener('click',handleCopy);

function initTransferMotion(){
  if(reduceMotion)return;
  const pathA=document.getElementById('flowPathA');
  const pathB=document.getElementById('flowPathB');
  const packetA=document.querySelector('.packet-a');
  const packetB=document.querySelector('.packet-b');
  const packetC=document.querySelector('.packet-c');
  const miniCard=document.querySelector('.mini-card');
  const sheen=document.querySelector('.mini-sheen');
  if(!pathA||!pathB||!packetA||!packetB||!packetC)return;
  const lenA=pathA.getTotalLength(),lenB=pathB.getTotalLength();
  let raf=0,startedAt=performance.now(),lastHit=-1;
  const place=(el,path,length,progress,opacity=1,scale=1)=>{
    const p=path.getPointAtLength(length*progress);
    el.setAttribute('transform',`translate(${p.x} ${p.y}) scale(${scale})`);
    el.style.opacity=String(opacity);
  };
  const frame=now=>{
    const cycle=5600;
    const t=((now-startedAt)%cycle)/cycle;
    const active=Math.min(1,Math.max(0,(t-.08)/.58));
    const ease=active<.5?2*active*active:1-Math.pow(-2*active+2,2)/2;
    const visible=t>.08&&t<.69;
    place(packetA,pathA,lenA,ease,visible?.96:0,1);
    place(packetB,pathB,lenB,Math.min(1,Math.max(0,ease*1.06-.1)),visible?.72:0,.9);
    place(packetC,pathA,lenA,Math.min(1,Math.max(0,ease*1.12-.22)),visible?.5:0,.7);
    const hit=t>.54&&t<.67;
    if(hit&&lastHit!==1&&miniCard){
      lastHit=1;
      miniCard.animate([
        {transform:'perspective(650px) rotateY(-9deg) rotateZ(-3deg) translateY(0)',filter:'brightness(1)'},
        {transform:'perspective(650px) rotateY(-5deg) rotateZ(-1.5deg) translateY(-2px)',filter:'brightness(1.12)',offset:.36},
        {transform:'perspective(650px) rotateY(-9deg) rotateZ(-3deg) translateY(0)',filter:'brightness(1)'}
      ],{duration:720,easing:'cubic-bezier(.16,1,.3,1)'});
      sheen?.animate?.([
        {transform:'translateX(-160%) rotate(18deg)',opacity:0},
        {opacity:.62,offset:.3},
        {transform:'translateX(390%) rotate(18deg)',opacity:0}
      ],{duration:760,easing:'cubic-bezier(.16,1,.3,1)'});
    }else if(!hit&&t<.2){lastHit=0}
    raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(raf);raf=0}
    else if(!raf){startedAt=performance.now();raf=requestAnimationFrame(frame)}
  });
  window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
}

const usdEl=document.getElementById('usdVal');
const eurEl=document.getElementById('eurVal');
const rateStatus=document.getElementById('rateStatus');
const rateRefresh=document.getElementById('rateRefresh');
const ratesPanel=document.getElementById('ratesPanel');
let ratesLoading=false,lastRateSnapshot=null;
const formatRate=value=>Number.isFinite(value)?`${value.toFixed(2)} ₴`:'—';

function readRateCache(){
  try{const cached=JSON.parse(localStorage.getItem(RATE_CACHE_KEY)||'null');return cached&&Number.isFinite(cached.fetchedAt)?cached:null}catch{return null}
}
function saveRateCache(snapshot){try{localStorage.setItem(RATE_CACHE_KEY,JSON.stringify(snapshot))}catch{}}
function relativeAge(ms){const sec=Math.max(0,Math.round(ms/1000));return sec<60?`${sec} с тому`:`${Math.round(sec/60)} хв тому`}
function renderRateStatus(mode='fresh'){
  if(!rateStatus)return;
  if(!lastRateSnapshot){rateStatus.textContent=mode==='error'?'Немає збереженого курсу':'Завантаження курсу…';return}
  const age=Date.now()-lastRateSnapshot.fetchedAt;
  const dateText=lastRateSnapshot.exchangeDate?` · ${lastRateSnapshot.exchangeDate}`:'';
  rateStatus.textContent=`${mode==='cached'?'кеш НБУ':'дані НБУ'} · ${relativeAge(age)}${dateText}`;
}
function renderRates(snapshot,mode='fresh'){
  if(!snapshot)return;
  lastRateSnapshot=snapshot;
  if(usdEl)usdEl.textContent=formatRate(snapshot.usd);
  if(eurEl)eurEl.textContent=formatRate(snapshot.eur);
  renderRateStatus(mode);
}
function pulseRates(){
  if(!ratesPanel||reduceMotion)return;
  ratesPanel.classList.remove('is-pulsing');void ratesPanel.offsetWidth;ratesPanel.classList.add('is-pulsing');
  window.setTimeout(()=>ratesPanel.classList.remove('is-pulsing'),800);
}
function animateRefreshIcon(){
  const icon=rateRefresh?.querySelector('svg');if(!icon||reduceMotion)return;
  icon.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:720,easing:'cubic-bezier(.16,1,.3,1)'});
}
async function fetchNbuRates(){
  const response=await fetch(NBU_ENDPOINT,{cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`NBU ${response.status}`);
  const data=await response.json();
  const usd=data.find(item=>item?.cc==='USD'),eur=data.find(item=>item?.cc==='EUR');
  if(!usd||!eur||!Number.isFinite(Number(usd.rate))||!Number.isFinite(Number(eur.rate)))throw new Error('NBU payload');
  return{usd:Number(usd.rate),eur:Number(eur.rate),fetchedAt:Date.now(),exchangeDate:usd.exchangedate||eur.exchangedate||''};
}
async function refreshRates({force=false,visual=true}={}){
  if(ratesLoading)return;
  if(visual){pulseRates();animateRefreshIcon()}
  const cached=readRateCache();
  if(cached&&!lastRateSnapshot)renderRates(cached,'cached');
  const freshEnough=cached&&Date.now()-cached.fetchedAt<RATE_TTL;
  if(!force&&freshEnough){renderRates(cached,'fresh');return}
  if(!navigator.onLine){cached?renderRates(cached,'cached'):renderRateStatus('error');return}
  ratesLoading=true;
  try{const snapshot=await fetchNbuRates();saveRateCache(snapshot);renderRates(snapshot,'fresh')}
  catch{cached?renderRates(cached,'cached'):renderRateStatus('error')}
  finally{ratesLoading=false}
}

const cachedRates=readRateCache();
if(cachedRates)renderRates(cachedRates,'cached');
initTransferMotion();
refreshRates({visual:false});
window.setInterval(()=>{if(document.hidden)return;renderRateStatus(lastRateSnapshot?'fresh':'error');refreshRates({visual:true})},VISUAL_REFRESH_MS);
rateRefresh?.addEventListener('click',()=>refreshRates({force:true,visual:true}));
window.addEventListener('online',()=>refreshRates({visual:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncViewport();refreshRates({visual:false})}});
