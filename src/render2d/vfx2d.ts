/**
 * VFX layer (plan §3.2). OWNED BY: P3-V "VFX & Juice".
 *
 * All combat/spell visual effects for the 2D view, in the picture-book house style:
 * chunky flat fills + cocoa outlines, pooled particles, zero hot-loop allocation.
 * renderer2d.ts drives this via the fixed hook API (reset / handleEvents / frame /
 * vignette) — this file NEVER edits renderer2d.ts and adds no new hooks beyond that
 * surface. Every effect is spawned from the SimEvent[] stream that already reaches
 * handleEvents(), or from the per-frame vignette scent value.
 *
 * Effect vocabulary (grouped by trigger):
 *  - `fire`  → tower-origin: muzzle flash (projectile), AoE crater slam, cone/salt
 *              spray, push whoosh, warm sunbeam / zap beam + lens, trap snap.
 *  - `hit`   → per-damage-type impact: droplet splash, toast flare, salt/gas puff,
 *              ice shatter, star pop, sonic ring, lens glint, chain-lightning hops.
 *  - deaths / cake / towers / pets → crumb bursts, splats, ceramic bursts, poofs.
 *  - `spellCast` → the 8 grimoire cinematics (bolt, slipper sweep, MOOOOM hand,
 *              time-stop wash, fresh-scent wave, mystery pop, insurance stamp,
 *              static crackle).
 *  - `spawn`(boss) → board-side ring + dust. `scentThreshold`/`eventStart` → wisps.
 *              `swarmWarning` + scent → the edge-darkening vignette.
 *
 * Drawing runs in the dpr base transform the renderer leaves active; coords are CSS
 * px (cam.worldToScreen*). Rotated silhouettes use balanced save/restore so the
 * transform is untouched on return (the vignette pass depends on that).
 */

import type { SimEvent, DamageType } from '../sim/types';
import type { Camera2D } from './camera2d';
import { dmgTypeColor } from './fallback';
import { hex, rgba, mix, lighten } from './colors';
import { PAL } from '../render/palette';
import { TOWER_DEFS } from '../content/towers';
import { CRITTER_DEFS } from '../content/critters';
import { SPELL_DEFS } from '../content/spells';
import {
  srand, star5, sparkle, puff, jagged, coneWedge, godRays, clockFace,
  slipper, momHand, tupperware, hammerGlyph,
} from './vfx/shapes';

const P_MAX = 340;
const R_MAX = 72;
const RAY_MAX = 40;
const ARC_MAX = 36;
const CINE_MAX = 12;

// particle shapes
enum Shape { Dot, Spark, Shard, Puff, Crumb, Confetti, Star, Drop, Wisp, Speck }

interface Particle {
  on: boolean;
  x: number; z: number;
  vx: number; vz: number;
  alt: number; valt: number; grav: number;
  life: number; max: number;
  size: number; color: number;
  shape: Shape; rot: number; rotV: number;
}

enum RingKind { Ring, Crater, Sonic, Aura, Boss, Lens }
interface Ring {
  on: boolean; x: number; z: number;
  life: number; max: number;
  r0: number; r1: number;       // world-unit radii
  color: number; width: number; kind: RingKind;
}

enum RayKind { BeamWarm, BeamZap, Cone, Push }
interface Ray {
  on: boolean; mode: RayKind;
  x0: number; z0: number; x1: number; z1: number;
  life: number; max: number; color: number;
}

interface Arc {
  on: boolean; x0: number; z0: number; x1: number; z1: number;
  life: number; max: number; seed: number; color: number;
}

type CineKind =
  | 'lemonBolt' | 'slipper' | 'momHand' | 'timestop'
  | 'fresh' | 'mystery' | 'insurance' | 'static' | 'wave';
interface Cine {
  on: boolean; kind: CineKind;
  x: number; z: number;            // world anchor (lane x for slipper/mom)
  life: number; max: number;
  seed: number; screen: boolean; flag: boolean;
}

export class Vfx2D {
  private ps: Particle[] = [];
  private rings: Ring[] = [];
  private rays: Ray[] = [];
  private arcs: Arc[] = [];
  private cines: Cine[] = [];

  private time = 0;
  private scentSmooth = 0;
  private swarmT = 0;             // red edge-pulse timer (swarmWarning)
  private wispPending = 0;        // scent wisps to spawn next frame (needs cam)
  private confettiPending = 0;    // victory confetti to rain next frame (needs cam)
  private seed = 1;

  constructor() {
    for (let i = 0; i < P_MAX; i++) this.ps.push({ on: false, x: 0, z: 0, vx: 0, vz: 0, alt: 0, valt: 0, grav: 0, life: 0, max: 1, size: 0, color: 0, shape: Shape.Dot, rot: 0, rotV: 0 });
    for (let i = 0; i < R_MAX; i++) this.rings.push({ on: false, x: 0, z: 0, life: 0, max: 1, r0: 0, r1: 0, color: 0, width: 0, kind: RingKind.Ring });
    for (let i = 0; i < RAY_MAX; i++) this.rays.push({ on: false, mode: RayKind.BeamWarm, x0: 0, z0: 0, x1: 0, z1: 0, life: 0, max: 1, color: 0 });
    for (let i = 0; i < ARC_MAX; i++) this.arcs.push({ on: false, x0: 0, z0: 0, x1: 0, z1: 0, life: 0, max: 1, seed: 0, color: 0 });
    for (let i = 0; i < CINE_MAX; i++) this.cines.push({ on: false, kind: 'lemonBolt', x: 0, z: 0, life: 0, max: 1, seed: 0, screen: false, flag: false });
  }

