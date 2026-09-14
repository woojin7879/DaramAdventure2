import test from 'node:test';
import assert from 'node:assert/strict';
import { codexHTML, codexCountHTML, codexProgress, addDiscovery } from '../src/codex.js';
import { EVOLUTIONS } from '../src/data.js';

test('codex tracks only evolved weapons and never duplicates', () => {
  let seen = [];
  seen = addDiscovery(seen, 'acorn');
  assert.deepEqual(seen, [], 'base weapons are not discoveries');
  seen = addDiscovery(seen, 'harvest');
  const same = addDiscovery(seen, 'harvest');
  assert.equal(same, seen, 'unchanged reference when nothing new');
  assert.deepEqual(codexProgress(seen), { found: 1, total: EVOLUTIONS.length });
  assert.equal(addDiscovery(seen, 'nope'), seen);
});

test('codex hides name, effect and recipe until discovered', () => {
  const html = codexHTML(['harvest']);
  assert.equal((html.match(/codex-card/g) || []).length, EVOLUTIONS.length);
  assert.match(html, /codex-card unlocked" data-id="harvest"/);
  assert.match(html, /풍년의 새총/);
  assert.match(html, /도토리가 작은 도토리 3개로/);
  assert.doesNotMatch(html, /폭풍 꼬리/, 'undiscovered evolution name stays hidden');
  assert.doesNotMatch(html, /바람 파동이 적을 밀어냅니다/, 'undiscovered effect stays hidden');
  assert.match(html, /\? \? \?/);
  assert.match(html, /도토리 새총 Lv\.8[^]*단단한 이빨 Lv\.5/, 'discovered card shows its recipe');
  assert.doesNotMatch(html, /넓은 잎사귀/, 'locked recipes stay hidden');
  assert.doesNotMatch(html, /꼬리 휩쓸기/, 'locked cards do not even name the base weapon');
  assert.match(html, /조합은 발견 후 공개/);
  assert.doesNotMatch(html, /codex-progress/);
  assert.match(codexCountHTML(['harvest']), /<b>1<\/b> \/ 14 발견/);
  assert.match(codexCountHTML(EVOLUTIONS.map((e) => e.id)), /<b>14<\/b> \/ 14 발견/);
});
