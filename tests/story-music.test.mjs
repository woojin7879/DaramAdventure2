import test from "node:test";
import assert from "node:assert/strict";
import { StoryMusic } from "../src/story-music.js";
test("story score waits for gesture, changes cue, and fades/stops when inactive", () => {
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
    setTargetAtTime(value) {
      this.value = value;
    },
  });
  const voices = [];
  const context = {
    currentTime: 0,
    state: "running",
    destination: {},
    resume() {},
    createGain() {
      return {
        gain: param(),
        connect() {
          return this;
        },
        disconnect() {},
      };
    },
    createOscillator() {
      const v = {
        frequency: param(),
        connect(node) {
          return node;
        },
        start(t) {
          this.started = t;
        },
        stop(t) {
          this.stopped = t;
        },
        disconnect() {},
      };
      voices.push(v);
      return v;
    },
  };
  let created = 0;
  const music = new StoryMusic({
    createContext: () => {
      created++;
      return context;
    },
  });
  music.update(true);
  assert.equal(created, 0);
  music.unlock();
  music.update(true);
  assert.equal(voices.length, 4);
  const firstFrequency = voices[0].frequency.value;
  music.select(1);
  context.currentTime = 2;
  music.update(true);
  assert.notEqual(voices[4].frequency.value, firstFrequency);
  music.update(false);
  assert.equal(music.master.gain.value, 0);
  assert.ok(voices.every((v) => v.stopped <= 2.6));
  for (const v of voices) v.onended();
  assert.equal(music.voices.size, 0);
});
