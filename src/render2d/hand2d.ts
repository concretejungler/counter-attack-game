/**
 * Hand cursor + friends layer (plan §3.2). OWNED BY: P3-H "Hand & Friends".
 *
 * The topmost pass of the 2D view: the Hand of the Homeowner (a chunky palm-down
 * cartoon hand rendered at the pointer's board target) plus — folded in here so
 * renderer2d.ts needs no new fields or loadLevel edits — the `Props2D` friends
 * layer (pets + easter-egg decor). renderer2d already:
 *   - constructs one `Hand2D` (`new Hand2D()`),
 *   - resets it in loadLevel (`hand.reset()` → also resets props),
 *   - draws it last, every frame (`hand.frame(ctx, cam, dt, time, state)` → draws
 *     props first, then the hand on very top),
 * so the whole packet rides in through the existing seam; renderer2d only routes
 * its narrow egg/hand/pick method bodies to the pass-throughs at the bottom here.
 *
 * POSES (mirrors the 3D `HandView` intent, restyled for top-down 2D):
 *   point  — index finger out; the fingertip is the cursor hotspot (default hover).
 *   press  — fingers splayed, hand squashes to the board + expanding "press rings"
 *            (fired by handPress() on a squash/tap).
 *   sweep  — hand tilts along the drag; a trail of motion arcs + dust puffs behind it.
 *   flick  — slingshot: index/thumb pinch + a rubber-band V stretched back to the
 *            anchor (captured where the flick gesture began = the grabbed critter).
 *   carry  — a fist gripping the carried tower's translucent sprite ghost above it.
 *   idle   — same as point, gentle bob (used before any gesture).
 *
 * VISIBILITY: on touch the finger IS the hand, so the sprite shows only DURING an
 * active gesture; on mouse it's the cursor, so it shows whenever it has a board
 * target (i.e. the pointer is over the canvas). A sustained-hover heuristic upgrades
 * hybrid touch+mouse devices to mouse behavior.
 *
 * Hot path stays allocation-free per the §2 perf budget (fixed trail ring buffer,
 * no per-frame arrays); Math.random is fine in the render layer.
 */

import type { SimState } from '../sim/types';
import type { Camera2D } from './camera2d';
import { getSprite } from './spriteCache';
import { COCOA_CSS, hex } from './colors';
import { Props2D } from './props2d';

export type HandPose = 'idle' | 'point' | 'flick' | 'press' | 'sweep' | 'carry';

const SKIN = 0xf0c8a0;
const SKIN_SHADE = 0xdca878;
const SLEEVE = 0x4a90c8;
const SLEEVE_DARK = 0x3a72a0;

/** Per-pose finger extension (0 = curled to the palm, 1 = fully out) for [index, middle, ring, pinky]. */
const POSE_EXT: Record<HandPose, readonly [number, number, number, number]> = {
  idle: [0.9, 0.14, 0.08, 0.05],
  point: [0.9, 0.14, 0.08, 0.05],
  press: [0.82, 0.86, 0.84, 0.78],
  sweep: [0.62, 0.66, 0.6, 0.5],
  flick: [0.86, 0.12, 0.08, 0.05],
  carry: [0.42, 0.44, 0.42, 0.38],
};
/** Per-pose lateral splay of the fingers (px multiplier of hand scale). */
const POSE_SPREAD: Record<HandPose, number> = {
  idle: 1, point: 1, press: 1.5, sweep: 0.7, flick: 0.9, carry: 0.7,
};

const TRAIL_LEN = 10;

export class Hand2D {
  pose: HandPose = 'idle';
  targetX = 0;
  targetZ = 0;

  /** The friends layer (pets + eggs). Owned here so renderer2d needs no extra field. */
  private props = new Props2D();

  // smoothed pose params
  private ext: [number, number, number, number] = [0.9, 0.14, 0.08, 0.05];
  private spread = 1;
  private tilt = 0;

  // press slam + rings
  private pressT = 0;
  private ringT = 0;

  // flick slingshot anchor (world), captured when the pose becomes 'flick'
  private anchorX = 0;
  private anchorZ = 0;
  private wasFlick = false;

  // sweep trail ring buffer of recent screen points (fixed size — no per-frame alloc)
  private trailX = new Float32Array(TRAIL_LEN);
  private trailY = new Float32Array(TRAIL_LEN);
  private trailHead = 0;
  private trailFill = 0;
  private lastSX = 0;
  private lastSY = 0;

  // visibility model
  private hasTarget = false;
  private vis = 0;
  private sinceTarget = 999;
  private hoverT = 0;
  private mouseMode = false;
  private isTouch = detectTouch();

