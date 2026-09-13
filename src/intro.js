import { StoryPlayback } from './cinematic.js';
import { INTRO_DURATION, drawIntro } from './intro-scene.js';
import { IntroAudio } from './intro-audio.js';
import { opaqueBossAtlas } from './boss-opacity.js';

export function playIntro({ onFinish = () => {} } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('section');
  layer.className = 'game-intro';
  layer.setAttribute('role', 'dialog');layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', '사계절을 달리는 다람이 · 게임 오프닝');
  layer.innerHTML = `<canvas class="intro-canvas" aria-hidden="true"></canvas>
    <p class="intro-loading" role="status">숲을 깨우는 중…</p>
    <div class="intro-title"><span>다람이의</span><strong>모험 <b>2</b></strong><small>DARAMI ADVENTURE II</small></div>
    <div class="intro-controls"><button class="intro-sound" aria-pressed="false">소리 켜기</button><button class="intro-skip">건너뛰기 <kbd>ESC</kbd></button></div>`;
  const siblings = [...document.body.children].filter(el => el.tagName !== 'SCRIPT');
  const previousInert = siblings.map(el => el.inert);
  siblings.forEach(el => { el.inert = true; });document.body.append(layer);
  const canvas=layer.querySelector('canvas'), title=layer.querySelector('.intro-title');
  const audio=new IntroAudio();
  const playback=new StoryPlayback();playback.duration=reduced?1.5:INTRO_DURATION;
  let ended=false,raf,timeout,previous=performance.now(),images=null;
  const resize=()=> {const ratio=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);};
  resize();window.addEventListener('resize',resize);
  const finish=()=> {
    if(ended)return;ended=true;cancelAnimationFrame(raf);clearTimeout(timeout);audio.close();
    window.removeEventListener('resize',resize);
    document.removeEventListener('visibilitychange',visibility);
    window.removeEventListener('keydown',keydown,true);layer.remove();
    siblings.forEach((el,i)=>{el.inert=previousInert[i];});onFinish();
  };
  const keydown=event=> {
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
      title.style.opacity=frame.title;title.style.transform=`translateY(${(1-frame.title)*14}px)`;
      layer.style.opacity=reduced?1:frame.fade;
      audio.update(playback.elapsed,frame);
    }
    raf=requestAnimationFrame(tick);
  };
  layer.querySelector('.intro-skip').onclick=finish;
  const soundButton=layer.querySelector('.intro-sound');
  soundButton.onclick=async()=> {
    try {
      if(audio.enabled)audio.mute();else await audio.enable();
      if(ended){audio.close();return;}
      soundButton.textContent=audio.enabled?'소리 끄기':'소리 켜기';soundButton.setAttribute('aria-pressed',String(audio.enabled));
    } catch {soundButton.textContent='소리 사용 불가';soundButton.disabled=true;}
  };
  layer.querySelector('.intro-skip').focus({preventScroll:true});
  window.addEventListener('keydown',keydown,true);document.addEventListener('visibilitychange',visibility);
  const load=([key,url])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=url;});
  Promise.all(Object.entries({run:'/assets/intro-run.png',scene:'/assets/intro-seasons.png',frost:'/assets/intro-frost.png',scenery:'/assets/season-scenery.png'}).map(load)).then(entries=>{
    if(ended)return;images=Object.fromEntries(entries);images.run=opaqueBossAtlas(images.run);clearTimeout(timeout);layer.querySelector('.intro-loading').hidden=true;previous=performance.now();
  }).catch(finish);
  // Never trap the menu if an image request stalls.
  timeout=setTimeout(()=>{if(!images&&!ended)finish();},12000);
  raf=requestAnimationFrame(tick);return finish;
}
