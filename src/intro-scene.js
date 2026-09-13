import { sceneryPlacement } from './season-art.js';
export const INTRO_DURATION = 9.6;
const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const t=clamp(n); return t*t*(3-2*t); };
export function introFrame(t) {
  const season=Math.min(3,Math.floor(t/1.8));
  const moving=t<6.5;
  const stamp=clamp((t-8.15)/.2), hit=clamp((t-8.35)/.28);
  const impact=t>=8.35?1-hit:0;
  return { season, blend:smooth((t-season*1.8)/.45),
    travel: t<6.5?t:6.5+.7*(clamp((t-6.5)/.7)-clamp((t-6.5)/.7)**2/2),
    sprite:moving?Math.floor(t*11)%4:t<7.1?4:t<7.5?5:6,
    frost:smooth((t-6.65)/1.5), title:smooth((t-7.25)/.6),
    number: t<8.15?0:clamp((t-8.15)/.05),
    numberScale: t<8.35?1+2*(1-stamp)**3:1-.06*Math.sin(hit*Math.PI),
    impact, ringScale:1+hit*.8,
    fade:1-smooth((t-8.95)/.65), moving };
}
export function drawIntro(canvas,images,t,reduced=false) {
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const f=introFrame(reduced?8.7:t),top=h*.08,stage=h*.8,floor=top+stage*.85;
  c.clearRect(0,0,w,h);c.fillStyle='#0b1515';c.fillRect(0,0,w,h);
  c.imageSmoothingEnabled=false;
  function background(season,alpha) {
    c.globalAlpha=alpha;
    const im=images.scene,sh=im.height/4,sw=im.width,scale=stage/sh;
    const width=sw*scale, offset=(width*.3+f.travel*38*(h/540))%width;
    for(let x=-offset;x<w;x+=width)c.drawImage(im,0,season*sh,sw,sh,x,top,width,stage);
  }
  background(Math.max(0,f.season-1),1);background(f.season,f.season===0?1:f.blend);
  c.globalAlpha=1;
  // The entire shot uses the same foot anchor while both scenery planes scroll.
  const size=Math.min(h*.42,w*.48),x=w*.4,y=floor;
  c.fillStyle='#10212866';c.beginPath();c.ellipse(x,y+3,size*.25,size*.045,0,0,Math.PI*2);c.fill();
  const frame=images.runFrames[Math.min(5,f.sprite)];
  const scale=size*.54/images.runFrames[0].height;
  const bounce=f.moving&&!reduced?Math.sin(t*22)*size*.012:0;
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high";
  c.drawImage(frame.image,frame.sx,0,frame.sw,frame.sh,x-frame.center*scale,y-frame.foot*scale+bounce,frame.sw*scale,frame.sh*scale);
  c.imageSmoothingEnabled=false;
  // Foreground trees only accompany the run; omit them entirely during the logo reveal.
  if(images.scenery && f.title === 0) for(let i=0;i<3;i++) {
    const spacing=w*.85,offset=(f.travel*125*(h/540))%spacing;
    const tx=i*spacing-offset-w*.35, treeSize=stage*1.08;
    // Keep a clear window around Darami, especially on narrow screens.
    const visibility=clamp((Math.abs(tx-x)-size*.5)/(size*.4));
    const a=sceneryPlacement(13,Math.max(0,f.season-1),treeSize);
    c.globalAlpha=.82*visibility;c.drawImage(images.scenery,...a.source,tx+a.left,floor+stage*.2+a.top,a.width,a.height);
    const b=sceneryPlacement(13,f.season,treeSize);
    c.globalAlpha=.82*visibility*(f.season===0?1:f.blend);c.drawImage(images.scenery,...b.source,tx+b.left,floor+stage*.2+b.top,b.width,b.height);
  }
  c.globalAlpha=1;
  if(!reduced) weather(c,w,h,top,stage,t,f.season);
  if(f.frost>0&&images.frost) {
    c.save();c.beginPath();c.rect(w*(1-f.frost),top,w*f.frost,stage);c.clip();
    c.drawImage(images.frost,0,top,w,stage);c.restore();
  }
  const shade=c.createLinearGradient(0,top,0,top+stage);
  shade.addColorStop(0,'#07151b77');shade.addColorStop(.4,'#07151b00');shade.addColorStop(1,'#07151b55');
  c.fillStyle=shade;c.fillRect(0,top,w,stage);
  c.fillStyle=`rgba(5,12,18,${f.title*.16})`;c.fillRect(0,top,w,stage);
  return f;
}
function weather(c,w,h,top,stage,t,season) {
  c.save();c.beginPath();c.rect(0,top,w,stage);c.clip();
  const colors=['#f6c8d8','#a5cbdc','#dca052','#e7f1ef'];c.fillStyle=colors[season];c.strokeStyle=colors[season];
  const count=season===1?65:season===3?70:24;
  for(let i=0;i<count;i++) {
    const seed=(i*137.51)%997/997, speed=season===1?460:season===3?95:60;
    const x=((seed*w*2-t*(season===1?130:60)+Math.sin(t+i)*12)%w+w)%w;
    const y=top+((i*43+t*speed*(h/540))%stage);
    c.globalAlpha=.3+(i%4)*.15;
    if(season===1) {c.lineWidth=Math.max(1,w/1400);c.beginPath();c.moveTo(x,y);c.lineTo(x-6,y+18);c.stroke();}
    else {c.save();c.translate(x,y);c.rotate(t+i);const s=Math.max(2,h/220);c.fillRect(-s/2,-s/2,season===3?s:s*2,s);c.restore();}
  }
  c.restore();
}
