export function drawSkyShield(c,x,y,{strength=1,scale=1,time=0}={}) {
  c.save();c.translate(x,y);c.scale(scale,scale*1.08);
  const pulse=1+Math.sin(time*2)*.025;
  const r=32*pulse;
  const glow=c.createRadialGradient(-7,-10,3,0,0,r);
  glow.addColorStop(0,'rgba(214,247,255,.025)');
  glow.addColorStop(.58,'rgba(132,212,255,.07)');
  glow.addColorStop(.84,'rgba(116,204,255,.24)');
  glow.addColorStop(.94,'rgba(179,235,255,.34)');
  glow.addColorStop(1,'rgba(118,202,255,0)');
  c.globalAlpha*=Math.max(0,Math.min(1,strength));c.fillStyle=glow;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
  const sheen=c.createLinearGradient(-22,-24,12,8);
  sheen.addColorStop(0,'rgba(239,253,255,.55)');sheen.addColorStop(1,'rgba(176,225,255,0)');
  c.strokeStyle=sheen;c.lineWidth=2;c.lineCap='round';c.beginPath();c.arc(0,0,r*.87,3.65,4.9);c.stroke();c.restore();
}
export function drawBoomerang(c,b) {
  c.save();c.translate(b.x,b.y);c.rotate(b.age*15);const scale=b.r/12;c.scale(scale,scale);
  c.strokeStyle='rgba(247,221,151,.25)';c.lineWidth=3;c.beginPath();c.arc(0,0,20,-.7,1.8);c.stroke();
  const wood=c.createLinearGradient(-16,-12,10,13);wood.addColorStop(0,'#f5d394');wood.addColorStop(.5,'#b87539');wood.addColorStop(1,'#724323');
  c.fillStyle=wood;c.strokeStyle='#483021';c.lineWidth=1.5;c.lineJoin='round';
  c.beginPath();c.moveTo(-19,-13);c.quadraticCurveTo(-12,4,-3,12);c.quadraticCurveTo(0,15,4,10);c.lineTo(19,-13);c.quadraticCurveTo(12,-12,0,2);c.quadraticCurveTo(-10,-12,-19,-13);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#ffe4ad';c.lineWidth=1.2;c.beginPath();c.moveTo(-14,-7);c.lineTo(-1,8);c.lineTo(13,-7);c.stroke();
  c.strokeStyle='#91c4b3';c.lineWidth=3;c.beginPath();c.moveTo(-2,3);c.lineTo(3,7);c.stroke();c.restore();
}