  /** Clear all live effects. */
  reset(): void {
    for (const p of this.ps) p.on = false;
    for (const r of this.rings) r.on = false;
    for (const r of this.rays) r.on = false;
    for (const a of this.arcs) a.on = false;
    for (const c of this.cines) c.on = false;
    this.time = 0;
    this.scentSmooth = 0;
    this.swarmT = 0;
    this.wispPending = 0;
    this.confettiPending = 0;
  }

  // ---- pool obtain (scan for a free slot; small pools, no alloc) ----------
  private obtainP(): Particle | null { for (const p of this.ps) if (!p.on) return p; return null; }
  private obtainR(): Ring | null { for (const r of this.rings) if (!r.on) return r; return null; }
  private obtainRay(): Ray | null { for (const r of this.rays) if (!r.on) return r; return null; }
  private obtainA(): Arc | null { for (const a of this.arcs) if (!a.on) return a; return null; }
  private obtainC(): Cine | null { for (const c of this.cines) if (!c.on) return c; return null; }

  // =========================================================================
  // event ingest
  // =========================================================================
  handleEvents(events: SimEvent[]): void {
    let lastZapX = 0, lastZapZ = 0, haveZap = false;
    for (const ev of events) {
      switch (ev.t) {
        case 'fire':
          this.onFire(ev.def, ev.at.x, ev.at.z, ev.target ? ev.target.x : ev.at.x, ev.target ? ev.target.z : ev.at.z);
          break;
        case 'hit': {
          this.onHit(ev.dmgType, ev.at.x, ev.at.z);
          if (ev.dmgType === 'zap') {
            if (haveZap) this.arc(lastZapX, lastZapZ, ev.at.x, ev.at.z, 0x9fd8ff);
            lastZapX = ev.at.x; lastZapZ = ev.at.z; haveZap = true;
          }
          break;
        }
        case 'die':
          this.crumbBurst(ev.at.x, ev.at.z, Math.min(9, 3 + Math.floor(ev.bounty / 6)));
          if (ev.cause === 'squash' || ev.cause === 'flick' || ev.cause === 'spell') this.splat(ev.at.x, ev.at.z, 0x8a5a36);
          if (ev.cause === 'fall') this.splat(ev.at.x, ev.at.z, 0x7a6a4a);
          break;
        case 'fakeDeath':
          this.splat(ev.at.x, ev.at.z, 0x6b3a24);
          break;
        case 'spawn':
          if (ev.shiny) this.sparkBurst(ev.at.x, ev.at.z, 6, 0xfff0a0);
          if (this.isBoss(ev.def)) this.bossFlourish(ev.at.x, ev.at.z);
          break;
        case 'evolve':
          this.ring(ev.at.x, ev.at.z, RingKind.Ring, 0.3, 1.5, 0xfff2b8, 0.09, 0.5);
          this.poof(ev.at.x, ev.at.z, PAL.poof);
          break;
        case 'cakeBite':
          this.crumbBurst(ev.at.x, ev.at.z, 7);
          break;
        case 'sliceRecovered':
          this.confettiBurst(ev.at.x, ev.at.z, 18);
          break;
        case 'towerPlace':
          this.ring(ev.at.x, ev.at.z, RingKind.Ring, 0.25, 1.4, 0xfff2b8, 0.08, 0.5);
          this.sparkBurst(ev.at.x, ev.at.z, 5, PAL.butter);
          break;
        case 'towerGone':
          this.ceramicBurst(ev.at.x, ev.at.z);
          break;
        case 'towerDropped':
          this.poof(ev.at.x, ev.at.z, PAL.poof);
          break;
        case 'petMove':
          this.poof(ev.at.x, ev.at.z, PAL.poof);
          break;
        case 'clutterChew':
          this.debrisPuff(ev.at.x, ev.at.z);
          break;
        case 'spellCast':
          this.onSpell(ev.spell, ev.at ? ev.at.x : 0, ev.at ? ev.at.z : 0, ev.at !== null);
          break;
        case 'waveStart':
          this.cine('wave', 0, 0, 1.3, true);
          break;
        case 'scentThreshold':
          if (ev.rising && ev.threshold >= 50) this.wispPending += 6;
          break;
        case 'eventStart':
          if (ev.id.includes('scent') || ev.id.includes('spike')) this.wispPending += 8;
          break;
        case 'swarmWarning':
          this.swarmT = Math.max(this.swarmT, 1.1);
          break;
        case 'won':
          this.wispPending = 0;
          this.confettiPending += 28;
          break;
        default:
          break;
      }
    }
  }

  private isBoss(def: string): boolean {
    const cd = CRITTER_DEFS[def];
    return !!cd && (!!cd.boss || cd.size >= 1);
  }

