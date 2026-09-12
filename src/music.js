const tracks = ["spring", "summer", "autumn", "winter"];
/** Original seasonal BGM, looped with a two-deck equal-power crossfade. */
export class SeasonMusic {
  constructor({
    createAudio = (url) => new Audio(url),
    onError = () => {},
  } = {}) {
    this.createAudio = createAudio;
    this.onError = onError;
    this.channels = new Map();
    this.season = 0;
    this.enabled = true;
    this.unlocked = false;
    this.active = false;
    this.duck = 1;
    this.failed = new Set();
  }
  channel(season) {
    if (!this.channels.has(season)) {
      const audio = this.createAudio(`/assets/audio/${tracks[season]}.mp3`);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      audio.addEventListener("error", () => {
        if (!this.failed.has(season)) {
          this.failed.add(season);
          this.onError("배경 음악을 불러오지 못했습니다. 게임은 계속됩니다.");
        }
      });
      this.channels.set(season, {
        audio,
        mix: 0,
        playing: false,
        pending: false,
      });
    }
    return this.channels.get(season);
  }
  play(channel) {
    if (channel.playing || channel.pending) return;
    channel.pending = true;
    try {
      Promise.resolve(channel.audio.play())
        .then(() => {
          channel.pending = false;
          channel.playing = true;
          if (!this.enabled || !this.active) {
            channel.audio.pause();
            channel.playing = false;
          }
        })
        .catch(() => {
          channel.pending = false;
        });
    } catch {
      channel.pending = false;
    }
  }
  unlock(season = this.season) {
    this.unlocked = true;
    this.season = season;
    this.active = true;
    if (this.enabled) this.play(this.channel(season));
  }
  select(season) {
    if (season === this.season) return;
    this.season = season;
    if (this.unlocked && this.active && this.enabled)
      this.play(this.channel(season));
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.suspend();
    else if (this.unlocked) {
      this.active = true;
      this.play(this.channel(this.season));
    }
  }
  suspend() {
    this.active = false;
    for (const channel of this.channels.values()) {
      channel.audio.pause();
      channel.playing = false;
      channel.audio.volume = 0;
      channel.mix = 0;
    }
  }
  update(dt, { active = true, duck = 1 } = {}) {
    this.active = active;
    this.duck = duck;
    if (!this.enabled || !this.unlocked || !active) {
      if ([...this.channels.values()].some((c) => c.playing)) this.suspend();
      return;
    }
    const selected = this.channel(this.season);
    if (!this.failed.has(this.season)) this.play(selected);
    for (const [index, channel] of this.channels) {
      const target = index === this.season ? 1 : 0;
      channel.mix = Math.max(
        0,
        Math.min(
          1,
          channel.mix + ((target ? 1 : -1) * Math.min(dt, 0.1)) / 2.5,
        ),
      );
      channel.audio.volume = Math.sin((channel.mix * Math.PI) / 2) * 0.2 * duck;
      if (!target && channel.mix === 0 && channel.playing) {
        channel.audio.pause();
        channel.playing = false;
      }
    }
  }
}
