# 무기 진화와 보물상자

작성일: 2026-09-15 · 상태: **구현 완료** (v1.1.0). 아래 표는 구현된 최종 규칙이다.

뱀서류 정체성 점검에서 빠져 있던 두 축, "한 판 안의 목표(진화·상자)"를 채운다. 판 사이의 목표(영구 성장·해금)는 이 문서 범위가 아니다.

## 1. 결정 사항

| 항목 | 결정 |
| --- | --- |
| 1차 범위 | 14종 전부 진화 + 상자를 한 번에 구현 |
| 상자 드롭 조건 | 스토리: 정예 처치 100%. 헬: 정예 2마리마다 1개(확정 교대). 웨이브·보스는 상자를 주지 않음 |
| 상자 공개 방식 | 자동 적용 + 룰렛 연출 모달. 선택 없음 (VS 방식) |
| 진화 아이콘 | 전용 시트 `evolution-icons.png`(5×3) · 필드 상자 `chest.png`(2프레임) |
| 정예 | 상자를 걸 만한 미니보스로 강화 (3절) |

## 2. 진화 규칙

- 조건: **무기 최대 레벨 + 짝 패시브 최대 레벨(5)**. 둘 다 만렙이어야 상자가 진화를 연다.
- 획득: **상자에서만**. 레벨업 카드에는 노출하지 않는다.
- 진화체는 별도 id의 무기 정의(`EVOLUTIONS`)이며 같은 슬롯을 교체한다. 레벨 1 고정, 스탯은 기본 무기 최대 레벨 값에 고유 추가 효과를 더한다.
- 진화 후에는 해당 무기가 레벨업 후보에서 빠진다. 다른 무기·패시브 성장은 그대로 진행된다.
- 발사 로직은 `def.base`로 기본 무기 분기를 재사용하고 추가 효과만 붙인다. if 체인을 복제하지 않는다.
- 저장(`checkpoint`) 스냅샷에 진화 id가 들어가므로 복원 시 `BY_ID`에 없는 id는 거부한다.

### 짝 패시브와 효과

패시브 6종이 무기 14종에 2~3개씩 배분되도록 짰다. 특정 패시브 하나가 만능 열쇠가 되지 않게 한다.

| 기본 무기 | 짝 패시브 | 진화 | 추가 효과 |
| --- | --- | --- | --- |
| 도토리 새총 | 단단한 이빨 | 풍년의 새총 | 관통이 끝난 탄환이 작은 탄환 3개로 분열 |
| 꼬리 휩쓸기 | 넓은 잎사귀 | 폭풍 꼬리 | 휩쓸기 후 바깥으로 퍼지는 바람 파동(피해·밀쳐내기) |
| 조약돌 궤도 | 튼튼한 심장 | 산의 수호 | 두 궤도 사이에서 주기적인 충격파 |
| 덩굴 채찍 | 넓은 잎사귀 | 고목의 손길 | 채찍 끝에서 좌우로 뿌리 확산(피해·짧은 속박) |
| 불씨 도토리 | 단단한 이빨 | 잿불 숲 | 불길 만료 시 작은 잔불 영역 생성 |
| 가지 번개 | 가벼운 가지 | 뇌우의 가지 | 연쇄 종료 지점에 0.5초 뒤 지연 낙뢰(광역) |
| 눈송이 고리 | 가벼운 발 | 겨울잠의 결계 | 마지막 고리가 끝난 뒤 짧은 감속 지대 |
| 도토리 당구 | 가벼운 가지 | 황금 도토리 당구 | 마지막 폭발에서 작은 파편 4개 발사 |
| 나무껍질 부적 | 튼튼한 심장 | 고목의 가호 | 보호 소진 시 5초간 받는 피해 30% 감소 |
| 버섯 포자 | 가벼운 발 | 숲의 숨결 | 구름 만료 지점에 작은 포자 폭발 |
| 벌떼 친구 | 가벼운 가지 | 여왕벌의 행진 | 돌아오는 길에 짧은 꿀 감속 흔적 |
| 겨울 비축고 | 숲의 주머니 | 풍년 창고 | 3발마다 강화 탄환이 작은 범위 피해 |
| 참나무 부메랑 | 가벼운 발 | 숲바람 부메랑 | 귀환 완료 시 날아온 방향으로 관통 잎날 3개 발사 |
| 바람개비 씨앗 | 숲의 주머니 | 만개한 씨앗 | 씨앗 만료 시 그 자리에서 작은 씨앗 3개로 분열 |

