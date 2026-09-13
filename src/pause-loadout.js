import { BY_ID, PASSIVES, MAX_WEAPONS } from './data.js';
import { itemIcon } from './item-icons.js';
const number = n => Number(n.toFixed(2));
const progress = (level, max) => `<span class="build-levels" aria-hidden="true">${Array.from({length:max},(_,i)=>`<i class="${i<level?'filled':''}"></i>`).join('')}</span>`;
export function passiveEffect(id, level) {
  return {
    might: `모든 무기 피해 +${level*10}%`,
    haste: `공격 간격 −${level*6}% · 부적·포자 제외`,
    speed: `이동 속도 +${level*8}%`,
    health: `최대 체력 +${level*20}`,
    magnet: `경험치 획득 반경 +${level*24}`,
    area: `범위 무기 반경·길이 +${level*10}%`,
  }[id];
}
function weaponEffect(game, w) {
  const s = game.stats(w), items = [];
  if(w.id==='charm') return `보호 ${w.shields ?? 0} / ${s.count}회 · ${s.recharge}초마다 충전`;
  if(s.damage) items.push(`피해 ${number(s.damage)}`);
  if(s.tick) items.push(`지속 피해 ${number(s.tick)}`);
  if(s.count) items.push(`${s.count}개`);
  if(s.cooldown) items.push(`공격 간격 ${number(s.cooldown)}초`);
  if(s.duration) items.push(`지속 ${number(s.duration)}초`);
  if(s.slow) items.push(`감속 ${number(s.slow*100)}%`);
  return items.join(' · ');
}
export function pauseLoadout(game) {
  const passives = PASSIVES.filter(p=>game.passives[p.id]);
  return `<section class="pause-build" aria-label="현재 성장 트리">
    <h3>현재 무기 <small>${game.weapons.length} / ${MAX_WEAPONS}칸</small></h3>
    <div class="build-list">${game.weapons.map(w=>{
      const d=BY_ID[w.id], maxed=w.level===d.max;
      return `<article class="build-item">${itemIcon(w.id)}<div><div class="build-name"><b>${d.name}</b><span>${maxed?'MAX':`Lv.${w.level}`} / ${d.max}</span></div>${progress(w.level,d.max)}<p>${weaponEffect(game,w)}</p><p class="build-next">${maxed?'최대 강화 완료':`다음 강화 · ${d.up[w.level]}`}</p></div></article>`;
    }).join('')}</div>
    ${game.weapons.length<MAX_WEAPONS?`<p class="build-empty">무기를 ${MAX_WEAPONS-game.weapons.length}개 더 장착할 수 있습니다.</p>`:''}
    <h3>패시브 <small>${passives.length} / ${PASSIVES.length}종</small></h3>
    <div class="build-list">${passives.map(p=>{
      const level=game.passives[p.id];
      return `<article class="build-item">${itemIcon(p.id)}<div><div class="build-name"><b>${p.name}</b><span>${level===p.max?'MAX':`Lv.${level}`} / ${p.max}</span></div>${progress(level,p.max)}<p>${passiveEffect(p.id,level)}</p></div></article>`;
    }).join('') || '<p class="build-empty">아직 획득한 패시브가 없습니다.</p>'}</div>
    <p class="build-footnote">무기 수치는 현재 패시브와 특별 도토리 강화가 반영된 값입니다. 보스 감속은 최대 15%입니다.</p>
  </section>`;
}
