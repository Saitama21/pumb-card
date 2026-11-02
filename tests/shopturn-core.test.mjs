import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleModel} from '../src/model.js';
import {defaultPlan,defaultOperation,validatePlan,sanitizePlan,contourFromModel,contourPath,validateContour,modelMatches} from '../src/shopturn-core.js';

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
