import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import {
  CHAPTERS,
  chapter,
  canPlayYear,
  clearedYears,
  inWater,
  riverX,
} from "../src/chapters.js";
import { addPool, addRoot, updateChapterBoss } from "../src/chapter-combat.js";
const game = (year) => {
  const g = new Game({ random: () => 0.3 });
  g.start(false, null, year);
  return g;
};
test("three years have distinct bosses and stories with valid unlock migration", () => {
  assert.equal(CHAPTERS.length, 3);
  assert.equal(new Set(CHAPTERS.map((c) => c.bossKind)).size, 3);
  for (const c of CHAPTERS) {
    assert.ok(c.ending.length >= 3);
    assert.equal(c.images.length, c.ending.length);
  }
  assert.deepEqual(clearedYears([1, 2, 2, 9, "3"], true), [1, 2]);
  assert.equal(canPlayYear(2, []), false);
  assert.equal(canPlayYear(2, [1]), true);
  assert.equal(canPlayYear(3, [1]), false);
  assert.equal(canPlayYear(3, [1, 2]), true);
  assert.equal(canPlayYear(3, [], true), true);
  assert.equal(canPlayYear(4, [1, 2, 3], true), false);
});
test("starting another year resets build and checkpoint preserves the chosen map", () => {
  const g = game(2);
  g.addWeapon("fire");
  g.passives.might = 4;
  g.time = 300;
  g.season = 1;
  const restored = game(1);
  restored.restore(g.snapshot());
  assert.equal(restored.year, 2);
  assert.equal(restored.weapons.length, 2);
  restored.start(false, null, 3);
  assert.equal(restored.year, 3);
  assert.equal(restored.level, 1);
  assert.equal(restored.weapons.length, 1);
  assert.deepEqual(restored.passives, {});
  assert.throws(() => restored.restore({ ...g.snapshot(), year: 4 }));
  const legacy = g.snapshot();
  delete legacy.year;
  restored.restore(legacy);
  assert.equal(restored.year, 1);
});
test("river crossings remain dry and terrain only slows the river chapter", () => {
  assert.equal(inWater(riverX(300), 300), true);
  assert.equal(inWater(riverX(600), 600), false);
  const a = game(1),
    b = game(2);
  for (const g of [a, b]) {
    g.player.x = riverX(300);
    g.player.y = 300;
    g.sandbox = true;
  }
  a.step(0.05, { x: 1, y: 0 });
  b.step(0.05, { x: 1, y: 0 });
  assert.ok(a.player.x > b.player.x);
});
test("serpent commits to telegraphed dash, volley, and river pools", () => {
  const g = game(2),
    e = g.spawn("boss");
  e.x = g.player.x + 180;
  e.y = g.player.y;
  e.bossClock = 0;
  assert.equal(e.bossKind, "serpent");
  updateChapterBoss(g, e, 0.01);
  assert.equal(e.attack.type, "charge");
  assert.equal(e.attack.running, false);
  updateChapterBoss(g, e, 1.21);
  assert.equal(e.attack.running, true);
  updateChapterBoss(g, e, 0.86);
  e.bossClock = 0;
  updateChapterBoss(g, e, 0.01);
  assert.equal(e.attack.type, "spit");
  updateChapterBoss(g, e, 1.01);
  assert.equal(g.enemyShots.length, 5);
  e.bossClock = 0;
  updateChapterBoss(g, e, 0.01);
  assert.equal(g.hazards.filter((h) => h.type === "pool").length, 3);
});
test("heart telegraphs radial roots, ring, and targeted frost; hazards allow escape", () => {
  const g = game(3),
    e = g.spawn("boss");
  e.x = g.player.x + 180;
  e.y = g.player.y;
  e.bossClock = 0;
  updateChapterBoss(g, e, 0.01);
  assert.equal(g.hazards.filter((h) => h.type === "rootline").length, 6);
  assert.ok(g.hazards.every((h) => h.delay >= 1));
  e.bossClock = 0;
  updateChapterBoss(g, e, 0.01);
  assert.ok(g.hazards.some((h) => h.type === "shock"));
  e.bossClock = 0;
  updateChapterBoss(g, e, 0.01);
  assert.ok(g.hazards.some((h) => h.type === "pool"));
  g.hazards = [];
  addPool(g, g.player.x, g.player.y);
  g.updateHazards(0.5);
  assert.equal(g.player.hp, 100);
  g.player.x += 200;
  g.updateHazards(0.8);
  assert.equal(g.player.hp, 100);
  g.hazards = [];
  addRoot(g, g.player.x - 100, g.player.y, 0, 200);
  g.updateHazards(1.3);
  assert.equal(g.player.hp, 78);
});
test("years two and three preserve live seasons and finish only on their own boss death", () => {
  for (const year of [2, 3]) {
    const g = game(year),
      e = g.spawn("snake");
    const position = { x: g.player.x, y: g.player.y };
    for (let season = 0; season < 4; season++) {
      g.time = (season + 1) * 300;
      g.transition();
      assert.ok(g.enemies.includes(e));
      assert.deepEqual({ x: g.player.x, y: g.player.y }, position);
    }
    assert.equal(g.boss.bossKind, chapter(year).bossKind);
    assert.equal(g.state, "playing");
    g.boss.hp = 0;
    g.step(0.01);
    assert.equal(g.state, "won");
  }
});
test("full quick runs for all years remain bounded through boss attacks", () => {
  for (const year of [2, 3]) {
    const g = game(year);
    g.start(true, null, year);
    g.player.hp = g.player.maxHp = 100000;
    for (let i = 0; i < 7000; i++) {
      if (g.state === "levelup") g.choose(0);
      const a = i * 0.008;
      g.step(0.05, { x: Math.cos(a), y: Math.sin(a) });
      assert.ok(g.enemies.length < 270);
      assert.ok(g.hazards.length <= 65);
      assert.ok(g.enemyShots.length <= 72);
    }
    assert.ok(g.boss);
    assert.ok(Number.isFinite(g.boss.hp));
    g.boss.hp = 0;
    if (g.state === "levelup") g.choose(0);
    g.step(0.01);
    assert.equal(g.state, "won");
  }
});