  // ---- tower fire dispatch ----------------------------------------------
  private onFire(def: string, x: number, z: number, tx: number, tz: number): void {
    const tdef = TOWER_DEFS[def];
    const dt: DamageType = tdef ? tdef.dmgType : 'swat';
    const col = dmgTypeColor(dt);
    const attack = tdef ? tdef.attack : 'projectile';
    switch (attack) {
      case 'projectile':
        this.muzzle(x, z, col);
        break;
      case 'slam':
        this.ring(tx, tz, RingKind.Crater, 0.15, (tdef?.aoe ?? 1.2) * 1.05, col, 0.1, 0.42);
        this.slamDust(tx, tz, col);
        break;
      case 'cone':
        this.ray(RayKind.Cone, x, z, tx, tz, col);
        this.coneSpecks(x, z, tx, tz, col);
        break;
      case 'push':
        this.ray(RayKind.Push, x, z, tx, tz, 0xdfeff7);
        break;
      case 'beam':
        this.ray(dt === 'light' ? RayKind.BeamWarm : RayKind.BeamZap, x, z, tx, tz, col);
        this.ring(x, z, RingKind.Lens, 0.14, 0.5, dt === 'light' ? 0xfff2c8 : 0xbfe8ff, 0.06, 0.22);
        break;
      case 'trap':
        this.trapSnap(tx, tz, col);
        break;
      default:
        break;
    }
  }

  // ---- per-damage-type impacts -------------------------------------------
  private onHit(dmgType: DamageType, x: number, z: number): void {
    switch (dmgType) {
      case 'spray': this.splash(x, z); break;
      case 'heat': this.fireFx(x, z); break;
      case 'zap': this.sparkBurst(x, z, 5, 0xcfe8ff); break;
      case 'cold': this.iceShards(x, z); break;
      case 'gas': this.gasPuff(x, z); break;
      case 'swat': this.starPop(x, z); break;
      case 'sonic': this.ring(x, z, RingKind.Sonic, 0.12, 1.1, 0xcfe3ee, 0.07, 0.42); break;
      case 'light': this.lensGlint(x, z); break;
      default: break;
    }
  }

  // ---- spell cinematics ---------------------------------------------------
  private onSpell(id: string, x: number, z: number, hasPos: boolean): void {
    const kind = SPELL_DEFS[id]?.kind;
    switch (kind) {
      case 'bolt':
        this.cine('lemonBolt', x, z, 0.5, !hasPos);
        this.ring(x, z, RingKind.Ring, 0.2, (SPELL_DEFS[id]?.radius ?? 1.6), 0xf7e85a, 0.1, 0.5);
        this.sparkBurst(x, z, 10, 0xfff25a);
        break;
      case 'lane':
        this.cine('slipper', x, z, 1.05, !hasPos);
        break;
      case 'momHand':
        this.cine('momHand', x, z, 1.5, !hasPos);
        break;
      case 'timestop':
        this.cine('timestop', x, z, 1.4, true);
        break;
      case 'cleanse':
        this.cine('fresh', x, z, 1.2, true);
        break;
      case 'gamble':
        this.cine('mystery', x, z, 1.2, !hasPos);
        break;
      case 'repair':
        this.cine('insurance', x, z, 1.3, !hasPos);
        break;
      case 'handBuff':
        this.cine('static', x, z, 1.1, !hasPos);
        break;
      default:
        // unknown spell id — a neutral bright pop so nothing casts invisibly
        this.sparkBurst(x, z, 8, 0xfff2b8);
        break;
    }
  }

  // =========================================================================
  // emit primitives (specialised, allocation-free)
  // =========================================================================
  private pDot(x: number, z: number, vx: number, vz: number, valt: number, grav: number, life: number, size: number, color: number, shape: Shape): void {
    const p = this.obtainP(); if (!p) return;
    p.on = true; p.x = x; p.z = z; p.vx = vx; p.vz = vz; p.alt = 0; p.valt = valt; p.grav = grav;
    p.life = p.max = life; p.size = size; p.color = color; p.shape = shape;
    p.rot = srand(this.seed++) * Math.PI * 2; p.rotV = (srand(this.seed++) - 0.5) * 10;
  }

  private spray(x: number, z: number, n: number, spd: number, up: number, grav: number, life: number, size: number, colors: number[], shape: Shape): void {
    for (let i = 0; i < n; i++) {
      const a = srand(this.seed++) * Math.PI * 2;
      const s = spd * (0.4 + srand(this.seed++) * 0.9);
      const c = colors[(Math.random() * colors.length) | 0];
      this.pDot(x, z, Math.cos(a) * s, Math.sin(a) * s, up * (0.5 + srand(this.seed++) * 0.8), grav, life * (0.7 + srand(this.seed++) * 0.6), size * (0.6 + srand(this.seed++) * 0.7), c, shape);
    }
  }

  private ring(x: number, z: number, kind: RingKind, r0: number, r1: number, color: number, width: number, life: number): void {
    const r = this.obtainR(); if (!r) return;
    r.on = true; r.x = x; r.z = z; r.kind = kind; r.r0 = r0; r.r1 = r1; r.color = color; r.width = width; r.life = r.max = life;
  }

  private ray(mode: RayKind, x0: number, z0: number, x1: number, z1: number, color: number): void {
    const r = this.obtainRay(); if (!r) return;
    r.on = true; r.mode = mode; r.x0 = x0; r.z0 = z0; r.x1 = x1; r.z1 = z1; r.color = color;
    r.life = r.max = mode === RayKind.BeamWarm || mode === RayKind.BeamZap ? 0.18 : 0.26;
  }

  private arc(x0: number, z0: number, x1: number, z1: number, color: number): void {
    const a = this.obtainA(); if (!a) return;
    a.on = true; a.x0 = x0; a.z0 = z0; a.x1 = x1; a.z1 = z1; a.color = color; a.seed = (this.seed++ * 91) & 1023; a.life = a.max = 0.22;
  }

  private cine(kind: CineKind, x: number, z: number, life: number, screen: boolean): void {
    const c = this.obtainC(); if (!c) return;
    c.on = true; c.kind = kind; c.x = x; c.z = z; c.life = c.max = life; c.screen = screen; c.flag = false; c.seed = (this.seed++ * 53) & 2047;
  }

