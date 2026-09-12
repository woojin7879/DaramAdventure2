import { FINAL_ENDING, FINAL_IMAGES, FINAL_SHOTS } from "./final-story.js";
import { ending } from "./data.js";
export const CHAPTERS = [
  {
    id: 1,
    name: "귀환의 숲",
    en: "THE RETURNING WOODS",
    ground: "forest-ground",
    bossName: "겨울곰의 잔영",
    bossKind: "bear",
    bossHp: 4800,
    summary: "꿈 밖에서 발견한 익숙한 매듭",
    ending,
    images: ["ending-1", "ending-2", "ending-3"],
    enemyWeights: null,
  },
  {
    id: 2,
    name: "물길 너머의 숲",
    en: "BEYOND THE RIVER",
    ground: "river-ground",
    bossName: "검은 물의 뱀",
    bossKind: "serpent",
    bossHp: 5600,
    summary: "얼어붙은 물길, 누군가를 위한 저장터",
    ending: [
      ['누군가를 위한 겨울', '네 엄마 아빠는 예전부터 여기에 먹이를 나눠 뒀어.\n길을 잃으면 이 매듭을 따라가라고 했지.'],
      ['물길의 수호자', '뱀은 물길의 수호자였어. 상류의 검은 서리에 변해 버렸지.\n그 서리는 겨울마다 뭉쳐서 모습을 드러내.'],
      ['상류로 이어지는 길', '나도 도토리를 놓고 갈게. 봄엔 상류로 갈 거야.\n그 서리가 두 분의 길도 막았을까? 다음 겨울엔 근원을 찾아볼래.'],
    ],
    shots: [{ speaker: '숲쥐' }, { speaker: '숲쥐' }, { speaker: '다람이' }],
    images: ["year2-story", "year2-story", "year2-story"],
    enemyWeights: [
      { snake: 88, fox: 0, bat: 0, mushroom: 12, boar: 0 },
      { snake: 48, fox: 15, bat: 12, mushroom: 25, boar: 0 },
      { snake: 38, fox: 15, bat: 15, mushroom: 24, boar: 8 },
      { snake: 35, fox: 15, bat: 15, mushroom: 25, boar: 10 },
    ],
  },
  {
    id: 3,
    name: "오래된 뿌리의 숲",
    en: "ROOTS OF THE FIRST SPRING",
    ground: "roots-ground",
    bossName: "긴 겨울의 심장",
    bossKind: "heart",
    bossHp: 6500,
    summary: "서리의 근원에서 다시 피어나는 봄",
    ending: FINAL_ENDING,
    images: FINAL_IMAGES,
    shots: FINAL_SHOTS,
    enemyWeights: [
      { snake: 90, fox: 0, bat: 0, mushroom: 10, boar: 0 },
      { snake: 38, fox: 27, bat: 15, mushroom: 12, boar: 8 },
      { snake: 25, fox: 24, bat: 12, mushroom: 19, boar: 20 },
      { snake: 20, fox: 22, bat: 15, mushroom: 18, boar: 25 },
    ],
  },
];
export const chapter = (year) => CHAPTERS[year - 1] || CHAPTERS[0];
export function clearedYears(value, legacy = false) {
  return [
    ...new Set([
      ...(Array.isArray(value) ? value : []),
      ...(legacy ? [1] : []),
    ]),
  ]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 3)
    .sort();
}
export const canPlayYear = (year, cleared, quick = false) =>
  Number.isInteger(year) &&
  year >= 1 &&
  year <= 3 &&
  (quick || year === 1 || cleared.includes(year - 1));
export const riverX = (y) => 1200 + Math.sin(y / 310) * 210;
export const riverCrossing = (y) =>
  [600, 1200, 1800].some((c) => Math.abs(y - c) < 100);
export const inWater = (x, y) =>
  !riverCrossing(y) && Math.abs(x - riverX(y)) < 110;
