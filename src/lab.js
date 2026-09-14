import { itemIcon, prepareItemIcons } from "./item-icons.js";
import { bossSpriteFrame, BOSS_POSES } from "./boss-animation.js";
import { restartBossTrial } from "./boss-trial.js";
import { chapter } from "./chapters.js";
import { bodyCenter } from "./geometry.js";
import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { BY_ID, WEAPONS, PASSIVES, baseOf } from "./data.js";
prepareItemIcons().catch(error => console.warn(error.message));
const $ = (id) => document.getElementById(id);
const bossTrial = document.body.dataset.bossTrial === "true";
const game = new Game();
const renderer = new Renderer($("game"), game);
let selected = "acorn",
  keys = new Set(),
  previous = 0,
  uiClock = 0;
const status = (text) => ($("lab-status").textContent = text);
function clearEffects() {
  for (const key of [
    "bullets",
    "zones",
    "bees",
    "turrets",
    "hazards",
    "fx",
    "floaters",
  ])
    game[key] = [];
  for (const w of game.weapons) {
    w.timer = 0;
    w.travel = 0;
    w.charge = 0;
    w.shields = baseOf(w.id) === "charm" ? game.stats(w).count : 0;
    if (baseOf(w.id) === "charm")
      game.effect("shieldReady", bodyCenter(game.player), {
        life: 0.7,
        color: "#d6f2b0",
      });
  }
}
function resetMeasurement() {
  game.runStats.weapons = {};
  game.runStats.blocked = 0;
  game.runStats.taken = 0;
  game.kills = 0;
  for (const w of game.weapons) game.weaponRecord(w.id);
}
function spawnTargets() {
  if (bossTrial) {
    clearEffects();
    restartBossTrial(game, { stage: Number($("boss-stage").value), invincible: $("boss-invincible").checked });
    clearEffects();
    resetMeasurement();
    keys.clear();
    $("lab-pause").textContent = "일시정지";
    status(`${chapter(game.year).bossName} · ${Math.round(game.boss.hp)} HP · 보스전 시작`);
    return;
  }
  game.enemies = [];
  game.enemyShots = [];
  game.drops = [];
  game.boss = null;
  const count =
      $("lab-target").value === "boss" ? 1 : Number($("lab-count").value),
    distance = Number($("lab-distance").value),
    type = $("lab-target").value;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const e = game.spawn(type === "dummy" ? "boar" : type);
    e.x = Math.max(30, Math.min(2370, game.player.x + Math.cos(a) * distance));
    e.y = Math.max(30, Math.min(2370, game.player.y + Math.sin(a) * distance));
    e.heading = Math.atan2(game.player.y - e.y, game.player.x - e.x);
    if (type === "dummy") {
      e.hp = e.maxHp = 100000;
      e.trainingDummy = true;
      e.damage = 0;
    }
  }
  game.grid.rebuild(game.enemies);
  status(
    `${type === "dummy" ? "고정 표적" : $("lab-target").selectedOptions[0].textContent} ${count}개 배치 · 거리 ${distance}`,
  );
}
function updateControls() {
  const own = game.weaponOf(selected), evolved = own && BY_ID[own.id].evolved;
  $("lab-level").disabled = !own || evolved;
  $("lab-level").max = BY_ID[selected].max;
  $("lab-level").value = evolved ? BY_ID[selected].max : own?.level || 1;
  $("lab-level-value").textContent = evolved
    ? `진화 · ${BY_ID[own.id].name}`
    : own
      ? `${own.level} / ${BY_ID[selected].max}`
      : "미장착";
  $("lab-description").textContent = evolved
    ? BY_ID[own.id].desc
    : BY_ID[selected].desc +
      (own?.level > 1 ? " " + BY_ID[selected].up[own.level - 1] : "");
  for (const button of $("lab-weapons").children)
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.weapon === selected && Boolean(own)),
    );
  $("lab-equipped").innerHTML =
    game.weapons
      .map(
        (w) =>
          `<button data-remove="${w.id}" title="클릭하면 제거">${itemIcon(w.id)}${BY_ID[w.id].name} ${BY_ID[w.id].evolved ? "진화" : `Lv.${w.level}`} ×</button>`,
      )
      .join("") || "<p>무기를 선택하세요.</p>";
  for (const b of $("lab-equipped").children)
    if (b.dataset.remove)
      b.onclick = () => {
        game.weapons = game.weapons.filter((w) => w.id !== b.dataset.remove);
        clearEffects();
        resetMeasurement();
        updateControls();
      };
}
function equip(id) {
  if (
    $("lab-stack").checked &&
    !game.weaponOf(id) &&
    game.weapons.length >= 6
  ) {
    status("6칸이 가득 찼습니다. 장착 목록에서 무기를 제거하세요.");
    return;
  }
  selected = id;
  if (!$("lab-stack").checked)
    game.weapons = game.weapons.filter((w) => baseOf(w.id) === id);
  if (!game.weaponOf(id)) game.addWeapon(id);
  clearEffects();
  resetMeasurement();
  updateControls();
  status(
    `${BY_ID[id].name} 시험 중 · WASD 이동 · 무기/레벨 변경 시 측정 초기화`,
  );
}
function reset() {
  game.start(false, null, Number($("lab-year").value));
  $("lab-target").querySelector('[value="boss"]').textContent = chapter(
    game.year,
  ).bossName;
  game.sandbox = true;
  if($("lab-season")) {game.season=Number($("lab-season").value);game.time=game.season*game.seasonDuration+6;}
  keys.clear();
  $("lab-pause").textContent = "일시정지";
  for (const input of $("lab-passives").querySelectorAll("input")) {
    input.value = 0;
    input.previousElementSibling.textContent = "0";
  }
  selected = "acorn";
  if (bossTrial) applyBossBuild();
  clearEffects();
  resetMeasurement();
  spawnTargets();
  updateControls();
}
function applyBossBuild() {
  game.weapons = [];
  for (const id of ['acorn','tail','stone','fire','lightning','charm']) { game.addWeapon(id); game.weapons.at(-1).level = 5; }
  selected = 'acorn';
  $("lab-stack").checked = true;
  clearEffects(); resetMeasurement(); updateControls();
}
if (bossTrial) {
  $("boss-stage").onchange = spawnTargets;
  $("boss-invincible").onchange = () => { game.sandboxInvincible = $("boss-invincible").checked; };
  $("boss-build").onclick = applyBossBuild;
  $("boss-heal").onclick = () => {
    if (game.state === 'dead') { status('사망했습니다. 보스전 다시 시작을 누르세요.'); return; }
    game.player.hp = game.player.maxHp;
  };
}
function togglePause() {
  if (game.state === "playing") game.pause();
  else game.resume();
  keys.clear();
  $("lab-pause").textContent =
    game.state === "paused" ? "계속하기" : "일시정지";
}
$("lab-weapons").innerHTML = WEAPONS.map(
  (w) =>
    `<button data-weapon="${w.id}" aria-pressed="false">${itemIcon(w.id)} ${w.name}</button>`,
).join("");
for (const b of $("lab-weapons").children)
  b.onclick = () => equip(b.dataset.weapon);
