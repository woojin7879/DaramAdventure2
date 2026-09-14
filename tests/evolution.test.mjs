import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.js";
import { BY_ID, WEAPONS, EVOLUTIONS, PASSIVES, baseOf } from "../src/data.js";
import { EVOLUTION_ICONS, itemIcon, evolutionCrop } from "../src/item-icons.js";
import { resultDetails } from "../src/results.js";
import { pauseLoadout } from "../src/pause-loadout.js";

function fresh(random = () => 0.5) {
  const events = [];
  const g = new Game({ random, onEvent: (type, payload) => events.push({ type, payload }) });
  g.start();
  g.weapons = [];
  return { g, events };
}
function maxed(g, id) {
  g.addWeapon(id);
  const w = g.weaponOf(id);
  w.level = BY_ID[id].max;
  return w;
}

test("every base weapon has exactly one evolution with a passive requirement", () => {
  assert.equal(EVOLUTIONS.length, WEAPONS.length);
  for (const w of WEAPONS) {
    const evo = BY_ID[w.evolution];
    assert.ok(evo?.evolved, `${w.id} lacks an evolution`);
    assert.equal(evo.base, w.id);
    assert.equal(evo.max, 1);
    assert.ok(PASSIVES.some((p) => p.id === evo.requires), `${evo.id} requires unknown passive`);
    assert.equal(baseOf(evo.id), w.id);
    assert.deepEqual({ ...evo.stats[0], ember: undefined, burst: undefined }, { ...w.stats.at(-1), ember: undefined, burst: undefined });
  }
  assert.equal(new Set(EVOLUTIONS.map((e) => e.id)).size, EVOLUTIONS.length);
});

test("evolution readiness needs a maxed weapon and the paired passive", () => {
  const { g } = fresh();
  g.addWeapon("acorn");
  const w = g.weaponOf("acorn");
  assert.equal(g.evolutionReady(w), false);
  w.level = BY_ID.acorn.max;
  assert.equal(g.evolutionReady(w), false);
  g.passives.might = 4;
  assert.equal(g.evolutionReady(w), false, "a partial passive is not enough");
  g.passives.might = 5;
  assert.equal(g.evolutionReady(w), true);
  assert.equal(g.evolve("acorn"), "harvest");
  assert.equal(g.weapons.length, 1);
  assert.equal(w.id, "harvest");
  assert.equal(w.level, 1);
  assert.equal(g.evolutionReady(w), false);
  assert.equal(g.evolve("acorn"), null);
  assert.equal(g.addWeapon("acorn"), false, "base cannot be re-added over its evolution");
  assert.equal(g.addWeapon("harvest"), false, "evolutions are never added directly");
  assert.equal(g.runStats.history.at(-1).kind, "evolve");
});

test("evolved weapons keep their family stats and are hidden from level-up cards", () => {
  const { g } = fresh();
  const w = maxed(g, "tail");
  g.passives.area = 5;
  const before = g.stats(w);
  g.evolve("tail");
  const after = g.stats(w);
  assert.equal(after.evolved, true);
  assert.equal(after.damage, before.damage);
  assert.equal(after.range, before.range);
  g.makeChoices();
  assert.ok(!g.choices.some((c) => c.kind === "weapon" && baseOf(c.id) === "tail"));
});

test("elites drop a chest that is opened by walking over it and pauses the game", () => {
  const { g, events } = fresh();
  maxed(g, "acorn");
  g.passives.might = 5;
  const e = g.spawn("boar");
  e.elite = true;
  Object.assign(e, { x: g.player.x + 60, y: g.player.y, hp: 1 });
  g.damage(e, 10, "#fff", 0, "acorn");
  const chest = g.drops.find((d) => d.type === "chest");
  assert.ok(chest);
  // Magnets never pull chests.
  for (const d of g.drops) d.pull = true;
  chest.pull = false;
  g.passives.magnet = 5;
  g.updateDrops(1 / 60);
  assert.ok(g.drops.includes(chest));
  Object.assign(g.player, { x: chest.x, y: chest.y });
  g.updateDrops(1 / 60);
  assert.equal(g.state, "chest");
  assert.equal(g.chest.kind, "evolve");
  assert.equal(g.chest.id, "harvest");
  assert.equal(g.weapons[0].id, "harvest");
  assert.equal(events.at(-1).type, "chest");
  g.step(1 / 30);
  assert.equal(g.state, "chest", "the world stays frozen while the chest is open");
  g.xp = 0;
  g.closeChest();
  assert.equal(g.state, "playing");
  assert.equal(g.runStats.chests, 1);
});

