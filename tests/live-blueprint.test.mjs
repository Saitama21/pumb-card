import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleModel} from '../src/model.js';
import {toDisplayZ,fromDisplayZ,featureBounds,selectionDetails,selectAt} from '../src/live-blueprint.js';
const sample=()=>{
 const m=exampleModel();
 m.innerSections=[{id:'bore',type:'cylinder',z:5,length:10,d:25}];
 m.grooves=[{id:'cut',z:20,width:2,d:28}];
 return m;
};
test('Z-origin toggle never changes internal geometry',()=>{
 const L=37;
 for(const [physical,span] of [[0,5],[5,10],[20,2],[31,6]]){
  const right=toDisplayZ(physical,span,L,'right');
  assert.equal(fromDisplayZ(right,span,L,'right'),physical);
  assert.equal(toDisplayZ(physical,span,L,'left'),physical);
  assert.equal(fromDisplayZ(physical,span,L,'left'),physical);
 }
 assert.equal(toDisplayZ(5,10,L,'right'),22);
});
test('selected outer step dimensions use actual cumulative axial length',()=>{
 const m=sample();
 assert.deepEqual(featureBounds(m,'steps',2),{
  kind:'steps',index:2,z0:22,z1:26,d:26,dEnd:null,title:'Наружная ступень'
 });
 assert.equal(selectionDetails(m,{kind:'steps',index:2},'right').displayStart,11);
 assert.equal(selectionDetails(m,{kind:'steps',index:2},'left').displayEnd,26);
});
test('inner boring Z, diameter and length appear correctly from either face',()=>{
 const m=sample();
 const left=selectionDetails(m,{kind:'innerSections',index:0},'left');
 const right=selectionDetails(m,{kind:'innerSections',index:0},'right');
 assert.equal(left.displayStart,5);assert.equal(left.displayEnd,15);
 assert.equal(right.displayStart,22);assert.equal(right.displayEnd,32);
 assert.match(left.label,/Ø25,000 · Z5,00–15,00/);
});
test('groove physical bounds stay stable after Z origin flipping',()=>{
 const m=sample();
 const f=featureBounds(m,'grooves',0);
 assert.equal(f.z0,20);assert.equal(f.z1,22);
 assert.equal(selectionDetails(m,{kind:'grooves',index:0},'right').displayStart,15);
});
test('diagram pick selects internal bore close to axis and outside step otherwise',()=>{
 const m=sample();
 assert.deepEqual(selectAt(m,7,true),{kind:'innerSections',index:0});
 assert.deepEqual(selectAt(m,12,false),{kind:'steps',index:1});
 assert.deepEqual(selectAt(m,21,false),{kind:'grooves',index:0});
 assert.deepEqual(selectAt(m,27,false),{kind:'steps',index:3});
 assert.equal(selectionDetails(m,{kind:'steps',index:100}),null);
});