  reset(): void {
    this.pose = 'idle';
    this.targetX = 0;
    this.targetZ = 0;
    this.ext = [0.9, 0.14, 0.08, 0.05];
    this.spread = 1;
    this.tilt = 0;
    this.pressT = 0;
    this.ringT = 0;
    this.wasFlick = false;
    this.trailHead = 0;
    this.trailFill = 0;
    this.hasTarget = false;
    this.vis = 0;
    this.sinceTarget = 999;
    this.hoverT = 0;
    this.mouseMode = false;
    this.props.reset();
  }

  setPose(pose: HandPose): void {
    if (pose === 'flick' && !this.wasFlick) {
      // capture the slingshot anchor where the flick began (the grabbed critter's tile)
      this.anchorX = this.targetX;
      this.anchorZ = this.targetZ;
    }
    this.wasFlick = pose === 'flick';
    this.pose = pose;
  }

  setWorldTarget(x: number, z: number): void {
    this.targetX = x;
    this.targetZ = z;
    this.hasTarget = true;
    this.sinceTarget = 0;
  }

  /** Squash press: slam to the board + emit an expanding press-ring set. */
  press(): void {
    this.pressT = 1;
    this.ringT = 1;
  }

  /** Draw the friends layer, then the hand cursor on top. Called last, over everything. */
  frame(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number, state?: SimState): void {
    const dtc = Math.min(0.05, Math.max(0, dt));
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // pets + eggs (below the hand)
    if (state) this.props.frame(ctx, cam, dtc, time, state);

    this.updateVisibility(dtc);
    this.drawHand(ctx, cam, dtc, time, state);

    ctx.restore();
  }

  // ---- visibility (touch = during-gesture only; mouse = whenever over canvas) ----
  private updateVisibility(dt: number): void {
    const targetedThisFrame = this.sinceTarget <= dt * 1.5 + 1e-4;
    const gesturePose = this.pose === 'flick' || this.pose === 'sweep' || this.pose === 'carry';
    // sustained hover (targets arriving while idle/point) ⇒ this is really a mouse
    if (targetedThisFrame && !gesturePose && (this.pose === 'point' || this.pose === 'idle')) {
      this.hoverT += dt;
      if (this.hoverT > 0.25) this.mouseMode = true;
    } else if (gesturePose) {
      this.hoverT = 0;
    }
    this.sinceTarget += dt;

    const touchLike = this.isTouch && !this.mouseMode;
    const gesturing = gesturePose || this.pressT > 0.02 || this.sinceTarget < 0.15;
    const active = this.hasTarget && (touchLike ? gesturing : true);
    this.vis += ((active ? 1 : 0) - this.vis) * Math.min(1, dt * 14);
  }

  // ---- the hand ----------------------------------------------------------
  private drawHand(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number, time: number, state?: SimState): void {
    // ease pose params toward the current pose targets (spring-follow, mirrors 3D poseT).
    // A live press pulse momentarily overrides the finger shape to the splayed "press"
    // (so a squash tap flashes splayed, then relaxes back to the hover pose).
    const poseForFingers: HandPose = this.pressT > 0.05 && this.pose !== 'flick' && this.pose !== 'carry' ? 'press' : this.pose;
    const k = Math.min(1, dt * 10);
    const tgt = POSE_EXT[poseForFingers];
    for (let i = 0; i < 4; i++) this.ext[i] += (tgt[i] - this.ext[i]) * k;
    this.spread += (POSE_SPREAD[poseForFingers] - this.spread) * k;
    this.pressT = Math.max(0, this.pressT - dt * 3.2);
    this.ringT = Math.max(0, this.ringT - dt * 1.8);

    const sx = cam.worldToScreenX(this.targetX);
    const sy = cam.worldToScreenY(this.targetZ);

    // record sweep trail + derive movement direction (for tilt) from screen motion
    let mvx = sx - this.lastSX;
    let mvy = sy - this.lastSY;
    this.lastSX = sx; this.lastSY = sy;
    if (this.pose === 'sweep') {
      this.trailX[this.trailHead] = sx;
      this.trailY[this.trailHead] = sy;
      this.trailHead = (this.trailHead + 1) % TRAIL_LEN;
      this.trailFill = Math.min(TRAIL_LEN, this.trailFill + 1);
    } else {
      this.trailFill = Math.max(0, this.trailFill - 1);
    }
    const tiltTgt = this.pose === 'sweep' ? Math.atan2(mvy, mvx) * 0.25 : 0;
    this.tilt += (tiltTgt - this.tilt) * Math.min(1, dt * 8);

    if (this.vis < 0.02 || !this.hasTarget) return;

    // sweep motion arcs + dust (below the hand, world-ish anchored to the trail)
    if (this.trailFill > 1) this.drawSweepTrail(ctx);
    // flick slingshot band (below the hand)
    if (this.pose === 'flick') this.drawSlingshot(ctx, cam, sx, sy);
    // press rings
    if (this.ringT > 0.01) this.drawPressRings(ctx, sx, sy);

    // hand size: a fixed, chunky screen size (a cursor, not a board entity), nudged
    // slightly by zoom so it never feels tiny on a zoomed-out fit view.
    const hs = Math.max(52, Math.min(96, cam.viewH * 0.11));
    const bob = Math.sin(time * 2.2) * hs * 0.02;
    const slam = Math.sin(Math.min(1, this.pressT) * Math.PI); // 0..1..0

    ctx.save();
    ctx.globalAlpha = this.vis;
    ctx.translate(sx, sy + bob);
    ctx.rotate(this.tilt);
    // squash on press: flatten toward the board (wider + shorter)
    ctx.scale(1 + slam * 0.14, 1 - slam * 0.2);
    this.paintHandBody(ctx, hs);
    ctx.restore();

    // carried-tower ghost floats above the fist (drawn after the hand transform is popped
    // so it isn't squashed with a press)
    if (this.pose === 'carry') this.drawCarryGhost(ctx, sx, sy + bob, hs, time, state);
    ctx.globalAlpha = 1;
  }

