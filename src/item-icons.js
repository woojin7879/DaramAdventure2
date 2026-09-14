import { opaqueBossAtlas } from "./boss-opacity.js";
// Row-major coordinates in the generated 5 × 4 inventory atlas.
export const ITEM_ICONS = Object.freeze([
  "acorn", "tail", "stone", "vine", "fire",
  "lightning", "ice", "bounce", "charm", "spore",
  "bee", "turret", "boomerang", "seed", "might",
  "haste", "speed", "health", "magnet", "area",
]);
// Row-major coordinates in the 5 × 3 evolution atlas: fourteen evolutions, then the chest.
export const EVOLUTION_ICONS = Object.freeze([
  "harvest", "stormtail", "mountain", "oldhand", "embergrove",
  "thunder", "hibernation", "goldbounce", "blessing", "breath",
  "queenbee", "storehouse", "windboomerang", "bloomseed", "chest",
]);
const ATLASES = [
  { keys: ITEM_ICONS, columns: 5, rows: 4, name: "inventory" },
  { keys: EVOLUTION_ICONS, columns: 5, rows: 3, name: "evolution" },
];
export function itemIcon(id) {
  const key = id === "heal" ? "health" : id;
  for (const atlas of ATLASES) {
    const index = atlas.keys.indexOf(key);
    if (index < 0) continue;
    const x = (index % atlas.columns) * 100 / (atlas.columns - 1);
    const y = Math.floor(index / atlas.columns) * 100 / (atlas.rows - 1);
    return `<span class="item-icon" data-icon="${key}" data-atlas="${atlas.name}" aria-hidden="true" style="background-position:${x}% ${y}%"></span>`;
  }
  return "";
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
// The evolution sheet was generated on an even grid, so cells are uniform.
export function evolutionCrop(index, width, height) {
  const row = Math.floor(index / 5), col = index % 5;
  const inset = 4 * width / 1619;
  return [col * width / 5 + inset, row * height / 3, width / 5 - inset * 2, height / 3];
}
export function repackAtlas(source, { keys, columns, rows }, crop) {
  const clean = opaqueBossAtlas(source, columns, rows);
  const atlas = document.createElement('canvas');
  atlas.width = columns * 256; atlas.height = rows * 256;
  const c = atlas.getContext('2d');
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  for (let i = 0; i < keys.length; i++) {
    const [sx, sy, sw, sh] = crop(i, source.width, source.height);
    const scale = 232 / Math.max(sw, sh), dw = sw * scale, dh = sh * scale;
    c.drawImage(clean, sx, sy, sw, sh,
      i % columns * 256 + (256 - dw) / 2,
      Math.floor(i / columns) * 256 + (256 - dh) / 2, dw, dh);
  }
  return atlas;
}
export const repackInventory = (source) => repackAtlas(source, ATLASES[0], inventoryCrop);

function loadAtlas(file, atlas, crop, property) {
  return new Promise((resolve, reject) => {
    const source = new Image();
    source.onload = () => {
      try {
        // Use the same exterior-only black matte handling as the game sprites.
        document.documentElement.style.setProperty(property, `url("${repackAtlas(source, atlas, crop).toDataURL()}")`);
        resolve();
      } catch (error) { reject(error); }
    };
    source.onerror = () => reject(new Error("아이콘 이미지를 불러오지 못했습니다."));
    source.src = file;
  });
}
let prepared;
export function prepareItemIcons() {
  return prepared ??= Promise.all([
    loadAtlas("/assets/inventory-icons.png", ATLASES[0], inventoryCrop, "--item-atlas"),
    loadAtlas("/assets/evolution-icons.png", ATLASES[1], evolutionCrop, "--evolution-atlas"),
  ]).then(() => undefined);
}
