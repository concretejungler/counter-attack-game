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
  // MOOOOM! is the ultimate (3-min cooldown, wipes a full lane, "god-rays through the
  // ceiling" per §10) — it needs to feel bigger than every other cue in the game. Whoosh
  // (the hand descending) -> huge sub-bass impact -> rumble tail, all layered.
  'spell-mom': (c, o) => {
    tone(c, o, 'sine', 1400, 90, 0.35, 0.35, 0);        // descending whoosh (the hand arriving)
    noise(c, o, 0.35, 0.25, 2000, 0.5, 0.05, 'lowpass'); // air displacement
    tone(c, o, 'sine', 55, 32, 1.1, 0.9, 0.32);          // sub-bass impact
    tone(c, o, 'sine', 90, 28, 0.8, 0.85, 0.36);
    noise(c, o, 0.6, 0.45, 280, 0.7, 0.34, 'lowpass');   // impact thud
    tone(c, o, 'sine', 45, 20, 1.4, 0.5, 0.5);           // long rumble tail
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

  // ---- P4 audio polish (GAME-PROMPT §24 "dopamine bells") ----

  // The shiny chime: THE Pavlovian sparkle cue. A bright major-arp bell (triangle, long
  // exponential tails so it "sparkles" rather than blips) topped with a high glassy shimmer pair.
  // Obsessed over per §24 — kept separate from 'upgrade' (square-wave, utilitarian) on purpose.
  'shiny-chime': (c, o) => {
    [1319, 1568, 1976, 2637].forEach((f, i) => tone(c, o, 'triangle', f, f, 0.5, 0.22, i * 0.045));
    tone(c, o, 'sine', 3136, 3136, 0.35, 0.12, 0.05);
    tone(c, o, 'sine', 4186, 4186, 0.3, 0.08, 0.09);
    noise(c, o, 0.18, 0.1, 7000, 3, 0.02, 'highpass');
  },
  // Jar pop + glass slide: cork-pop transient into a smooth glassy downward slide (the critter
  // sliding down the jar wall) — two-part, matches the physical action described in §2.5.
  'jar-pop': (c, o) => {
    tone(c, o, 'sine', 1600, 2800, 0.05, 0.4, 0);      // pop
    noise(c, o, 0.03, 0.35, 3500, 4, 0, 'bandpass');   // cork crack
    tone(c, o, 'sine', 1400, 500, 0.35, 0.22, 0.05);   // glass slide down
    noise(c, o, 0.3, 0.08, 6000, 2, 0.06, 'highpass'); // glass sheen on the slide
  },
  // Grudge-return sting: dun-dun-DUN on a kazoo timbre — comic-dramatic, not scary.
  'grudge-return': (c, o) => {
    tone(c, o, 'sawtooth', 165, 165, 0.16, 0.32, 0);
    tone(c, o, 'sawtooth', 165, 165, 0.16, 0.32, 0.24);
    tone(c, o, 'sawtooth', 131, 131, 0.4, 0.4, 0.48);
    noise(c, o, 0.06, 0.15, 1200, 1.2, 0.48, 'bandpass');
  },
  // Grudge-settled: a small triumphant resolve — inverse of grudge-return, major and rising.
  'grudge-settled': (c, o) => {
    [330, 392, 494, 659].forEach((f, i) => tone(c, o, 'square', f, f, 0.16, 0.22, i * 0.07));
    noise(c, o, 0.15, 0.12, 5000, 1.5, 0.28, 'highpass');
  },
  // Mutation-pick: ominous ratchet — a clicking noise-burst ladder that climbs in pitch,
  // like a dial being cranked toward something bad, ending on a dread detuned drone.
  'mutation-ratchet': (c, o) => {
    for (let i = 0; i < 6; i++) noise(c, o, 0.035, 0.28, 1200 + i * 260, 6, i * 0.055, 'bandpass');
    tone(c, o, 'sawtooth', 110, 90, 0.6, 0.28, 0.33);
    tone(c, o, 'sawtooth', 113, 92, 0.6, 0.22, 0.37);
  },
  // Chain-zap: crackling arc that hops — a fast electric buzz plus 3 quick decaying sparks
  // to sell the lightning hopping tower-to-tower (Static's chain lightning, §24 tower).
  'chain-zap': (c, o) => {
    tone(c, o, 'sawtooth', 2400, 1200, 0.07, 0.3, 0);
    noise(c, o, 0.05, 0.3, 6000, 5, 0, 'bandpass');
    tone(c, o, 'sawtooth', 2200, 1000, 0.05, 0.2, 0.06);
    noise(c, o, 0.04, 0.22, 5500, 5, 0.09, 'bandpass');
    tone(c, o, 'sawtooth', 2000, 800, 0.05, 0.14, 0.13);
    noise(c, o, 0.04, 0.16, 5000, 5, 0.15, 'bandpass');
  },
  // Freeze crystal: bright bell-like tinkle with icy high partials — cold-status counterpart
  // to the existing warmer 'cold-pulse' tower cue.
  'freeze-crystal': (c, o) => {
    [1760, 2217, 2637].forEach((f, i) => tone(c, o, 'sine', f, f * 1.4, 0.4, 0.16, i * 0.03));
    noise(c, o, 0.25, 0.14, 8000, 4, 0.02, 'highpass');
  },
  // Generic dramatic boss-intro stinger (per-boss musical leitmotif lives in music.ts;
  // this is the one-shot sfx hit for the instant the boss banner appears).
  'boss-intro': (c, o) => {
    tone(c, o, 'sawtooth', 60, 45, 1.0, 0.7, 0);
    tone(c, o, 'square', 220, 180, 0.25, 0.3, 0);
    noise(c, o, 0.5, 0.35, 350, 0.8, 0.03, 'lowpass');
    tone(c, o, 'sine', 1200, 300, 0.4, 0.2, 0.08);
  },
  // Event-alert doorbell: classic two-tone ding-dong for random world events (§11).
  'event-doorbell': (c, o) => {
    tone(c, o, 'sine', 784, 784, 0.35, 0.3, 0);
    tone(c, o, 'sine', 659, 659, 0.45, 0.28, 0.3);
  },
  // Choice-timer tick: a dry, urgent clock tick for Oh-Crap 5-second-dilemma countdowns (§12).
  'choice-tick': (c, o) => {
    noise(c, o, 0.02, 0.3, 2800, 5, 0, 'bandpass');
    tone(c, o, 'square', 1800, 1800, 0.02, 0.1, 0);
  },

  // ---- P4 easter eggs (GAME-PROMPT §20) ----

  // Sunflower hum (§20.2 "a PvZ wink"): 8-note familiar-ish plucky hum, triangle-wave and
  // deliberately jaunty — a nod without being a note-for-note copy.
  'sunflower-hum': (c, o) => {
    [392, 440, 392, 349, 392, 440, 494, 440].forEach((f, i) => tone(c, o, 'triangle', f, f, 0.22, 0.22, i * 0.14));
  },
  // Red balloon pop (§20.3): a bright transient pop + a little rubbery pitch-drop squeak tail.
  'balloon-pop': (c, o) => {
    noise(c, o, 0.04, 0.55, 3000, 3, 0, 'bandpass');
    tone(c, o, 'square', 1400, 220, 0.14, 0.3, 0.01);
  },
  // Fridge door pop-open (§20.4 magnet reward): a suction-release thunk + a little shimmer.
  'fridge-open': (c, o) => {
    noise(c, o, 0.1, 0.4, 500, 1, 0, 'lowpass');
    tone(c, o, 'sine', 180, 110, 0.2, 0.4, 0.02);
    [1047, 1319, 1568].forEach((f, i) => tone(c, o, 'triangle', f, f, 0.3, 0.16, 0.15 + i * 0.06));
  },
  // Photo-mode shutter click (§18): a crisp two-part camera-click.
  'camera-shutter': (c, o) => {
    noise(c, o, 0.015, 0.5, 4500, 4, 0, 'bandpass');
    noise(c, o, 0.02, 0.35, 2200, 4, 0.05, 'bandpass');
  },

  // ---- Menu juice (mobile-store revamp §A3) — the diegetic-UI interaction cues, played from
  // the ui layer (not game.ts). Kept soft + rounded so they read as "kitchen paper/wood", not
  // arcade blips; distinct from the sharper in-game 'ui-click'. ----

  // Soft press tick: a gentle woody blip + a whisper of felt — the "fridge-note tap". Quiet on
  // purpose (fires on every menu button press), pitched low so rapid presses don't get shrill.
  'menu-tick': (c, o) => {
    tone(c, o, 'sine', 540, 360, 0.05, 0.11);
    tone(c, o, 'triangle', 880, 700, 0.03, 0.05, 0.005);
    noise(c, o, 0.03, 0.06, 700, 0.8, 0, 'lowpass');
  },
  // Screen-change whoosh: a soft lowpassed air sweep + a gentle rising body — the "page turns /
  // camera slides to the next room" cue between menu screens. Short and unobtrusive.
  'menu-whoosh': (c, o) => {
    noise(c, o, 0.26, 0.15, 1000, 0.7, 0, 'lowpass');
    tone(c, o, 'sine', 280, 560, 0.24, 0.10);
    tone(c, o, 'sine', 210, 420, 0.26, 0.07, 0.02);
  },
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
