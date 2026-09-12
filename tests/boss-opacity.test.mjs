import test from 'node:test';
import assert from 'node:assert/strict';
import {clearBlackMatte} from '../src/boss-opacity.js';
test('boss matte removes exterior black but keeps enclosed dark body details opaque',()=>{
 const w=7,h=7,data=new Uint8ClampedArray(w*h*4);
 for(let n=0;n<w*h;n++)data[n*4+3]=255;
 for(let y=1;y<6;y++)for(let x=1;x<6;x++)if(x===1||x===5||y===1||y===5)data[(y*w+x)*4+1]=90;
 clearBlackMatte(data,w,h,1,1);
 assert.equal(data[3],0);
 assert.equal(data[(3*w+3)*4+3],255);
 assert.equal(data[(1*w+3)*4+3],255);
});
