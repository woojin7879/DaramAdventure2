import { updateWaves } from "./waves.js";
import { ringHits } from "./chapter-combat.js";
import { yearDifficulty } from "./difficulty.js";
import { hellDifficulty, hellBudget, hellBossYear, hellBossTime, hellEliteInterval } from "./hell.js";
import { chapter, inWater } from "./chapters.js";
import { updateChapterBoss, addPool, addRoot } from "./chapter-combat.js";
import { bodyCenter, stoneOrbit, distanceToSegment } from "./geometry.js";
import { encounterBudget, pickEnemy } from "./encounters.js";
import {
  BY_ID,
  WEAPONS,
  PASSIVES,
  ENEMIES,
  MAX_WEAPONS,
  WORLD,
  xpRequired,
  baseOf,
} from "./data.js";
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// Elite (mini-boss) health multiplier on top of the time-scaled base, tuned per type so
// a typical build needs 20–30 s: foxes have a small base and get the larger factor.
const eliteHealth = (type, progress) => (type === "boar" ? 12 + 3 * progress : 34 + 10 * progress);
// How far past the arena edge knockback may push an enemy. Kept well inside the
// off-screen "absent" threshold so edge fights never lose enemies or kills.
const EDGE_BAND = 120;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const diff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export class SpatialGrid {
  constructor(size = 100) {
    this.size = size;
    this.cells = new Map();
  }
  rebuild(items) {
    this.cells.clear();
    for (const e of items) {
      if (e.hp <= 0) continue;
      const k = `${Math.floor(e.x / this.size)},${Math.floor(e.y / this.size)}`;
      if (!this.cells.has(k)) this.cells.set(k, []);
      this.cells.get(k).push(e);
    }
  }
  near(x, y, r) {
    const out = [];
    for (
      let a = Math.floor((x - r) / this.size);
      a <= Math.floor((x + r) / this.size);
      a++
    )
      for (
        let b = Math.floor((y - r) / this.size);
        b <= Math.floor((y + r) / this.size);
        b++
      ) {
        for (const e of this.cells.get(`${a},${b}`) || [])
          if (e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= r + e.r) out.push(e);
      }
    return out;
  }
}
export class Game {
  constructor({ random = Math.random, onEvent = () => {} } = {}) {
    this.random = random;
    this.onEvent = onEvent;
    this.grid = new SpatialGrid();
    this.state = "title";
    this.view = { w: 1000, h: 650 };
    this.reset(false);
    this.state = "title";
  }
  reset(quick = false, year = 1, mode = "story") {
    if (!Number.isInteger(year) || year < 1 || year > 3)
      throw Error("Invalid year");
    this.year = year;
    this.mode = mode === "hell" ? "hell" : "story";
    this.hellBossIndex = 0;
    this.hellBossKills = [];
    this.environmentClock = 14;
    this.quick = quick;
    this.sandbox = false;
    this.sandboxMortal = false;
    this.sandboxInvincible = false;
    this.seasonDuration = this.mode === "hell" ? 450 : quick ? 75 : 300;
    this.time = 0;
    this.season = 0;
    this.level = 1;
    this.xp = 0;
    this.kills = 0;
    this.id = 0;
    this.player = {
      x: WORLD / 2 - (year === 2 ? 300 : 0),
      y: WORLD / 2 + (year === 3 ? 320 : 0),
      hp: 100,
      maxHp: 100,
      r: 12,
      facing: -1,
      invuln: 0,
      moving: false,
      power: 0,
      guard: 0,
    };
    this.chest = null;
    this.runStats = {
      weapons: {},
      history: [],
      taken: 0,
      blocked: 0,
      healed: 0,
      distance: 0,
      xp: 0,
      specials: { magnet: 0, heal: 0, power: 0 },
      enemies: {},
      since: 0,
    };
    this.enemyShots = [];
    this.waveClock = 0;
    this.waveIndex = 0;
    this.wavePending = null;
    this.waveRestUntil = 0;
    this.bossPressureStage = 0;
    this.contactDamageHistory = [];
    this.weapons = [];
    this.passives = {};
    this.enemies = [];
    this.bullets = [];
    this.zones = [];
    this.fx = [];
    this.drops = [];
    this.bees = [];
    this.turrets = [];
    this.hazards = [];
    this.floaters = [];
    this.choices = [];
    this.spawnClock = 1;
    this.eliteClock = quick ? 60 : 180;
    this.pendingSeason = false;
    this.boss = null;
    this.shake = 0;
    this.state = "playing";
    this.addWeapon("acorn");
  }
  start(quick = false, snapshot = null, year = 1, mode = "story") {
    if (mode === "hell" && snapshot) throw Error("Hell runs cannot resume checkpoints");
    this.reset(mode === "hell" ? false : quick, mode === "hell" ? 1 : year, mode);
    if (snapshot) this.restore(snapshot);
    this.onEvent("start");
  }
  stats(w) {
    const def = BY_ID[w.id], kind = baseOf(w.id);
    const b = def.stats[w.level - 1];
    const s = { ...b, evolved: Boolean(def.evolved) };
    const might =
        1 +
        (this.passives.might || 0) * 0.1 +
        (this.player.power > 0 ? 0.3 : 0),
      area = 1 + (this.passives.area || 0) * 0.1,
      haste = 1 - (this.passives.haste || 0) * 0.06;
    for (const k of ["damage", "tick"]) if (s[k]) s[k] *= might;
    for (const k of ["range", "radius", "width"])
      if (
        s[k] &&
        ["tail", "stone", "vine", "fire", "ice", "spore", "boomerang", "seed"].includes(kind)
      )
        s[k] *= area;
    if (s.cooldown) s.cooldown *= haste;
    if (kind === "bee") s.cooldown = Math.max(0.7, s.cooldown);
    if (kind === "turret") s.cooldown = Math.max(0.45, s.cooldown);
    return s;
  }
  // The equipped entry for a weapon family, whether base or evolved.
  weaponOf(kind) {
    return this.weapons.find((w) => baseOf(w.id) === kind);
  }
  addWeapon(id) {
    if (BY_ID[id]?.evolved) return false;
    const existing = this.weaponOf(id);
    if (existing) {
      if (existing.level >= BY_ID[existing.id].max) return false;
      const old = this.stats(existing);
      existing.level++;
      this.recordGrowth("weapon", id, existing.level);
      if (id === "charm")
        existing.charge *= this.stats(existing).recharge / old.recharge;
      return true;
    }
    if (!BY_ID[id] || this.weapons.length >= MAX_WEAPONS) return false;
    this.recordGrowth("weapon", id, 1);
    this.weapons.push({
      id,
      level: 1,
      timer: 0,
      travel: 0,
      charge: 0,
      shields: id === "charm" ? 1 : 0,
    });
    if (id === "charm")
      this.effect("shieldReady", bodyCenter(this.player), {
        life: 0.7,
        color: "#d6f2b0",
      });
    return true;
  }
  // An evolution is ready when both the base weapon and its paired passive are maxed.
  evolutionReady(w) {
    const def = BY_ID[w.id];
    if (!def || def.evolved || !def.evolution || w.level < def.max) return false;
    const need = PASSIVES.find((p) => p.id === BY_ID[def.evolution].requires);
    return need && (this.passives[need.id] || 0) >= need.max;
  }
  evolve(kind) {
    const w = this.weaponOf(kind);
    if (!w || !this.evolutionReady(w)) return null;
    const evolved = BY_ID[w.id].evolution;
    // The evolution keeps the base weapon's damage record under its new id.
    this.runStats.weapons[evolved] = this.weaponRecord(w.id);
    delete this.runStats.weapons[w.id];
    w.id = evolved;
    w.level = 1;
    w.timer = Math.min(w.timer, 0.2);
    this.recordGrowth("evolve", evolved, 1);
    this.effect("ring", bodyCenter(this.player), { r: 90, color: "#f2c96a", life: 0.6, width: 3 });
    return evolved;
  }
  gainPassive(id) {
    const p = PASSIVES.find((x) => x.id === id);
    if (!p || (this.passives[id] || 0) >= p.max) return false;
    this.passives[id] = (this.passives[id] || 0) + 1;
    this.recordGrowth("passive", id, this.passives[id]);
    if (id === "health") {
      this.player.maxHp += 20;
      this.heal(20);
    }
    return true;
  }
  // Treasure chests apply their reward immediately: an evolution if one is ready,
  // otherwise random growth, otherwise a consolation heal and special acorn effect.
  openChest() {
    const ready = this.weapons.filter((w) => this.evolutionReady(w));
    let contents;
    if (ready.length) {
      const w = ready[Math.floor(this.random() * ready.length)];
      const from = w.id;
      // Candidates feed the roulette in the UI: every owned skill spins past before the evolution lands.
      const candidates = [...this.weapons.map((x) => x.id), ...Object.keys(this.passives).filter((id) => this.passives[id] >= 1)];
      contents = { kind: "evolve", from, id: this.evolve(from), candidates };
    } else {
      // Only skills the player already owns and has not maxed can be rolled.
      const pool = [];
      for (const w of this.weapons)
        if (!BY_ID[w.id].evolved && w.level < BY_ID[w.id].max) pool.push({ kind: "weapon", id: w.id, level: w.level });
      for (const p of PASSIVES) {
        const level = this.passives[p.id] || 0;
        if (level >= 1 && level < p.max) pool.push({ kind: "passive", id: p.id, level });
      }
      if (pool.length) {
        // One random skill gains +1, +2 or +3 levels, capped at its max.
        // Story: 80/17/3 (+1.23 expected). Hell: 65/25/10 (+1.45), since overtime
        // outscales any build and half the elites drop nothing.
        const pick = pool[Math.floor(this.random() * pool.length)];
        const [three, two] = this.mode === "hell" ? [0.1, 0.35] : [0.03, 0.2];
        const roll = this.random(), wanted = roll < three ? 3 : roll < two ? 2 : 1;
        let gained = 0;
        for (let i = 0; i < wanted; i++) {
          const ok = pick.kind === "weapon" ? this.addWeapon(pick.id) : this.gainPassive(pick.id);
          if (!ok) break;
          gained++;
        }
        const level = pick.kind === "weapon" ? this.weaponOf(pick.id).level : this.passives[pick.id];
        contents = { kind: "upgrade", item: { kind: pick.kind, id: pick.id, level, gained, wanted }, candidates: pool.map((c) => c.id) };
      } else {
        this.heal(30);
        const special = ["magnet", "power"][Math.floor(this.random() * 2)];
        if (special === "magnet") for (const x of this.drops) if (x.type === "xp") x.pull = true;
        else this.player.power = 12;
        contents = { kind: "bonus", special };
      }
    }
    this.runStats.chests = (this.runStats.chests || 0) + 1;
    this.chest = contents;
    this.state = "chest";
    this.onEvent("chest", contents);
  }
  closeChest() {
    if (this.state !== "chest") return;
    this.chest = null;
    this.state = "playing";
    this.onEvent("chestClosed");
    this.checkLevel();
    if (this.state === "playing" && this.pendingSeason) this.finishSeason();
  }
  recordGrowth(kind, id, level) {
    this.runStats.history.push({
      kind,
      id,
      level,
      time: this.time,
      playerLevel: this.level,
      season: this.season,
    });
    if (kind === "weapon") this.weaponRecord(id);
  }
  weaponRecord(id) {
    return (this.runStats.weapons[id] ??= {
      damage: 0,
      kills: 0,
      hits: 0,
      acquired: this.time,
    });
  }
  report() {
    return {
      ...structuredClone(this.runStats),
      year: this.year,
      mode: this.mode,
      hellBossKills: structuredClone(this.hellBossKills),
      time: this.time,
      level: this.level,
      kills: this.kills,
      loadout: this.weapons.map((w) => ({ id: w.id, level: w.level })),
      passives: { ...this.passives },
    };
  }
  heal(amount) {
    const actual = Math.min(amount, this.player.maxHp - this.player.hp);
    this.player.hp += actual;
    this.runStats.healed += actual;
  }
  nearest(p, range, exclude = new Set()) {
    let best = null,
      d = range;
    for (const e of this.grid.near(p.x, p.y, range)) {
      const n = dist(p, e);
      if (!exclude.has(e.id) && n < d) {
        d = n;
        best = e;
      }
    }
    return best;
  }
  directionalTarget(range) {
    const p = this.player, move = this.attackDirection;
    if (!p.moving || !move) return this.nearest(p, range);
    let best = null, score = Infinity;
    for (const e of this.grid.near(p.x, p.y, range)) {
      const d = dist(p, e);
      if (d >= range) continue;
      const dot = ((e.x-p.x)*move.x+(e.y-p.y)*move.y)/(d||1);
      const value = d * (dot > 0.4 ? 0.35 : 1);
      if (value < score) { score=value; best=e; }
    }
    return best;
  }
  makeChoices() {
    const pool = [];
    for (const w of WEAPONS) {
      const own = this.weaponOf(w.id);
      if (own && BY_ID[own.id].evolved) continue;
      if (own && own.level < w.max)
        pool.push({ kind: "weapon", id: w.id, level: own.level + 1 });
      else if (!own && this.weapons.length < MAX_WEAPONS)
        pool.push({ kind: "weapon", id: w.id, level: 1 });
    }
    for (const p of PASSIVES)
      if ((this.passives[p.id] || 0) < p.max)
        pool.push({
          kind: "passive",
          id: p.id,
          level: (this.passives[p.id] || 0) + 1,
        });
    const choices = [];
    while (pool.length && choices.length < 3) {
      const i = Math.floor(this.random() * pool.length);
      choices.push(pool.splice(i, 1)[0]);
    }
    return choices.length ? choices : [{ kind: "heal", id: "heal", level: 1 }];
  }
  checkLevel() {
    if (this.state !== "playing" || this.sandbox) return;
    if (this.xp >= xpRequired(this.level)) {
      this.xp -= xpRequired(this.level);
      this.level++;
      this.choices = this.makeChoices();
      this.state = "levelup";
      this.onEvent("levelup");
    }
  }
  choose(i) {
    if (this.state !== "levelup" || !this.choices[i]) return;
    const c = this.choices[i];
    if (c.kind === "weapon") this.addWeapon(c.id);
    else if (c.kind === "passive") this.gainPassive(c.id);
    else {
      this.heal(30);
      this.recordGrowth("heal", "heal", 1);
    }
    this.choices = [];
    this.state = "playing";
    this.onEvent("upgrade");
    this.checkLevel();
    if (this.state === "playing" && this.pendingSeason) this.finishSeason();
  }
  pause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.onEvent("pause");
    }
  }
  resume() {
    if (this.state === "paused") {
      this.state = "playing";
      this.onEvent("resume");
    }
  }
  spawn(type = "snake", elite = false, bossYear = this.year) {
    const base =
      type === "boss"
        ? { ...ENEMIES.boss, hp: chapter(bossYear).bossHp }
        : ENEMIES[type];
    const a = this.random() * Math.PI * 2;
    const radius = Math.hypot(this.view.w, this.view.h) * 0.52 + 60;
    const p = this.player;
    let x = clamp(p.x + Math.cos(a) * radius, 35, WORLD - 35),
      y = clamp(p.y + Math.sin(a) * radius, 35, WORLD - 35);
    // Ordinary spawns stay inside the arena and off screen (genre convention);
    // edge pressure comes from formation waves, which ignore the boundary.
    for (
      let tries = 0;
      tries < 24 &&
      Math.abs(x - p.x) < this.view.w / 2 + 35 &&
      Math.abs(y - p.y) < this.view.h / 2 + 35;
      tries++
    ) {
      const retry = a + tries * 0.63;
      x = clamp(p.x + Math.cos(retry) * radius, 35, WORLD - 35);
      y = clamp(p.y + Math.sin(retry) * radius, 35, WORLD - 35);
    }
    const progress = Math.min(1, this.time / (this.mode === "hell" ? 1200 : this.seasonDuration * 4));
    const tuning = this.mode === "hell" ? hellDifficulty(this.time) : yearDifficulty(this.year, progress);
    const scale = type === "boss" ? 1.65 * tuning.bossHealth : (0.85 + 6.2 * progress ** 1.55) * tuning.health;
    const e = {
      ...base,
      type,
      bossKind: type === "boss" ? chapter(bossYear).bossKind : null,
      bossYear: type === "boss" ? bossYear : null,
      spawnedAt: this.time,
      id: ++this.id,
      x,
      y,
      hp: base.hp * scale * (elite ? eliteHealth(type, progress) : 1),
      maxHp: base.hp * scale * (elite ? eliteHealth(type, progress) : 1),
      elite,
      slow: 0,
      slowTime: 0,
      root: 0,
      hit: 0,
      burn: 0,
      burnTick: 0.5,
      propagates: false,
      zoneTicks: {},
      bossClock: 3,
      attack: null,
      heading: Math.atan2(p.y - y, p.x - x),
      age: 0,
      skillClock: 2 + this.random() * 3,
      speed: base.speed * (type === "boss" ? 1 : (1 + progress * 0.35) * (tuning.speed || 1)),
      damage: base.damage * (1 + progress * 0.55),
    };
    if (elite) {
      // Elites are mini-bosses: bulky, hard-hitting, and resistant to crowd control,
      // so the treasure chest they carry is earned over a 20–30 second fight.
      e.r *= 1.35;
      e.damage *= 1.8;
      // Hell mode spawns elites every 55 s; only every other one carries a chest.
      this.eliteSpawns = (this.eliteSpawns || 0) + 1;
      e.chest = this.mode !== "hell" || this.eliteSpawns % 2 === 1;
    }
    this.enemies.push(e);
    if (type === "boss") this.boss = e;
    return e;
  }
  damage(e, n, color = "#f7e8b1", knock = 0, source = null) {
    if (e.hp <= 0 || !Number.isFinite(n) || n <= 0) return;
    const actual = Math.min(e.hp, n);
    // Sources are base family ids; credit the equipped entry (which may be evolved).
    const record = source ? this.weaponRecord(this.weaponOf(source)?.id ?? source) : null;
    if (record) {
      record.damage += actual;
      record.hits++;
    }
    e.hp = Math.max(0, e.hp - n);
    e.hit = 0.1;
    if (this.floaters.length < 55)
      this.floaters.push({
        x: e.x,
        y: e.y - e.r,
        value: Math.ceil(n),
        color,
        life: 0.6,
      });
    if (knock && e.type !== "boss") {
      const a = angle(this.player, e), push = e.elite ? knock * 0.25 : knock;
      // Knockback may cross the arena edge, but never far enough to make the
      // enemy count as absent or drop rewards out of reach.
      e.x = clamp(e.x + Math.cos(a) * push, -EDGE_BAND, WORLD + EDGE_BAND);
      e.y = clamp(e.y + Math.sin(a) * push, -EDGE_BAND, WORLD + EDGE_BAND);
    }
    if (e.hp <= 0) {
      this.kills++;
      if (record) record.kills++;
      this.runStats.enemies[e.type] = (this.runStats.enemies[e.type] || 0) + 1;
      this.effect("burst", e, { color, life: 0.3, r: e.r + 6 });
      if (e.type === "boss" || this.sandbox) return;
      // Rewards from enemies killed outside the arena land where the player can reach them.
      const dropX = clamp(e.x, 40, WORLD - 40),
        dropY = clamp(e.y, 40, WORLD - 40);
      this.drops.push({
        x: dropX,
        y: dropY,
        value: e.xp * (e.elite ? 8 : 1),
        type: "xp",
        pull: false,
      });
      if (e.elite || this.random() < 0.016) {
        this.drops.push({
          x: clamp(dropX + 10, 40, WORLD - 40),
          y: dropY,
          type: ["magnet", "heal", "power"][Math.floor(this.random() * 3)],
          value: 8,
          pull: false,
        });
      }
      // Elites always leave a treasure chest; it must be walked over, magnets ignore it.
      if (e.elite && e.chest !== false)
        this.drops.push({ x: clamp(dropX - 14, 40, WORLD - 40), y: dropY, type: "chest", value: 0, pull: false });
      if (e.burn > 0 && e.propagates) {
        const next = this.nearest(e, 60, new Set([e.id]));
        if (next) {
          next.burn = 2;
          next.burnTick = 0.5;
          next.propagates = false;
        }
      }
    }
  }
  hurt(n, contactEnemy = null) {
    const p = this.player;
    if (p.invuln > 0 || this.state !== "playing" || (this.sandbox && this.sandboxInvincible)) return;
    if (contactEnemy && (contactEnemy.nextContactAt || 0) > this.time) return;
    n *= this.mode === "hell" ? hellDifficulty(this.time).damage : yearDifficulty(this.year, this.time / (this.seasonDuration * 4)).damage;
    if (contactEnemy) {
      this.contactDamageHistory = this.contactDamageHistory.filter(hit => this.time - hit.time < 0.5);
      const spent = this.contactDamageHistory.reduce((sum, hit) => sum + hit.damage, 0);
      n = Math.min(n, Math.max(0, 50 - spent));
      if (n <= 0) return;
    }
    const charm = this.weaponOf("charm");
    if (charm?.shields > 0) {
      charm.shields--;
      this.runStats.blocked++;
      const cs = this.stats(charm);
      p.invuln = cs.invuln;
      // 고목의 가호: losing the last shield grants a short damage-reduction window.
      if (cs.evolved && charm.shields === 0) p.guard = 5;
      if (contactEnemy) contactEnemy.nextContactAt = this.time + 0.6;
      this.effect("ward", bodyCenter(p), {
        color: "#dfcd97",
        r: 48,
        life: 0.45,
      });
      this.onEvent("block");
      return;
    }
    if (contactEnemy) {
      contactEnemy.nextContactAt = this.time + 0.6;
      this.contactDamageHistory.push({time:this.time,damage:n});
    }
    if (p.guard > 0) n *= 0.7;
    this.runStats.taken += Math.min(p.hp, n);
    p.hp = Math.max(this.sandbox && !this.sandboxMortal ? 1 : 0, p.hp - n);
    p.invuln = contactEnemy ? 0.15 : 0.85;
    this.shake = 7;
    this.onEvent("hurt");
    if (p.hp === 0) {
      this.shake = 0;
      p.moving = false;
      this.state = "dead";
      this.onEvent("dead");
    }
  }
  effect(type, p, opts = {}) {
    if (this.fx.length < 180)
      this.fx.push({
        type,
        x: p.x,
        y: p.y,
        life: 0.3,
        total: opts.life || 0.3,
        ...opts,
      });
  }
  slow(e, amount, duration) {
    e.slow = Math.max(
      e.slow,
      e.type === "boss" ? Math.min(0.15, amount) : e.elite ? Math.min(0.3, amount) : amount,
    );
    e.slowTime = Math.max(e.slowTime, duration);
  }
  addZone(type, p, s) {
    const z = {
      id: ++this.id,
      type,
      x: p.x,
      y: p.y,
      r: s.radius,
      life: s.duration,
      tick: s.tick,
      burn: s.burn,
      slow: s.slow,
      ember: s.ember,
      burst: s.burst,
    };
    this.zones.push(z);
    const cap = type === "spore" ? s.cap : 24;
    const same = this.zones.filter((x) => x.type === type);
    if (same.length > cap) this.zones.splice(this.zones.indexOf(same[0]), 1);
  }
  shoot(type, p, target, s, aOffset = 0, source = type) {
    if (!target || this.bullets.length >= 240) return;
    const a = angle(p, target) + aOffset;
    this.bullets.push({
      id: ++this.id,
      type,
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * (type === "fire" ? 280 : type === "bounce" ? 360 : 420),
      vy: Math.sin(a) * (type === "fire" ? 280 : type === "bounce" ? 360 : 420),
      life: type === "bounce" ? 4 : s.range / (type === "fire" ? 280 : 420),
      r: type === "fire" || type === "bounce" ? 7 : 4,
      trail: [],
      s: { ...s },
      source,
      seen: new Set(),
      remaining: s.pierce || s.hits || 1,
      last: null,
    });
  }
  fireWeapon(w, s) {
    // Evolutions reuse their base family's firing logic; `s.evolved` adds the extra effect.
    const kind = baseOf(w.id), p = this.player,
      t = ["acorn", "vine", "boomerang"].includes(kind) ? this.directionalTarget(s.range || 450) : this.nearest(p, s.range || 450);
    if (["stone", "charm", "spore", "bee"].includes(kind)) return;
    if (kind === "turret") {
      this.turrets = this.turrets.filter((t) => t.life > 0);
      if (this.turrets.length >= s.count) {
        w.timer = 0.5;
        return;
      }
      this.turrets.push({
        id: ++this.id,
        x: p.x,
        y: p.y,
        life: s.duration,
        totalLife: s.duration,
        timer: 0.15,
      });
      while (this.turrets.length > s.count) this.turrets.shift();
      w.timer = s.interval;
      return;
    }
    if (!t && !["ice", "seed"].includes(kind)) return;
    w.timer = s.cooldown;
    if (kind === "seed") {
      const origin = bodyCenter(p);
      const direction = s.alternate && w.seedDirection === 1 ? -1 : 1;
      w.seedDirection = direction;
      for (let i = 0; i < s.count && this.bullets.length < 240; i++) {
        this.bullets.push({
          id: ++this.id, type: "seed", source: "seed", ...origin,
          origin: { ...origin }, phase: i * Math.PI * 2 / s.count,
          direction, age: 0, life: s.duration, r: s.radius,
          trail: [], seen: new Set(), s: { ...s },
        });
      }
      return;
    }
    if (kind === "boomerang") {
      const origin=bodyCenter(p);
      for(let i=0;i<s.count&&this.bullets.length<240;i++) {
        const other=i ? this.nearest(origin,s.range,new Set([t.id])) || t : t;
        const direction=angle(origin,other);
        this.bullets.push({id:++this.id,type:"boomerang",source:"boomerang",x:origin.x,y:origin.y,
          vx:Math.cos(direction)*s.speed,vy:Math.sin(direction)*s.speed,life:5,r:s.radius,
          travel:0,returning:false,age:0,trail:[],seen:new Set(),s:{...s}});
      }
    }
    if (kind === "acorn") {
      for (let i = 0; i < s.count; i++)
        this.shoot("acorn", p, t, s, 0);
    }
    if (kind === "bounce" || kind === "fire") {
      const excluded = new Set();
      for (let i = 0; i < s.count; i++) {
        const target = this.nearest(p, s.range, excluded) || t;
        excluded.add(target.id);
        this.shoot(kind, p, target, s);
      }
    }
    if (kind === "tail") {
      const a = angle(p, t);
      const hit = new Set();
      const swipe = (dir) => {
        for (const e of this.grid.near(p.x, p.y, s.range)) {
          if (
            Math.abs(diff(angle(p, e) - dir)) <= (s.angle * Math.PI) / 360 &&
            !hit.has(e.id)
          ) {
            hit.add(e.id);
            this.damage(e, s.damage, "#efd0a2", s.knockback, "tail");
          }
        }
        this.effect("arc", p, {
          angle: dir,
          arc: (s.angle * Math.PI) / 180,
          r: s.range,
          color: "#e8cf9d",
          life: 0.23,
        });
      };
      swipe(a);
      if (s.double) {
        this.hazards.push({
          type: "tail",
          x: p.x,
          y: p.y,
          delay: 0.15,
          run: () => swipe(a + Math.PI),
        });
      }
      // 폭풍 꼬리: a wind wave rolls outward after the swipe, pushing everything back.
      if (s.evolved)
        this.hazards.push({
          type: "gust", x: p.x, y: p.y, delay: 0.2, age: 0, seen: new Set(),
          s: { damage: s.damage * 0.5, range: s.range * 2.4, slow: 0, duration: 0, knockback: 70, source: "tail", color: "#f2dca2", grow: 0.35 },
        });
    }
    if (kind === "vine") {
      const a = angle(p, t);
      const visited = new Set();
      for (const dir of s.double ? [a, a + Math.PI / 2] : [a]) {
        for (const e of this.grid.near(p.x, p.y, s.range + 25)) {
          const dx = e.x - p.x,
            dy = e.y - p.y,
            along = dx * Math.cos(dir) + dy * Math.sin(dir),
            across = Math.abs(-dx * Math.sin(dir) + dy * Math.cos(dir));
          if (
            along > 0 &&
            along < s.range &&
            across < s.width / 2 + e.r &&
            !visited.has(e.id)
          ) {
            visited.add(e.id);
            this.damage(e, s.damage, "#bce98b", 0, "vine");
            if (s.root && along > s.range - 50) {
              if (e.type === "boss") this.slow(e, 0.15, 0.6);
              else e.root = 0.6;
            }
          }
        }
        this.effect("whip", p, {
          x2: p.x + Math.cos(dir) * s.range,
          y2: p.y + Math.sin(dir) * s.range,
          color: "#addf73",
          width: s.width * 0.3,
          life: 0.34,
        });
        // 고목의 손길: roots burst sideways from the whip tip and hold enemies there.
        if (s.evolved) {
          const tip = { x: p.x + Math.cos(dir) * s.range, y: p.y + Math.sin(dir) * s.range };
          for (const e of this.grid.near(tip.x, tip.y, 70)) {
            if (visited.has(e.id) || dist(tip, e) > 70 + e.r) continue;
            visited.add(e.id);
            this.damage(e, s.damage * 0.6, "#bce98b", 0, "vine");
            if (e.type === "boss") this.slow(e, 0.15, 0.5);
            else e.root = Math.max(e.root, 0.45);
          }
          this.effect("ring", tip, { r: 70, color: "#9fcf6a", life: 0.3, width: 3 });
        }
      }
    }
    if (kind === "lightning") {
      const seen = new Set();
      let last = t;
      const chain = (source, remaining) => {
        let prev = source;
        for (let i = 0; i < remaining; i++) {
          const next = this.nearest(prev, s.chain, seen);
          if (!next) break;
          seen.add(next.id);
          this.damage(next, s.damage, "#eee49f", 0, "lightning");
          this.effect("bolt", prev, {
            x2: next.x,
            y2: next.y,
            color: "#eee8a4",
            life: 0.25,
          });
          prev = next;
        }
        last = prev;
      };
      seen.add(t.id);
      this.damage(t, s.damage, "#fff3b2", 0, "lightning");
      this.effect(
        "bolt",
        { x: t.x - 20, y: t.y - 190 },
        { x2: t.x, y2: t.y, color: "#fff3b2", life: 0.25 },
      );
      if (s.branch) {
        chain(t, 3);
        chain(t, s.count - seen.size);
      } else chain(t, s.count - 1);
      // 뇌우의 가지: a delayed heavy strike lands where the chain ended.
      if (s.evolved)
        this.hazards.push({ type: "strike", x: last.x, y: last.y, delay: 0.5, r: 75, damage: s.damage * 1.3 });
      this.onEvent("lightning");
    }
    if (kind === "ice") {
      const center = bodyCenter(p);
      this.hazards.push({
        type: "ice",
        x: center.x,
        y: center.y,
        delay: 0,
        age: 0,
        s: { ...s },
        seen: new Set(),
      });
      if (s.double)
        this.hazards.push({
          type: "ice",
          x: center.x,
          y: center.y,
          delay: 0.45,
          age: 0,
          s: { ...s },
          seen: new Set(),
        });
      // 겨울잠의 결계: a frost field lingers after the last ring has passed.
      if (s.evolved)
        this.hazards.push({
          type: "frost", x: center.x, y: center.y, delay: s.double ? 1.05 : 0.6,
          run: () => this.addZone("frost", center, { radius: s.range * 0.9, duration: 2.2, tick: 0, slow: 0.4 }),
        });
    }
  }
  updateWeapons(dt, moved) {
    const p = this.player;
    for (const w of this.weapons) {
      const s = this.stats(w), kind = baseOf(w.id);
      w.timer -= dt;
      if (kind === "charm") {
        if (w.shields < s.count) {
          w.charge += dt;
          if (w.charge >= s.recharge) {
            w.charge -= s.recharge;
            w.shields++;
            this.effect("shieldReady", bodyCenter(p), {
              life: 0.7,
              color: "#d6f2b0",
            });
          }
        } else w.charge = 0;
        continue;
      }
      if (kind === "stone") {
        for (let i = 0; i < s.count; i++) {
          const q = stoneOrbit(this, s, i);
          for (const e of this.grid.near(q.x, q.y, 10)) {
            if ((e.zoneTicks.stone || 0) <= this.time) {
              this.damage(e, s.damage, "#d4ddc4", 0, "stone");
              e.zoneTicks.stone = this.time + 0.5;
            }
          }
        }
        // 산의 수호: a shockwave bursts between the orbits every 3 seconds.
        if (s.evolved) {
          w.charge += dt;
          if (w.charge >= 3) {
            w.charge -= 3;
            const center = bodyCenter(p), reach = s.range * 1.7 + 20;
            for (const e of this.grid.near(center.x, center.y, reach))
              if (dist(center, e) <= reach + e.r) this.damage(e, s.damage * 1.5, "#e8e2c8", 30, "stone");
            this.effect("ring", center, { r: reach, color: "#e8e2c8", life: 0.35, width: 3 });
          }
        }
        continue;
      }
      if (kind === "spore") {
        w.travel += moved;
        while (w.travel >= s.distance) {
          w.travel -= s.distance;
          this.addZone("spore", p, s);
        }
        continue;
      }
      if (kind === "bee") {
        this.updateBees(w, s, dt);
        continue;
      }
      if (w.timer <= 0) this.fireWeapon(w, s);
    }
    const tw = this.weaponOf("turret");
    if (tw) {
      const s = this.stats(tw);
      for (const t of this.turrets) {
        t.flash = Math.max(0, (t.flash || 0) - dt);
        t.life -= dt;
        if (t.life <= 0) continue;
        t.timer -= dt;
        if (t.timer <= 0) {
          const muzzle = { x: t.x, y: t.y - 24 };
          const target = this.nearest(muzzle, s.range);
          t.tracking = Boolean(target);
          if (target) {
            // 풍년 창고: every third volley is a heavy acorn with a small splash.
            t.volley = (t.volley || 0) + 1;
            const splash = s.evolved && t.volley % 3 === 0;
            this.shoot(
              "acorn",
              muzzle,
              target,
              { ...s, pierce: 1, range: s.range + 32, splash, damage: splash ? s.damage * 1.4 : s.damage },
              0,
              "turret",
            );
            if (s.shots === 2)
              this.shoot(
                "acorn",
                muzzle,
                this.nearest(muzzle, s.range, new Set([target.id])) || target,
                { ...s, pierce: 1, range: s.range + 32 },
                0.06,
                "turret",
              );
            t.flash = 0.16;
            t.aim = angle(muzzle, target);
            t.timer = s.cooldown;
          }
        }
      }
      this.turrets = this.turrets.filter((t) => t.life > 0);
    }
  }
  updateBees(w, s, dt) {
    while (this.bees.length < s.count)
      this.bees.push({
        x: this.player.x,
        y: this.player.y,
        state: "wait",
        wait: 0.4 + this.bees.length * 0.2,
        age: 0,
        target: null,
        seen: new Set(),
      });
    for (const [i, b] of this.bees.entries()) {
      b.recovery = Math.max(0, (b.recovery || 0) - dt);
      if (b.state === "wait") {
        b.x = this.player.x + Math.cos(this.time * 2 + i * 2) * 24;
        b.y = this.player.y - 15 + Math.sin(this.time * 2 + i * 2) * 15;
        b.wait -= dt;
        if (b.wait <= 0) {
          const assigned = new Set(
            this.bees
              .filter((x) => x.state === "attack" && x.target)
              .map((x) => x.target.id),
          );
          const t =
            this.nearest(this.player, s.range, assigned) ||
            this.nearest(this.player, s.range);
          if (t) {
            b.target = t;
            b.state = "attack";
            b.recovery = s.cooldown;
            b.age = 0;
            b.seen = new Set();
          }
        }
        continue;
      }
      b.age += dt;
      if (b.state === "attack" && (b.age > 2 || dist(b, this.player) > 500)) {
        b.state = "return";
        b.age = 0;
      }
      if (b.state === "attack" && b.target?.hp <= 0) {
        b.target = this.nearest(b, 120, b.seen);
        if (!b.target) {
          b.state = "return";
          b.age = 0;
        }
      }
      const target = b.state === "return" ? this.player : b.target;
      if (!target) continue;
      const d = dist(b, target),
        a = angle(b, target);
      if (d < 12 + s.speed * dt) {
        if (b.state === "return") {
          b.state = "wait";
          b.wait = Math.max(0.15, b.recovery || 0);
        } else {
          b.seen.add(target.id);
          this.damage(target, s.damage, "#ebd47e", 0, "bee");
          const next =
            s.double && b.seen.size < 2 ? this.nearest(b, 120, b.seen) : null;
          if (next) b.target = next;
          else {
            b.state = "return";
            b.age = 0;
          }
        }
      } else {
        b.x += Math.cos(a) * s.speed * dt;
        b.y += Math.sin(a) * s.speed * dt;
        // 여왕벌의 행진: returning bees drip slowing honey along their path.
        if (s.evolved && b.state === "return") {
          b.honey = (b.honey || 0) - dt;
          if (b.honey <= 0) {
            b.honey = 0.16;
            this.addZone("honey", b, { radius: 20, duration: 1.4, tick: 0, slow: 0.3 });
          }
        }
      }
      if (b.state === "return" && b.age > 2) {
        b.x = this.player.x;
        b.y = this.player.y;
        b.state = "wait";
        b.wait = Math.max(0.15, b.recovery || 0);
      }
    }
  }
  updateSeed(b, dt) {
    const before = { x: b.x, y: b.y };
    b.age = Math.min(b.s.duration, b.age + dt);
    b.life -= dt;
    const radius = b.s.range * b.age / b.s.duration;
    const theta = b.phase + b.direction * b.age * b.s.spin;
    b.x = b.origin.x + Math.cos(theta) * radius;
    b.y = b.origin.y + Math.sin(theta) * radius;
    const reach = dist(before, b) / 2 + b.r;
    for (const e of this.grid.near((before.x + b.x) / 2, (before.y + b.y) / 2, reach)) {
      if (b.seen.has(e.id) || distanceToSegment(e, before, b) > e.r + b.r) continue;
      b.seen.add(e.id);
      this.damage(e, b.s.damage, "#d9e9b6", 0, "seed");
      this.slow(e, b.s.slow, b.s.slowDuration);
    }
    // 만개한 씨앗: a finished seed scatters three small seeds from where it landed.
    if (b.life <= 0 && b.s.evolved && !b.mini) {
      const mini = { ...b.s, evolved: false, damage: b.s.damage * 0.5, range: b.s.range * 0.35, duration: 0.7, radius: 6 };
      for (let i = 0; i < 3 && this.bullets.length < 240; i++)
        this.bullets.push({
          id: ++this.id, type: "seed", source: "seed", x: b.x, y: b.y, mini: true,
          origin: { x: b.x, y: b.y }, phase: i * Math.PI * 2 / 3, direction: -b.direction,
          age: 0, life: mini.duration, r: mini.radius, trail: [], seen: new Set(), s: mini,
        });
      this.effect("ring", b, { r: 26, color: "#dfe9a6", life: 0.25 });
    }
  }
  updateBoomerang(b,dt) {
    const before={x:b.x,y:b.y},home=bodyCenter(this.player);
    b.age+=dt;b.life-=dt;
    if(b.returning) {
      const direction=angle(b,home),speed=b.s.speed*1.35;
      const step=Math.min(dist(b,home),speed*dt);
      b.x+=Math.cos(direction)*step;b.y+=Math.sin(direction)*step;
    } else {
      const step=Math.min(b.s.range-b.travel,b.s.speed*dt);
      b.x+=b.vx/b.s.speed*step;b.y+=b.vy/b.s.speed*step;b.travel+=step;
    }
    const reach=dist(before,b)/2+b.r;
    for(const e of this.grid.near((before.x+b.x)/2,(before.y+b.y)/2,reach)) {
      if(b.seen.has(e.id)||distanceToSegment(e,before,b)>e.r+b.r)continue;
      b.seen.add(e.id);
      this.damage(e,b.s.damage*(b.returning?b.s.returnPower:1),"#edc58b",0,"boomerang");
    }
    if(b.returning&&dist(b,home)<8) {
      b.life=0;
      // 숲바람 부메랑: the catch releases three piercing leaf blades along the flight line.
      if(b.s.evolved) {
        const a=angle(before,home);
        for(const offset of [-0.32,0,0.32]) {
          if(this.bullets.length>=240)break;
          this.bullets.push({id:++this.id,type:"leaf",source:"boomerang",x:home.x,y:home.y,
            vx:Math.cos(a+offset)*430,vy:Math.sin(a+offset)*430,life:0.55,r:5,trail:[],
            s:{damage:b.s.damage*0.6,pierce:3},seen:new Set(),remaining:3,last:null});
        }
        this.effect("ring",home,{r:30,color:"#bfe08a",life:0.2});
      }
    }
    if(!b.returning&&b.travel>=b.s.range) {b.returning=true;b.seen.clear();}
  }
  updateBullets(dt) {
    for (const b of this.bullets) {
      if (b.life <= 0) continue;
      if (b.trail) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 9) b.trail.shift();
      }
      if (b.type === "seed") { this.updateSeed(b, dt); continue; }
      if(b.type === "boomerang") { this.updateBoomerang(b,dt); continue; }
      const ox = b.x,
        oy = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let hits = this.grid
        .near(b.x, b.y, 25)
        .filter((e) => !b.seen.has(e.id) && dist(b, e) < e.r + b.r)
        .sort((a, c) => dist({ x: ox, y: oy }, a) - dist({ x: ox, y: oy }, c));
      for (const e of hits) {
        b.seen.add(e.id);
        this.damage(
          e,
          b.s.damage,
          b.type === "fire" ? "#ffb575" : "#f0d1a0",
          0,
          b.source || b.type,
        );
        b.last = { x: e.x, y: e.y };
        if (b.type === "fire") {
          this.addZone("fire", b, b.s);
          b.life = -1;
          break;
        }
        // 풍년 창고: heavy storehouse acorns splash nearby enemies on impact.
        if (b.s.splash) {
          for (const o of this.grid.near(e.x, e.y, 42))
            if (o !== e && dist(o, e) <= 42 + o.r) this.damage(o, b.s.damage * 0.6, "#f0d1a0", 0, b.source || b.type);
          this.effect("ring", e, { r: 42, color: "#e9c98a", life: 0.22 });
        }
        b.remaining--;
        if (b.type === "bounce")
          this.effect("ricochet", e, { color: "#9af3e5", r: 28, life: 0.25 });
        if (b.type === "bounce" && b.remaining > 0) {
          const next = this.nearest(e, 180, b.seen);
          if (next) {
            const a = angle(e, next);
            b.vx = Math.cos(a) * 360;
            b.vy = Math.sin(a) * 360;
            break;
          }
          b.remaining = 0;
        }
        if (b.remaining <= 0) {
          b.life = -1;
          break;
        }
      }
      if (b.life <= 0) {
        if (b.type === "fire" && !b.last) this.addZone("fire", b, b.s);
        if (b.type === "bounce" && b.s.explode && b.last) {
          for (const e of this.grid.near(b.last.x, b.last.y, 48))
            this.damage(
              e,
              18 * (1 + (this.passives.might || 0) * 0.1),
              "#e9bd77",
              0,
              "bounce",
            );
          this.effect("ring", b.last, { r: 48, color: "#e9bd77", life: 0.3 });
          // 황금 도토리 당구: the blast throws four golden shards outward.
          if (b.s.evolved)
            for (let i = 0; i < 4; i++)
              this.fragment(b.last, Math.PI / 4 + i * Math.PI / 2, { damage: b.s.damage * 0.4, source: "bounce", life: 0.4, r: 4, skip: b.seen });
        }
        // 풍년의 새총: an acorn that spent its pierce splits into three small acorns.
        if (b.type === "acorn" && b.source === "acorn" && b.s.evolved && !b.split && b.last && b.remaining <= 0) {
          const a = Math.atan2(b.vy, b.vx);
          for (const offset of [-0.45, 0, 0.45])
            this.fragment(b.last, a + offset, { damage: b.s.damage * 0.5, source: "acorn", life: 0.45, r: 3, skip: b.seen });
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }
  // A short-lived straight shard used by evolved effects; never splits again.
  fragment(p, a, { damage, source, life, r, skip = new Set() }) {
    if (this.bullets.length >= 240) return;
    this.bullets.push({
      id: ++this.id, type: "acorn", source, x: p.x, y: p.y, split: true,
      vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, life, r, trail: [],
      s: { damage, pierce: 1 }, seen: new Set(skip), remaining: 1, last: null,
    });
  }
  updateZones(dt) {
    const exposures = new Map();
    for (const z of this.zones) {
      z.life -= dt;
      if (z.life <= 0) continue;
      for (const e of this.grid.near(z.x, z.y, z.r)) {
        const key = e.id + ":" + z.type;
        const previous = exposures.get(key);
        if (!previous || z.tick > previous.z.tick) exposures.set(key, { e, z });
        if (z.burn) {
          e.burn = 2;
          e.propagates = true;
        }
        if (z.slow) this.slow(e, z.slow, 1);
      }
    }
    for (const { e, z } of exposures.values()) {
      if (z.tick > 0 && (e.zoneTicks[z.type] || 0) <= this.time) {
        this.damage(
          e,
          z.tick,
          z.type === "fire" ? "#edac74" : "#d6abe6",
          0,
          z.type,
        );
        e.zoneTicks[z.type] = this.time + 0.5;
      }
    }
    for (const z of this.zones) {
      if (z.life > 0) continue;
      // 잿불 숲: a burnt-out fire leaves a small ember patch behind.
      if (z.type === "fire" && z.ember)
        this.addZone("fire", z, { radius: z.r * 0.55, duration: 1.6, tick: z.tick * 0.5, burn: false });
      // 숲의 숨결: a fading spore cloud bursts once, hurting and slowing everything around it.
      if (z.type === "spore" && z.burst) {
        const reach = z.r * 1.4;
        for (const e of this.grid.near(z.x, z.y, reach)) {
          if (dist(z, e) > reach + e.r) continue;
          this.damage(e, z.tick * 2, "#d6abe6", 0, "spore");
          this.slow(e, 0.3, 1.2);
        }
        this.effect("ring", z, { r: reach, color: "#cfa6e0", life: 0.3, width: 3 });
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }
  updateHazards(dt) {
    for (const h of this.hazards) {
      h.delay -= dt;
      if (h.delay > 0) continue;
      if (h.type === "tail" || h.type === "frost") {
        h.run();
        h.dead = true;
        continue;
      }
      // 뇌우의 가지: delayed heavy strike.
      if (h.type === "strike") {
        for (const e of this.grid.near(h.x, h.y, h.r))
          if (dist(h, e) <= h.r + e.r) this.damage(e, h.damage, "#fff3b2", 0, "lightning");
        this.effect("bolt", { x: h.x + 14, y: h.y - 220 }, { x2: h.x, y2: h.y, color: "#fff7c8", life: 0.3, width: 3 });
        this.effect("ring", h, { r: h.r, color: "#f4ea9c", life: 0.35, width: 3 });
        h.dead = true;
        continue;
      }
      // 폭풍 꼬리: an expanding wind ring that knocks enemies away once.
      if (h.type === "gust") {
        h.age += dt;
        const r = h.s.range * Math.min(1, h.age / h.s.grow);
        for (const e of this.grid.near(h.x, h.y, r + 12)) {
          if (!h.seen.has(e.id) && Math.abs(dist(h, e) - r) < e.r + 20) {
            h.seen.add(e.id);
            this.damage(e, h.s.damage, h.s.color, h.s.knockback, h.s.source);
          }
        }
        if (h.age >= h.s.grow) h.dead = true;
      }
      if (h.type === "ice") {
        h.age += dt;
        const r = h.s.range * Math.min(1, h.age / 0.6);
        for (const e of this.grid.near(h.x, h.y, r + 10)) {
          if (!h.seen.has(e.id) && Math.abs(dist(h, e) - r) < e.r + 18) {
            h.seen.add(e.id);
            this.damage(e, h.s.damage, "#c2e9f1", 0, "ice");
            this.slow(e, h.s.slow, h.s.duration);
          }
        }
        if (h.age >= 0.6) h.dead = true;
      }
      if (h.type === "pool" || h.type === "rootline") {
        h.age += dt;
        const hit =
          h.type === "pool"
            ? dist(h, this.player) < h.r + this.player.r
            : distanceToSegment(this.player, h, { x: h.x2, y: h.y2 }) <
              h.width + this.player.r;
        if (hit) this.hurt(h.damage);
        if (h.age >= h.duration) h.dead = true;
      }
      if (h.type === 'bossring') {
        h.age += dt;
        h.r = h.startRadius + h.speed * h.age;
        if (ringHits(h,this.player)) this.hurt(h.damage);
        if (h.age >= h.duration) h.dead=true;
      }
      if (h.type === "shock") {
        h.age += dt;
        const r = h.age * 210;
        if (Math.abs(dist(h, this.player) - r) < 25) this.hurt(22);
        if (r > h.range) h.dead = true;
      }
    }
    this.hazards = this.hazards.filter((h) => !h.dead);
  }
  updateEnemy(e, dt) {
    if (e.trainingDummy) return;
    e.age += dt;
    if (e.waveLife != null) {
      e.waveLife -= dt;
      if (e.waveLife <= 0) { e.escaped = true; return; }
    }
    const offscreen =
      Math.abs(e.x - this.player.x) > this.view.w / 2 + 200 ||
      Math.abs(e.y - this.player.y) > this.view.h / 2 + 200;
    e.absent = offscreen ? (e.absent || 0) + dt : 0;
    if (e.absent > 35 && e.type !== "boss") {
      e.escaped = true;
      return;
    }
    e.skillClock -= dt;
    if (e.root > 0) return;
    const p = this.player,
      distance = dist(e, p);
    let direction = angle(e, p),
      speed = e.speed * (1 - e.slow);
    if (e.type === "bat") {
      // A fixed flight line: moving aside works; the flock never homes back in.
      direction = e.heading;
      speed = (e.waveFlightSpeed || e.speed * 2.5) * (1 - e.slow);
      if (e.age > 12)
        e.escaped = true;
    } else if (e.attack) {
      const attack = e.attack;
      attack.time -= dt;
      if (attack.time <= 0) {
        if (!attack.running && attack.type === "charge") {
          attack.running = true;
          attack.time = e.type === "boar" ? 0.85 : 0.5;
        } else {
          if (attack.type === "spit") {
            for (const offset of this.season >= 2 ? [-0.23, 0, 0.23] : [0]) {
              if (
                this.enemyShots.length >=
                this.encounter()
                  .shotCap
              )
                break;
              this.enemyShots.push({
                x: e.x,
                y: e.y - 8,
                vx: Math.cos(attack.angle + offset) * 150,
                vy: Math.sin(attack.angle + offset) * 150,
                r: 7,
                life: 3.5,
                damage: e.damage,
              });
            }
          }
          e.attack = null;
          e.skillClock =
            e.type === "fox"
              ? 4.5
              : e.type === "boar"
                ? 5.5
                : this.season === 0
                  ? 6
                  : 4.5;
          return;
        }
      }
      if (!attack.running) return;
      direction = attack.angle;
      speed = (e.type === "boar" ? 260 : 300) * (1 - e.slow);
    } else if (
      (e.type === "fox" || e.type === "boar") &&
      distance < 360 &&
      e.skillClock <= 0
    ) {
      e.attack = {
        type: "charge",
        angle: direction,
        time: e.type === "boar" ? 1.1 : 0.8,
        running: false,
      };
      return;
    } else if (e.type === "mushroom" && e.age < 40) {
      if (distance < 380 && e.skillClock <= 0) {
        e.attack = {
          type: "spit",
          angle: direction,
          time: 0.9,
          running: false,
        };
        return;
      }
      if (distance < 160) direction += Math.PI;
      else if (distance < 260) speed = 0;
    } else if (e.type === "snake" && !e.formationCenter) {
      direction += Math.sin(e.age * 3.5 + e.id) * 0.65;
    }
    if (e.formationCenter && e.type !== "mushroom") {
      if (dist(e, e.formationCenter) < 40) e.formationCenter = null;
      else direction = angle(e, e.formationCenter);
    }
    // Sentries hold their post until the siege stance ends, then join the chase.
    if (e.waveSentry && e.age >= 40) e.waveSentry = false;
    if (e.waveSentry) speed = 0;
    if (e.type === "mushroom" && e.age >= 40) speed *= 1.6;
    e.heading = direction;
    e.x += Math.cos(direction) * speed * dt;
    e.y += Math.sin(direction) * speed * dt;
    // Formation members close in from beyond the boundary so edges are not free
    // exits; once inside they are ordinary enemies and stay inside like everyone else.
    const crossesEdge = e.type === "bat" || (e.formationCenter && e.type !== "mushroom");
    if (!crossesEdge) {
      e.x = clamp(e.x, 25, WORLD - 25);
      e.y = clamp(e.y, 25, WORLD - 25);
    }
  }
  updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      shot.life -= dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.life > 0 && dist(shot, this.player) < shot.r + this.player.r) {
        this.hurt(shot.damage);
        shot.life = 0;
      }
    }
    this.enemyShots = this.enemyShots.filter((shot) => shot.life > 0);
  }
  validRunStats(r, time) {
    const number = (n) => Number.isFinite(n) && n >= 0 && n <= 1e12;
    return (
      r &&
      [r.taken, r.blocked, r.healed, r.distance, r.xp, r.since].every(number) &&
      r.since <= time &&
      r.weapons &&
      Object.entries(r.weapons).every(
        ([id, w]) =>
          BY_ID[id] &&
          w &&
          [w.damage, w.kills, w.hits, w.acquired].every(number) &&
          w.acquired <= time,
      ) &&
      r.specials &&
      ["magnet", "heal", "power"].every((id) => number(r.specials[id])) &&
      r.enemies &&
      Object.entries(r.enemies).every(([id, n]) => ENEMIES[id] && number(n)) &&
      Array.isArray(r.history) &&
      r.history.length < 20000 &&
      r.history.every(
        (h) =>
          h &&
          ["weapon", "evolve", "passive", "heal"].includes(h.kind) &&
          (h.kind === "weapon" || h.kind === "evolve"
            ? BY_ID[h.id]
            : h.kind === "passive"
              ? PASSIVES.some((p) => p.id === h.id)
              : h.id === "heal") &&
          [h.time, h.level, h.playerLevel, h.season].every(number) &&
          h.time <= time &&
          h.season <= 3,
      )
    );
  }
  updateBoss(e, dt) {
    const first = this.hazards.length;
    // Increase decision frequency, keeping telegraphs and projectile travel readable.
    if (this.mode === "hell" && !e.attack) e.bossClock -= dt * .25;
    this.updateBossBehavior(e, dt);
    for (let i = first; i < this.hazards.length; i++) this.hazards[i].bossYear = e.bossYear || this.year;
  }
  updateBossBehavior(e, dt) {
    if (e.hp <= 0) return;
    if (e.bossKind && e.bossKind !== "bear") {
      updateChapterBoss(this, e, dt);
      return;
    }
    e.moving = false;
    e.bossClock -= dt;
    if (e.attack) {
      const a = e.attack;
      a.time -= dt;
      if (a.time <= 0) {
        if (a.type === "charge") {
          if (!a.running) {
            a.running = true;
            a.time = 0.65;
            this.effect("burst", e, { color: "#b9e6ed", life: 0.4, r: 60 });
          } else {
            e.attack = null;
            e.bossClock = e.hp < e.maxHp * 0.5 ? 2.2 : 3.5;
          }
        } else {
          e.slamAt = this.time;
          this.hazards.push({
            type: "shock",
            x: e.x,
            y: e.y,
            delay: 0,
            age: 0,
            range: 400,
          });
          e.attack = null;
          e.bossClock = 3.5;
        }
      }
      if (e.attack?.running) {
        e.moving = true;
        e.heading = a.angle;
        e.x = clamp(e.x + Math.cos(a.angle) * 350 * dt, 30, WORLD - 30);
        e.y = clamp(e.y + Math.sin(a.angle) * 350 * dt, 30, WORLD - 30);
      }
      return;
    }
    if (e.bossClock <= 0) {
      e.heading = angle(e,this.player);
      e.attack = {
        type: this.random() < 0.5 ? "charge" : "shock",
        angle: angle(e, this.player),
        time: 1.1,
        running: false,
      };
      return;
    }
    const a = angle(e, this.player);
    e.heading = a;
    e.moving = true;
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
  }
  collect(d) {
    this.xp += d.value || 0;
    this.runStats.xp += d.value || 0;
    if (d.type in this.runStats.specials) this.runStats.specials[d.type]++;
    if (d.type === "magnet") {
      for (const x of this.drops) if (x.type === "xp") x.pull = true;
      this.onEvent("special", "자석 도토리 · 경험치 회수");
    }
    if (d.type === "heal") {
      this.heal(30);
      this.onEvent("special", "회복 도토리 · 체력 +30");
    }
    if (d.type === "power") {
      this.player.power = 12;
      this.onEvent("special", "힘의 도토리 · 12초간 공격력 +30%");
    }
    d.dead = true;
  }
  updateDrops(dt) {
    const p = this.player,
      range = 52 + (this.passives.magnet || 0) * 24;
    for (const d of this.drops) {
      const n = dist(d, p);
      if (d.type === "chest") {
        // Chests are never pulled; walk over them to open.
        if (n < p.r + 20) {
          d.dead = true;
          this.drops = this.drops.filter((x) => !x.dead);
          this.openChest();
          return;
        }
        continue;
      }
      if (n < range) d.pull = true;
      if (d.pull) {
        const a = angle(d, p),
          step = (280 + Math.max(0, 180 - n)) * dt;
        if (n < step + 12) {
          this.collect(d);
          continue;
        }
        d.x += Math.cos(a) * step;
        d.y += Math.sin(a) * step;
      }
    }
    this.drops = this.drops.filter((d) => !d.dead);
    if (this.drops.length > 500) {
      const buckets = new Map();
      for (const d of this.drops) {
        if (d.type !== "xp" || d.pull) continue;
        const k = `${Math.floor(d.x / 90)},${Math.floor(d.y / 90)}`;
        if (buckets.has(k)) {
          buckets.get(k).value += d.value;
          d.dead = true;
        } else buckets.set(k, d);
      }
      this.drops = this.drops.filter((d) => !d.dead);
    }
  }
  transition() {
    // Seasons change the world around the current fight, never reset it.
    this.finishSeason();
  }
  finishSeason() {
    if (this.mode === "hell") return;
    this.pendingSeason = false;
    if (this.season < 3) {
      this.season++;
      this.onEvent("season");
      this.onEvent("checkpoint", this.snapshot());
    } else {
      this.spawn("boss");
      this.onEvent("boss");
    }
    this.grid.rebuild(this.enemies);
  }
  snapshot() {
    if (this.mode === "hell") return null;
    return {
      version: 1,
      year: this.year,
      quick: this.quick,
      time: this.time,
      season: this.season,
      level: this.level,
      xp: this.xp,
      kills: this.kills,
      player: { ...this.player },
      weapons: structuredClone(this.weapons),
      passives: { ...this.passives },
      runStats: structuredClone(this.runStats),
    };
  }
  restore(s) {
    if (this.mode === "hell") throw Error("Hell runs cannot resume checkpoints");
    const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
    if (
      !s ||
      s.version !== 1 ||
      !Number.isInteger(s.year ?? 1) ||
      (s.year ?? 1) < 1 ||
      (s.year ?? 1) > 3 ||
      typeof s.quick !== "boolean" ||
      s.quick !== this.quick ||
      !finite(s.time, 0, this.seasonDuration * 4 - 0.001) ||
      !Number.isInteger(s.season) ||
      !finite(s.season, 0, 3) ||
      Math.floor(s.time / this.seasonDuration) !== s.season ||
      !Number.isInteger(s.level) ||
      !finite(s.level, 1, 10000) ||
      !finite(s.xp, 0, 1e8) ||
      !finite(s.kills, 0, 1e8) ||
      !Array.isArray(s.weapons) ||
      s.weapons.length < 1 ||
      s.weapons.length > 6 ||
      new Set(s.weapons.map((w) => baseOf(w.id))).size !== s.weapons.length
    )
      throw Error("Invalid checkpoint");
    const p = s.player;
    if (
      !p ||
      !finite(p.x, 0, WORLD) ||
      !finite(p.y, 0, WORLD) ||
      !finite(p.maxHp, 1, 10000) ||
      !finite(p.hp, 0.001, p.maxHp) ||
      !finite(p.power, 0, 120)
    )
      throw Error("Invalid player");
    for (const w of s.weapons) {
      if (
        !BY_ID[w.id] ||
        !Number.isInteger(w.level) ||
        w.level < 1 ||
        w.level > BY_ID[w.id].max ||
        !finite(w.charge, 0, 30) ||
        !finite(w.timer, -1e6, 30) ||
        !finite(w.travel, 0, 100) ||
        !Number.isInteger(w.shields) ||
        !finite(w.shields, 0, 3)
      )
        throw Error("Invalid weapon");
    }
    if (
      !s.passives ||
      Object.entries(s.passives).some(
        ([id, lv]) =>
          !PASSIVES.some((p) => p.id === id) ||
          !Number.isInteger(lv) ||
          lv < 1 ||
          lv > 5,
      )
    )
      throw Error("Invalid passive");
    this.year = s.year ?? 1;
    this.time = s.time;
    this.season = s.season;
    this.level = s.level;
    this.xp = s.xp;
    this.kills = s.kills;
    this.player = {
      ...this.player,
      x: p.x,
      y: p.y,
      hp: p.hp,
      maxHp: p.maxHp,
      power: p.power,
      invuln: 1.5,
      moving: false,
    };
    this.weapons = structuredClone(s.weapons);
    this.passives = { ...s.passives };
    if (s.runStats && this.validRunStats(s.runStats, s.time))
      this.runStats = structuredClone(s.runStats);
    else {
      this.runStats.since = s.time;
      this.runStats.weapons = {};
      this.runStats.history = [];
      for (const w of this.weapons) this.weaponRecord(w.id);
    }
  }

  encounter() {
    if (this.mode === "hell") return hellBudget(this.time, this.season);
    const budget = encounterBudget(this.time, this.seasonDuration, this.season, Boolean(this.boss));
    if (this.season > 0) budget.boarCap += (this.year - 1) * 2;
    return budget;
  }
  updateHell() {
    for (const boss of this.enemies.filter(e => e.type === "boss" && e.hp <= 0)) {
      this.hellBossKills.push({ year: boss.bossYear, time: this.time });
      this.heal(20);
      this.onEvent("hellBossDefeated", boss.bossYear);
    }
    this.enemies = this.enemies.filter(e => e.type !== "boss" || e.hp > 0);
    this.boss = this.enemies.find(e => e.type === "boss") || null;
    const season = Math.min(3, Math.floor(this.time / this.seasonDuration));
    if (season !== this.season) { this.season = season; this.onEvent("season"); }
    // The first three arrivals are fixed, even if the previous boss is still alive.
    // Overtime queues at most three living bosses to bound rendering and hazards.
    if (this.time >= hellBossTime(this.hellBossIndex) && this.enemies.filter(e => e.type === "boss").length < 3) {
      const boss = this.spawn("boss", false, hellBossYear(this.hellBossIndex));
      this.hellBossIndex++;
      this.onEvent("boss", boss.bossYear);
    }
  }
  step(dt, input = { x: 0, y: 0 }) {
    if (this.state !== "playing") return;
    dt = Math.min(dt, 0.05);
    const p = this.player;
    this.time += dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.power = Math.max(0, p.power - dt);
    p.guard = Math.max(0, (p.guard || 0) - dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    const len = Math.hypot(input.x, input.y) || 1,
      speed =
        135 *
        (1 + (this.passives.speed || 0) * 0.08) *
        (this.year === 2 && inWater(p.x, p.y) ? 0.84 : 1),
      ox = p.x,
      oy = p.y;
    p.x = clamp(
      p.x + (input.x / Math.max(1, len)) * speed * dt,
      35,
      WORLD - 35,
    );
    p.y = clamp(
      p.y + (input.y / Math.max(1, len)) * speed * dt,
      35,
      WORLD - 35,
    );
    const moved = dist(p, { x: ox, y: oy });
    this.runStats.distance += moved;
    p.moving = moved > 0.01;
    if (p.moving) this.attackDirection = {x:input.x/len,y:input.y/len};
    if (input.x) p.facing = input.x < 0 ? -1 : 1;
    const budget = this.encounter();
    const tuning = yearDifficulty(this.year, this.time / (this.seasonDuration * 4));
    if (this.mode !== "hell") {
      budget.cap = Math.round(budget.cap * tuning.cap);
      budget.interval *= tuning.interval;
    }
    if (!this.sandbox) {
      if (this.year > 1 && this.time > this.seasonDuration * 0.2) {
        budget.weights = { ...chapter(this.year).enemyWeights[this.season] };
        if (
          this.season === 0 &&
          this.time < Math.max(35, this.seasonDuration * 0.2)
        )
          budget.weights.mushroom = 0;
      }
      this.environmentClock -= dt;
      if (
        this.year > 1 &&
        this.season > 0 &&
        this.environmentClock <= 0 &&
        !this.boss
      ) {
        if (this.year === 2) addPool(this, p.x, p.y, 60, 1.5);
        else addRoot(this, p.x - 160, p.y - 100, Math.PI / 5, 360, 1.5);
        this.environmentClock = 18 - this.season * 2;
      }
      this.spawnClock -= dt;
      updateWaves(this, dt, budget);
      this.eliteClock -= dt;
      if (this.spawnClock <= 0 && this.enemies.filter(e => e.hp > 0 && !e.escaped).length < budget.cap - (this.wavePending?.points.length || 0)) {
        this.spawn(pickEnemy(budget, this.enemies, this.random));
        this.spawnClock = budget.interval * (this.time < this.waveRestUntil ? 1.7 : 1);
      }
      if (
        this.eliteClock <= 0 &&
        !this.wavePending && this.time >= this.waveRestUntil &&
        (!this.boss || this.mode === "hell") &&
        this.enemies.length < budget.cap &&
        // Mini-bosses that nobody can kill should pile up into a lethal wall, not into hundreds of sponges.
        this.enemies.filter(e => e.elite && e.hp > 0 && !e.escaped).length < 8
      ) {
        const boars = this.enemies.filter(e => e.type === "boar" && e.hp > 0 && !e.escaped);
        const eliteBoar = this.season > 1 && boars.length < budget.boarCap && !boars.some(e => e.elite);
        this.spawn(eliteBoar ? "boar" : "fox", true);
        this.eliteClock = this.mode === "hell" ? hellEliteInterval(this.time) : Math.max(45, this.seasonDuration * 0.55);
        this.onEvent("elite");
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.hit = Math.max(0, e.hit - dt);
      e.root = Math.max(0, e.root - dt);
      e.slowTime -= dt;
      if (e.slowTime <= 0) e.slow = 0;
      if (e.type === "boss") this.updateBoss(e, dt);
      else this.updateEnemy(e, dt);
      if (e.burn > 0) {
        e.burn -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.5;
          this.damage(e, 3, "#edac74", 0, "fire");
        }
      }
      if (e.hp > 0 && e.damage > 0 && dist(e, p) < e.r + p.r)
        this.hurt(e.damage, e.type === "boss" ? null : e);
    }
    if (this.state !== "playing") return;
    this.grid.rebuild(this.enemies);
    this.updateWeapons(dt, dist(p, { x: ox, y: oy }));
    this.updateBullets(dt);
    this.updateZones(dt);
    this.updateHazards(dt);
    this.updateEnemyShots(dt);
    if (this.state !== "playing") return;
    this.updateDrops(dt);
    this.enemies = this.enemies.filter(
      (e) => !e.escaped && (e.hp > 0 || e.type === "boss"),
    );
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter((f) => f.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 20 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    if (!this.sandbox && this.mode === "hell") this.updateHell();
    if (!this.sandbox && this.mode !== "hell" && this.boss && this.boss.hp <= 0) {
      this.state = "won";
      this.onEvent("won");
      return;
    }
    this.checkLevel();
    if (
      !this.sandbox &&
      this.mode !== "hell" &&
      this.time >= (this.season + 1) * this.seasonDuration &&
      !this.boss &&
      !this.pendingSeason
    ) {
      this.time = (this.season + 1) * this.seasonDuration;
      this.transition();
    }
  }
}
