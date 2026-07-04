/**
 * Dynamic entity stamping (plan §2): critters, towers, projectiles, crumbs, plus
 * pooled death-poof particles. Handles 30Hz->60fps interpolation, draw order,
 * status-effect treatments, the 2-frame walk bob, hit squash and spawn pop.
 *
 * Interpolation mirrors the 3D renderer's technique (src/render/renderer.ts:
 * `v.pos.lerp(v.target, min(1, dt*16))`) — a per-entity smoothed render position
 * eased toward the latest sim position each frame, rather than snapshot-alpha
 * interpolation. The `alpha` the renderer receives is accepted for future
 * reconciliation but this exponential smoothing is what actually drives motion,
 * exactly as the existing renderer does it.
 *
 * Hot-loop discipline (plan §2 perf budget): reused draw arrays (length=0 + push,
 * never a fresh array), a pooled particle list, cached sprites drawn with
 * `ctx.setTransform` (no save/restore stack) per entity, status overlays only for
 * the critters that actually have a status.
 */

import type { SimState, Critter, Tower, ContentDB } from '../sim/types';
import { dprCap } from '../core/device';
import type { Camera2D } from './camera2d';
import { getSprite } from './spriteCache';
import { dmgTypeColor } from './fallback';
import { critterFallbackColor } from './fallback';
import { COCOA_CSS, hex, rgba } from './colors';

const SMOOTH = 16;          // exponential smoothing rate (dt*SMOOTH), matches the 3D renderer
const CRITTER_BOX = 64;
const BOSS_BOX = 128;
const TOWER_BOX = 96;
const MAX_PARTICLES = 220;

interface CritterRS {
  id: number;
  def: string;
  c: Critter;              // live ref (read statuses/state/shiny/hidden at draw time)
  x: number;
  z: number;
  lastX: number;
  faceSign: 1 | -1;
  hp: number;
  flash: number;          // hit-flash / squash amount, decays
  scale: number;          // spawn pop 0->1
  bob: number;            // walk-bob phase accumulator
  tumble: number;         // fall/flung rotation
  boss: boolean;
  seen: boolean;
}

interface Particle {
  active: boolean;
  x: number;
  z: number;
  t: number;
  dur: number;
  kind: 0 | 1;            // 0 = dust ring, 1 = halo float-up
  color: number;
}

export class EntityLayer {
  private content!: ContentDB;
  private critters = new Map<number, CritterRS>();
  private particles: Particle[] = [];
  private time = 0;
  private dpr = dprCap();

  // reusable draw scratch (no per-frame allocation)
  private _ground: CritterRS[] = [];
  private _fliers: CritterRS[] = [];
  private _towers: Tower[] = [];

  build(content: ContentDB): void {
    this.content = content;
  }

  reset(): void {
    this.critters.clear();
    for (const p of this.particles) p.active = false;
    this.time = 0;
  }

  /** Explicit death poof hook (integrator can drive this from sim `die` events later). */
  spawnDeathPoof(x: number, z: number, color = 0xf2e2c4): void {
    this.emit(x, z, 0, color, 0.5);
    this.emit(x, z, 1, color, 0.7);
  }

  frame(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState, dt: number): void {
    this.dpr = dprCap();
    this.time += dt;
    this.updateCritters(state, dt);

    this.drawCrumbs(ctx, cam, state);
    this.drawShadows(ctx, cam, state);

    // partition + sort (reused arrays)
    this._ground.length = 0;
    this._fliers.length = 0;
    for (const rs of this.critters.values()) {
      if (rs.c.flying && rs.c.surface < 0) this._fliers.push(rs);
      else if (rs.c.flying) this._fliers.push(rs);
      else this._ground.push(rs);
    }
    this._ground.sort(byZ);
    this._fliers.sort(byZ);

    for (const rs of this._ground) this.drawCritter(ctx, cam, rs, false);

    // towers between ground critters and fliers
    this._towers.length = 0;
    for (const t of state.towers.values()) this._towers.push(t);
    this._towers.sort(byPosZ);
    for (const t of this._towers) this.drawTower(ctx, cam, t);

    for (const rs of this._fliers) this.drawCritter(ctx, cam, rs, true);

    this.drawProjectiles(ctx, cam, state);
    this.updateParticles(ctx, cam, dt);
  }

