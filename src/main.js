import { itemIcon, prepareItemIcons } from "./item-icons.js";
import { updateSoundControl } from "./sound-control.js";
import { playIntro } from "./intro.js";
import { PROLOGUE, shouldPlayPrologue } from "./prologue.js";
import { hellUnlocked, hellBossTime } from "./hell.js";
import { StoryPlayback } from "./cinematic.js";
import {
  CHAPTERS,
  chapter,
  clearedYears,
  canPlayYear,
  inWater,
} from "./chapters.js";
import { StoryMusic } from "./story-music.js";
import { resultDetails } from "./results.js";
import { SeasonMusic } from "./music.js";
import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { BY_ID, WEAPONS, PASSIVES, SEASONS, xpRequired } from "./data.js";
const storyPlayback = new StoryPlayback();
prepareItemIcons().catch(error => console.warn(error.message));
const $ = (id) => document.getElementById(id);
const previewParam = new URLSearchParams(location.search).get("preview");
const previewYear = previewParam !== null && /^[0-3]$/.test(previewParam) ? Number(previewParam) : null;
const store = {
  read(key, fallback = null) {
    try {
      const v = JSON.parse(localStorage.getItem(`daram.${key}`));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(`daram.${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(`daram.${key}`);
    } catch {}
  },
};
let selectedYear = 1,
  storyYear = 1,
  ending = chapter(1).ending;
const quick = false;
let selectedMode = "story",
  keys = new Set(),
  touch = { x: 0, y: 0 },
  modalKind = "",
  lastHud = "",
  lastSlots = "",
  endingPage = 0,
  storyPreview = false,
  storyPrologue = false,
  toastTimer,
  bannerTimer,
  helpWasPlaying = false,
  sound = store.read("sound", true),
  audioContext = null,
  previousFocus = null;
const game = new Game({ onEvent: event });
const renderer = new Renderer($("game"), game);
const music = new SeasonMusic({ onError: toast });
music.enabled = sound;
const storyMusic = new StoryMusic({
  createContext: () =>
    (audioContext ??= new (window.AudioContext || window.webkitAudioContext)()),
  onError: toast,
});
const format = (n) =>
  `${Math.floor(Math.max(0, n) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, n) % 60)
    .toString()
    .padStart(2, "0")}`;
function tone(freq = 440, duration = 0.08, volume = 0.035, type = "sine") {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    const o = audioContext.createOscillator(),
      v = audioContext.createGain();
    o.type = type;
    o.frequency.value = freq;
    v.gain.setValueAtTime(volume, audioContext.currentTime);
    v.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration,
    );
    o.connect(v).connect(audioContext.destination);
    o.start();
    o.stop(audioContext.currentTime + duration);
  } catch {}
}
function showModal(kind, html) {
  if (modalKind !== kind || $("modal").hidden) previousFocus = document.activeElement;
  modalKind = kind;
  const host = kind === "ending" ? document.body : $("game-shell");
  if ($("modal").parentNode !== host) host.append($("modal"));
  const content = $("modal-content");
  const heldScene = kind === "ending" && content.querySelector('.story-scene');
  if (heldScene) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const nextScene = template.content.querySelector('.story-scene');
    // Keep the displayed scene connected. Detach/reinsert restarts CSS animations.
    for (const child of [...content.childNodes]) if (child !== heldScene) child.remove();
    if (nextScene?.dataset.image === heldScene.dataset.image) nextScene.remove();
    else if (nextScene) heldScene.replaceWith(nextScene);
    content.append(template.content);
  } else content.innerHTML = html;
  $("modal-content").dataset.kind = kind;
  $("modal").scrollTop = 0;
  $("modal").hidden = false;
  keys.clear();
  touch = { x: 0, y: 0 };
  requestAnimationFrame(() =>
    $("modal-content").querySelector("button:not(:disabled)")?.focus(),
  );
}
function closeModal() {
  modalKind = "";
  $("modal").hidden = true;
  if (!document.hidden) $("game").focus({ preventScroll: true });
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 2600);
}
function banner(boss = false, bossYear = game.boss?.bossYear || game.year) {
  const s = SEASONS[game.season];
  $("banner-en").textContent = boss ? chapter(bossYear).en : s.en;
  $("banner-name").textContent = boss ? chapter(bossYear).bossName : s.name;
  $("banner-sub").textContent = game.mode === "hell" ? (boss ? "헬 모드 · 보스가 나타났습니다" : "헬 모드 · 살아남을수록 깊어지는 겨울") : boss ? chapter(game.year).summary : s.sub;
  const el = $("season-banner");
  el.hidden = false;
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (el.hidden = true), 2600);
}
function event(type, message) {
  if (type === "levelup") {
    tone(660, 0.18);
    setTimeout(() => tone(880, 0.2), 100);
    showUpgrades();
  }
  if (type === "upgrade") {
    lastSlots = "";
    if (game.state === "playing") closeModal();
    tone(740, 0.12);
  }
  if (type === "hurt") tone(90, 0.18, 0.045, "triangle");
  if (type === "block") tone(880, 0.12);
  if (type === "lightning") tone(160, 0.07, 0.012, "sawtooth");
  if (type === "wave") toast("박쥐 떼 · 비행 경로에서 비켜나세요");
  if (type === "special") {
    toast(message);
    tone(550, 0.15);
  }
  if (type === "season") {
    music.select(game.season);
    banner();
    tone(390, 0.4);
  }
  if (type === "boss") {
    banner(true, message || game.year);
  }
  if (type === "hellBossDefeated") toast(`${chapter(message).bossName} 격파 · 체력 20 회복 · 생존은 계속됩니다`);
  if (type === "elite") toast("숲의 정예가 다가옵니다");
  if (type === "checkpoint" && !game.quick && game.mode !== "hell") {
    if (!store.write("checkpoint", message))
      toast("저장 공간을 사용할 수 없습니다. 현재 플레이는 계속됩니다.");
  }
  if (type === "dead") {
    if (!game.quick && game.mode !== "hell") store.remove("checkpoint");
    saveRecord(false);
    showResult(false);
  }
  if (type === "won") {
    store.remove("checkpoint");
    saveRecord(true);
    if (!game.quick) {
      store.write("clearedYears", clearedYears([...progress(), game.year]));
      if (game.year === 1) store.write("year1Cleared", true);
      store.write("endingUnlocked", true);
    }
    showEnding();
  }
  if (type === "pause") showPause();
}
function saveRecord(won) {
  if (game.mode === "hell") {
    const prev = store.read("hellRecord", {});
    store.write("hellRecord", { time: Math.max(prev.time || 0, game.time), kills: Math.max(prev.kills || 0, game.kills), bosses: Math.max(prev.bosses || 0, game.hellBossKills.length) });
    store.write("hellLastRun", game.report());
    updateRecord();
    return;
  }
  const key = recordKey(game.year, game.quick);
  const prev = store.read(key, {});
  const record = {
    time: Math.max(Number(prev.time) || 0, game.time),
    kills: Math.max(Number(prev.kills) || 0, game.kills),
    won: Boolean(prev.won || won),
  };
  store.write(key, record);
  store.write(
    `${game.quick ? "quickLastRun" : "lastRun"}.year${game.year}`,
    game.report(),
  );
  updateRecord();
}
function progress() {
  return clearedYears(
    store.read("clearedYears", []),
    store.read("year1Cleared", false),
  );
}
function recordKey(year, fast = false) {
  return (fast ? "quickRecord" : "record") + (year === 1 ? "" : ".year" + year);
}
function updateChapters() {
  const cleared = progress();
  $("hell-mode").setAttribute("aria-disabled", String(!hellUnlocked(cleared)));
  $("hell-mode").querySelector("small").textContent = hellUnlocked(cleared) ? "30분 이후 무한 생존" : "스토리 완료 후 해금";
  document.querySelector(".chapter-strip").hidden = selectedMode === "hell";
  $("journey-progress").textContent = `${cleared.length} / 3 완료`;
  document.querySelector(".chapter-strip").innerHTML = CHAPTERS.map(c => {
    const unlocked = canPlayYear(c.id, cleared, quick);
    return `<button class="chapter ${selectedYear === c.id ? 'active' : ''}" data-year="${c.id}" aria-pressed="${selectedYear === c.id}" aria-disabled="${!unlocked}" aria-label="${c.id}년차 ${c.name}${!unlocked ? ', 잠김' : ''}"><b>${c.id}년차</b><span class="chapter-name">${c.name}</span><small>${cleared.includes(c.id) ? '완료' : unlocked ? '도전' : '잠김'}</small></button>`;
  }).join("");
  document.querySelectorAll("[data-year]").forEach(
    (b) =>
      (b.onclick = () => {
        const year = Number(b.dataset.year);
        if (!canPlayYear(year, progress(), quick)) {
          toast(
            "이전 연차를 먼저 클리어하세요.",
          );
          return;
        }
        selectedYear = year;
        game.year = year;
        updateChapters();
        updateRecord();
      }),
  );
  document.querySelector(".chapter-note h2").textContent =
    chapter(selectedYear).name;
  document.querySelector(".chapter-note .eyebrow").textContent =
    `${selectedYear}년차 · 스토리 모드`;
  document.querySelector(".title-description").textContent =
    chapter(selectedYear).summary;
  $("title-screen").dataset.mode = selectedMode;
  if (selectedMode === "hell") {
    document.querySelector(".chapter-note h2").textContent = "끝나지 않는 겨울";
    document.querySelector(".chapter-note .eyebrow").textContent = "HELL MODE";
    document.querySelector(".chapter-note p").textContent = "10분 겨울곰 · 20분 검은 뱀 · 30분 심장";
    document.querySelector(".title-description").textContent = "30분 너머, 쓰러질 때까지. 성장은 계속 이어집니다.";
  } else document.querySelector(".chapter-note p").textContent = "봄 · 여름 · 가을 · 겨울";
  $("start").innerHTML = `${selectedMode === "hell" ? "헬 모드 도전" : "숲으로 들어가기"} <span aria-hidden="true">→</span>`;
}
function updateRecord() {
  const rec = store.read(selectedMode === "hell" ? "hellRecord" : recordKey(selectedYear, quick));
  $("record").textContent = rec
    ? `최고 생존 ${format(rec.time)} · ${rec.kills}마리 처치${selectedMode === "hell" ? ` · 보스 ${rec.bosses || 0}회 격파` : ""}`
    : "아직 남긴 기록이 없습니다.";
}
function updateContinue() {
  const s = store.read("checkpoint");
  $("continue").hidden = selectedMode === "hell" || !s || s.version !== 1 || s.quick;
}
function begin(checkpoint = null, afterPrologue = false) {
  if (checkpoint?.quick) { toast("빠른 체험은 종료되었습니다. 새 모험을 시작하세요."); return; }
  if (checkpoint) {
    selectedMode = "story";
    selectedYear = checkpoint.year ?? 1;
  }
  if (selectedMode === "hell" && !hellUnlocked(progress())) {
    toast("스토리 모드의 1~3년차를 모두 클리어하면 해금됩니다.");
    return;
  }
  if (selectedMode !== "hell" && !canPlayYear(selectedYear, progress(), checkpoint?.quick ?? quick)) {
    toast("이전 연차를 먼저 클리어하세요.");
    return;
  }
  if (selectedMode !== "hell" && !afterPrologue && shouldPlayPrologue({year:selectedYear,checkpoint,seen:store.read('prologueSeen',false)})) {
    showPrologue();
    return;
  }
  closeModal();
  $("title-screen").hidden = true;
  document.body.classList.remove("is-menu");
  $("hud").hidden = false;
  $("touch-pad").hidden = !matchMedia("(pointer: coarse)").matches;
  keys.clear();
  try {
    game.start(checkpoint?.quick ?? quick, checkpoint, selectedYear, selectedMode);
  } catch {
    store.remove("checkpoint");
    game.start(quick, null, selectedYear, selectedMode);
    toast("이전 저장을 읽을 수 없어 새로 시작합니다.");
  }
  lastSlots = "";
  lastHud = "";
  if (selectedMode !== "hell" && !checkpoint && !quick) store.write("checkpoint", game.snapshot());
  $("game").focus({ preventScroll: true });
  music.unlock(game.season);
  tone(330, 0.18);
  banner();
}
function goTitle() {
  closeModal();
  music.select(0);
  game.state = "title";
  game.reset(false, selectedYear);
  game.state = "title";
  $("title-screen").hidden = false;
  document.body.classList.add("is-menu");
  $("hud").hidden = true;
  $("touch-pad").hidden = true;
  $("season-banner").hidden = true;
  $("toast").hidden = true;
  clearTimeout(bannerTimer);
  updateContinue();
  setMode(selectedMode);
  updateRecord();
  $("start").focus();
}
function showUpgrades() {
  const cards = game.choices
    .map((c, i) => {
      const d =
        c.kind === "weapon"
          ? BY_ID[c.id]
          : c.kind === "passive"
            ? PASSIVES.find((p) => p.id === c.id)
            : {
                name: "숲의 휴식",
                glyph: "♡",
                desc: "체력을 30 회복합니다.",
                max: 1,
              };
      const desc =
        c.kind === "weapon"
          ? c.level === 1
            ? d.desc
            : d.up[c.level - 1]
          : d.desc;
      return `<button class="upgrade-card" data-choice="${i}" style="--weapon-color:${d.color || "#d7cc9d"}"><span class="shortcut">${i + 1}</span><span class="category">${c.kind === "weapon" ? (c.level === 1 ? "새 무기" : d.tag) : c.kind === "passive" ? "패시브 강화" : "회복"}</span><span class="upgrade-icon" aria-hidden="true">${itemIcon(c.kind === "heal" ? "heal" : c.id)}</span><h3>${d.name}</h3><p class="desc">${desc}</p><span class="upgrade-bottom"><span>LV. ${c.level} / ${d.max}</span></span></button>`;
    })
    .join("");
  showModal(
    "levelup",
    `<span class="eyebrow">새로운 성장</span><h2 id="modal-title">이번에는 어떤 힘을?</h2><p class="sub">레벨 ${game.level} · 무기와 능력 중 하나를 선택하세요.</p><div class="upgrade-grid">${cards}</div><p class="sub upgrade-hint">숫자 1 · 2 · 3 또는 클릭으로 선택</p>`,
  );
  $("modal-content")
    .querySelectorAll("[data-choice]")
    .forEach((b) => (b.onclick = () => game.choose(Number(b.dataset.choice))));
}
function showPause() {
  showModal(
    "pause",
    `<span class="eyebrow">일시정지</span><h2 id="modal-title">잠깐, 숨 고르기</h2><p class="sub">${game.mode === "hell" ? "헬 모드" : `${game.year}년차`} · ${SEASONS[game.season].name} · ${format(game.time)}<br>이동과 자동 공격만으로 숲을 살아남으세요.</p><div class="modal-actions"><button class="primary" id="resume">계속하기</button><button id="quit">시작 화면으로</button></div><p class="sub">${game.mode === "hell" ? "헬 모드는 중간 저장이 없습니다. 시작 화면으로 나가면 이번 도전이 끝납니다." : game.quick ? "빠른 체험은 중간 저장하지 않습니다." : "마지막 계절 시작 지점이 저장되어 있습니다."}</p>`,
  );
  $("resume").onclick = () => {
    closeModal();
    game.resume();
  };
  $("quit").onclick = goTitle;
}
function showResult(won) {
  $("season-banner").hidden = true;
  const label = game.mode === "hell" ? "겨울은 당신의 기록을 기억합니다." : won ? "한 해를 살아냈어요." : "숲은 다시 기다릴 거예요.";
  showModal(
    "result",
    `<span class="eyebrow">${game.mode === "hell" ? "헬 모드 · 도전 기록" : won ? `${game.year}년차 · 생존 기록` : "이번 모험의 기록"}</span><h2 id="modal-title">${label}</h2><p class="sub">${game.mode === "hell" ? `헬 모드 · 보스 ${game.hellBossKills.length}회 격파` : `${game.year}년차 · ${chapter(game.year).name}${game.quick ? " · 빠른 체험" : ""}`}${won ? " 완료" : ` · ${SEASONS[game.season].name}에서의 발자국`}</p><div class="result-stats"><div><small>생존 시간</small><b>${format(game.time)}</b></div><div><small>처치</small><b>${game.kills}</b></div><div><small>레벨</small><b>${game.level}</b></div></div>${resultDetails(game.report())}<div class="modal-actions"><button id="again" class="primary">다시 도전하기</button><button id="home">시작 화면으로</button>${won && game.year < 3 ? '<button id="next-year" class="primary">다음 연차 시작 →</button>' : ""}</div>${won && game.year === 3 ? '<p class="sub">부모님과의 재회, 그리고 마법사의 첫걸음.<br>다음 작품 구상: 호그와트에서 시작되는 마법 디펜스.</p>' : ""}`,
  );
  $("again").onclick = () => {
    begin();
  };
  $("home").onclick = goTitle;
  if ($("next-year"))
    $("next-year").onclick = () => {
      selectedYear = game.year + 1;
        begin();
    };
}
function showPrologue() {
  storyPrologue=true;
  storyPreview=false;
  storyYear=1;
  openStory(PROLOGUE);
}
function showEnding(preview = false) {
  storyPreview = preview;
  storyYear = preview ? (previewYear ?? selectedYear) : game.year;
  storyPrologue = preview && storyYear === 0;
  openStory(storyPrologue ? PROLOGUE : chapter(storyYear));
}
function openStory(config) {
  ending = config.ending;
  endingPage = 0;
  storyPlayback.paused = false;
  for (const name of new Set(config.images)) { const image = new Image(); image.src = `/assets/${name}.png`; }
  if (sound) storyMusic.unlock();
  renderEnding();
}
function finishStory() {
  if (storyPrologue && !storyPreview) {
    storyPrologue=false;
    store.write("prologueSeen",true);
    begin(null,true);
    return;
  }
  storyPrologue=false;
  if (storyPreview) {
    storyPreview = false;
    closeModal();
    $("start").focus();
  } else showResult(true);
}
function advanceStory() {
  if (endingPage + 1 >= ending.length) finishStory();
  else { endingPage++; renderEnding(); }
}
function renderEnding() {
  const config = storyPrologue ? PROLOGUE : chapter(storyYear);
  const shot = config.shots?.[endingPage] || {};
  const [title, text] = ending[endingPage];
  const finale = storyYear === 3 && endingPage === ending.length - 1;
  const imageName = config.images[endingPage];
  const oldFigure = modalKind === "ending" ? $("modal-content").querySelector(".story-scene") : null;
  storyMusic.select(shot.cue ?? Math.min(2, Math.floor(endingPage * 3 / ending.length)), storyYear);
  const copy = text.split("\n").map((line, i) => `<span class="subtitle-line ${finale ? 'wizard-reveal' : ''}" style="--line-delay:${0.15 + i * 0.22}s">${line}</span>`).join("");
  showModal("ending", `<figure class="story-scene" data-image="${imageName}" data-mood="${shot.mood || 'warm'}"><img class="${shot.still ? 'story-still' : ''}" src="/assets/${imageName}.png" alt="${config.name} · ${title}" style="transform-origin:${shot.focus || '50% 50%'}"><div class="story-motes" aria-hidden="true">✧　 ·　　 ✦　　 ·　 ✧</div></figure><span class="eyebrow">${storyPreview ? '관리자 미리보기' : storyPrologue ? "프롤로그 · 원작에서 이어지는 이야기" : `${storyYear}년차 · ${config.name}`} · ${endingPage + 1} / ${ending.length}</span><h2 id="modal-title">${title}</h2><div class="ending-copy" aria-live="polite"><span class="story-speaker">${shot.speaker || '다람이'}</span>${copy}</div><div class="story-progress" aria-hidden="true"><i id="story-progress-fill"></i></div><div class="modal-actions"><button id="previous-story" ${endingPage === 0 ? 'disabled' : ''}>이전</button><button id="story-auto">${storyPlayback.paused ? '자동 재생' : '일시정지'}</button><button id="next-story" class="primary">${endingPage === ending.length - 1 ? (storyPrologue ? '숲으로 출발' : '한 해 마무리') : '다음'}</button><button id="story-sound">${sound ? '음악 끄기' : '음악 켜기'}</button><button id="skip-story">${storyPreview ? '닫기' : '건너뛰기'}</button></div>`);
  const figure = $("modal-content").querySelector('.story-scene');
  if (oldFigure?.dataset.image === imageName) {
    // Subtitle-only update: preserve image, framing and animation time exactly.
    oldFigure.querySelector('img').alt = `${config.name} · ${title}`;
  } else if (oldFigure) {
    const previous = oldFigure.querySelector('img:not(.story-outgoing)').cloneNode();
    previous.className = 'story-outgoing';
    previous.alt = '';
    previous.setAttribute('aria-hidden', 'true');
    figure.append(previous);
  }
  storyPlayback.start(text, finale);
  $("previous-story").onclick = () => {
    if (endingPage > 0) { endingPage--; renderEnding(); }
  };
  $("story-auto").onclick = () => {
    storyPlayback.paused = !storyPlayback.paused;
    $("story-auto").textContent = storyPlayback.paused ? '자동 재생' : '일시정지';
  };
  $("next-story").onclick = advanceStory;
  $("skip-story").onclick = finishStory;
  updateSoundControl($("story-sound"), sound);
  $("story-sound").onclick = () => {
    $("sound").click();
    if (sound) storyMusic.unlock();
    updateSoundControl($("story-sound"), sound);
  };
}
function showHelp() {
  const previousModal = modalKind;
  helpWasPlaying = game.state === "playing";
  if (helpWasPlaying) game.state = "paused";
  if (game.state === "levelup") return;
  showModal(
    "help",
    `<span class="eyebrow">조작법</span><h2 id="modal-title">숲에서 살아남기</h2><div class="help-list"><p><span>이동</span><span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / 방향키</span></p><p><span>공격</span><span>가까운 적을 향해 자동 공격</span></p><p><span>성장</span><span>작은 빛을 모아 레벨업</span></p><p><span>특별 도토리</span><span>회복 · 자석 · 공격 강화</span></p><p><span>장착 무기</span><span>14종 중 최대 6칸</span></p><p><span>일시정지</span><span><kbd>ESC</kbd></span></p></div><p class="sub">사계절을 버틴 뒤 각 연차의 보스를 쓰러뜨리세요.<br>이야기는 한 해를 마친 뒤에 이어집니다.</p><div class="modal-actions"><button class="primary" id="close-help">알겠어요</button></div>`,
  );
  $("close-help").onclick = () => {
    closeModal();
    if (helpWasPlaying) game.resume();
    else if (game.state === "paused") showPause();
    else if (previousModal === "ending") renderEnding();
    else if (game.state === "won" || game.state === "dead")
      showResult(game.state === "won");
  };
}
function updateHud() {
  if (game.state === "title") return;
  const p = game.player;
  $("health-text").textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $("health-fill").style.width = `${(p.hp / p.maxHp) * 100}%`;
  $("timer").textContent = game.boss
    ? format(game.time - game.seasonDuration * 4)
    : format((game.season + 1) * game.seasonDuration - game.time);
  $("season-label").textContent = game.boss
    ? `${game.year}년차 · ${chapter(game.year).bossName}${game.boss.combatPhase ? ` · P${game.boss.combatPhase} ${game.boss.patternName || ""}` : ""}`
    : `${game.year}년차 · ${SEASONS[game.season].name}${game.quick ? " · 체험" : ""}`;
  $("kills").textContent = game.kills;
  $("level").textContent = `LV. ${game.level}`;
  $("xp-fill").style.width =
    `${Math.min(100, (game.xp / xpRequired(game.level)) * 100)}%`;
  $("xp-text").textContent =
    `${Math.floor(game.xp)} / ${xpRequired(game.level)}`;
  $("power-label").textContent =
    p.power > 0
      ? `도토리의 힘 ${Math.ceil(p.power)}초`
      : game.year === 2 && inWater(p.x, p.y)
        ? "얕은 물 · 이동 속도 −16%"
        : "";
  [...$("season-dots").children].forEach((el, i) =>
    el.classList.toggle("on", i <= game.season),
  );
  $("boss-hud").hidden = !game.boss || game.boss.hp <= 0;
  if (game.boss)
    $("boss-hud").querySelector("span").textContent = chapter(
      game.year,
    ).bossName;
  if (game.boss)
    $("boss-fill").style.width =
      `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
  if (game.mode === "hell") {
    const live = game.enemies.filter(e => e.type === "boss" && e.hp > 0);
    $("timer").textContent = format(game.time);
    $("season-label").textContent = game.time < 1800 ? `헬 모드 · 다음 보스 ${format(Math.max(0, hellBossTime(game.hellBossIndex) - game.time))}` : "헬 모드 · 끝없는 겨울";
    if (game.boss) $("boss-hud").querySelector("span").textContent = `${chapter(game.boss.bossYear).bossName}${live.length > 1 ? ` · 보스 ${live.length}체 생존` : ""}`;
    $("power-label").textContent = p.power > 0 ? `도토리의 힘 ${Math.ceil(p.power)}초` : `보스 ${game.hellBossKills.length}회 격파 · ${game.time >= 1800 ? "무한 생존" : "30분 보스 러시"}`;
  }
  const key =
    game.weapons.map((w) => w.id + w.level).join(",") +
    JSON.stringify(game.passives);
  if (key !== lastSlots) {
    lastSlots = key;
    $("weapon-slots").innerHTML = Array.from({ length: 6 }, (_, i) => {
      const w = game.weapons[i];
      return w
        ? `<div class="weapon-slot" role="img" aria-label="${BY_ID[w.id].name} 레벨 ${w.level}" title="${BY_ID[w.id].name} · 레벨 ${w.level}/${BY_ID[w.id].max}" style="--weapon-color:${BY_ID[w.id].color}">${itemIcon(w.id)}<small>${w.level === BY_ID[w.id].max ? "MAX" : "LV." + w.level}</small></div>`
        : `<div class="weapon-slot empty" aria-label="빈 무기 슬롯 ${i + 1}"><span>${i + 1}</span></div>`;
    }).join("");
    $("passive-slots").innerHTML = Object.entries(game.passives)
      .map(([id, lv]) => {
        const p = PASSIVES.find((x) => x.id === id);
        return `<span role="img" aria-label="${p.name} 레벨 ${lv}" title="${p.name} · 레벨 ${lv}">${itemIcon(id)}<small>${lv}</small></span>`;
      })
      .join("");
  }
}
$("start").onclick = () => begin();
$("continue").onclick = () => begin(store.read("checkpoint"));
$("pause").onclick = () => game.pause();
$("help").onclick = showHelp;
$("sound").onclick = () => {
  sound = !sound;
  store.write("sound", sound);
  updateSound();
  music.setEnabled(sound);
  if (sound) music.unlock(game.season);
  tone(550, 0.12);
};
function updateSound() {
  updateSoundControl($("sound"), sound);
}
updateSound();
$("normal-mode").onclick = () => setMode("story");
$("hell-mode").onclick = () => setMode("hell");
function setMode(mode = "story") {
  if (mode === "hell" && !hellUnlocked(progress())) {
    toast("스토리 모드 1~3년차를 모두 완료하면 헬 모드가 열립니다.");
    return;
  }
  selectedMode = mode;
  if (!canPlayYear(selectedYear, progress(), quick)) {
    selectedYear = 1;
    game.year = 1;
  }
  updateChapters();
  updateContinue();
  updateRecord();
  for (const [id, selected] of [
    ["normal-mode", mode === "story"],
    ["hell-mode", mode === "hell"],
  ]) {
    $(id).classList.toggle("selected", selected);
    $(id).setAttribute("aria-pressed", String(selected));
  }
}
const moveKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);
window.addEventListener("keydown", (e) => {
  if (moveKeys.has(e.code) && game.state !== "title") {
    e.preventDefault();
    if (game.state === "playing") keys.add(e.code);
  }
  if (e.code === "Escape") {
    if (storyPreview && modalKind === "ending") {
      finishStory();
      return;
    }
    e.preventDefault();
    if (game.state === "playing") game.pause();
    else if (modalKind === "pause") {
      closeModal();
      game.resume();
    } else if (modalKind === "help") $("close-help")?.click();
  }
  if (
    game.state === "levelup" &&
    ["Digit1", "Digit2", "Digit3"].includes(e.code) &&
    !e.repeat
  ) {
    e.preventDefault();
    game.choose(Number(e.code.at(-1)) - 1);
  }
  if (e.key === "Tab" && !$("modal").hidden) {
    const items = [
      ...$("modal-content").querySelectorAll("button:not(:disabled), summary"),
    ];
    if (items.length) {
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
function focusLost() {
  music.suspend();
  keys.clear();
  touchDown.clear();
  touch = { x: 0, y: 0 };
  if (game.state === "playing") game.pause();
}
window.addEventListener("blur", focusLost);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) focusLost();
});
const touchDown = new Set();
const updateTouch = () => {
  touch.x = Number(touchDown.has("right")) - Number(touchDown.has("left"));
  touch.y = Number(touchDown.has("down")) - Number(touchDown.has("up"));
};
for (const b of $("touch-pad").querySelectorAll("button")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    touchDown.add(b.dataset.dir);
    updateTouch();
  };
  b.onpointerup =
    b.onpointercancel =
    b.onlostpointercapture =
      () => {
        touchDown.delete(b.dataset.dir);
        updateTouch();
      };
}
new ResizeObserver(() => renderer.resize()).observe($("game-shell"));
let previous = performance.now(),
  accumulator = 0,
  lastUI = 0;
function loop(now) {
  const elapsed = Math.min(0.1, (now - previous) / 1000);
  previous = now;
  if (game.state === "playing") {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps++ < 6) {
      const x =
          Number(keys.has("KeyD") || keys.has("ArrowRight")) -
          Number(keys.has("KeyA") || keys.has("ArrowLeft")) +
          touch.x,
        y =
          Number(keys.has("KeyS") || keys.has("ArrowDown")) -
          Number(keys.has("KeyW") || keys.has("ArrowUp")) +
          touch.y;
      game.step(1 / 60, { x, y });
      accumulator -= 1 / 60;
      if (game.state !== "playing") {
        accumulator = 0;
        break;
      }
    }
  } else accumulator = 0;
  music.update(elapsed, {
    active:
      !document.hidden && game.state !== "paused" && modalKind !== "ending",
    duck: game.state === "levelup" ? 0.45 : game.state === "won" ? 0.7 : 1,
  });
  storyMusic.update(modalKind === "ending" && sound && !document.hidden);
  if (modalKind === "ending") {
    const sceneImage = $("modal-content").querySelector('.story-scene img:not(.story-outgoing)');
    const ready = sceneImage?.complete && sceneImage.naturalWidth > 0;
    if (storyPlayback.tick(elapsed, !document.hidden && ready)) advanceStory();
    const progress = $("story-progress-fill");
    if (progress) progress.style.transform = `scaleX(${storyPlayback.progress})`;
  }
  renderer.draw(now);
  if (now - lastUI > 80) {
    updateHud();
    lastUI = now;
  }
  requestAnimationFrame(loop);
}
renderer
  .load()
  .then(() => {
    $("loading").hidden = true;
    $("title-screen").hidden = false;
  document.body.classList.add("is-menu");
    renderer.resize();
    updateRecord();
    updateChapters();
    updateContinue();
    if (previewYear !== null) showEnding(true);
    else playIntro({onFinish: () => $("start").focus({preventScroll:true})});
    requestAnimationFrame(loop);
  })
  .catch((error) => {
    $("loading").innerHTML =
      `<p>${error.message}</p><button class="icon-button" id="reload">다시 불러오기</button>`;
    $("reload").onclick = () => location.reload();
  });
// Structured tools are available only when the browser implements WebMCP.
try {
  if (document.modelContext?.registerTool) {
    void Promise.resolve(
      document.modelContext.registerTool({
        name: "daram_game_status",
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        description:
          "Read the current Darami Adventure 2 run state, season, health and equipped weapons.",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                state: game.state,
                season: SEASONS[game.season].name,
                level: game.level,
                time: game.time,
                health: game.player.hp,
                weapons: game.weapons.map((w) => ({
                  name: BY_ID[w.id].name,
                  level: w.level,
                })),
              }),
            },
          ],
        }),
      }),
    ).catch(() => {});
  }
} catch {
  /* Optional WebMCP registration does not block the game. */
}
