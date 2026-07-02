import type { AudioMan } from './audio';

/**
 * The Kitchen-Sink Orchestra: a step sequencer whose instruments are all synthesized
 * household-ish timbres. Intensity layers stack: 0 menu hum, 1 build, 2 assault, 3 boss/last-slice.
 *
 * Two optional keys bias the same sequencer without replacing it:
 *  - `setTheme(theme)`: RoomTheme id (from LevelDef.theme) — reflavors the instrument palette
 *    (bass timbre, percussion, shimmer) per world, per GAME-PROMPT §24/§14.
 *  - `setBoss(defId)`: boss critter def id (from CONTENT.critters[...].id, boss: true) — layers a
 *    distinct leitmotif voice on top of the groove while a boss is alive. Pass null to clear.
 *
 * Neither call is wired from game.ts yet — see BUILDLOG/report for the exact one-liners needed
 * (`music.setTheme(level.theme)` in `startLevel`; `music.setBoss(bossDefId)` / `music.setBoss(null)`
 * in the `waveStart` / boss-`die` handlers).
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

export type MusicTheme =
  | 'kitchen' | 'living' | 'bathroom' | 'bedroom' | 'garage'
  | 'basement' | 'attic' | 'backyard' | 'sewer' | 'secret';

/** Per-theme instrumentation bias. Every field is a multiplier/offset applied to the base recipes. */
interface ThemeFlavor {
  bassVolMult: number;     // living: rubber-band bass forward
  bassType: OscillatorType;
  potFreqMult: number;     // basement: low boomy pots
  potVolMult: number;
  hatVolMult: number;
  shimmer: 'none' | 'glass' | 'musicbox' | 'power-tool' | 'birdsong' | 'drip'; // extra top-end texture
  shimmerVol: number;
  swing: number;           // 0..0.15, extra delay on off-beats (attic dusty waltz, sewer drip)
}

const THEME_FLAVORS: Record<MusicTheme, ThemeFlavor> = {
  kitchen:  { bassVolMult: 1.0, bassType: 'sawtooth', potFreqMult: 1.0, potVolMult: 1.0, hatVolMult: 1.0, shimmer: 'none',       shimmerVol: 0,    swing: 0 },
  living:   { bassVolMult: 1.5, bassType: 'sawtooth', potFreqMult: 1.0, potVolMult: 0.8, hatVolMult: 1.0, shimmer: 'none',       shimmerVol: 0,    swing: 0 },
  bathroom: { bassVolMult: 0.7, bassType: 'sine',     potFreqMult: 1.3, potVolMult: 0.6, hatVolMult: 0.7, shimmer: 'glass',      shimmerVol: 0.09, swing: 0 },
  bedroom:  { bassVolMult: 0.5, bassType: 'sine',     potFreqMult: 0.9, potVolMult: 0.4, hatVolMult: 0.3, shimmer: 'musicbox',   shimmerVol: 0.08, swing: 0 },
  garage:   { bassVolMult: 1.1, bassType: 'square',   potFreqMult: 1.0, potVolMult: 1.3, hatVolMult: 1.4, shimmer: 'power-tool', shimmerVol: 0.1,  swing: 0 },
  basement: { bassVolMult: 1.2, bassType: 'sawtooth', potFreqMult: 0.45, potVolMult: 1.6, hatVolMult: 0.6, shimmer: 'none',      shimmerVol: 0,    swing: 0 },
  attic:    { bassVolMult: 0.8, bassType: 'sawtooth', potFreqMult: 0.85, potVolMult: 0.7, hatVolMult: 0.5, shimmer: 'none',      shimmerVol: 0,    swing: 0.09 },
  backyard: { bassVolMult: 0.9, bassType: 'sawtooth', potFreqMult: 1.0, potVolMult: 0.9, hatVolMult: 1.0, shimmer: 'birdsong',   shimmerVol: 0.07, swing: 0 },
  sewer:    { bassVolMult: 0.9, bassType: 'sine',     potFreqMult: 0.7, potVolMult: 1.0, hatVolMult: 0.5, shimmer: 'drip',       shimmerVol: 0.08, swing: 0 },
  secret:   { bassVolMult: 1.0, bassType: 'sawtooth', potFreqMult: 1.0, potVolMult: 1.0, hatVolMult: 1.0, shimmer: 'none',       shimmerVol: 0,    swing: 0 },
};

