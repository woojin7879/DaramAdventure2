import { opaqueBossAtlas } from "./boss-opacity.js";
// Row-major coordinates in the generated 5 × 4 inventory atlas.
export const ITEM_ICONS = Object.freeze([
  "acorn", "tail", "stone", "vine", "fire",
  "lightning", "ice", "bounce", "charm", "spore",
  "bee", "turret", "boomerang", "seed", "might",
  "haste", "speed", "health", "magnet", "area",
]);
export function itemIcon(id) {
  const key = id === "heal" ? "health" : id;
  const index = ITEM_ICONS.indexOf(key);
  if (index < 0) return "";
  return `<span class="item-icon" data-icon="${key}" aria-hidden="true" style="background-position:${(index % 5) * 25}% ${Math.floor(index / 5) * 100 / 3}%"></span>`;
}

let prepared;
export function prepareItemIcons() {
  return prepared ??= new Promise((resolve, reject) => {
    const source = new Image();
    source.onload = () => {
      try {
        // Use the same exterior-only black matte handling as the game sprites.
        const atlas = opaqueBossAtlas(source, 5, 4);
        document.documentElement.style.setProperty("--item-atlas", `url("${atlas.toDataURL()}")`);
        resolve();
      } catch (error) { reject(error); }
    };
    source.onerror = () => reject(new Error("아이콘 이미지를 불러오지 못했습니다."));
    source.src = "/assets/inventory-icons.png";
  });
}
