import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { StoryPlayback } from '../src/cinematic.js';
import { FINAL_ENDING, FINAL_IMAGES, FINAL_SHOTS } from '../src/final-story.js';
import { existsSync } from 'node:fs';
const game = year => { const g = new Game({random:()=>.3}); g.start(false, null, year); return g; };
test('lethal damage clears camera shake before the result event and frozen steps', () => {
  const g = game(1); let seen;
  g.onEvent = event => { if (event === 'dead') seen = g.shake; };
  g.player.moving = true; g.hurt(1000);
  assert.equal(g.state, 'dead'); assert.equal(seen, 0);
  for(let i=0;i<120;i++) g.step(1/60);
  assert.equal(g.shake, 0); assert.equal(g.player.moving, false);
});
test('year one retains opening strength and eases late enemies and all incoming damage', () => {
  const a=game(1), b=game(2), c=game(3);
  assert.equal(a.spawn('snake').hp, b.spawn('snake').hp);
  for(const g of [a,b,c]) g.time=1200;
  assert.ok(Math.abs(a.spawn('snake').hp / b.spawn('snake').hp - .85/.92) < 1e-9);
  assert.ok(b.spawn('snake').hp < c.spawn('snake').hp);
  assert.ok(Math.abs(a.spawn('boss').hp - 7128) < 1e-8);
  assert.ok(Math.abs(b.spawn('boss').hp - 8685.6) < 1e-8);
  assert.ok(Math.abs(c.spawn('boss').hp - 11368.5) < 1e-8);
  a.hurt(20); b.hurt(20);
  assert.equal(a.player.hp, 82); assert.equal(b.player.hp, 81);
});
test('cinematic clock pauses, freezes in hidden tabs, and resets between subtitles', () => {
  const p = new StoryPlayback(); p.start('짧은 대사');
  for(let i=0;i<30;i++) assert.equal(p.tick(.1), false);
  const elapsed=p.elapsed;
  p.paused=true; p.tick(.1); assert.equal(p.elapsed, elapsed);
  p.paused=false; p.tick(.1,false); assert.equal(p.elapsed, elapsed);
  for(let i=0;i<20;i++) p.tick(.1);
  assert.equal(p.progress, 1);
  p.start('다음 장면'); assert.equal(p.progress, 0);
});
test('final cinema uses credited speakers and real images with a concise automatic runtime', () => {
  let duration=0; const p = new StoryPlayback();
  FINAL_ENDING.forEach(([,text],i)=> {
    assert.ok(FINAL_SHOTS[i].speaker);
    assert.ok(existsSync(new URL(`../public/assets/${FINAL_IMAGES[i]}.png`,import.meta.url)));
    assert.ok(text.split('\n').length<=2);
    p.start(text, i===FINAL_ENDING.length-1); duration+=p.duration;
  });
  assert.ok(new Set(FINAL_IMAGES).size>=4);
  assert.ok(duration>=60 && duration<=100);
});