export type BossId =
  | 'crumb-king' | 'moadb' | 'sir-clogsworth' | 'bedbug-baron' | 'rat-king'
  | 'grandma-longlegs' | 'possum-phantom' | 'trash-panda-don' | 'the-exterminator';

export class Music {
  intensity = 0;           // 0..3
  heartbeat = false;       // last-slice mode
  private playing = false;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private bpm = 112;
  private theme: MusicTheme = 'kitchen';
  private boss: BossId | null = null;
  /** Rat King's three-melodies-in-a-trenchcoat needs a second, out-of-phase lead voice's own step counter. */
  private bossStep = 0;
  /** Possum Phantom "keeps dying" — countdown until the theme resumes after a dropout. */
  private possumMuteUntilStep = -1;

  constructor(private audio: AudioMan) {}

  /** RoomTheme from the active LevelDef — reflavors the base orchestra's instrumentation. */
  setTheme(theme: MusicTheme): void {
    this.theme = theme;
  }

  /** Boss critter def id while a boss wave is alive, or null to clear the leitmotif layer. */
  setBoss(boss: BossId | null): void {
    if (this.boss === boss) return;
    this.boss = boss;
    this.bossStep = 0;
    this.possumMuteUntilStep = -1;
  }

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
          this.bossStep = (this.bossStep + 1) % 64;
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
    const flavor = THEME_FLAVORS[this.theme];

    if (this.heartbeat) {
      // all instruments hold their breath; just the pulse and a single brave kazoo solo
      if (beat === 0 || beat === 3) this.kick(ctx, out, t, 0.7);
      if (beat === 8) this.kazoo(ctx, out, t, chord[0] * 2, 0.5, 0.5, 0.11);
      return;
    }

    // bass pluck — the rubber band (intensity >= 1), theme-flavored
    if (this.intensity >= 1 && (beat === 0 || beat === 6 || beat === 10)) {
      this.pluck(ctx, out, t, chord[0] / 2, 0.22 * flavor.bassVolMult, flavor.bassType);
    }
    // pots & pans percussion (intensity >= 2), theme-flavored
    if (this.intensity >= 2) {
      if (beat % 4 === 0) this.kick(ctx, out, t, 0.4);
      if (beat % 4 === 2) this.hat(ctx, out, t, 0.12 * flavor.hatVolMult);
      if (beat === 12) this.pot(ctx, out, t, 0.18 * flavor.potVolMult, flavor.potFreqMult);
    } else if (this.intensity >= 1 && beat === 0) {
      this.kick(ctx, out, t, 0.25);
    }
    // marimba-ish chord blips (intensity >= 1)
    if (this.intensity >= 1 && (beat === 4 || beat === 12)) {
      for (let i = 0; i < 3; i++) this.blip(ctx, out, t + i * 0.012, chord[i] * 2, 0.07);
    }
    // kazoo lead (intensity >= 2; doubles at 3)
    if (this.intensity >= 2 && beat % 2 === 0) {
      const deg = LEAD[bar][(beat / 2) | 0];
      const swingT = t + (beat % 4 === 2 ? flavor.swing : 0);
      const f = chord[0] * 2 * Math.pow(SEMI, deg);
      this.kazoo(ctx, out, swingT, f, 0.5, 0.5, this.intensity >= 3 ? 0.085 : 0.055);
      if (this.intensity >= 3 && beat % 4 === 0) {
        this.kazoo(ctx, out, swingT, f * 2, 0.3, 0.5, 0.04);
      }
    }
    // menu shimmer (intensity 0)
    if (this.intensity === 0 && beat === 0) {
      for (let i = 0; i < 3; i++) this.blip(ctx, out, t + i * 0.07, chord[i] * 4, 0.035);
    }
    // theme shimmer texture — sparse, always-on top-end color independent of intensity
    if (flavor.shimmer !== 'none' && beat === 8) this.themeShimmer(ctx, out, t, chord, flavor);

