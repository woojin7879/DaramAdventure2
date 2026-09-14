import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { pickEnemy } from '../src/encounters.js';
import { planWave } from '../src/waves.js';
test('tank population has separate year and hell budgets; dead tanks free capacity',()=>{
  for(const year of [1,2,3]) {
    const g=new Game();g.start(false,null,year);g.season=3;g.time=1200;
    const budget=g.encounter();assert.equal(budget.boarCap,16+(year-1)*2);
    const enemies=Array.from({length:budget.boarCap},()=>({type:'boar',hp:10}));
    assert.notEqual(pickEnemy(budget,enemies,()=>0.999),'boar');
    enemies[0].hp=0;assert.equal(pickEnemy(budget,enemies,()=>0.999),'boar');
  }
  const g=new Game();g.start(false,null,1,'hell');g.time=1800;g.season=3;
  assert.equal(g.encounter().boarCap,16);
});
test('wave warning anticipates movement without following subsequent movement',()=>{
  const g=new Game();g.start();g.player.moving=true;g.attackDirection={x:1,y:0};
  const wave=planWave(g,'bats');assert.ok(wave.center.x>g.player.x+200);
  const x=wave.points[0].x;g.player.x+=100;assert.equal(wave.points[0].x,x);
});