test("elites are mini-bosses: bulky, hard-hitting, crowd-control resistant, and hell alternates chests", () => {
  const { g } = fresh();
  const fox = g.spawn("fox"), elite = g.spawn("fox", true);
  assert.ok(elite.maxHp / fox.maxHp >= 34 && elite.maxHp / fox.maxHp <= 44);
  assert.ok(Math.abs(elite.damage / fox.damage - 1.8) < 1e-9);
  assert.equal(elite.speed, fox.speed, "elites are no longer slower than their kin");
  g.slow(elite, 0.6, 1);
  assert.equal(elite.slow, 0.3);
  Object.assign(fox, { x: g.player.x + 40, y: g.player.y, hp: 1e6 });
  Object.assign(elite, { x: g.player.x + 40, y: g.player.y, hp: 1e6 });
  g.damage(fox, 1, "#fff", 100);
  g.damage(elite, 1, "#fff", 100);
  assert.equal(fox.x - g.player.x, 140);
  assert.equal(elite.x - g.player.x, 65, "elites take a quarter of the knockback");
  // Story: every elite carries a chest. Hell: every other elite.
  assert.equal(elite.chest, true);
  const hell = new Game({ random: () => 0.5 });
  hell.start(false, null, 1, "hell");
  const carriers = [1, 2, 3, 4].map(() => hell.spawn("fox", true).chest);
  assert.deepEqual(carriers, [true, false, true, false]);
});

test("chests level up one owned, unmaxed skill by 1–3 (capped), else give a consolation reward", () => {
  // Second random() decides the amount. Story: <0.03 → +3, <0.2 → +2, else +1. Hell: <0.1 / <0.35.
  const rolls = (...values) => { let i = 0; return () => values[i++ % values.length]; };
  const { g } = fresh(rolls(0.5, 0.9));
  g.addWeapon("acorn");
  g.passives.might = 1;
  g.openChest();
  assert.equal(g.chest.kind, "upgrade");
  assert.deepEqual(g.chest.candidates.sort(), ["acorn", "might"], "only owned, unmaxed skills are candidates");
  const item = g.chest.item;
  assert.equal(item.gained, 1);
  if (item.kind === "weapon") assert.equal(g.weaponOf(item.id).level, item.level);
  else assert.equal(g.passives[item.id], item.level);
  g.closeChest();
  // Unowned passives and evolved weapons never appear; +3 is capped at the max level.
  const capped = fresh(rolls(0.1, 0.02)).g;
  capped.addWeapon("acorn");
  capped.weaponOf("acorn").level = BY_ID.acorn.max - 1;
  capped.openChest();
  assert.deepEqual(capped.chest.candidates, ["acorn"]);
  assert.equal(capped.chest.item.wanted, 3);
  assert.equal(capped.chest.item.gained, 1);
  assert.equal(capped.weaponOf("acorn").level, BY_ID.acorn.max);
  capped.closeChest();
  // A lucky roll grants +2.
  const lucky = fresh(rolls(0.1, 0.15)).g;
  lucky.addWeapon("acorn");
  lucky.openChest();
  assert.equal(lucky.chest.item.gained, 2);
  assert.equal(lucky.weaponOf("acorn").level, 3);
  // The same roll is only +1 past the story +2 threshold, but hell keeps the generous 65/25/10 odds.
  const storyRoll = fresh(rolls(0.1, 0.3)).g;
  storyRoll.addWeapon("acorn"); storyRoll.openChest();
  assert.equal(storyRoll.chest.item.gained, 1);
  const hellRoll = fresh(rolls(0.1, 0.3)).g; hellRoll.mode = "hell";
  hellRoll.addWeapon("acorn"); hellRoll.openChest();
  assert.equal(hellRoll.chest.item.gained, 2);
  // Everything owned is maxed/evolved: heal + special instead.
  g.weapons = [];
  for (const p of PASSIVES) g.passives[p.id] = p.max;
  maxed(g, "acorn");
  g.evolve("acorn");
  g.player.hp = 10;
  g.openChest();
  assert.equal(g.chest.kind, "bonus");
  assert.equal(g.player.hp, 40);
  g.closeChest();
});

test("evolution is preferred over growth and a level-up queued during the chest resumes afterwards", () => {
  const { g, events } = fresh();
  maxed(g, "charm");
  g.addWeapon("acorn");
  g.passives.health = 5;
  g.xp = 1e6;
  g.openChest();
  assert.equal(g.chest.kind, "evolve");
  assert.equal(g.chest.id, "blessing");
  assert.ok(!events.some((e) => e.type === "levelup"));
  g.closeChest();
  assert.equal(g.state, "levelup");
});

test("evolved loadouts survive snapshot and restore, duplicates of a family are rejected", () => {
  const { g } = fresh();
  maxed(g, "stone");
  g.passives.health = 5;
  g.evolve("stone");
  g.damage(g.spawn("snake"), 5, "#fff", 0, "stone");
  assert.equal(g.runStats.weapons.mountain.damage, 5);
  assert.equal(g.runStats.weapons.stone, undefined);
  g.time = g.seasonDuration;
  g.season = 1;
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  const restored = fresh().g;
  restored.restore(snap);
  assert.equal(restored.weapons[0].id, "mountain");
  assert.equal(restored.runStats.weapons.mountain.damage, 5);
  assert.ok(restored.runStats.history.some((h) => h.kind === "evolve"));
  assert.throws(() => fresh().g.restore({ ...snap, weapons: [...snap.weapons, { id: "stone", level: 1, timer: 0, travel: 0, charge: 0, shields: 0 }] }));
  const html = resultDetails(restored.report());
  assert.match(html, /산의 수호/);
  assert.match(html, /진화/);
});

