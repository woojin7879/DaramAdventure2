import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {bossPhase,bossPatterns,updateChapterBoss,ringHits,addBossRing} from '../src/chapter-combat.js';
import {restartBossTrial} from '../src/boss-trial.js';
test('each later phase introduces distinct executable patterns with bounded entities',()=>{
 for(const year of [2,3])for(const hp of [1,.49,.2]) {
  const g=new Game({random:()=>.3});g.start(false,null,year);
  const e=restartBossTrial(g,{stage:hp});g.weapons=[];
  const patterns=bossPatterns(e.bossKind,bossPhase(e)),seen=new Set();
  for(let i=0;i<patterns.length;i++) {
   e.bossClock=0;updateChapterBoss(g,e,.01);seen.add(e.pattern);
   for(let step=0;step<100;step++) {
    if(e.attack)updateChapterBoss(g,e,.05);
    g.updateHazards(.05);g.updateEnemyShots(.05);
   }
   assert.ok(g.hazards.length<=60);assert.ok(g.enemyShots.length<=72);
   assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y));
  }
  assert.deepEqual([...seen],patterns);
 }
});
test('direction follows movement and a second lunge gets its own warning',()=>{
 const g=new Game();g.start(false,null,2);const e=restartBossTrial(g,{stage:.2});g.weapons=[];
 e.bossClock=0;updateChapterBoss(g,e,.01);
 assert.equal(e.attack.type,'charge');assert.equal(e.attack.remaining,1);
 updateChapterBoss(g,e,1.21);updateChapterBoss(g,e,.86);
 assert.equal(e.attack.running,false);assert.ok(e.attack.time>=1);
 updateChapterBoss(g,e,1.1);updateChapterBoss(g,e,.05);
 assert.equal(e.heading,e.attack.angle);
});
test('ring warning deals no damage and the marked gap remains safe when active',()=>{
 const g=new Game();g.start(false,null,2);const e=restartBossTrial(g,{invincible:false});
 addBossRing(g,e);const h=g.hazards[0];
 const at=a=>({x:h.x+Math.cos(a)*h.r,y:h.y+Math.sin(a)*h.r,r:10});
 assert.equal(ringHits(h,at(h.gap)),false);
 assert.equal(ringHits(h,at(h.gap+Math.PI)),true);
 Object.assign(g.player,at(h.gap+Math.PI));g.updateHazards(.05);assert.equal(g.player.hp,100);
 h.delay=0;g.updateHazards(.01);assert.ok(g.player.hp<100);
});
