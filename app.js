(()=> {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

  // FPS
  let frames=0,last=performance.now();
  requestAnimationFrame(function meter(t){
    frames++;
    if(t-last>650){
      $("#fps").textContent=Math.round(frames*1000/(t-last))+" FPS";
      frames=0;last=t;
    }
    requestAnimationFrame(meter);
  });

  // Generic button interaction
  $$(".demo-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      $$(".demo-btn").forEach(x=>x.classList.remove("is-active"));
      btn.classList.add("is-active","flash");
      setTimeout(()=>btn.classList.remove("flash"),520);
    });
  });

  // Canvas particles
  const pc=$("#particleCanvas");
  const pctx=pc.getContext("2d");
  const pts=Array.from({length:34},()=>({
    x:Math.random(), y:Math.random(),
    vx:(Math.random()-.5)*.0002, vy:(Math.random()-.5)*.0002,
    r:1+Math.random()*2.3
  }));
  function fitCanvas(c,maxDpr=2){
    const r=c.getBoundingClientRect();
    const d=Math.min(devicePixelRatio||1,maxDpr);
    const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h}
    return {w,h,d};
  }
  requestAnimationFrame(function drawParticles(){
    const {w,h}=fitCanvas(pc);
    pctx.clearRect(0,0,w,h);
    pctx.globalCompositeOperation="lighter";
    for(const p of pts){
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>1)p.vx*=-1;if(p.y<0||p.y>1)p.vy*=-1;
      const x=p.x*w,y=p.y*h,rad=p.r*8;
      const g=pctx.createRadialGradient(x,y,0,x,y,rad);
      g.addColorStop(0,"rgba(150,230,255,.8)");
      g.addColorStop(.25,"rgba(94,174,255,.42)");
      g.addColorStop(1,"rgba(0,0,0,0)");
      pctx.fillStyle=g;pctx.beginPath();pctx.arc(x,y,rad,0,Math.PI*2);pctx.fill();
    }
    pctx.globalCompositeOperation="source-over";
    requestAnimationFrame(drawParticles);
  });

  // WebGL liquid shader
  const wc=$("#webglCanvas"),gl=wc.getContext("webgl",{alpha:true,antialias:true});
  if(gl){
    const vs="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs=`precision highp float;
      uniform vec2 r;uniform float t;uniform vec2 m;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 uv=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);
        vec2 mm=(m-.5)*vec2(r.x/r.y,1.);
        float q=n(uv*3.6+vec2(t*.12,-t*.08));
        float wave=.5+.5*sin(uv.x*8.+uv.y*5.+t*1.2+q*2.4);
        float glow=exp(-length(uv-mm*.45)*6.5);
        float ring=exp(-abs(length(uv+vec2(.16,-.03))-.32)*18.);
        vec3 c=vec3(.08,.36,.8)*ring*.55;
        c+=vec3(.46,.14,.9)*wave*.15;
        c+=vec3(.55,.9,1.)*glow*.3;
        c+=(h(gl_FragCoord.xy+t)-.5)*.025;
        gl_FragColor=vec4(c,.72);
      }`;
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
    const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(prog,"p");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const ur=gl.getUniformLocation(prog,"r"),ut=gl.getUniformLocation(prog,"t"),um=gl.getUniformLocation(prog,"m");
    const pointer={x:.72,y:.55};
    const wbtn=$("#webglButton");
    const move=e=>{
      const r=wc.getBoundingClientRect();
      const p=e.touches?e.touches[0]:e;
      if(!p)return;
      pointer.x=(p.clientX-r.left)/r.width;
      pointer.y=1-(p.clientY-r.top)/r.height;
    };
    wbtn.addEventListener("pointermove",move,{passive:true});
    wbtn.addEventListener("touchmove",move,{passive:true});
    const start=performance.now();
    requestAnimationFrame(function draw(now){
      const {w,h}=fitCanvas(wc,2);
      gl.viewport(0,0,w,h);
      gl.uniform2f(ur,w,h);
      gl.uniform1f(ut,(now-start)/1000);
      gl.uniform2f(um,pointer.x,pointer.y);
      gl.drawArrays(gl.TRIANGLES,0,6);
      requestAnimationFrame(draw);
    });
  }

  // 3D touch tilt
  const tilt=$("#tiltButton");
  const slabA=tilt.querySelector(".slab-a"),slabB=tilt.querySelector(".slab-b");
  function tiltMove(e){
    const p=e.touches?e.touches[0]:e;if(!p)return;
    const r=tilt.getBoundingClientRect();
    const x=(p.clientX-r.left)/r.width-.5;
    const y=(p.clientY-r.top)/r.height-.5;
    tilt.style.transform=`perspective(700px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*6).toFixed(2)}deg)`;
    slabA.style.transform=`rotate(${-11+x*8}deg) translate3d(${x*9}px,${y*6}px,15px)`;
    slabB.style.transform=`rotate(${8+x*10}deg) translate3d(${x*15}px,${y*9}px,35px)`;
  }
  function tiltReset(){
    tilt.style.transform="";
    slabA.style.transform="";
    slabB.style.transform="";
  }
  tilt.addEventListener("pointermove",tiltMove,{passive:true});
  tilt.addEventListener("pointerleave",tiltReset);
  tilt.addEventListener("touchmove",tiltMove,{passive:true});
  tilt.addEventListener("touchend",tiltReset);

  // Raster cards react to finger position
  const raster=$("#rasterButton");
  const cards=[...raster.querySelectorAll(".mini-card")];
  function rasterMove(e){
    const p=e.touches?e.touches[0]:e;if(!p)return;
    const r=raster.getBoundingClientRect();
    const x=(p.clientX-r.left)/r.width-.5;
    cards.forEach((c,i)=>{
      const depth=(i+1)*6;
      c.style.filter=`brightness(${1+Math.abs(x)*.12})`;
      c.style.translate=`${x*depth}px 0`;
    });
  }
  raster.addEventListener("pointermove",rasterMove,{passive:true});
  raster.addEventListener("pointerleave",()=>cards.forEach(c=>{c.style.filter="";c.style.translate=""}));
  raster.addEventListener("touchmove",rasterMove,{passive:true});
  raster.addEventListener("touchend",()=>cards.forEach(c=>{c.style.filter="";c.style.translate=""}));
})();