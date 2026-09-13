import test from 'node:test';
import assert from 'node:assert/strict';
import { readSoundSetting, saveSoundSetting } from '../src/sound-settings.js';
import { IntroAudio } from '../src/intro-audio.js';

test('sound defaults on and both changed states survive a fresh read', () => {
  const values = new Map();
  const storage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.equal(readSoundSetting(storage),true);
  assert.equal(saveSoundSetting(false,storage),true);
  assert.equal(values.get('daram.sound'),'false');
  assert.equal(readSoundSetting(storage),false);
  saveSoundSetting(true,storage);
  assert.equal(readSoundSetting(storage),true);
  for(const value of ['null','"false"','invalid','0']){
    values.set('daram.sound',value);
    assert.equal(readSoundSetting(storage),true);
  }
});

test('unavailable storage does not break audio controls', () => {
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(readSoundSetting(storage),true);
  assert.equal(saveSoundSetting(false,storage),false);
});

test('muting while an autoplay resume is pending cannot turn intro sound back on', async () => {
  const audio = new IntroAudio();
  let complete, volume=1;
  audio.wind={};
  audio.context={currentTime:0,resume:()=>new Promise(resolve=>{complete=resolve;}),suspend:()=>Promise.resolve()};
  audio.gain={gain:{cancelScheduledValues(){},setValueAtTime(value){volume=value;}}};
  const pending=audio.enable();
  audio.mute();
  complete();await pending;
  assert.equal(audio.enabled,false);
  assert.equal(volume,0);
  const enabled=audio.enable();complete();await enabled;
  assert.equal(audio.enabled,true);
});
