// Visual-only liquid animation for the existing #copyBtn.
// No network requests, no form handling, no data collection.
(() => {
  const button = document.getElementById('copyBtn');
  const hero = document.getElementById('heroCard');
  if (!button || !hero) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  const style = document.createElement('style');
  style.textContent = `
    .hero .copy-drop.liquid-enhanced{
      position:relative;overflow:visible;isolation:isolate;
      border-color:transparent;background:transparent;box-shadow:none;
      animation:none;filter:none;
    }
    .hero .copy-drop.liquid-enhanced .drop-highlight,
    .hero .copy-drop.liquid-enhanced .drop-ring{
      opacity:0!important;pointer-events:none;
    }
    .hero .copy-drop.liquid-enhanced .liquid-copy-canvas{
      position:absolute;left:50%;top:50%;width:98px;height:98px;
      transform:translate(-50%,-50%);pointer-events:none;z-index:0;
    }
    .hero .copy-drop.liquid-enhanced svg{z-index:2}
    .hero.is-copied .copy-drop.liquid-enhanced,
    .hero.is-error .copy-drop.liquid-enhanced{
      border-color:transparent;background:transparent;box-shadow:none;filter:none;
    }
    .hero.is-copied .copy-drop.liquid-enhanced::before{display:none}
  `;
  document.head.appendChild(style);

  button.classList.add('liquid-enhanced');

  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-copy-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  button.prepend(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const SIZE = 98, C = 49;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(SIZE * DPR);
  canvas.height = Math.round(SIZE * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const COUNT = 48;
  const BASE_R = 30.5;
  const points = Array.from({ length: COUNT }, (_, i) => {
    const a = (i / COUNT) * Math.PI * 2;
    const r = BASE_R + Math.sin(a * 3 + .8) * .8 + Math.sin(a * 5 - .35) * .4;
    return {
      a,
      bx: Math.cos(a) * r,
      by: Math.sin(a) * r,
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: 0,
      vy: 0
    };
  });

  const ripples = [];
  const pointer = {
    x: C, y: C, px: C, py: C,
    inside: false, down: false,
    justDown: false, justUp: false
  };

  let hover = 0, press = 0, success = 0, error = 0;
  let last = performance.now(), raf = 0, wasCopied = false;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function mapPointer(e) {
    const r = button.getBoundingClientRect();
    pointer.x = C + (e.clientX - r.left - r.width / 2) * (SIZE / r.width);
    pointer.y = C + (e.clientY - r.top - r.height / 2) * (SIZE / r.height);
  }

  button.addEventListener('pointerenter', e => {
    mapPointer(e); pointer.inside = true;
  }, { passive: true });

  button.addEventListener('pointermove', e => {
    mapPointer(e); pointer.inside = true;
  }, { passive: true });

  button.addEventListener('pointerleave', () => {
    pointer.inside = false;
    if (!pointer.down) { pointer.x = C; pointer.y = C; }
  }, { passive: true });

  button.addEventListener('pointerdown', e => {
    mapPointer(e);
    pointer.inside = true;
    pointer.down = true;
    pointer.justDown = true;
    try { button.setPointerCapture?.(e.pointerId); } catch {}
  });

  function release(e) {
    if (e) mapPointer(e);
    if (pointer.down) pointer.justUp = true;
    pointer.down = false;
  }

  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);

  function addRipple(x, y, green = false) {
    if (reduced) return;
    ripples.push({ x, y, r: 5, alpha: .72, speed: 3.5, green });
  }

  function impulse(px, py, power) {
    const lx = px - C, ly = py - C;
    for (const p of points) {
      const dx = p.x - lx, dy = p.y - ly;
      const d = Math.hypot(dx, dy) || 1;
      const influence = Math.exp(-Math.pow(d / 27, 2));
      p.vx += (dx / d) * influence * power;
      p.vy += (dy / d) * influence * power;
    }
  }

  function buildPath(inset = 0) {
    const a = points.map(p => {
      const len = Math.hypot(p.x, p.y) || 1;
      return {
        x: C + p.x - (p.x / len) * inset,
        y: C + p.y - (p.y / len) * inset
      };
    });

    ctx.beginPath();
    const n = a.length;
    ctx.moveTo(a[0].x, a[0].y);
    for (let i = 0; i < n; i++) {
      const p0 = a[(i - 1 + n) % n];
      const p1 = a[i];
      const p2 = a[(i + 1) % n];
      const p3 = a[(i + 2) % n];
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

    success = lerp(success, copied ? 1 : 0, .12);
    error = lerp(error, failed ? 1 : 0, .12);
    hover = lerp(hover, pointer.inside ? 1 : 0, .14);
    press = lerp(press, pointer.down ? 1 : 0, .22);

    if (copied && !wasCopied) {
      addRipple(C, C, true);
      for (const p of points) {
        const d = Math.hypot(p.x, p.y) || 1;
        p.vx += (p.x / d) * 2;
        p.vy += (p.y / d) * 2;
      }
    }
    wasCopied = copied;

    const pointerVX = pointer.x - pointer.px;
    const pointerVY = pointer.y - pointer.py;
    pointer.px = pointer.x;
    pointer.py = pointer.y;

    if (pointer.justDown) {
      addRipple(pointer.x, pointer.y, false);
      impulse(pointer.x, pointer.y, -3.2);
    }
    if (pointer.justUp) {
      addRipple(pointer.x, pointer.y, copied);
      impulse(pointer.x, pointer.y, 1.7);
    }

    const lx = pointer.x - C, ly = pointer.y - C;
    const t = now * .001;

    for (let i = 0; i < COUNT; i++) {
      const p = points[i];
      const prev = points[(i - 1 + COUNT) % COUNT];
      const next = points[(i + 1) % COUNT];

      const len = Math.hypot(p.bx, p.by) || 1;
      const nx = p.bx / len, ny = p.by / len;
      const wave = reduced ? 0 :
        Math.sin(t * 1.35 + p.a * 3) * .5 +
        Math.sin(t * .82 - p.a * 5) * .25;

      let fx = (p.bx + nx * wave - p.x) * .105 +
               ((prev.x + next.x) * .5 - p.x) * .083;
      let fy = (p.by + ny * wave - p.y) * .105 +
               ((prev.y + next.y) * .5 - p.y) * .083;

      if (pointer.inside && !reduced) {
        const dx = p.x - lx, dy = p.y - ly;
        const d = Math.hypot(dx, dy) || 1;
        const inf = clamp(1 - d / 66, 0, 1);

        if (inf > 0) {
          if (pointer.down) {
            const inward = -10 * inf * inf;
            fx += (dx / d) * inward;
            fy += (dy / d) * inward;

            const ring = Math.exp(-Math.pow((d - 26) / 17, 2));
            fx += (dx / d) * ring;
            fy += (dy / d) * ring;
          } else {
            const sticky = inf * inf * .018;
            fx += (-dx) * sticky;
            fy += (-dy) * sticky;
          }

          fx += pointerVX * inf * .045;
          fy += pointerVY * inf * .045;
        }
      }

      p.vx = (p.vx + fx) * .815;
      p.vy = (p.vy + fy) * .815;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const dx = p.x - p.bx, dy = p.y - p.by;
      const off = Math.hypot(dx, dy);
      const max = 13 + press * 8;
      if (off > max) {
        const k = max / off;
        p.x = p.bx + dx * k;
        p.y = p.by + dy * k;
        p.vx *= .5;
        p.vy *= .5;
      }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += r.speed * dt;
      r.alpha *= .955;
      if (r.alpha < .018) ripples.splice(i, 1);
    }

    pointer.justDown = false;
    pointer.justUp = false;
  }

  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);

    const pinkA = [255, 72, 128], pinkB = [125, 22, 72];
    const greenA = [111, 255, 177], greenB = [7, 92, 52];
    const redA = [255, 96, 136], redB = [119, 20, 56];

    let hi = mix(pinkA, greenA, success);
    let lo = mix(pinkB, greenB, success);
    hi = mix(hi, redA, error);
    lo = mix(lo, redB, error);

    let g = ctx.createRadialGradient(C, C, 2, C, C, 47);
    g.addColorStop(0, rgba(hi, .20 + hover * .05 + press * .07));
    g.addColorStop(.58, rgba(hi, .10 + hover * .04));
    g.addColorStop(1, rgba(hi, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(C, C, 47, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowBlur = 18 + hover * 5 + press * 5;
    ctx.shadowColor = rgba(hi, .46);
    buildPath();
    ctx.fillStyle = 'rgba(0,0,0,.001)';
    ctx.fill();
    ctx.restore();

    buildPath();
    g = ctx.createLinearGradient(25, 21, 75, 78);
    g.addColorStop(0, 'rgba(255,255,255,.24)');
    g.addColorStop(.16, rgba(hi, .48));
    g.addColorStop(.57, rgba(lo, .78));
    g.addColorStop(1, 'rgba(11,7,17,.96)');
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    buildPath();
    ctx.clip();

    g = ctx.createRadialGradient(36, 29, 2, 36, 29, 31);
    g.addColorStop(0, 'rgba(255,255,255,.78)');
    g.addColorStop(.20, 'rgba(255,255,255,.28)');
    g.addColorStop(.60, rgba(hi, .08));
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(6, 6, 86, 86);

    if (pointer.inside) {
      g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 35);
      g.addColorStop(0, 'rgba(255,255,255,.18)');
      g.addColorStop(.4, rgba(hi, .10));
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    buildPath();
    g = ctx.createLinearGradient(18, 18, 80, 80);
    g.addColorStop(0, 'rgba(255,255,255,.88)');
    g.addColorStop(.34, rgba(hi, .86));
    g.addColorStop(.72, 'rgba(255,255,255,.40)');
    g.addColorStop(1, rgba(hi, .72));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.45;
    ctx.stroke();

    buildPath(4.4);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = .8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(27, 28);
    ctx.bezierCurveTo(38, 21, 52, 20, 68, 27);
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.stroke();

    for (const r of ripples) {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(r.green ? greenA : hi, r.alpha);
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }

  function frame(now) {
    const dt = Math.min(1.35, (now - last) / 16.6667);
    last = now;
    update(dt, now);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!document.hidden && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
})();
