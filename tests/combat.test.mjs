import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { BY_ID } from "../src/data.js";
import { resultDetails } from "../src/results.js";
const fresh = () => {
  let seed = 77;
  const g = new Game({
    random: () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296,
  });
  g.start();
  return g;
};
const target = (g, type = "boar") => {
  const e = g.spawn(type);
  Object.assign(e, { x: 1300, y: 1200, hp: 1000, maxHp: 1000 });
  g.grid.rebuild(g.enemies);
  return e;
};
test("overlapping spores apply strongest single tick independent of insertion order", () => {
  for (const values of [
    [5, 12, 8],
    [12, 8, 5],
  ]) {
    const g = fresh(),
      e = target(g);
    for (const tick of values)
      g.addZone("spore", e, { radius: 50, duration: 3, tick, cap: 10 });
    g.updateZones(0.01);
    assert.equal(e.hp, 988);
    g.time = 0.49;
    g.updateZones(0.01);
    assert.equal(e.hp, 988);
    g.time = 0.5;
    g.updateZones(0.01);
    assert.equal(e.hp, 976);
    assert.equal(g.runStats.weapons.spore.damage, 24);
  }
});
test("expired clouds cannot damage; fire and spores have separate single ticks", () => {
  const g = fresh(),
    e = target(g);
  g.addZone("spore", e, { radius: 50, duration: 0.001, tick: 999, cap: 10 });
  g.addZone("spore", e, { radius: 50, duration: 3, tick: 12, cap: 10 });
  g.addZone("fire", e, { radius: 50, duration: 3, tick: 3 });
  g.updateZones(0.01);
  assert.equal(e.hp, 985);
});
test("damage ledger excludes overkill and duplicate kills; snapshots isolate and preserve history", () => {
  const g = fresh(),
    e = target(g);
  e.hp = 9;
  g.time = 40;
  g.addWeapon("lightning");
  g.damage(e, 40, "#fff", 0, "lightning");
  g.damage(e, 40, "#fff", 0, "lightning");
  assert.deepEqual(g.runStats.weapons.lightning, {
    damage: 9,
    kills: 1,
    hits: 1,
    acquired: 40,
  });
  g.time = 300;
  g.season = 1;
  const snapshot = g.snapshot(),
    restored = fresh();
  restored.restore(snapshot);
  assert.deepEqual(restored.runStats, g.runStats);
  restored.runStats.weapons.lightning.damage = 99;
  assert.equal(g.runStats.weapons.lightning.damage, 9);
  const html = resultDetails(g.report());
  assert.match(html, /연쇄 번개|번개/);
  assert.match(html, /테크트리/);
  const old = { ...snapshot };
  delete old.runStats;
  restored.restore(old);
  assert.equal(restored.runStats.since, 300);
  assert.equal(restored.runStats.weapons.lightning.acquired, 300);
});
test("turret acorns, bee attacks, ice, and burning retain their weapon attribution", () => {
  const g = fresh(),
    e = target(g);
  g.weapons = [];
  g.addWeapon("turret");
  g.updateWeapons(0.01, 0);
  g.updateWeapons(0.2, 0);
  assert.equal(g.bullets[0].source, "turret");
  const bullet = g.bullets[0];
  bullet.x = e.x;
  bullet.y = e.y;
  bullet.vx = bullet.vy = 0;
  g.updateBullets(0.01);
  assert.ok(g.runStats.weapons.turret.damage > 0);
  assert.equal(g.runStats.weapons.acorn.damage, 0);
  g.addWeapon("bee");
  g.updateWeapons(0.01, 0);
  const bee = g.bees[0];
  Object.assign(bee, { x: e.x, y: e.y, state: "attack", target: e });
  g.updateBees(g.weapons[1], g.stats(g.weapons[1]), 0.01);
  assert.ok(g.runStats.weapons.bee.damage > 0);
  g.addWeapon("ice");
  const ice = g.weapons[2];
  e.x = g.player.x + 10;
  g.grid.rebuild(g.enemies);
  g.fireWeapon(ice, g.stats(ice));
  g.updateHazards(0.05);
  assert.ok(g.runStats.weapons.ice.damage > 0);
  e.burn = 2;
  e.burnTick = 0;
  g.step(0.01);
  assert.ok(g.runStats.weapons.fire.damage > 0);
});
test("bat flies through instead of following; fox commits to telegraphed direction", () => {
  const g = fresh(),
    bat = target(g, "bat");
  bat.heading = 0;
  g.updateEnemy(bat, 0.05);
  assert.ok(bat.x > 1300);
  g.player.y = 900;
  g.updateEnemy(bat, 0.05);
  assert.equal(bat.y, 1200);
  bat.age = 13;
  g.updateEnemy(bat, 0.05);
  assert.equal(bat.escaped, true);
  const fox = target(g, "fox");
  g.player.y = 1200;
  fox.skillClock = 0;
  g.updateEnemy(fox, 0.01);
  assert.equal(fox.attack.running, false);
  const direction = fox.attack.angle;
  g.player.y = 1500;
  g.updateEnemy(fox, 0.81);
  assert.equal(fox.attack.running, true);
  assert.equal(fox.attack.angle, direction);
});
test("mushroom holds range, warns before firing, and projectiles are dodgeable", () => {
  const g = fresh(),
    e = target(g, "mushroom");
  e.x = 1430;
  e.skillClock = 0;
  g.updateEnemy(e, 0.01);
  assert.equal(g.enemyShots.length, 0);
  assert.equal(e.attack.type, "spit");
  g.updateEnemy(e, 0.91);
  assert.equal(g.enemyShots.length, 1);
  g.player.y += 100;
  for (let i = 0; i < 80; i++) g.updateEnemyShots(0.05);
  assert.equal(g.player.hp, 100);
  assert.equal(g.enemyShots.length, 0);
});
test("late growth is continuous across seasons and much stronger than opening", () => {
  const g = fresh(),
    early = g.spawn("snake");
  g.time = 899.99;
  const before = g.spawn("snake");
  g.time = 900.01;
  g.season = 3;
  const after = g.spawn("snake");
  assert.ok(Math.abs(after.hp - before.hp) < 0.01);
  // First-year autumn easing still preserves substantial, continuous growth.
  assert.ok(after.hp > early.hp * 4);
});
test("winter camping loses to pressure while moving survives the same seeded four minutes", () => {
  const simulate = (moving) => {
    const g = fresh();
    g.time = 900;
    g.season = 3;
    for (const id of ["tail", "stone", "lightning", "fire", "charm"])
      g.addWeapon(id);
    for (const w of g.weapons) w.level = BY_ID[w.id].max;
    g.passives = {
      might: 5,
      haste: 5,
      health: 5,
      area: 5,
      speed: 5,
      magnet: 5,
    };
    g.player.hp = g.player.maxHp = 200;
    for (let i = 0; i < 14400 && g.state !== "dead"; i++) {
      if (g.state === "levelup") g.choose(0);
      const a = (g.time - 900) * 0.35;
      g.step(
        1 / 60,
        moving ? { x: Math.cos(a), y: Math.sin(a) } : { x: 0, y: 0 },
      );
    }
    return g;
  };
  const camp = simulate(false),
    move = simulate(true);
  assert.equal(camp.state, "dead");
  assert.ok(camp.time < 1020);
  assert.ok(move.player.hp > 0);
  assert.ok(move.time > 1139);
});

