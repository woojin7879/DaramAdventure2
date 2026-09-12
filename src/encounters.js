// Scripted encounter budget, independent of player equipment and screen resolution.
const stages = [
  [0, 2.6, 12],
  [30, 2.35, 16],
  [60, 1.4, 28],
  [120, 0.85, 48],
  [180, 0.68, 64],
  [300, 0.6, 90],
  [600, 0.5, 116],
  [900, 0.48, 140],
  [1200, 0.3, 180],
];
export function encounterBudget(time, seasonDuration, season, boss = false) {
  const t = Math.min(1200, (time * 300) / seasonDuration);
  let index = stages.findIndex((s) => s[0] >= t);
  if (index < 1) index = 1;
  const a = stages[index - 1],
    b = stages[index];
  const blend = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
  const mushroomReady = t >= 60 && time >= 35;
  const weights =
    season === 0
      ? {
          snake: t < 180 ? 88 : 80,
          fox: 0,
          bat: 0,
          mushroom: mushroomReady ? (t < 180 ? 12 : 20) : 0,
          boar: 0,
        }
      : season === 1
        ? { snake: 42, fox: 25, bat: 15, mushroom: 18, boar: 0 }
        : season === 2
          ? { snake: 25, fox: 26, bat: 15, mushroom: 22, boar: 12 }
          : { snake: 20, fox: 24, bat: 16, mushroom: 20, boar: 20 };
  return {
    interval: boss ? 3 : a[1] + (b[1] - a[1]) * blend,
    cap: boss ? 40 : Math.round(a[2] + (b[2] - a[2]) * blend),
    mushroomCap: mushroomReady
      ? season === 0
        ? t < 180
          ? 2
          : 6
        : [6, 10, 14, 18][season]
      : 0,
    weights,
    shotCap: [12, 24, 36, 48][season],
  };
}
export function pickEnemy(budget, enemies, random) {
  const mushrooms = enemies.filter(
    (e) => e.hp > 0 && !e.escaped && e.type === "mushroom",
  ).length;
  const pool = Object.entries(budget.weights).filter(
    ([id, weight]) =>
      weight > 0 && (id !== "mushroom" || mushrooms < budget.mushroomCap),
  );
  let roll = random() * pool.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [id, weight] of pool) {
    roll -= weight;
    if (roll < 0) return id;
  }
  return "snake";
}