부메랑·씨앗은 `WEAPON_PROGRESSION.md` 후속 제안표에 없어 이 문서에서 새로 정했다.

## 3. 상자 규칙

- 드롭: 정예 처치 시 드롭 타입 `chest`. 자석에 끌려오지 않고 직접 밟아야 획득한다. 계절 전환에도 필드에 남는다.
- 획득 시 `state = "chest"`로 일시정지 → 룰렛 모달 → 닫으면 재개. 이 동안 시간이 흐르지 않는다. 상자 도중 레벨업 조건이 차면 닫은 직후 레벨업 카드가 이어진다.
- 내용 우선순위:
  1. 진화 조건을 만족하는 무기가 있으면 **진화 1개**. 여러 개면 랜덤 1개.
  2. 없으면 **이미 보유한** 무기·패시브 중 만렙이 아닌 항목 랜덤 1개에 **스토리 +1(80%) / +2(17%) / +3(3%), 헬 +1(65%) / +2(25%) / +3(10%)**. 만렙을 넘지 않는다(만렙 −1에서 +3이 나와도 만렙까지만). 새 무기·새 패시브는 상자에서 나오지 않는다.
  3. 전부 완성이면 체력 30 회복 + 특별 도토리 효과(자석 또는 힘) 1개.
- 룰렛 연출: 보유 스킬 아이콘이 빠르게 돌다 느려지며 결과에 멈춘다(상승 틱 음 → 결과 징글, 진화는 5음 팬파레). Enter/Space/ESC 또는 버튼으로 즉시 결과 보기 → 한 번 더 누르면 닫기. `prefers-reduced-motion`이면 연출 생략.

### 정예 빈도와 강도

| | 스토리 (20분) | 헬 |
| --- | --- | --- |
| 첫 정예 | 3:00 | 3:00 |
| 간격 | 2:45 (`max(45, 계절×0.55)`) | 55초 |
| 상자 | 정예마다 | 정예 2마리마다 1개 |
| 한 판 상자 | 약 7개 | 30분 약 15개 |

상자 7개는 VS(30분 5~8개)와 같은 수준이라 빈도는 두고, 대신 정예를 미니보스로 올렸다. 첫 플레이테스트에서 스토리가 체감상 쉬워져(상자 기대치 +1.45레벨/개 → 한 판 약 +10레벨, 레벨업 카드 약 40회 대비 +25%) 두 가지로 절반가량 회수했다: 스토리 룰렛을 80/17/3(+1.23/개, −1.5레벨)으로 낮추고, XP 요구량에 레벨 비례 가산(L10 +8% → L30 +24%, 상한 +30%, −3레벨)을 넣었다. 요구량만으로 10레벨을 회수하려면 +80% 이상이 필요해 레벨업 공백이 길어지므로 상자 쪽을 함께 조정했다. 헬은 연장전이 복리로 앞서가므로 65/25/10을 유지한다.

| 정예 | 이전 | 현재 |
| --- | --- | --- |
| 체력 | 기본 ×5 | 여우 ×(34+10·진행), 멧돼지 ×(12+3·진행) — 시간 스케일 위에 곱함 |
| 피해 | ×1 | ×1.8 |
| 속도 | ×0.85 | ×1.0 |
| 감속 상한 | 없음 | 30% (보스 15%) |
| 넉백 | 100% | 25% |
| 크기 | ×1.3 | ×1.35 |

헤드리스 측정(정예가 60px 거리에 붙어 있는 최악 조건, 시점별 평균 빌드): 여우 정예 16~26초, 멧돼지 정예 22~30초. 실플레이에선 이동·회피로 더 길어진다.

## 4. 구현 단계 (완료)

