/**
 * Props & friends layer (plan §3.2, packet P3-H "Hand & Friends"). OWNED BY: P3-H.
 *
 * The picture-book player-presence extras that don't belong to any sim system and
 * aren't the Hand cursor itself:
 *   - PETS (GAME-PROMPT §9): cat / dog / goldfish-bowl sprites drawn from `state.pet`
 *     (position + mood are the sim's; we only animate the toy-box body around them).
 *   - EASTER-EGG DECOR (§20): the red drifting balloon (§20.3, pops → confetti + a real
 *     pick), the idle campfire + marshmallow sticks (§20.13), the Wave-42 towel drape
 *     (§20.6), and the windowsill sunflower with click-sway (§20.2).
 *
 * This module owns NO renderer2d state: `Hand2D` holds one `Props2D`, resets it in
 * `reset()`, draws it inside its own topmost `frame()` pass, and forwards the egg/pick
 * hooks to it — so renderer2d.ts only needs its narrow method-body routing (no new
 * fields, no loadLevel edits). Everything mirrors `src/render/eggs.ts` +
 * `src/render/models/petModels.ts` in 2D; those are the 3D behavior reference.
 *
 * Board anchors (balloon drift lane, sunflower sill) need the board extents, which
 * renderer2d can't hand us through the frozen method signatures — so we capture them
 * lazily on the first frame, when the camera is guaranteed to be at fit (loadLevel
 * ends with cam.fit()). The visible-rect-inset-by-margin at fit is the board region;
 * anchors are stored in WORLD space so they stay put when the player pans/zooms.
 *
 * Math.random is fine here — this is the render layer, not the sim (the purity scan
 * only guards src/sim + src/content).
 */

import type { SimState } from '../sim/types';
import type { Camera2D } from './camera2d';
import { COCOA_CSS, hex, rgba, lighten, darken } from './colors';

// ---- shared picture-book palette (mirrors petModels.ts / eggs.ts) -------------
const CAT_FUR = 0xe8923a;
const CAT_FUR_DARK = 0xc0722a;
const CAT_CREAM = 0xf7e2c4;
const CAT_NOSE = 0xd8687c;
const DOG_FUR = 0xc9975a;
const DOG_FUR_DARK = 0x8a6236;
const DOG_COLLAR = 0xd8344f;
const BOWL_GLASS = 0xbfe3f7;
const FISH_ORANGE = 0xe8703a;
const BALLOON_RED = 0xe8504f;
const BALLOON_DARK = 0xc83c3c;
const TOWEL_TEAL = 0x6ec8d8;
const TOWEL_STRIPE = 0xfff4e0;
const FLAME_HOT = 0xfff4be;
const FLAME_MID = 0xffa03c;
const LOG_BROWN = 0x6b4226;
const MARSH_CREAM = 0xfff4e0;
const SUN_PETAL = 0xffcf3a;
const SUN_CENTER = 0x8a5a2e;
const SUN_STEM = 0x5f9345;
const CONFETTI_COLORS = [0xe8504f, 0xffd97a, 0x6ec8d8, 0x9fd8c0, 0xe8a8b8, 0x7ac8ff, 0xffb347];

interface Confetti {
  wx: number; wz: number; vx: number; vz: number;
  life: number; maxLife: number; color: number; size: number; rot: number; spin: number;
  active: boolean;
}

