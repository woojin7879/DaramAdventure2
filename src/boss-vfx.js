// Raster animation frames carry the effect artwork; Canvas only places/clips tiles.
export function vfxFrame(age, loop = true) {
  return loop ? Math.floor(Math.max(0,age)*9)%4 : Math.min(3,Math.floor(Math.max(0,age)*9));
}
export function vfxRect(image,row,frame) {
  const w=image.width/4,h=image.height/4;
  const inset=image.vfxInset || 0;
  return [frame*w+inset,row*h+inset,w-inset*2,h-inset*2];
}
function stamp(c,image,row,frame,x,y,w,h,angle=0,alpha=1) {
  c.save();c.translate(x,y);c.rotate(angle);
  c.globalCompositeOperation='screen';c.globalAlpha=alpha;c.imageSmoothingEnabled=false;
  c.drawImage(image,...vfxRect(image,row,frame),-w/2,-h/2,w,h);c.restore();
}
function texturedRing(c,image,row,frame,h,r,gapped) {
  const gap=gapped?h.gap:0,width=gapped?h.gapWidth:0;
  const start=gap+width/2,end=gap+Math.PI*2-width/2;
  // Clip both the safe opening and exact damaging band; texture cannot cover the exit.
  const inner=Math.max(0,r-14),outer=r+14;
  c.save();c.beginPath();c.arc(h.x,h.y,outer,start,end);c.arc(h.x,h.y,inner,end,start,true);c.closePath();c.clip();
  const count=Math.ceil((end-start)*r/32);
  for(let i=0;i<count;i++) {
    const a=start+(i+.5)*(end-start)/count;
    stamp(c,image,row,frame,h.x+Math.cos(a)*r,h.y+Math.sin(a)*r,64,80,a+Math.PI/2);
  }
  c.restore();
}
export function drawPatternSprite(c,images,h,year) {
  if(h.delay>0)return false;
  const serpent=h.theme==='serpent'||h.theme==='water'||year===2;
  const image=images[year===1?'bear-vfx':serpent?'serpent-vfx':'heart-vfx'];
  if(!image)return false;
  const frame=vfxFrame(h.age,h.type!=='rootline');
  if(h.type==='pool') {
    c.save();c.beginPath();c.arc(h.x,h.y,h.r,0,Math.PI*2);c.clip();
    stamp(c,image,1,frame,h.x,h.y,h.r*2.5,h.r*2.5);c.restore();
    return true;
  }
  if(h.type==='rootline') {
    const dx=h.x2-h.x,dy=h.y2-h.y,length=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    c.save();c.translate(h.x,h.y);c.rotate(a);
    c.beginPath();c.rect(0,-h.width,length,h.width*2);c.clip();
    const tiles=Math.max(1,Math.ceil(length/48));
    for(let i=0;i<tiles;i++) stamp(c,image,serpent?2:0,frame,(i+.5)*length/tiles,0,72,h.width*5);
    c.restore();return true;
  }
  if(h.type==='bossring') { texturedRing(c,image,serpent?3:2,frame,h,h.r,true);return true; }
  if(h.type==='shock' && (year===3||year===1)) { texturedRing(c,image,2,frame,h,h.age*210,false);return true; }
  return false;
}
export function drawVenomSprite(c,images,shot,time) {
  if(shot.theme!=='venom'||!images['serpent-vfx'])return false;
  const a=Math.atan2(shot.vy,shot.vx);
  // Generated liquid head sits right of cell center; keep its center on the hitbox.
  stamp(c,images['serpent-vfx'],0,vfxFrame(time),shot.x-Math.cos(a)*6,shot.y-Math.sin(a)*6,40,40,a);
  return true;
}
export function drawBossCastSprite(c,images,e,time) {
  const image=images[e.bossKind==='bear'?'bear-vfx':e.bossKind==='serpent'?'serpent-vfx':'heart-vfx'];
  if(!image)return;
  if(e.bossKind==='bear') {
    if(e.attack?.running) {
      const a=e.attack.angle;
      stamp(c,image,3,vfxFrame(time),e.x-Math.cos(a)*50,e.y-Math.sin(a)*50,150,100,a,.8);
    }
    const slam=time-(e.slamAt??-100);
    if(slam>=0&&slam<.5)stamp(c,image,1,vfxFrame(slam,false),e.x,e.y,125,125);
    if(!e.attack) {
      const flip=Math.cos(e.heading||0)>0?1:-1;
      stamp(c,image,0,vfxFrame(time),e.x+flip*38,e.y-55,42,32,flip>0?0:Math.PI,.45);
    }
    return;
  }
  if(e.bossKind==='serpent'&&e.attack?.running) {
    const a=e.attack.angle;
    stamp(c,image,2,vfxFrame(time),e.x-Math.cos(a)*45,e.y-Math.sin(a)*45,135,95,a,.8);
  }
  const age=time-(e.castStarted??-100)-(e.castDelay??1.3);
  if(e.bossKind==='heart'&&age>=0&&age<.5)stamp(c,image,3,vfxFrame(age,false),e.x,e.y-60,145,145,0,1-age);
}
