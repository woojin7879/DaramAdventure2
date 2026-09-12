import test from 'node:test';
import assert from 'node:assert/strict';
import {bossSpriteFrame,bossFrameRect} from '../src/boss-animation.js';
test('boss sprites follow committed attack states instead of unrelated looping frames',()=>{
 const e={moving:true,combatPhase:3,castStarted:9,castDelay:.55,attack:{type:'charge',running:false}};
 assert.equal(bossSpriteFrame(e,10),4);
 e.attack.running=true;assert.equal(bossSpriteFrame(e,10),5);
 e.attack={type:'spit'};assert.equal(bossSpriteFrame(e,10),6);
 e.attack=null;e.moving=false;
 assert.equal(bossSpriteFrame(e,9.2),4);
 assert.equal(bossSpriteFrame(e,9.8),5);
 assert.equal(bossSpriteFrame(e,10.3),6);
 assert.equal(bossSpriteFrame(e,11),7);
 e.moving=true;assert.equal(bossSpriteFrame(e,11),3);
 assert.equal(bossSpriteFrame(e,11.2),2);
});
test('eight frame crops stay within non-square animation atlas bounds',()=>{
 const image={width:1536,height:1024};
 for(let f=0;f<8;f++) {
  const [x,y,w,h]=bossFrameRect(image,f);
  assert.equal(w,384);assert.equal(h,512);
  assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);
 }
});
