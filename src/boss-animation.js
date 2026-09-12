export const BOSS_POSES = ['대기', '호흡', '이동 A', '이동 B', '공격 준비', '공격', '주문 시전', '분노'];
export function bossSpriteFrame(e, time) {
  if (e.attack?.type === 'charge') return e.attack.running ? 5 : 4;
  if (e.attack?.type === 'spit') return 6;
  if (e.bossKind === 'bear') {
    if(e.attack?.type==='shock') return 4;
    if(time-(e.slamAt??-100)<.5) return 6;
    if(e.moving) return 2+Math.floor(time*5)%2;
    return e.hp<e.maxHp*.5 ? 7 : Math.floor(time*2)%2;
  }
  const age = time - (e.castStarted ?? -100);
  const delay=e.castDelay ?? 1.3;
  if (age >= 0 && age < delay + .9) return age < delay ? 4 : age < delay+.4 ? 5 : 6;
  if (e.moving) return 2 + Math.floor(time * 5) % 2;
  if (e.combatPhase === 3) return 7;
  return Math.floor(time * 2) % 2;
}
export function bossFrameRect(image, frame) {
  const w=image.width/4,h=image.height/2;
  return [(frame%4)*w,Math.floor(frame/4)*h,w,h];
}