    if (this.boss) this.bossLayer(ctx, out, t, this.bossStep, chord);
  }

  // ---------- boss leitmotifs ----------
  // Each is a sparse, low-CPU layer stacked on the existing groove — distinct silhouette per
  // boss without replacing the Kitchen-Sink Orchestra's harmonic bed (GAME-PROMPT §24/§8).
  private bossLayer(ctx: AudioContext, out: GainNode, t: number, step: number, chord: number[]): void {
    const beat = step % 16;
    switch (this.boss) {
      case 'crumb-king':
        // regal ant-throne fanfare: square-wave herald triplets on the downbeat
        if (beat === 0) {
          [0, 4, 7].forEach((deg, i) =>
            this.blip(ctx, out, t + i * 0.05, chord[0] * 2 * Math.pow(SEMI, deg), 0.09));
        }
        break;
      case 'rat-king': {
        // "three melodies in a trenchcoat": three interleaved voices, each its own step grid,
        // never all speaking on the same 8th — they trip over each other like nested rats.
        const voice = step % 3;
        const degSets = [[0, 3, 7], [2, 5, 9], [-2, 3, 5]];
        if (voice === 0 && beat % 4 === 0) this.kazoo(ctx, out, t, chord[0] * 2 * Math.pow(SEMI, degSets[0][(step / 4) % 3 | 0]), 0.14, 0.28, 0.05);
        if (voice === 1 && beat % 4 === 1) this.pluck(ctx, out, t, chord[1] / 2 * Math.pow(SEMI, degSets[1][(step / 4) % 3 | 0]), 0.1, 'sawtooth');
        if (voice === 2 && beat % 4 === 2) this.blip(ctx, out, t, chord[2] * 2 * Math.pow(SEMI, degSets[2][(step / 4) % 3 | 0]), 0.08);
        break;
      }
      case 'moadb':
        // fluffy waltz (3/4 feel over the 8th grid) that "pops layer by layer" — a soft
        // triangle waltz that drops a harmonic each bar as if a layer burst.
        if (beat === 0 || beat === 6 || beat === 11) {
          const layers = Math.max(1, 3 - (Math.floor(step / 16) % 4));
          for (let i = 0; i < layers; i++) this.waltzPuff(ctx, out, t, chord[i % chord.length] * (beat === 0 ? 1 : 2));
        }
        break;
      case 'sir-clogsworth':
        // gurgly low drain-pipe bass: slow detuned sub-oscillator with a filtered gurgle
        if (beat === 0 || beat === 8) this.drainGurgle(ctx, out, t, chord[0] / 4);
        break;
      case 'bedbug-baron':
        // sneaky pizzicato: quiet, off-beat plucked stabs
        if (beat === 3 || beat === 11 || beat === 14) {
          this.pluck(ctx, out, t, chord[0] * Math.pow(SEMI, [0, 3, -2][(beat / 3) | 0] ?? 0), 0.08, 'triangle');
        }
        break;
      case 'grandma-longlegs':
        // creaky music-box: detuned bell tones with a slow wobble, like an unwound spring
        if (beat % 4 === 0) this.musicBoxNote(ctx, out, t, chord[(beat / 4) % chord.length] * 2);
        break;
      case 'possum-phantom': {
        // theme keeps "dying" (dropping out) and resuming — mute the boss layer entirely for
        // a stretch every ~2 bars, like the boss is playing dead.
        if (step >= this.possumMuteUntilStep && (step % 32) >= 24 && (step % 32) < 30) {
          this.possumMuteUntilStep = step + 6;
        }
        const dead = step < this.possumMuteUntilStep;
        if (!dead && beat % 4 === 0) this.blip(ctx, out, t, chord[0] * 2 * Math.pow(SEMI, [0, 5, 7][(beat / 4) | 0] ?? 0), 0.07);
        break;
      }
      case 'trash-panda-don':
        // mob-movie brass on pots: stabbed square-wave brass hits, gangster swagger
        if (beat === 0 || beat === 3 || beat === 10) {
          this.brassStab(ctx, out, t, chord[0] * 2);
        }
        break;
      case 'the-exterminator':
        // cold mechanical drone vs. the kitchen orchestra fighting back — a flat, detuned
        // industrial drone that clashes against the (still-playing) warm groove underneath.
        if (beat === 0) this.exterminatorDrone(ctx, out, t, 55);
        break;
    }
  }

  private waltzPuff(ctx: AudioContext, out: GainNode, t: number, f: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.42);
  }

  private drainGurgle(ctx: AudioContext, out: GainNode, t: number, f: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.linearRampToValueAtTime(f * 0.85, t + 0.5);
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6; // gurgle wobble
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = f * 0.15;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = f * 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(filt); filt.connect(g); g.connect(out);
    osc.start(t); lfo.start(t);
    osc.stop(t + 0.72); lfo.stop(t + 0.72);
  }

  private musicBoxNote(ctx: AudioContext, out: GainNode, t: number, f: number): void {
    // slightly detuned + slow pitch droop = unwound-spring creak
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * 1.01, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.985, t + 0.5);
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = f * 2.005;
    const g2 = ctx.createGain();
    g2.gain.value = 0.15;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(g);
    osc2.connect(g2); g2.connect(g);
    g.connect(out);
    osc.start(t); osc2.start(t);
    osc.stop(t + 0.57); osc2.stop(t + 0.57);
  }

  private brassStab(ctx: AudioContext, out: GainNode, t: number, f: number): void {
    for (const mult of [1, 1.5, 2]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f * mult * 0.5;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(f * 4, t);
      filt.frequency.exponentialRampToValueAtTime(f, t + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.12 / mult, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(filt); filt.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.24);
    }
  }

  private exterminatorDrone(ctx: AudioContext, out: GainNode, t: number, f: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = f * 1.008; // cold beating detune, industrial not musical
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = f * 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.6);
    g.gain.linearRampToValueAtTime(0.001, t + 1.6);
    osc.connect(filt); osc2.connect(filt); filt.connect(g); g.connect(out);
    osc.start(t); osc2.start(t);
    osc.stop(t + 1.65); osc2.stop(t + 1.65);
  }

  // ---------- theme shimmer texture ----------
  private themeShimmer(ctx: AudioContext, out: GainNode, t: number, chord: number[], flavor: ThemeFlavor): void {
    switch (flavor.shimmer) {
      case 'glass': { // wine-glass rim: pure sine with long tail + slight beating partner
        const f = chord[1] * 4;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = f * 1.004;
        const g = ctx.createGain();
        g.gain.setValueAtTime(flavor.shimmerVol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.connect(g); osc2.connect(g); g.connect(out);
        osc.start(t); osc2.start(t);
        osc.stop(t + 1.45); osc2.stop(t + 1.45);
        break;
      }
      case 'musicbox': {
        const f = chord[2] * 4;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(flavor.shimmerVol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.52);
        break;
      }
      case 'power-tool': { // brief buzzy drill rasp: filtered square burst with a fast whine-up
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.linearRampToValueAtTime(340, t + 0.1);
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 900;
        filt.Q.value = 4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(flavor.shimmerVol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(filt); filt.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.14);
        break;
      }
      case 'birdsong': { // kazoo + birdsong blips: quick chirped triangle glide
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        const f = chord[0] * 6;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.06);
        osc.frequency.exponentialRampToValueAtTime(f * 1.1, t + 0.12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(flavor.shimmerVol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.16);
        break;
      }
      case 'drip': { // sewer echo: a single filtered droplet blip with a delayed echo repeat
        const f = chord[1] * 5;
        for (const [delay, vol] of [[0, 1], [0.18, 0.5], [0.34, 0.22]] as [number, number][]) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t + delay);
          osc.frequency.exponentialRampToValueAtTime(f * 0.6, t + delay + 0.1);
          const g = ctx.createGain();
          g.gain.setValueAtTime(flavor.shimmerVol * vol, t + delay);
          g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);
          osc.connect(g); g.connect(out);
          osc.start(t + delay); osc.stop(t + delay + 0.14);
        }
        break;
      }
      default:
        break;
    }
  }

  // ---------- base instruments ----------
  private pluck(ctx: AudioContext, out: GainNode, t: number, f: number, vol: number, type: OscillatorType = 'sawtooth'): void {
    const osc = ctx.createOscillator();
    osc.type = type;
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

  private kazoo(ctx: AudioContext, out: GainNode, t: number, f: number, dur: number, buzzAmt: number, vol: number): void {
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
    bg.gain.value = buzzAmt;
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

  private pot(ctx: AudioContext, out: GainNode, t: number, vol: number, freqMult = 1): void {
    // metallic clonk: two detuned squares + fast decay
    for (const mult of [1, 2.76]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 587 * mult * freqMult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol / (mult * 1.5), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.1);
    }
  }
}
