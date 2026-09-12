import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonLayers,groundFrame,sceneryFrame} from '../src/season-art.js';
import {createScenery} from '../src/render.js';
test('season changes keep scenery positions, scale and identity fixed',()=>{
 const scenery=createScenery(),before=structuredClone(scenery);
 for(let season=0;season<4;season++)for(const o of scenery){
  const rect=sceneryFrame({width:1536,height:1024},o.sprite,season);
  assert.equal(rect[0],(o.sprite-12)*256);assert.equal(rect[1],season*256);
 }
 assert.deepEqual(scenery,before);assert.deepEqual(createScenery(),before);
});
test('season image transition begins at previous art and completes in six seconds',()=>{
 assert.deepEqual(seasonLayers(2,600,300),{from:1,to:2,blend:0});
 assert.equal(seasonLayers(2,603,300).blend,.5);
 assert.equal(seasonLayers(2,606,300).blend,1);
 assert.equal(seasonLayers(0,0,300).blend,1);
 assert.deepEqual(groundFrame({width:1536,height:1536},3),[768,768,768,768]);
});
