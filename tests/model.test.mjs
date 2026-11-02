import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleModel,modelProfile,sanitizeModel,totalLength,resizeTotalLength,validateModel,insideAt} from '../src/model.js';
const part=()=>exampleModel();
test('original sample produces exact stepped turning profile',()=>{
 const m=part(),p=modelProfile(m);
 assert.equal(p.length,37);assert.equal(p.maxD,38);assert.equal(m.bore,24);
 assert.deepEqual(p.outer.slice(0,4),[[19,0],[19,10],[15,10],[15,22]]);
 assert.ok(p.polygon.length>=8);
});
test('solid cylinder creates closed axis profile',()=>{
 const m={version:1,name:'Solid',bore:0,steps:[{id:'1',type:'cylinder',d:20,length:25}],grooves:[],innerGrooves:[]};
 const p=modelProfile(m);
 assert.deepEqual(p.polygon.at(-1),[0,0]);
 assert.deepEqual(p.polygon.at(-2),[0,25]);
});
test('taper is represented geometrically without arbitrary polygon tessellation',()=>{
 const m=part();m.steps[0]={id:'s1',type:'taper',d:38,dEnd:35,length:10};
 const p=modelProfile(m);
 assert.deepEqual(p.outer[0],[19,0]);assert.deepEqual(p.outer[1],[17.5,10]);
});
test('external and internal grooves produce exact axial shoulders',()=>{
 const m=part();m.grooves.push({id:'g',z:3,width:2,d:32});
 m.innerGrooves.push({id:'h',z:25,width:2,d:24.5});
 const p=modelProfile(m);assert.ok(p.polygon.some(([r,z])=>r===16&&z===3));
 assert.ok(p.polygon.some(([r,z])=>r===12.25&&z===25));
});
test('invalid geometry rejected without changing active model',()=>{
 const m=part();m.bore=40;
 assert.throws(()=>validateModel(m),/пересекает/);
 m.bore=24;m.grooves.push({id:'g',z:3,width:2,d:23});
 assert.throws(()=>validateModel(m),/пересекает/);
 m.grooves=[];m.innerGrooves.push({id:'g',z:22.1,width:2,d:40});
 assert.throws(()=>validateModel(m),/пересекает|пересекаются/);
});
test('project import validates numbers and bounded operations',()=>{
 const m=part();
 assert.deepEqual(sanitizeModel(JSON.parse(JSON.stringify(m))),m);
 assert.throws(()=>sanitizeModel({...m,steps:[]}));
 assert.throws(()=>sanitizeModel({...m,bore:'abc'}));
 assert.throws(()=>sanitizeModel({...m,steps:Array.from({length:81},(_,i)=>({id:i.toString(),type:'cylinder',d:25,length:1}))}));
});
test('total length adds exact segments',()=>{
 assert.equal(totalLength(part()),37);
});

