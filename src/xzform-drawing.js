/** XZFORM 2D engineering section — fit to measured canvas, never a fixed landscape viewBox. */
export function drawSection(svg,geometry,part,selected,{grid=false,dimensions=true,section=true}={}){
 if(!geometry){svg.replaceChildren();return;}
 const {profile,zMin,maxD,length}=geometry;
 // The SVG is hidden while another mobile tab is selected. A subsequent visible
 // draw is triggered by setView and ResizeObserver; fallback only for initial markup.
 const rect=svg.getBoundingClientRect();
 const W=Math.max(240,Math.round(rect.width||svg.parentElement?.clientWidth||680));
 const H=Math.max(240,Math.round(rect.height||svg.parentElement?.clientHeight||340));
 svg.setAttribute('viewBox',\`0 0 \${W} \${H}\`);
 svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 const top=52,bottom=75,availableWidth=Math.max(80,W-116);
 const scale=Math.min(availableWidth/Math.max(.001,length),
  Math.max(100,H-top-bottom)/Math.max(.001,maxD));
 const cx=(W-length*scale)/2,cy=(top+H-bottom)/2;
 const X=z=>cx+z*scale, Y=r=>cy-r*scale;
 const pos=(p,sign=1)=>[Number(X(p[1]).toFixed(2)),Number(Y(sign*p[0]).toFixed(2))];
 const path=(points,sign=1,close=false)=>points.map((p,i)=>{
  const [x,y]=pos(p,sign);return (i?'L':'M')+x+' '+y;
 }).join(' ')+(close?' Z':'');
 const lines=[],dim=[];
 const leftR=profile.outer[0]?.[0]||maxD/2;
 const rightR=profile.outer.at(-1)?.[0]||maxD/2;
 const leftHole=profile.inner.find(p=>Math.abs(p[1])<1e-6)?.[0]||0;
 const rightHole=[...profile.inner].reverse().find(p=>Math.abs(p[1]-length)<1e-6)?.[0]||0;
 const x0=X(0),x1=X(length),yTop=cy-maxD*scale/2,yBot=cy+maxD*scale/2;
 let markup='<defs><pattern id="xzform-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V9" stroke="#aac9ec" stroke-width="2"/></pattern></defs>';
 if(grid){
  for(let px=0;px<W;px+=26)markup+='<path d="M'+px+' 0V'+H+'" stroke="#e4edf7" stroke-width=".8"/>';
  for(let py=0;py<H;py+=26)markup+='<path d="M0 '+py+'H'+W+'" stroke="#e4edf7" stroke-width=".8"/>';
 }
 if(section){
  for(const sign of [1,-1])markup+='<path d="'+path(profile.polygon,sign,true)+'" fill="url(#xzform-hatch)" stroke="none"/>';
 }
 for(const sign of [1,-1]){
  lines.push('<path data-profile="outer" d="'+path(profile.outer,sign)+'" fill="none"/>');
  if(profile.inner.length)lines.push('<path data-profile="inner" d="'+path(profile.inner,sign)+'" fill="none"/>');
  for(const [x,rOuter,rInner] of [[x0,leftR,leftHole],[x1,rightR,rightHole]]){
   lines.push('<path d="M'+x.toFixed(2)+' '+Y(sign*rOuter).toFixed(2)+'V'+Y(sign*rInner).toFixed(2)+'" fill="none"/>');
  }
 }
 markup+='<g fill="none" stroke="#155a97" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">'+lines.join('')+'</g>';
 markup+='<path d="M'+Math.max(4,x0-30)+' '+cy+'H'+Math.min(W-4,x1+30)+'" stroke="#8097ac" stroke-width="1" stroke-dasharray="9 7"/>';
 if(dimensions){
  const yDimension=Math.min(H-31,yBot+26);
  const begin=(x0+2).toFixed(2),end=(x1-2).toFixed(2);
  dim.push('<path d="M'+x0+' '+(yBot+4)+'V'+(yDimension+9)+'M'+x1+' '+(yBot+4)+'V'+(yDimension+9)+'M'+begin+' '+yDimension+'H'+end+'" fill="none" stroke="#667b8f" stroke-width="1"/>');
  dim.push('<path d="M'+x0+' '+yDimension+'l7 -3v6zM'+x1+' '+yDimension+'l-7 -3v6z" fill="#667b8f"/>');
  dim.push('<text x="'+(x0+x1)/2+'" y="'+(yDimension-8)+'" text-anchor="middle" font-size="13" font-weight="700" fill="#28415b">'+length.toFixed(3)+' мм</text>');
  for(const [edge,r,side] of [[x0,leftR,'left'],[x1,rightR,'right']]){
   const xDim=edge+(side==='left'?-20:20),startY=Y(r),endY=Y(-r);
   const labelX=xDim+(side==='left'?-9:10);
   dim.push('<path d="M'+xDim+' '+startY+'V'+endY+'" stroke="#667b8f" stroke-width="1.1"/>');
   dim.push('<path d="M'+xDim+' '+startY+'l-3 7h6zM'+xDim+' '+endY+'l-3 -7h6z" fill="#667b8f"/>');
   dim.push('<text x="'+labelX+'" y="'+cy+'" transform="rotate(-90 '+labelX+' '+cy+')" text-anchor="middle" font-size="13" font-weight="700" fill="#28415b">Ø'+(r*2).toFixed(3)+'</text>');
  }
 }
 markup+='<g font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif">'+dim.join('')+'</g>';
 const point=part.points[selected];
 if(point){
  const px=X(point.z-zMin),py=Y(point.x/2);
  markup+='<circle data-selected-point cx="'+px.toFixed(2)+'" cy="'+py.toFixed(2)+'" r="5.2" fill="#ed9c23" stroke="#fff" stroke-width="2.3"/>';
 }
 markup+='<g font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif" font-size="12" fill="#526f8e"><text x="10" y="22" font-weight="700">X / Z · РАЗРЕЗ</text><text x="'+(W-10)+'" y="22" text-anchor="end">мм · X = Ø</text></g>';
 svg.innerHTML=markup;
}