1. **데이터** — `data.js`에 `EVOLUTIONS` 배열, `BY_ID`에 병합, 기본 무기에 `evolution`·`requires` 연결. `WEAPONS.length === 14`는 유지.
2. **게임 로직** — `evolve(id)`, `chest` 드롭·`openChest()`·`onEvent("chest", 내용)`, 정예 사망 시 상자 드롭. `stats()`·`fireWeapon()`·`updateWeapons()`가 `def.base`를 보게 수정. 복원 방어.
3. **진화 효과 14종** — 기존 투사체·존·해저드 시스템을 재사용해 작게 구현.
4. **UI** — 상자 모달(`main.js`), HUD·일시정지·결과의 진화 표시(이름·"진화" 태그·황금 테두리). 일시정지 화면에 진화 조건 힌트(필요 패시브)를 보여 플레이어가 목표를 잡을 수 있게 한다.
5. **아이콘** — `evolution-icons.png`(5×3: 진화 14 + 상자 1)와 `chest.png`(닫힘·열림 2프레임) 로더·매핑. 에셋 전에는 배지 오버레이.
6. **문서·테스트·패치노트** — `WEAPON_PROGRESSION.md` 진화 섹션을 이 문서로 연결, 신규 테스트(조건 판정·상자 우선순위·슬롯 교체·복원·아이콘 매핑), v1.1.0 버전 업.

구현 위치: `data.js`(`EVOLUTIONS`, `baseOf`), `game.js`(`weaponOf`·`evolutionReady`·`evolve`·`openChest`·`closeChest`·`gainPassive`·`fragment`, 정예 스펙), `main.js`(`showChest`·룰렛), `item-icons.js`(두 번째 아틀라스), `render.js`(`drawChest`·`chestAtlas`, 서리·꿀 존, 돌풍·낙뢰 해저드), `lab.js`(“장착 무기 진화” 버튼). 테스트 `tests/evolution.test.mjs`.

## 5. 에셋 제작 기준

시트 1 `public/assets/evolution-icons.png`: 5열 × 3행, 순서는 2절 표 순서 그대로 1~14, 15번째가 보물상자. 시트 2 `public/assets/chest.png`: 닫힘·열림 2프레임 가로 배치.

공통: 기존 `inventory-icons.png`와 같은 화풍(밤색 윤곽·나무/도토리 재질·크림 하이라이트·이끼색 잎), 순수 검정 매트, 글자·틀 없음, 셀 경계를 넘지 않는 균등 격자. 진화체는 같은 물건 계열에 황금빛 액센트를 절제해서 더한다. 체커보드·회색 그라데이션 배경은 `prepareItemIcons()`의 매트 제거가 실패하므로 사용하지 않는다.

받은 뒤 확인: 배경이 순수 검정인지, 아이콘이 옆 칸에 닿지 않는지, 시트 1의 순서 1~15가 유지됐는지. 순서가 바뀌면 `ITEM_ICONS` 매핑을 함께 바꾼다.

### 시트 1 프롬프트 — 진화 무기 아이콘 14종 + 보물상자

