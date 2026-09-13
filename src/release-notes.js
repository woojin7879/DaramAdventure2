export const GAME_VERSION = '1.0.0';

// Newest first. Keep published entries when adding the next version.
// Fill releasedAt only after release approval; dates are never guessed.
export const RELEASE_NOTES = [
  {
    version: '1.0.0',
    title: '다람이의 새로운 모험',
    releasedAt: '2026-09-14',
    summary: '세 해의 이야기, 14종 무기, 끝없이 도전하는 헬 모드.',
    sections: [
      {title:'모험과 도전', items:[
        '1~3년차 스토리 모드. 각 연차에서 봄·여름·가을·겨울을 5분씩 살아남고 고유 보스에 도전합니다.',
        '스토리를 모두 완료하면 헬 모드가 열립니다. 10·20·30분에 연차 보스가 등장하며, 30분 이후에도 쓰러질 때까지 도전이 이어집니다.',
        '원작에서 이어지는 프롤로그와 연차별 시네마틱, 화자 자막과 자동 재생을 제공합니다. 1년차를 새로 시작하면 프롤로그를 다시 볼 수 있고, 스토리는 ESC로 건너뛸 수 있습니다.',
      ]},
      {title:'무기와 성장', items:[
        '무기 14종 중 최대 6개를 장착하고, 패시브 6종으로 나만의 조합을 만듭니다.',
        '참나무 부메랑은 나갈 때와 돌아올 때 적을 관통합니다. 이동한 다람이를 따라 회수됩니다.',
        '바람개비 씨앗은 나선형으로 퍼지며 적을 감속합니다. 최대 강화하면 씨앗 6개와 회전 방향 교대를 얻습니다.',
        '나무껍질 부적의 보호막을 하늘색 그라데이션으로 바꾸고, 충전·피격 효과를 추가했습니다.',
      ]},
      {title:'화면과 시인성', items:[
        '메인 메뉴, 전투 HUD, 강화 선택과 결과 화면을 정리했습니다. 메인에서 버전별 패치노트를 확인할 수 있습니다.',
        '무기·패시브에 전용 이미지 아이콘 20종을 적용하고, 일부 아이콘 아래에 다른 그림이 보이던 문제를 보정했습니다.',
        '계절마다 실제 배경 이미지가 바뀌며, 전환 중에도 플레이어·몬스터·오브젝트 위치가 이어집니다.',
        '겨울 바닥의 흰 면적을 줄이고, 경험치 점과 맵 경계의 대비를 높였습니다.',
        '사계절 인트로와 제목 뒤에 2가 등장하는 연출을 추가했습니다. 로고가 나타날 때 전경 나무가 다람이를 가리지 않습니다.',
      ]},
      {title:'소리와 기록', items:[
        'ESC 일시정지 화면에서 현재 무기·패시브의 레벨, 적용 효과와 다음 강화를 확인할 수 있습니다.',
        '소리는 기본 켜짐입니다. 인트로·메인·시네마틱에서 바꾼 설정은 새로고침 후에도 유지됩니다.',
        '브라우저가 자동 재생을 제한하면 시작 버튼으로 인트로를 재생합니다. 인트로와 메인 BGM이 겹치지 않도록 연결했습니다.',
        '결과 화면에서 무기별 실제 피해·DPS·처치, 성장 선택 이력, 받은 피해·회복·방어 기록을 확인할 수 있습니다.',
      ]},
    ],
  },
];
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function patchNotesHTML() {
  return RELEASE_NOTES.map((release,index) => `<article class="patch-release">
    <header><span class="patch-version">v${escape(release.version)}</span><span class="patch-date">${release.releasedAt ? escape(release.releasedAt) : '배포 준비'}</span></header>
    <h3>${escape(release.title)}</h3>
    <p class="sub">${escape(release.summary)}</p>
    ${index ? '<details><summary>변경 내역 펼치기</summary>' : ''}
    ${release.sections.map(section => `<section><h4>${escape(section.title)}</h4><ul>${section.items.map(item=>`<li>${escape(item)}</li>`).join('')}</ul></section>`).join('')}
    ${index ? '</details>' : ''}
  </article>`).join('');
}
export function patchNotesMarkdown() {
  return '# 다람이의 모험 2 · 패치노트\n\n'+RELEASE_NOTES.map(release =>
    `## v${release.version} — ${release.title}\n\n${release.releasedAt || '배포 준비 · 사용자 승인 대기'}\n\n${release.summary}\n\n`+
    release.sections.map(section=>`### ${section.title}\n\n${section.items.map(item=>'- '+item).join('\n')}\n`).join('\n')
  ).join('\n');
}
