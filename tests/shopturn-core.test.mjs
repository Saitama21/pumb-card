import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleModel} from '../src/model.js';
import {defaultPlan,defaultOperation,validatePlan,sanitizePlan,contourFromModel,contourPath,validateContour,modelMatches} from '../src/shopturn-core.js';
import {makeShopElement,validateShopContour,shopContourPath} from '../src/contour-geometry.js';

test('default process header derives real dimensions from CAD and locks G54',()=>{
 const model=exampleModel(),plan=defaultPlan(model);
 assert.equal(plan.header.g54,'G54');
 assert.equal(plan.header.xa,38);
 assert.equal(plan.header.xi,24);
 assert.equal(plan.header.zi,-37);
 assert.equal(plan.header.toolChange,'MCS');
 assert.equal(plan.header.xt,null);
 assert.equal(plan.header.zt,null);
 assert.equal(plan.operations.length,3);
 assert.equal(validatePlan(plan),plan);
});
test('generated contour uses front Z0 and diameter X, not radii',()=>{
 const nodes=contourFromModel(exampleModel());
 assert.equal(nodes[0].kind,'start');
 assert.equal(nodes[0].z,0);
 assert.equal(nodes.at(-1).z,-37);
 assert.ok(nodes.some(p=>p.x===38));
 assert.deepEqual(contourPath(nodes).at(-1),{z:-37,r:19});
});
test('round-trip save of operation card preserves tool, D, feeds and contour',()=>{
 const plan=defaultPlan(exampleModel());
 plan.operations.push(defaultOperation('groove',plan));
 plan.operations[3].tool='T9';
 plan.operations[3].edge=2;
 plan.operations[3].feed=0.05;
 assert.deepEqual(sanitizePlan(JSON.parse(JSON.stringify(plan))),plan);
});
test('arcs interpolate geometrically between exact diameter coordinates',()=>{
 const points=[{id:'a',kind:'start',x:20,z:0},{id:'b',kind:'arcCW',x:30,z:-10,radius:12}];
 const samples=contourPath(points);
 assert.ok(samples.length>8);
 assert.deepEqual(samples[0],{z:0,r:10});
 assert.ok(Math.abs(samples.at(-1).z+10)<1e-5);
 assert.ok(Math.abs(samples.at(-1).r-15)<1e-5);
});
test('invalid arc radius, doubled points and illegal origin fail',()=>{
 const base=[{kind:'start',x:30,z:0},{kind:'arcCW',x:35,z:-15,radius:2}];
 assert.throws(()=>validateContour(base),/радиус/);
 base[1]={kind:'line',x:30,z:0};
 assert.throws(()=>validateContour(base),/совпадающие/);
 const plan=defaultPlan(exampleModel());
 plan.header.g54='G55';
 assert.throws(()=>validatePlan(plan),/G54/);
});
test('operations exceeding capped spindle speed cannot be stored',()=>{
 const plan=defaultPlan(exampleModel());
 plan.operations[0].speed=plan.header.maxS+1;
 assert.throws(()=>validatePlan(plan),/S выше/);
});
test('outdated CAD geometry is detected without overwriting user operation plan',()=>{
 const m=exampleModel(),plan=defaultPlan(m);
 assert.equal(modelMatches(plan,m),true);
 const revised=structuredClone(m);revised.steps[1].d=29;
 assert.equal(modelMatches(plan,revised),false);
});

