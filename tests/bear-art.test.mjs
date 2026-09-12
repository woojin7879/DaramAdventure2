import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {bossSpriteFrame} from '../src/boss-animation.js';
test('winter bear retains the original charge and shock timings while exposing animation state',()=>{
 for(const random of [()=>.2,()=>.8]) {
  const g=new Game({random});g.start(false);const e=g.spawn('boss');
  e.bossClock=0;g.updateBoss(e,.01);
  assert.equal(bossSpriteFrame(e,g.time),4);
  assert.equal(e.attack.time,1.1);
  const type=e.attack.type;
  g.time=2;g.updateBoss(e,1.11);
  if(type==='charge') {
   assert.equal(e.attack.time,.65);assert.equal(bossSpriteFrame(e,g.time),5);
   assert.equal(e.heading,e.attack.angle);
  } else {
   assert.equal(e.slamAt,2);assert.equal(bossSpriteFrame(e,g.time),6);
   assert.equal(g.hazards.at(-1).range,400);assert.equal(e.bossClock,3.5);
  }
 }
});
