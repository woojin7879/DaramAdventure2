# 신규 게임 에셋 기록

2026-09-11, built-in ImageGen 사용. 원작 이미지를 참고 자료로 넣어 **새 에셋**을 생성했다. 원작의 갈색 몸통, 크림색 얼굴·배, 큰 말린 꼬리, 작은 귀와 짧은 팔다리를 기준으로 삼았다.

| 파일                              | 용도                             | 규격                                     |
| --------------------------------- | -------------------------------- | ---------------------------------------- |
| `public/assets/forest-atlas.png`  | 캐릭터·적·환경·아이템 스프라이트 | 1536×1024 RGBA, 6열×4행, 셀 256×256      |
| `public/assets/forest-ground.png` | 반복 숲 바닥                     | 1254×1254 RGB, 게임에서 480u 타일로 표시 |

아틀라스 행 구성:

1. 다람이 대기·걷기 A·걷기 B·피격·꼬리 올리기·잠든 자세.
2. 뱀·여우·버섯·박쥐·멧돼지·겨울곰 잔영.
3. 참나무·침엽수·덤불·바위·버섯 군락·그루터기.
4. 특별 도토리·비축고·벌·부적·화염구·얼음 결정.

참고 원본: `/Users/woojin/Documents/unity/week3/Madcampweek3/Assets/Character/walk_01.png`, `idle_01.png`. 원작 파일은 변경하지 않았다.

요청 프롬프트 전문은 [ASSET_PROMPTS.txt](ASSET_PROMPTS.txt)에 보관했다. 바닥 이미지는 요청한 1024 대신 1254 크기로 반환되었고 정사각 반복 텍스처로 사용한다. 실제 투명 채널이 있는 아틀라스이며 이미지 생성 결과의 프레임 정합성과 반복 이음새는 추가 다듬기 대상이다.

## v0.2 전투 효과·특별 도토리

`public/assets/combat-atlas.png`: 1536×1024, 3열×2행, 각 셀 512×512. 첫 행은 얼음 결정 고리·꼬리 휩쓸기·문양 조약돌, 둘째 행은 자석·공격력·회복 도토리다. built-in ImageGen으로 생성했다.

투명 배경 생성이 두 차례 실제 알파를 제공하지 않아 해당 결과는 사용하지 않았다. 최종 파일은 검정 배경의 효과 이미지이며 Canvas의 screen 합성으로 검정 바탕을 제외하고 발광 효과를 표현한다. 원본 파일을 코드로 편집하지 않았다. 최종 프롬프트는 [COMBAT_ASSET_PROMPT.txt](COMBAT_ASSET_PROMPT.txt)에 기록했다.

## 계절별 BGM

이번 버전은 새로 작곡하지 않고 원작 Unity 프로젝트의 계절 음원을 재사용했다. 원작 폴더의 파일은 변경하지 않았다.

| 게임 파일                        | 원본                       | 길이       |
| -------------------------------- | -------------------------- | ---------- |
| `public/assets/audio/spring.mp3` | `Assets/Audio/봄.mp3`      | 약 134.6초 |
| `public/assets/audio/summer.mp3` | `Assets/Audio/여름.mp3`    | 약 86.1초  |
| `public/assets/audio/autumn.mp3` | `Assets/Audio/가을.mp3`    | 약 89.1초  |
| `public/assets/audio/winter.mp3` | `Assets/Audio/겨울.mp3` | 약 116.5초 |

각 음원은 반복 재생하고 계절 변경 시 2.5초 교차 페이드한다. 레벨업에서는 음량을 낮추고, 일시정지·탭 비활성화·소리 끄기에서는 재생을 멈춘다. 원작 음원 출처 이력은 원작 프로젝트를 따른다.

## v0.3 연차 엔딩 삽화

`public/assets/ending-1.png`, `ending-2.png`, `ending-3.png`: 각각 1536×1024 RGB, imagegen 신규 제작. 현 다람이 아틀라스를 참고하여 겨울곰의 소멸과 매듭 발견, 얼어붙은 물길, 빈 잠자리를 남겨둔 굴을 그렸다. 부모의 행방은 확정하지 않는다. 프롬프트는 `ENDING_ASSET_PROMPTS.txt`에 기록했다. 세 원본을 시각 확인한 뒤 이미지 자체 변형 없이 화면 프레임으로 배치한다.

채찍과 번개는 `src/render.js`의 Canvas 전투 궤적 효과로 갱신한다. 외부 게임의 효과 이미지를 복제하지 않았다.

## v0.7 후속 연차

- `boss-atlas.png`: 1536×1024 RGB, 768×1024 좌우2칸. 검은 물의 뱀 / 긴 겨울의 심장. 검정 바탕을 screen 합성한다.
- `river-ground.png`, `roots-ground.png`: 각각1254×1254 RGB, 젖은 강변 / 오래된 뿌리 바닥. 반복 텍스처로 사용한다. 완벽한 이음새는 미검증.
- `year2-story.png`, `year3-story.png`: 각각1536×1024 RGB, 저장터 발견 / 함께 되찾은 봄. 기존 다람이 실루엣을 참조한 신규 삽화. 각 연차 자막3장면에 같은 삽화를 사용한다.