test("opening budgets limit ranged enemies and maintain intended seasonal proportions", async () => {
  const { encounterBudget, pickEnemy } = await import("../src/encounters.js");
  const early = encounterBudget(30, 300, 0);
  assert.ok(early.interval > 2);
  assert.ok(early.cap <= 20);
  for (let i = 0; i < 100; i++)
    assert.equal(
      pickEnemy(early, [], () => i / 100),
      "snake",
    );
  const spring = encounterBudget(100, 300, 0);
  assert.equal(spring.mushroomCap, 2);
  assert.equal(
    pickEnemy(spring, [], () => 0.99),
    "mushroom",
  );
  assert.equal(
    pickEnemy(
      spring,
      [
        { type: "mushroom", hp: 10 },
        { type: "mushroom", hp: 10 },
      ],
      () => 0.99,
    ),
    "snake",
  );
  for (let season = 1; season < 4; season++) {
    const budget = encounterBudget(season * 300 + 100, 300, season);
    const counts = {};
    for (let i = 0; i < 1000; i++) {
      const id = pickEnemy(budget, [], () => i / 1000);
      counts[id] = (counts[id] || 0) + 1;
    }
    assert.ok(Math.abs(counts.mushroom - budget.weights.mushroom * 10) <= 1);
    assert.ok(counts.snake >= 200);
  }
});

