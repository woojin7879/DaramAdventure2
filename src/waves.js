import { WORLD } from './data.js';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const waveLabel = { boars:'멧돼지 포위 · 약한 뱀 구간을 뚫으세요', surround:'포위 접근 · 약한 뱀 무리를 뚫으세요', bats:'박쥐 횡단 · 비행 경로를 확인하세요', mushrooms:'버섯 포위 · 사수를 처치해 통로를 여세요' };

export function bossWavePressure(g) {
  const bosses=g.enemies.filter(e=>e.type==='boss'&&e.hp>0);
  const elapsed=bosses.reduce((max,e)=>Math.max(max,g.time-(e.spawnedAt ?? g.time)),0);
  const stage=elapsed>=240?3:elapsed>=180?2:elapsed>=120?1:0;
  const difficulty=g.mode==='hell'?3:g.year-1;
  const base=Math.max(34,68-difficulty*8-g.season*4)+(bosses.length?12:0);
  return {stage,interval:Math.max(18,base*[1,0.72,0.5,0.36][stage]),rest:[30,24,18,12][stage]};
}

export function planWave(g, kind) {
  const hard = g.mode === 'hell' ? 3 : g.year - 1;
  const delay = 1.25;
  const move = g.player.moving ? g.attackDirection || {x:0,y:0} : {x:0,y:0};
  const playerSpeed = 135 * (1 + (g.passives.speed || 0) * 0.08);
  const flightTime = 0.9;
  const flightSpeed = 280 + g.season * 15;
  // Bat rows are anchored on the player and long enough to cover both continuing
  // straight and turning back; the answer is to thin the row, not to outrun it.
  const reach = playerSpeed*(delay+flightTime);
  const center = {x:g.player.x,y:g.player.y};
  let rotation = kind === 'bats' && (move.x || move.y)
    ? Math.atan2(move.y,move.x)+Math.PI/2 : g.random()*Math.PI*2;
  if (kind !== "bats" && Math.min(g.player.x,g.player.y,WORLD-g.player.x,WORLD-g.player.y)<400)
    rotation=Math.atan2(WORLD/2-g.player.y,WORLD/2-g.player.x)-Math.PI*0.18;
  const points = [];
  const radius = Math.max(310,playerSpeed*delay+90)+g.season*10;
  if (kind === 'bats') {
    const lanes = 2 + Math.min(2, hard);
    const directions=[0,Math.PI,Math.PI/2,Math.PI*1.5];
    for (let lane=0; lane<lanes; lane++) {
      const a=rotation+directions[lane];
      // Odd count guarantees a bat directly on the player's line. Crossing rows
      // (lanes 0·1) span the distance the player can cover forward or backward
      // before the row arrives; head-on/chasing rows keep their width.
      const half=lane<2 ? Math.min(16,Math.ceil((reach+60)/30)) : 7+Math.floor(g.season/2);
      const count=half*2+1;
      for(let i=0;i<count;i++) {
        const offset=(i-(count-1)/2)*30;
        const x=center.x+Math.cos(a)*flightSpeed*flightTime-Math.sin(a)*offset;
        const y=center.y+Math.sin(a)*flightSpeed*flightTime+Math.cos(a)*offset;
        points.push({x,y,type:'bat',heading:a+Math.PI,flightSpeed,laneOffset:offset});
      }
    }
  } else {
    // Keep the full circle outside the arena too: edges are not free exits.
    const count=Math.min(Math.ceil(Math.PI*2*radius/42),g.encounter().cap-1);
    for(let i=0;i<count;i++) {
      const a=rotation+i*Math.PI*2/count;
      points.push({x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius});
    }
    const weakCount=Math.max(3,Math.ceil(points.length*0.2));
    // Sentries hold position for the whole wave, so they must stand where the player can reach them.
    const inside=p=>p.x>=35&&p.y>=35&&p.x<=WORLD-35&&p.y<=WORLD-35;
    let reachable=0;
    points.forEach((p,i)=>{
      p.weak=i<weakCount;
      const sentry=kind==='mushrooms'&&!p.weak&&inside(p)&&reachable++%4===0;
      p.type=p.weak?'snake':kind==='boars'&&i%2===0?'boar':sentry?'mushroom':g.season>0&&i%5===0?'boar':'snake';
    });
  }
  return {kind,points,center,radius,delay};
}

