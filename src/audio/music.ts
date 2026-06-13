import type { AudioMan } from './audio';

/**
 * The Kitchen-Sink Orchestra: a step sequencer whose instruments are all synthesized
 * household-ish timbres. Intensity layers stack: 0 menu hum, 1 build, 2 assault, 3 boss/last-slice.
 */

// Am  F  C  G  — kid-show heroism in a minor key
const CHORDS = [
  [220.0, 261.6, 329.6],
  [174.6, 220.0, 261.6],
  [261.6, 329.6, 392.0],
  [196.0, 246.9, 293.7],
];
// pentatonic-ish lead line per chord (scale degrees over root)
const LEAD = [
  [0, 3, 5, 3, 7, 5, 3, 0],
  [0, 5, 3, 5, 0, 3, 5, 7],
  [7, 5, 3, 0, 3, 5, 7, 12],
  [5, 3, 0, 3, 5, 7, 5, 3],
];
const SEMI = Math.pow(2, 1 / 12);

export class Music {
  intensity = 0;           // 0..3
  heartbeat = false;       // last-slice mode
  private playing = false;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private bpm = 112;

  constructor(private audio: AudioMan) {}

  start(): void {
    if (this.playing) return;
    this.playing = true;
    const tick = () => {
      if (!this.playing) return;
      const ctx = this.audio.ensure();
      if (ctx) {
        if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
        while (this.nextTime < ctx.currentTime + 0.25) {
          this.scheduleStep(ctx, this.nextTime, this.step);
          this.nextTime += 60 / this.bpm / 2; // 8th notes
          this.step = (this.step + 1) % 64;
        }
      }
      this.timer = window.setTimeout(tick, 90);
    };
    tick();
  }

  stop(): void {
    this.playing = false;
    if (this.timer !== null) clearTimeout(this.timer);
  }

  private scheduleStep(ctx: AudioContext, t: number, step: number): void {
    const out = this.audio.musicBus;
    const bar = Math.floor(step / 16) % 4;
    const beat = step % 16;
    const chord = CHORDS[bar];

    if (this.heartbeat) {
      // all instruments hold their breath; just the pulse and a worried kazoo
      if (beat === 0 || beat === 3) this.kick(ctx, out, t, 0.7);
      if (beat === 8) this.kazoo(ctx, out, t, chord[0] * 2, 0.45, 0.06);
      return;
    }

    // bass pluck — the rubber band (intensity ≥ 1)
    if (this.intensity >= 1 && (beat === 0 || beat === 6 || beat === 10)) {
      this.pluck(ctx, out, t, chord[0] / 2, 0.22);
    }
    // pots & pans percussion (intensity ≥ 2)
    if (this.intensity >= 2) {
      if (beat % 4 === 0) this.kick(ctx, out, t, 0.4);
      if (beat % 4 === 2) this.hat(ctx, out, t, 0.12);
      if (beat === 12) this.pot(ctx, out, t, 0.18);
    } else if (this.intensity >= 1 && beat === 0) {
      this.kick(ctx, out, t, 0.25);
    }
    // marimba-ish chord blips (intensity ≥ 1)
    if (this.intensity >= 1 && (beat === 4 || beat === 12)) {
      for (let i = 0; i < 3; i++) this.blip(ctx, out, t + i * 0.012, chord[i] * 2, 0.07);
    }
    // kazoo lead (intensity ≥ 2; doubles at 3)
    if (this.intensity >= 2 && beat % 2 === 0) {
      const deg = LEAD[bar][(beat / 2) | 0];
      const f = chord[0] * 2 * Math.pow(SEMI, deg);
      this.kazoo(ctx, out, t, f, 0.5, this.intensity >= 3 ? 0.085 : 0.055);
      if (this.intensity >= 3 && beat % 4 === 0) {
        this.kazoo(ctx, out, t, f * 2, 0.3, 0.04);
      }
    }
    // menu shimmer (intensity 0)
    if (this.intensity === 0 && beat === 0) {
      for (let i = 0; i < 3; i++) this.blip(ctx, out, t + i * 0.07, chord[i] * 4, 0.035);
    }
  }

  private pluck(ctx: AudioContext, out: GainNode, t: number, f: number, vol: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(f * 7, t);
    filt.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.24);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(filt); filt.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.36);
  }

  private kazoo(ctx: AudioContext, out: GainNode, t: number, f: number, dur: number, vol: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f * 0.97, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const buzz = ctx.createOscillator();
    buzz.type = 'square';
    buzz.frequency.value = f * 1.01;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = f * 2.4;
    filt.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const bg = ctx.createGain();
    bg.gain.value = 0.35;
    osc.connect(filt);
    buzz.connect(bg); bg.connect(filt);
    filt.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.02);
    buzz.start(t); buzz.stop(t + dur + 0.02);
  }

  private blip(ctx: AudioContext, out: GainNode, t: number, f: number, vol: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.24);
  }

  private kick(ctx: AudioContext, out: GainNode, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.18);
  }

  private hat(ctx: AudioContext, out: GainNode, t: number, vol: number): void {
    const len = Math.ceil(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t);
  }

  private pot(ctx: AudioContext, out: GainNode, t: number, vol: number): void {
    // metallic clonk: two detuned squares + fast decay
    for (const mult of [1, 2.76]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 587 * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol / (mult * 1.5), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.1);
    }
  }
}
