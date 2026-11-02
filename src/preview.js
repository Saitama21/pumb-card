import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
let renderer,scene,camera,controls,mesh,frame=0,canvasEl;
let length=37,maxD=38;
function prepare(canvas){
 if(renderer)return;
 canvasEl=canvas;
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(38,1,.1,25000);
 scene.add(new THREE.HemisphereLight(0xc6e8ff,0x142b44,2.4));
 const key=new THREE.DirectionalLight(0xf2fbff,3.6);key.position.set(45,60,90);scene.add(key);
 const rim=new THREE.DirectionalLight(0x29b9ff,2);rim.position.set(-60,40,-40);scene.add(rim);
 controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.dampingFactor=.075;
 controls.minDistance=8;controls.maxDistance=18000;
 const resize=()=>{
  const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
 };
 new ResizeObserver(resize).observe(canvas);
 resize();
 const animate=()=>{frame=requestAnimationFrame(animate);if(canvas.closest('[hidden]'))return;controls.update();renderer.render(scene,camera)};
 animate();
}
function buildGeometry(profile){
 const list=profile.polygon.map(([radius,z])=>new THREE.Vector2(radius,z));
 if(!list[0].equals(list.at(-1)))list.push(list[0].clone());
 return new THREE.LatheGeometry(list,96,0,Math.PI*2);
}
export function updatePreview(canvas,profile){
 prepare(canvas);
 length=profile.length;maxD=profile.maxD;
 if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}
 mesh=new THREE.Mesh(buildGeometry(profile),new THREE.MeshStandardMaterial({
 color:0xa7c9dd,metalness:.72,roughness:.27,side:THREE.DoubleSide
 }));
 scene.add(mesh);
 fitCamera();
}
export function fitCamera(){
 if(!camera||!controls)return;
 const size=Math.max(length,maxD),center=length/2;
 controls.target.set(0,center,0);
 camera.position.set(size*1.5,center+size*.92,size*1.7);
 camera.near=Math.max(.01,size/1000);camera.far=Math.max(1000,size*60);
 camera.updateProjectionMatrix();controls.update();
}
export function zoom(factor){
 if(!camera||!controls)return;
 camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);
 controls.update();
}
export function drawProfile(svg,profile){
 const {polygon,outer,inner,length:L,maxD:D}=profile;
 const W=460,H=270,scale=Math.min(374/L,180/D);
 const x=z=>43+z*scale, y=r=>H/2-r*scale;
 const path=polygon.map(([r,z],i)=>`${i?'L':'M'}${x(z).toFixed(2)} ${y(r).toFixed(2)}`).join(' ')+' Z';
 const flip=polygon.map(([r,z],i)=>`${i?'L':'M'}${x(z).toFixed(2)} ${y(-r).toFixed(2)}`).join(' ')+' Z';
 svg.replaceChildren();
 const ns='http://www.w3.org/2000/svg';
 const add=(tag,attributes,parent=svg)=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attributes))node.setAttribute(k,v);parent.append(node);return node};
 add('path',{d:path,stroke:'#77d6ff',fill:'#2378b044','stroke-width':'1.9','stroke-linejoin':'round'});
 add('path',{d:flip,stroke:'#77d6ff',fill:'#2378b044','stroke-width':'1.9','stroke-linejoin':'round'});
 add('path',{d:`M 21 ${H/2} H ${W-21}`,stroke:'#819cb7','stroke-dasharray':'7 6','stroke-width':'1'});
 const lx=x(0),rx=x(L),yy=H-36;
 for(const px of [lx,rx])add('path',{d:`M${px} ${yy-8}v16`,stroke:'#a3bad0'});
 add('path',{d:`M${lx} ${yy}H${rx}`,stroke:'#adcee2','stroke-width':'1.3'});
 const label=add('text',{x:(lx+rx)/2,y:yy-7,'text-anchor':'middle',fill:'#d9f4ff','font-size':13,'font-weight':800});label.textContent='L '+L.toFixed(2)+' мм';
 const diameter=add('text',{x:W-12,y:24,'text-anchor':'end',fill:'#70d4ff','font-size':12,'font-weight':800});diameter.textContent='⌀ '+D.toFixed(2)+' мм';
}

/** Optional gentle auto rotation; existing 3D controls remain user-driven. */
export function toggleAutoRotate(){if(!controls)return false;controls.autoRotate=!controls.autoRotate;controls.autoRotateSpeed=1.2;return controls.autoRotate;}
