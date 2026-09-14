import { WORLD } from './data.js';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const waveLabel = { surround:'포위 접근 · 약한 뱀 무리를 뚫으세요', bats:'박쥐 횡단 · 비행 경로를 확인하세요', mushrooms:'버섯 포위 · 사수를 처치해 통로를 여세요' };

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
  // Predict once, then freeze the warning: continuing straight is intercepted,
  // but changing course remains a valid response. No homing after announcement.
  const center = kind === 'bats' ? {
    x:clamp(g.player.x + move.x*playerSpeed*(delay+flightTime),35,WORLD-35),
    y:clamp(g.player.y + move.y*playerSpeed*(delay+flightTime),35,WORLD-35),
  } : {x:g.player.x,y:g.player.y};
  const rotation = kind === 'bats' && (move.x || move.y)
    ? Math.atan2(move.y,move.x)+Math.PI/2 : g.random()*Math.PI*2;
  const points = [];
  const radius = Math.max(310,playerSpeed*delay+90)+g.season*10;
  if (kind === 'bats') {
    const lanes = 2 + Math.min(2, hard);
    const directions=[0,Math.PI,Math.PI/2,Math.PI*1.5];
    for (let lane=0; lane<lanes; lane++) {
      const a=rotation+directions[lane];
      // Odd count guarantees a bat directly on the predicted crossing point.
      const count=15+2*Math.floor(g.season/2);
      for(let i=0;i<count;i++) {
        const offset=(i-(count-1)/2)*30;
        const x=center.x+Math.cos(a)*flightSpeed*flightTime-Math.sin(a)*offset;
        const y=center.y+Math.sin(a)*flightSpeed*flightTime+Math.cos(a)*offset;
        if(x<30||y<30||x>WORLD-30||y>WORLD-30) continue;
        points.push({x,y,type:'bat',heading:a+Math.PI,flightSpeed,laneOffset:offset});
      }
    }
  } else {
    // Keep the player inside the perimeter even with maximum movement speed.
    // At world edges clip the circle, using the boundary as part of the enclosure.
    const count=Math.min(Math.ceil(Math.PI*2*radius/42),g.encounter().cap-1);
    const angles=Array.from({length:count},(_,i)=>rotation+i*Math.PI*2/count);
    for(const edge of [35,WORLD-35]) {
      const x=(edge-center.x)/radius,y=(edge-center.y)/radius;
      if(Math.abs(x)<1) {const a=Math.acos(x);angles.push(a,-a);}
      if(Math.abs(y)<1) {const a=Math.asin(y);angles.push(a,Math.PI-a);}
    }
    angles.sort((a,b)=>((a-rotation+Math.PI*4)%(Math.PI*2))-((b-rotation+Math.PI*4)%(Math.PI*2)));
    for(const a of angles) {
      const x=center.x+Math.cos(a)*radius,y=center.y+Math.sin(a)*radius;
      if(x<35-1e-6||y<35-1e-6||x>WORLD-35+1e-6||y>WORLD-35+1e-6) continue;
      if(points.some(p=>Math.hypot(p.x-x,p.y-y)<1)) continue;
      points.push({x:clamp(x,35,WORLD-35),y:clamp(y,35,WORLD-35)});
    }
    const weakCount=Math.max(3,Math.ceil(points.length*0.2));
    points.forEach((p,i)=>{
      p.weak=i<weakCount;
      p.type=p.weak?'snake':kind==='mushrooms'&&i%4===0?'mushroom':g.season>0&&i%5===0?'boar':'snake';
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
      const type=(point.type==='mushroom'&&mushrooms>=budget.mushroomCap)||(point.type==='boar'&&boars>=budget.boarCap)?'snake':point.type;
      const e=g.spawn(type);
      Object.assign(e,{x:point.x,y:point.y});
      if(point.type==='bat') {
        e.heading=point.heading;
        e.waveFlightSpeed=point.flightSpeed;
        e.hp*=1.25; e.maxHp=e.hp;
      } else {
        if(point.weak) {e.hp*=0.55;e.maxHp=e.hp;}
        e.formationCenter={...g.waveCenter};
        if(type==='mushroom') e.waveSentry=true;
      }
      e.waveLife=wave.kind==='bats'?10:24;
    }
    g.wavePending=null;
    g.waveRestUntil=g.time+pressure.rest;
    g.waveIndex++;
    g.waveClock=pressure.interval;
    return;
  }
  if(g.waveClock>0) return;
  const sequence=g.season===0?['surround']:['surround','bats','mushrooms','bats'];
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
