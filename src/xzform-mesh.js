import * as THREE from 'three';

/**
 * Revolve a closed axial polygon [radius, z] around Y.
 * Each 2D edge owns independent vertex rings, so a cap's axial normal
 * never blends with the cylindrical side. Sharing normals across profile
 * corners (THREE.LatheGeometry) caused false "dented" solid end faces.
 *
 * Orientation is taken from the contour winding:
 * [outer from left to right, interior from right to left].
 */
export function buildRevolvedGeometry(polygon,segments=128){
 if(!Array.isArray(polygon)||polygon.length<3)throw Error('Нужен замкнутый контур сечения');
 if(!Number.isInteger(segments)||segments<12||segments>512)throw Error('Недопустимое число сегментов');
 const coords=[],normals=[],indices=[];
 const edgeCount=polygon.length;
 for(let edge=0;edge<edgeCount;edge++){
  const [r0,z0]=polygon[edge];
  const [r1,z1]=polygon[(edge+1)%edgeCount];
  if(![r0,z0,r1,z1].every(Number.isFinite)||r0<0||r1<0)throw Error('Некорректный профиль вращения');
  const dr=r1-r0,dz=z1-z0,hyp=Math.hypot(dr,dz);
  if(hyp<1e-8||(r0===0&&r1===0))continue;
  const radial=dz/hyp,axial=-dr/hyp;
  const base=coords.length/3;
  for(let j=0;j<=segments;j++){
   const t=j*2*Math.PI/segments,cs=Math.cos(t),sn=Math.sin(t);
   for(const [radius,z] of [[r0,z0],[r1,z1]]){
    coords.push(radius*cs,z,radius*sn);
    normals.push(radial*cs,axial,radial*sn);
   }
  }
  for(let j=0;j<segments;j++){
   const a=base+j*2,b=a+1,c=a+2,d=a+3;
   // Profile tangent cross angle tangent points toward material outside.
   if(r0>1e-8)indices.push(a,b,c);
   if(r1>1e-8)indices.push(b,d,c);
  }
 }
 if(indices.length===0)throw Error('Не удалось сформировать поверхность вращения');
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geometry.setIndex(indices);
 geometry.computeBoundingSphere();
 return geometry;
}
