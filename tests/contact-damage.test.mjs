import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
const fresh=()=>{const g=new Game();g.start();return g;};
const advance=(g,time)=>{g.player.invuln=Math.max(0,g.player.invuln-(time-g.time));g.time=time;};
test('different enemies can hit after brief protection; the same enemy waits 0.6 seconds',()=>{
  const g=fresh(),a={},b={};g.hurt(10,a);assert.equal(g.player.invuln,0.15);
  g.hurt(10,b);assert.equal(g.player.hp,90);
  advance(g,0.16);g.hurt(10,a);assert.equal(g.player.hp,90);
  g.hurt(10,b);assert.equal(g.player.hp,80);
  advance(g,0.61);g.hurt(10,a);assert.equal(g.player.hp,70);
});
test('contact damage is capped at fixed 50 within a rolling half second',()=>{
  for(const hp of [100,200]) {
    const g=fresh();g.player.hp=g.player.maxHp=hp;
    g.hurt(30,{});advance(g,0.16);g.hurt(30,{});
    advance(g,0.32);g.hurt(30,{});assert.equal(g.player.hp,hp-50);
    advance(g,0.49);g.hurt(30,{});assert.equal(g.player.hp,hp-50);
    advance(g,0.51);g.hurt(30,{});assert.equal(g.player.hp,hp-80);
  }
});
test('two late-winter boars deal the full capped total of 50',()=>{
  const g=fresh();g.time=1200;g.season=3;
  const a=g.spawn('boar'),b=g.spawn('boar');
  g.hurt(a.damage,a);advance(g,1200.16);g.hurt(b.damage,b);
  assert.equal(g.player.hp,50);
  assert.equal(g.runStats.taken,50);
});
test('shield retains its invulnerability and does not spend the contact damage allowance',()=>{
  const g=fresh();g.addWeapon('charm');g.hurt(30,{});
  assert.equal(g.player.hp,100);assert.equal(g.player.invuln,0.5);
  assert.equal(g.contactDamageHistory.length,0);
  advance(g,0.51);g.hurt(30,{});assert.equal(g.player.hp,70);
});
test('boss and projectile damage are outside the ordinary contact cap; new runs reset it',()=>{
  const g=fresh();g.hurt(50,{});advance(g,0.16);g.hurt(20);
  assert.equal(g.player.hp,30);assert.equal(g.player.invuln,0.85);
  g.start();assert.deepEqual(g.contactDamageHistory,[]);
});