  // ---- named effects ------------------------------------------------------
  private splash(x: number, z: number): void { this.spray(x, z, 6, 1.6, 2.2, 7, 0.42, 0.11, [PAL.splash, 0xcfe8f7, 0xffffff], Shape.Drop); }
  private fireFx(x: number, z: number): void { this.spray(x, z, 8, 1.2, 2.6, -1.4, 0.5, 0.13, [0xff8c3c, 0xffb347, 0xff5a1c], Shape.Puff); }
  private iceShards(x: number, z: number): void { this.spray(x, z, 7, 2.4, 1.6, 6, 0.34, 0.1, [0xbfe8f7, 0xe8f7ff, 0x9fd8e8], Shape.Shard); }
  private gasPuff(x: number, z: number): void { this.spray(x, z, 5, 0.9, 1.0, -0.5, 0.7, 0.16, [0x9aa84c, 0x76914c, 0xbac86a], Shape.Puff); }
  private starPop(x: number, z: number): void {
    this.spray(x, z, 5, 3.2, 2.4, 5, 0.32, 0.12, [0xffe27a, 0xffffff, PAL.butter], Shape.Star);
    this.ring(x, z, RingKind.Ring, 0.05, 0.5, 0xffffff, 0.06, 0.2);
  }
  private lensGlint(x: number, z: number): void { this.ring(x, z, RingKind.Lens, 0.1, 0.55, 0xfff8d8, 0.06, 0.36); }
  private sparkBurst(x: number, z: number, n: number, color: number): void { this.spray(x, z, n, 3, 2.4, 4, 0.3, 0.07, [color, 0xffffff], Shape.Spark); }
  private crumbBurst(x: number, z: number, n: number): void { this.spray(x, z, n, 2.0, 3, 10, 0.8, 0.09, [PAL.crumbGold, 0xc8943c, 0xead9a0], Shape.Crumb); }
  private confettiBurst(x: number, z: number, n: number): void { this.spray(x, z, n, 2.6, 4.5, 4, 1.3, 0.11, [PAL.cherry, PAL.butter, PAL.mint, PAL.denim, 0xffffff], Shape.Confetti); }
  private splat(x: number, z: number, color: number): void { this.spray(x, z, 8, 2.4, 1.0, 9, 0.4, 0.12, [color, darkenN(color), lightenN(color)], Shape.Dot); }
  private poof(x: number, z: number, color: number): void {
    this.spray(x, z, 8, 1.6, 1.6, 1.5, 0.55, 0.16, [color, 0xe8d5b0, 0xffffff], Shape.Puff);
    this.ring(x, z, RingKind.Ring, 0.1, 0.7, color, 0.07, 0.45);
  }
  private debrisPuff(x: number, z: number): void { this.spray(x, z, 5, 1.6, 1.4, 8, 0.45, 0.08, [0x8a5a36, 0xb07b4f, 0xd8a44c], Shape.Speck); }
  private slamDust(x: number, z: number, color: number): void { this.spray(x, z, 7, 2.0, 0.8, 4, 0.4, 0.13, [lightenN(color), 0xe8d5b0], Shape.Puff); }
  private coneSpecks(x: number, z: number, tx: number, tz: number, color: number): void {
    const ang = Math.atan2(tz - z, tx - x);
    for (let i = 0; i < 6; i++) {
      const a = ang + (srand(this.seed++) - 0.5) * 1.0;
      const s = 2.0 + srand(this.seed++) * 2.4;
      this.pDot(x, z, Math.cos(a) * s, Math.sin(a) * s, 0.8, 4, 0.34, 0.055, color, Shape.Speck);
    }
  }
  private muzzle(x: number, z: number, color: number): void {
    this.ring(x, z, RingKind.Ring, 0.02, 0.42, lighten(color, 0.4), 0.06, 0.16);
    this.spray(x, z, 2, 2.2, 1.4, 3, 0.2, 0.06, [lighten(color, 0.5), 0xffffff], Shape.Spark);
  }
  private trapSnap(x: number, z: number, color: number): void {
    this.ring(x, z, RingKind.Ring, 0.05, 0.6, 0xffffff, 0.07, 0.24);
    this.ring(x, z, RingKind.Crater, 0.1, 0.9, color, 0.09, 0.4);
    this.spray(x, z, 6, 3.2, 2.6, 6, 0.3, 0.12, [0xffe27a, 0xffffff, color], Shape.Star);
  }
  private ceramicBurst(x: number, z: number): void {
    this.spray(x, z, 14, 4, 3.4, 9, 0.75, 0.13, [0xf0c8a0, PAL.cherry, 0xffffff, 0x3f5d7d], Shape.Shard);
    this.ring(x, z, RingKind.Crater, 0.2, 1.9, 0xffb347, 0.12, 0.5);
    this.ring(x, z, RingKind.Ring, 0.2, 2.4, 0xfff2b8, 0.08, 0.4);
  }
  private bossFlourish(x: number, z: number): void {
    this.ring(x, z, RingKind.Boss, 0.4, 3.4, 0xffb347, 0.16, 0.75);
    this.ring(x, z, RingKind.Boss, 0.2, 2.2, 0xe8504f, 0.1, 0.55);
    this.spray(x, z, 12, 2.4, 1.6, 3, 0.7, 0.16, [PAL.poof, 0xe8d5b0, 0xffd97a], Shape.Puff);
  }

