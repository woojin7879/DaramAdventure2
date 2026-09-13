import test from 'node:test';
import assert from 'node:assert/strict';
import {introFrame,INTRO_DURATION} from '../src/intro-scene.js';

test('opening crosses four seasons then brakes, reveals frost and title, and fades to menu',()=>{
  assert.deepEqual([.5,2,4,6].map(t=>introFrame(t).season),[0,1,2,3]);
  assert.equal(introFrame(1).moving,true);
  assert.equal(introFrame(7.2).moving,false);
  assert.equal(introFrame(6).frost,0);
  assert.equal(introFrame(8.5).frost,1);
  assert.equal(introFrame(6).title,0);
  assert.equal(introFrame(8.5).title,1);
  assert.equal(introFrame(INTRO_DURATION).fade,0);
  assert.equal(introFrame(7.2).travel,introFrame(9).travel);
});
test('opening camera stays continuous, moves forward and all sprite crops stay in the eight-frame atlas',()=>{
  let previous=0;
  for(let t=0;t<=INTRO_DURATION;t+=.01) {
    const frame=introFrame(t);
    assert.ok(frame.travel>=previous);
    assert.ok(frame.travel-previous<.011);
    assert.ok(Number.isInteger(frame.sprite)&&frame.sprite>=0&&frame.sprite<8);
    previous=frame.travel;
  }
});
