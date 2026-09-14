import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { planWave, updateWaves } from '../src/waves.js';
const fresh=()=>{const g=new Game({random:()=>0.4});g.start();return g;};
test('year-one bat rows span 420 to 480 units while retaining their central interceptor',()=>{
  for(const season of [1,3]) {
    const g=fresh();g.season=season;
    const points=planWave(g,'bats').points;
    const row=points.filter(p=>p.heading===points[0].heading);
    assert.equal(row.length,season===1?15:17);
    assert.equal(Math.max(...row.map(p=>p.laneOffset))-Math.min(...row.map(p=>p.laneOffset)),season===1?420:480);
    assert.ok(row.some(p=>p.laneOffset===0));
  }
});
test('combined summer wave fits the population budget even with longer bat rows',()=>{
  const g=fresh();g.year=3;g.season=1;g.time=300;g.waveIndex=2;
  updateWaves(g,0.05,g.encounter());
  assert.ok(g.wavePending);
  assert.ok(g.wavePending.points.length<=g.encounter().cap);
  assert.equal(new Set(g.wavePending.points.filter(p=>p.type==='bat'&&p.laneOffset===0).map(p=>p.heading)).size,4);
});
test('opening stays quiet, then gives a warning before a breakable surround',()=>{
  const g=fresh();g.time=119;
  updateWaves(g,0.05,g.encounter());assert.equal(g.wavePending,null);
  g.time=120;updateWaves(g,0.05,g.encounter());
  assert.equal(g.wavePending.kind,'surround');assert.equal(g.enemies.length,0);
  assert.ok(g.wavePending.points.filter(p=>p.weak).length>=7);
  const count=g.wavePending.points.length;
  updateWaves(g,2.6,g.encounter());
  assert.equal(g.enemies.length,count);
  assert.ok(g.enemies[0].hp<g.enemies[10].hp);
  assert.ok(g.waveRestUntil>g.time);
});
test('formations retain full off-arena rows without stacked edge positions',()=>{
  const g=fresh();g.player.x=g.player.y=35;
  for(const kind of ['surround','bats','mushrooms']) {
    const p=planWave(g,kind).points;
    assert.equal(new Set(p.map(e=>`${e.x},${e.y}`)).size,p.length);
    assert.ok(p.some(e=>e.x<0||e.y<0));
    assert.ok(p.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
  }
});
test('bats have opposing flight lanes and third-year mushroom waves combine attacks',()=>{
  const g=fresh();g.year=3;g.season=2;g.time=700;g.waveIndex=2;
  updateWaves(g,0.05,g.encounter());
  assert.ok(g.wavePending.points.some(p=>p.type==='mushroom'));
  assert.ok(new Set(g.wavePending.points.filter(p=>p.type==='bat').map(p=>p.heading)).size>=3);
  updateWaves(g,2.6,g.encounter());
  assert.ok(g.enemies.length<=g.encounter().cap);
  assert.ok(g.enemies.some(e=>e.waveSentry));
});
test('warning positions do not spawn on a player who moves into them',()=>{
  const g=fresh();g.time=400;g.season=1;updateWaves(g,0.05,g.encounter());
  Object.assign(g.player,g.wavePending.points[0]);
  updateWaves(g,2.6,g.encounter());
  assert.ok(g.enemies.every(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)>=65));
});
test('crossing bats expire without rewards; ring members and sentries stay as ordinary enemies',()=>{
  const g=fresh();const bat=g.spawn('bat');bat.waveLife=0.01;
  g.updateEnemy(bat,0.05);assert.equal(bat.escaped,true);assert.equal(g.drops.length,0);
  g.time=400;g.season=1;updateWaves(g,0.05,g.encounter());updateWaves(g,2.6,g.encounter());
  const ring=g.enemies.filter(e=>e.type!=='bat');
  assert.ok(ring.length>0);assert.ok(ring.every(e=>e.waveLife==null&&e.formationCenter));
  const e=g.spawn('mushroom');e.waveSentry=true;e.skillClock=99;
  const {x,y}=e;g.updateEnemy(e,0.05);assert.equal(e.x,x);assert.equal(e.y,y);
  e.age=40;g.updateEnemy(e,0.05);assert.equal(e.waveSentry,false);assert.ok(e.x!==x||e.y!==y);
});
test('upgraded acorns and boomerangs hit a small distant target',()=>{
  for(const id of ['acorn','boomerang']) {
    const g=fresh();g.sandbox=true;g.weapons=[];g.addWeapon(id);g.weapons[0].level=id==='acorn'?3:5;
    const e=g.spawn('snake');Object.assign(e,{x:g.player.x+180,y:g.player.y-16,hp:10000,maxHp:10000,trainingDummy:true});
    for(let i=0;i<180;i++)g.step(1/60);
    assert.ok(e.hp<10000,id);
  }
});
test('directional attacks prefer a forward target but still work when stationary',()=>{
  const g=fresh();const back=g.spawn(),front=g.spawn();
  Object.assign(back,{x:g.player.x-100,y:g.player.y});Object.assign(front,{x:g.player.x+150,y:g.player.y});
  g.grid.rebuild(g.enemies);g.player.moving=true;g.attackDirection={x:1,y:0};
  assert.equal(g.directionalTarget(400),front);g.player.moving=false;assert.equal(g.directionalTarget(400),back);
});
