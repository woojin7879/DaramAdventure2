import test from 'node:test';
import assert from 'node:assert/strict';
import {PROLOGUE,shouldPlayPrologue} from '../src/prologue.js';
import {subtitleDuration} from '../src/cinematic.js';
test('prologue only precedes an unseen fresh first year, never checkpoint or later years',()=>{
 assert.equal(shouldPlayPrologue({year:1,checkpoint:null,seen:false}),true);
 assert.equal(shouldPlayPrologue({year:1,checkpoint:{year:1},seen:false}),false);
 assert.equal(shouldPlayPrologue({year:1,checkpoint:null,seen:true}),false);
 assert.equal(shouldPlayPrologue({year:2,checkpoint:null,seen:false}),false);
 assert.equal(shouldPlayPrologue({year:3,checkpoint:null,seen:false}),false);
 assert.equal(PROLOGUE.images.length,PROLOGUE.ending.length);
 assert.ok(PROLOGUE.ending.reduce((s,[,t])=>s+subtitleDuration(t),0)<=20);
});
