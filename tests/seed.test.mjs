import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { bodyCenter } from '../src/geometry.js';
import { ITEM_ICONS, itemIcon } from '../src/item-icons.js';
import { WEAPONS, PASSIVES } from '../src/data.js';
import { updateSoundControl } from '../src/sound-control.js';

function launch(level = 1) {
  const g = new Game({random: () => .5});
  g.start(); g.weapons = [];
  g.addWeapon('seed');
  const w = g.weapons[0]; w.level = level;
  g.fireWeapon(w, g.stats(w));
  return {g, w};
}

test('seeds expand from the cast torso position without requiring a target', () => {
  const {g} = launch();
  assert.equal(g.bullets.length, 3);
  const origin = bodyCenter(g.player);
  const b = g.bullets[0];
  assert.deepEqual(b.origin, origin);
  g.player.x += 100;
  for(let i=0;i<30;i++)g.updateBullets(1/60);
  assert.ok(Math.abs(Math.hypot(b.x-origin.x,b.y-origin.y)-200*.5/1.8)<1e-6);
  assert.ok(b.y > origin.y);
  assert.deepEqual(b.origin, origin);
  for(let i=0;i<120;i++)g.updateBullets(1/60);
  assert.equal(g.bullets.length,0);
});

test('a seed pierces once per target, applies slow, and records actual damage', () => {
  const {g} = launch();
  const b = g.bullets[0];g.bullets=[b];
  const e = g.spawn('boar');
  Object.assign(e,{x:b.x+4,y:b.y,hp:1000});
  g.grid.rebuild(g.enemies);
  for(let i=0;i<10;i++)g.updateBullets(1/60);
  assert.equal(e.hp,990);
  assert.equal(e.slow,.15);
  assert.equal(e.slowTime,.8);
  assert.equal(g.runStats.weapons.seed.hits,1);
  assert.equal(g.runStats.weapons.seed.damage,10);
});

test('max seed level alternates six-way spirals and respects boss slow cap', () => {
  const {g,w} = launch(8);
  assert.equal(g.bullets.length,6);
  assert.equal(g.bullets[0].direction,1);
  g.bullets=[];g.fireWeapon(w,g.stats(w));
  assert.equal(g.bullets[0].direction,-1);
  const b=g.bullets[0];g.bullets=[b];
  const boss=g.spawn('boss');Object.assign(boss,{x:b.x+2,y:b.y});g.grid.rebuild(g.enemies);
  g.updateBullets(1/60);
  assert.equal(boss.slow,.15);
});

test('every weapon and passive maps to a unique generated inventory cell', () => {
  assert.equal(ITEM_ICONS.length,20);
  assert.equal(new Set(ITEM_ICONS).size,20);
  for(const item of [...WEAPONS,...PASSIVES])assert.ok(itemIcon(item.id).includes(`data-icon="${item.id}"`));
  assert.equal(itemIcon('unknown'),'');
  assert.equal(itemIcon('heal'),itemIcon('health'));
});

test('sound icon communicates enabled, muted, and unavailable states accessibly', () => {
  const attributes={};
  const button={classList:{add(){}},setAttribute:(k,v)=>attributes[k]=v};
  updateSoundControl(button,true);
  assert.equal(attributes['aria-pressed'],'true');
  assert.equal(attributes['aria-label'],'소리 끄기');
  const enabled=button.innerHTML;
  updateSoundControl(button,false);
  assert.equal(attributes['aria-label'],'소리 켜기');
  assert.notEqual(button.innerHTML,enabled);
  updateSoundControl(button,false,true);
  assert.equal(button.disabled,true);
  assert.equal(attributes['aria-pressed'],'false');
});

test('inventory cuts stop before the neighboring row enters the four reported icons', async () => {
  const {inventoryCrop} = await import('../src/item-icons.js');
  for (const id of ['turret','boomerang','seed','ice']) {
    const index=ITEM_ICONS.indexOf(id);
    const [x,y,w,h]=inventoryCrop(index,1402,1122);
    assert.ok(w>200 && h>200);
    assert.ok(y+h <= (id==='ice'?548:806));
    assert.ok(x>=0 && x+w<=1402);
  }
});