test("first minute stays under opening cap even without kills; old mushrooms leave siege stance", () => {
  const g = fresh();
  g.weapons = [];
  g.player.hp = g.player.maxHp = 100000;
  let maximum = 0;
  for (let i = 0; i < 1200; i++) {
    g.step(0.05);
    maximum = Math.max(maximum, g.enemies.length);
  }
  assert.ok(maximum <= 28);
  assert.ok(g.enemies.every((e) => e.type === "snake"));
  const mushroom = target(g, "mushroom");
  mushroom.x = 1430;
  mushroom.age = 41;
  mushroom.skillClock = 0;
  g.updateEnemy(mushroom, 0.05);
  assert.equal(mushroom.attack, null);
  assert.ok(mushroom.x < 1430);
});

test("stone orbit and collision share torso center, including outer rings", async () => {
  const { bodyCenter, stoneOrbit } = await import("../src/geometry.js");
  const g = fresh();
  g.weapons = [];
  g.addWeapon("stone");
  const w = g.weapons[0],
    stats = g.stats(w),
    point = stoneOrbit(g, stats, 0);
  assert.deepEqual(bodyCenter(g.player), { x: 1200, y: 1184 });
  const e = target(g, "snake");
  e.x = point.x;
  e.y = point.y;
  g.grid.rebuild(g.enemies);
  g.updateWeapons(0.01, 0);
  assert.ok(e.hp < 1000);
  w.level = BY_ID.stone.max;
  for (let i = 0; i < 4; i++) {
    const q = stoneOrbit(g, g.stats(w), i);
    assert.equal(q.cy, 1184);
    assert.ok(Math.abs(Math.hypot(q.x - q.cx, q.y - q.cy) - q.radius) < 0.001);
  }
});

test("spring accelerates after the first minute and allows more late mushrooms", async () => {
  const { encounterBudget } = await import("../src/encounters.js");
  const initial = encounterBudget(30, 300, 0),
    middle = encounterBudget(120, 300, 0),
    late = encounterBudget(240, 300, 0);
  assert.ok(initial.interval > 2);
  assert.ok(middle.interval < 1);
  assert.ok(middle.cap >= 40);
  assert.ok(late.interval < 0.7);
  assert.equal(late.mushroomCap, 6);
  assert.equal(late.weights.mushroom, 20);
});

test("turret retains its emplacement and can hit beyond the former 320-unit limit", () => {
  const g = fresh();
  g.weapons = [];
  g.addWeapon("turret");
  const e = target(g);
  e.x = 1545;
  e.y = 1176;
  g.grid.rebuild(g.enemies);
  g.updateWeapons(0.01, 0);
  const first = g.turrets[0];
  for (let i = 0; i < 180; i++) {
    g.time += 1 / 60;
    g.updateWeapons(1 / 60, 0);
    g.updateBullets(1 / 60);
  }
  assert.ok(e.hp < 1000);
  assert.ok(g.runStats.weapons.turret.damage > 0);
  g.player.x += 300;
  for (let i = 0; i < 360; i++) {
    g.time += 1 / 60;
    g.updateWeapons(1 / 60, 0);
  }
  assert.equal(g.turrets[0].id, first.id);
  assert.ok(first.life > 0);
  assert.equal(g.turrets.length, 1);
  for (let i = 0; i < 240; i++) {
    g.time += 1 / 60;
    g.updateWeapons(1 / 60, 0);
  }
  assert.equal(g.turrets.length, 1);
  assert.notEqual(g.turrets[0].id, first.id);
});