5개 모두 imagegen 신규 제작 후 원본을 시각 확인했다. 프롬프트는 `YEARS_2_3_ASSET_PROMPTS.txt`. 별도 부모 캐릭터를 등장시키거나 생사를 확정하는 장면은 없다.

### 최종 재회 엔딩

`year3-reunion.png`: 1536×1024 RGB 신규 imagegen 삽화. 살아 돌아온 마법사 부모님, 놀란 다람이, 익숙한 매듭·황금빛 지팡이·편지를 든 올빼미를 담았다. 사용자 변경으로 부모님 생사 미확정 설정을 대체한다. 원본 시각 확인 완료. 프롬프트는 `REUNION_ASSET_PROMPT.txt`. 현재 3년차 엔딩은 이 삽화를 사용한다.

## 마법학교 귀환 시네마틱

내장 image_gen으로 `public/assets/year3-school-defense.png`와 `public/assets/year3-acorn-magic.png`를 생성했다. 기존 재회 삽화를 캐릭터/화풍 참고로 사용했다. 부모님의 학교 방어전과 다람이의 작은 도토리 불꽃 시연에 사용한다. 프롬프트 원문: [SCHOOL_CINEMA_ASSET_PROMPTS.md](SCHOOL_CINEMA_ASSET_PROMPTS.md).

최종 공개 장면: `public/assets/year3-wizard-reveal.png`. 내장 image_gen으로 부모님과 다람이의 가까운 구도를 새로 생성했다. 프롬프트: [WIZARD_REVEAL_ASSET_PROMPT.md](WIZARD_REVEAL_ASSET_PROMPT.md).

## 보스 동작 아틀라스

`public/assets/serpent-animation.png`, `public/assets/heart-animation.png`: 각1536×1024, 4열×2행, 셀384×512. 대기/호흡/이동A/이동B/공격 준비/공격/시전/분노의 8동작. 기존 boss-atlas.png를 디자인 참고로 내장 image_gen을 사용했다. 검은 배경을 screen 합성하며 실제 이동과 공격 상태가 프레임을 결정한다. 원본은 보존했다. 프롬프트: BOSS_ANIMATION_PROMPTS.md.

## 보스 패턴 이미지 애니메이션

`public/assets/serpent-vfx.png`, `public/assets/heart-vfx.png`: 각 4열×4행. 행당 이펙트 1종, 열당 연속4프레임으로 총8종32프레임. 내장 image_gen으로 생성했으며 프롬프트는 BOSS_VFX_PROMPTS.md에 기록했다. 검은 배경 screen 합성. 뱀: 독액탄/독수 웅덩이/물길/비늘 물결. 심장: 뿌리 분출/서리꽃/서리 박동/코어 파편.

## 1년차 겨울곰 그래픽

`bear-animation.png`: 4×2 동작8종. `bear-vfx.png`: 4×4, 입김/앞발 충격/서리 파동/눈보라 잔상 각4프레임. 기존 숲 아틀라스의 겨울곰을 참고하여 내장 image_gen으로 생성했다. 효과 시트의 셀 경계선은 렌더링 시 6px 안쪽을 취해 제외한다. 원본 파일은 보존. 프롬프트 BEAR_ART_PROMPTS.md.

## 사계절 지형과 고정 오브젝트

season-ground.png: 2×2 사계절 바닥(봄 야생화, 여름 클로버, 가을 낙엽, 겨울 적설). season-scenery.png: 6종×4계절 RGBA 투명 오브젝트. 내장 image_gen으로 생성했으며 프롬프트 SEASON_ART_PROMPTS.md. 생성 시트의 행 간격을 소스 좌표로 보정하고 오브젝트별 발끝을 월드 좌표에 맞춘다. 이미지 파일 자체는 원본을 유지한다.

## 저밀도 사계절 바닥 교체

현재 사용: public/assets/season-ground-soft.png. 원래 forest-ground.png를 참고해 내장 image_gen으로 다시 생성했다. 촘촘한 꽃·클로버·낙엽 카펫 대신 낮은 대비의 넓은 이끼 면과 드문 풀/낙엽/얼어붙은 풀을 배치했다. 기존 season-ground.png는 보관한다. 프롬프트 QUIET_GROUND_PROMPT.md.

## 도토리 점화 전 컷

public/assets/year3-acorn-unlit.png: year3-acorn-magic.png를 내장 image_gen으로 편집해 도토리 불꽃과 근처 광채만 제거했다. 기존 점화 후 컷과 구도를 맞췄다. 프롬프트 ACORN_BEFORE_PROMPT.md.
