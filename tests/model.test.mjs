import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleModel,modelProfile,sanitizeModel,totalLength,validateModel} from '../src/model.js';
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
 assert.throws(()=>validateModel(m),/пересекаются/);
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
