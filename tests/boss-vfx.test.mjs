import test from 'node:test';
import assert from 'node:assert/strict';
import {drawPatternSprite,drawVenomSprite,vfxFrame,vfxRect} from '../src/boss-vfx.js';
function canvas(){const calls=[];return {calls,c:new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true})};}
const im={width:1536,height:1536},images={'serpent-vfx':im,'heart-vfx':im};
test('hazard sprites respect warning time and use all four animation frames',()=>{
 const {c,calls}=canvas(),h={type:'pool',x:0,y:0,r:60,delay:1,age:0};
 assert.equal(drawPatternSprite(c,images,h,2),false);assert.equal(calls.length,0);
 h.delay=0;
 const frames=new Set();
 for(let i=0;i<4;i++){h.age=i/9;assert.equal(drawPatternSprite(c,images,h,2),true);frames.add(vfxFrame(h.age));}
 assert.equal(frames.size,4);assert.equal(calls.filter(x=>x[0]==='drawImage').length,4);
 assert.deepEqual(vfxRect(im,3,3),[1152,1152,384,384]);
});
test('ring textures clip the safe sector before drawing, and line art clips to collision width',()=>{
 const {c,calls}=canvas();
 drawPatternSprite(c,images,{type:'bossring',x:10,y:20,delay:0,age:.2,r:200,gap:0,gapWidth:1.05,theme:'serpent'},2);
 const arc=calls.find(x=>x[0]==='arc');assert.equal(arc[4],1.05/2);
 assert.ok(calls.findIndex(x=>x[0]==='clip')<calls.findIndex(x=>x[0]==='drawImage'));
 const other=canvas();drawPatternSprite(other.c,images,{type:'rootline',x:0,y:0,x2:300,y2:0,width:16,delay:0,age:.4},3);
 assert.deepEqual(other.calls.find(x=>x[0]==='rect'),['rect',0,-16,300,32]);
});
test('venom art follows projectile direction without changing its collision data',()=>{
 const {c,calls}=canvas(),shot={theme:'venom',x:1,y:2,vx:0,vy:-100,r:8};
 const before={...shot};assert.equal(drawVenomSprite(c,images,shot,.3),true);
 assert.ok(calls.some(x=>x[0]==='rotate'&&x[1]===-Math.PI/2));assert.deepEqual(shot,before);
});
