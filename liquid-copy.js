// Reactive liquid copy button for #copyBtn.
// Purely visual: transparent canvas, no data collection and no network access.
(() => {
  'use strict';

  const button = document.getElementById('copyBtn');
  const hero = document.getElementById('heroCard');
  if (!button || !hero) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  const style = document.createElement('style');
  style.textContent = `
    .hero .copy-drop.liquid-v2{
      position:relative!important;
      isolation:isolate;
      overflow:visible!important;
      border:0!important;
      border-radius:50%!important;
      background:transparent!important;
      box-shadow:none!important;
      filter:none!important;
      animation:none!important;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    .hero .copy-drop.liquid-v2::before,
    .hero .copy-drop.liquid-v2::after,
    .hero .copy-drop.liquid-v2 .drop-highlight,
    .hero .copy-drop.liquid-v2 .drop-ring{
      display:none!important;
    }
    .hero .copy-drop.liquid-v2 .liquid-copy-canvas{
      position:absolute;
      left:50%;top:50%;
      width:116px;height:116px;
      transform:translate3d(-50%,-50%,0);
      pointer-events:none;
      z-index:0;
      background:transparent!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
      filter:none!important;
    }
    .hero .copy-drop.liquid-v2 svg{
      z-index:3;
      pointer-events:none;
      filter:drop-shadow(0 1px 3px rgba(0,0,0,.42)) drop-shadow(0 0 5px rgba(255,255,255,.28));
    }
    .hero.is-copied .copy-drop.liquid-v2,
    .hero.is-error .copy-drop.liquid-v2{
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
      filter:none!important;
    }
  `;
  document.head.appendChild(style);

  button.classList.remove('liquid-enhanced');
  button.classList.add('liquid-v2');
  button.querySelector('.liquid-copy-canvas')?.remove();

  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-copy-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  button.prepend(canvas);

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const SIZE = 116;
  const C = SIZE / 2;
  const BASE_R = 31.5;
  const COUNT = reduced ? 40 : 64;
  const TAU = Math.PI * 2;
  let dpr = 1;

  function configureCanvas() {
    dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
    canvas.width = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }
  configureCanvas();

  const nodes = Array.from({ length: COUNT }, (_, i) => {
    const a = (i / COUNT) * TAU;
    const seed = Math.sin(a * 3 + .83) * .52 + Math.sin(a * 5 - .27) * .23;
    const r = BASE_R + seed;
    return {
      a,
      rx: Math.cos(a) * r,
      ry: Math.sin(a) * r,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0
    };
  });

  const pointer = {
    x: C, y: C, prevX: C, prevY: C,
    localX: 0, localY: 0,
    inside: false, down: false,
    downPulse: false, upPulse: false
  };

  const ripples = [];
  const droplets = [];

  let hover = 0;
  let press = 0;
  let success = 0;
  let error = 0;
  let wasCopied = false;
  let wasError = false;
  let raf = 0;
  let last = performance.now();
  let bodyX = 0;
  let bodyY = 0;
  let bodyVX = 0;
  let bodyVY = 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function mapPointer(e) {
    const r = button.getBoundingClientRect();
    const scale = SIZE / Math.max(1, Math.max(r.width, r.height));
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;
    pointer.x = C + (e.clientX - (r.left + r.width * .5)) * scale;
    pointer.y = C + (e.clientY - (r.top + r.height * .5)) * scale;
    pointer.localX = pointer.x - C;
    pointer.localY = pointer.y - C;
  }

  button.addEventListener('pointerenter', e => {
    mapPointer(e);
    pointer.inside = true;
  }, { passive: true });

  button.addEventListener('pointermove', e => {
    mapPointer(e);
    pointer.inside = true;
  }, { passive: true });

  button.addEventListener('pointerleave', () => {
    pointer.inside = false;
    if (!pointer.down) {
      pointer.localX = 0;
      pointer.localY = 0;
    }
  }, { passive: true });

  button.addEventListener('pointerdown', e => {
    mapPointer(e);
    pointer.inside = true;
    pointer.down = true;
    pointer.downPulse = true;
    try { button.setPointerCapture?.(e.pointerId); } catch {}
  });

  function releasePointer(e) {
    if (e?.clientX != null) mapPointer(e);
    if (pointer.down) pointer.upPulse = true;
    pointer.down = false;
  }

  button.addEventListener('pointerup', releasePointer);
  button.addEventListener('pointercancel', releasePointer);
  button.addEventListener('lostpointercapture', releasePointer);

  function addRipple(x, y, green = false, strength = 1) {
    if (reduced) return;
    ripples.push({ x, y, r: 3.5, a: .68 * strength, speed: 2.8 + strength, green });
  }

  function addDroplet(angle, speed, radius, green = true) {
    if (reduced) return;
    const start = BASE_R + 4;
    droplets.push({
      x: C + Math.cos(angle) * start,
      y: C + Math.sin(angle) * start,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - .12,
      r: radius,
      life: 1,
      green
    });
  }

  function radialImpulse(px, py, power, spread = 28) {
    const lx = px - C - bodyX;
    const ly = py - C - bodyY;
    for (const p of nodes) {
      const dx = p.x - lx;
      const dy = p.y - ly;
      const d = Math.hypot(dx, dy) || 1;
      const influence = Math.exp(-Math.pow(d / spread, 2));
      p.vx += (dx / d) * influence * power;
      p.vy += (dy / d) * influence * power;
    }
  }

  function buildPath(inset = 0) {
    const pts = nodes.map(p => {
      const len = Math.hypot(p.x, p.y) || 1;
      return {
        x: C + bodyX + p.x - (p.x / len) * inset,
        y: C + bodyY + p.y - (p.y / len) * inset
      };
    });

    ctx.beginPath();
    const n = pts.length;
    const first = pts[0];
    ctx.moveTo(first.x, first.y);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      ctx.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6,
        p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6,
        p2.y - (p3.y - p1.y) / 6,
        p2.x, p2.y
      );
    }
    ctx.closePath();
  }

  function update(dt, now) {
    const copied = hero.classList.contains('is-copied');
    const failed = hero.classList.contains('is-error');
    const follow = 1 - Math.pow(.001, dt / 60);

    success = lerp(success, copied ? 1 : 0, clamp(follow * .55, .04, .18));
    error = lerp(error, failed ? 1 : 0, clamp(follow * .55, .04, .18));
    hover = lerp(hover, pointer.inside ? 1 : 0, clamp(follow * .72, .05, .22));
    press = lerp(press, pointer.down ? 1 : 0, clamp(follow * .95, .06, .3));

    if (copied && !wasCopied) {
      addRipple(C + bodyX, C + bodyY, true, 1.25);
      for (let i = 0; i < 5; i++) {
        const a = -2.6 + i * .9 + Math.sin(i * 7.17) * .18;
        addDroplet(a, 1.4 + (i % 3) * .35, 1.8 + (i % 2) * .65, true);
      }
      for (const p of nodes) {
        const len = Math.hypot(p.x, p.y) || 1;
        p.vx += (p.x / len) * 2.5;
        p.vy += (p.y / len) * 2.5;
      }
    }
    if (failed && !wasError) {
      addRipple(C + bodyX, C + bodyY, false, .9);
      radialImpulse(C, C, -1.25, 42);
    }
    wasCopied = copied;
    wasError = failed;

    const pvx = pointer.x - pointer.prevX;
    const pvy = pointer.y - pointer.prevY;
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;

    if (pointer.downPulse) {
      addRipple(pointer.x, pointer.y, false, 1);
      radialImpulse(pointer.x, pointer.y, -4.6, 25);
    }
    if (pointer.upPulse) {
      addRipple(pointer.x, pointer.y, copied, .95);
      radialImpulse(pointer.x, pointer.y, 3.15, 27);
    }

    const targetBodyX = pointer.inside ? clamp(pointer.localX * .055, -2.7, 2.7) : 0;
    const targetBodyY = pointer.inside ? clamp(pointer.localY * .055, -2.7, 2.7) : 0;
    bodyVX += (targetBodyX - bodyX) * (.024 + press * .016) * dt;
    bodyVY += (targetBodyY - bodyY) * (.024 + press * .016) * dt;
    bodyVX *= Math.pow(.82, dt);
    bodyVY *= Math.pow(.82, dt);
    bodyX += bodyVX * dt;
    bodyY += bodyVY * dt;

    const lx = pointer.localX - bodyX;
    const ly = pointer.localY - bodyY;
    const pointerLen = Math.hypot(lx, ly) || 1;
    const pdx = lx / pointerLen;
    const pdy = ly / pointerLen;
    const t = now * .001;

    let avgRadius = 0;
    for (const p of nodes) avgRadius += Math.hypot(p.x, p.y);
    avgRadius /= nodes.length;
    const pressure = (BASE_R - avgRadius) * .055;

    for (let i = 0; i < COUNT; i++) {
      const p = nodes[i];
      const prev = nodes[(i - 1 + COUNT) % COUNT];
      const next = nodes[(i + 1) % COUNT];
      const len = Math.hypot(p.rx, p.ry) || 1;
      const nx = p.rx / len;
      const ny = p.ry / len;

      const ambient = reduced ? 0 :
        Math.sin(t * 1.18 + p.a * 3.0) * .28 +
        Math.sin(t * .73 - p.a * 5.0) * .16 +
        Math.sin(t * .41 + p.a * 2.0) * .10;

      const restX = p.rx + nx * ambient;
      const restY = p.ry + ny * ambient;

      let fx = (restX - p.x) * .072;
      let fy = (restY - p.y) * .072;

      // Surface tension: neighbours pull each point into a smooth membrane.
      fx += ((prev.x + next.x) * .5 - p.x) * .128;
      fy += ((prev.y + next.y) * .5 - p.y) * .128;

      // Simple pressure term keeps the blob volume visually stable.
      fx += nx * pressure;
      fy += ny * pressure;

      if (pointer.inside && !reduced) {
        const qx = p.x - lx;
        const qy = p.y - ly;
        const d = Math.hypot(qx, qy) || 1;
        const proximity = clamp(1 - d / 66, 0, 1);
        const angular = Math.max(0, (p.x / (Math.hypot(p.x, p.y) || 1)) * pdx + (p.y / (Math.hypot(p.x, p.y) || 1)) * pdy);
        const skin = Math.pow(angular, 5) * clamp(1.35 - pointerLen / 55, .2, 1.1);

        if (pointer.down) {
          // Finger dents the surface inward; surrounding skin bulges outward.
          fx += -nx * skin * (1.85 + press * 2.25);
          fy += -ny * skin * (1.85 + press * 2.25);
          const shoulder = Math.exp(-Math.pow((angular - .72) / .19, 2));
          fx += nx * shoulder * .62 * press;
          fy += ny * shoulder * .62 * press;
        } else {
          // Sticky liquid follows the cursor/finger edge with viscous lag.
          const sticky = proximity * proximity * .0125;
          fx += (lx - p.x) * sticky;
          fy += (ly - p.y) * sticky;
        }

        fx += pvx * proximity * .035;
        fy += pvy * proximity * .035;
      }

      p.fx = fx;
      p.fy = fy;
    }

    const damping = Math.pow(.80, dt);
    for (const p of nodes) {
      p.vx = (p.vx + p.fx * dt) * damping;
      p.vy = (p.vy + p.fy * dt) * damping;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const dx = p.x - p.rx;
      const dy = p.y - p.ry;
      const off = Math.hypot(dx, dy);
      const limit = 12.5 + press * 6;
      if (off > limit) {
        const k = limit / off;
        p.x = p.rx + dx * k;
        p.y = p.ry + dy * k;
        p.vx *= .48;
        p.vy *= .48;
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += r.speed * dt;
      r.a *= Math.pow(.92, dt);
      if (r.a < .012) ripples.splice(i, 1);
    }

    for (let i = droplets.length - 1; i >= 0; i--) {
      const d = droplets[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.pow(.985, dt);
      d.vy += .018 * dt;
      d.life -= .022 * dt;
      d.r *= Math.pow(.994, dt);
      if (d.life <= 0 || d.r < .35) droplets.splice(i, 1);
    }

    pointer.downPulse = false;
    pointer.upPulse = false;
  }

  function draw(now) {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const pinkHi = [255, 93, 145];
    const pinkMid = [220, 38, 102];
    const pinkDeep = [91, 12, 48];
    const greenHi = [132, 255, 190];
    const greenMid = [42, 220, 127];
    const greenDeep = [4, 78, 43];
    const redHi = [255, 125, 154];
    const redMid = [235, 53, 98];
    const redDeep = [104, 14, 43];

    let hi = mix(pinkHi, greenHi, success);
    let mid = mix(pinkMid, greenMid, success);
    let deep = mix(pinkDeep, greenDeep, success);
    hi = mix(hi, redHi, error);
    mid = mix(mid, redMid, error);
    deep = mix(deep, redDeep, error);

    const cx = C + bodyX;
    const cy = C + bodyY;
    const lightFollow = pointer.inside ? .34 : 0;
    const lightX = cx - 10 + (pointer.x - cx) * lightFollow;
    const lightY = cy - 13 + (pointer.y - cy) * lightFollow;

    // Aura: radial-only transparency, so the canvas can never read as a square.
    let g = ctx.createRadialGradient(cx, cy, 22, cx, cy, 54);
    g.addColorStop(0, rgba(mid, .15 + hover * .055 + press * .04));
    g.addColorStop(.58, rgba(mid, .075 + hover * .035));
    g.addColorStop(1, rgba(mid, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, TAU);
    ctx.fill();

    // Soft cast shadow/glow follows the actual deforming silhouette.
    ctx.save();
    ctx.shadowBlur = 18 + hover * 8 + press * 5;
    ctx.shadowOffsetY = 7;
    ctx.shadowColor = rgba(mid, .34 + hover * .11);
    buildPath();
    ctx.fillStyle = 'rgba(0,0,0,.01)';
    ctx.fill();
    ctx.restore();

    // Main liquid body.
    buildPath();
    g = ctx.createRadialGradient(lightX, lightY, 2, cx + 7, cy + 9, 47);
    g.addColorStop(0, 'rgba(255,255,255,.93)');
    g.addColorStop(.085, 'rgba(255,255,255,.56)');
    g.addColorStop(.22, rgba(hi, .72));
    g.addColorStop(.56, rgba(mid, .82));
    g.addColorStop(.82, rgba(deep, .94));
    g.addColorStop(1, 'rgba(9,5,14,.985)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    buildPath();
    ctx.clip();

    // Internal lensing / caustic bloom.
    g = ctx.createRadialGradient(lightX + 1, lightY + 1, 0, lightX + 1, lightY + 1, 28);
    g.addColorStop(0, 'rgba(255,255,255,.88)');
    g.addColorStop(.18, 'rgba(255,255,255,.29)');
    g.addColorStop(.48, rgba(hi, .085));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lightX + 1, lightY + 1, 29, 0, TAU);
    ctx.fill();

    // Lower internal depth gives the drop a thick glass/liquid edge.
    g = ctx.createRadialGradient(cx + 10, cy + 14, 5, cx + 10, cy + 14, 39);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(.62, rgba(deep, .08));
    g.addColorStop(1, 'rgba(0,0,0,.36)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 10, 42, 0, TAU);
    ctx.fill();

    // Moving glossy streak. It bends just enough to feel alive, not like a sticker.
    const breathe = reduced ? 0 : Math.sin(now * .00135) * 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy - 17 + breathe * .25);
    ctx.bezierCurveTo(cx - 9, cy - 24 + breathe, cx + 5, cy - 23 - breathe * .2, cx + 15, cy - 16);
    ctx.strokeStyle = 'rgba(255,255,255,.56)';
    ctx.lineWidth = 2.7;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lightX - 4, lightY - 3, 2.1 + hover * .35, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.86)';
    ctx.fill();

    // Press wave lives inside the drop rather than on a rectangular overlay.
    for (const r of ripples) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.strokeStyle = rgba(r.green ? greenHi : hi, r.a * .72);
      ctx.lineWidth = 1.15;
      ctx.stroke();
    }
    ctx.restore();

    // Physically-following rim and inner meniscus.
    buildPath();
    g = ctx.createLinearGradient(cx - 27, cy - 30, cx + 30, cy + 32);
    g.addColorStop(0, 'rgba(255,255,255,.93)');
    g.addColorStop(.22, rgba(hi, .78));
    g.addColorStop(.54, 'rgba(255,255,255,.22)');
    g.addColorStop(.82, rgba(mid, .58));
    g.addColorStop(1, 'rgba(255,255,255,.48)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.35;
    ctx.stroke();

    buildPath(3.8);
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = .8;
    ctx.stroke();

    // Success micro-droplets are round liquid beads, never rectangular particles.
    for (const d of droplets) {
      const bead = ctx.createRadialGradient(d.x - d.r * .32, d.y - d.r * .35, .1, d.x, d.y, d.r * 1.35);
      const color = d.green ? greenMid : mid;
      bead.addColorStop(0, `rgba(255,255,255,${.78 * d.life})`);
      bead.addColorStop(.3, rgba(color, .72 * d.life));
      bead.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = bead;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 1.35, 0, TAU);
      ctx.fill();
    }
  }

  function frame(now) {
    const rawDt = (now - last) / 16.6667;
    const dt = clamp(rawDt, .25, 1.5);
    last = now;
    update(dt, now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  start();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  window.addEventListener('pagehide', stop, { once: true });
  window.addEventListener('resize', configureCanvas, { passive: true });
})();
