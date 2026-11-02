/** ShopTurn-style contour geometry, millimetres; X is a DIAMETER, Z axial.
 * This computes a 2D profile, NOT a machine toolpath or collision-safe NC output. */
const EPS=1e-7,TAU=2*Math.PI;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const pt=n=>({z:n.z,r:n.x/2});
const len=v=>Math.hypot(v.z,v.r);
const sub=(a,b)=>({z:a.z-b.z,r:a.r-b.r});
const add=(a,b)=>({z:a.z+b.z,r:a.r+b.r});
const mul=(a,s)=>({z:a.z*s,r:a.r*s});
const dot=(a,b)=>a.z*b.z+a.r*b.r;
const cross=(a,b)=>a.z*b.r-a.r*b.z;
const unit=v=>{const l=len(v);if(l<EPS)throw Error('Контур: нулевой отрезок');return mul(v,1/l)};
const round=n=>Math.round(n*1e6)/1e6;
const asOut=p=>({z:round(p.z),r:round(p.r)});
const angle=(cy,cx,p)=>Math.atan2(p.r-cx,p.z-cy);
const positiveTurn=(a,b)=>(b-a+TAU*3)%TAU;
function arcData(a,b,e){
 let center,radius;
 if(e.arcMode==='center'){
  if(!finite(e.centerK)||!finite(e.centerI))throw Error('Дуга: задай K и I центра');
  center={z:e.centerK,r:e.centerI/2};radius=len(sub(a,center));
  if(radius<EPS||Math.abs(len(sub(b,center))-radius)>0.005)throw Error('Дуга: точки не лежат на окружности I/K');
 }else{
  radius=e.radius;
  if(!finite(radius)||radius<=0)throw Error('Дуга: укажи положительный R');
  const d=sub(b,a),c=len(d);
  if(c>radius*2+EPS)throw Error('Дуга: радиус меньше половины хорды');
  const mid=mul(add(a,b),0.5),h=Math.sqrt(Math.max(0,radius*radius-c*c/4)),perp={z:-d.r/c,r:d.z/c};
  const choices=[add(mid,mul(perp,h)),add(mid,mul(perp,-h))];
  const cw=e.kind==='arcCW';
  center=choices.find(p=>{
   const t=cw?-positiveTurn(angle(p.z,p.r,b),angle(p.z,p.r,a)):positiveTurn(angle(p.z,p.r,a),angle(p.z,p.r,b));
   return Math.abs(t)<=Math.PI+1e-7;
  })||choices[0];
 }
 const a0=angle(center.z,center.r,a),a1=angle(center.z,center.r,b);
 const delta=e.kind==='arcCW'?-positiveTurn(a1,a0):positiveTurn(a0,a1);
 if(Math.abs(delta)<EPS)throw Error('Дуга: совпадающие углы');
 return {center,radius,a0,delta};
}
const sampleArc=(out,data,end,steps)=>{const {center,radius,a0,delta}=data;
 const count=steps||Math.max(10,Math.ceil(Math.abs(delta)/Math.PI*48));
 for(let j=1;j<=count;j++){const a=a0+delta*j/count;out.push(asOut({z:center.z+radius*Math.cos(a),r:center.r+radius*Math.sin(a)}))}
 if(end)out[out.length-1]=asOut(end);
};
function corner(a,p,b,transition){
 const u=unit(sub(p,a)),v=unit(sub(b,p));const d=Math.max(-1,Math.min(1,dot(u,v))),turn=Math.acos(d);
 if(turn<EPS||Math.abs(Math.PI-turn)<1e-6)throw Error('Переход R/FS невозможен на параллельных или обратных линиях');
 const type=transition.type,amount=transition.value;
 const t=type==='R'?amount*Math.tan(turn/2):amount;
 if(!finite(t)||t<0.000001||t>=len(sub(p,a))-EPS||t>=len(sub(b,p))-EPS)throw Error('Переход R/FS выходит за длину соседнего элемента');
 const start=add(p,mul(u,-t)),end=add(p,mul(v,t)),dir=Math.sign(cross(u,v));
 if(!dir)throw Error('Невозможно определить сторону перехода');
 const center=type==='R'?add(start,mul({z:-u.r,r:u.z},dir*amount)):null;
 return {start,end,t,center,radius:amount,dir,type,at:p};
}
/** A single line element has X, Z end coordinates, and a mode determining its screen. */
export function validateShopContour(nodes){
 if(!Array.isArray(nodes)||nodes.length<2||nodes.length>250)throw Error('Контур: требуется 2–250 элементов');
 if(nodes[0]?.kind!=='start')throw Error('Контур должен начинаться с начальной точки');
 const blends=new Map();
 for(let i=0;i<nodes.length;i++){
  const p=nodes[i];
  if(!p||!['start','line','arcCW','arcCCW'].includes(p.kind)|| (i>0&&p.kind==='start')||
  !finite(p.x)||!finite(p.z)||p.x<0||p.x>10000||Math.abs(p.z)>10000)throw Error('Контур: неверные параметры элемента '+(i+1));
  if(i>0){
   const prev=nodes[i-1];if(len(sub(pt(p),pt(prev)))<EPS)throw Error('Контур: две совпадающие точки '+i+' и '+(i+1));
   if(p.kind==='line'){
    const mode=p.mode||'ZX';
    if(!['X','Z','ZX'].includes(mode))throw Error('Неизвестный тип прямой');
    if(mode==='X'&&Math.abs(p.z-prev.z)>EPS)throw Error('Прямая X должна иметь постоянную координату Z');
    if(mode==='Z'&&Math.abs(p.x-prev.x)>EPS)throw Error('Прямая Z должна иметь постоянный диаметр X');
   }else arcData(pt(prev),pt(p),p);
  }
  if(p.transition){
   const t=p.transition;
   if(!['R','FS'].includes(t.type)||!finite(t.value)||t.value<=0||t.value>10000)throw Error('Переход: требуется положительный R или FS');
   if(i>0&&i<nodes.length-1){
    if(p.kind!=='line'||nodes[i+1].kind!=='line')throw Error('В этом редакторе R/FS рассчитан для двух прямых; дуги и подрезы пока не поддержаны');
    blends.set(i,corner(pt(nodes[i-1]),pt(p),pt(nodes[i+1]),t));
   }
  }
  if(p.dimX&&!['ABS','INC'].includes(p.dimX)||p.dimZ&&!['ABS','INC'].includes(p.dimZ))throw Error('Недопустимый режим ABS/INC');
  if(p.extra&& (typeof p.extra!=='string'||p.extra.length>40))throw Error('Дополнительная команда: максимум 40 знаков');
 }
 for(let i=1;i<nodes.length;i++){
  const a=blends.get(i-1)?.t||0,b=blends.get(i)?.t||0;
  if(a+b>=len(sub(pt(nodes[i]),pt(nodes[i-1])))-EPS)throw Error('Соседние переходы R/FS перекрываются');
 }
 return nodes;
}
export function shopContourPath(nodes){
 validateShopContour(nodes);const blends=new Map(),out=[asOut(pt(nodes[0]))];
 for(let i=1;i<nodes.length-1;i++){const t=nodes[i].transition;if(t?.type&&nodes[i].kind==='line'&&nodes[i+1].kind==='line')blends.set(i,corner(pt(nodes[i-1]),pt(nodes[i]),pt(nodes[i+1]),t))}
 for(let i=1;i<nodes.length;i++){
  const end=pt(nodes[i]),node=nodes[i],cornerHere=blends.get(i);
  if(node.kind==='line'){
   if(!cornerHere){out.push(asOut(end));continue}
   out.push(asOut(cornerHere.start));
   if(cornerHere.type==='FS')out.push(asOut(cornerHere.end));
   else{
    const p=cornerHere.center,r=cornerHere.radius,a0=angle(p.z,p.r,cornerHere.start),
     a1=angle(p.z,p.r,cornerHere.end),delta=cornerHere.dir>0?positiveTurn(a0,a1):-positiveTurn(a1,a0);
    sampleArc(out,{center:p,radius:r,a0,delta},cornerHere.end);
   }
  }else sampleArc(out,arcData(pt(nodes[i-1]),end,node),end);
 }
 return out;
}
/** Build one new element from a previous endpoint and ShopTurn softkey input. */
export function makeShopElement(previous,kind,{x,z,dimX='ABS',dimZ='ABS',radius,arcMode='radius',centerI,centerK,direction}={}){
 if(!previous)throw Error('Нет начальной точки');
 const isLine=['X','Z','ZX'].includes(kind),isArc=kind==='arc';
 if(!isLine&&!isArc)throw Error('Неизвестная клавиша элемента');
 const px=previous.x,pz=previous.z;
 const resolve=(val,prev,mode)=>val===null||val===undefined||val===''?prev:mode==='INC'?prev+Number(val):Number(val);
 const next={id:'c'+Math.random().toString(36).slice(2,9),
  kind:isArc?(direction==='cw'?'arcCW':'arcCCW'):'line',
  ...(isLine?{mode:kind}:{}),x:kind==='Z'?px:round(resolve(x,px,dimX)),z:kind==='X'?pz:round(resolve(z,pz,dimZ)),
  dimX,dimZ};
 if(isArc){
  next.arcMode=arcMode;
  if(arcMode==='center'){next.centerI=Number(centerI);next.centerK=Number(centerK)}
  else next.radius=Number(radius);
 }
 return next;
}
