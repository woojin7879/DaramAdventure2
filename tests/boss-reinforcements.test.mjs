import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { encounterBudget } from '../src/encounters.js';

test('boss arrival preserves the late-winter population budget', () => {
  for (const duration of [75, 300]) {
    const before = encounterBudget(duration * 4, duration, 3);
    const during = encounterBudget(duration * 4, duration, 3, true);
    assert.equal(during.cap, before.cap);
    assert.ok(during.interval < 0.5);
    assert.deepEqual(during.weights, before.weights);
  }
});

test('all story bosses keep receiving normal enemies above the old 40-enemy cap', () => {
  for (const year of [1, 2, 3]) {
    const g = new Game({ random: () => 0.5 });
    g.start(false, null, year);
    g.season = 3;
    g.time = 1200;
    g.weapons = [];
    for (let i = 0; i < 60; i++) g.spawn('snake');
    g.finishSeason();
    const boss = g.boss;
    g.spawnClock = 0;
    const count = g.enemies.length;
    for (let i = 0; i < 20; i++) g.step(0.05);
    assert.ok(g.enemies.length >= count + 2, `year ${year}: continued replenishment`);
    assert.equal(g.boss, boss);
    assert.equal(g.state, 'playing');
  }
});

test('boss reinforcements still respect the population cap', () => {
  const g = new Game({ random: () => 0.5 });
  g.start();
  g.season = 3;
  g.time = 1200;
  g.weapons = [];
  g.finishSeason();
  for (let i = 0; i < 190; i++) g.spawn('snake');
  g.spawnClock = 0;
  g.waveClock = 100;
  const count = g.enemies.length;
  g.step(0.05);
  assert.equal(g.enemies.length, count);
});
