# 사계절 질주 인트로 에셋

9.6초: 봄 0초 → 여름 1.8초 → 가을 3.6초 → 겨울 5.4초 → 6.5초 제동 → 6.65초 검은 서리 → 7.25초 타이틀 → 메인.

- intro-run.png: 4×2 달리기/멈춤 시트. 생성기의 투명 배경 결과에 체크무늬가 포함되어 검은 배경으로 재생성했다. 원본은 그대로 보관하고 런타임의 기존 외곽 매트 제거기로 합성한다. 1행 접지 435px, 2행 접지 413px를 기준으로 정렬한다.
- intro-seasons.png: 네 계절 가로 배경 4행.
- intro-frost.png: 진짜 알파 채널이 있는 검은 서리 전경.
- 앞쪽 나무는 기존 season-scenery.png 사용. 배경/전경 별도 이동, 날씨 입자는 런타임 연출.
- 소리는 사용자가 켠 경우에만 합성 바람·빗소리와 발걸음을 재생한다. 숨긴 탭에서는 진행/소리를 멈추고 종료 시 오디오·키 이벤트·타이머를 정리한다.

## run

Create a production-ready transparent PNG sprite sheet for a game cinematic, 1536x1024, exactly 4 columns x 2 rows of equal 384x512 cells. Reference is ONLY character identity: Darami the cute upright squirrel in the FIRST ROW of reference. Preserve brown/orange body, cream belly and muzzle, large curled tail, little black eye, crisp warm pixel-art style and black pixel outline. ALL eight figures FACE RIGHT. No clothes, no other characters, no props, no ground, NO backdrop, TRUE TRANSPARENT alpha everywhere outside sprites, no glow no text no cell borders. Row 1 four successive distinct running gait frames: left foot forward, airborne, right foot forward, squash contact, arms swing opposite, tail follows. Row 2: frame 5 braking feet forward, frame 6 standing looking right alert, frame 7 ears up looking slightly upward right, frame 8 same stance holding still looking toward danger right. Consistent character size and position in every cell, feet at y=450 within each cell, all silhouette within central 300x350 of each cell. Separate feet visibly in run cycle, keep upright bipedal squirrel identity, NOT four-legged. High quality clean pixel sprites.

## scene

Create ONE image 1536x1024 production game background atlas, EXACTLY four equal horizontal strips 1536x256 stacked vertically with NO gutters NO lines NO text. Each strip is the same SIDE-SCROLLING side-view woodland setting in a different season. NO squirrel NO characters NO creatures. Warm cinematic pixel-art, restrained beautiful detail, soft atmospheric light, NOT busy dithering or speckled texture. Each strip composition horizon at y=175 within strip, walkable gently flat woodland path along bottom 70px, mid-distance tree trunks at varying heights with crowns, distant luminous forest clearing near right center. Strip 1 SPRING: fresh green woodland, pale pink blossoms, young grass; strip 2 SUMMER: deep rich green foliage, rainy blue ambient shafts; strip 3 AUTUMN: golden orange deciduous canopy and copper fallen leaves along path; strip 4 WINTER: genuine snow drifts covering ground and branches, bare tree silhouettes, blue dusk atmosphere. Consistent camera/horizon/path elevation in all four. Horizontal edges should blend when repeated in side scrolling. Cinematic depth, hand crafted high quality pixel-art like reference environment, calm readable large masses.

## frost

Create a cinematic pixel-art foreground overlay on TRUE TRANSPARENT background, 1536x1024. ONLY a creeping BLACK FROST growth originating at bottom-right corner: branching jagged dark charcoal crystalline ice tendrils with very subtle cold blue edges, crawling along the bottom fifth toward left and up the rightmost quarter. Keep center and entire left upper 80% completely transparent. Shapes have crisp attractive pixel-art edges, readable larger ice structures with a few tiny flakes, no noisy texture, no glow haze, no opaque sky/background, no floor, no characters, no words. This is a game cinematic overlay to reveal slowly over a snowy forest as ominous frost invades. The densest ice is at right edge and bottom right; taper to a few delicate tendrils toward center-bottom. No border around entire image.

## 고해상도 캐릭터와 후속작 숫자 연출

현재 활성 캐릭터는 `intro-run-hd-a/b/c.png`의 2열×1행 시트 세 장이다. 이미지 한 장은 1536×1024, 동작당 셀은 768×1024로 기존 384×512 대비 각 변 두 배다. 달리기 4동작, 제동/정지 2동작을 새로 그렸다. 원본의 색상/꼬리/자세를 참조하고 검은 배경을 지정해 생성했다. 기존 `intro-run.png`는 보존한다.

런타임에서 매트를 제거한 실루엣의 발 위치를 계산해 접지점을 정렬하며, 캐릭터만 고품질 축소 샘플링을 쓴다. 출력은 최대 3배 화면 밀도, 총 800만 픽셀 한도다.

7.25초부터 ‘다람이의 모험’이 나타난다. 8.15초에 숫자 2가 크게 접근하고 8.35초에 찍힌다. 작은 반동과 테두리 파동, 소리를 켰을 때 짧은 충격음을 동기화한다. 동작 줄이기에서는 완성된 제목만 표시한다.
