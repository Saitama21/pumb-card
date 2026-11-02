import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPart,examplePart} from '../src/xzform-core.js';
import {buildRevolvedGeometry} from '../src/xzform-mesh.js';

function solidCylinder(){
 const p=structuredClone(examplePart());
 p.points=[{id:'a',x:31,z:-37},{id:'b',x:31,z:-58}];
 p.holes=[];
 return buildPart(p).profile;
}
test('A solid cylindrical end face is planar: cap normals are axial, never averaged into a dimple',()=>{
 const profile=solidCylinder();
 const mesh=buildRevolvedGeometry(profile.polygon,128);
 const normal=mesh.getAttribute('normal'),position=mesh.getAttribute('position');
 let rightCap=0,leftCap=0,outside=0;
 for(let i=0;i<normal.count;i++){
  const nx=normal.getX(i),ny=normal.getY(i),nz=normal.getZ(i);
  assert.ok(Math.abs(Math.hypot(nx,ny,nz)-1)<1e-5,'unit normal at '+i);
  if(ny>.99){rightCap++;assert.ok(Math.abs(position.getY(i)-profile.length)<1e-6);}
  if(ny<-.99){leftCap++;assert.ok(Math.abs(position.getY(i))<1e-6);}
  if(Math.abs(ny)<1e-6){outside++;}
 }
 assert.ok(rightCap>200&&leftCap>200&&outside>200);
 assert.ok(mesh.index.count>1500);
 mesh.dispose();
});
test('A hollow axial profile is revolved with real inner-wall normals',()=>{
 const p=structuredClone(examplePart());
 const profile=buildPart(p).profile;
 const mesh=buildRevolvedGeometry(profile.polygon,96);
 let inward=0,outward=0;
 const n=mesh.getAttribute('normal');
 for(let i=0;i<n.count;i++){
  if(n.getX(i)<-.95)inward++;
  if(n.getX(i)>.95)outward++;
 }
 assert.ok(inward>0&&outward>0);
 mesh.dispose();
});
test('Invalid or degenerate profile cannot generate pretend 3D',()=>{
 assert.throws(()=>buildRevolvedGeometry([[0,0],[0,1],[0,2]]),/Не удалось сформировать/);
 assert.throws(()=>buildRevolvedGeometry([[0,0],[5,1],[0,1]],3),/сегментов/);
});
