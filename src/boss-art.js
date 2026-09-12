export function drawBossLife(c,e,time) {
  c.save();
  const serpent=e.bossKind==='serpent', charge=e.attack&&!e.attack.running;
  c.strokeStyle=serpent?'#266b70':'#674934';
  c.lineCap='round';
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3+(serpent?time*.12:0);
    const reach=serpent?46:65+Math.sin(time*2+i)*9;
    c.lineWidth=serpent?8:10;
    c.beginPath();c.moveTo(e.x,e.y-8);
    c.quadraticCurveTo(e.x+Math.cos(a+.5)*reach*.8,e.y+Math.sin(a+.5)*reach*.5,e.x+Math.cos(a)*reach,e.y+Math.sin(a)*reach*.45);
    c.stroke();
  }
  if(!serpent) {
    const pulse=1+Math.sin(time*(e.combatPhase===3?6:3))*.15;
    c.globalAlpha=.24;c.fillStyle='#ffc268';c.beginPath();c.ellipse(e.x,e.y-65,28*pulse,36*pulse,0,0,Math.PI*2);c.fill();
  }
  if(charge) {
    c.globalAlpha=.6;c.strokeStyle=serpent?'#8affd5':'#ffe4a0';c.lineWidth=2;
    c.beginPath();c.ellipse(e.x,e.y-40,48,65,0,0,Math.PI*2);c.stroke();
  }
  c.restore();
}
export function drawBossHazard(c,h,time,year) {
  if(h.type==='bossring') {
    const warning=h.delay>0,r=warning?h.startRadius:h.r;
    const start=h.gap+h.gapWidth/2,end=h.gap+Math.PI*2-h.gapWidth/2;
    c.save(); c.strokeStyle=warning?'#ffdc8c':h.theme==='serpent'?'#6ae7d1':'#f1bf80';
    c.globalAlpha=warning?.55:.85;c.lineWidth=warning?2:14;
    if(warning)c.setLineDash([8,7]);
    c.beginPath();c.arc(h.x,h.y,r,start,end);c.stroke();c.setLineDash([]);
    // Scales on the serpent's wake; root spikes on the heart's pulse.
    for(let a=start;a<end;a+=.14) {
      c.lineWidth=2;c.beginPath();c.moveTo(h.x+Math.cos(a)*r,h.y+Math.sin(a)*r);
      c.lineTo(h.x+Math.cos(a+.025)*(r+9),h.y+Math.sin(a+.025)*(r+9));c.stroke();
    }
    c.restore();return true;
  }
  if(h.delay>0)return false;
  if(h.type==='rootline' && h.theme==='water') {
    c.save();c.strokeStyle='#246f80';c.lineWidth=h.width*2;c.lineCap='round';
    c.beginPath();c.moveTo(h.x,h.y);c.lineTo(h.x2,h.y2);c.stroke();
    const dx=h.x2-h.x,dy=h.y2-h.y,len=Math.hypot(dx,dy)||1;
    c.lineWidth=2;c.strokeStyle='#a9f9e8';c.beginPath();
    for(let i=0;i<=24;i++) { const t=i/24,w=Math.sin(t*36-time*9)*6; const x=h.x+dx*t-dy/len*w,y=h.y+dy*t+dx/len*w; if(i)c.lineTo(x,y);else c.moveTo(x,y); }
    c.stroke();c.restore();return true;
  }
  if(h.type==='rootline' && h.theme!=='water') {
    c.save();c.strokeStyle='#664135';c.lineWidth=h.width*1.5;c.lineCap='round';
    c.beginPath();c.moveTo(h.x,h.y);c.lineTo(h.x2,h.y2);c.stroke();
    const dx=h.x2-h.x,dy=h.y2-h.y,len=Math.hypot(dx,dy)||1;
    for(let t=.08;t<1;t+=.08) {
      const x=h.x+dx*t,y=h.y+dy*t,side=Math.sin(t*60)>0?1:-1;
      c.strokeStyle='#d5b8dd';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x-dy/len*13*side-dx/len*9,y+dx/len*13*side-dy/len*9);c.stroke();
    }c.restore();return true;
  }
  if(h.type==='pool') {
    c.save();c.translate(h.x,h.y);
    const water=year===2;
    c.fillStyle=water?'#245e7188':'#617fa166';c.strokeStyle=water?'#77ddcf':'#c9e7ff';
    c.lineWidth=2;c.beginPath();c.arc(0,0,h.r,0,Math.PI*2);c.fill();c.stroke();
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4+(water?time*.4:0);
      c.beginPath();
      if(water)c.ellipse(Math.cos(a)*h.r*.55,Math.sin(a)*h.r*.55,7,3,a,0,Math.PI*2);
      else { c.moveTo(0,0);c.lineTo(Math.cos(a)*h.r*.85,Math.sin(a)*h.r*.85);c.lineTo(Math.cos(a+.12)*h.r*.58,Math.sin(a+.12)*h.r*.58); }
      c.stroke();
    }c.restore();return true;
  }
  return false;
}
