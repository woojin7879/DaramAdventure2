import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { planWave, updateWaves } from '../src/waves.js';
test('ordinary spawns stay inside the arena and off screen at every edge',()=>{
  for(const [x,y,roll] of [[35,1200,0.5],[2365,1200,0],[1200,35,0.75],[1200,2365,0.25]]) {
    const g=new Game({random:()=>roll});g.start();Object.assign(g.player,{x,y});
    const e=g.spawn('snake');
    assert.ok(e.x>=35&&e.y>=35&&e.x<=2365&&e.y<=2365);
    assert.ok(Math.abs(e.x-x)>=g.view.w/2+35||Math.abs(e.y-y)>=g.view.h/2+35);
    e.x=-40;g.updateEnemy(e,0.05);assert.ok(e.x>=25);
  }
});
test('formation enemies close in from beyond the boundary while mushrooms stay inside',()=>{
  const g=new Game();g.start();g.player.x=35;
  const e=g.spawn('snake');Object.assign(e,{x:-200,y:g.player.y,waveLife:24,formationCenter:{x:35,y:g.player.y}});
  g.updateEnemy(e,0.05);
  assert.ok(e.x<0&&e.x>-200);assert.ok(!e.escaped);
  const m=g.spawn('mushroom');Object.assign(m,{x:-200,y:g.player.y,waveLife:24,waveSentry:true});
  g.updateEnemy(m,0.05);assert.ok(m.x>=25);
});
test('bats spawned outside the arena fly into it rather than disappearing',()=>{
  const g=new Game();g.start();g.player.x=35;
  const e=g.spawn('bat');Object.assign(e,{x:-100,y:g.player.y,heading:0,waveFlightSpeed:300});
  for(let i=0;i<30;i++)g.updateEnemy(e,1/60);
  assert.ok(e.x>0);assert.ok(!e.escaped);
});
test('knockback does not teleport an outside enemy onto the arena boundary',()=>{
  const g=new Game();g.start();g.player.x=35;
  const e=g.spawn();Object.assign(e,{x:-50,y:g.player.y,hp:100});
  g.damage(e,1,'#fff',20);assert.ok(e.x<-50);
});
test('knockback stays within reach of the boundary so edge kills are never lost',()=>{
  const g=new Game();g.start();g.player.x=35;
  const e=g.spawn();Object.assign(e,{x:-100,y:g.player.y,hp:10000});
  for(let i=0;i<20;i++)g.damage(e,1,'#fff',60);
  assert.ok(e.x>=-120);
  g.updateEnemy(e,0.05);assert.ok(!e.escaped);
});
test('rewards from enemies killed outside the arena land inside it',()=>{
  const g=new Game();g.start();g.player.x=35;
  const e=g.spawn();Object.assign(e,{x:-100,y:g.player.y,hp:1,elite:true});
  g.damage(e,5,'#fff',0);
  assert.ok(g.drops.length>=2);
  for(const d of g.drops) {assert.ok(d.x>=40&&d.x<=2360);assert.ok(d.y>=40&&d.y<=2360);}
});
test('mushrooms never kite or stand beyond the arena edge',()=>{
  const g=new Game();g.start();Object.assign(g.player,{x:60,y:1200});
  const m=g.spawn('mushroom');Object.assign(m,{x:40,y:1200,skillClock:99});
  for(let i=0;i<60;i++)g.updateEnemy(m,1/60);
  assert.ok(m.x>=25);
  g.time=1000;g.season=2;g.year=3;g.player.x=g.player.y=35;
  const wave=planWave(g,'mushrooms');
  assert.ok(wave.points.some(p=>p.type==='mushroom'));
  for(const p of wave.points.filter(p=>p.type==='mushroom')) assert.ok(p.x>=35&&p.y>=35);
});
test('winter boar surround remains a complete ring at corners with an inward weak route',()=>{
  const g=new Game();g.start();g.time=1000;g.season=3;
  const full=planWave(g,'boars');g.player.x=g.player.y=35;
  const corner=planWave(g,'boars');
  assert.equal(corner.points.length,full.points.length);
  assert.ok(corner.points.filter(p=>p.type==='boar').length>=20);
  assert.ok(corner.points.some(p=>p.weak&&p.x>35&&p.y>35));
  assert.ok(corner.points.some(p=>p.x<0));assert.ok(corner.points.some(p=>p.y<0));
  g.waveIndex=0;g.waveClock=0;
  updateWaves(g,0.05,g.encounter());assert.equal(g.wavePending.kind,'boars');
  updateWaves(g,1.3,g.encounter());
  const boars=g.enemies.filter(e=>e.type==='boar').length;
  assert.ok(boars>g.encounter().boarCap);assert.ok(boars<=g.encounter().boarCap+12);
  assert.ok(g.enemies.length<=g.encounter().cap);
});
