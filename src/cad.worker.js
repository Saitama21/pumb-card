// Exact B-Rep STEP export is intentionally separated from the lightweight WebGL preview.
import opencascade from 'replicad-opencascadejs';
import occtWasm from 'replicad-opencascadejs/wasm?url';
import {draw,setOC} from 'replicad';
let initialisation;
async function ready(){
 if(!initialisation){
  initialisation=opencascade({locateFile:()=>occtWasm}).then(oc=>{setOC(oc);return true});
 }
 return initialisation;
}
function makeSolid(points){
 let pen=draw(points[0]);
 for(let i=1;i<points.length;i++)pen=pen.lineTo(points[i]);
 return pen.close().sketchOnPlane('XZ').revolve([0,0,1]);
}
self.onmessage=async({data})=>{
 const {id,command,profile}=data;
 if(command!=='step')return;
 try{
  await ready();
  const solid=makeSolid(profile);
  try{
   const blob=solid.blobSTEP();
   const buffer=await blob.arrayBuffer();
   self.postMessage({id,ok:true,buffer},[buffer]);
  }finally{solid.delete?.()}
 }catch(error){self.postMessage({id,ok:false,error:String(error?.message||error)})}
};
