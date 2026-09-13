// Small original synthesized foley bed, enabled only by a user gesture.
export class IntroAudio {
  async enable() {
    if(this.closed)return;
    this.context ??= new (window.AudioContext || window.webkitAudioContext)();
    const c=this.context;
    if(!this.wind) {
      const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      this.wind=c.createBufferSource();this.wind.buffer=buffer;this.wind.loop=true;
      this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.gain=c.createGain();
      this.wind.connect(this.filter).connect(this.gain).connect(c.destination);this.gain.gain.value=0;this.wind.start();
    }
    await c.resume();if(!this.closed)this.enabled=true;
  }
  mute() {this.enabled=false;this.context?.suspend();}
  update(t,frame) {
    if(!this.enabled)return;
    const c=this.context;
    this.filter.frequency.setTargetAtTime([450,1600,650,900][frame.season],c.currentTime,.25);
    this.gain.gain.setTargetAtTime((frame.season===1?.045:.024)*frame.fade,c.currentTime,.2);
    const step=Math.floor(t*5.5);
    if(frame.moving&&step!==this.lastStep) {
      this.lastStep=step;
      const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(110,c.currentTime);o.frequency.exponentialRampToValueAtTime(45,c.currentTime+.055);
      g.gain.setValueAtTime(.025,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.065);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.07);
    }
  }
  close() {if(this.closed)return;this.closed=true;this.enabled=false;this.wind?.stop();this.context?.close().catch(()=>{});}
}
