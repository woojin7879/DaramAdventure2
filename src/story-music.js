// Original slow three-scene cue: soft plucked tones over sustained open chords.
const melodies = [
  [74, 69, 72, 76, 74, 67, 69, null, 72, 74, 77, 76, 72, 69, 67, null],
  [72, 76, 79, 81, 79, 76, 74, null, 76, 79, 84, 81, 79, 76, 72, null],
  [72, 67, 64, 67, 69, 72, 76, null, 74, 72, 69, 67, 64, 62, 60, null],
];
const chords = [
  [50, 57, 65],
  [53, 60, 67],
  [48, 55, 64],
];
export class StoryMusic {
  constructor({
    createContext = () =>
      new (window.AudioContext || window.webkitAudioContext)(),
    onError = () => {},
  } = {}) {
    this.createContext = createContext;
    this.onError = onError;
    this.scene = 0;
    this.beat = 0;
    this.next = 0;
    this.voices = new Set();
    this.active = false;
  }
  unlock() {
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
      }
      Promise.resolve(this.context.resume()).catch(() =>
        this.onError("스토리 음악을 재생하지 못했습니다."),
      );
    } catch {
      this.onError("이 브라우저에서는 스토리 음악을 재생할 수 없습니다.");
    }
  }
  select(scene, year = 1) {
    const transpose = year === 2 ? -2 : year === 3 ? 3 : 0;
    if (this.scene === scene && this.transpose === transpose) return;
    this.transpose = transpose;
    this.scene = scene;
    this.beat = 0;
    this.next = 0;
  }
  note(midi, time, duration, volume, type = "sine") {
    if (midi === null || this.voices.size >= 24) return;
    const c = this.context,
      oscillator = c.createOscillator(),
      envelope = c.createGain();
    oscillator.type = type;
    oscillator.frequency.value =
      440 * 2 ** ((midi + (this.transpose || 0) - 69) / 12);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + 0.035);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope).connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }
  update(active) {
    if (!this.context) return;
    const now = this.context.currentTime;
    if (active !== this.active) {
      this.active = active;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(
        active ? 0.45 : 0,
        now,
        active ? 0.5 : 0.12,
      );
      if (!active) {
        for (const voice of this.voices) voice.stop(now + 0.6);
        this.next = 0;
      }
    }
    if (!active || this.context.state !== "running") return;
    if (!this.next || this.next < now - 0.2) this.next = now + 0.05;
    while (this.next < now + 0.15) {
      const beat = this.beat % 16;
      this.note(melodies[this.scene][beat], this.next, 2.8, 0.13);
      if (beat % 4 === 0)
        for (const midi of chords[this.scene])
          this.note(midi, this.next, 5.2, 0.045, "triangle");
      this.next += 60 / 56;
      this.beat++;
    }
  }
}
