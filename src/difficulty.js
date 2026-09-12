// Ease in after spring so each fresh build gets the same opening breathing room.
export function yearDifficulty(year, progress) {
  const ramp = Math.max(0, Math.min(1, (progress - 0.25) / 0.5));
  const profile = year === 1
    ? { health: -0.15, boss: 0.9, damage: -0.1, cap: -0.1, interval: 0.08 }
    : year === 2
      ? { health: -0.08, boss: 0.94, damage: -0.05, cap: -0.04, interval: 0.04 }
      : { health: 0.08, boss: 1.06, damage: 0.05, cap: 0.04, interval: -0.04 };
  return {
    health: 1 + ramp * profile.health,
    bossHealth: profile.boss,
    damage: 1 + ramp * profile.damage,
    cap: 1 + ramp * profile.cap,
    interval: 1 + ramp * profile.interval,
  };
}
