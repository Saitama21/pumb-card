// PUMB Card — integrated liquid SVG copy control.
// Visual layer only. Existing copy behavior remains in app.js.
(() => {
  'use strict';

  const btn = document.getElementById('copyBtn');
  const hero = document.getElementById('heroCard');
  const stage = document.getElementById('copyStage');
  const status = document.getElementById('copyStatus');
  if (!btn || !hero || !stage || !status) return;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  // Layout: the control lives directly on the card texture. No box, no capsule container.
  const style = document.createElement('style');
  style.textContent = `
    .hero-main{position:relative!important;display:block!important;min-height:100%;}
    .hero-copy{position:relative;z-index:4;padding-right:116px;}
    .copy-stage{
      position:absolute!important;
      right:8px!important;
      top:49%!important;
      transform:translateY(-50%)!important;
      margin:0!important;
      width:104px!important;
      min-width:104px!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:6px!important;
      z-index:12!important;
      pointer-events:none;
    }
    .hero .copy-drop.liquid-surface-btn{
      position:relative!important;
      width:98px!important;
      height:98px!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:50%!important;
      background:transparent!important;
      box-shadow:none!important;
      filter:none!important;
      overflow:visible!important;
      isolation:isolate;
      animation:none!important;
      cursor:pointer;
      pointer-events:auto;
      touch-action:manipulation;
      -webkit-tap-highlight-color:transparent;
    }
    .hero .copy-drop.liquid-surface-btn::before,
    .hero .copy-drop.liquid-surface-btn::after,
    .hero .copy-drop.liquid-surface-btn>.drop-highlight,
    .hero .copy-drop.liquid-surface-btn>.drop-ring,
    .hero .copy-drop.liquid-surface-btn>.copy-icon,
    .hero .copy-drop.liquid-surface-btn>.check-icon{display:none!important;}

    .liquid-surface-svg{
      position:absolute;
      inset:-13px;
      width:124px;
      height:124px;
      max-width:none!important;
      overflow:visible;
      pointer-events:none;
      z-index:0;
    }
    .liquid-surface-ui{
      position:absolute;
      inset:0;
      z-index:3;
      display:grid;
      place-items:center;
      pointer-events:none;
    }
    .liquid-icon{
      width:33px;
      height:33px;
      fill:none;
      stroke:#f6f8ff;
      stroke-width:1.7;
      stroke-linecap:round;
      stroke-linejoin:round;
      filter:drop-shadow(0 0 7px rgba(174,194,255,.62));
      transition:opacity .2s ease, transform .28s cubic-bezier(.16,1,.3,1);
    }
    .liquid-check,.liquid-error{position:absolute;opacity:0;transform:scale(.55) rotate(-10deg);}
    .liquid-copy{opacity:1;transform:scale(1);}
    .hero.is-copied .liquid-copy,.hero.is-error .liquid-copy{opacity:0;transform:scale(.55);}
    .hero.is-copied .liquid-check{opacity:1;transform:scale(1) rotate(0);stroke:#b4ffd5;}
    .hero.is-error .liquid-error{opacity:1;transform:scale(1) rotate(0);stroke:#ffc0d0;}

    .hero .copy-status{
      position:relative!important;
      margin:0!important;
      max-width:102px!important;
      min-height:13px;
      padding:0!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
      color:#dce5f8!important;
      font-size:8px!important;
      line-height:1.15!important;
      font-weight:660!important;
      letter-spacing:.025em!important;
      text-align:center!important;
      white-space:normal!important;
      text-shadow:0 1px 10px rgba(0,0,0,.9),0 0 10px rgba(122,146,255,.26);
      pointer-events:none!important;
      transition:color .25s ease, transform .25s cubic-bezier(.16,1,.3,1), opacity .25s ease;
    }
    .hero.is-copied .copy-status{color:#a9ffd0!important;transform:translateY(1px);}
    .hero.is-error .copy-status{color:#ffadc5!important;transform:translateY(1px);}

    .hero .copy-drop.liquid-surface-btn:focus-visible{outline:2px solid rgba(181,198,255,.92);outline-offset:8px;}

    @media(max-width:370px){
      .hero-copy{padding-right:91px;}
      .copy-stage{right:0!important;width:88px!important;min-width:88px!important;}
      .hero .copy-drop.liquid-surface-btn{width:82px!important;height:82px!important;}
      .liquid-surface-svg{inset:-12px;width:106px;height:106px;}
      .liquid-icon{width:28px;height:28px;}
      .hero .copy-status{max-width:86px!important;font-size:6.5px!important;}
    }
    @media(max-height:730px){
      .hero-copy{padding-right:90px;}
      .copy-stage{right:0!important;top:47%!important;width:86px!important;min-width:86px!important;}
      .hero .copy-drop.liquid-surface-btn{width:80px!important;height:80px!important;}
      .liquid-surface-svg{inset:-11px;width:102px;height:102px;}
      .liquid-icon{width:27px;height:27px;}
      .hero .copy-status{max-width:84px!important;font-size:6.3px!important;}
    }
    @media(max-height:620px){
      .hero-copy{padding-right:78px;}
      .copy-stage{width:74px!important;min-width:74px!important;}
      .hero .copy-drop.liquid-surface-btn{width:68px!important;height:68px!important;}
      .liquid-surface-svg{inset:-9px;width:86px;height:86px;}
      .liquid-icon{width:23px;height:23px;}
      .hero .copy-status{max-width:72px!important;font-size:5.4px!important;}
    }
  `;
  document.head.appendChild(style);

  btn.classList.remove('liquid-v2','orb-v3','liquid-enhanced');
  btn.classList.add('liquid-surface-btn');
  btn.querySelector('.liquid-copy-canvas')?.remove();
  btn.querySelector('.liquid-surface-svg')?.remove();
  btn.querySelector('.liquid-surface-ui')?.remove();

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS,'svg');
  svg.setAttribute('class','liquid-surface-svg');
  svg.setAttribute('viewBox','0 0 140 140');
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML = `
    <defs>
      <radialGradient id="ls-body" cx="34%" cy="25%" r="80%">
        <stop id="ls-body-a" offset="0" stop-color="#384472" stop-opacity=".92"/>
        <stop id="ls-body-b" offset=".46" stop-color="#151c3a" stop-opacity=".95"/>
        <stop id="ls-body-c" offset="1" stop-color="#080d1e" stop-opacity=".98"/>
      </radialGradient>
      <linearGradient id="ls-edge" x1="8%" y1="10%" x2="94%" y2="92%">
        <stop id="ls-edge-a" offset="0" stop-color="#ff6fcf"/>
        <stop id="ls-edge-b" offset=".38" stop-color="#d8e2ff"/>
        <stop id="ls-edge-c" offset=".72" stop-color="#5aa6ff"/>
        <stop id="ls-edge-d" offset="1" stop-color="#bd58ff"/>
      </linearGradient>
      <linearGradient id="ls-wave" x1="0" y1="0" x2="1" y2="0">
        <stop id="ls-wave-a" offset="0" stop-color="#8fd4ff" stop-opacity=".12"/>
        <stop id="ls-wave-b" offset=".45" stop-color="#ffffff" stop-opacity=".94"/>
        <stop id="ls-wave-c" offset="1" stop-color="#b35fff" stop-opacity=".62"/>
      </linearGradient>
      <linearGradient id="ls-wave-fill" x1="0" y1="0" x2="0" y2="1">
        <stop id="ls-wave-fill-a" offset="0" stop-color="#7e9fff" stop-opacity=".22"/>
        <stop offset="1" stop-color="#181c4a" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="ls-halo" cx="50%" cy="50%" r="50%">
        <stop id="ls-halo-a" offset="0" stop-color="#6c88ff" stop-opacity=".24"/>
        <stop id="ls-halo-b" offset=".56" stop-color="#b943ff" stop-opacity=".16"/>
        <stop offset="1" stop-color="#a545ff" stop-opacity="0"/>
      </radialGradient>
      <filter id="ls-soft" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
      <filter id="ls-glass" x="-35%" y="-35%" width="170%" height="170%">
        <feGaussianBlur in="SourceAlpha" stdDeviation=".45" result="alphaBlur"/>
        <feSpecularLighting in="alphaBlur" surfaceScale="5" specularConstant=".55" specularExponent="24" lighting-color="#e9efff" result="spec">
          <fePointLight x="35" y="18" z="70"/>
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specCut"/>
        <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="specCut"/></feMerge>
      </filter>
    </defs>
    <circle id="ls-halo-circle" cx="70" cy="70" r="53" fill="url(#ls-halo)" filter="url(#ls-soft)"/>
    <path id="ls-blob" fill="url(#ls-body)" stroke="url(#ls-edge)" stroke-width="2.35" filter="url(#ls-glass)"/>
    <path id="ls-inner" fill="none" stroke="rgba(255,255,255,.17)" stroke-width=".9"/>
    <path id="ls-sheen" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="3" stroke-linecap="round"/>
    <path id="ls-wave-fill-path" fill="url(#ls-wave-fill)"/>
    <path id="ls-wave-path" fill="none" stroke="url(#ls-wave)" stroke-width="2.1" stroke-linecap="round"/>
    <circle id="ls-touch" cx="70" cy="70" r="6" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1" opacity="0"/>
  `;
  btn.prepend(svg);

  const ui = document.createElement('span');
  ui.className = 'liquid-surface-ui';
  ui.setAttribute('aria-hidden','true');
  ui.innerHTML = `
    <svg class="liquid-icon liquid-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/></svg>
    <svg class="liquid-icon liquid-check" viewBox="0 0 24 24"><path d="m5 12.5 4.1 4L19 7"/></svg>
    <svg class="liquid-icon liquid-error" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
  `;
  btn.appendChild(ui);

  const blob = svg.querySelector('#ls-blob');
  const inner = svg.querySelector('#ls-inner');
  const sheen = svg.querySelector('#ls-sheen');
  const wave = svg.querySelector('#ls-wave-path');
  const waveFill = svg.querySelector('#ls-wave-fill-path');
  const haloCircle = svg.querySelector('#ls-halo-circle');
  const touch = svg.querySelector('#ls-touch');

  const bodyA = svg.querySelector('#ls-body-a');
  const bodyB = svg.querySelector('#ls-body-b');
  const bodyC = svg.querySelector('#ls-body-c');
  const edgeA = svg.querySelector('#ls-edge-a');
  const edgeB = svg.querySelector('#ls-edge-b');
  const edgeC = svg.querySelector('#ls-edge-c');
  const edgeD = svg.querySelector('#ls-edge-d');
  const haloA = svg.querySelector('#ls-halo-a');
  const haloB = svg.querySelector('#ls-halo-b');
  const waveA = svg.querySelector('#ls-wave-a');
  const waveB = svg.querySelector('#ls-wave-b');
  const waveC = svg.querySelector('#ls-wave-c');
  const waveFillA = svg.querySelector('#ls-wave-fill-a');

  const COUNT = reduceMotion ? 36 : 58;
  const CENTER = 70;
  const R = 41.5;
  const points = Array.from({length:COUNT},(_,i)=>{
    const a = i / COUNT * Math.PI * 2;
    const jitter = Math.sin(a*3+.7)*.72 + Math.sin(a*5-.18)*.32;
    const r = R + jitter;
    return {a,bx:Math.cos(a)*r,by:Math.sin(a)*r,x:Math.cos(a)*r,y:Math.sin(a)*r,vx:0,vy:0};
  });

  const pointer = {x:CENTER,y:CENTER,px:CENTER,py:CENTER,inside:false,down:false,justDown:false,justUp:false};
  const state = {hover:0,press:0,success:0,error:0,successKick:0};
  let last = performance.now();
  let raf = 0;
  let wasSuccess = false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(lerp(v,b[i],t)));
  const rgb=c=>`rgb(${c[0]} ${c[1]} ${c[2]})`;

  function mapPointer(e){
    const r=btn.getBoundingClientRect();
    pointer.px=pointer.x; pointer.py=pointer.y;
    pointer.x=clamp((e.clientX-r.left)/Math.max(1,r.width),0,1)*140;
    pointer.y=clamp((e.clientY-r.top)/Math.max(1,r.height),0,1)*140;
  }
  btn.addEventListener('pointerenter',e=>{mapPointer(e);pointer.inside=true;},{passive:true});
  btn.addEventListener('pointermove',e=>{mapPointer(e);pointer.inside=true;},{passive:true});
  btn.addEventListener('pointerleave',()=>{pointer.inside=false;if(!pointer.down){pointer.x=CENTER;pointer.y=CENTER;}},{passive:true});
  btn.addEventListener('pointerdown',e=>{mapPointer(e);pointer.inside=true;pointer.down=true;pointer.justDown=true;try{btn.setPointerCapture?.(e.pointerId)}catch{};});
  const release=e=>{if(e?.clientX!=null)mapPointer(e);if(pointer.down)pointer.justUp=true;pointer.down=false;};
  btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);btn.addEventListener('lostpointercapture',release);

  function impulse(px,py,power){
    const lx=px-CENTER,ly=py-CENTER;
    for(const p of points){
      const dx=p.x-lx,dy=p.y-ly,d=Math.hypot(dx,dy)||1;
      const inf=Math.exp(-Math.pow(d/24,2));
      p.vx+=(dx/d)*inf*power; p.vy+=(dy/d)*inf*power;
    }
  }

  function path(inset=0){
    const a=points.map(p=>{const l=Math.hypot(p.x,p.y)||1;return{x:CENTER+p.x-(p.x/l)*inset,y:CENTER+p.y-(p.y/l)*inset};});
    let d=`M ${a[0].x.toFixed(2)} ${a[0].y.toFixed(2)}`;
    for(let i=0;i<a.length;i++){
      const p0=a[(i-1+a.length)%a.length],p1=a[i],p2=a[(i+1)%a.length],p3=a[(i+2)%a.length];
      const c1x=p1.x+(p2.x-p0.x)/6,c1y=p1.y+(p2.y-p0.y)/6,c2x=p2.x-(p3.x-p1.x)/6,c2y=p2.y-(p3.y-p1.y)/6;
      d+=` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d+' Z';
  }

  function update(dt,now){
    const copied=hero.classList.contains('is-copied');
    const failed=hero.classList.contains('is-error');
    state.hover=lerp(state.hover,pointer.inside?1:0,.14);
    state.press=lerp(state.press,pointer.down?1:0,.22);
    state.success=lerp(state.success,copied?1:0,.12);
    state.error=lerp(state.error,failed?1:0,.12);
    state.successKick*=.94;

    if(copied&&!wasSuccess){
      state.successKick=1;
      for(const p of points){const l=Math.hypot(p.x,p.y)||1;p.vx+=(p.x/l)*2.1;p.vy+=(p.y/l)*2.1;}
    }
    wasSuccess=copied;

    const pvx=pointer.x-pointer.px,pvy=pointer.y-pointer.py;
    pointer.px=pointer.x;pointer.py=pointer.y;
    if(pointer.justDown)impulse(pointer.x,pointer.y,-3.6);
    if(pointer.justUp)impulse(pointer.x,pointer.y,2.0);

    const lx=pointer.x-CENTER,ly=pointer.y-CENTER,t=now*.001;
    for(let i=0;i<points.length;i++){
      const p=points[i],prev=points[(i-1+points.length)%points.length],next=points[(i+1)%points.length];
      const l=Math.hypot(p.bx,p.by)||1,nx=p.bx/l,ny=p.by/l;
      const breathe=reduceMotion?0:(Math.sin(t*1.42+p.a*3)*.42+Math.sin(t*.76-p.a*5)*.22);
      let fx=(p.bx+nx*breathe-p.x)*.102+((prev.x+next.x)*.5-p.x)*.094;
      let fy=(p.by+ny*breathe-p.y)*.102+((prev.y+next.y)*.5-p.y)*.094;
      if(pointer.inside&&!reduceMotion){
        const dx=p.x-lx,dy=p.y-ly,d=Math.hypot(dx,dy)||1,inf=clamp(1-d/65,0,1);
        if(inf>0){
          if(pointer.down){
            const inward=-10.5*inf*inf;fx+=(dx/d)*inward;fy+=(dy/d)*inward;
            const ring=Math.exp(-Math.pow((d-22)/15,2));fx+=(dx/d)*ring*.92;fy+=(dy/d)*ring*.92;
          }else{
            const sticky=inf*inf*.018;fx+=(-dx)*sticky;fy+=(-dy)*sticky;
          }
          fx+=pvx*inf*.038;fy+=pvy*inf*.038;
        }
      }
      p.vx=(p.vx+fx)*.82;p.vy=(p.vy+fy)*.82;p.x+=p.vx*dt;p.y+=p.vy*dt;
      const ox=p.x-p.bx,oy=p.y-p.by,off=Math.hypot(ox,oy),max=11+state.press*8+state.successKick*4;
      if(off>max){const k=max/off;p.x=p.bx+ox*k;p.y=p.by+oy*k;p.vx*=.5;p.vy*=.5;}
    }
    pointer.justDown=false;pointer.justUp=false;
  }

  function render(now){
    const success=state.success,error=state.error;
    let ba=mix([52,64,108],[26,72,52],success),bb=mix([19,27,57],[8,45,28],success),bc=mix([7,13,31],[5,25,16],success);
    ba=mix(ba,[70,28,42],error);bb=mix(bb,[45,13,25],error);bc=mix(bc,[24,6,13],error);
    let ea=mix([255,110,208],[90,255,190],success),eb=mix([220,231,255],[223,255,239],success),ec=mix([77,164,255],[79,232,202],success),ed=mix([190,79,255],[48,191,127],success);
    ea=mix(ea,[255,102,144],error);eb=mix(eb,[255,224,232],error);ec=mix(ec,[255,93,129],error);ed=mix(ed,[177,37,78],error);
    bodyA.setAttribute('stop-color',rgb(ba));bodyB.setAttribute('stop-color',rgb(bb));bodyC.setAttribute('stop-color',rgb(bc));
    edgeA.setAttribute('stop-color',rgb(ea));edgeB.setAttribute('stop-color',rgb(eb));edgeC.setAttribute('stop-color',rgb(ec));edgeD.setAttribute('stop-color',rgb(ed));
    haloA.setAttribute('stop-color',rgb(mix([103,133,255],[75,255,180],success)));haloB.setAttribute('stop-color',rgb(mix([184,62,255],[29,195,119],success)));
    waveA.setAttribute('stop-color',rgb(mix([139,210,255],[99,255,210],success)));waveB.setAttribute('stop-color',rgb(mix([255,255,255],[237,255,245],success)));waveC.setAttribute('stop-color',rgb(mix([183,92,255],[76,218,153],success)));waveFillA.setAttribute('stop-color',rgb(mix([128,159,255],[84,236,179],success)));

    const d=path(),di=path(4.5);blob.setAttribute('d',d);inner.setAttribute('d',di);
    const t=now*.0014,amp=3+state.hover*1.8+state.press*2.7+state.successKick*1.4,base=87-state.press*4;
    const y1=base+Math.sin(t*1.2)*amp,y2=base+Math.sin(t*1.2+.8)*amp,y3=base+Math.sin(t*1.2+1.6)*amp,y4=base+Math.sin(t*1.2+2.4)*amp;
    const line=`M 31 ${y1.toFixed(2)} C 45 ${y2.toFixed(2)}, 60 ${y3.toFixed(2)}, 75 ${y2.toFixed(2)} S 98 ${y3.toFixed(2)}, 110 ${y4.toFixed(2)}`;
    wave.setAttribute('d',line);waveFill.setAttribute('d',`${line} L 110 116 L 31 116 Z`);
    const sy=34+Math.sin(now*.001)*1.3;sheen.setAttribute('d',`M 35 ${sy.toFixed(2)} C 47 25, 64 24, 82 28 C 96 31, 103 36, 108 42`);
    haloCircle.setAttribute('r',(52.5+state.hover*2+state.press*1.5+state.successKick*2).toFixed(2));
    touch.setAttribute('cx',pointer.x.toFixed(2));touch.setAttribute('cy',pointer.y.toFixed(2));touch.setAttribute('opacity',pointer.inside?(pointer.down?.38:.13):0);
  }

  function frame(now){const dt=Math.min(1.35,(now-last)/16.667);last=now;update(dt,now);render(now);raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}else if(!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}});
})();
