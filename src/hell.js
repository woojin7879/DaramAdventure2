import { encounterBudget } from './encounters.js';

export const hellUnlocked = (cleared) => [1, 2, 3].every(year => cleared.includes(year));
export const hellBossYear = (index) => index % 3 + 1;
export const hellBossTime = (index) => index < 3 ? (index + 1) * 600 : 1800 + (index - 2) * 300;
export function hellDifficulty(time) {
  const ramp = Math.min(1, time / 1800);
  const overtime = Math.max(0, (time - 1800) / 60);
  return {
    health: 1.3 + ramp * .8 + overtime * .12,
    damage: 1.2 + ramp * .3 + overtime * .05,
    speed: 1.12 + ramp * .1 + Math.min(.2, overtime * .008),
    bossHealth: 1.25 + ramp * .75 + overtime * .15,
  };
}
export function hellBudget(time, season) {
  const budget = encounterBudget(time, 300, season, false);
  const ramp = Math.min(1, time / 1800);
  return {
    ...budget,
    cap: Math.min(240, Math.round(budget.cap * 1.35)),
    interval: Math.max(.14, budget.interval * .72 / (1 + Math.max(0, time - 1800) / 1800)),
    mushroomCap: time < 60 ? 0 : Math.min(22, 3 + Math.floor(time / 90)),
    boarCap: time < 180 ? 0 : Math.min(18, 8 + Math.floor(time / 300)),
    shotCap: Math.round(24 + ramp * 48),
    weights: time < 60 ? {snake:90,fox:10,bat:0,mushroom:0,boar:0}
      : time < 180 ? {snake:60,fox:20,bat:10,mushroom:10,boar:0}
      : {snake:22,fox:23,bat:18,mushroom:18,boar:19},
  };
}
