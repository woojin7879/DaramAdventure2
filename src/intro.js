import { updateSoundControl } from "./sound-control.js";
import { StoryPlayback } from './cinematic.js';
import { INTRO_DURATION, drawIntro } from './intro-scene.js';
import { IntroAudio } from './intro-audio.js';
import { opaqueBossAtlas } from './boss-opacity.js';

export function playIntro({ onFinish = () => {}, soundEnabled = true, onSoundChange = () => {} } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('section');
  layer.className = 'game-intro';
  layer.setAttribute('role', 'dialog');layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', '사계절을 달리는 다람이 · 게임 오프닝');
  layer.innerHTML = `<canvas class="intro-canvas" aria-hidden="true"></canvas>
    <p class="intro-loading" role="status">숲을 깨우는 중…</p>
    <div class="intro-title"><span>다람이의</span><strong>모험 <b class="intro-number">2<i aria-hidden="true"></i></b></strong><small>DARAMI ADVENTURE II</small></div>
    <div class="intro-controls"><button class="intro-sound" aria-pressed="false">소리 켜기</button><button class="intro-skip">건너뛰기 <kbd>ESC</kbd></button></div>`;
  const siblings = [...document.body.children].filter(el => el.tagName !== 'SCRIPT');
  const previousInert = siblings.map(el => el.inert);
  siblings.forEach(el => { el.inert = true; });document.body.append(layer);
  const canvas=layer.querySelector('canvas'), title=layer.querySelector('.intro-title');
  const audio=new IntroAudio();
  let wantsSound = soundEnabled;
  const playback=new StoryPlayback();playback.duration=reduced?1.5:INTRO_DURATION;
  let ended=false,raf,timeout,previous=performance.now(),images=null;
  const resize=()=> {const ratio=Math.min(3,devicePixelRatio||1,Math.sqrt(8000000/(innerWidth*innerHeight)));canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);};
  resize();window.addEventListener('resize',resize);
  const finish=()=> {
    if(ended)return;ended=true;cancelAnimationFrame(raf);clearTimeout(timeout);audio.close();
    window.removeEventListener('resize',resize);
    document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('keydown',keydown,true);layer.remove();
    siblings.forEach((el,i)=>{el.inert=previousInert[i];});onFinish();
  };
  const keydown=event=> {
    unlockAudio(event);
    if(event.code==='Escape'||((event.code==='Enter'||event.code==='Space')&&document.activeElement!==layer.querySelector('.intro-sound'))) {
      event.preventDefault();event.stopImmediatePropagation();finish();
    } else if(event.key==='Tab') {
      event.preventDefault();const sound=layer.querySelector('.intro-sound'),skip=layer.querySelector('.intro-skip');
      (document.activeElement===sound?skip:sound).focus();
    }
  };
  const visibility=()=> {previous=performance.now();if(document.hidden)audio.context?.suspend();else if(audio.enabled)audio.context?.resume().catch(()=>{});};
  const tick=now=> {
    const elapsed=(now-previous)/1000;previous=now;
    if(images) {
      if(playback.tick(elapsed,!document.hidden)){finish();return;}
      const frame=drawIntro(canvas,images,playback.elapsed,reduced);
      title.style.opacity=frame.title;title.style.transform=`translateY(${(1-frame.title)*14+(reduced?0:frame.impact*3)}px)`;
      const number=layer.querySelector('.intro-number'),ring=number.querySelector('i');
      number.style.opacity=frame.number;number.style.transform=`scale(${reduced?1:frame.numberScale})`;
      ring.style.opacity=reduced?0:frame.impact*.7;ring.style.transform=`scale(${frame.ringScale})`;
      layer.style.opacity=reduced?1:frame.fade;
      audio.update(playback.elapsed,frame);
    }
    raf=requestAnimationFrame(tick);
  };
  layer.querySelector('.intro-skip').onclick=finish;
  const soundButton=layer.querySelector('.intro-sound');
  const startAudio = () => {
    if (ended || !wantsSound || audio.enabled) return;
    audio.enable().catch(() => {});
  };
  const unlockAudio = event => {
    if (!soundButton.contains(event.target)) startAudio();
  };
  updateSoundControl(soundButton, wantsSound);
  soundButton.onclick = () => {
    wantsSound = !wantsSound;
    onSoundChange(wantsSound);
    updateSoundControl(soundButton, wantsSound);
    if (wantsSound) startAudio(); else audio.mute();
  };
  // Preference stays on if autoplay is blocked; the next gesture retries it.
  layer.addEventListener('pointerdown', unlockAudio);
  if (wantsSound) startAudio();
  layer.querySelector('.intro-skip').focus({preventScroll:true});
  window.addEventListener('keydown',keydown,true);document.addEventListener('visibilitychange',visibility);
  const load=([key,url])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=url;});
  Promise.all(Object.entries({runA:'/assets/intro-run-hd-a.png',runB:'/assets/intro-run-hd-b.png',runC:'/assets/intro-run-hd-c.png',scene:'/assets/intro-seasons.png',frost:'/assets/intro-frost.png',scenery:'/assets/season-scenery.png'}).map(load)).then(entries=>{
    if(ended)return;images=Object.fromEntries(entries);images.runFrames=prepareHeroFrames([images.runA,images.runB,images.runC]);clearTimeout(timeout);layer.querySelector('.intro-loading').hidden=true;previous=performance.now();
  }).catch(finish);
  // Never trap the menu if an image request stalls.
  timeout=setTimeout(()=>{if(!images&&!ended)finish();},12000);
  raf=requestAnimationFrame(tick);return finish;
}

function prepareHeroFrames(sheets) {
  const frames=[];
  for(const sheet of sheets) {
    const image=opaqueBossAtlas(sheet,2,1),sw=image.width/2,sh=image.height;
    const data=image.getContext('2d').getImageData(0,0,image.width,image.height).data;
    for(let col=0;col<2;col++) {
      let top=sh,bottom=0,left=sw,right=0;
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++) {
        if(data[(y*image.width+col*sw+x)*4+3]>180) {
          top=Math.min(top,y);bottom=Math.max(bottom,y+1);left=Math.min(left,x);right=Math.max(right,x+1);
        }
      }
      frames.push({image,sx:col*sw,sw,sh,foot:bottom,center:(left+right)/2,height:bottom-top});
    }
  }
  // Preserve the airborne run phase above the common ground plane.
  frames[1].foot+=frames[1].sh*.08;
  return frames;
}
