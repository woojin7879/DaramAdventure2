import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { WEAPONS, BY_ID, xpRequired } from "../src/data.js";
const seeded = () => {
  let n = 77;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
};
const fresh = () => {
  const g = new Game({ random: seeded() });
  g.start();
  return g;
};
const enemy = (g, type = "snake", x = 1230, y = 1200) => {
  const e = g.spawn(type);
  e.x = x;
  e.y = y;
  g.grid.rebuild(g.enemies);
  return e;
};
test("all 12 weapons have contiguous levels and upgrade descriptions", () => {
  assert.equal(WEAPONS.length, 12);
  for (const w of WEAPONS) {
    assert.equal(w.stats.length, w.max, w.id);
    assert.equal(w.up.length, w.max, w.id);
    for (const s of w.stats)
      for (const v of Object.values(s))
        assert.ok(typeof v === "boolean" || Number.isFinite(v));
  }
});
test("six slots include starting weapon, upgrades allowed when full, caps enforced", () => {
  const g = fresh();
  for (const w of WEAPONS.slice(1, 6)) assert.ok(g.addWeapon(w.id));
  assert.equal(g.weapons.length, 6);
  assert.equal(g.addWeapon("ice"), false);
  while (g.addWeapon("acorn")) {}
  assert.equal(g.weapons[0].level, 8);
  for (let i = 0; i < 100; i++)
    for (const c of g.makeChoices())
      if (c.kind === "weapon") {
        assert.ok(g.weapons.some((w) => w.id === c.id));
        assert.notEqual(c.id, "acorn");
      }
});
test("diagonal speed equals cardinal speed; zero input does not move", () => {
  const a = fresh(),
    b = fresh();
  for (let i = 0; i < 60; i++) {
    a.step(1 / 60, { x: 1, y: 0 });
    b.step(1 / 60, { x: 1, y: 1 });
  }
  assert.ok(
    Math.abs(
      Math.hypot(a.player.x - 1200, a.player.y - 1200) -
        Math.hypot(b.player.x - 1200, b.player.y - 1200),
    ) < 0.001,
  );
  const c = fresh();
  c.step(1 / 60);
  assert.equal(c.player.x, 1200);
});
test("pause freezes timers, shield charge, health and movement", () => {
  const g = fresh();
  g.addWeapon("charm");
  g.hurt(10);
  g.pause();
  const before = g.snapshot();
  for (let i = 0; i < 30; i++) g.step(0.05, { x: 1, y: 1 });
  assert.deepEqual(g.snapshot(), before);
  g.resume();
  g.step(0.05);
  assert.ok(g.time > before.time);
});
test("level-up chains process XP without losing rewards", () => {
  const g = fresh();
  g.xp = xpRequired(1) + xpRequired(2) + 3;
  g.checkLevel();
  assert.equal(g.state, "levelup");
  assert.equal(g.level, 2);
  g.choose(0);
  assert.equal(g.level, 3);
  assert.equal(g.state, "levelup");
  g.choose(0);
  assert.equal(g.state, "playing");
  assert.equal(g.xp, 3);
});
test("charm blocks one hit, ignores simultaneous hits, recharges individually", () => {
  const g = fresh();
  g.addWeapon("charm");
  const w = g.weapons.find((w) => w.id === "charm");
  while (w.level < 7) g.addWeapon("charm");
  w.shields = 3;
  g.hurt(40);
  g.hurt(40);
  assert.equal(w.shields, 2);
  assert.equal(g.player.hp, 100);
  assert.equal(g.player.invuln, 0.7);
  w.charge = 11.99;
  g.updateWeapons(0.02, 0);
  assert.equal(w.shields, 3);
  assert.ok(w.charge < 0.1);
  g.updateWeapons(1, 0);
  assert.equal(w.charge, 0);
});
test("six max-level choices remain valid; fallback when every upgrade is maxed", () => {
  const g = fresh();
  for (const w of WEAPONS.slice(1, 6)) g.addWeapon(w.id);
  for (const w of g.weapons) w.level = BY_ID[w.id].max;
  for (const id of ["might", "haste", "speed", "health", "magnet", "area"])
    g.passives[id] = 5;
  assert.equal(g.makeChoices()[0].kind, "heal");
});
test("fire and spore zones do not multiply tick damage when overlapping", () => {
  const g = fresh(),
    e = enemy(g, "boar");
  g.addZone("fire", e, { radius: 50, duration: 2, tick: 3 });
  g.addZone("fire", e, { radius: 50, duration: 2, tick: 3 });
  const hp = e.hp;
  g.updateZones(0.01);
  assert.equal(e.hp, hp - 3);
  g.updateZones(0.01);
  assert.equal(e.hp, hp - 3);
  g.time += 0.5;
  g.updateZones(0.01);
  assert.equal(e.hp, hp - 6);
});
test("chain lightning does not hit the same isolated boss repeatedly", () => {
  const g = fresh();
  g.weapons = [];
  g.addWeapon("lightning");
  const w = g.weapons[0];
  w.level = 8;
  const e = enemy(g, "boss");
  const hp = e.hp;
  g.fireWeapon(w, g.stats(w));
  assert.equal(e.hp, hp - 40);
});
test("season boundary preserves positions, threats, drops, and every running timer", () => {
  const g = fresh();
  g.addWeapon("charm");
  g.weapons[1].shields = 0;
  g.weapons[1].charge = 8;
  g.weapons[0].timer = 0.6;
  g.time = 300;
  g.player.x = 1700;
  g.player.y = 800;
  g.drops.push({ x: 0, y: 0, type: "xp", value: xpRequired(1) + 3 });
  const e = enemy(g, "snake", 1680, 820),
    drop = g.drops[0];
  g.zones.push({ type: "spore", x: 1700, y: 800, life: 2 });
  g.turrets.push({ x: 1650, y: 780, life: 10 });
  const enemies = g.enemies,
    zones = g.zones,
    turrets = g.turrets;
  g.transition();
  assert.equal(g.state, "playing");
  assert.equal(g.season, 1);
  assert.equal(g.enemies, enemies);
  assert.equal(g.enemies[0], e);
  assert.equal(g.player.x, 1700);
  assert.equal(g.player.y, 800);
  assert.equal(g.xp, 0);
  assert.equal(g.drops[0], drop);
  assert.equal(g.zones, zones);
  assert.equal(g.turrets, turrets);
  assert.equal(g.weapons[0].timer, 0.6);
  assert.equal(g.weapons[1].charge, 8);
});
test("four seasons lead to boss, victory only after boss dies", () => {
  const g = fresh();
  for (let i = 0; i < 4; i++) {
    g.time = (i + 1) * 300;
    g.transition();
  }
  assert.ok(g.boss);
  assert.equal(g.state, "playing");
  g.boss.hp = 0;
  g.step(1 / 60);
  assert.equal(g.state, "won");
});
test("checkpoint roundtrip and yearly reset", () => {
  const g = fresh();
  g.time = 600;
  g.season = 2;
  g.level = 23;
  g.addWeapon("bee");
  g.addWeapon("bee");
  g.passives.might = 3;
  const snap = g.snapshot();
  const h = fresh();
  h.restore(snap);
  assert.equal(h.level, 23);
  assert.equal(h.weapons[1].level, 2);
  assert.equal(h.passives.might, 3);
  h.start();
  assert.equal(h.level, 1);
  assert.equal(h.weapons.length, 1);
  assert.deepEqual(h.passives, {});
  assert.throws(() =>
    h.restore({ ...snap, weapons: [{ id: "fake", level: 1 }] }),
  );
});
test("new weapons enforce field population caps", () => {
  const g = fresh();
  g.weapons = [];
  for (const id of ["spore", "bee", "turret"]) g.addWeapon(id);
  for (const w of g.weapons) w.level = BY_ID[w.id].max;
  enemy(g, "boss", 1400, 1200);
  for (let i = 0; i < 1200; i++) {
    g.time += 0.05;
    g.grid.rebuild(g.enemies);
    g.updateWeapons(0.05, 12);
    g.updateBullets(0.05);
    g.updateZones(0.05);
  }
  assert.ok(g.zones.filter((z) => z.type === "spore").length <= 10);
  assert.equal(g.bees.length, 4);
  assert.ok(g.turrets.length <= 3);
  assert.ok(g.bullets.length <= 240);
});
test("all weapons can simulate together across a complete quick year", () => {
  const g = new Game({ random: seeded() });
  g.start(true);
  g.weapons = [];
  for (const w of WEAPONS) {
    g.weapons.push({
      id: w.id,
      level: w.max,
      timer: 0,
      travel: 0,
      charge: 0,
      shields: 3,
    });
  }
  g.player.hp = g.player.maxHp = 100000;
  for (let i = 0; i < 20000 && g.state !== "won"; i++) {
    if (g.state === "levelup") g.choose(0);
    const a = i * 0.005;
    g.step(0.025, { x: Math.cos(a), y: Math.sin(a) });
    assert.ok(Number.isFinite(g.player.hp));
    assert.ok(g.enemies.length <= 262);
    assert.ok(g.bullets.length <= 240);
    if (g.boss && i > 13000) g.damage(g.boss, 100000);
  }
  assert.equal(g.state, "won");
  assert.ok(g.kills > 100);
});
