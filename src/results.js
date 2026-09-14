import { itemIcon } from "./item-icons.js";
import { chapter } from "./chapters.js";
import { BY_ID, PASSIVES, SEASONS, baseOf } from "./data.js";
const number = (n) => Math.round(n).toLocaleString("ko-KR");
const clock = (t) =>
  `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
const stamp = (iso) => {
  if (!iso) return "이전 기록";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "이전 기록";
  const two = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};
function hellBoard(report, records) {
  const bosses = `<h3>헬 모드 · 보스 ${report.hellBossKills.length}회 격파${records?.isRecord ? ' <b class="new-record">신기록</b>' : ""}</h3><p class="stat-note">${report.time >= 1800 ? `30분 돌파 · 추가 생존 ${clock(report.time - 1800)}` : `첫 30분 보스 러시 · ${clock(report.time)} 생존`}${records?.best && !records.isRecord ? ` · 최고 기록 ${clock(records.best.time)}` : ""}</p><ol class="growth-history">${report.hellBossKills.map(b => `<li><time>${clock(b.time)}</time><span>${chapter(b.year).bossName}</span><small>격파</small></li>`).join("") || '<li>아직 격파한 보스가 없습니다.</li>'}</ol>`;
  if (!records?.runs?.length) return bosses;
  return `${bosses}<details open><summary>최근 도전 ${records.runs.length}회</summary><ol class="growth-history hell-runs">${records.runs
    .map((r, i) => `<li><time>${clock(r.time)}</time><span class="growth-meta">${i === 0 ? "이번 도전" : stamp(r.endedAt)}</span><span>보스 ${r.bosses}회 · ${number(r.kills)}마리 · Lv.${r.level ?? "?"}</span><small>${r.reason === "quit" ? "포기" : "사망"}${records.best && r.time === records.best.time && r.endedAt === records.best.endedAt ? " · 최고" : ""}</small></li>`)
    .join("")}</ol></details>`;
}
export function resultDetails(report, records = null) {
  const rows = report.loadout.map((w) => ({
    ...w,
    ...(report.weapons[w.id] || {
      damage: 0,
      kills: 0,
      hits: 0,
      acquired: report.time,
    }),
  }));
  rows.sort((a, b) => b.damage - a.damage);
  const total = rows.reduce((sum, row) => sum + row.damage, 0);
  const names = {
    snake: "뱀",
    fox: "여우",
    mushroom: "버섯",
    bat: "박쥐",
    boar: "멧돼지",
    boss: report.mode === "hell" ? "연차 보스 합계" : chapter(report.year || 1).bossName,
  };
  return `<section class="run-details" aria-label="전투 상세 기록">
    ${report.mode === "hell" ? hellBoard(report, records) : ""}
    <h3>무기별 활약 <small>총 피해 ${number(total)}</small></h3>
    <p class="stat-note">남은 체력만큼의 실제 피해 · DPS는 획득 후 전투 시간 기준${report.since ? ` · 이전 저장은 ${clock(report.since)} 이후만 집계` : ""}</p>
    <div class="damage-table"><table><thead><tr><th>무기</th><th>피해량 / 비중</th><th>DPS</th><th>처치</th></tr></thead><tbody>${rows
      .map((w) => {
        const d = BY_ID[w.id],
          percent = total ? (w.damage / total) * 100 : 0;
        return `<tr><th scope="row">${itemIcon(w.id)} ${d.name}<small>${d.evolved ? "진화" : `Lv.${w.level} / ${d.max}`}${baseOf(w.id) === "charm" ? ` · ${number(report.blocked)}회 방어` : ""}</small></th><td>${number(w.damage)} <small>${percent.toFixed(1)}%</small><span class="damage-track"><span style="width:${percent}%;background:${d.color}"></span></span></td><td>${(w.damage / Math.max(1, report.time - w.acquired)).toFixed(1)}</td><td>${number(w.kills)}</td></tr>`;
      })
      .join("")}</tbody></table></div>
    <div class="combat-totals"><span>받은 피해 <b>${number(report.taken)}</b></span><span>실제 회복 <b>${number(report.healed)}</b></span><span>방어 <b>${number(report.blocked)}회</b></span><span>획득 경험치 <b>${number(report.xp)}</b></span><span>이동 거리 <b>${number(report.distance / 32)}m</b></span><span>도토리 <b>자석 ${report.specials.magnet} · 힘 ${report.specials.power} · 회복 ${report.specials.heal}</b></span></div>
    <details><summary>몬스터별 처치 기록</summary><div class="combat-totals">${Object.entries(
      names,
    )
      .map(
        ([id, name]) =>
          `<span>${name} <b>${number(report.enemies[id] || 0)}</b></span>`,
      )
      .join("")}</div></details>
    <details><summary>테크트리 · 성장 선택 ${report.history.length}회</summary><p class="stat-note">시작 무기를 포함한 획득·강화 순서</p><ol class="growth-history">${report.history
      .map((h) => {
        const d =
          h.kind === "weapon" || h.kind === "evolve"
            ? BY_ID[h.id]
            : h.kind === "passive"
              ? PASSIVES.find((p) => p.id === h.id)
              : { name: "숲의 휴식", glyph: "♡" };
        return `<li><time>${clock(h.time)}</time><span class="growth-meta">${SEASONS[h.season].name} · Lv.${h.playerLevel}</span><span>${itemIcon(h.kind === "heal" ? "heal" : h.id)} ${d.name} <b>${h.kind === "heal" ? "회복" : h.kind === "evolve" ? "EVO" : `Lv.${h.level}`}</b></span><small>${h.kind === "heal" ? "" : h.kind === "evolve" ? "진화" : h.level === 1 ? "획득" : "강화"}</small></li>`;
      })
      .join("")}</ol></details>
    <p class="stat-note">패시브 · ${
      PASSIVES.filter((p) => report.passives[p.id])
        .map((p) => `${itemIcon(p.id)} ${p.name} Lv.${report.passives[p.id]}`)
        .join(" / ") || "없음"
    }</p>
  </section>`;
}