  /** Draw the hand centered at the origin, fingertips pointing "up" (−screenY), wrist below. */
  private paintHandBody(ctx: CanvasRenderingContext2D, hs: number): void {
    const ink = Math.max(2.5, hs * 0.055);
    const palmW = hs * 0.5;
    const palmTop = -hs * 0.02;
    const palmBot = hs * 0.44;

    // sleeve/arm coming in from the bottom-right (the homeowner reaching in)
    ctx.save();
    ctx.translate(hs * 0.06, palmBot + hs * 0.04);
    ctx.rotate(0.28);
    ctx.fillStyle = hex(SLEEVE);
    rr(ctx, -palmW * 0.56, 0, palmW * 1.12, hs * 0.5, hs * 0.14);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // cuff
    ctx.fillStyle = hex(SLEEVE_DARK);
    rr(ctx, -palmW * 0.56, -hs * 0.02, palmW * 1.12, hs * 0.12, hs * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // fingers (four, splaying up from the palm top) — draw before the palm so the palm
    // covers their knuckle roots
    const baseXs = [-0.3, -0.1, 0.1, 0.3];
    const fingerLenMax = hs * 0.5;
    const fw = hs * 0.13;
    for (let i = 0; i < 4; i++) {
      const bx = baseXs[i] * palmW * 2 * this.spread * 0.5;
      const len = fingerLenMax * (0.35 + this.ext[i] * 0.65);
      const tipY = palmTop - len;
      // splay outward a touch at the tips
      const tipX = bx + baseXs[i] * hs * 0.12 * this.spread;
      ctx.beginPath();
      ctx.moveTo(bx, palmTop + hs * 0.06);
      ctx.lineTo(tipX, tipY);
      ctx.lineWidth = fw;
      ctx.strokeStyle = hex(SKIN);
      ctx.stroke();
      ctx.lineWidth = fw + ink * 0.9;
      ctx.strokeStyle = COCOA_CSS;
      ctx.globalCompositeOperation = 'destination-over';
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      // fingertip cap
      ctx.beginPath();
      ctx.arc(tipX, tipY, fw * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = hex(SKIN);
      ctx.fill();
    }

    // thumb (off the left side, angled)
    const thumbExt = this.pose === 'carry' || this.pose === 'press' ? 0.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(-palmW * 0.42, palmTop + hs * 0.14);
    ctx.lineTo(-palmW * 0.42 - hs * 0.16 * thumbExt, palmTop - hs * 0.02);
    ctx.lineWidth = fw * 1.05;
    ctx.strokeStyle = hex(SKIN);
    ctx.stroke();
    ctx.lineWidth = fw * 1.05 + ink * 0.9;
    ctx.strokeStyle = COCOA_CSS;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // palm (back of the hand)
    rr(ctx, -palmW * 0.5, palmTop, palmW, palmBot - palmTop, palmW * 0.28);
    ctx.fillStyle = hex(SKIN);
    ctx.fill();
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // knuckle shade line
    ctx.beginPath();
    ctx.moveTo(-palmW * 0.34, palmTop + hs * 0.08);
    ctx.quadraticCurveTo(0, palmTop + hs * 0.02, palmW * 0.34, palmTop + hs * 0.08);
    ctx.lineWidth = Math.max(1.5, hs * 0.02);
    ctx.strokeStyle = hex(SKIN_SHADE);
    ctx.stroke();
  }

  private drawPressRings(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
    const base = 56;
    for (let i = 0; i < 3; i++) {
      const p = Math.min(1, (1 - this.ringT) + i * 0.2);
      if (p <= 0 || p >= 1) continue;
      const r = base * (0.25 + p * 1.2);
      // a warm cocoa ring reads on the light table where a white one washes out
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(90,60,40,${(1 - p) * 0.6})`;
      ctx.lineWidth = Math.max(2.5, 8 * (1 - p));
      ctx.stroke();
    }
  }

  private drawSweepTrail(ctx: CanvasRenderingContext2D): void {
    ctx.lineCap = 'round';
    for (let n = 1; n < this.trailFill; n++) {
      const iA = (this.trailHead - n - 1 + TRAIL_LEN * 2) % TRAIL_LEN;
      const iB = (this.trailHead - n + TRAIL_LEN * 2) % TRAIL_LEN;
      const a = (1 - n / this.trailFill) * 0.62;
      ctx.beginPath();
      ctx.moveTo(this.trailX[iA], this.trailY[iA]);
      ctx.lineTo(this.trailX[iB], this.trailY[iB]);
      ctx.strokeStyle = `rgba(255,248,224,${a})`;
      ctx.lineWidth = 5 + (1 - n / this.trailFill) * 10;
      ctx.stroke();
      // dust puffs kicked up along the trail
      if (n % 2 === 0) {
        ctx.beginPath();
        ctx.arc(this.trailX[iA], this.trailY[iA], 3 + a * 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,178,148,${a * 0.8})`;
        ctx.fill();
      }
    }
  }

  private drawSlingshot(ctx: CanvasRenderingContext2D, cam: Camera2D, sx: number, sy: number): void {
    const ax = cam.worldToScreenX(this.anchorX);
    const ay = cam.worldToScreenY(this.anchorZ);
    const dx = sx - ax;
    const dy = sy - ay;
    const len = Math.hypot(dx, dy);
    if (len < 6) return;
    // rubber-band V: two forks offset perpendicular around the anchor, meeting at the pinch
    const nx = -dy / len;
    const ny = dx / len;
    const fork = Math.min(28, 10 + len * 0.12);
    const tension = Math.min(1, len / 180);
    ctx.strokeStyle = `rgba(70,50,40,${0.55 + tension * 0.35})`;
    ctx.lineWidth = 3 + tension * 3;
    ctx.beginPath();
    ctx.moveTo(ax + nx * fork, ay + ny * fork);
    ctx.lineTo(sx, sy);
    ctx.lineTo(ax - nx * fork, ay - ny * fork);
    ctx.stroke();
    // anchor nub
    ctx.beginPath();
    ctx.arc(ax, ay, 4 + tension * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(70,50,40,0.7)';
    ctx.fill();
  }

  private drawCarryGhost(ctx: CanvasRenderingContext2D, sx: number, sy: number, hs: number, time: number, state?: SimState): void {
    const ghostY = sy - hs * 0.62 + Math.sin(time * 3) * hs * 0.04;
    const g = hs * 1.05;
    ctx.save();
    ctx.globalAlpha = this.vis * 0.72;
    const carrying = state?.hand.carrying ?? null;
    const tower = carrying != null ? state!.towers.get(carrying) : undefined;
    let sprite: HTMLCanvasElement | null = null;
    if (tower) sprite = getSprite('tower', tower.def, 96, 0, { tier: tower.tier });
    if (sprite) {
      ctx.drawImage(sprite, sx - g / 2, ghostY - g / 2, g, g);
    } else {
      // generic gripped block if we can't resolve the tower sprite
      rr(ctx, sx - g * 0.3, ghostY - g * 0.3, g * 0.6, g * 0.6, g * 0.1);
      ctx.fillStyle = 'rgba(184,192,200,0.9)';
      ctx.fill();
      ctx.lineWidth = Math.max(2, hs * 0.05);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = this.vis;
  }

  // ---- pass-throughs so renderer2d routes its egg/pick hooks to the friends layer ----
  maybeSpawnBalloon(chance?: number): void { this.props.maybeSpawnBalloon(chance); }
  get balloonActive(): boolean { return this.props.balloonActive; }
  pickBalloon(px: number, py: number, cam: Camera2D): boolean { return this.props.pickBalloon(px, py, cam); }
  spawnCampfire(at: { x: number; z: number }): void { this.props.spawnCampfire(at); }
  clearCampfire(): void { this.props.clearCampfire(); }
  get campfireActive(): boolean { return this.props.campfireActive; }
  drapeTowels(): void { this.props.drapeTowels(); }
  clearTowels(): void { this.props.clearTowels(); }
  swaySunflower(): void { this.props.swaySunflower(); }
  pickSunflower(px: number, py: number, cam: Camera2D): boolean { return this.props.pickSunflower(px, py, cam); }
}

/** Rounded-rect path (module-local; hand drawing is self-contained). */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Coarse-pointer / touch-capable device detection (mouse behavior is the safe default). */
function detectTouch(): boolean {
  try {
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return true;
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  } catch { /* non-DOM env */ }
  return false;
}
