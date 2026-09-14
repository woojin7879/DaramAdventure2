import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { bossWavePressure, updateWaves } from '../src/waves.js';
const fresh=()=>{const g=new Game();g.start();g.time=1200;g.season=3;g.spawn('boss');return g;};
test('boss pressure uses spawn time with bounded 2/3/4-minute stages, without health changes',()=>{
  const g=fresh(),hp=g.boss.hp;
  for(const [elapsed,stage] of [[119.9,0],[120,1],[180,2],[240,3],[10000,3]]) {
    g.time=1200+elapsed;
    assert.equal(bossWavePressure(g).stage,stage);
    assert.ok(bossWavePressure(g).interval>=18);
    assert.equal(g.boss.hp,hp);
  }
  g.time=1200;assert.equal(bossWavePressure(g).interval,68);
  g.time=1440;assert.equal(bossWavePressure(g).interval,24.48);
});
test('stage escalation warns once and shortens the next wait; boss death clears pressure',()=>{
  const g=fresh(),events=[];g.onEvent=(type)=>events.push(type);
  g.waveClock=60;g.time=1320;
  updateWaves(g,0.05,g.encounter());assert.ok(g.waveClock<=8);
  updateWaves(g,0.05,g.encounter());assert.equal(events.filter(x=>x==='bossPressure').length,1);
  g.boss.hp=0;updateWaves(g,0.05,g.encounter());
  assert.equal(g.bossPressureStage,0);assert.ok(g.waveClock>50);
});
test('hell uses the oldest living boss rather than resetting when another arrives',()=>{
  const g=new Game();g.start(false,null,1,'hell');g.time=600;
  const a=g.spawn('boss');g.time=800;g.spawn('boss',false,2);
  assert.equal(bossWavePressure(g).stage,2);
  a.hp=0;assert.equal(bossWavePressure(g).stage,0);
});
test('first-year prolonged boss fight can schedule a combined mushroom and bat wave',()=>{
  const g=fresh();g.time=1380;g.waveClock=0;g.waveIndex=2;
  updateWaves(g,0.05,g.encounter());
  assert.equal(g.wavePending.kind,'mushrooms');
  assert.ok(g.wavePending.points.some(p=>p.type==='bat'));
  assert.ok(g.wavePending.points.length<=g.encounter().cap);
});
