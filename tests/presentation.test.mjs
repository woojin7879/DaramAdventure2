import test from "node:test";
import assert from "node:assert/strict";
import { createScenery } from "../src/render.js";
import { SeasonMusic } from "../src/music.js";
test("forest scenery is sparse, deterministic, and padded rectangles never overlap", () => {
  const items = createScenery();
  assert.equal(items.length, 72);
  assert.deepEqual(items, createScenery());
  for (let i = 0; i < items.length; i++) {
    const a = items[i].box;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j].box;
      assert.ok(
        !(
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top
        ),
        `overlap ${i}/${j}`,
      );
    }
  }
});
const makeMusic = () => {
  const audios = [];
  const music = new SeasonMusic({
    createAudio: (url) => {
      const audio = {
        url,
        volume: 0,
        paused: true,
        plays: 0,
        addEventListener() {},
        play() {
          this.paused = false;
          this.plays++;
          return Promise.resolve();
        },
        pause() {
          this.paused = true;
        },
      };
      audios.push(audio);
      return audio;
    },
  });
  return { music, audios };
};
test("music waits for user gesture, crossfades seasons, and pauses after outgoing fade", async () => {
  const { music, audios } = makeMusic();
  music.update(0.1);
  assert.equal(audios.length, 0);
  music.unlock(0);
  await Promise.resolve();
  for (let i = 0; i < 25; i++) music.update(0.1);
  assert.ok(audios[0].volume > 0.19);
  music.select(1);
  await Promise.resolve();
  music.update(0.1);
  assert.ok(audios[0].volume > 0);
  assert.ok(audios[1].volume > 0);
  for (let i = 0; i < 30; i++) music.update(0.1);
  assert.equal(audios[0].paused, true);
  assert.ok(audios[1].volume > 0.19);
});
test("music mute and tab suspension stop playback without losing selected season", async () => {
  const { music, audios } = makeMusic();
  music.unlock(2);
  await Promise.resolve();
  music.update(0.1);
  music.setEnabled(false);
  assert.equal(audios[0].paused, true);
  assert.equal(audios[0].volume, 0);
  assert.equal(music.season, 2);
  music.setEnabled(true);
  await Promise.resolve();
  music.suspend();
  assert.equal(audios[0].paused, true);
  assert.equal(music.season, 2);
});
