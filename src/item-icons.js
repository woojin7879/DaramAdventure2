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

// Calibrated row boundaries in the 1402×1122 source, before the next
// row's protruding leaves/roof. Repack into padded square cells for all UI sizes.
export function inventoryCrop(index, width, height) {
  const rows = [0, 280, 548, 806, 1122];
  const row = Math.floor(index / 5), col = index % 5;
  const inset = 4 * width / 1402;
  return [col * width / 5 + inset, rows[row] * height / 1122,
    width / 5 - inset * 2, (rows[row + 1] - rows[row]) * height / 1122];
}
export function repackInventory(source) {
  const clean = opaqueBossAtlas(source, 5, 4);
  const atlas = document.createElement('canvas');
  atlas.width = 5 * 256; atlas.height = 4 * 256;
  const c = atlas.getContext('2d');
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  for (let i = 0; i < ITEM_ICONS.length; i++) {
    const [sx, sy, sw, sh] = inventoryCrop(i, source.width, source.height);
    const scale = 232 / Math.max(sw, sh), dw = sw * scale, dh = sh * scale;
    c.drawImage(clean, sx, sy, sw, sh,
      i % 5 * 256 + (256 - dw) / 2,
      Math.floor(i / 5) * 256 + (256 - dh) / 2, dw, dh);
  }
  return atlas;
}

let prepared;
export function prepareItemIcons() {
  return prepared ??= new Promise((resolve, reject) => {
    const source = new Image();
    source.onload = () => {
      try {
        // Use the same exterior-only black matte handling as the game sprites.
        const atlas = repackInventory(source);
        document.documentElement.style.setProperty("--item-atlas", `url("${atlas.toDataURL()}")`);
        resolve();
      } catch (error) { reject(error); }
    };
    source.onerror = () => reject(new Error("아이콘 이미지를 불러오지 못했습니다."));
    source.src = "/assets/inventory-icons.png";
  });
}
