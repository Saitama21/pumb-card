import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildRevolvedGeometry} from './xzform-mesh.js';
let renderer,scene,camera,controls,mesh,frame=0,canvasEl;
let length=37,maxD=38;
function prepare(canvas){
 if(renderer)return;
 canvasEl=canvas;
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.15;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 scene=new THREE.Scene();
 camera=new THREE.PerspectiveCamera(38,1,.1,25000);
 scene.add(new THREE.HemisphereLight(0xeaf4ff,0x667d91,1.65));
 const key=new THREE.DirectionalLight(0xffffff,2.15);key.position.set(45,60,90);scene.add(key);
 const rim=new THREE.DirectionalLight(0x9ec9ed,.85);rim.position.set(-65,25,-70);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xf1f6ff,.7);fill.position.set(20,-30,-40);scene.add(fill);
 controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.dampingFactor=.075;
 controls.minDistance=8;controls.maxDistance=18000;
 const resize=()=>{
  const r=canvas.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  if(mesh&&w>2&&h>2)fitCamera();
 };
 new ResizeObserver(resize).observe(canvas);
 resize();
 const animate=()=>{frame=requestAnimationFrame(animate);if(canvas.closest('[hidden]'))return;controls.update();renderer.render(scene,camera)};
 animate();
}
export function updatePreview(canvas,profile,brepMesh=null){
 prepare(canvas);
 length=profile.length;maxD=profile.maxD;
 if(mesh){
  scene.remove(mesh);
  for(const child of mesh.children){child.geometry.dispose();child.material.dispose();}
  mesh.geometry.dispose();mesh.material.dispose();
 }
 canvas.dataset.geometrySource=brepMesh?'occt-brep':'lathe';
 const geometry=brepMesh?new THREE.BufferGeometry():buildRevolvedGeometry(profile.polygon);
 if(brepMesh){
  geometry.setAttribute('position',new THREE.BufferAttribute(brepMesh.vertices,3));
  geometry.setIndex(new THREE.BufferAttribute(brepMesh.triangles,1));
  if(brepMesh.normals?.length===brepMesh.vertices.length)
   geometry.setAttribute('normal',new THREE.BufferAttribute(brepMesh.normals,3));
  else geometry.computeVertexNormals();
 }
 const material=new THREE.MeshStandardMaterial({
  color:0xb2c3d0,metalness:.26,roughness:.46,side:THREE.FrontSide
 });
 mesh=new THREE.Mesh(geometry,material);
 // Turning geometry is axial Y internally; lay it horizontally for a
 // natural engineering isometric view without altering exact STEP coordinates.
 if(brepMesh)mesh.rotation.y=Math.PI/2;
 else mesh.rotation.z=-Math.PI/2;
 const edgeGeometry=new THREE.EdgesGeometry(geometry,35);
 const outline=new THREE.LineSegments(edgeGeometry,
  new THREE.LineBasicMaterial({color:0x4f6d84,transparent:true,opacity:.44,depthWrite:false}));
 mesh.add(outline);
 scene.add(mesh);
 fitCamera();
}
export function fitCamera(){
 if(!camera||!controls)return;
 const halfVertical=THREE.MathUtils.degToRad(camera.fov)*.5;
 const halfHorizontal=Math.atan(Math.tan(halfVertical)*Math.max(.2,camera.aspect));
 const halfFov=Math.min(halfVertical,halfHorizontal);
 const radius=Math.hypot(length/2,maxD/2);
 const distance=radius/Math.max(.08,Math.sin(halfFov))*1.22;
 const center=new THREE.Vector3(length/2,0,0);
 controls.target.copy(center);
 const direction=new THREE.Vector3(1.05,.75,1.5).normalize();
 camera.position.copy(center).addScaledVector(direction,distance);
 camera.near=Math.max(.01,distance/1000);
 camera.far=Math.max(1000,distance*15);
 camera.updateProjectionMatrix();
 controls.update();
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
