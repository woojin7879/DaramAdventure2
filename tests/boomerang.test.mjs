import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { bodyCenter } from "../src/geometry.js";

function setup(level = 1) {
  const g = new Game({ random: () => 0.5 });
  g.start();
  g.addWeapon("boomerang");
  const w = g.weapons.find(w => w.id === "boomerang");
  w.level = level;
  const e = g.spawn("boar");
  const home = bodyCenter(g.player);
  Object.assign(e, { x: home.x + 120, y: home.y, hp: 10000 });
  g.grid.rebuild(g.enemies);
  g.fireWeapon(w, g.stats(w));
  return { g, w, e };
}

test("boomerang pierces once per enemy on each leg and records both hits", () => {
  const { g, e } = setup();
  const b = g.bullets[0];
  assert.deepEqual({ x: b.x, y: b.y }, bodyCenter(g.player));
  while (!b.returning) g.updateBullets(1 / 60);
  assert.equal(e.hp, 10000 - 18);
  assert.equal(g.runStats.weapons.boomerang.hits, 1);
  for (let i = 0; i < 300 && g.bullets.length; i++) g.updateBullets(1 / 60);
  assert.equal(g.bullets.length, 0);
  assert.equal(e.hp, 10000 - 36);
  assert.equal(g.runStats.weapons.boomerang.damage, 36);
  assert.equal(g.runStats.weapons.boomerang.hits, 2);
});

test("returning boomerang follows the player's new position and is recovered", () => {
  const { g } = setup();
  const b = g.bullets[0];
  while (!b.returning) g.updateBullets(1 / 60);
  g.player.y += 180;
  for (let i = 0; i < 300 && g.bullets.length; i++) g.updateBullets(1 / 60);
  assert.equal(g.bullets.length, 0);
  const home = bodyCenter(g.player);
  assert.ok(Math.hypot(b.x - home.x, b.y - home.y) < 8);
});

test("maximum level throws two boomerangs with stronger return damage", () => {
  const { g, e } = setup(8);
  assert.equal(g.bullets.length, 2);
  const b = g.bullets[0];
  b.returning = true;
  b.x = e.x + 50;
  b.y = e.y;
  g.bullets = [b];
  g.updateBullets(0.2);
  assert.ok(Math.abs(g.runStats.weapons.boomerang.damage - 32 * 1.3) < 0.001);
});
