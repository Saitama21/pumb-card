(()=> {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const shell=$("#cardShell"), card=$("#businessCard");
  const canvas=$("#canvasFx"), glCanvas=$("#glFx");
  const pixiHost=$("#pixiHost"), threeHost=$("#threeHost");
  const levelDescription=$("#levelDescription"), techStack=$("#techStack");
  const engineLabel=$("#engineLabel"), levelNumber=$("#levelNumber");
  const readoutTitle=$("#readoutTitle"), readoutText=$("#readoutText");
  const fps=$("#fps"), gpuState=$("#gpuState");
  const pulseBtn=$("#pulseBtn"), parallaxBtn=$("#parallaxBtn"), boostBtn=$("#boostBtn"), pauseBtn=$("#pauseBtn");

  const levels=[
    {title:"CSS / DOM",engine:"HTML + CSS",desc:"Типографика, сетка, градиенты, стекло и тени — базовый уровень без Canvas и GPU-сцен.",stack:["DOM","CSS","Touch"],note:"Самый лёгкий и надёжный вариант. Идеален для интерфейса и текста, но без сложной живой графики."},
    {title:"SVG",engine:"SVG Vector",desc:"Добавляем масштабируемые векторные линии, орбиты, иконки и декоративную геометрию без потери качества.",stack:["CSS","SVG","Vector"],note:"Чёткие линии на любом экране. Отлично для логотипов, схем, иконок и контролируемой анимации."},
    {title:"Photo / WebP",engine:"Image Layer",desc:"Добавляем реальную растровую фактуру: фотографию или WebP/AVIF, поверх которой остаются текст и интерфейс.",stack:["SVG","Photo","WebP"],note:"Растровый слой сразу даёт богатую фактуру и реализм. Хорошо комбинируется со стеклом и масками."},
    {title:"Canvas 2D",engine:"Canvas 2D",desc:"Поверх карточки появляется realtime-рисование: частицы, световые точки и линии, которые двигаются каждый кадр.",stack:["Photo","Canvas","Particles"],note:"Canvas — первый уровень настоящей процедурной анимации. Всё рисуется кадр за кадром прямо в браузере."},
    {title:"PixiJS",engine:"PixiJS GPU",desc:"Переносим 2D-анимацию на GPU: больше объектов, мягкие свечения и стабильная плавность на тяжёлой сцене.",stack:["Canvas","PixiJS","GPU 2D"],note:"PixiJS хорош, когда обычного Canvas уже мало: сотни объектов, фильтры и сложные живые интерфейсы."},
    {title:"WebGL Shader",engine:"WebGL Shader",desc:"Добавляем процедурный GPU-шейдер: текучий свет, преломление и живой фон без готовой картинки.",stack:["PixiJS","WebGL","Shader"],note:"WebGL даёт эффекты, которые CSS и обычный Canvas нормально не повторят: refraction, noise, procedural light."},
    {title:"Three.js 3D",engine:"Three.js 3D",desc:"Максимальный уровень: поверх всех предыдущих слоёв появляется настоящая 3D-геометрия со светом и материалом.",stack:["WebGL","Three.js","3D"],note:"Полноценная 3D-сцена с камерой, освещением и материалами. Самый тяжёлый, но и самый эффектный уровень."}
  ];

  let current=0, parallax=true, canvasStarted=false, pixiStarted=false, glStarted=false, threeStarted=false;

  function setLevel(i){
    current=Math.max(0,Math.min(levels.length-1,Number(i)||0));
    const L=levels[current];
    shell.dataset.level=String(current);
    $$(".level").forEach((b,idx)=>b.classList.toggle("is-active",idx===current));
    $$(".dock-item").forEach(b=>b.classList.toggle("is-active",Number(b.dataset.jump)===current || (current===1&&Number(b.dataset.jump)===0) || (current===3&&Number(b.dataset.jump)===2) || (current===5&&Number(b.dataset.jump)===4)));
    engineLabel.textContent=L.engine;
    levelDescription.textContent=L.desc;
    levelNumber.textContent=String(current+1).padStart(2,"0");
    readoutTitle.textContent=L.title;
    readoutText.textContent=L.note;
    techStack.innerHTML=L.stack.map(x=>"<span>"+x+"</span>").join("");
    if(current>=3) startCanvas();
    if(current>=4) startPixi();
    if(current>=5) startGL();
    if(current>=6) startThree();
  }

  $$(".level").forEach((b,i)=>b.addEventListener("click",()=>setLevel(i)));
  $$(".dock-item").forEach(b=>b.addEventListener("click",()=>setLevel(Number(b.dataset.jump))));

  // FPS
  let frames=0,last=performance.now();
  requestAnimationFrame(function meter(t){
    frames++;
    if(t-last>650){ fps.textContent=Math.round(frames*1000/(t-last))+" FPS"; frames=0; last=t; }
    requestAnimationFrame(meter);
  });

  // Parallax / touch tilt
  function tiltFromPoint(x,y){
    if(!parallax) return;
    const r=card.getBoundingClientRect();
    const nx=(x-r.left)/r.width-.5, ny=(y-r.top)/r.height-.5;
    card.style.transform=`rotateX(${(-ny*5.5).toFixed(2)}deg) rotateY(${(nx*7).toFixed(2)}deg) translateZ(0)`;
  }
  card.addEventListener("pointermove",e=>tiltFromPoint(e.clientX,e.clientY),{passive:true});
  card.addEventListener("pointerleave",()=>card.style.transform="");
  card.addEventListener("touchmove",e=>{const t=e.touches[0];if(t)tiltFromPoint(t.clientX,t.clientY)},{passive:true});
  card.addEventListener("touchend",()=>card.style.transform="");

  pulseBtn.onclick=()=>{pulseBtn.classList.toggle("is-on");document.body.classList.toggle("no-pulse",!pulseBtn.classList.contains("is-on"))};
  parallaxBtn.onclick=()=>{parallax=!parallax;parallaxBtn.classList.toggle("is-on",parallax);if(!parallax)card.style.transform=""};
  boostBtn.onclick=()=>{document.body.classList.toggle("boost");boostBtn.classList.toggle("is-on")};
  pauseBtn.onclick=()=>{document.body.classList.toggle("paused");pauseBtn.classList.toggle("is-on");pauseBtn.querySelector("span").textContent=document.body.classList.contains("paused")?"Продолжить":"Пауза"};

  // Canvas 2D particles
  function fit2d(c){
    const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h}
    return {w,h,d};
  }
  function startCanvas(){
    if(canvasStarted)return;canvasStarted=true;
    const ctx=canvas.getContext("2d"), pts=Array.from({length:42},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.00018,vy:(Math.random()-.5)*.00018,s:1+Math.random()*2}));
    requestAnimationFrame(function draw(){
      const {w,h}=fit2d(canvas);
      ctx.clearRect(0,0,w,h);
      ctx.globalCompositeOperation="lighter";
      for(const p of pts){
        p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>1)p.vx*=-1;if(p.y<0||p.y>1)p.vy*=-1;
        const x=p.x*w,y=p.y*h,rad=18*p.s*(w/900);
        const g=ctx.createRadialGradient(x,y,0,x,y,rad);
        g.addColorStop(0,"rgba(150,220,255,.52)");g.addColorStop(.4,"rgba(120,130,255,.16)");g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();
      }
      ctx.globalCompositeOperation="source-over";
      requestAnimationFrame(draw);
    });
  }

  function loadScript(src,name){
    if(name&&window[name])return Promise.resolve(window[name]);
    return new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.crossOrigin="anonymous";s.onload=()=>ok(name?window[name]:true);s.onerror=no;document.head.appendChild(s)});
  }

  async function startPixi(){
    if(pixiStarted)return;pixiStarted=true;
    try{
      await loadScript("https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js","PIXI");
      const app=new PIXI.Application();
      await app.init({resizeTo:pixiHost,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true});
      pixiHost.replaceChildren(app.canvas);
      const parts=[];
      for(let i=0;i<70;i++){
        const g=new PIXI.Graphics().circle(0,0,2+Math.random()*9).fill({color:i%2?0x88dfff:0xbd7cff,alpha:.08+Math.random()*.16});
        g.x=Math.random()*pixiHost.clientWidth;g.y=Math.random()*pixiHost.clientHeight;g.vx=(Math.random()-.5)*.25;g.vy=(Math.random()-.5)*.22;parts.push(g);app.stage.addChild(g);
      }
      app.ticker.add(t=>{const w=pixiHost.clientWidth,h=pixiHost.clientHeight;parts.forEach(g=>{g.x+=g.vx*t.deltaTime;g.y+=g.vy*t.deltaTime;if(g.x<0)g.x=w;if(g.x>w)g.x=0;if(g.y<0)g.y=h;if(g.y>h)g.y=0})});
    }catch(e){ pixiHost.innerHTML=""; gpuState.textContent="Pixi fallback"; }
  }

  function startGL(){
    if(glStarted)return;glStarted=true;
    const g=glCanvas.getContext("webgl",{alpha:true,antialias:true});
    if(!g){gpuState.textContent="WebGL unavailable";return}
    const vs="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs=`precision highp float;uniform vec2 r;uniform float t;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}void main(){vec2 uv=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);float q=n(uv*3.5+vec2(t*.08,-t*.05));float ring=exp(-abs(length(uv+vec2(.15,-.04))-.33)*18.);float wave=.5+.5*sin(uv.x*7.+uv.y*4.+t*.8+q*2.);vec3 c=vec3(.08,.22,.5)*ring*.5+vec3(.42,.15,.8)*wave*.11;c+=vec3(.5,.85,1.)*exp(-length(uv-vec2(.18,.15))*7.)*.22;gl_FragColor=vec4(c,.62);}`;
    const sh=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);return s};
    const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,vs));g.attachShader(p,sh(g.FRAGMENT_SHADER,fs));g.linkProgram(p);g.useProgram(p);
    const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);
    const a=g.getAttribLocation(p,"p");g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);
    const ur=g.getUniformLocation(p,"r"),ut=g.getUniformLocation(p,"t"),st=performance.now();
    requestAnimationFrame(function draw(now){
      const s=fit2d(glCanvas);g.viewport(0,0,s.w,s.h);g.uniform2f(ur,s.w,s.h);g.uniform1f(ut,(now-st)/1000);g.drawArrays(g.TRIANGLES,0,6);requestAnimationFrame(draw);
    });
  }

  async function startThree(){
    if(threeStarted)return;threeStarted=true;
    try{
      const T=await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
      const r=new T.WebGLRenderer({alpha:true,antialias:true});
      r.setPixelRatio(Math.min(devicePixelRatio||1,2));threeHost.replaceChildren(r.domElement);
      const s=new T.Scene(),c=new T.PerspectiveCamera(38,1,.1,100);c.position.set(0,0,5);
      const geo=new T.IcosahedronGeometry(1.15,2);
      const mat=new T.MeshPhysicalMaterial({color:0x86bfff,metalness:.75,roughness:.18,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.78});
      const mesh=new T.Mesh(geo,mat);mesh.position.set(1.4,-.2,0);s.add(mesh);
      s.add(new T.HemisphereLight(0xddeeff,0x111525,2.2));
      const l1=new T.PointLight(0x78c8ff,18,10);l1.position.set(3,3,3);s.add(l1);
      const l2=new T.PointLight(0xd36fff,13,10);l2.position.set(-3,-2,2);s.add(l2);
      function resize(){const w=threeHost.clientWidth,h=threeHost.clientHeight;r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix()}resize();new ResizeObserver(resize).observe(threeHost);
      requestAnimationFrame(function draw(){mesh.rotation.x+=.003;mesh.rotation.y+=.006;r.render(s,c);requestAnimationFrame(draw)});
      gpuState.textContent="GPU + 3D";
    }catch(e){
      threeHost.innerHTML="";
      gpuState.textContent="3D fallback";
    }
  }

  setLevel(0);
})();