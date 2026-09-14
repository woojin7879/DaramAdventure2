import { EVOLUTIONS, BY_ID, PASSIVES } from "./data.js";
import { itemIcon } from "./item-icons.js";

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const passiveName = (id) => PASSIVES.find((p) => p.id === id)?.name || id;

// Evolutions discovered across all runs. Discovery is permanent, so the codex is
// meta-progression: name, effect and recipe all stay hidden until the evolution is earned once.
export const codexProgress = (seen) => ({ found: EVOLUTIONS.filter((e) => seen.includes(e.id)).length, total: EVOLUTIONS.length });

export const addDiscovery = (seen, id) => (BY_ID[id]?.evolved && !seen.includes(id) ? [...seen, id] : seen);

export const codexCountHTML = (seen = []) => {
  const { found, total } = codexProgress(seen);
  return `<p class="codex-progress"><b>${found}</b> / ${total} 발견</p>`;
};

export function codexHTML(seen = []) {
  const cards = EVOLUTIONS.map((e) => {
    const base = BY_ID[e.base];
    const unlocked = seen.includes(e.id);
    const pair = (left, right) =>
      `<span class="codex-combo">${left}<i aria-hidden="true">+</i>${right}</span>`;
    const recipe = unlocked
      ? pair(
          `<span class="codex-part">${itemIcon(base.id)}<span>${escape(base.name)} Lv.${base.max}</span></span>`,
          `<span class="codex-part">${itemIcon(e.requires)}<span>${escape(passiveName(e.requires))} Lv.${PASSIVES.find((p) => p.id === e.requires).max}</span></span>`,
        )
      : `${pair(`<span class="codex-part"><span class="codex-unknown">?</span></span>`, `<span class="codex-part"><span class="codex-unknown">?</span></span>`)}<span class="codex-hint">조합은 발견 후 공개</span>`;
    return `<li class="codex-card${unlocked ? " unlocked" : " locked"}" data-id="${e.id}">
      <div class="codex-icon">${itemIcon(e.id)}</div>
      <div class="codex-body">
        <b class="codex-name">${unlocked ? escape(e.name) : "? ? ?"}</b>
        <small class="codex-tag">${unlocked ? escape(e.tag) : "아직 만나지 못한 진화"}</small>
        <p class="codex-desc">${unlocked ? escape(e.desc) : "어떤 무기와 패시브가 만나는지는 직접 깨워야 알 수 있습니다."}</p>
        <p class="codex-recipe" aria-label="진화 조건">${recipe}</p>
      </div>
    </li>`;
  });
  return `<ol class="codex-grid">${cards.join("")}</ol>`;
}
