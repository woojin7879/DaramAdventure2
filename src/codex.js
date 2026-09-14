import { EVOLUTIONS, BY_ID, PASSIVES } from "./data.js";
import { itemIcon } from "./item-icons.js";

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const passiveName = (id) => PASSIVES.find((p) => p.id === id)?.name || id;

// Evolutions discovered across all runs. Discovery is permanent, so the codex is
// meta-progression: the recipe is always visible, the result stays hidden until earned.
export const codexProgress = (seen) => ({ found: EVOLUTIONS.filter((e) => seen.includes(e.id)).length, total: EVOLUTIONS.length });

export const addDiscovery = (seen, id) => (BY_ID[id]?.evolved && !seen.includes(id) ? [...seen, id] : seen);

export function codexHTML(seen = []) {
  const { found, total } = codexProgress(seen);
  const cards = EVOLUTIONS.map((e) => {
    const base = BY_ID[e.base];
    const unlocked = seen.includes(e.id);
    const recipe = `${itemIcon(base.id)} <span>${escape(base.name)} Lv.${base.max}</span><i aria-hidden="true">+</i>${itemIcon(e.requires)} <span>${escape(passiveName(e.requires))} Lv.1</span>`;
    return `<li class="codex-card${unlocked ? " unlocked" : " locked"}" data-id="${e.id}">
      <div class="codex-icon">${itemIcon(e.id)}</div>
      <div class="codex-body">
        <b class="codex-name">${unlocked ? escape(e.name) : "? ? ?"}</b>
        <small class="codex-tag">${unlocked ? escape(e.tag) : "아직 만나지 못한 진화"}</small>
        <p class="codex-desc">${unlocked ? escape(e.desc) : `${escape(base.name)}의 진화형. 보물상자에서 깨어납니다.`}</p>
        <p class="codex-recipe" aria-label="진화 조건">${recipe}</p>
      </div>
    </li>`;
  });
  return `<p class="codex-progress"><b>${found}</b> / ${total} 발견${found === total ? " · 숲의 모든 진화를 깨웠습니다" : ""}</p>
    <ol class="codex-grid">${cards.join("")}</ol>`;
}
