import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { hellUnlocked, hellBudget, hellDifficulty, hellEliteInterval } from '../src/hell.js';
import { encounterBudget } from '../src/encounters.js';
import { resultDetails } from '../src/results.js';

function setup() {
  const events = [];
  const g = new Game({random:()=>.4,onEvent:(type)=>events.push(type)});
  g.start(false,null,1,'hell');
  g.sandboxInvincible = true;
  return {g, events};
}
test('hell requires all three story clears; no checkpoint and no quick shortcut',()=>{
  for(const cleared of [[],[1],[1,2],[3],[1,3]]) assert.equal(hellUnlocked(cleared),false);
  assert.equal(hellUnlocked([1,2,3]),true);
  const {g}=setup();
  assert.equal(g.snapshot(),null);
  const story = new Game(); story.start();
  assert.throws(()=>g.start(false,story.snapshot(),1,'hell'));
  g.start(true,null,3,'hell');
  assert.equal(g.quick,false);
  assert.equal(g.year,1);
  assert.throws(()=>g.restore(story.snapshot()));
});
test('bosses arrive at 10, 20, 30 minutes without erasing build or living bosses',()=>{
  const {g,events}=setup();
  g.addWeapon('ice'); g.passives.might=2;
  for (const [time, kind] of [[600,'bear'],[1200,'serpent'],[1800,'heart']]) {
    g.time=time-.1; g.updateHell();
    assert.ok(!g.enemies.some(e=>e.bossKind===kind));
    g.time=time-.01; g.step(.02);
    assert.ok(g.enemies.some(e=>e.bossKind===kind));
  }
  assert.equal(g.enemies.filter(e=>e.type==='boss').length,3);
  assert.equal(g.weapons.length,2);
  assert.equal(g.passives.might,2);
  assert.equal(g.state,'playing');
  assert.ok(!events.includes('won')&&!events.includes('checkpoint'));
  g.time=2100;g.updateHell();
  assert.equal(g.enemies.filter(e=>e.type==='boss').length,3);
});
test('boss kills continue the run, record their identities, and allow overtime arrivals',()=>{
  const {g,events}=setup();
  for(const time of [600,1200,1800]) {
    g.time=time;g.updateHell();
    g.damage(g.boss,1e9,'#fff',0,'acorn');g.updateHell();
  }
  assert.deepEqual(g.hellBossKills.map(b=>b.year),[1,2,3]);
  assert.equal(g.boss,null);
  g.time=2100;g.updateHell();
  assert.equal(g.boss.bossKind,'bear');
  assert.equal(g.state,'playing');
  assert.ok(!events.includes('won'));
  const report=g.report();
  assert.equal(report.mode,'hell');
  assert.match(resultDetails(report),/보스 3회 격파/);
  g.sandboxInvincible=false;g.player.hp=1;g.hurt(1000);
  assert.equal(g.state,'dead');
  const stopped=g.time;g.step(.05);assert.equal(g.time,stopped);
});
test('hell increases pressure, preserves opening mushroom grace, and scales overtime',()=>{
  for(const time of [0,120,600,1200,1800]) {
    const season=Math.min(3,Math.floor(time/450));
    const hell=hellBudget(time,season), story=encounterBudget(time,300,season);
    assert.ok(hell.cap>story.cap);
    assert.ok(hell.interval<story.interval);
    assert.ok(hellDifficulty(time).damage>1);
  }
  assert.equal(hellBudget(30,0).mushroomCap,0);
  assert.ok(hellDifficulty(2400).health>hellDifficulty(1800).health);
  // Overtime compounds: health roughly doubles every 10 minutes, so no build outscales it.
  const h30=hellDifficulty(1800).health, h40=hellDifficulty(2400).health, h50=hellDifficulty(3000).health;
  assert.ok(h40/h30>1.8 && h40/h30<2.2);
  assert.ok(Math.abs(h50/h40-h40/h30)<.05);
  assert.ok(hellDifficulty(3600).damage>hellDifficulty(1800).damage*2);
  assert.ok(hellDifficulty(7200).speed<1.421);
  assert.equal(hellBudget(1800,3).cap,240);
  assert.equal(hellBudget(2400,3).cap,280);
  assert.equal(hellBudget(7200,3).cap,320);
  assert.equal(hellEliteInterval(1800),55);
  assert.equal(hellEliteInterval(3000),25);
  assert.equal(hellEliteInterval(7200),25);
});
test('simultaneous bosses retain their own pattern artwork',()=>{
  const {g}=setup();g.time=1200;
  const snake=g.spawn('boss',false,2);snake.bossClock=0;snake.patternIndex=2;
  snake.combatPhase=1;g.updateBoss(snake,.02);
  assert.ok(g.hazards.length>0);
  assert.ok(g.hazards.every(h=>h.bossYear===2));
  const bear=g.spawn('boss',false,1);
  bear.attack={type:'shock',time:0,angle:0};g.updateBoss(bear,.02);
  assert.equal(g.hazards.at(-1).bossYear,1);
});