test("billiard acorn really ricochets between distinct targets and creates impact cues", () => {
  const g = fresh();
  g.weapons = [];
  g.addWeapon("bounce");
  const a = target(g, "snake"),
    b = target(g, "snake");
  Object.assign(a, { x: 1250, y: 1200 });
  Object.assign(b, { x: 1300, y: 1240 });
  g.grid.rebuild(g.enemies);
  const w = g.weapons[0];
  g.fireWeapon(w, g.stats(w));
  for (let i = 0; i < 120; i++) {
    g.time += 1 / 60;
    g.updateBullets(1 / 60);
  }
  assert.ok(a.hp < 1000 && b.hp < 1000);
  assert.equal(g.runStats.weapons.bounce.hits, 2);
  assert.equal(g.fx.filter((f) => f.type === "ricochet").length, 2);
});

test("weapon lab suppresses campaign spawning, leveling, rewards and death without affecting normal runs", () => {
  const g = fresh();
  g.sandbox = true;
  g.weapons = [];
  g.time = 1199.99;
  g.xp = 10000;
  g.spawnClock = g.eliteClock = g.waveClock = 0;
  for (let i = 0; i < 100; i++) g.step(0.05);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.boss, null);
  assert.equal(g.season, 0);
  assert.equal(g.level, 1);
  assert.equal(g.state, "playing");
  g.hurt(100000);
  assert.equal(g.player.hp, 1);
  assert.equal(g.state, "playing");
  const e = target(g);
  g.damage(e, 100000, "#fff", 0, "acorn");
  assert.equal(g.drops.length, 0);
  g.start();
  assert.equal(g.sandbox, false);
  g.hurt(100000);
  assert.equal(g.state, "dead");
});

test("fixed lab targets never move or attack", () => {
  const g = fresh();
  g.sandbox = true;
  const e = target(g, "fox");
  e.trainingDummy = true;
  e.damage = 0;
  const before = { x: e.x, y: e.y };
  g.updateEnemy(e, 10);
  assert.deepEqual({ x: e.x, y: e.y }, before);
  assert.equal(e.attack, null);
});

test("both snowflake waves originate at torso and shield charge produces a visible cue", async () => {
  const { bodyCenter } = await import("../src/geometry.js");
  const g = fresh();
  g.weapons = [];
  g.addWeapon("ice");
  const w = g.weapons[0];
  w.level = BY_ID.ice.max;
  g.fireWeapon(w, g.stats(w));
  assert.equal(g.hazards.length, 2);
  for (const h of g.hazards)
    assert.deepEqual({ x: h.x, y: h.y }, bodyCenter(g.player));
  g.addWeapon("charm");
  assert.ok(g.fx.some((f) => f.type === "shieldReady"));
  g.fx = [];
  const charm = g.weapons[1];
  charm.shields = 0;
  charm.charge = 19.99;
  g.updateWeapons(0.02, 0);
  assert.equal(charm.shields, 1);
  assert.ok(g.fx.some((f) => f.type === "shieldReady"));
});

test("flame orientation aligns the atlas leading direction to velocity in all quadrants", async () => {
  const { fireRotation } = await import("../src/geometry.js");
  for (const [vx, vy] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ]) {
    const angle = fireRotation(vx, vy) + (Math.PI * 3) / 4,
      len = Math.hypot(vx, vy);
    assert.ok(Math.abs(Math.cos(angle) - vx / len) < 1e-10);
    assert.ok(Math.abs(Math.sin(angle) - vy / len) < 1e-10);
  }
});
