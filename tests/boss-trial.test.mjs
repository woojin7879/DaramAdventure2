import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { restartBossTrial } from '../src/boss-trial.js';
import { yearDifficulty } from '../src/difficulty.js';
test('boss trials use real annual tuning, selectable health phases, and clean restarts', () => {
  const g = new Game({random:()=>.3});
  for(const year of [1,2,3]) {
    g.start(false,null,year);
    const b=restartBossTrial(g,{stage:.49,invincible:false});
    assert.equal(g.season,3); assert.equal(g.time,1200);
    assert.equal(g.enemies.length,1); assert.ok(Math.abs(b.hp/b.maxHp-.49)<1e-9);
    g.hurt(10000); assert.equal(g.state,'dead');
    g.hazards.push({type:'pool'});g.enemyShots.push({});
    restartBossTrial(g,{stage:1,invincible:true});
    assert.equal(g.state,'playing'); assert.equal(g.player.hp,100);
    assert.equal(g.hazards.length,0);assert.equal(g.enemyShots.length,0);
    g.hurt(10000); assert.equal(g.player.hp,100);
    for(let i=0;i<600;i++)g.step(1/60);
    assert.equal(g.state,'playing');assert.equal(g.level,1);
    assert.equal(g.enemies.length,1);
  }
});
test('year difficulty increases progressively while preserving opening room', () => {
  for(const progress of [.25,.5,.75,1]) {
    const [a,b,c]=[1,2,3].map(y=>yearDifficulty(y,progress));
    assert.ok(a.health<=b.health && b.health<=c.health);
    assert.ok(a.damage<=b.damage && b.damage<=c.damage);
    assert.ok(a.cap<=b.cap && b.cap<=c.cap);
    assert.ok(a.interval>=b.interval && b.interval>=c.interval);
    assert.ok(a.bossHealth<b.bossHealth && b.bossHealth<c.bossHealth);
  }
});