export function updateWaves(g, dt, budget) {
  const normalized=g.time*300/g.seasonDuration;
  if(normalized<120) return;
  const pressure=bossWavePressure(g);
  if(pressure.stage!==g.bossPressureStage) {
    if(pressure.stage>g.bossPressureStage) {
      g.waveClock=Math.min(g.waveClock,8);
      g.onEvent('bossPressure',`보스 장기전 ${pressure.stage}단계 · 특별 웨이브가 더 자주 몰려옵니다`);
    } else {
      g.waveClock=Math.max(g.waveClock,pressure.interval);
    }
    g.bossPressureStage=pressure.stage;
  }
  g.waveClock-=dt;
  if(g.wavePending) {
    const wave=g.wavePending;
    wave.delay-=dt;
    if(wave.delay>0) return;
    // Never exceed the population budget or materialize enemies on the player.
    for(const point of wave.points) {
      if(g.enemies.filter(e=>e.hp>0&&!e.escaped).length>=budget.cap) break;
      if(Math.hypot(point.x-g.player.x,point.y-g.player.y)<65) continue;
      const mushrooms=g.enemies.filter(e=>e.type==='mushroom'&&e.hp>0&&!e.escaped).length;
      const boars=g.enemies.filter(e=>e.type==='boar'&&e.hp>0&&!e.escaped).length;
      const type=(point.type==='mushroom'&&mushrooms>=budget.mushroomCap)||(point.type==='boar'&&boars>=budget.boarCap+(wave.kind==='boars'?12:0))?'snake':point.type;
      const e=g.spawn(type);
      Object.assign(e,{x:point.x,y:point.y});
      if(point.type==='bat') {
        // Crossing flocks pass through and leave.
        e.heading=point.heading;
        e.waveFlightSpeed=point.flightSpeed;
        e.hp*=1.25; e.maxHp=e.hp;
        e.waveLife=10;
      } else {
        // Ring formations stay and become ordinary enemies once they close in,
        // so breaking out and killing them is the reward.
        if(point.weak) {e.hp*=0.55;e.maxHp=e.hp;}
        e.formationCenter={...g.waveCenter};
        if(type==='mushroom') e.waveSentry=true;
      }
    }
    g.wavePending=null;
    g.waveRestUntil=g.time+pressure.rest;
    g.waveIndex++;
    g.waveClock=pressure.interval;
    return;
  }
  if(g.waveClock>0) return;
  const sequence=g.season===0?['surround']:g.season===3?['boars','bats','mushrooms','bats']:['surround','bats','mushrooms','bats'];
  const kind=sequence[g.waveIndex%sequence.length];
  const wave=planWave(g,kind);
  if(kind==='mushrooms' && (g.year===3 || g.mode==='hell' || pressure.stage>=2)) {
    const bats=planWave(g,'bats').points;
    const lanes=new Set(bats.map(p=>p.heading)).size;
    const available=Math.max(0,budget.cap-wave.points.length);
    // Preserve the central interception line on every side when the combined
    // formation cannot fit full-length flocks within the population budget.
    let perLane=lanes?Math.floor(available/lanes):0;
    if(perLane%2===0) perLane--;
    wave.points.push(...bats.filter(p=>Math.abs(p.laneOffset)<=(perLane-1)*15));
  }
  // Reclaim only off-screen ordinary enemies when a full map would prevent an event.
  let needed=wave.points.length-(budget.cap-g.enemies.filter(e=>e.hp>0&&!e.escaped).length);
  for(const e of g.enemies) {
    if(needed<=0) break;
    if(e.type!=='boss'&&!e.elite&&!e.escaped&&(Math.abs(e.x-g.player.x)>g.view.w/2+80||Math.abs(e.y-g.player.y)>g.view.h/2+80)) {e.escaped=true;needed--;}
  }
  if(needed>0) {g.waveClock=3;return;}
  g.wavePending=wave;
  g.waveCenter=wave.center;
  g.onEvent('formation',waveLabel[kind]);
}

export function drawWaveWarning(c,g) {
  const wave=g.wavePending;
  if(!wave) return;
  c.save();
  c.globalAlpha=0.65+0.2*Math.sin(g.time*8);
  c.lineWidth=2;
  for(const p of wave.points) {
    c.strokeStyle=p.weak?'#bde690':'#edb377';
    c.beginPath();c.arc(p.x,p.y,p.type==='mushroom'?15:10,0,Math.PI*2);c.stroke();
    if(p.type==='bat') {
      c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(p.heading)*p.flightSpeed*1.8,p.y+Math.sin(p.heading)*p.flightSpeed*1.8);c.stroke();
    }
  }
  c.restore();
}
