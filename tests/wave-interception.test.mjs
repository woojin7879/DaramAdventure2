import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { planWave, updateWaves } from '../src/waves.js';

test('maximum-speed player is inside the announced surround when it appears',()=>{
  for(const origin of [{x:1200,y:1200},{x:35,y:35},{x:2365,y:1200}]) {
    for(let i=0;i<16;i++) {
      const g=new Game();g.start();Object.assign(g.player,origin,{moving:true});
      g.passives.speed=5;g.time=120;
      const a=i*Math.PI/8;g.attackDirection={x:Math.cos(a),y:Math.sin(a)};
      const wave=planWave(g,'surround');
      const x=Math.max(35,Math.min(2365,origin.x+Math.cos(a)*189*wave.delay));
      const y=Math.max(35,Math.min(2365,origin.y+Math.sin(a)*189*wave.delay));
      assert.ok(Math.hypot(x-wave.center.x,y-wave.center.y)+g.player.r<wave.radius);
      assert.ok(wave.points.length<=g.encounter().cap);
      assert.ok(wave.points.some(p=>p.weak));
    }
  }
});

function fly(angle,reverse=false) {
  const g=new Game({random:()=>0.4});g.start();g.sandbox=true;g.weapons=[];
  g.player.invuln=100;g.player.moving=true;g.passives.speed=5;g.time=400;g.season=1;
  const input={x:Math.cos(angle),y:Math.sin(angle)};g.attackDirection=input;
  const wave=planWave(g,'bats');g.wavePending=wave;g.waveCenter=wave.center;
  let contact=false;
  for(let i=0;i<180;i++) {
    if(g.wavePending)updateWaves(g,1/60,g.encounter());
    g.step(1/60,reverse?{x:-input.x,y:-input.y}:input);
    contact ||= g.enemies.some(e=>Math.hypot(e.x-g.player.x,e.y-g.player.y)<e.r+g.player.r);
  }
  return contact;
}
test('year-one bats intercept straight travel and turning back in every direction',()=>{
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    assert.equal(fly(a),true,`straight ${i}`);
    assert.equal(fly(a,true),true,`reverse ${i}`);
  }
});
