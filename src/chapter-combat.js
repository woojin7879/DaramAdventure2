const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const clamp = (n) => Math.max(40, Math.min(2360, n));
export function addPool(g, x, y, r = 65, delay = 1.2) {
  if (g.hazards.length >= 60) return;
  g.hazards.push({
    type: "pool",
    x: clamp(x),
    y: clamp(y),
    r,
    delay,
    age: 0,
    duration: 1.5,
    damage: 18,
  });
}
export function addRoot(g, x, y, direction, length = 400, delay = 1.25) {
  if (g.hazards.length >= 60) return;
  g.hazards.push({
    type: "rootline",
    x,
    y,
    x2: clamp(x + Math.cos(direction) * length),
    y2: clamp(y + Math.sin(direction) * length),
    width: 16,
    delay,
    age: 0,
    duration: 0.8,
    damage: 22,
  });
}
export function updateChapterBoss(g, e, dt) {
  e.moving = false;
  const stage = bossPhase(e);
  if (e.combatPhase !== stage) {
    const entering = e.combatPhase !== undefined;
    e.combatPhase = stage;
    e.patternIndex = 0;
    if (entering) { e.bossClock = Math.max(e.bossClock, 1.8); g.effect('burst',e,{color:e.bossKind==='serpent'?'#63e5d0':'#ffc474',life:.7,r:85}); }
  }
  e.bossClock -= dt;
  if (e.attack) {
    const a = e.attack;
    a.time -= dt;
    if (a.running) {
      e.moving = true;
      e.heading = a.angle;
      e.x = clamp(e.x + Math.cos(a.angle) * 320 * dt);
      e.y = clamp(e.y + Math.sin(a.angle) * 320 * dt);
    }
    if (a.time > 0) return;
    if (a.type === "charge" && !a.running) {
      a.running = true;
      a.time = 0.85;
      return;
    }
    if (a.type === 'charge' && a.running && a.remaining > 0) {
      a.remaining--; a.running=false; a.angle=angle(e,g.player); a.time=1.05; return;
    }
    if (a.type === "spit")
      for (let i = -2; i <= 2; i++) {
        if (g.enemyShots.length >= 72) break;
        const direction = a.angle + i * 0.22;
        g.enemyShots.push({
          x: e.x + Math.cos(a.angle)*42,
          y: e.y - 55 + Math.sin(a.angle)*12,
          theme: "venom",
          vx: Math.cos(direction) * 170,
          vy: Math.sin(direction) * 170,
          r: 8,
          life: 3.5,
          damage: 22,
        });
      }
    e.attack = null;
    e.bossClock = stage === 3 ? 2 : stage === 2 ? 2.5 : 3;
    return;
  }
  const d = Math.hypot(e.x - g.player.x, e.y - g.player.y);
  if (e.bossKind === "heart" && d > 240) {
    const a = angle(e, g.player);
    e.moving = true;
    e.heading = a;
    e.x += Math.cos(a) * 28 * dt;
    e.y += Math.sin(a) * 28 * dt;
  }
  if (e.bossKind === "serpent" && d > 160) {
    const a = angle(e, g.player) + Math.sin(g.time * 1.7) * 0.45;
    e.heading = a;
    e.x += Math.cos(a) * 48 * dt;
    e.y += Math.sin(a) * 48 * dt;
  }
  if (e.bossClock > 0) return;
  const patterns = bossPatterns(e.bossKind, stage);
  const pattern = patterns[(e.patternIndex || 0) % patterns.length];
  e.patternIndex = (e.patternIndex || 0) + 1;
  e.patternName = patternNames[pattern];
  e.pattern = pattern;
  e.castStarted = g.time;
  e.castDelay = ['frost','cage'].includes(pattern) ? 1.5 : ['roots','spiral','bloom'].includes(pattern) ? 1.4 : pattern==='wake' ? 1.35 : pattern==='shock' ? 1.2 : 1.3;
  const dir = angle(e,g.player);
  e.heading = dir;
  if (pattern === 'charge' || pattern === 'doubleCharge') {
    e.attack = {type:'charge', angle:dir,time:1.2,running:false,remaining:pattern==='doubleCharge'?1:0};
  } else if (pattern === 'spit') e.attack={type:'spit',angle:dir,time:1,running:false};
  else if (pattern === 'pools') {
    for(let i=-1;i<=1;i++)addPool(g,g.player.x+i*100,g.player.y+(i%2)*65,58,1.3);
  } else if (pattern === 'coil' || pattern === 'undertow') {
    addBossRing(g,e,{inward:pattern==='undertow'});
  } else if (pattern === 'wake') {
    for(const side of [-1,1]) {
      const x=e.x+Math.cos(dir+Math.PI/2)*side*85, y=e.y+Math.sin(dir+Math.PI/2)*side*85;
      if (g.hazards.length < 60) {
        addRoot(g,x,y,dir,520,1.35);
        g.hazards.at(-1).theme='water';
      }
    }
  } else if (pattern === 'roots') {
    for(let i=0;i<6;i++)addRoot(g,e.x,e.y,dir+i*Math.PI/3,440,1.4);
  } else if (pattern === 'shock') {
    g.hazards.push({type:'shock',x:e.x,y:e.y,delay:1.2,age:0,range:430});
  } else if (pattern === 'frost') {
    addPool(g,g.player.x,g.player.y,75,1.5);
  } else if (pattern === 'cage') {
    const {x,y}=g.player;
    // Three sides erupt in sequence; the fourth side remains an exit.
    for(let i=0;i<3;i++) {
      const a=dir+i*Math.PI/2;
      addRoot(g,x+Math.cos(a)*150-Math.sin(a)*150,y+Math.sin(a)*150+Math.cos(a)*150,a-Math.PI/2,300,1.5+i*.3);
    }
  } else if (pattern === 'bloom') {
    for(let i=0;i<5;i++) {
      const a=dir+i*Math.PI*2/5;
      addPool(g,g.player.x+Math.cos(a)*125,g.player.y+Math.sin(a)*125,48,1.4+i*.16);
    }
  } else if (pattern === 'spiral') {
    for(let i=0;i<8;i++)addRoot(g,e.x,e.y,dir+i*Math.PI/4,470,1.4+i*.28);
  } else if (pattern === 'heartbeat') {
    addBossRing(g,e);addBossRing(g,e,{delay:2.5,offset:Math.PI/2});
  }
  e.bossClock = stage === 3 ? 4.8 : stage === 2 ? 4.4 : 4;

}