test('multiple internal boring diameters form exact full inside profile',()=>{
 const m=part();m.bore=0;
 m.innerSections=[
  {id:'a',type:'cylinder',z:0,length:10,d:31},
  {id:'b',type:'cylinder',z:10,length:10,d:27},
  {id:'c',type:'cylinder',z:20,length:17,d:24}
 ];
 const p=modelProfile(m);
 assert.equal(p.length,37);
 assert.equal(insideAt(m,5),15.5);
 assert.equal(insideAt(m,11),13.5);
 assert.equal(insideAt(m,27),12);
 assert.ok(p.inner.some(([r,z])=>r===15.5&&z===10));
 assert.ok(p.inner.some(([r,z])=>r===13.5&&z===10));
 assert.ok(p.inner.some(([r,z])=>r===12&&z===37));
 assert.deepEqual(sanitizeModel(JSON.parse(JSON.stringify(m))),m);
});
test('blind drilling from left and right produces capped bore at exact depth',()=>{
 const left=part();left.bore=0;
 left.innerSections=[{id:'left',type:'cylinder',z:0,length:16,d:16}];
 const p=modelProfile(left);
 assert.ok(p.polygon.some(([r,z])=>r===8&&z===16));
 assert.ok(p.polygon.some(([r,z])=>r===0&&z===16));
 const right=part();right.bore=0;right.innerSections=[{id:'right',type:'cylinder',z:22,length:15,d:16}];
 const r=modelProfile(right);
 assert.ok(r.polygon.some(([rr,z])=>rr===8&&z===22));
 assert.ok(r.polygon.some(([rr,z])=>rr===0&&z===22));
});
test('conical internal boring has exact end diameters',()=>{
 const m=part();m.bore=0;
 m.innerSections=[{id:'taper',type:'taper',z:0,length:10,d:14,dEnd:18}];
 const p=modelProfile(m);
 assert.equal(insideAt(m,0,1),7);
 assert.equal(insideAt(m,5),8);
 assert.equal(insideAt(m,10,-1),9);
 assert.ok(p.inner.some(([r,z])=>r===9&&z===10));
});
test('overlapping, enclosed or wall-breaking bores are blocked',()=>{
 const m=part();m.bore=0;
 m.innerSections=[{id:'a',type:'cylinder',z:4,length:10,d:20}];
 assert.throws(()=>validateModel(m),/торец/);
 m.innerSections[0].z=0;
 m.innerSections.push({id:'b',type:'cylinder',z:8,length:12,d:22});
 assert.throws(()=>validateModel(m),/перекрываются/);
 m.innerSections=[{id:'big',type:'cylinder',z:0,length:17,d:31}];
 assert.throws(()=>validateModel(m),/пересекает/);
});
test('migration of earlier v0.1 models retains bores and empty new sections',()=>{
 const old=part();delete old.innerSections;
 const next=sanitizeModel(old);
 assert.equal(next.bore,24);
 assert.deepEqual(next.innerSections,[]);
 assert.equal(modelProfile(next).length,37);
});
test('inner ring groove requires an existing open bore',()=>{
 const m=part();m.bore=0;
 m.innerGrooves=[{id:'g',z:3,width:2,d:12}];
 assert.throws(()=>validateModel(m),/существующей расточки/);
 m.innerSections=[{id:'i',type:'cylinder',z:0,length:10,d:10}];
 assert.doesNotThrow(()=>validateModel(m));
});

test('editable overall length resizes exactly the final step and recalculates the CAD profile',()=>{
 const original=part();
 const extended=resizeTotalLength(original,52.5);
 assert.equal(totalLength(extended),52.5);
 assert.equal(extended.steps.at(-1).length,26.5);
 assert.deepEqual(extended.steps.slice(0,-1),original.steps.slice(0,-1));
 assert.equal(modelProfile(extended).length,52.5);
 assert.equal(totalLength(original),37,'resizing must not mutate persisted geometry');
 const shortened=resizeTotalLength(original,30);
 assert.equal(shortened.steps.at(-1).length,4);
 assert.equal(totalLength(shortened),30);
});
test('single-step new part has freely editable length and exact dimensions',()=>{
 const single={version:1,name:'Новая деталь',bore:0,steps:[{id:'s',type:'cylinder',d:38,length:37}],grooves:[],innerGrooves:[],innerSections:[]};
 const edited=resizeTotalLength(single,85.25);
 assert.equal(totalLength(edited),85.25);
 assert.equal(edited.steps[0].length,85.25);
 assert.equal(modelProfile(edited).length,85.25);
 assert.equal(sanitizeModel(edited).steps[0].length,85.25);
});
test('invalid overall length is rejected without touching original model',()=>{
 const original=part();
 for(const bad of [0,-1,Number.NaN,Infinity,10000.01,26,26.0005])assert.throws(()=>resizeTotalLength(original,bad));
 assert.equal(totalLength(original),37);
});
test('shortening cannot silently cut off grooves or inner bores',()=>{
 const original=part();
 original.grooves.push({id:'g',z:34,width:2,d:32});
 original.innerSections.push({id:'bore',type:'cylinder',z:30,length:7,d:25});
 assert.throws(()=>resizeTotalLength(original,35),/выходит за длину/);
 assert.equal(totalLength(original),37);
 assert.equal(totalLength(resizeTotalLength(original,42)),42);
});
