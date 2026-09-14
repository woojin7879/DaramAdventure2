import test from 'node:test';
import assert from 'node:assert/strict';
import { codexHTML, codexProgress, addDiscovery } from '../src/codex.js';
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

test('codex hides names and effects until discovered but always shows the recipe', () => {
  const html = codexHTML(['harvest']);
  assert.equal((html.match(/codex-card/g) || []).length, EVOLUTIONS.length);
  assert.match(html, /codex-card unlocked" data-id="harvest"/);
  assert.match(html, /풍년의 새총/);
  assert.match(html, /도토리가 작은 도토리 3개로/);
  assert.doesNotMatch(html, /폭풍 꼬리/, 'undiscovered evolution name stays hidden');
  assert.doesNotMatch(html, /바람 파동이 적을 밀어냅니다/, 'undiscovered effect stays hidden');
  assert.match(html, /\? \? \?/);
  assert.match(html, /단단한 이빨 Lv\.1/, 'recipe passive is visible even when locked');
  assert.match(html, /<b>1<\/b> \/ 14 발견/);
  assert.match(codexHTML(EVOLUTIONS.map((e) => e.id)), /모든 진화를 깨웠습니다/);
});
