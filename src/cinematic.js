export const subtitleDuration = (text) => Math.min(8.5, Math.max(4.2, 1.8 + [...text.replace(/\s/g, '')].length * 0.095));
// Uses visible frame time so background tabs never skip dialogue.
export class StoryPlayback {
  constructor() { this.paused = false; this.elapsed = 0; this.duration = 0; }
  start(text, finale = false) { this.elapsed = 0; this.duration = subtitleDuration(text) + (finale ? 1.5 : 0); }
  tick(dt, visible = true) {
    if (this.paused || !visible) return false;
    this.elapsed += Math.max(0, Math.min(dt, 0.1));
    return this.elapsed >= this.duration;
  }
  get progress() { return Math.min(1, this.elapsed / this.duration || 0); }
}