test('ShopTurn softkeys create separate horizontal Z and vertical X elements',()=>{
 const start={kind:'start',x:40,z:0};
 const alongZ=makeShopElement(start,'Z',{z:-12,dimZ:'ABS'});
 assert.equal(alongZ.mode,'Z');assert.equal(alongZ.x,40);assert.equal(alongZ.z,-12);
 const alongX=makeShopElement(alongZ,'X',{x:-4,dimX:'INC'});
 assert.equal(alongX.mode,'X');assert.equal(alongX.z,-12);assert.equal(alongX.x,36);
 const diagonal=makeShopElement(alongX,'ZX',{z:-5,x:30,dimZ:'INC'});
 assert.equal(diagonal.mode,'ZX');assert.equal(diagonal.z,-17);assert.equal(diagonal.x,30);
 assert.doesNotThrow(()=>validateShopContour([start,alongZ,alongX,diagonal]));
});
test('wrong axis travel in Z/X masks is not accepted',()=>{
 const start={kind:'start',x:40,z:0};
 assert.throws(()=>validateShopContour([start,{kind:'line',mode:'Z',x:38,z:-8}]),/постоянн/);
 assert.throws(()=>validateShopContour([start,{kind:'line',mode:'X',x:38,z:-8}]),/постоянн/);
});
test('R on a line is a real tangent radius transition to the next line',()=>{
 const nodes=[
  {kind:'start',x:20,z:0},
  {kind:'line',mode:'Z',x:20,z:-10,transition:{type:'R',value:2}},
  {kind:'line',mode:'X',x:30,z:-10}
 ];
 const pts=shopContourPath(nodes);
 assert.ok(pts.length>10);
 assert.ok(pts.some(p=>Math.abs(p.z+8)<1e-5&&Math.abs(p.r-10)<1e-5));
 assert.ok(pts.some(p=>Math.abs(p.z+10)<1e-5&&Math.abs(p.r-12)<1e-5));
 assert.ok(pts.every(p=>Number.isFinite(p.z)&&Number.isFinite(p.r)));
});
test('FS on a line is a real 2-leg chamfer, no radius',()=>{
 const nodes=[
  {kind:'start',x:20,z:0},
  {kind:'line',mode:'Z',x:20,z:-10,transition:{type:'FS',value:1}},
  {kind:'line',mode:'X',x:30,z:-10}
 ];
 const pts=shopContourPath(nodes);
 assert.ok(pts.some(p=>Math.abs(p.z+9)<1e-5&&Math.abs(p.r-10)<1e-5));
 assert.ok(pts.some(p=>Math.abs(p.z+10)<1e-5&&Math.abs(p.r-11)<1e-5));
 assert.ok(!pts.some(p=>Math.abs(p.z+10)<1e-5&&Math.abs(p.r-10)<1e-5));
});
test('invalid oversized R and incompatible arc transition fail safely',()=>{
 const nodes=[
  {kind:'start',x:20,z:0},
  {kind:'line',mode:'Z',x:20,z:-4,transition:{type:'R',value:8}},
  {kind:'line',mode:'X',x:24,z:-4}
 ];
 assert.throws(()=>shopContourPath(nodes),/выходит за длину/);
 nodes[1].transition.value=0.8;
 nodes[2]={kind:'arcCW',x:24,z:-4,radius:3};
 assert.throws(()=>shopContourPath(nodes),/для двух прямых/);
});
test('circle supports center I diameter, K axial and roundtrip transition metadata',()=>{
 const model=exampleModel(),plan=defaultPlan(model);
 const first={kind:'start',x:20,z:0};
 const arc={kind:'arcCW',x:30,z:-10,arcMode:'center',centerI:30,centerK:0,dimX:'ABS',dimZ:'ABS'};
 // endpoint is at (-10,r15), start at (0,r10): not equal radius — check geometry input
 assert.throws(()=>shopContourPath([first,arc]),/окружности/);
 const good={kind:'arcCW',x:30,z:-5,arcMode:'center',centerI:20,centerK:-5};
 const p=shopContourPath([first,good]);assert.ok(p.length>=10);
 plan.contour=[{kind:'start',x:20,z:0},{kind:'line',mode:'Z',x:20,z:-10,transition:{type:'FS',value:1}},{kind:'line',mode:'X',x:30,z:-10,dimX:'INC'}];
 const result=sanitizePlan(JSON.parse(JSON.stringify(plan)));
 assert.equal(result.contour[1].transition.type,'FS');
 assert.equal(result.contour[1].transition.value,1);
 assert.equal(result.contour[2].mode,'X');
 assert.equal(result.contour[2].dimX,'INC');
});