export const bossPhase = (e) => e.hp / e.maxHp > .65 ? 1 : e.hp / e.maxHp > .3 ? 2 : 3;
export const bossPatterns = (kind, phase) => kind === 'serpent'
  ? phase === 1 ? ['charge','spit','pools'] : phase === 2 ? ['charge','coil','spit','wake','pools'] : ['doubleCharge','coil','wake','spit','undertow','pools']
  : phase === 1 ? ['roots','shock','frost'] : phase === 2 ? ['roots','cage','shock','bloom','frost'] : ['spiral','cage','heartbeat','bloom','roots','frost'];
export const patternNames = {charge:'독니 돌진',doubleCharge:'연속 사냥',spit:'독니 분사',pools:'독수 웅덩이',coil:'똬리 포위',wake:'물길 가르기',undertow:'역류하는 똬리',roots:'뿌리 창',shock:'서리 파동',frost:'겨울의 낙인',cage:'엇갈리는 뿌리 감옥',bloom:'서리꽃 개화',spiral:'나선 뿌리',heartbeat:'심장의 이중 박동'};
export function addBossRing(g,e,{inward=false,delay=1.3,offset=0}={}) {
  if(g.hazards.length>=60)return;
  g.hazards.push({type:'bossring',x:e.x,y:e.y,r:inward?340:65,startRadius:inward?340:65,speed:inward?-115:130,gap:angle(e,g.player)+offset,gapWidth:1.05,delay,age:0,duration:2.1,damage:20,theme:e.bossKind});
}
export function ringHits(h,p) {
  const a=Math.atan2(p.y-h.y,p.x-h.x);
  const delta=Math.atan2(Math.sin(a-h.gap),Math.cos(a-h.gap));
  return Math.abs(Math.hypot(p.x-h.x,p.y-h.y)-h.r)<14+p.r && Math.abs(delta)>h.gapWidth/2;
}