/** Rounded-rect path helper (local so props stay self-contained). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export class Props2D {
  // ---- board anchors (captured lazily at first fit frame) ----
  private haveBox = false;
  private boxMinX = 0; private boxMaxX = 1;
  private boxMinZ = 0; private boxMaxZ = 1;

  // ---- pet (read from state each frame; we keep only smoothing/mood state) ----
  private petId: string | null = null;
  private petLerpX = 0;
  private petLerpZ = 0;
  private petPunchT = 0;
  private lastMood: 'idle' | 'active' = 'idle';

  // ---- red balloon (§20.3) ----
  private balloonWanted = false;
  private balloon: { x: number; z: number; dir: number; t: number } | null = null;
  private balloonCenterX = 0;
  private balloonHalfSpan = 4;
  private balloonZ = 0;

  // ---- confetti burst on balloon pop (world-anchored, pooled) ----
  private confetti: Confetti[] = [];

  // ---- idle campfire (§20.13) ----
  private campfire: { x: number; z: number; t: number } | null = null;

  // ---- wave-42 towels (§20.6) — a flag; drawn per live tower each frame ----
  private towelsOn = false;

  // ---- windowsill sunflower (§20.2) ----
  private sunAnchor: { x: number; z: number } | null = null;
  private sunSwayT = 0;

  reset(): void {
    this.haveBox = false;
    this.petId = null;
    this.petPunchT = 0;
    this.lastMood = 'idle';
    this.balloonWanted = false;
    this.balloon = null;
    for (const c of this.confetti) c.active = false;
    this.campfire = null;
    this.towelsOn = false;
    this.sunAnchor = null;
    this.sunSwayT = 0;
  }

  // ---- board-anchor capture (first fit frame) -----------------------------
  private captureBox(cam: Camera2D): void {
    const m = cam.margin;
    this.boxMinX = cam.screenToWorldX(m);
    this.boxMaxX = cam.screenToWorldX(cam.viewW - m);
    this.boxMinZ = cam.screenToWorldZ(m);
    this.boxMaxZ = cam.screenToWorldZ(cam.viewH - m);
    const w = Math.max(1, this.boxMaxX - this.boxMinX);
    const h = Math.max(1, this.boxMaxZ - this.boxMinZ);
    // balloon drifts across the back edge (min-z = the "far wall / window" in top-down)
    this.balloonCenterX = this.boxMinX + w * 0.5;
    this.balloonHalfSpan = w * 0.42;
    this.balloonZ = this.boxMinZ + h * 0.16; // near the back "window" edge, clear of the top HUD strip
    // sunflower sits on the back-left "windowsill" corner, world-locked from here on
    this.sunAnchor = { x: this.boxMinX + w * 0.12, z: this.boxMinZ + h * 0.08 };
    this.haveBox = true;
  }

  // ---- balloon (§20.3) ----------------------------------------------------
  /** ~1/6 chance per level (game.ts rolls via us); actual spawn is deferred to the
   *  first frame once the board box is known. */
  maybeSpawnBalloon(chance = 1 / 6): void {
    if (this.balloon || this.balloonWanted) return;
    if (Math.random() < chance) this.balloonWanted = true;
  }

  get balloonActive(): boolean {
    return this.balloon !== null;
  }

  /** Hit-test the live balloon at a CSS-px screen point; pops it (confetti) + returns true on a hit. */
  pickBalloon(px: number, py: number, cam: Camera2D): boolean {
    if (!this.balloon) return false;
    const sx = cam.worldToScreenX(this.balloon.x);
    const sy = cam.worldToScreenY(this.balloon.z);
    const r = this.balloonRadius(cam) * 1.6; // forgiving finger/mouse target (the balloon drifts)
    if ((px - sx) * (px - sx) + (py - sy) * (py - sy) > r * r) return false;
    this.spawnConfetti(this.balloon.x, this.balloon.z);
    this.balloon = null;
    this.balloonWanted = false;
    return true;
  }

  private balloonRadius(cam: Camera2D): number {
    return Math.max(16, Math.min(56, cam.scale * 0.42));
  }

  private spawnConfetti(wx: number, wz: number): void {
    let spawned = 0;
    for (const c of this.confetti) {
      if (c.active) continue;
      this.initConfetti(c, wx, wz);
      if (++spawned >= 18) return;
    }
    while (spawned < 18) {
      const c: Confetti = { wx: 0, wz: 0, vx: 0, vz: 0, life: 0, maxLife: 1, color: 0, size: 0, rot: 0, spin: 0, active: false };
      this.initConfetti(c, wx, wz);
      this.confetti.push(c);
      spawned++;
    }
  }

  private initConfetti(c: Confetti, wx: number, wz: number): void {
    const a = Math.random() * Math.PI * 2;
    const speed = 2.2 + Math.random() * 3.4;
    c.wx = wx; c.wz = wz;
    c.vx = Math.cos(a) * speed;
    c.vz = Math.sin(a) * speed - 1.2; // slight upward-in-plane bias so it reads as a "burst"
    c.maxLife = 0.65 + Math.random() * 0.5;
    c.life = c.maxLife;
    c.color = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
    c.size = 0.06 + Math.random() * 0.06;
    c.rot = Math.random() * Math.PI;
    c.spin = (Math.random() - 0.5) * 12;
    c.active = true;
  }

  // ---- campfire (§20.13) --------------------------------------------------
  spawnCampfire(at: { x: number; z: number }): void {
    if (this.campfire) return;
    this.campfire = { x: at.x, z: at.z, t: 0 };
  }

  clearCampfire(): void {
    this.campfire = null;
  }

  get campfireActive(): boolean {
    return this.campfire !== null;
  }

  // ---- towels (§20.6) -----------------------------------------------------
  drapeTowels(): void { this.towelsOn = true; }
  clearTowels(): void { this.towelsOn = false; }

  // ---- sunflower (§20.2) --------------------------------------------------
  swaySunflower(): void { this.sunSwayT = 1; }

  pickSunflower(px: number, py: number, cam: Camera2D): boolean {
    if (!this.sunAnchor) return false;
    const sx = cam.worldToScreenX(this.sunAnchor.x);
    const sy = cam.worldToScreenY(this.sunAnchor.z);
    const r = Math.max(18, cam.scale * 0.5);
    if ((px - sx) * (px - sx) + (py - sy) * (py - sy) > r * r) return false;
    this.swaySunflower();
    return true;
  }

  // ---- per-frame draw -----------------------------------------------------
  /** Draw pets + eggs. `ctx` is already at the dpr base transform (CSS-px space). */
  frame(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number, state: SimState): void {
    if (!this.haveBox && cam.viewW > 1) this.captureBox(cam);

    // spawn a pending balloon now that the board box exists
    if (this.balloonWanted && !this.balloon && this.haveBox) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.balloon = { x: this.balloonCenterX - dir * this.balloonHalfSpan, z: this.balloonZ, dir, t: 0 };
      this.balloonWanted = false;
    }

    // draw order: sunflower (sits on the far sill, behind action) → campfire → pet →
    // towels (on top of their towers) → balloon (flier) → confetti (topmost egg VFX)
    this.drawSunflower(ctx, cam, dt, time);
    this.drawCampfire(ctx, cam, dt, time);
    this.drawPet(ctx, cam, dt, time, state);
    if (this.towelsOn) this.drawTowels(ctx, cam, state, time);
    this.updateAndDrawBalloon(ctx, cam, dt);
    this.updateAndDrawConfetti(ctx, cam, dt);
  }

  // ---------- PETS (§9) ----------
  private drawPet(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number, state: SimState): void {
    const pet = state.pet;
    if (!pet) { this.petId = null; return; }
    // (re)acquire: snap on first sight / species change, then spring-follow (mirrors 3D basePos lerp)
    if (this.petId !== pet.id) {
      this.petId = pet.id;
      this.petLerpX = pet.pos.x;
      this.petLerpZ = pet.pos.z;
    }
    this.petLerpX += (pet.pos.x - this.petLerpX) * Math.min(1, dt * 6);
    this.petLerpZ += (pet.pos.z - this.petLerpZ) * Math.min(1, dt * 6);

    // mood → a one-shot "gotcha" scale-punch on the idle→active beat (petSwat/Bark/Pounce)
    if (pet.mood === 'active' && this.lastMood !== 'active') this.petPunchT = 1;
    this.lastMood = pet.mood;
    this.petPunchT = Math.max(0, this.petPunchT - dt * 3.2);
    const punch = 1 + Math.sin(this.petPunchT * Math.PI) * 0.3;
    const active = pet.mood === 'active';

    const sx = cam.worldToScreenX(this.petLerpX);
    const sy = cam.worldToScreenY(this.petLerpZ);
    const s = cam.scale * punch;
    if (s < 4) return;

    // soft round drop shadow
    ctx.fillStyle = 'rgba(30,20,12,0.22)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + s * 0.42, s * 0.62, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    if (pet.id === 'cat') this.drawCat(ctx, sx, sy, s, time, active);
    else if (pet.id === 'dog') this.drawDog(ctx, sx, sy, s, time, active);
    else this.drawGoldfish(ctx, sx, sy, s, time, active);
  }

  /** Princess Destructo — orange loaf seen from above: oval body, head, ears, flicking tail. */
  private drawCat(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, time: number, active: boolean): void {
    const ink = Math.max(2, s * 0.05);
    const tailFlick = Math.sin(time * (active ? 9 : 1.6)) * (active ? 0.5 : 0.3);
    // tail (curves off the back-left, whipping)
    ctx.strokeStyle = hex(CAT_FUR);
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.34, cy + s * 0.1);
    ctx.quadraticCurveTo(cx - s * 0.75, cy + s * 0.05 + tailFlick * s * 0.3, cx - s * 0.62, cy - s * 0.32 + tailFlick * s * 0.4);
    ctx.stroke();
    // body loaf
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.5, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(CAT_FUR);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // back stripes
    ctx.strokeStyle = hex(CAT_FUR_DARK);
    ctx.lineWidth = s * 0.06;
    for (const off of [-0.16, 0, 0.16]) {
      ctx.beginPath();
      ctx.moveTo(cx + off * s, cy - s * 0.22);
      ctx.lineTo(cx + off * s * 0.8, cy - s * 0.02);
      ctx.stroke();
    }
    // ears (poke above the head)
    const hy = cy - s * 0.34;
    ctx.fillStyle = hex(CAT_FUR);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sgn * s * 0.14, hy - s * 0.02);
      ctx.lineTo(cx + sgn * s * 0.26, hy - s * 0.34);
      ctx.lineTo(cx + sgn * s * 0.3, hy - s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = ink * 0.7;
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
    }
    // head
    ctx.beginPath();
    ctx.ellipse(cx, hy, s * 0.28, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(CAT_FUR);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // muzzle + nose
    ctx.beginPath();
    ctx.ellipse(cx, hy + s * 0.08, s * 0.13, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(CAT_CREAM);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, hy + s * 0.06, s * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = hex(CAT_NOSE);
    ctx.fill();
    // eyes
    this.eyes(ctx, cx, hy - s * 0.04, s * 0.075, s * 0.13, active ? -1 : 0);
  }

  /** Sir Barksalot — tan sitter from above: round body, head, floppy ears, red collar, wagging tail. */
  private drawDog(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, time: number, active: boolean): void {
    const ink = Math.max(2, s * 0.05);
    const wag = Math.sin(time * (active ? 6 : 3.2)) * 0.5;
    // tail
    ctx.strokeStyle = hex(DOG_FUR);
    ctx.lineWidth = s * 0.13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.3, cy + s * 0.14);
    ctx.quadraticCurveTo(cx + s * 0.62, cy + s * 0.24, cx + s * 0.6 + wag * s * 0.3, cy - s * 0.08 - Math.abs(wag) * s * 0.2);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.46, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(DOG_FUR);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // collar arc
    ctx.strokeStyle = hex(DOG_COLLAR);
    ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.16, s * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // head
    const hy = cy - s * 0.32;
    ctx.beginPath();
    ctx.ellipse(cx, hy, s * 0.3, s * 0.27, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(DOG_FUR);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // floppy ears
    const perk = active ? s * 0.06 : 0;
    ctx.fillStyle = hex(DOG_FUR_DARK);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * s * 0.3, hy - perk, s * 0.1, s * 0.2, sgn * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = ink * 0.7;
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
    }
    // muzzle + nose
    ctx.beginPath();
    ctx.ellipse(cx, hy + s * 0.1, s * 0.15, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(lighten(DOG_FUR, 0.16));
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, hy + s * 0.08, s * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = hex(0x2e2620);
    ctx.fill();
    // eyes
    this.eyes(ctx, cx, hy - s * 0.03, s * 0.07, s * 0.14, 0);
  }

  /** The Oracle — glass bowl from above: a ring of glass, water disc, orbiting fish, pebble ring. */
  private drawGoldfish(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, time: number, active: boolean): void {
    const ink = Math.max(2, s * 0.05);
    const R = s * 0.44;
    // water disc
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0x6fb6d9, 0.55 + Math.sin(time * 1.7) * 0.08);
    ctx.fill();
    // pebbles around the inner rim
    ctx.fillStyle = hex(0x9a9aa2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
    // fish (orbits the bowl)
    const speed = active ? 2.4 : 1.1;
    const fa = time * speed;
    const fx = cx + Math.cos(fa) * R * 0.42;
    const fy = cy + Math.sin(fa) * R * 0.42;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(fa + Math.PI / 2);
    ctx.fillStyle = hex(FISH_ORANGE);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.11, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); // tail fin
    ctx.moveTo(-s * 0.1, 0);
    ctx.lineTo(-s * 0.2, -s * 0.06);
    ctx.lineTo(-s * 0.2, s * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // glass bowl rim + sheen (drawn over the water/fish so it reads as glass)
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = COCOA_CSS;
    ctx.lineWidth = ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = rgba(BOWL_GLASS, 0.16);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - R * 0.32, cy - R * 0.34, R * 0.28, Math.PI * 0.8, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = s * 0.05;
    ctx.stroke();
  }

  private eyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, spread: number, look: number): void {
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * spread;
      ctx.beginPath();
      ctx.arc(ex, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = r * 0.35;
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex + look * r * 0.4, cy + r * 0.15, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = COCOA_CSS;
      ctx.fill();
    }
  }

  // ---------- BALLOON (§20.3) ----------
  private updateAndDrawBalloon(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number): void {
    const b = this.balloon;
    if (!b) return;
    b.t += dt;
    b.x += b.dir * dt * 0.9;
    const sway = Math.sin(b.t * 0.8) * 0.12;
    const edge = this.balloonCenterX + b.dir * this.balloonHalfSpan;
    const past = b.dir > 0 ? b.x > edge : b.x < edge;
    if (past || b.t > 40) { this.balloon = null; return; }

    const sx = cam.worldToScreenX(b.x) + sway * cam.scale * 0.4;
    const sy = cam.worldToScreenY(b.z) + Math.sin(b.t * 0.8) * 6;
    const r = this.balloonRadius(cam);
    const ink = Math.max(2, r * 0.1);
    // string (wavy, hanging "down" = +screenY)
    ctx.strokeStyle = 'rgba(120,110,90,0.85)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    ctx.moveTo(sx, sy + r * 0.98);
    ctx.quadraticCurveTo(sx + Math.sin(b.t * 1.6) * r * 0.4, sy + r * 1.7, sx + Math.sin(b.t * 1.2) * r * 0.2, sy + r * 2.4);
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 0.86, r, sway, 0, Math.PI * 2);
    ctx.fillStyle = hex(BALLOON_RED);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // knot
    ctx.beginPath();
    ctx.moveTo(sx - r * 0.12, sy + r * 0.96);
    ctx.lineTo(sx + r * 0.12, sy + r * 0.96);
    ctx.lineTo(sx, sy + r * 1.18);
    ctx.closePath();
    ctx.fillStyle = hex(BALLOON_DARK);
    ctx.fill();
    // highlight
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.3, sy - r * 0.36, r * 0.2, r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  }

  private updateAndDrawConfetti(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number): void {
    for (const c of this.confetti) {
      if (!c.active) continue;
      c.life -= dt;
      if (c.life <= 0) { c.active = false; continue; }
      // world-space drift with drag so the burst stays where the balloon popped
      c.wx += c.vx * dt;
      c.wz += c.vz * dt;
      c.vx *= 1 - dt * 2.2;
      c.vz = c.vz * (1 - dt * 2.2) + dt * 2.0; // gentle settle "downward" in-plane
      c.rot += c.spin * dt;
      const a = Math.min(1, c.life / c.maxLife);
      const sx = cam.worldToScreenX(c.wx);
      const sy = cam.worldToScreenY(c.wz);
      const sz = c.size * cam.scale;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(c.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = hex(c.color);
      ctx.fillRect(-sz * 0.5, -sz * 0.35, sz, sz * 0.7);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- CAMPFIRE (§20.13) ----------
  private drawCampfire(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number): void {
    const f = this.campfire;
    if (!f) return;
    f.t += dt;
    const cx = cam.worldToScreenX(f.x);
    const cy = cam.worldToScreenY(f.z);
    const s = cam.scale;
    if (s < 4) return;
    const ink = Math.max(2, s * 0.045);
    // warm glow pool
    const glowR = s * (0.9 + Math.sin(time * 9) * 0.06 + Math.sin(time * 23) * 0.03);
    const grad = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, glowR);
    grad.addColorStop(0, 'rgba(255,180,90,0.5)');
    grad.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
    // crossed logs
    ctx.strokeStyle = hex(LOG_BROWN);
    ctx.lineWidth = s * 0.1;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      const dx = Math.cos(a) * s * 0.3;
      const dz = Math.sin(a) * s * 0.16;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dz + s * 0.12);
      ctx.lineTo(cx + dx, cy + dz + s * 0.12);
      ctx.stroke();
    }
    // marshmallow sticks + marshmallows
    ctx.strokeStyle = hex(0x8a6a45);
    ctx.lineWidth = s * 0.03;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sgn * s * 0.6, cy + s * 0.3);
      ctx.lineTo(cx + sgn * s * 0.14, cy - s * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + sgn * s * 0.14, cy - s * 0.02, s * 0.06, 0, Math.PI * 2);
      ctx.fillStyle = hex(MARSH_CREAM);
      ctx.fill();
      ctx.lineWidth = ink * 0.6;
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
      ctx.strokeStyle = hex(0x8a6a45);
      ctx.lineWidth = s * 0.03;
    }
    // flame (layered, flickering)
    const flick = 1 + Math.sin(time * 11) * 0.12;
    const fh = s * 0.5 * flick;
    for (const [col, scale] of [[FLAME_MID, 1], [FLAME_HOT, 0.55]] as const) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.16 * scale, cy + s * 0.06);
      ctx.quadraticCurveTo(cx - s * 0.18 * scale, cy - fh * 0.5, cx + Math.sin(time * 13) * s * 0.05, cy - fh * scale);
      ctx.quadraticCurveTo(cx + s * 0.18 * scale, cy - fh * 0.5, cx + s * 0.16 * scale, cy + s * 0.06);
      ctx.closePath();
      ctx.fillStyle = hex(col);
      ctx.fill();
    }
  }

  // ---------- TOWELS (§20.6) ----------
  private drawTowels(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState, time: number): void {
    const s = cam.scale;
    if (s < 6) return;
    const w = s * 0.72;
    const h = s * 0.42;
    for (const t of state.towers.values()) {
      const cx = cam.worldToScreenX(t.pos.x);
      const cy = cam.worldToScreenY(t.pos.z) - s * 0.34; // drape over the top of the tower sprite
      const wave = Math.sin(time * 2 + t.id) * s * 0.03;
      roundRect(ctx, cx - w / 2, cy - h / 2 + wave, w, h, s * 0.06);
      ctx.fillStyle = hex(TOWEL_TEAL);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
      // cream stripe
      ctx.fillStyle = hex(TOWEL_STRIPE);
      ctx.fillRect(cx - w / 2 + s * 0.03, cy - h * 0.12 + wave, w - s * 0.06, h * 0.16);
    }
  }

  // ---------- SUNFLOWER (§20.2) ----------
  private drawSunflower(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number): void {
    const a = this.sunAnchor;
    if (!a) return;
    // sway: click gives a happy shake, else a slow ambient breeze
    let sway: number;
    if (this.sunSwayT > 0) {
      this.sunSwayT = Math.max(0, this.sunSwayT - dt * 1.4);
      sway = Math.sin(this.sunSwayT * Math.PI * 3) * 0.28 * this.sunSwayT;
    } else {
      sway = Math.sin(time * 0.7) * 0.05;
    }
    const cx = cam.worldToScreenX(a.x);
    const cy = cam.worldToScreenY(a.z);
    const s = cam.scale;
    if (s < 5) return;
    const ink = Math.max(1.5, s * 0.035);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sway);
    // little sill/pot hint
    ctx.fillStyle = hex(0xb07b4f);
    roundRect(ctx, -s * 0.16, s * 0.28, s * 0.32, s * 0.2, s * 0.04);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // stem + a leaf
    ctx.strokeStyle = hex(SUN_STEM);
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.lineTo(0, -s * 0.06);
    ctx.stroke();
    ctx.fillStyle = hex(SUN_STEM);
    ctx.beginPath();
    ctx.ellipse(s * 0.16, s * 0.14, s * 0.12, s * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();
    // petals (radiating rosette, top-down)
    const petalR = s * 0.28;
    ctx.fillStyle = hex(SUN_PETAL);
    ctx.strokeStyle = hex(darken(SUN_PETAL, 0.18));
    ctx.lineWidth = Math.max(1, s * 0.015);
    for (let i = 0; i < 12; i++) {
      const pa = (i / 12) * Math.PI * 2;
      const px = Math.cos(pa) * petalR;
      const py = -s * 0.18 + Math.sin(pa) * petalR;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pa);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.14, s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // seed center
    ctx.beginPath();
    ctx.arc(0, -s * 0.18, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = hex(SUN_CENTER);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    ctx.restore();
  }
}
