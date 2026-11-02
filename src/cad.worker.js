// B-Rep is the source of truth for both STEP and the triangular 3D preview.
import opencascade from 'replicad-opencascadejs';
import occtWasm from 'replicad-opencascadejs/wasm?url';
import {draw,setOC,makeBaseBox} from 'replicad';

let initialisation;
async function ready(){
 if(!initialisation){
  initialisation=opencascade({locateFile:()=>occtWasm}).then(oc=>{setOC(oc);return true});
 }
 return initialisation;
}
function makeSolid(points,flats=[],maxD=0){
 let pen=draw(points[0]);
 for(let i=1;i<points.length;i++)pen=pen.lineTo(points[i]);
 let solid=pen.close().sketchOnPlane('XZ').revolve([0,0,1]);
 try{
  for(const flat of flats){
   const W=Math.max(maxD,...points.map(p=>p[0]*2))+4;
   const slabLength=flat.localZ1-flat.localZ0;
   if(!Number.isFinite(flat.width)||!Number.isFinite(slabLength)||slabLength<=0)throw Error('Некорректный размер фрезеруемой плоскости');
   const extra=.02; // trim just beyond the planar end face for robust Boolean.
   for(const sign of [1,-1]){
    let cutter=makeBaseBox(W*2,W*2,slabLength+2*extra)
      .translate(sign*(flat.width/2+W),0,flat.localZ0-extra)
      .rotate(flat.angle,[0,0,0],[0,0,1]);
    try{
     const cut=solid.cut(cutter);
     solid.delete?.();
     solid=cut;
    }finally{cutter.delete?.()}
   }
  }
  return solid;
 }catch(err){solid.delete?.();throw err}
}
self.onmessage=async({data})=>{
 const {id,command,profile,flats,maxD}=data;
 if(command!=='step'&&command!=='mesh')return;
 let solid;
 try{
  await ready();
  solid=makeSolid(profile,flats||[],maxD||0);
  if(command==='step'){
   const blob=solid.blobSTEP();
   const buffer=await blob.arrayBuffer();
   self.postMessage({id,ok:true,buffer},[buffer]);
  }else{
   const result=solid.mesh({tolerance:.07,angularTolerance:12});
   const vertices=Float32Array.from(result.vertices);
   const triangles=Uint32Array.from(result.triangles);
   const normals=Float32Array.from(result.normals||[]);
   if(!vertices.length||!triangles.length)throw Error('B-Rep не удалось преобразовать в сетку 3D');
   self.postMessage({id,ok:true,vertices,triangles,normals},[vertices.buffer,triangles.buffer,normals.buffer]);
  }
 }catch(error){self.postMessage({id,ok:false,error:String(error?.message||error)})}
 finally{solid?.delete?.()}
};