  // ---- interpolation / lifecycle ----------------------------------------
  private updateCritters(state: SimState, dt: number): void {
    const k = Math.min(1, dt * SMOOTH);
    for (const rs of this.critters.values()) rs.seen = false;

    for (const c of state.critters.values()) {
      let rs = this.critters.get(c.id);
      if (!rs) {
        const def = this.content.critters[c.def];
        rs = {
          id: c.id, def: c.def, c,
          x: c.pos.x, z: c.pos.z, lastX: c.pos.x, faceSign: 1,
          hp: c.hp, flash: 0, scale: 0.4, bob: 0, tumble: 0,
          boss: !!def?.boss || (def?.size ?? 0) >= 1, seen: true,
        };
        this.critters.set(c.id, rs);
      }
      rs.c = c;
      rs.seen = true;
      // smooth toward sim position
      rs.x += (c.pos.x - rs.x) * k;
      rs.z += (c.pos.z - rs.z) * k;
      // facing from horizontal travel
      const dx = rs.x - rs.lastX;
      if (Math.abs(dx) > 1e-4) rs.faceSign = dx < 0 ? -1 : 1;
      rs.lastX = rs.x;
      // hit flash + squash when hp dropped
      if (c.hp < rs.hp - 0.01) rs.flash = 1;
      rs.hp = c.hp;
      rs.flash = Math.max(0, rs.flash - dt * 4);
      rs.scale = Math.min(1, rs.scale + dt * 4);
      // walk-bob only while actually walking
      if (c.state === 'walk' || c.state === 'climb') rs.bob += dt * (5 + (this.content.critters[c.def]?.speed ?? 2));
      if (c.state === 'fall' || c.state === 'flung') rs.tumble += dt * 9; else rs.tumble = 0;
    }

    // reap vanished critters -> death poof at last position
    for (const rs of this.critters.values()) {
      if (rs.seen) continue;
      const col = critterFallbackColor(this.content.critters[rs.def]);
      this.spawnDeathPoof(rs.x, rs.z, col);
      this.critters.delete(rs.id);
    }
  }

