import { drawSkyShield, drawBoomerang, drawSeed } from "./weapon-art.js";
import { opaqueBossAtlas } from "./boss-opacity.js";
import { seasonLayers, groundFrame, sceneryPlacement } from "./season-art.js";
import { drawPatternSprite, drawVenomSprite, drawBossCastSprite } from "./boss-vfx.js";
import { bossSpriteFrame, bossFrameRect } from "./boss-animation.js";
import { drawBossLife, drawBossHazard } from "./boss-art.js";
import { chapter, riverX, riverCrossing } from "./chapters.js";
import { bodyCenter, stoneOrbit, fireRotation } from "./geometry.js";
import { WORLD, SEASONS, BY_ID } from "./data.js";
const rng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
export function createScenery() {
  const random = rng(37),
    objects = [];
  // Sample occupied rectangles, not just centers, so tall sprites do not overlap.
  for (let attempt = 0; attempt < 6000 && objects.length < 72; attempt++) {
    const sprite = 12 + Math.floor(random() * 6);
    const size = sprite < 14 ? 100 + random() * 45 : 42 + random() * 35;
    const x = 80 + random() * (WORLD - 160),
      y = 130 + random() * (WORLD - 220);
    if (Math.hypot(x - 1200, y - 1200) < 210) continue;
    const box = {
      left: x - size / 2 - 24,
      right: x + size / 2 + 24,
      top: y - size * 0.84 - 24,
      bottom: y + size * 0.16 + 24,
    };
    if (
      objects.some(
        (o) =>
          box.left < o.box.right &&
          box.right > o.box.left &&
          box.top < o.box.bottom &&
          box.bottom > o.box.top,
      )
    )
      continue;
    objects.push({ x, y, sprite, size, box });
  }
  return objects;
}
export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.game = game;
    this.images = {};
    this.ready = false;
    this.camera = { x: 1200, y: 1200 };
    this.width = 1000;
    this.height = 650;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.scenery = createScenery();
  }
  async load() {
    await Promise.all(
      [
        "forest-atlas",
        "forest-ground",
        "season-ground-soft",
        "season-scenery",
        "combat-atlas",
        "boss-atlas",
        "serpent-animation",
        "heart-animation",
        "serpent-vfx",
        "heart-vfx",
        "bear-animation",
        "bear-vfx",
        "river-ground",
        "roots-ground",
      ].map(
        (name) =>
          new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => {
              if(name === "bear-vfx") im.vfxInset = 6;
              this.images[name] = name.endsWith("-animation") ? opaqueBossAtlas(im) : im;
              resolve();
            };
            im.onerror = () =>
              reject(
                Error("게임 이미지를 불러오지 못했습니다. 새로고침해 주세요."),
              );
            im.src = `/assets/${name}.png`;
          }),
      ),
    );
    this.ready = true;
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.game.view = { w: this.width, h: this.height };
  }
  sprite(index, x, y, size, flip = false, alpha = 1) {
    const c = this.ctx,
      im = this.images["forest-atlas"];
    if (!im) return;
    c.save();
    c.globalAlpha = alpha;
    c.translate(Math.round(x), Math.round(y));
    if (flip) c.scale(-1, 1);
    c.imageSmoothingEnabled = false;
    c.drawImage(
      im,
      (index % 6) * 256,
      Math.floor(index / 6) * 256,
      256,
      256,
      -size / 2,
      -size * 0.84,
      size,
      size,
    );
    c.restore();
  }
  circle(x, y, r, color, alpha = 1) {
    const c = this.ctx;
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }
  effectSprite(index, x, y, size, rotation = 0, alpha = 1) {
    const c = this.ctx,
      im = this.images["combat-atlas"];
    if (!im) return;
    c.save();
    c.translate(x, y);
    c.rotate(rotation);
    c.globalAlpha *= alpha;
    // This VFX atlas intentionally uses black for additive/screen compositing.
    c.globalCompositeOperation = "screen";
    c.imageSmoothingEnabled = false;
    c.drawImage(
      im,
      (index % 3) * 512,
      Math.floor(index / 3) * 512,
      512,
      512,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    c.restore();
  }
  shadow(x, y, r = 18) {
    const c = this.ctx;
    c.fillStyle = "#101e19";
    c.globalAlpha = 0.27;
    c.beginPath();
    c.ellipse(x, y + 2, r, r * 0.33, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }
  drawWhip(f) {
    const c = this.ctx,
      progress = 1 - f.life / f.total;
    const length = Math.hypot(f.x2 - f.x, f.y2 - f.y);
    c.translate(f.x, f.y - 8);
    c.rotate(Math.atan2(f.y2 - f.y, f.x2 - f.x));
    c.lineCap = "round";
    const extension = Math.min(1, 0.7 + progress * 2);
    const points = Array.from({ length: 29 }, (_, i) => {
      const u = i / 28;
      return {
        x: u * length * extension,
        y:
          Math.sin(u * Math.PI * 2 - progress * 9) *
          Math.sin(u * Math.PI) *
          28 *
          (1 - progress),
      };
    });
    // A travelling loop straightens into a tapered snap, then recoils.
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        taper = 1 - i / points.length;
      for (const [color, width] of [
        ["#142c21", 8],
        ["#507841", 5],
        ["#d1dea0", 1.5],
      ]) {
        c.strokeStyle = color;
        c.lineWidth = width * (0.25 + taper * 0.75);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
      if (i % 5 === 0 && i < 25) {
        c.strokeStyle = "#a4c47a";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(b.x, b.y);
        c.lineTo(b.x - 5, b.y + (i % 2 ? -6 : 6));
        c.stroke();
      }
    }
    if (progress < 0.65) {
      const tip = points.at(-1);
      c.strokeStyle = "#f3f0c9";
      c.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        c.beginPath();
        c.moveTo(tip.x + 4, tip.y);
        c.lineTo(tip.x + 12 + Math.cos(i) * 8, tip.y + i * 7);
        c.stroke();
      }
    }
  }
  drawBolt(f) {
    const c = this.ctx,
      progress = 1 - f.life / f.total;
    const dx = f.x2 - f.x,
      dy = f.y2 - f.y,
      length = Math.hypot(dx, dy) || 1;
    const random = rng(
      Math.floor(
        f.x * 13 +
          f.y * 7 +
          (this.reduced ? 0 : Math.floor(progress * 3) * 113),
      ) >>> 0,
    );
    const count = Math.max(7, Math.ceil(length / 17));
    const points = Array.from({ length: count + 1 }, (_, i) => {
      const u = i / count,
        offset = i === 0 || i === count ? 0 : (random() - 0.5) * 32;
      return {
        x: f.x + dx * u - (dy / length) * offset,
        y: f.y + dy * u + (dx / length) * offset,
      };
    });
    c.lineJoin = "miter";
    c.globalCompositeOperation = "screen";
    for (const [color, width, opacity] of [
      ["#648ef5", 13, 0.12],
      ["#9bc7ff", 6, 0.4],
      ["#f3fbff", 2, 1],
    ]) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.globalAlpha = (1 - progress) * opacity;
      c.beginPath();
      points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
    }
    c.globalAlpha = (1 - progress) * 0.7;
    c.strokeStyle = "#c2dfff";
    c.lineWidth = 1;
    for (let i = 2; i < count; i += 3) {
      const p = points[i],
        side = i % 2 ? 1 : -1;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(
        p.x + (dx / length) * 12 - (dy / length) * side * 16,
        p.y + (dy / length) * 12 + (dx / length) * side * 16,
      );
      c.lineTo(
        p.x + (dx / length) * 23 - (dy / length) * side * 32,
        p.y + (dy / length) * 23 + (dx / length) * side * 32,
      );
      c.stroke();
    }
    c.translate(f.x2, f.y2);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7,
        r = 5 + progress * 26;
      c.beginPath();
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7));
      c.stroke();
    }
  }
  draw(now) {
    const c = this.ctx,
      g = this.game,
      p = g.player,
      W = this.width,
      H = this.height,
      t = now / 1000,
      title = g.state === "title";
    c.clearRect(0, 0, W, H);
    if (!this.ready) {
      c.fillStyle = "#182c24";
      c.fillRect(0, 0, W, H);
      return;
    }
    this.camera.x = p.x - (title ? W * 0.16 : 0);
    this.camera.y = p.y;
    const sx = W / 2 - this.camera.x,
      sy = H / 2 - this.camera.y;
    const shake = this.reduced || g.state !== "playing" ? 0 : g.shake;
    c.save();
    c.translate(
      sx + (shake ? Math.sin(t * 91) * shake : 0),
      sy + (shake ? Math.cos(t * 71) * shake * 0.5 : 0),
    );
    const tile=480, im=this.images['season-ground-soft'];
    const layers=seasonLayers(g.season,g.time,g.seasonDuration),seasonBlend=layers.blend;
    c.imageSmoothingEnabled=false;
    for(let x=Math.floor((this.camera.x-W/2)/tile)*tile;x<this.camera.x+W/2+tile;x+=tile) {
      for(let y=Math.floor((this.camera.y-H/2)/tile)*tile;y<this.camera.y+H/2+tile;y+=tile) {
        c.globalAlpha=1;
        c.drawImage(im,...groundFrame(im,layers.from),x,y,tile,tile);
        if(layers.to!==layers.from) {
          c.globalAlpha=layers.blend;
          c.drawImage(im,...groundFrame(im,layers.to),x,y,tile,tile);
        }
      }
    }
    c.globalAlpha=1;
    if (g.year === 2) {
      c.save();
      for (let y = 24; y < WORLD - 24; y += 12) {
        const x = riverX(y);
        c.fillStyle = riverCrossing(y)
          ? "#af9b6948"
          : g.season === 3
            ? "#91c9cf55"
            : "#398b9955";
        c.fillRect(x - 110, y, 220, 12);
        if (!riverCrossing(y)) {
          c.fillStyle = "#b4d8cd45";
          c.fillRect(x - 112, y, 3, 12);
          c.fillRect(x + 109, y, 3, 12);
          if (y % 48 === 0) {
            c.globalAlpha = 0.25;
            c.fillRect(x - 70 + Math.sin(t + y) * 12, y, 55, 2);
            c.globalAlpha = 1;
          }
        }
      }
      c.restore();
    }
    if (g.year === 3) {
      c.save();
      c.strokeStyle = "#a48b6040";
      c.lineWidth = 80;
      c.beginPath();
      c.arc(1200, 1200, 325, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    c.strokeStyle = "#a4b08b";
    c.lineWidth = 3;
    c.setLineDash([10, 10]);
    c.strokeRect(20, 20, WORLD - 40, WORLD - 40);
    c.setLineDash([]);
    for (const z of g.zones) {
      this.circle(
        z.x,
        z.y,
        z.r,
        z.type === "fire" ? "#d16b30" : "#aa79ba",
        0.15 + Math.min(1, z.life) * 0.08,
      );
      c.strokeStyle = z.type === "fire" ? "#dfa15a" : "#cca8d8";
      c.globalAlpha = 0.32;
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(
        z.x,
        z.y,
        z.r * (0.88 + Math.sin(t * 4 + z.id) * 0.03),
        0,
        Math.PI * 2,
      );
      c.stroke();
      c.globalAlpha = 1;
      for (let j = 0; j < 4; j++) {
        const a = j * 1.7 + z.id;
        this.circle(
          z.x + Math.cos(a) * z.r * 0.5,
          z.y + Math.sin(a) * z.r * 0.5 - Math.sin(t * 2 + j) * 4,
          2,
          z.type === "fire" ? "#f5c978" : "#e1c4e9",
          0.7,
        );
      }
    }
    for (const d of g.drops) {
      if (d.type === "xp") {
        const r = d.value >= 20 ? 4.2 : d.value >= 6 ? 3 : 2;
        this.circle(d.x, d.y, r + 2, "#7ddaaf", 0.16);
        this.circle(d.x, d.y, r, d.value >= 20 ? "#c0eddd" : "#9ddeb3");
      } else {
        const colors = { magnet: "#70d4e9", heal: "#b7e69b", power: "#f4bc65" };
        this.shadow(d.x, d.y + 3, 15);
        this.circle(d.x, d.y, 20, colors[d.type], 0.08);
        const bob = this.reduced ? 0 : Math.sin(t * 3 + d.x) * 2;
        this.effectSprite(
          { magnet: 3, power: 4, heal: 5 }[d.type],
          d.x,
          d.y - 12 + bob,
          48,
        );
        c.font = "600 10px sans-serif";
        c.textAlign = "center";
        const label = { magnet: "자석", power: "공격력 ↑", heal: "회복 +" }[
          d.type
        ];
        const width = c.measureText(label).width + 10;
        c.fillStyle = "#13231ed9";
        c.fillRect(d.x - width / 2, d.y + 15, width, 16);
        c.fillStyle = colors[d.type];
        c.fillText(label, d.x, d.y + 26);
      }
    }
    const entities = [];
    if (g.year === 3)
      entities.push({ kind: "scene", sprite: 17, x: 1200, y: 1190, size: 300 });
    if (g.year === 2)
      for (const y of [600, 1200, 1800])
        entities.push({
          kind: "scene",
          sprite: 17,
          x: riverX(y) + 170,
          y,
          size: 85,
        });
    for (const o of this.scenery) {
      if (g.year === 2 && Math.abs(o.x - riverX(o.y)) < 180) continue;
      if (
        Math.abs(o.x - this.camera.x) < W / 2 + 200 &&
        Math.abs(o.y - this.camera.y) < H / 2 + 220
      )
        entities.push({ ...o, kind: "scene" });
    }
    for (const e of g.enemies)
      entities.push({ ...e, kind: "enemy", source: e });
    for (const tr of g.turrets) entities.push({ ...tr, kind: "turret" });
    entities.push({ ...p, kind: "player" });
    entities.sort((a, b) => a.y - b.y);
    for (const o of entities) {
      if (o.kind === "scene") {
        const alpha =
          Math.hypot(o.x - p.x, o.y - p.y) < 90 && o.y > p.y ? 0.35 : 1;
        const atlas=this.images['season-scenery'];
        const drawSeason=(season,opacity)=>{
          c.globalAlpha=alpha*opacity;
          const art=sceneryPlacement(o.sprite,season,o.size);
          c.drawImage(atlas,...art.source,o.x+art.left,o.y+art.top,art.width,art.height);
        };
        if(layers.from===layers.to) drawSeason(layers.to,1);
        else { drawSeason(layers.from,1-layers.blend);drawSeason(layers.to,layers.blend); }
        c.globalAlpha=1;
        continue;
      }
      if (o.kind === "turret") {
        this.shadow(o.x, o.y, 20);
        const flash = o.flash || 0;
        this.sprite(19, o.x - Math.cos(o.aim || 0) * flash * 12, o.y, 66);
        this.circle(o.x, o.y - 32, 3, o.tracking ? "#d7ffae" : "#c4a36f", 0.9);
        if (flash > 0) {
          this.circle(
            o.x + Math.cos(o.aim) * 17,
            o.y - 24 + Math.sin(o.aim) * 17,
            (8 * flash) / 0.16,
            "#eaffb9",
            0.8,
          );
        }
        c.fillStyle = "#172e24";
        c.fillRect(o.x - 16, o.y + 9, 32, 3);
        c.fillStyle = "#b9ca8c";
        c.fillRect(
          o.x - 16,
          o.y + 9,
          32 * Math.min(1, o.life / (o.totalLife || 18)),
          3,
        );
        continue;
      }
      if (o.kind === "player") {
        this.shadow(o.x, o.y, 22);
        const shield = g.weapons.find((w) => w.id === "charm");
        let frame = 0;
        if (p.hp <= 0) frame = 5;
        else if (p.invuln > 0.2 && p.invuln < 0.85) frame = 3;
        else if (p.moving) frame = 1 + (Math.floor(t * 9) % 2);
        else if (Math.floor(t) % 7 === 0) frame = 4;
        this.sprite(
          frame,
          o.x,
          o.y + (p.moving ? Math.sin(t * 18) * 1.5 : Math.sin(t * 2) * 1),
          title ? 108 : 74,
          p.facing > 0,
          p.invuln > 0 && Math.floor(t * 14) % 2 === 0 ? 0.55 : 1,
        );
        if (shield?.shields > 0) {
          const center=bodyCenter(p);
          drawSkyShield(c,center.x,center.y,{time:this.reduced?0:t});
        }
        if (title) {
          c.textAlign = "center";
          c.font = "600 12px sans-serif";
          c.fillStyle = "#eadfb9";
          c.fillText("다람이", o.x, o.y + 33);
        }
        if (p.power > 0) {
          c.strokeStyle = "#e8c366";
          c.lineWidth = 2;
          c.beginPath();
          c.arc(o.x, o.y - 10, 30, 0, Math.PI * 2);
          c.stroke();
        }
        const charm = g.weapons.find((w) => w.id === "charm");
        if (charm) {
          const center = bodyCenter(p),
            stats = g.stats(charm);
          const chestX = center.x + p.facing * 6;
          const waistY = p.y;
          // One worn charm; charges are inscriptions on the same object.
          this.sprite(
            21,
            chestX,
            waistY,
            17,
            p.facing > 0,
            charm.shields ? 1 : 0.35,
          );
          for (let i = 0; i < stats.count; i++) {
            this.circle(
              chestX + (i - (stats.count - 1) / 2) * 3,
              waistY - 3,
              1.2,
              i < charm.shields ? "#e5f4a6" : "#6d715a",
              0.9,
            );
          }
          if (charm.shields < stats.count) {
            c.fillStyle = "#273c2b";
            c.fillRect(chestX - 6, waistY + 3, 12, 2);
            c.fillStyle = "#dfcd97";
            c.fillRect(
              chestX - 6,
              waistY + 3,
              12 * Math.min(1, charm.charge / stats.recharge),
              2,
            );
          }
        }
        continue;
      }
      const e = o.source;
      this.shadow(e.x, e.y, e.r * 1.2);
      if (e.elite) {
        c.strokeStyle = "#d7b665";
        c.lineWidth = 2;
        c.beginPath();
        c.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2);
        c.stroke();
      }
      if (
        e.type === "boss" &&
        e.bossKind &&
        this.images["boss-atlas"]
      ) {
        if(e.bossKind!=="bear") drawBossLife(c,e,g.time);
        drawBossCastSprite(c,this.images,e,g.time);
        c.save();
        c.translate(e.x, e.y - 35);
        if (e.bossKind === 'serpent' || e.bossKind === 'bear') {
          // Source faces left; mirror rightward travel and lean into vertical motion.
          c.scale(Math.cos(e.heading || 0) > 0 ? -1 : 1, 1);
          c.rotate(-Math.sin(e.heading || 0)*.18);
          c.scale(1+Math.sin(g.time*3)*.025,1-Math.sin(g.time*3)*.025);
        } else {
          const pulse=1+Math.sin(g.time*(e.combatPhase===3?6:3))*.025;
          c.scale(pulse,pulse);
        }
        const size = e.bossKind === "bear" ? 164 : e.bossKind === "serpent" ? 170 : 180;
        c.globalCompositeOperation = "source-over";
        c.imageSmoothingEnabled = false;
        c.globalAlpha = 1;
        c.filter = e.hit > 0 ? "brightness(1.35)" : "none";
        c.shadowColor = "#101e29";
        c.shadowBlur = 2;
        const atlas=this.images[e.bossKind + '-animation'];
        if (atlas) {
          const frame=bossSpriteFrame(e,g.time);
          c.drawImage(atlas,...bossFrameRect(atlas,frame),-size/2,-size*.64,size,size*1.33);
          if(e.combatPhase===3) {
            // A faint luminous pass keeps rage visible during movement and attacks.
            c.globalCompositeOperation="screen";
            c.shadowBlur=0;
            c.globalAlpha=.13;
            c.drawImage(atlas,...bossFrameRect(atlas,frame),-size/2,-size*.64,size,size*1.33);
          }
        } else c.drawImage(this.images['boss-atlas'],e.bossKind==='serpent'?0:768,0,768,1024,-size/2,-size*.64,size,size*1.33);
        c.restore();
      } else
        this.sprite(
          e.sprite,
          e.x,
          e.y,
          e.type === "boss" ? 164 : e.r * 4.3,
          Math.cos(e.heading ?? 0) > 0,
          e.hit > 0 ? 0.75 : 1,
        );
      if (e.elite || e.type === "boss" || e.hp < e.maxHp * 0.8) {
        const w = e.type === "boss" ? 90 : 32;
        c.fillStyle = "#25382c";
        c.fillRect(e.x - w / 2, e.y - e.r * 3, w, 3);
        c.fillStyle = e.type === "boss" ? "#b6dce7" : "#d8a066";
        c.fillRect(
          e.x - w / 2,
          e.y - e.r * 3,
          w * Math.max(0, e.hp / e.maxHp),
          3,
        );
      }
      if (e.attack && !e.attack.running) {
        c.save();
        c.translate(e.x, e.y);
        c.strokeStyle = "#e8a77d";
        c.fillStyle = "#cf6344";
        c.globalAlpha = 0.22;
        c.lineWidth = 2;
        if (e.attack.type === "charge") {
          c.rotate(e.attack.angle);
          const length =
            e.type === "boss" ? 340 : e.type === "boar" ? 221 : 150;
          const width = e.r + 10;
          c.fillRect(0, -width, length, width * 2);
          c.globalAlpha = 0.7;
          c.strokeRect(0, -width, length, width * 2);
        } else if (e.attack.type === "spit") {
          c.rotate(e.attack.angle);
          c.setLineDash([5, 8]);
          c.globalAlpha = 0.6;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(290, 0);
          c.stroke();
          c.setLineDash([]);
        } else {
          c.beginPath();
          c.arc(0, 0, 115, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 0.7;
          c.stroke();
        }
        c.restore();
      }
    }
    const stone = g.weapons.find((w) => w.id === "stone");
    if (stone) {
      const s = g.stats(stone);
      for (let i = 0; i < s.count; i++) {
        const orbit = stoneOrbit(g, s, i);
        const { radius: r, angle: a, direction, cx, cy } = orbit;
        c.save();
        c.strokeStyle = "#b8d9b0";
        c.lineWidth = 2;
        c.globalAlpha = 0.16;
        c.beginPath();
        c.arc(cx, cy, r, a - direction * 0.5, a, direction < 0);
        c.stroke();
        c.restore();
        for (let j = 1; j <= 3; j++) {
          const behind = a - direction * j * 0.12;
          this.circle(
            cx + Math.cos(behind) * r,
            cy + Math.sin(behind) * r,
            2 - j * 0.35,
            "#c9dfa8",
            0.3 - j * 0.06,
          );
        }
        const rx = orbit.x,
          ry = orbit.y;
        this.shadow(rx, ry + 7, 9);
        this.effectSprite(2, rx, ry, 36, a * 0.4);
      }
    }
    for (const b of g.bees) {
      this.sprite(20, b.x, b.y, 35, b.target ? b.target.x > b.x : false);
    }
    for (const b of g.bullets) {
      const bounce = b.type === "bounce",
        turret = b.source === "turret";
      if (b.trail?.length > 1) {
        c.save();
        c.lineCap = "round";
        for (let i = 1; i < b.trail.length; i++) {
          c.globalAlpha = (i / b.trail.length) * (bounce ? 0.5 : 0.22);
          c.strokeStyle = bounce
            ? "#75e8d7"
            : turret
              ? "#c9eda3"
              : b.type === "fire"
                ? "#f59f56"
                : "#ddb57c";
          c.lineWidth = bounce ? 2 + i * 0.45 : 2;
          c.beginPath();
          c.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
          c.lineTo(b.trail[i].x, b.trail[i].y);
          c.stroke();
        }
        c.restore();
      }
      if (b.type === "fire") {
        c.save();
        c.translate(b.x, b.y);
        c.rotate(fireRotation(b.vx, b.vy));
        c.imageSmoothingEnabled = false;
        c.drawImage(
          this.images["forest-atlas"],
          4 * 256,
          3 * 256,
          256,
          256,
          (-100 / 256) * 40,
          (-176 / 256) * 40,
          40,
          40,
        );
        c.restore();
      } else if (b.type === "seed") {
        drawSeed(c, b);
      } else if (b.type === "boomerang") {
        drawBoomerang(c,b);
      } else if (bounce) {
        this.circle(b.x, b.y, 15, "#64ddc7", 0.13);
        c.save();
        c.translate(b.x, b.y);
        c.rotate(g.time * 7 + b.id);
        this.sprite(18, 0, 12, 36);
        c.strokeStyle = "#a2f4e4";
        c.lineWidth = 1.8;
        c.beginPath();
        c.arc(0, 0, 12, -0.6, 1.6);
        c.stroke();
        c.restore();
      } else {
        this.sprite(18, b.x, b.y + 7, turret ? 23 : 19);
        if (turret) this.circle(b.x - 2, b.y - 2, 2, "#deffbb", 0.9);
      }
    }
    for (const shot of g.enemyShots) {
      if (drawVenomSprite(c,this.images,shot,g.time)) continue;
      c.save();
      c.strokeStyle = "#ef90c6";
      c.lineWidth = 3;
      c.globalAlpha = 0.5;
      c.beginPath();
      c.moveTo(shot.x, shot.y);
      c.lineTo(shot.x - shot.vx * 0.08, shot.y - shot.vy * 0.08);
      c.stroke();
      c.restore();
      this.circle(shot.x, shot.y, 8, shot.theme === "venom" ? "#163f45" : "#57263f");
      this.circle(shot.x, shot.y, 5, shot.theme === "venom" ? "#71eed0" : "#f49cbf");
      this.circle(shot.x - 1, shot.y - 2, 2, "#fff1dd");
    }
    for (const h of g.hazards) {
      if (drawPatternSprite(c,this.images,h,g.year)) continue;
      if (drawBossHazard(c,h,g.time,h.bossYear || g.year)) continue;
      if (h.type === "pool" || h.type === "rootline") {
        c.save();
        const warning = h.delay > 0;
        c.strokeStyle = warning
          ? "#ffd38b"
          : g.year === 2
            ? "#83d4e1"
            : "#edac7b";
        c.fillStyle = g.year === 2 ? "#508dba" : "#aa614d";
        c.globalAlpha = warning ? 0.65 : 0.8;
        c.lineWidth = warning ? 2 : 4;
        if (warning) c.setLineDash([6, 5]);
        if (h.type === "pool") {
          c.beginPath();
          c.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          c.stroke();
          c.globalAlpha = warning ? 0.12 : 0.35;
          c.fill();
          if (warning) {
            c.setLineDash([]);
            c.lineWidth = 2;
            c.beginPath();
            c.arc(
              h.x,
              h.y,
              h.r * Math.max(0.05, 1 - h.delay / 1.5),
              0,
              Math.PI * 2,
            );
            c.stroke();
          }
        } else {
          c.beginPath();
          c.moveTo(h.x, h.y);
          c.lineTo(h.x2, h.y2);
          c.stroke();
          c.setLineDash([]);
          c.lineWidth = h.width * 2;
          c.globalAlpha = warning ? 0.12 : 0.35;
          c.stroke();
        }
        c.restore();
        continue;
      }
      if (h.type === "shock" && h.delay > 0) {
        c.save();
        c.strokeStyle = "#ffd38b";
        c.lineWidth = 2;
        c.setLineDash([5, 6]);
        c.beginPath();
        c.arc(h.x, h.y, 60 + (1.2 - h.delay) * 50, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
      if (h.delay > 0) continue;
      if (h.type === "ice") {
        const progress = Math.min(1, h.age / 0.6),
          r = h.s.range * progress;
        const opacity =
          Math.min(1, progress * 8) * Math.min(1, (1 - progress) * 5) * 0.82;
        this.effectSprite(0, h.x, h.y, r * 2.32, progress * 0.1, opacity);
      }
      if (h.type === "shock") {
        const r = h.age * 210;
        c.save();
        c.strokeStyle = "#efb390";
        c.lineWidth = 5;
        c.globalAlpha = 0.65;
        c.beginPath();
        c.arc(h.x, h.y, r, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }

    for (const f of g.fx) {
      c.save();
      c.globalAlpha = Math.min(1, f.life / f.total);
      c.strokeStyle = f.color;
      c.fillStyle = f.color;
      c.lineWidth = f.width || 2;
      if (f.type === "arc") {
        const progress = 1 - f.life / f.total;
        c.save();
        c.translate(f.x, f.y);
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(
          0,
          0,
          f.r * 1.2,
          f.angle - f.arc / 2 - 0.1,
          f.angle + f.arc / 2 + 0.1,
        );
        c.closePath();
        c.clip();
        this.effectSprite(
          1,
          0,
          0,
          f.r * 2.12,
          f.angle + Math.PI + (progress - 0.5) * 0.25,
          0.9,
        );
        c.restore();
      }
      if (f.type === "whip") this.drawWhip(f);
      if (f.type === "bolt") this.drawBolt(f);
      if (f.type === "shieldReady") {
        const progress=1-f.life/f.total;
        drawSkyShield(c,f.x,f.y,{strength:(1-progress)*1.4,scale:1+progress*.22});
      }
      if (f.type === "ward") {
        const progress = 1 - f.life / f.total;
        drawSkyShield(c,f.x,f.y,{strength:(1-progress)*1.5,scale:1+progress*.4});
        c.strokeStyle = "#a5e1ff";
        for (let j = 0; j < 8; j++) {
          const a = (j * Math.PI) / 4,
            r = 18 + progress * 25;
          c.beginPath();
          c.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
          c.lineTo(f.x + Math.cos(a) * (r + 7), f.y + Math.sin(a) * (r + 7));
          c.stroke();
        }
      }
      if (f.type === "ricochet") {
        const progress = 1 - f.life / f.total;
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3,
            r = 5 + progress * f.r;
          c.beginPath();
          c.moveTo(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r);
          c.lineTo(f.x + Math.cos(a) * (r + 6), f.y + Math.sin(a) * (r + 6));
          c.stroke();
        }
      }
      if (f.type === "ring") {
        c.beginPath();
        c.arc(f.x, f.y, f.r * (1 - (f.life / f.total) * 0.5), 0, Math.PI * 2);
        c.stroke();
      }
      if (f.type === "burst") {
        for (let j = 0; j < 5; j++) {
          const a = j * 1.256,
            r = f.r * (1 - f.life / f.total);
          c.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, 3, 3);
        }
      }
      c.restore();
    }
    c.font = "600 12px monospace";
    c.textAlign = "center";
    for (const f of g.floaters) {
      c.globalAlpha = Math.min(1, f.life * 3);
      c.fillStyle = f.color;
      c.fillText(f.value, f.x, f.y);
    }
    c.globalAlpha = 1;
    c.restore();
    if (!this.reduced) {
      for (let i = 0; i < 20; i++) {
        const x = ((i * 179 + t * (5 + (i % 4))) % (W + 40)) - 20,
          y = (i * 97 + Math.sin(t * 0.4 + i) * 35) % H;
        this.circle(
          x,
          y,
          i % 3 === 0 ? 2 : 1,
          g.season === 3 ? "#d6e7ec" : "#e9daa2",
          g.season === 3 ? 0.22 + seasonBlend * 0.18 : 0.22,
        );
      }
    }
    const vignette = c.createRadialGradient(
      W * 0.52,
      H * 0.5,
      H * 0.16,
      W * 0.52,
      H * 0.5,
      Math.max(W, H) * 0.7,
    );
    vignette.addColorStop(0, "#07170e00");
    vignette.addColorStop(1, "#07170eaa");
    c.fillStyle = vignette;
    c.fillRect(0, 0, W, H);
    if (title) {
      const grad = c.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#0d2119e6");
      grad.addColorStop(0.5, "#0d211955");
      grad.addColorStop(1, "#0d211900");
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);
    }
  }
}