```
Game inventory icon sheet, 5 columns x 3 rows, 15 icons total, evenly spaced grid, each icon centered in its cell with generous margin, no icon touching another.

Style: painted cartoon fantasy game icons, thick dark-brown (#3a2416) outlines, warm oak wood and acorn textures, cream-colored highlights, moss-green leaves, soft lighting from top-left, slight rim light. Pure solid black background (#000000), no gradient, no vignette, no text, no labels, no frames, no borders, no drop shadows on the background. Each icon is a single object silhouette, readable at 40px.

These are EVOLVED versions of existing forest weapons: same object families, but upgraded — richer carving, subtle golden glow accents (#f2c96a), small floating golden motes, slightly more ornate. Not overdone: the object must still be the main read, gold is an accent only.

Row 1, left to right:
1. Harvest Slingshot — Y-shaped oak slingshot with golden leaf carvings on the fork, acorn in the sling splitting into three small glowing acorns mid-shot.
2. Storm Tail — big fluffy fox-red squirrel tail curled in an S, with a spiral wind gust of pale gold swirling around the tip, a few leaves caught in the gust.
3. Mountain Guard — three blue-grey river stones orbiting, connected by a faint golden ring, with a small shockwave ripple burst between them.
4. Old Tree's Hand — thick coiled vine whip whose tip splits into three gnarled root fingers, bark texture, golden sap glow at the joints.
5. Ember Grove — a glowing acorn wreathed in orange flame, standing on a ring of small smoldering embers and ash sparks around its base.

Row 2:
6. Thunderstorm Branch — golden lightning bolt shaped like an oak branch, with a second darker storm-blue bolt striking down from a tiny cloud at the top.
7. Hibernation Ward — pale blue six-pointed snowflake inside a thin frosted ring, with a soft icy mist ring around it, faint golden core.
8. Golden Billiard Acorn — a polished golden acorn with a bright cue-ball shine and three small golden shards flying off, motion arcs.
9. Old Tree's Blessing — bark charm plank wrapped in vine, with a glowing pale-blue crystal now surrounded by a golden aura and small oak leaves sprouting from the plank.
10. Forest's Breath — cluster of lavender mushrooms with a big soft puff of glowing purple-green spores bursting upward, tiny golden motes.

Row 3:
11. Queen Bee's March — a larger regal honeybee with a tiny golden crown, translucent wings, trailing a curved streak of amber honey drops.
12. Harvest Storehouse — wooden storehouse hut with a moss-green leaf roof, overflowing with golden acorns, a small glowing acorn shooting out of the doorway.
13. Forest-Wind Boomerang — oak boomerang with leaf carvings, three sharp green leaf blades flying off its trailing edge in a fan.
14. Full-Bloom Seed — winged maple seed (samara) with pale green wings, splitting into three smaller spinning seeds, golden center.
15. Treasure Chest — small rounded oak chest with brass-gold bands and an acorn-shaped clasp, lid slightly open with warm golden light spilling out, one acorn peeking over the rim.

Output: a single PNG, 1400 x 840 pixels or larger, sharp, no compression artifacts.
```

### 시트 2 프롬프트 — 필드용 상자 스프라이트 2프레임

```
Game sprite sheet, 2 frames side by side, evenly spaced, centered, solid pure black background (#000000), no text, no frame, no border.

Style: painted cartoon fantasy, thick dark-brown outlines, warm oak wood texture, cream highlights, moss-green accents, brass-gold bands, viewed from a 3/4 top-down angle as seen in a top-down survival game. Small and chunky, readable at 32px.

Frame 1: Closed treasure chest — small rounded oak chest with two brass-gold bands and an acorn-shaped brass clasp, a tuft of moss on one corner, sitting on nothing (no ground shadow, no grass).
Frame 2: Same chest opened — lid tilted back, warm golden light glowing from inside, three small golden sparkle motes rising above it.

Output: a single PNG, 1024 x 512 pixels or larger, sharp.
```

## 6. 미결

- 정예 체력 계수(`eliteHealth`)의 실플레이 조정. 목표는 정예 1마리 20~30초.
- 헬 모드에서 진화 다중 보유 시 후반 밸런스.
- 상자 +2/+3 확률(25%/10%)이 과하면 20%/5%로 내리는 선택지.

## 진화 도감 (v1.1.0)

- `src/codex.js`: `codexHTML(seen)`이 14종 카드를 렌더한다. 이름·태그·효과·조합(기본 무기 최대 레벨 + 짝 패시브 최대 레벨) 모두 발견 후에만 보인다. 미발견 카드는 어두운 실루엣과 `? + ?`만 표시한다. 일시정지도 진화 전 조합을 알려 주지 않는다.
- 저장 키 `evolutionsSeen`(진화 무기 id 배열). 상자에서 진화가 일어나는 순간(`chest` 이벤트, `kind === "evolve"`)과 결과 화면 진입 시 장착 중인 진화 무기를 등록한다. 실험실·보스 체험은 별도 페이지라 도감에 반영되지 않는다.
- 시작 화면 패치노트 아래 "진화 도감 n / 14" 버튼으로 연다. 타이틀 상태에서만 열리며 ESC로 닫힌다.