  // ---- critters ----------------------------------------------------------
  private drawCritter(ctx: CanvasRenderingContext2D, cam: Camera2D, rs: CritterRS, flying: boolean): void {
    const def = this.content.critters[rs.def];
    if (!def) return;
    const c = rs.c;
    const box = rs.boss ? BOSS_BOX : CRITTER_BOX;
    const footprint = rs.boss ? def.size * 1.9 + 0.7 : 0.72 + def.size * 1.5;
    let drawPx = footprint * cam.scale * rs.scale;
    drawPx = Math.max(rs.boss ? 40 : 14, Math.min(260, drawPx));

    const frame = Math.floor(rs.bob) & 1;
    const sprite = getSprite('critter', rs.def, box, frame, { variant: rs.boss ? 'boss' : '', shiny: c.shiny });
    if (!sprite) return;

    const sx = cam.worldToScreenX(rs.x);
    const groundY = cam.worldToScreenY(rs.z);
    const alt = flying ? Math.max(8, drawPx * 0.35) + Math.sin(this.time * 3 + rs.id) * drawPx * 0.05 : 0;
    const bobY = (c.state === 'walk' ? Math.abs(Math.sin(rs.bob * Math.PI)) * drawPx * 0.04 : 0);
    const sy = groundY - alt - bobY;

    // squash: hit flash + play-dead flatten + status shrink
    let sxs = 1, sys = 1;
    if (rs.flash > 0) { sxs += rs.flash * 0.22; sys -= rs.flash * 0.2; }
    if (c.state === 'playDead') { sys *= 0.4; sxs *= 1.2; }
    if (c.statuses.shrunk) { sxs *= 0.6; sys *= 0.6; }
    const half = drawPx / 2;
    const dpr = this.dpr;

    const hidden = c.hidden === true;
    if (hidden) ctx.globalAlpha = 0.35;

    if (rs.tumble !== 0) {
      // airborne: full matrix with rotation
      const cos = Math.cos(rs.tumble), sin = Math.sin(rs.tumble);
      ctx.setTransform(dpr * cos * sxs, dpr * sin * sxs, -dpr * sin * sys, dpr * cos * sys, dpr * sx, dpr * sy);
    } else {
      ctx.setTransform(dpr * sxs * rs.faceSign, 0, 0, dpr * sys, dpr * sx, dpr * sy);
    }
    ctx.drawImage(sprite, -half, -half, drawPx, drawPx);

    if (hidden) ctx.globalAlpha = 1;

    // status overlays / flash — only when needed, in an unmirrored screen-space transform
    const needsOverlay = rs.flash > 0 || c.shiny || hasStatus(c);
    if (needsOverlay) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * sy);
      this.drawStatusOverlays(ctx, rs, drawPx);
    }
  }

  private drawStatusOverlays(ctx: CanvasRenderingContext2D, rs: CritterRS, drawPx: number): void {
    const c = rs.c;
    const r = drawPx * 0.4;
    const st = c.statuses;

    if (rs.flash > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${rs.flash * 0.6})`;
      ctx.fill();
    }
    // tints (translucent wash)
    if (st.soaked) tint(ctx, r, 'rgba(90,150,220,0.35)');
    if (st.buttered) tint(ctx, r, 'rgba(255,220,120,0.3)');
    if (st.stunned) tint(ctx, r, 'rgba(255,255,255,0.15)');

    // frozen: ice-cube overlay rect
    if (st.frozen) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = 'rgba(190,230,245,0.7)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1.5, drawPx * 0.03);
      ctx.beginPath();
      ctx.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // burnt: char specks
    if (st.burnt) {
      ctx.fillStyle = 'rgba(40,28,20,0.8)';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + this.time;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, drawPx * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // sticky: amber blobs
    if (st.sticky) {
      ctx.fillStyle = 'rgba(230,170,60,0.75)';
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.5;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7 + r * 0.4, drawPx * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // confused: orbiting stars
    if (st.confused) this.orbitStars(ctx, r, drawPx, 3, 0xffe27a);
    // feared: sweat drop
    if (st.feared) {
      ctx.fillStyle = 'rgba(150,200,240,0.9)';
      ctx.beginPath();
      ctx.ellipse(r * 0.8, -r * 0.6, drawPx * 0.05, drawPx * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // shiny: golden sparkles + warm rim
    if (c.shiny) {
      this.orbitStars(ctx, r * 1.1, drawPx, 4, 0xfff0a0);
      ctx.strokeStyle = 'rgba(255,225,120,0.7)';
      ctx.lineWidth = Math.max(1.5, drawPx * 0.03);
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2);
      ctx.stroke();
    }
    // grudge crown
    if (c.crowned) {
      ctx.fillStyle = 'rgba(255,215,90,0.95)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r);
      ctx.lineTo(-r * 0.4, -r * 1.35);
      ctx.lineTo(0, -r * 1.15);
      ctx.lineTo(r * 0.4, -r * 1.35);
      ctx.lineTo(r * 0.4, -r);
      ctx.closePath();
      ctx.fill();
    }
  }

  private orbitStars(ctx: CanvasRenderingContext2D, r: number, drawPx: number, n: number, color: number): void {
    ctx.fillStyle = hex(color);
    for (let i = 0; i < n; i++) {
      const a = this.time * 2 + (i / n) * Math.PI * 2;
      const px = Math.cos(a) * r * 1.1;
      const py = Math.sin(a) * r * 0.5 - r * 0.9;
      star(ctx, px, py, drawPx * 0.06);
    }
  }

  // ---- towers ------------------------------------------------------------
  private drawTower(ctx: CanvasRenderingContext2D, cam: Camera2D, t: Tower): void {
    const def = this.content.towers[t.def];
    if (!def) return;
    const variant = t.branch ? 'ascend' : '';
    const sprite = getSprite('tower', t.def, TOWER_BOX, 0, { variant, tier: t.tier });
    if (!sprite) return;
    const sx = cam.worldToScreenX(t.pos.x);
    const sy = cam.worldToScreenY(t.pos.z);
    const drawPx = Math.max(24, (1.15 + t.tier * 0.08) * cam.scale);
    const half = drawPx / 2;
    const dpr = this.dpr;
    const idleBob = Math.sin(this.time * 2 + t.id) * drawPx * 0.01;
    const down = t.downed || t.disabled > 0;
    if (down) ctx.globalAlpha = 0.55;
    ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * (sy + idleBob));
    ctx.drawImage(sprite, -half, -half, drawPx, drawPx);
    if (down) ctx.globalAlpha = 1;
    // morale sparkle
    if (t.moraleT > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * sy);
      this.orbitStars(ctx, drawPx * 0.4, drawPx, 3, 0xfff0a0);
    }
  }

  // ---- shadows -----------------------------------------------------------
  private drawShadows(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = rgba(0x1a120c, 0.22);
    for (const rs of this.critters.values()) {
      const def = this.content.critters[rs.def];
      if (!def) continue;
      const footprint = rs.boss ? def.size * 1.9 + 0.7 : 0.72 + def.size * 1.5;
      const px = footprint * cam.scale * rs.scale;
      const sx = cam.worldToScreenX(rs.x);
      const sy = cam.worldToScreenY(rs.z);
      const flyShrink = rs.c.flying ? 0.6 : 1;
      ctx.beginPath();
      ctx.ellipse(sx, sy + px * 0.06, px * 0.34 * flyShrink, px * 0.16 * flyShrink, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const t of state.towers.values()) {
      const px = (1.15 + t.tier * 0.08) * cam.scale;
      const sx = cam.worldToScreenX(t.pos.x);
      const sy = cam.worldToScreenY(t.pos.z);
      ctx.beginPath();
      ctx.ellipse(sx, sy + px * 0.28, px * 0.34, px * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- crumbs ------------------------------------------------------------
  private drawCrumbs(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    if (state.crumbEnts.size === 0) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
    for (const cr of state.crumbEnts.values()) {
      const sx = cam.worldToScreenX(cr.pos.x);
      const sy = cam.worldToScreenY(cr.pos.z);
      const r = Math.max(2.5, cam.scale * (0.09 + Math.min(0.14, cr.value / 400)));
      // glow
      ctx.beginPath();
      ctx.arc(sx, sy, r * (1.8 + pulse * 0.4), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,120,${0.12 + pulse * 0.08})`;
      ctx.fill();
      // crumb
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = hex(0xd8a44c);
      ctx.fill();
      ctx.lineWidth = Math.max(1, cam.scale * 0.02);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,245,210,0.9)';
      ctx.fill();
    }
  }

  // ---- projectiles -------------------------------------------------------
  private drawProjectiles(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    if (state.projectiles.length === 0) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const p of state.projectiles) {
      const sx = cam.worldToScreenX(p.pos.x);
      const sy = cam.worldToScreenY(p.pos.z);
      const col = dmgTypeColor(p.dmgType);
      const r = Math.max(2.5, cam.scale * 0.1);
      // short trail opposite velocity
      const vlen = Math.hypot(p.vel.x, p.vel.z) || 1;
      const tx = sx - (p.vel.x / vlen) * r * 2.2;
      const ty = sy - (p.vel.z / vlen) * r * 2.2;
      ctx.strokeStyle = rgba(col, 0.5);
      ctx.lineWidth = r * 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = hex(col);
      ctx.fill();
      ctx.lineWidth = Math.max(1, cam.scale * 0.02);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
    }
  }

  // ---- particles (pooled) ------------------------------------------------
  private emit(x: number, z: number, kind: 0 | 1, color: number, dur: number): void {
    const p = this.obtain();
    if (!p) return;
    p.active = true;
    p.x = x; p.z = z; p.t = 0; p.dur = dur; p.kind = kind; p.color = color;
  }

  private obtain(): Particle | null {
    for (const p of this.particles) if (!p.active) return p;
    if (this.particles.length >= MAX_PARTICLES) return null;
    const p: Particle = { active: false, x: 0, z: 0, t: 0, dur: 0, kind: 0, color: 0 };
    this.particles.push(p);
    return p;
  }

  private updateParticles(ctx: CanvasRenderingContext2D, cam: Camera2D, dt: number): void {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (const p of this.particles) {
      if (!p.active) continue;
      p.t += dt;
      if (p.t >= p.dur) { p.active = false; continue; }
      const f = p.t / p.dur;
      const sx = cam.worldToScreenX(p.x);
      const sy = cam.worldToScreenY(p.z);
      if (p.kind === 0) {
        // expanding dust ring
        const rad = cam.scale * (0.15 + f * 0.6);
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1.5, cam.scale * 0.08 * (1 - f));
        ctx.strokeStyle = rgba(p.color, (1 - f) * 0.7);
        ctx.stroke();
      } else {
        // halo float-up
        const rise = f * cam.scale * 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy - rise, cam.scale * 0.12 * (1 - f * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = rgba(0xffffff, (1 - f) * 0.5);
        ctx.fill();
      }
    }
  }
}

// ---- helpers --------------------------------------------------------------
function byZ(a: CritterRS, b: CritterRS): number { return a.z - b.z; }
function byPosZ(a: Tower, b: Tower): number { return a.pos.z - b.pos.z; }

function hasStatus(c: Critter): boolean {
  const s = c.statuses;
  return !!(s.soaked || s.burnt || s.frozen || s.sticky || s.stunned || s.confused || s.feared || s.buttered || s.shrunk) || !!c.crowned;
}

function tint(ctx: CanvasRenderingContext2D, r: number, style: string): void {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.3, y - r * 0.3);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.3, y + r * 0.3);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.3, y + r * 0.3);
  ctx.lineTo(x - r, y);
  ctx.lineTo(x - r * 0.3, y - r * 0.3);
  ctx.closePath();
  ctx.fill();
}