test("pause loadout names an evolution only after it has happened", () => {
  const { g } = fresh();
  g.addWeapon("ice");
  g.weapons[0].level = BY_ID.ice.max;
  g.passives.speed = 5;
  const before = pauseLoadout(g);
  assert.doesNotMatch(before, /겨울잠의 결계/);
  assert.doesNotMatch(before, /진화 ·|준비 완료|보물상자에서 진화/);
  g.evolve("ice");
  assert.match(pauseLoadout(g), /겨울잠의 결계/);
  assert.match(pauseLoadout(g), /진화 완료/);
});

test("evolution icons map onto the 5×3 atlas and the chest tile", () => {
  assert.equal(EVOLUTION_ICONS.length, 15);
  for (const e of EVOLUTIONS) {
    const html = itemIcon(e.id);
    assert.ok(html.includes(`data-atlas="evolution"`), e.id);
    assert.ok(html.includes(`data-icon="${e.id}"`));
  }
  assert.match(itemIcon("chest"), /background-position:100% 100%/);
  assert.match(itemIcon("harvest"), /background-position:0% 0%/);
  const [x, y, w, h] = evolutionCrop(14, 1619, 971);
  assert.ok(x > 1619 * 0.8 && y > 971 * 0.6 && w < 1619 / 5 && Math.abs(h - 971 / 3) < 1e-9);
});

test("each evolved effect fires and produces its extra output", () => {
  // Runs an evolved weapon against a line of durable boars and records every
  // bullet, zone and hazard variant that appeared during the fight.
  const run = (id, frames = 900) => {
    const { g } = fresh(() => 0.5);
    const w = maxed(g, id);
    g.passives[BY_ID[BY_ID[id].evolution].requires] = 5;
    assert.equal(g.evolve(id), BY_ID[id].evolution);
    for (let i = 0; i < 6; i++) {
      const e = g.spawn("boar");
      Object.assign(e, { x: g.player.x + 80 + i * 30, y: g.player.y, hp: 1e6 });
    }
    const seen = new Set();
    for (let i = 0; i < frames; i++) {
      g.grid.rebuild(g.enemies);
      g.updateWeapons(1 / 60, 8);
      g.updateBullets(1 / 60);
      g.updateZones(1 / 60);
      g.updateHazards(1 / 60);
      g.time += 1 / 60;
      for (const b of g.bullets) seen.add(`bullet:${b.type}${b.split ? "/split" : ""}${b.mini ? "/mini" : ""}${b.s?.splash ? "/splash" : ""}`);
      for (const z of g.zones) seen.add(`zone:${z.type}${z.ember ? "/ember" : ""}${z.burst ? "/burst" : ""}`);
      for (const h of g.hazards) seen.add(`hazard:${h.type}`);
    }
    return { g, seen, damage: g.runStats.weapons[BY_ID[id].evolution].damage };
  };
  assert.ok(run("acorn").seen.has("bullet:acorn/split"));
  assert.ok(run("tail").seen.has("hazard:gust"));
  assert.ok(run("vine").g.fx.length >= 0 && run("vine").damage > 0);
  assert.ok(run("lightning").seen.has("hazard:strike"));
  assert.ok(run("ice").seen.has("zone:frost"));
  const fire = run("fire").seen;
  assert.ok(fire.has("zone:fire/ember") && fire.has("zone:fire"), "ember patch follows the main fire");
  assert.ok(run("bounce").seen.has("bullet:acorn/split"));
  assert.ok(run("spore").seen.has("zone:spore/burst"));
  assert.ok(run("bee").seen.has("zone:honey"));
  assert.ok(run("turret").seen.has("bullet:acorn/splash"));
  assert.ok(run("boomerang").seen.has("bullet:leaf"));
  assert.ok(run("seed").seen.has("bullet:seed/mini"));
  const stone = run("stone", 200).g;
  assert.ok(stone.fx.some((f) => f.type === "ring" && f.r > 100), "mountain shockwave ring");
  const blessed = run("charm", 10).g;
  const charm = blessed.weapons[0];
  charm.shields = 1;
  blessed.player.invuln = 0;
  blessed.hurt(10);
  assert.equal(blessed.player.guard, 5);
  const hp = blessed.player.hp;
  blessed.player.invuln = 0;
  blessed.hurt(10);
  assert.equal(hp - blessed.player.hp, 7);
});
