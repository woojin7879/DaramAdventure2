import { encounterBudget } from './encounters.js';

export const hellUnlocked = (cleared) => [1, 2, 3].every(year => cleared.includes(year));
export const hellBossYear = (index) => index % 3 + 1;
export const hellBossTime = (index) => index < 3 ? (index + 1) * 600 : 1800 + (index - 2) * 300;
export const hellOvertime = (time) => Math.max(0, (time - 1800) / 60);
// Overtime is a record chase, not a clearable stage: enemy health compounds
// (~2x every 10 minutes) so any build eventually falls behind.
export const HELL_HEALTH_SURGE = 1.07;
export const HELL_DAMAGE_SURGE = 1.04;
export function hellDifficulty(time) {
  const ramp = Math.min(1, time / 1800);
  const overtime = hellOvertime(time);
  const surge = HELL_HEALTH_SURGE ** overtime;
  return {
    health: (1.3 + ramp * .8) * surge,
    damage: (1.2 + ramp * .3) * HELL_DAMAGE_SURGE ** overtime,
    speed: 1.12 + ramp * .1 + Math.min(.2, overtime * .012),
    bossHealth: (1.25 + ramp * .75) * surge,
  };
}
// Elite mini-bosses arrive faster the longer the run goes: 55s → 25s over 20 overtime minutes.
export const hellEliteInterval = (time) => Math.max(25, 55 - hellOvertime(time) * 1.5);
export function hellBudget(time, season) {
  const budget = encounterBudget(time, 300, season, false);
  const ramp = Math.min(1, time / 1800);
  const overtime = hellOvertime(time);
  return {
    ...budget,
    // 240 at 30:00, +4 per overtime minute up to 320.
    cap: Math.min(240, Math.round(budget.cap * 1.35)) + Math.min(80, Math.floor(overtime) * 4),
    interval: Math.max(.14, budget.interval * .72 / (1 + Math.max(0, time - 1800) / 1800)),
    mushroomCap: time < 60 ? 0 : Math.min(22, 3 + Math.floor(time / 90)),
    boarCap: time < 180 ? 0 : Math.min(24, 10 + Math.floor(time / 300)),
    shotCap: Math.round(24 + ramp * 48),
    weights: time < 60 ? {snake:90,fox:10,bat:0,mushroom:0,boar:0}
      : time < 180 ? {snake:60,fox:20,bat:10,mushroom:10,boar:0}
      : {snake:22,fox:23,bat:18,mushroom:18,boar:19},
  };
}
