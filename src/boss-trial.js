// Reuse real boss AI and tuning without campaign timers, unlocks or storage.
export function restartBossTrial(game, { stage = 1, invincible = true } = {}) {
  game.sandbox = true;
  game.sandboxMortal = true;
  game.sandboxInvincible = invincible;
  game.state = 'playing';
  game.time = game.seasonDuration * 4;
  game.season = 3;
  game.shake = 0;
  for (const key of ['enemies', 'enemyShots', 'drops', 'bullets', 'zones', 'bees', 'turrets', 'hazards', 'fx', 'floaters']) game[key] = [];
  Object.assign(game.player, { x: game.year === 2 ? 900 : 1200, y: 1200, hp: game.player.maxHp, invuln: 0, power: 0, moving: false });
  const boss = game.spawn('boss');
  boss.x = game.player.x + 300;
  boss.y = game.player.y;
  boss.heading = Math.PI;
  boss.hp = boss.maxHp * Math.max(.01, Math.min(1, Number(stage) || 1));
  game.grid.rebuild(game.enemies);
  return boss;
}
