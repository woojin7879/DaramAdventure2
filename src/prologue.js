export const PROLOGUE = {
  name: '첫 겨울잠, 그다음 봄',
  ending: [
    ['첫 겨울잠', '혼자 모은 도토리로 첫 겨울을 넘겼어.\n꿈에서는 엄마 아빠의 목소리가 들렸는데…….'],
    ['눈에 보이는 것 너머', '“눈에 보이는 게 전부가 아니란다.”\n엄마가 그렇게 말했었지. 그냥 꿈이었을까?'],
    ['다시, 숲으로', '봄이 왔는데 저 뿌리의 검은 서리는 녹지 않았네.\n이번에는 내가 찾아볼게. 두 분이 돌아올 길을.'],
  ],
  images: ['ending-3','prologue-spring','prologue-spring'],
  shots: [{speaker:'다람이',cue:0},{speaker:'다람이',cue:1},{speaker:'다람이',cue:2}],
};
export const shouldPlayPrologue = ({year,checkpoint,seen}) => year===1 && !checkpoint && !seen;
