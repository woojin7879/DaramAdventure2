import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonAudioActive } from '../src/audio-routing.js';
import { SeasonMusic } from '../src/music.js';

test('menu and combat BGM never overlap intro, stories or results', () => {
  const base={state:'playing',modalKind:'',introActive:false,hidden:false};
  assert.equal(seasonAudioActive(base),true);
  assert.equal(seasonAudioActive({...base,state:'title'}),true);
  assert.equal(seasonAudioActive({...base,state:'levelup',modalKind:'levelup'}),true);
  for(const change of [{introActive:true},{state:'dead'},{state:'won'},{modalKind:'ending'},{modalKind:'result'},{modalKind:'pause'},{hidden:true}])
    assert.equal(seasonAudioActive({...base,...change}),false,JSON.stringify(change));
});

test('turning sound on in an inactive scene cannot restart a previous BGM', () => {
  let played=0;
  const music=new SeasonMusic({createAudio:()=>{played++;throw Error('must not create a channel');}});
  music.unlocked=true;
  music.suspend();
  music.setEnabled(false);
  music.setEnabled(true);
  assert.equal(music.active,false);
  assert.equal(played,0);
});

test('intro gesture primes menu BGM silently, then menu handoff starts it', async () => {
  let plays=0,pauses=0;
  const audio={volume:0,addEventListener(){},play(){plays++;return Promise.resolve();},pause(){pauses++;}};
  const music=new SeasonMusic({createAudio:()=>audio});
  music.prime();
  await Promise.resolve();
  assert.equal(plays,1);
  assert.equal(pauses,1);
  assert.equal(audio.volume,0);
  assert.equal(music.active,false);
  music.unlock(0);
  await Promise.resolve();
  music.update(.1,{active:true});
  assert.equal(plays,2);
  assert.ok(audio.volume>0);
  music.setEnabled(false);
  assert.equal(audio.volume,0);
});

test('saved mute does not prime or start menu music after intro', () => {
  const music=new SeasonMusic({createAudio:()=>{throw Error('muted audio should not load');}});
  music.setEnabled(false);
  music.prime();
  music.update(.1,{active:true});
  assert.equal(music.channels.size,0);
});