$("lab-passives").innerHTML = PASSIVES.filter((p) =>
  ["might", "haste", "area", "speed"].includes(p.id),
)
  .map(
    (p) =>
      `<label>${itemIcon(p.id)}${p.name}<output>0</output><input type="range" min="0" max="5" value="0" data-passive="${p.id}"></label>`,
  )
  .join("");
for (const input of $("lab-passives").querySelectorAll("input"))
  input.oninput = () => {
    game.passives[input.dataset.passive] = Number(input.value);
    input.previousElementSibling.textContent = input.value;
    clearEffects();
    resetMeasurement();
  };
$("lab-level").oninput = () => {
  const w = game.weaponOf(selected);
  if (w && !BY_ID[w.id].evolved) {
    w.level = Number($("lab-level").value);
    clearEffects();
    resetMeasurement();
    updateControls();
  }
};
$("lab-distance").oninput = () =>
  ($("lab-distance-value").textContent = $("lab-distance").value);
$("lab-year").onchange = reset;
if($("lab-season")) $("lab-season").onchange = () => {
  game.season=Number($("lab-season").value);game.time=game.season*game.seasonDuration+6;
  resetMeasurement();
};
$("lab-spawn").onclick = spawnTargets;
$("lab-hit").onclick = () => {
  if (game.state !== "playing") {
    status("계속하기를 누른 뒤 피격 테스트를 실행하세요.");
    return;
  }
  game.player.invuln = 0;
  game.hurt(10);
};
$("lab-max").onclick = () => {
  for (const w of game.weapons) w.level = BY_ID[w.id].max;
  clearEffects();
  resetMeasurement();
  updateControls();
};
// Evolves every equipped base weapon: maxes it and grants the paired passive at max.
$("lab-evolve").onclick = () => {
  const names = [];
  for (const w of game.weapons) {
    const def = BY_ID[w.id];
    if (def.evolved) continue;
    w.level = def.max;
    const requires = BY_ID[def.evolution].requires;
    const need = PASSIVES.find((p) => p.id === requires).max;
    if ((game.passives[requires] || 0) < need) {
      game.passives[requires] = need;
      const input = $("lab-passives").querySelector(`[data-passive="${requires}"]`);
      if (input) { input.value = need; input.previousElementSibling.textContent = String(need); }
    }
    if (game.evolve(def.id)) names.push(BY_ID[w.id].name);
  }
  clearEffects();
  resetMeasurement();
  updateControls();
  status(names.length ? `진화 적용 · ${names.join(", ")}` : "진화할 무기가 없습니다. 무기를 먼저 장착하세요.");
};
$("lab-clear").onclick = () => {
  game.weapons = [];
  clearEffects();
  resetMeasurement();
  updateControls();
};
$("lab-reset").onclick = reset;
$("lab-pause").onclick = togglePause;
$("lab-stats-reset").onclick = resetMeasurement;
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    togglePause();
    return;
  }
  if (e.target.matches("input,select")) return;
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  if (game.state === "playing") togglePause();
});
new ResizeObserver(() => renderer.resize()).observe($("game"));
function loop(now) {
  const dt = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
  previous = now;
  game.step(dt, {
    x:
      Number(keys.has("KeyD") || keys.has("ArrowRight")) -
      Number(keys.has("KeyA") || keys.has("ArrowLeft")),
    y:
      Number(keys.has("KeyS") || keys.has("ArrowDown")) -
      Number(keys.has("KeyW") || keys.has("ArrowUp")),
  });
  renderer.draw(now);
  if (now - uiClock > 200) {
    uiClock = now;
    if (bossTrial) {
      const boss = game.boss;
      const outcome = game.state === "dead" ? "다람이 사망 · 다시 시작 가능" : boss?.hp <= 0 ? "보스 처치 · 다시 시작 가능" : game.state === "paused" ? "일시정지" : "전투 중";
      $("boss-telemetry").innerHTML = `<strong>${chapter(game.year).bossName}</strong><p>${outcome} · 페이즈 ${boss?.combatPhase || 1} · ${boss?.patternName || "접근 중"}${boss ? ` · 동작: ${BOSS_POSES[bossSpriteFrame(boss,game.time)]}` : ""} · 다람이 ${Math.ceil(game.player.hp)} / ${game.player.maxHp} HP · 보스 ${Math.ceil(Math.max(0, boss?.hp || 0))} / ${Math.round(boss?.maxHp || 0)} HP</p><progress aria-label="보스 체력" max="${boss?.maxHp || 1}" value="${Math.max(0,boss?.hp || 0)}"></progress><p>전투 ${Math.floor(game.time - game.seasonDuration * 4)}초 · 받은 피해 ${Math.round(game.runStats.taken)} · ${game.sandboxInvincible ? "무적 켜짐" : "실제 피격"}</p>`;
    }
    $("lab-metrics").innerHTML =
      `<table><thead><tr><th>무기</th><th>실제 피해</th><th>DPS</th><th>명중</th></tr></thead><tbody>${game.weapons
        .map((w) => {
          const r = game.weaponRecord(w.id);
          return `<tr><td>${itemIcon(w.id)} ${BY_ID[w.id].name}</td><td>${Math.round(r.damage).toLocaleString()}</td><td>${(r.damage / Math.max(1, game.time - r.acquired)).toFixed(1)}</td><td>${r.hits}</td></tr>`;
        })
        .join(
          "",
        )}</tbody></table><p>차단 ${game.runStats.blocked}회 · 표적 ${game.enemies.length} · 탄환 ${game.bullets.length} · 비축고 ${game.turrets.length} · 포자 ${game.zones.filter((z) => z.type === "spore").length}</p>`;
  }
  requestAnimationFrame(loop);
}
reset();
renderer
  .load()
  .then(() => {
    renderer.resize();
    requestAnimationFrame(loop);
  })
  .catch((error) => status(error.message));
