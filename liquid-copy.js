// PUMB Card — Liquid Orb SVG copy button. Visual layer only; app.js keeps copy behavior.
(() => {
  'use strict';
  const btn=document.getElementById('copyBtn');
  const hero=document.getElementById('heroCard');
  const stage=document.getElementById('copyStage');
  if(!btn||!hero||!stage)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;

  const css=document.createElement('style');
  css.textContent=`
    .copy-stage{margin-top:clamp(18px,3.3vh,27px)!important;gap:7px!important}
    .hero .copy-drop.orb-v3{position:relative!important;width:94px!important;height:94px!important;border:0!important;border-radius:50%!important;padding:0!important;background:transparent!important;box-shadow:none!important;filter:none!important;animation:none!important;overflow:visible!important;isolation:isolate;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .hero .copy-drop.orb-v3::before,.hero .copy-drop.orb-v3::after,.hero .copy-drop.orb-v3>.drop-highlight,.hero .copy-drop.orb-v3>.drop-ring,.hero .copy-drop.orb-v3>.copy-icon,.hero .copy-drop.orb-v3>.check-icon{display:none!important}
    .hero .copy-drop.orb-v3 .orb-svg{position:absolute!important;inset:-10px!important;width:114px!important;height:114px!important;max-width:none!important;fill:none!important;stroke:none!important;filter:none!important;pointer-events:none!important;overflow:visible!important;z-index:0!important}
    .orb-ui{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;pointer-events:none;color:#f5f8ff;text-shadow:0 0 12px #9eb2ff55}
    .orb-copy-glyph{position:relative;width:23px;height:22px;filter:drop-shadow(0 0 5px #c4d2ff66)}
    .orb-copy-glyph::before,.orb-copy-glyph::after{content:'';position:absolute;width:12px;height:12px;border:1.6px solid #f5f8ff;border-radius:3px}
    .orb-copy-glyph::before{left:2px;top:2px;opacity:.78}.orb-copy-glyph::after{right:2px;bottom:2px;background:#16203ad9}
    .orb-check-glyph{display:none;width:24px;height:24px;border:1.5px solid #88ffc0;border-radius:50%;position:relative;box-shadow:0 0 12px #56ffa866}
    .orb-check-glyph::after{content:'';position:absolute;left:6px;top:5px;width:9px;height:5px;border-left:2px solid #aaffca;border-bottom:2px solid #aaffca;transform:rotate(-45deg)}
    .orb-label{font-size:10px;line-height:1;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
    .hero.is-copied .orb-copy-glyph{display:none}.hero.is-copied .orb-check-glyph{display:block}.hero.is-copied .orb-label{color:#b6ffd3}
    .hero.is-error .orb-label{color:#ffadc3}
    .hero .copy-status{margin-top:5px!important;font-size:clamp(7px,2vw,8.4px)!important}
    .hero .copy-drop.orb-v3:focus-visible{outline:2px solid #b9c7ff;outline-offset:7px}
    @media(max-width:370px){.hero .copy-drop.orb-v3{width:84px!important;height:84px!important}.hero .copy-drop.orb-v3 .orb-svg{inset:-9px!important;width:102px!important;height:102px!important}.orb-label{font-size:9px}.copy-stage{margin-top:15px!important}}
    @media(max-height:730px){.hero .copy-drop.orb-v3{width:76px!important;height:76px!important}.hero .copy-drop.orb-v3 .orb-svg{inset:-8px!important;width:92px!important;height:92px!important}.orb-label{font-size:8px}.orb-copy-glyph{transform:scale(.82)}.orb-check-glyph{transform:scale(.82)}}
  `;
  document.head.appendChild(css);

  btn.className='copy-drop orb-v3';
  btn.innerHTML=`
    <svg class="orb-svg" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="orbFill" cx="34%" cy="24%" r="88%"><stop id="f0" offset="0" stop-color="#343b67"/><stop id="f1" offset=".53" stop-color="#151d38"/><stop id="f2" offset="1" stop-color="#090e20"/></radialGradient>
        <linearGradient id="orbEdge" x1="8%" y1="8%" x2="92%" y2="92%"><stop id="e0" offset="0" stop-color="#ff77d2"/><stop id="e1" offset=".48" stop-color="#e5eaff"/><stop id="e2" offset="1" stop-color="#508aff"/></linearGradient>
        <linearGradient id="orbWave" x1="0" y1="0" x2="1" y2="0"><stop id="w0" offset="0" stop-color="#70adff" stop-opacity=".12"/><stop id="w1" offset=".52" stop-color="#e8eeff" stop-opacity=".92"/><stop id="w2" offset="1" stop-color="#a46bff" stop-opacity=".72"/></linearGradient>
        <linearGradient id="orbWaveFill" x1="0" y1="0" x2="0" y2="1"><stop id="wf" offset="0" stop-color="#7bb5ff" stop-opacity=".17"/><stop offset="1" stop-color="#7bb5ff" stop-opacity="0"/></linearGradient>
        <radialGradient id="orbHaloGrad"><stop id="h0" offset="0" stop-color="#738cff" stop-opacity=".28"/><stop id="h1" offset=".62" stop-color="#b85cff" stop-opacity=".14"/><stop offset="1" stop-color="#b85cff" stop-opacity="0"/></radialGradient>
        <filter id="orbBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5.5"/></filter>
      </defs>
      <circle id="halo" cx="60" cy="60" r="48" fill="url(#orbHaloGrad)" filter="url(#orbBlur)"/>
      <path id="blob" fill="url(#orbFill)" stroke="url(#orbEdge)" stroke-width="1.9"/>
      <path id="inner" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width=".8"/>
      <path id="sheen" fill="none" stroke="#ffffff" stroke-opacity=".30" stroke-width="2.6" stroke-linecap="round"/>
      <path id="waveArea" fill="url(#orbWaveFill)"/>
      <path id="wave" fill="none" stroke="url(#orbWave)" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
    <span class="orb-ui"><span class="orb-copy-glyph"></span><span class="orb-check-glyph"></span><span class="orb-label">Скопіювати</span></span>`;

  const q=s=>btn.querySelector(s), svg=q('.orb-svg'), blob=q('#blob'), inner=q('#inner'), sheen=q('#sheen'), wave=q('#wave'), waveArea=q('#waveArea'), halo=q('#halo');
  const f0=q('#f0'),f1=q('#f1'),f2=q('#f2'),e0=q('#e0'),e1=q('#e1'),e2=q('#e2'),w0=q('#w0'),w1=q('#w1'),w2=q('#w2'),wf=q('#wf'),h0=q('#h0'),h1=q('#h1');
  const C=60,R=34,N=reduced?32:48,TAU=Math.PI*2;
  const pts=Array.from({length:N},(_,i)=>{const a=i/N*TAU,r=R+Math.sin(a*3+.5)*.7+Math.sin(a*5-.2)*.35;return{a,bx:Math.cos(a)*r,by:Math.sin(a)*r,x:Math.cos(a)*r,y:Math.sin(a)*r,vx:0,vy:0}});
  const p={x:C,y:C,px:C,py:C,inside:false,down:false,hit:false,release:false};
  const s={hover:0,press:0,ok:0,err:0};
  let last=performance.now(),raf=0,wasOk=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(lerp(v,b[i],t))), rgb=a=>`rgb(${a[0]} ${a[1]} ${a[2]})`;

  function map(e){const r=btn.getBoundingClientRect();p.px=p.x;p.py=p.y;p.x=clamp((e.clientX-r.left)/r.width,0,1)*120;p.y=clamp((e.clientY-r.top)/r.height,0,1)*120}
  btn.addEventListener('pointerenter',e=>{map(e);p.inside=true},{passive:true});
  btn.addEventListener('pointermove',e=>{map(e);p.inside=true},{passive:true});
  btn.addEventListener('pointerleave',()=>{p.inside=false;if(!p.down){p.x=C;p.y=C}},{passive:true});
  btn.addEventListener('pointerdown',e=>{map(e);p.inside=true;p.down=true;p.hit=true;try{btn.setPointerCapture?.(e.pointerId)}catch{}});
  const up=e=>{if(e?.clientX!=null)map(e);if(p.down)p.release=true;p.down=false};
  btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);

  function impulse(px,py,k){const lx=px-C,ly=py-C;for(const n of pts){const dx=n.x-lx,dy=n.y-ly,d=Math.hypot(dx,dy)||1,inf=Math.exp(-Math.pow(d/22,2));n.vx+=dx/d*inf*k;n.vy+=dy/d*inf*k}}
  function path(inset=0){const a=pts.map(n=>{const l=Math.hypot(n.x,n.y)||1;return{x:C+n.x-n.x/l*inset,y:C+n.y-n.y/l*inset}});let d=`M${a[0].x.toFixed(2)} ${a[0].y.toFixed(2)}`;for(let i=0;i<a.length;i++){const p0=a[(i-1+a.length)%a.length],p1=a[i],p2=a[(i+1)%a.length],p3=a[(i+2)%a.length];d+=`C${(p1.x+(p2.x-p0.x)/6).toFixed(2)} ${(p1.y+(p2.y-p0.y)/6).toFixed(2)} ${(p2.x-(p3.x-p1.x)/6).toFixed(2)} ${(p2.y-(p3.y-p1.y)/6).toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`}return d+'Z'}

  function update(dt,now){
    const ok=hero.classList.contains('is-copied'),err=hero.classList.contains('is-error');
    s.hover=lerp(s.hover,p.inside?1:0,.14);s.press=lerp(s.press,p.down?1:0,.22);s.ok=lerp(s.ok,ok?1:0,.12);s.err=lerp(s.err,err?1:0,.12);
    const vx=p.x-p.px,vy=p.y-p.py;p.px=p.x;p.py=p.y;
    if(p.hit)impulse(p.x,p.y,-3.5);if(p.release)impulse(p.x,p.y,2.0);
    if(ok&&!wasOk){for(const n of pts){const l=Math.hypot(n.x,n.y)||1;n.vx+=n.x/l*1.8;n.vy+=n.y/l*1.8}}wasOk=ok;
    const lx=p.x-C,ly=p.y-C,t=now*.001;
    for(let i=0;i<N;i++){
      const n=pts[i],a=pts[(i-1+N)%N],b=pts[(i+1)%N],l=Math.hypot(n.bx,n.by)||1,nx=n.bx/l,ny=n.by/l;
      const micro=reduced?0:Math.sin(t*1.45+n.a*3)*.36+Math.sin(t*.82-n.a*5)*.18;
      let fx=(n.bx+nx*micro-n.x)*.105+((a.x+b.x)*.5-n.x)*.11,fy=(n.by+ny*micro-n.y)*.105+((a.y+b.y)*.5-n.y)*.11;
      if(p.inside&&!reduced){const dx=n.x-lx,dy=n.y-ly,d=Math.hypot(dx,dy)||1,inf=clamp(1-d/58,0,1);if(inf>0){if(p.down){const inward=-10*inf*inf;fx+=dx/d*inward;fy+=dy/d*inward;const ring=Math.exp(-Math.pow((d-21)/14,2));fx+=dx/d*ring*.8;fy+=dy/d*ring*.8}else{const sticky=inf*inf*.017;fx+=(lx-n.x)*sticky;fy+=(ly-n.y)*sticky}fx+=vx*inf*.04;fy+=vy*inf*.04}}
      n.vx=(n.vx+fx)*.81;n.vy=(n.vy+fy)*.81;n.x+=n.vx*dt;n.y+=n.vy*dt;const dx=n.x-n.bx,dy=n.y-n.by,o=Math.hypot(dx,dy),m=10+s.press*7;if(o>m){const k=m/o;n.x=n.bx+dx*k;n.y=n.by+dy*k;n.vx*=.5;n.vy*=.5}
    }
    p.hit=false;p.release=false;
  }

  function render(now){
    const green=[84,255,179],green2=[16,151,92],red=[255,104,148],red2=[178,39,87];
    let A=mix([255,119,210],green,s.ok),B=mix([229,234,255],[227,255,238],s.ok),D=mix([80,138,255],green2,s.ok);A=mix(A,red,s.err);B=mix(B,[255,226,236],s.err);D=mix(D,red2,s.err);
    e0.setAttribute('stop-color',rgb(A));e1.setAttribute('stop-color',rgb(B));e2.setAttribute('stop-color',rgb(D));w0.setAttribute('stop-color',rgb(mix([112,173,255],green,s.ok)));w1.setAttribute('stop-color',rgb(B));w2.setAttribute('stop-color',rgb(D));wf.setAttribute('stop-color',rgb(mix([123,181,255],green,s.ok)));h0.setAttribute('stop-color',rgb(mix([115,140,255],green,s.ok)));h1.setAttribute('stop-color',rgb(mix([184,92,255],green2,s.ok)));
    f0.setAttribute('stop-color',rgb(mix([52,59,103],[28,57,41],s.ok*.55)));f1.setAttribute('stop-color',rgb(mix([21,29,56],[12,42,27],s.ok*.6)));f2.setAttribute('stop-color',rgb(mix([9,14,32],[7,30,21],s.ok*.65)));
    blob.setAttribute('d',path());inner.setAttribute('d',path(4));
    const t=now*.0016,amp=reduced?1:2.8+s.hover*1.5+s.press*1.8,y=76-s.press*4+s.ok*2;const y1=y+Math.sin(t)*amp,y2=y+Math.sin(t+.8)*amp,y3=y+Math.sin(t+1.6)*amp,y4=y+Math.sin(t+2.4)*amp;const d=`M28 ${y1.toFixed(2)} C40 ${y2.toFixed(2)} 53 ${y3.toFixed(2)} 65 ${y2.toFixed(2)} S91 ${y3.toFixed(2)} 102 ${y4.toFixed(2)}`;wave.setAttribute('d',d);waveArea.setAttribute('d',d+' L102 101 L28 101 Z');
    sheen.setAttribute('d',`M31 ${(31+Math.sin(t*.55)).toFixed(2)} C43 24 57 23 78 28 C89 31 95 35 98 38`);halo.setAttribute('r',(48+s.hover*2+s.press+s.ok*1.5).toFixed(2));svg.style.filter=`drop-shadow(0 0 ${9+s.hover*5+s.ok*5}px rgba(${A[0]},${A[1]},${A[2]},.28))`;
  }
  function frame(now){const dt=Math.min(1.35,(now-last)/16.667);last=now;update(dt,now);render(now);raf=requestAnimationFrame(frame)}
  const stop=()=>{if(raf){cancelAnimationFrame(raf);raf=0}},start=()=>{if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}};
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());window.addEventListener('pagehide',stop,{once:true});start();
})();
