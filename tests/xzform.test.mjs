import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPart,examplePart,fromLegacy,normalizePart} from '../src/xzform-core.js';
const altered=(fn)=>{const p=structuredClone(examplePart());fn(p);return p;};
test('Reference DKK sketch: diameter, length, hole and true closed solid',()=>{
 const x=buildPart(examplePart());
 assert.equal(x.length,58);assert.equal(x.maxD,31);assert.equal(x.zMin,-58);assert.equal(x.zMax,0);
 assert.equal(x.profile.outer[0][0],15.5);assert.equal(x.profile.outer.at(-1)[0],9);
 assert.ok(x.profile.inner.some(p=>p[0]===6.1));
 assert.equal(x.profile.polygon.length>=6,true);
});
test('Every X is diameter, so body radius is X/2',()=>{
 const x=buildPart(altered(p=>p.holes=[]));
 assert.equal(x.profile.outer[0][0],15.5);
 assert.equal(x.profile.outer.at(-1)[0],9);
 assert.equal(x.profile.inner.length,0);
 assert.ok(x.profile.polygon.some(([r])=>r===0));
});
test('Incremental order of points can run from left face to right face',()=>{
 const part=altered(p=>p.points.reverse());const x=buildPart(part);
 assert.equal(x.length,58);assert.equal(x.profile.outer[0][0],15.5);
});
test('Reversing Z direction in the middle is forbidden',()=>{
 const part=altered(p=>p.points[2].z=10);
 assert.throws(()=>buildPart(part),/без возврата назад/);
});
test('Repeated consecutive nodes are not valid CAD edges',()=>{
 const part=altered(p=>p.points[1]={...p.points[0],id:'other'});
 assert.throws(()=>buildPart(part),/Совпадающие/);
});
test('Invalid diameter or wall intersection fails explicitly',()=>{
 assert.throws(()=>buildPart(altered(p=>p.points[1].x=0)),/X должны быть положительными/);
 assert.throws(()=>buildPart(altered(p=>p.holes[0].d=19)),/пересекает наружный контур/);
});
test('Blind bore from the right ends at the axis, no fabricated through-hole',()=>{
 const x=buildPart(altered(p=>p.holes[0].z0=-20));
 assert.ok(x.profile.inner.some(([r,z])=>r===0&&z===0));
 assert.ok(x.profile.inner.some(([r,z])=>r===6.1&&z===38));
});
test('Multiple connected axial hole sections form stepped bore profile',()=>{
 const x=buildPart(altered(p=>{
  p.holes=[{id:'a',d:10,z0:-58,z1:-30},{id:'b',d:12,z0:-30,z1:0}];
 }));
 assert.ok(x.profile.inner.some(([r])=>r===5));
 assert.ok(x.profile.inner.some(([r])=>r===6));
});
test('Unsupported separate internal voids fail rather than silently export',()=>{
 assert.throws(()=>buildPart(altered(p=>{
  p.holes=[{id:'a',d:8,z0:-58,z1:-40},{id:'b',d:8,z0:-10,z1:0}];
 })),/Раздельные глухие/);
});
test('An enclosed void that does not touch a face is not allowed',()=>{
 assert.throws(()=>buildPart(altered(p=>p.holes=[{id:'a',d:8,z0:-40,z1:-20}])),/хотя бы на один торец/);
});
test('Legacy projects with simple steps are migrated without mutating source',()=>{
 const old={name:'Legacy',bore:8,steps:[{type:'cylinder',d:30,length:20},{type:'cylinder',d:20,length:10}],grooves:[],innerGrooves:[],innerSections:[]};
 const original=JSON.stringify(old);
 const next=fromLegacy(old);const x=buildPart(next);
 assert.equal(x.length,30);assert.equal(x.maxD,30);assert.equal(next.points[0].z,0);assert.equal(next.holes[0].z0,-30);
 assert.equal(JSON.stringify(old),original);
});
test('Legacy projects with unsupported internal features never lose their features silently',()=>{
 const old={name:'Legacy',bore:8,steps:[{type:'cylinder',d:30,length:20}],grooves:[{z:2,width:3,d:25}]};
 assert.throws(()=>fromLegacy(old),/необходима полная миграция/);
});
test('Canonical numeric parsing rejects unsafe strings and invalid JSON',()=>{
 assert.throws(()=>buildPart(normalizePart({points:[],holes:[]})),/от 2 до 250/);
 assert.throws(()=>normalizePart({points:null,holes:[]}),/Неверный формат/);
});


test('DKK-007 example includes a physical 2-flat S27 operation on Ø31 head',()=>{
 const p=examplePart(),geometry=buildPart(p);
 assert.equal(p.flats.length,1);
 assert.deepEqual(geometry.flats.map(f=>[f.width,f.localZ0,f.localZ1,f.angle]),[[27,0,21,0]]);
 assert.equal(geometry.length,58);
 assert.equal(geometry.maxD,31);
});
test('Older saved projects without flats remain valid with no destructive migration',()=>{
 const p=examplePart();delete p.flats;
 const v=normalizePart(p);
 assert.deepEqual(v.flats,[]);
 assert.equal(buildPart(v).length,58);
});
test('Flats reject unsafe width or intersection with through-bore',()=>{
 const p=examplePart();
 p.flats[0].width=32;
 assert.throws(()=>buildPart(p),/Размер S/);
 p.flats[0].width=12;
 assert.throws(()=>buildPart(p),/пересекают отверстие/);
 p.flats[0].width=27;p.flats[0].z0=-70;
 assert.throws(()=>buildPart(p),/внутри длины/);
});
test('Flats cannot enter smaller turning step or overlap another pair',()=>{
 const p=examplePart();p.flats[0].z1=0;
 assert.throws(()=>buildPart(p),/Размер S/);
 p.flats[0].z1=-37;
 p.flats.push({...p.flats[0],id:'other',z0:-50});
 assert.throws(()=>buildPart(p),/Перекрывающиеся/);
});
test('Angular orientation normalizes to one paired-flat half-turn',()=>{
 const p=examplePart();p.flats[0].angle=225;
 assert.equal(buildPart(p).flats[0].angle,45);
});
