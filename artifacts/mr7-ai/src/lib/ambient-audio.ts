/**
 * Ambient Audio Engine — محرك الصوت المحيطي
 * صوت فضائي + نبضات سيبرانية + استجابة للأحداث
 */

type OscType = OscillatorType;

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: AudioNode[] = [];
  private initialized = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.12;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Resume suspended context (browsers require user gesture) */
  async resume() {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  /** Deep space drone — low rumble */
  private startSpaceDrone() {
    const ctx  = this.getCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    gain.connect(this.masterGain!);

    [55, 82.5, 110].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type  = "sine";
      osc.frequency.value = freq;

      // Slow LFO modulation
      const lfo  = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.07 + i * 0.03;
      lfoG.gain.value     = 2;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start();

      osc.connect(gain);
      osc.start();
      this.sources.push(osc, lfo);
    });
  }

  /** Cyber pulse — high-freq digital ticks */
  private startCyberPulse() {
    const ctx  = this.getCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.03;

    const filter = ctx.createBiquadFilter();
    filter.type  = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value         = 4;

    gain.connect(filter);
    filter.connect(this.masterGain!);

    const osc = ctx.createOscillator();
    osc.type  = "square";
    osc.frequency.value = 220;

    const lfo  = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.type            = "square";
    lfo.frequency.value = 4.0;
    lfoG.gain.value     = 100;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);
    lfo.start();

    osc.connect(gain);
    osc.start();
    this.sources.push(osc, lfo);
  }

  /** Data stream noise — white noise filtered */
  private startDataStream() {
    const ctx        = this.getCtx();
    const bufferSize = ctx.sampleRate * 3;
    const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop   = true;

    const hipass = ctx.createBiquadFilter();
    hipass.type  = "highpass";
    hipass.frequency.value = 3000;

    const gain = ctx.createGain();
    gain.gain.value = 0.04;

    source.connect(hipass);
    hipass.connect(gain);
    gain.connect(this.masterGain!);
    source.start();
    this.sources.push(source);
  }

  /** Resonant hum — eerie mid tone */
  private startResonantHum() {
    const ctx  = this.getCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.04;

    const reverb = ctx.createConvolver();
    // Simple reverb via delay network
    const delay1 = ctx.createDelay(1.0);
    const delay2 = ctx.createDelay(1.0);
    const fb1    = ctx.createGain();
    const fb2    = ctx.createGain();
    delay1.delayTime.value = 0.33;
    delay2.delayTime.value = 0.57;
    fb1.gain.value = 0.4;
    fb2.gain.value = 0.35;

    gain.connect(delay1); delay1.connect(fb1); fb1.connect(delay2);
    delay2.connect(fb2); fb2.connect(delay1);
    delay1.connect(this.masterGain!);
    delay2.connect(this.masterGain!);

    [196, 261.63, 329.63].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type  = "triangle";
      osc.frequency.value = freq;

      const lfo  = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.05;
      lfoG.gain.value     = 3;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      lfo.start();

      osc.connect(gain);
      osc.start();
      this.sources.push(osc, lfo);
    });
  }

  /** Initialize all ambient layers */
  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    this.startSpaceDrone();
    this.startCyberPulse();
    this.startDataStream();
    this.startResonantHum();
  }

  /** Play a positional click / ping sound */
  ping(frequency = 880, duration = 0.15, volume = 0.08) {
    try {
      const ctx  = this.getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  /** Whoosh / notification sound */
  whoosh(volume = 0.06) {
    try {
      const ctx    = this.getCtx();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const data   = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type  = "bandpass";
      filter.frequency.setValueAtTime(4000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {}
  }

  /** Set master volume 0-1 */
  setVolume(v: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, v)) * 0.15,
        this.getCtx().currentTime,
        0.1
      );
    }
  }

  /** Mute / unmute */
  mute()   { this.setVolume(0); }
  unmute() { this.setVolume(1); }

  destroy() {
    this.sources.forEach(s => {
      try { (s as OscillatorNode).stop?.(); } catch {}
    });
    this.sources = [];
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}

export const ambientAudio = new AmbientAudioEngine();
