import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { pauseLoadout, passiveEffect } from '../src/pause-loadout.js';

test('pause build shows live enhanced damage and next upgrade without changing game',()=>{
  const g=new Game();g.start();g.passives.might=2;
  const before=JSON.stringify(g.snapshot());
  const html=pauseLoadout(g);
  assert.ok(html.includes('피해 14.4'));
  assert.ok(html.includes('모든 무기 피해 +20%'));
  assert.ok(html.includes('다음 강화 · 피해 12 → 16'));
  assert.ok(html.includes('무기를 5개 더 장착'));
  assert.equal(JSON.stringify(g.snapshot()),before);
});

test('maxed weapons and current shield charges display correctly',()=>{
  const g=new Game();g.start();g.addWeapon('charm');
  g.weapons[0].level=8;g.weapons[1].shields=0;
  const html=pauseLoadout(g);
  assert.ok(html.includes('최대 강화 완료'));
  assert.ok(html.includes('보호 0 / 1회'));
  assert.ok(html.includes('아직 획득한 패시브가 없습니다.'));
  assert.ok(!html.includes('undefined'));
  assert.equal(passiveEffect('haste',5),'공격 간격 −30% · 부적·포자 제외');
});
