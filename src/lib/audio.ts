/**
 * Web Audio engine — every constant here is lifted from the original app.
 * These numbers are the sound; changing them changes the feel.
 */

const TICK_DURATION = 0.018; // 18ms
const TICK_PEAK = 0.55;
const TICK_FILTER_Q = 1.2;
const TICK_FILTER_BASE = 2200;
const TICK_FILTER_SPREAD = 800;

/** Gain can never ramp to exactly 0 — exponentialRampToValueAtTime throws. */
const SILENCE = 1e-4;

/* --- Gong. Pitch and decay are the two knobs worth tuning by ear. --- */
const GONG_FUNDAMENTAL = 125; // Hz — low enough to feel weighty
const GONG_DECAY = 3.0; // seconds of wash
const GONG_PEAK = 0.9;
const GONG_DETUNE = 3.5; // cents, ± per partial

/** [frequency ratio, relative gain, decay multiplier].
 *  Ratios are deliberately inharmonic — this is what makes it a gong. */
const GONG_PARTIALS: readonly (readonly [number, number, number])[] = [
  [1.0, 1.0, 1.0],
  [2.0, 0.42, 0.82],
  [2.76, 0.34, 0.66],
  [3.76, 0.24, 0.5],
  [5.4, 0.16, 0.35],
  [7.09, 0.1, 0.22],
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  /**
   * Must be called synchronously inside a user gesture, before any state
   * updates. Any await or effect indirection and iOS Safari leaves the context
   * suspended, silencing the first spin.
   */
  unlock(): void {
    if (this.muted) return;
    this.context();
  }

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** One-shot tone with a 10ms attack and exponential decay. */
  private tone(
    ctx: AudioContext,
    freq: number,
    startAt: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    destination: AudioNode,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    gain.gain.setValueAtTime(SILENCE, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(SILENCE, startAt + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  /**
   * The spin click: a short filtered noise burst, not an oscillator.
   * The buffer is cached but the filter is rebuilt per tick — its frequency is
   * randomised each time, which is what stops the spin sounding mechanical.
   */
  tick(volume = 1): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;

    if (!this.noise) {
      const length = Math.ceil(ctx.sampleRate * TICK_DURATION);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      this.noise = buffer;
    }

    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = TICK_FILTER_BASE + Math.random() * TICK_FILTER_SPREAD;
    filter.Q.value = TICK_FILTER_Q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(SILENCE, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(SILENCE, TICK_PEAK * volume), now + 0.001);
    gain.gain.exponentialRampToValueAtTime(SILENCE, now + TICK_DURATION);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + TICK_DURATION + 0.01);
  }

  /** Soft C major triad arpeggio — the lighter acknowledgement, used when
   *  research finishes early. Distinct from the gong so the two read apart. */
  chime(): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.value = 0.45;
    bus.connect(ctx.destination);
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      this.tone(ctx, freq, now + i * 0.07, 0.45, 'sine', 0.28, bus);
    });
  }

  /**
   * Deep temple gong — played when a topic lands.
   *
   * The thing that makes this read as a gong rather than a bell or a chime is
   * the INHARMONIC partial ratios: no envelope shaping will rescue integer
   * harmonics, which the ear always hears as a pitched chime. Each partial is
   * doubled a few cents apart so the pair beats slowly, and the whole thing
   * sags in pitch and closes down in brightness as it decays, which is what
   * large struck metal actually does.
   */
  gong(): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(SILENCE, now);
    bus.gain.exponentialRampToValueAtTime(GONG_PEAK, now + 0.006); // hard strike
    bus.gain.exponentialRampToValueAtTime(SILENCE, now + GONG_DECAY);

    // Bright at the moment of impact, darkening into the tail.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(5200, now);
    tone.frequency.exponentialRampToValueAtTime(700, now + GONG_DECAY * 0.9);
    tone.Q.value = 0.6;

    bus.connect(tone);
    tone.connect(ctx.destination);

    for (const [ratio, gain, decayScale] of GONG_PARTIALS) {
      const freq = GONG_FUNDAMENTAL * ratio;
      const decay = GONG_DECAY * decayScale;
      // Two voices a few cents apart -> slow beating, the metallic shimmer.
      for (const detune of [-GONG_DETUNE, GONG_DETUNE]) {
        const osc = ctx.createOscillator();
        const level = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.995, now + decay);
        level.gain.setValueAtTime(SILENCE, now);
        level.gain.exponentialRampToValueAtTime(gain * 0.5, now + 0.004);
        level.gain.exponentialRampToValueAtTime(SILENCE, now + decay);
        osc.connect(level);
        level.connect(bus);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      }
    }

    // Mallet contact: without this the onset sounds synthetic rather than struck.
    const strikeLength = Math.ceil(ctx.sampleRate * 0.06);
    const strikeBuffer = ctx.createBuffer(1, strikeLength, ctx.sampleRate);
    const strikeData = strikeBuffer.getChannelData(0);
    for (let i = 0; i < strikeLength; i++) {
      strikeData[i] = (Math.random() * 2 - 1) * (1 - i / strikeLength) ** 2;
    }
    const strike = ctx.createBufferSource();
    strike.buffer = strikeBuffer;
    const strikeFilter = ctx.createBiquadFilter();
    strikeFilter.type = 'bandpass';
    strikeFilter.frequency.value = 1800;
    strikeFilter.Q.value = 0.8;
    const strikeGain = ctx.createGain();
    strikeGain.gain.setValueAtTime(SILENCE, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.35, now + 0.002);
    strikeGain.gain.exponentialRampToValueAtTime(SILENCE, now + 0.09);
    strike.connect(strikeFilter);
    strikeFilter.connect(strikeGain);
    strikeGain.connect(ctx.destination);
    strike.start(now);
    strike.stop(now + 0.1);
  }

  /** Timer-complete fanfare: a G-C-E-G rise capped with a high C. */
  fanfare(): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(ctx.destination);
    [392, 523.25, 659.25, 784].forEach((freq, i) => {
      this.tone(ctx, freq, now + i * 0.12, 0.55, 'triangle', 0.32, bus);
    });
    this.tone(ctx, 1046.5, now + 0.55, 0.9, 'sine', 0.22, bus);
  }
}

export const audio = new AudioEngine();
