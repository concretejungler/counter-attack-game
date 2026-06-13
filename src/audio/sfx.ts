import type { AudioMan } from './audio';

type Recipe = (ctx: AudioContext, out: GainNode) => void;

function tone(
  ctx: AudioContext, out: GainNode,
  type: OscillatorType, f0: number, f1: number,
  dur: number, vol = 0.5, delay = 0,
): void {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(
  ctx: AudioContext, out: GainNode,
  dur: number, vol = 0.4, filterFreq = 2000, q = 1, delay = 0, type: BiquadFilterType = 'bandpass',
): void {
  const t = ctx.currentTime + delay;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t);
}

/** Every sound in the game, synthesized. Mickey-mouse slapstick foley. */
const RECIPES: Record<string, Recipe> = {
  'ui-click': (c, o) => tone(c, o, 'square', 880, 660, 0.06, 0.18),
  'ui-hover': (c, o) => tone(c, o, 'sine', 520, 560, 0.04, 0.08),
  'place': (c, o) => {
    tone(c, o, 'sine', 180, 70, 0.16, 0.6);
    noise(c, o, 0.1, 0.25, 900, 1);
  },
  'place-bad': (c, o) => tone(c, o, 'sawtooth', 200, 140, 0.18, 0.3),
  'clutter': (c, o) => {
    tone(c, o, 'sine', 120, 60, 0.2, 0.7);
    noise(c, o, 0.16, 0.3, 500, 1);
  },
  'upgrade': (c, o) => {
    tone(c, o, 'square', 440, 440, 0.07, 0.25);
    tone(c, o, 'square', 660, 660, 0.07, 0.25, 0.08);
    tone(c, o, 'square', 880, 880, 0.12, 0.3, 0.16);
  },
  'sell': (c, o) => {
    tone(c, o, 'sine', 700, 1200, 0.1, 0.3);
    noise(c, o, 0.12, 0.2, 4000, 2, 0.05);
  },
  'shoot-spray': (c, o) => noise(c, o, 0.09, 0.3, 3200, 2.5),
  'shoot-toast': (c, o) => {
    tone(c, o, 'sine', 240, 520, 0.13, 0.3); // sproing
    noise(c, o, 0.06, 0.15, 1500, 1, 0.02);
  },
  'shoot-band': (c, o) => tone(c, o, 'sawtooth', 140, 480, 0.12, 0.35),
  'slam': (c, o) => {
    tone(c, o, 'sine', 140, 50, 0.18, 0.8);
    noise(c, o, 0.1, 0.4, 700, 1);
  },
  'push': (c, o) => noise(c, o, 0.25, 0.18, 600, 0.7, 0, 'lowpass'),
  'cold-pulse': (c, o) => {
    tone(c, o, 'sine', 900, 300, 0.3, 0.2);
    noise(c, o, 0.3, 0.12, 5000, 3);
  },
  'trap-snap': (c, o) => {
    noise(c, o, 0.05, 0.6, 2500, 3);
    tone(c, o, 'square', 220, 90, 0.1, 0.4, 0.02);
  },
  'die-poof': (c, o) => {
    noise(c, o, 0.14, 0.3, 1200, 1);
    tone(c, o, 'sine', 600, 180, 0.2, 0.2, 0.02);
  },
  'squash': (c, o) => {
    noise(c, o, 0.12, 0.5, 350, 1, 0, 'lowpass');
    tone(c, o, 'sine', 130, 45, 0.15, 0.6);
  },
  'flick': (c, o) => tone(c, o, 'sine', 300, 1400, 0.12, 0.3),
  'sweep': (c, o) => noise(c, o, 0.15, 0.2, 1800, 0.8, 0, 'highpass'),
  'crumb-bank': (c, o) => {
    tone(c, o, 'square', 1320, 1320, 0.05, 0.18);
    tone(c, o, 'square', 1760, 1760, 0.07, 0.16, 0.05);
  },
  'cake-bite': (c, o) => {
    noise(c, o, 0.13, 0.5, 800, 1.2);
    tone(c, o, 'sawtooth', 320, 80, 0.4, 0.3, 0.1); // dismay
  },
  'slice-stolen': (c, o) => {
    tone(c, o, 'square', 880, 440, 0.12, 0.35);
    tone(c, o, 'square', 880, 440, 0.12, 0.35, 0.14);
    tone(c, o, 'square', 880, 440, 0.2, 0.35, 0.28);
  },
  'slice-back': (c, o) => {
    tone(c, o, 'square', 523, 523, 0.08, 0.25);
    tone(c, o, 'square', 659, 659, 0.08, 0.25, 0.09);
    tone(c, o, 'square', 784, 784, 0.16, 0.3, 0.18);
  },
  'wave-start': (c, o) => {
    tone(c, o, 'sawtooth', 220, 440, 0.3, 0.25);
    tone(c, o, 'sawtooth', 277, 554, 0.3, 0.2, 0.05);
  },
  'wave-clear': (c, o) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, o, 'square', f, f, 0.12, 0.22, i * 0.09));
  },
  'mutation': (c, o) => {
    tone(c, o, 'sawtooth', 220, 180, 0.5, 0.25);
    tone(c, o, 'sawtooth', 226, 174, 0.5, 0.25, 0.04); // detuned dread
  },
  'sniff': (c, o) => {
    noise(c, o, 0.08, 0.3, 1400, 2);
    noise(c, o, 0.12, 0.35, 1100, 2, 0.12);
  },
  'klaxon': (c, o) => {
    tone(c, o, 'square', 660, 660, 0.18, 0.3);
    tone(c, o, 'square', 524, 524, 0.18, 0.3, 0.2);
  },
  'spell-lemon': (c, o) => {
    tone(c, o, 'sawtooth', 1600, 200, 0.25, 0.4);
    noise(c, o, 0.2, 0.3, 5000, 4, 0.02);
  },
  'spell-slipper': (c, o) => {
    noise(c, o, 0.3, 0.3, 900, 0.6, 0, 'lowpass');
    noise(c, o, 0.08, 0.7, 1800, 2, 0.32);
    tone(c, o, 'sine', 150, 60, 0.2, 0.6, 0.32);
  },
  'spell-mom': (c, o) => {
    tone(c, o, 'sine', 60, 35, 1.0, 0.8);
    noise(c, o, 0.5, 0.4, 300, 0.7, 0.5, 'lowpass');
    tone(c, o, 'sine', 100, 30, 0.6, 0.9, 0.55);
  },
  'highfive': (c, o) => {
    noise(c, o, 0.06, 0.55, 2200, 2);
    tone(c, o, 'sine', 1047, 1568, 0.18, 0.2, 0.05);
  },
  'gnome-break': (c, o) => {
    noise(c, o, 0.3, 0.5, 3500, 1.5);
    tone(c, o, 'sine', 180, 60, 0.3, 0.5, 0.04);
  },
  'evolve': (c, o) => {
    tone(c, o, 'sawtooth', 200, 600, 0.3, 0.3);
    tone(c, o, 'sawtooth', 300, 900, 0.25, 0.2, 0.1);
  },
  'win': (c, o) => {
    [392, 523, 659, 784, 1047].forEach((f, i) => tone(c, o, 'square', f, f, 0.22, 0.25, i * 0.13));
    noise(c, o, 0.6, 0.15, 6000, 1, 0.6, 'highpass');
  },
  'lose': (c, o) => {
    [392, 370, 349, 311].forEach((f, i) => tone(c, o, 'sawtooth', f, f * 0.97, 0.35, 0.25, i * 0.3));
  },
  'boss': (c, o) => {
    tone(c, o, 'sawtooth', 80, 50, 1.2, 0.6);
    tone(c, o, 'sawtooth', 83, 52, 1.2, 0.5, 0.05);
    noise(c, o, 0.8, 0.2, 200, 0.6, 0.2, 'lowpass');
  },
  'fakeout': (c, o) => tone(c, o, 'sine', 500, 100, 0.3, 0.25),
  'scout': (c, o) => tone(c, o, 'triangle', 700, 500, 0.15, 0.2),
};

export class Sfx {
  private lastPlayed = new Map<string, number>();

  constructor(private audio: AudioMan) {}

  play(name: string, throttleMs = 35): void {
    const ctx = this.audio.ensure();
    if (!ctx) return;
    const now = performance.now();
    const last = this.lastPlayed.get(name) ?? 0;
    if (now - last < throttleMs) return;
    this.lastPlayed.set(name, now);
    RECIPES[name]?.(ctx, this.audio.sfxBus);
  }
}