  // =========================================================================
  // per-frame update + draw (dpr base transform is active; coords = CSS px)
  // =========================================================================
  frame(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number): void {
    this.time = time;
    const scale = cam.scale;

    // deferred cam-dependent spawns (scent wisps drifting up from the board edges)
    if (this.wispPending > 0) {
      const n = this.wispPending; this.wispPending = 0;
      for (let i = 0; i < n; i++) {
        const sx = srand(this.seed++) * cam.viewW;
        const sy = (0.55 + srand(this.seed++) * 0.5) * cam.viewH;
        const wx = cam.screenToWorldX(sx), wz = cam.screenToWorldZ(sy);
        this.pDot(wx, wz, (srand(this.seed++) - 0.5) * 0.5, 0, 0.7 + srand(this.seed++) * 0.5, -0.5, 1.6 + srand(this.seed++) * 0.8, 0.22, 0x9aa84c, Shape.Wisp);
      }
    }

    // victory confetti rains from the top of the current view (needs cam to place it in world)
    if (this.confettiPending > 0) {
      const cols = [PAL.cherry, PAL.butter, PAL.mint, PAL.denim, 0xffffff, 0xff8ccf];
      const n = this.confettiPending; this.confettiPending = 0;
      for (let i = 0; i < n; i++) {
        const sx = srand(this.seed++) * cam.viewW;
        const sy = srand(this.seed++) * cam.viewH * 0.25;
        const wx = cam.screenToWorldX(sx), wz = cam.screenToWorldZ(sy);
        // flutter DOWN the screen via +z world velocity (no alt physics = no ground bounce)
        this.pDot(wx, wz, (srand(this.seed++) - 0.5) * 1.2, 1.6 + srand(this.seed++) * 1.6, 0, 0, 1.6 + srand(this.seed++) * 1.0, 0.12, cols[(srand(this.seed++) * cols.length) | 0], Shape.Confetti);
      }
    }

    if (this.swarmT > 0) this.swarmT = Math.max(0, this.swarmT - dt);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    this.drawRings(ctx, cam, dt, scale);
    this.drawRays(ctx, cam, dt, scale);
    this.drawParticles(ctx, cam, dt, scale);
    this.drawArcs(ctx, cam, dt, scale);
    this.drawCines(ctx, cam, dt, scale);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, scale: number): void {
    for (const p of this.ps) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.x += p.vx * dt; p.z += p.vz * dt;
      p.valt -= p.grav * dt; p.alt += p.valt * dt;
      if (p.alt < 0 && p.grav > 0) { p.alt = 0; p.valt *= -0.32; p.vx *= 0.7; p.vz *= 0.7; }
      p.rot += p.rotV * dt;

      const f = p.life / p.max;
      const sx = cam.worldToScreenX(p.x);
      const sy = cam.worldToScreenY(p.z) - p.alt * scale;
      const px = Math.max(1.5, p.size * scale * (0.5 + f * 0.7));
      const col = p.color;

      switch (p.shape) {
        case Shape.Spark: {
          const vl = Math.hypot(p.vx, p.vz) || 1;
          ctx.strokeStyle = rgba(col, f);
          ctx.lineWidth = px * 0.7;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - (p.vx / vl) * px * 2.2, sy - (p.vz / vl) * px * 2.2);
          ctx.stroke();
          break;
        }
        case Shape.Shard: {
          ctx.save();
          ctx.translate(sx, sy); ctx.rotate(p.rot);
          ctx.fillStyle = rgba(col, 0.5 + f * 0.5);
          ctx.beginPath();
          ctx.moveTo(0, -px); ctx.lineTo(px * 0.6, 0); ctx.lineTo(0, px); ctx.lineTo(-px * 0.6, 0);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        }
        case Shape.Puff:
          ctx.globalAlpha = f * 0.7;
          puff(ctx, sx, sy, px, hex(col), (p.rot * 97) | 0);
          ctx.globalAlpha = 1;
          break;
        case Shape.Wisp:
          ctx.globalAlpha = Math.min(0.5, f * 0.8);
          puff(ctx, sx, sy, px * 1.2, hex(col), (p.rot * 61) | 0);
          ctx.globalAlpha = 1;
          break;
        case Shape.Crumb:
          ctx.beginPath(); ctx.arc(sx, sy, px, 0, Math.PI * 2);
          ctx.fillStyle = rgba(col, f); ctx.fill();
          ctx.lineWidth = Math.max(1, px * 0.2); ctx.strokeStyle = rgba(0x33211a, f * 0.8); ctx.stroke();
          break;
        case Shape.Confetti: {
          ctx.save();
          ctx.translate(sx, sy); ctx.rotate(p.rot);
          ctx.fillStyle = rgba(col, f);
          ctx.fillRect(-px, -px * 0.5, px * 2, px);
          ctx.restore();
          break;
        }
        case Shape.Star:
          star5(ctx, sx, sy, px * 1.2, p.rot, rgba(col, f));
          break;
        case Shape.Drop:
          ctx.fillStyle = rgba(col, 0.4 + f * 0.6);
          ctx.beginPath();
          ctx.ellipse(sx, sy, px * 0.7, px, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case Shape.Speck:
          ctx.fillStyle = rgba(col, f);
          ctx.fillRect(sx - px * 0.5, sy - px * 0.5, px, px);
          break;
        default:
          ctx.beginPath(); ctx.arc(sx, sy, px, 0, Math.PI * 2);
          ctx.fillStyle = rgba(col, f * 0.85); ctx.fill();
          break;
      }
    }
  }

  private drawRings(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, scale: number): void {
    for (const r of this.rings) {
      if (!r.on) continue;
      r.life -= dt;
      if (r.life <= 0) { r.on = false; continue; }
      const k = 1 - r.life / r.max;
      const f = r.life / r.max;
      const rad = (r.r0 + (r.r1 - r.r0) * k) * scale;
      const sx = cam.worldToScreenX(r.x);
      const sy = cam.worldToScreenY(r.z);
      const w = Math.max(1.5, r.width * scale);

      switch (r.kind) {
        case RingKind.Crater:
          ctx.globalAlpha = f * 0.5;
          ctx.fillStyle = hex(lighten(r.color, 0.35));
          ctx.beginPath(); ctx.ellipse(sx, sy, rad, rad * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = rgba(r.color, f * 0.9); ctx.lineWidth = w;
          ctx.beginPath(); ctx.ellipse(sx, sy, rad, rad * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
          break;
        case RingKind.Sonic:
          for (const m of [1, 0.6]) {
            ctx.strokeStyle = rgba(r.color, f * 0.85);
            ctx.lineWidth = w * m;
            ctx.beginPath(); ctx.arc(sx, sy, rad * m, 0, Math.PI * 2); ctx.stroke();
          }
          break;
        case RingKind.Boss:
          ctx.strokeStyle = rgba(r.color, f);
          ctx.lineWidth = w;
          ctx.beginPath(); ctx.arc(sx, sy, rad, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = rgba(lighten(r.color, 0.4), f * 0.6);
          ctx.lineWidth = w * 0.4;
          ctx.beginPath(); ctx.arc(sx, sy, rad * 0.82, 0, Math.PI * 2); ctx.stroke();
          break;
        case RingKind.Lens: {
          const a = f;
          const cr = rad * 0.4;
          ctx.fillStyle = rgba(r.color, a * 0.9);
          ctx.beginPath(); ctx.arc(sx, sy, cr, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = rgba(0xffffff, a);
          ctx.lineWidth = Math.max(1.5, cr * 0.5);
          ctx.beginPath();
          ctx.moveTo(sx - rad, sy); ctx.lineTo(sx + rad, sy);
          ctx.moveTo(sx, sy - rad); ctx.lineTo(sx, sy + rad);
          ctx.stroke();
          break;
        }
        case RingKind.Aura:
          ctx.setLineDash([w * 2, w * 1.5]);
          ctx.strokeStyle = rgba(r.color, f * 0.7);
          ctx.lineWidth = w;
          ctx.beginPath(); ctx.arc(sx, sy, rad, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          break;
        default:
          ctx.strokeStyle = rgba(r.color, f * 0.9);
          ctx.lineWidth = w;
          ctx.beginPath(); ctx.arc(sx, sy, rad, 0, Math.PI * 2); ctx.stroke();
          break;
      }
    }
  }

  private drawRays(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, scale: number): void {
    for (const r of this.rays) {
      if (!r.on) continue;
      r.life -= dt;
      if (r.life <= 0) { r.on = false; continue; }
      const f = r.life / r.max;
      const x0 = cam.worldToScreenX(r.x0), y0 = cam.worldToScreenY(r.z0);
      const x1 = cam.worldToScreenX(r.x1), y1 = cam.worldToScreenY(r.z1);
      if (r.mode === RayKind.Cone || r.mode === RayKind.Push) {
        const ang = Math.atan2(y1 - y0, x1 - x0);
        const radius = Math.hypot(x1 - x0, y1 - y0) * 1.2;
        if (r.mode === RayKind.Cone) {
          ctx.globalAlpha = f * 0.5;
          coneWedge(ctx, x0, y0, ang, 0.55, radius, hex(r.color));
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = f * 0.4;
          coneWedge(ctx, x0, y0, ang, 0.5, radius, hex(r.color));
          ctx.globalAlpha = 1;
          // wind streak arcs
          ctx.strokeStyle = rgba(0xffffff, f * 0.7);
          ctx.lineWidth = Math.max(1.5, scale * 0.03);
          for (let i = -1; i <= 1; i++) {
            const a = ang + i * 0.32;
            const rr = radius * (0.5 + (1 - f) * 0.5);
            ctx.beginPath();
            ctx.arc(x0, y0, rr, a - 0.25, a + 0.25);
            ctx.stroke();
          }
        }
      } else {
        const warm = r.mode === RayKind.BeamWarm;
        const glow = warm ? 0xffe9a8 : 0xbfe8ff;
        ctx.strokeStyle = rgba(glow, f * 0.5);
        ctx.lineWidth = Math.max(3, scale * (warm ? 0.16 : 0.1));
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = rgba(warm ? 0xfff6d8 : 0xffffff, f);
        ctx.lineWidth = Math.max(1.5, scale * (warm ? 0.06 : 0.04));
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
  }

  private drawArcs(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, scale: number): void {
    for (const a of this.arcs) {
      if (!a.on) continue;
      a.life -= dt;
      if (a.life <= 0) { a.on = false; continue; }
      const f = a.life / a.max;
      const lift = scale * 0.25;
      const x0 = cam.worldToScreenX(a.x0), y0 = cam.worldToScreenY(a.z0) - lift;
      const x1 = cam.worldToScreenX(a.x1), y1 = cam.worldToScreenY(a.z1) - lift;
      const jit = Math.max(4, scale * 0.2);
      jagged(ctx, x0, y0, x1, y1, 6, jit, a.seed, Math.max(1.5, scale * 0.04), rgba(0xffffff, f), rgba(a.color, f * 0.5));
    }
  }

  // ---- cinematics ---------------------------------------------------------
  private drawCines(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, scale: number): void {
    for (const c of this.cines) {
      if (!c.on) continue;
      c.life -= dt;
      if (c.life <= 0) { c.on = false; continue; }
      const p = 1 - c.life / c.max;   // 0 -> 1
      const f = c.life / c.max;
      const W = cam.viewW, H = cam.viewH;
      switch (c.kind) {
        case 'lemonBolt': {
          const sx = c.screen ? W / 2 : cam.worldToScreenX(c.x);
          const sy = c.screen ? H / 2 : cam.worldToScreenY(c.z);
          jagged(ctx, sx + (srand(c.seed) - 0.5) * scale, -8, sx, sy, 7, scale * 0.35, c.seed + ((this.time * 40) | 0), Math.max(2, scale * 0.07), rgba(0xffffff, f), rgba(0xf7f25a, f * 0.6));
          ctx.fillStyle = rgba(0xfff6a0, f * 0.5);
          ctx.beginPath(); ctx.ellipse(sx, sy, scale * 0.7 * (1 + p), scale * 0.3 * (1 + p), 0, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'slipper': {
          const sx = c.screen ? W / 2 : cam.worldToScreenX(c.x);
          const margin = scale * 2;
          const sy = -margin + p * (H + margin * 2);
          const w = Math.min(W * 0.5, Math.max(120, scale * 2.4));
          const bounce = Math.abs(Math.sin(p * Math.PI * 3));
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(1 + bounce * 0.08, 1 - bounce * 0.12);
          ctx.rotate(Math.sin(p * 8) * 0.06);
          slipper(ctx, w);
          ctx.restore();
          break;
        }
        case 'momHand': {
          const sx = c.screen ? W / 2 : cam.worldToScreenX(c.x);
          // descend: enters top, grows toward a slam near p=0.55, then lifts
          const descend = Math.min(1, p / 0.55);
          const sy = -scale * 3 + descend * (H * 0.55 + scale * 3);
          const grow = 0.5 + descend * 0.9;
          const w = Math.min(W * 0.62, Math.max(180, scale * 3.4)) * grow;
          if (!c.flag && p >= 0.55) {
            c.flag = true;
            const wx = c.screen ? cam.screenToWorldX(sx) : c.x;
            const wz = cam.screenToWorldZ(sy);
            this.ring(wx, wz, RingKind.Crater, 0.3, 4.5, 0xe8504f, 0.16, 0.5);
            this.spray(wx, wz, 16, 3, 1.5, 4, 0.7, 0.18, [PAL.poof, 0xe8d5b0, 0xffd97a], Shape.Puff);
          }
          // god-ray backlight
          ctx.globalAlpha = f * 0.4 * (p < 0.55 ? 1 : 0.4);
          godRays(ctx, sx, sy, 9, H, this.time * 0.4, rgba(0xfff2c8, 0.5));
          ctx.globalAlpha = 1;
          const slam = p >= 0.5 && p < 0.62 ? 1 - Math.abs(p - 0.56) / 0.06 : 0;
          ctx.save();
          ctx.translate(sx, sy + (p >= 0.62 ? -(p - 0.62) * H * 0.6 : 0));
          ctx.scale(1 + slam * 0.15, 1 + slam * 0.05);
          momHand(ctx, w);
          ctx.restore();
          break;
        }
        case 'timestop': {
          const a = Math.sin(p * Math.PI) * 0.42;
          ctx.fillStyle = rgba(0x8fb8e8, a);
          ctx.fillRect(0, 0, W, H);
          const cr = Math.min(W, H) * 0.16;
          const ca = Math.sin(p * Math.PI) * 0.9;
          clockFace(ctx, W / 2, H / 2, cr, -Math.PI / 2 + p * Math.PI * 4, ca);
          this.ringScreenTick(ctx, W / 2, H / 2, cr * (1 + p * 1.4), ca * 0.6);
          break;
        }
        case 'fresh': {
          const bandX = p * (W + scale * 2) - scale;
          const bw = Math.max(40, scale * 1.2);
          const g = ctx.createLinearGradient(bandX - bw, 0, bandX + bw, 0);
          g.addColorStop(0, 'rgba(200,240,160,0)');
          g.addColorStop(0.5, rgba(0xeaffc0, f * 0.5));
          g.addColorStop(1, 'rgba(200,240,160,0)');
          ctx.fillStyle = g;
          ctx.fillRect(bandX - bw, 0, bw * 2, H);
          // sparkles riding the wave
          for (let i = 0; i < 5; i++) {
            const yy = (srand(c.seed + i) * 0.9 + 0.05) * H;
            const s = (0.6 + srand(c.seed + i * 3) * 0.6) * Math.max(6, scale * 0.16);
            sparkle(ctx, bandX + (srand(c.seed + i * 7) - 0.5) * bw, yy, s * (0.6 + Math.sin(this.time * 12 + i) * 0.4 + 0.4), rgba(0xffffff, f));
          }
          break;
        }
        case 'mystery': {
          const sx = c.screen ? W / 2 : cam.worldToScreenX(c.x);
          const sy = c.screen ? H / 2 : cam.worldToScreenY(c.z);
          const w = Math.max(48, scale * 1.1);
          tupperware(ctx, sx, sy, w, Math.min(1, p * 1.5));
          // rising green "?" cloud
          if (!c.flag && p > 0.15) { c.flag = true; this.spray(c.screen ? cam.screenToWorldX(sx) : c.x, c.screen ? cam.screenToWorldZ(sy) : c.z, 6, 1.0, 1.8, -0.4, 0.8, 0.18, [0xa8c83c, 0x9aa84c], Shape.Puff); }
          ctx.fillStyle = rgba(0x2e2620, f);
          ctx.font = `700 ${Math.round(w * 0.7)}px "Comic Sans MS", system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('?', sx, sy - w * (0.4 + p * 0.9));
          break;
        }
        case 'insurance': {
          const sx = c.screen ? W / 2 : cam.worldToScreenX(c.x);
          const sy = c.screen ? H / 2 : cam.worldToScreenY(c.z);
          // approving "stamp" ring thuds down then fades
          const stampK = Math.min(1, p * 3);
          const sr = Math.max(40, scale * 1.6) * (2 - stampK);
          ctx.strokeStyle = rgba(0x3f5d7d, f * 0.9);
          ctx.lineWidth = Math.max(2, scale * 0.06);
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = rgba(0x3f5d7d, f);
          ctx.font = `700 ${Math.round(Math.max(11, scale * 0.28))}px "Comic Sans MS", system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('FIXED', sx, sy);
          // hammer sparkles orbiting
          for (let i = 0; i < 5; i++) {
            const a = this.time * 3 + (i / 5) * Math.PI * 2;
            const hr = sr * 1.15;
            hammerGlyph(ctx, sx + Math.cos(a) * hr, sy + Math.sin(a) * hr * 0.7, Math.max(8, scale * 0.2), a + Math.PI / 2);
            sparkle(ctx, sx + Math.cos(a + 0.6) * hr, sy + Math.sin(a + 0.6) * hr * 0.7, Math.max(4, scale * 0.1), rgba(0xffe27a, f));
          }
          break;
        }
        case 'static': {
          const sx = c.screen ? W / 2 : cam.worldToScreenX(c.x);
          const sy = c.screen ? H / 2 : cam.worldToScreenY(c.z);
          const rad = Math.max(30, scale * 1.6);
          const flick = 0.5 + Math.sin(this.time * 40) * 0.5;
          const spokes = 7;
          for (let i = 0; i < spokes; i++) {
            const a = (i / spokes) * Math.PI * 2 + this.time * 2;
            const ex = sx + Math.cos(a) * rad * (0.7 + srand(((this.time * 30) | 0) + i) * 0.5);
            const ey = sy + Math.sin(a) * rad * (0.7 + srand(((this.time * 30) | 0) + i * 5) * 0.5);
            jagged(ctx, sx, sy, ex, ey, 4, rad * 0.28, ((this.time * 60) | 0) + i * 17, Math.max(1.5, scale * 0.035), rgba(0xffffff, f * flick), rgba(0x9fd8ff, f * 0.5));
          }
          ctx.fillStyle = rgba(0xcfe8ff, f * 0.4 * flick);
          ctx.beginPath(); ctx.arc(sx, sy, rad * 0.3, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'wave': {
          // on-board "incoming" chevron ribbon, sweeping once near the top of the board view
          const bandY = H * 0.14;
          const bh = Math.max(18, H * 0.05);
          const a = Math.sin(p * Math.PI);
          ctx.fillStyle = rgba(0x33211a, a * 0.35);
          ctx.fillRect(0, bandY - bh / 2, W, bh);
          ctx.strokeStyle = rgba(0xffd97a, a);
          ctx.lineWidth = Math.max(2, bh * 0.18);
          const sweep = ((this.time * 2) % 1) * bh * 3;
          for (let x = -bh * 3 + sweep; x < W; x += bh * 3) {
            ctx.beginPath();
            ctx.moveTo(x, bandY - bh * 0.28);
            ctx.lineTo(x + bh * 0.7, bandY);
            ctx.lineTo(x, bandY + bh * 0.28);
            ctx.stroke();
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private ringScreenTick(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a: number): void {
    ctx.strokeStyle = rgba(0xcfe8ff, a);
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  // =========================================================================
  // full-screen scent/swarm vignette (drawn last of the VFX pass)
  // =========================================================================
  vignette(ctx: CanvasRenderingContext2D, cssW: number, cssH: number, scent: number): void {
    this.scentSmooth += (scent - this.scentSmooth) * 0.08;
    const s0 = Math.max(0, Math.min(1, this.scentSmooth / 100));
    // stay clean below ~30 scent, then ramp — the room only "sours" as the swarm pressure builds
    const s = Math.max(0, (s0 - 0.3) / 0.7);
    const swarm = this.swarmT > 0 ? (0.5 + 0.5 * Math.sin(this.time * 8)) * Math.min(1, this.swarmT) : 0;
    const strength = Math.max(s * 0.6, swarm * 0.85);
    if (strength < 0.02) return;

    const cx = cssW / 2, cy = cssH / 2;
    const inner = Math.min(cssW, cssH) * 0.35;
    const outer = Math.hypot(cx, cy);
    // warm→toxic as scent climbs; hard red when the swarm siren is up
    const edge = swarm > s * 0.6 ? 0x901020 : mix(0x2a1a0a, 0x3a5a1a, s);
    const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, rgba(edge, strength));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
  }
}

// ---- module-local color helpers (avoid importing the whole colors surface twice) ----
function darkenN(n: number): number { return mix(n, 0x000000, 0.3); }
function lightenN(n: number): number { return lighten(n, 0.3); }
