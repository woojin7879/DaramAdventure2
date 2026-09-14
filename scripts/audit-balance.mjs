// Controlled damage probes, not a full-run win-rate benchmark.
// Run: node scripts/audit-balance.mjs > /tmp/daram-balance.json
import { Game } from '../src/game.js';
import { WEAPONS } from '../src/data.js';

function probe(weapon, level, radius, count, targetRadius = 13) {
  const g = new Game({ random: () => 0.5 });
  g.start();
  g.sandbox = true;
  g.weapons = [];
  g.addWeapon(weapon.id);
  g.weapons[0].level = level;
  g.player.invuln = 1e6;
  g.updateEnemy = () => {};
  const positions = [];
  for (let i = 0; i < count; i++) {
    const e = g.spawn('snake');
    const a = count === 1 ? 0 : i * Math.PI * 2 / count;
    Object.assign(e, { x:g.player.x + Math.cos(a)*radius,
      y:g.player.y - 16 + Math.sin(a)*radius, hp:1e9, maxHp:1e9, r:targetRadius, damage:0 });
    positions.push({e,x:e.x,y:e.y});
  }
  for (let i = 0; i < 3600; i++) {
    // Ignore knockback displacement so every weapon sees the same geometry.
    for (const {e,x,y} of positions) Object.assign(e,{x,y});
    g.step(1/60);
  }
  return +(g.runStats.weapons[weapon.id].damage / 60).toFixed(2);
}

const results = WEAPONS.map(w => ({
  id:w.id, name:w.name,
  levels: Array.from({length:w.max}, (_,i) => i+1).map(level => ({level,
    nearSingle:probe(w,level,55,1),
    farSingle:probe(w,level,180,1),
    farLarge:probe(w,level,180,1,38),
    nearCrowd:probe(w,level,55,12),
  }))
}));
console.log(JSON.stringify({seconds:60,passives:false,stationary:true,results},null,2));
