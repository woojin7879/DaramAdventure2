// Short spoken subtitles. Images, speakers and cues are kept together per shot.
const scenes = [
  ['돌아온 목소리', '다람이', '……엄마? 아빠?\n정말 돌아온 거야?', 'year3-story', 'dawn', 0],
  ['늦은 포옹', '엄마', '너무 오래 혼자 기다리게 해서 미안해.\n이제 숨기지 않을게. 같이 집으로 가자.', 'year3-reunion', 'warm', 0],
  ['말하지 못한 여행', '다람이', '먹을 거 구하러 간다며.\n그동안 어디 있었던 거야?', 'year3-reunion', 'warm', 0],
  ['산 너머의 학교', '아빠', '먹이를 구하던 중 급한 편지가 왔어. 산 너머 학교로 갔지.\n아이들을 덮친 검은 서리가 이 숲까지 이어져 있었어.', 'year3-school-defense', 'memory', 0],
  ['길어진 겨울', '엄마', '해마다 돌아오려 했지만, 서리가 편지와 길을 막았어.\n학교를 지킨 뒤에도 숲 쪽 길은 닫혀 있었지.', 'year3-school-defense', 'memory', 0],
  ['서로가 열어 준 길', '아빠', '우리는 학교 쪽 서리를 걷어 냈고, 넌 숲 쪽 심장을 깨 줬어.\n양쪽 길이 열려서, 이제 서로에게 돌아올 수 있었단다.', 'year3-story', 'dawn', 0],
  ['이상했던 일들', '다람이', '위험할 때마다 내 안에서 낯선 힘이 느껴졌어.\n그건 뭐였던 거야?', 'year3-reunion', 'warm', 1],
  ['깨어난 힘', '엄마', '네 안에 잠들어 있던 힘이 깨어난 거야.\n이번에는 네 뜻으로 움직여 볼까?', 'year3-acorn-unlit', 'magic', 1],
  ['작은 수업', '아빠', '이 도토리가 조금 따뜻해지면 좋겠다고 생각해 보렴.\n이번에는 던지지 말고.', 'year3-acorn-unlit', 'magic', 1],
  ['첫 번째 불꽃', '다람이', '……내가 켠 거야?\n이건 먹으면 안 되겠다.', 'year3-acorn-magic', 'magic', 1],
  ['멀리서 보낸 인사', '엄마', '학교 탑에서 꿈으로 연락했지만 짧은 말만 닿았어.\n예전부터 길을 표시하던 매듭이 우리를 이어 줬지.', 'ending-2', 'memory', 2],
  ['너의 선택', '엄마', '그리고, 무서워도 다시 걷고, 모은 먹이를 나눈 건 너야.\n그 용기는 누구에게 물려받은 게 아니란다.', 'year3-reunion', 'warm', 2],
  ['이제 알려줄 때', '아빠', '곁에서 천천히 가르쳐 주고 싶었는데.\n……이제 알려줄 때가 왔구나.', 'year3-wizard-reveal', 'reveal', 2],
  ['새로운 모험', '엄마', '우리 가족에게 이어져 온 힘이란다.\n너는 마법사란다, 다람아.', 'year3-wizard-reveal', 'reveal', 2],
];
export const FINAL_ENDING = scenes.map(([title, , text]) => [title, text]);
export const FINAL_IMAGES = scenes.map(([, , , image]) => image);
export const FINAL_SHOTS = scenes.map(([title, speaker, , , mood, cue], index) => ({
  speaker, mood, cue,
  still: ["깨어난 힘","작은 수업","첫 번째 불꽃"].includes(title),
  focus: '50% 50%',
}));
