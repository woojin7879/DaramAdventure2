// Player world position is the feet. Orbiting equipment uses the torso instead.
export const bodyCenter = (player) => ({ x: player.x, y: player.y - 16 });
export function stoneOrbit(game, stats, index) {
  const center = bodyCenter(game.player);
  const outer = stats.double && index >= 2;
  const radius = stats.double
    ? (outer ? 85 : 45) * (1 + (game.passives.area || 0) * 0.1)
    : stats.range;
  const direction = outer ? -1 : 1;
  const angle =
    ((game.time * stats.speed * Math.PI) / 180) * direction +
    (index * Math.PI * 2) / (stats.double ? 2 : stats.count);
  return {
    ...center,
    cx: center.x,
    cy: center.y,
    radius,
    direction,
    angle,
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

// The atlas flame points down-left; rotate around its bright leading core.
export const fireRotation = (vx, vy) => Math.atan2(vy, vx) - (Math.PI * 3) / 4;

export function distanceToSegment(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    den = dx * dx + dy * dy;
  const t = den
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / den))
    : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
