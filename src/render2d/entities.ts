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

import type { SimState, Critter, Tower, TowerDef, DamageType, ContentDB } from '../sim/types';
import { dprCap } from '../core/device';
import type { Camera2D, WorldBox } from './camera2d';
import { getSprite } from './spriteCache';
import { dmgTypeColor } from './fallback';
import { critterFallbackColor } from './fallback';
import { COCOA_CSS, hex, rgba } from './colors';

const SMOOTH = 16;          // exponential smoothing rate (dt*SMOOTH), matches the 3D renderer
const CRITTER_BOX = 64;
const BOSS_BOX = 128;
const TOWER_BOX = 96;

/**
 * ARACHNOPHOBIA MODE (§20.15/§23) — 2D equivalent of critterModels.ts's `setArachnophobiaMode`.
 * Every def id here has a spider silhouette; while the mode is on it is drawn as the 'googly-roomba'
 * sprite (registered by the painter layer) instead of its own sprite. Only the sprite *id* is
 * substituted — the critter keeps its own size/boss box (grandma-longlegs stays a 128 boss).
 * Mirrors the 3D list so future spider critters added there pick up the swap here for free.
 */
const SPIDER_SPRITE_IDS_2D = new Set<string>(['grandma-longlegs']);
let arachnophobiaMode2D = false;

/** Called from game.ts at boot and again on every level load (the two `setArachnophobiaMode` call
 *  sites). Like the 3D side it deliberately does NOT hot-swap already-drawn critters mid-level — the
 *  entity layer is reset() on loadLevel() so newly-spawned critters pick up the current flag, which
 *  matches the documented "takes effect next level load" contract. */
export function setArachnophobiaMode2D(on: boolean): void {
  arachnophobiaMode2D = on;
}
const MAX_PARTICLES = 220;
// Off-screen cull margin (screen px). Generous enough to keep a partly-visible boss (drawPx clamp
// 260 -> half 130) and a bobbing flier's altitude lift in-frame; over-inclusion just draws a sprite
// a hair past the edge, never a pop-in.
const CULL_MARGIN_PX = 170;

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
  // cached sprite canvas + the discriminants it was resolved for, so the hot loop skips getSprite()
  // (and its key-string allocation) on the ~85% of frames where none of these changed.
  spr: HTMLCanvasElement | null;
  sprFrame: number;
  sprShiny: boolean;
  sprBox: number;
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
  /** Sprites/marks stamped in the last frame() — surfaced by Renderer2D.drawCallCount() for QA. */
  private stamped = 0;

  // reusable draw scratch (no per-frame allocation)
  private _ground: CritterRS[] = [];
  private _fliers: CritterRS[] = [];
  private _towers: Tower[] = [];
  // reused visible-world-rect for off-screen culling (filled once per frame by the camera)
  private _view: WorldBox = { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
  // aura-field sprites: one cached radial disc + dashed rim per (dmgType, range-bucket). Painted once
  // (radial gradient baked in — never a per-frame gradient), stamped scaled + breathing per aura tower.
  private auraCache = new Map<string, HTMLCanvasElement>();
  // reused sprite-opts objects — getSprite() reads their fields synchronously (and only calls the
  // painter on a cache miss), so a single mutable object per kind is safe and avoids 300+ allocs/frame.
  private _critterOpts: { variant: string; shiny: boolean } = { variant: '', shiny: false };
  private _towerOpts: { variant: string; tier: number } = { variant: '', tier: 0 };

  build(content: ContentDB): void {
    this.content = content;
  }

  /** Count of entity sprites/marks drawn last frame (crumbs + critters + towers + projectiles). */
  drawCount(): number {
    return this.stamped;
  }

  reset(): void {
    this.critters.clear();
    for (const p of this.particles) p.active = false;
    this.auraCache.clear();
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
    this.stamped = 0;
    // visible world rect (+margin) computed once — the off-screen cull test for every entity pass.
    const view = cam.visibleWorldRect(CULL_MARGIN_PX, this._view);

    this.updateCritters(state, dt);
    this.drawCrumbs(ctx, cam, state);
    this.drawShadows(ctx, cam, state);
    this.drawAuras(ctx, cam, state);

    // partition + sort (reused arrays) — off-screen critters are dropped here so neither the sort
    // nor the draw/overlay work touches them.
    this._ground.length = 0;
    this._fliers.length = 0;
    for (const rs of this.critters.values()) {
      if (rs.x < view.minX || rs.x > view.maxX || rs.z < view.minZ || rs.z > view.maxZ) continue;
      if (rs.c.flying) this._fliers.push(rs);
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
          spr: null, sprFrame: -1, sprShiny: false, sprBox: 0,
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
    // reuse the cached canvas unless a discriminant changed (walk frame flips only every few frames)
    if (rs.spr === null || rs.sprFrame !== frame || rs.sprShiny !== c.shiny || rs.sprBox !== box) {
      this._critterOpts.variant = rs.boss ? 'boss' : '';
      this._critterOpts.shiny = c.shiny;
      // Arachnophobia swap: spider-silhouette defs render as the googly roomba (box/variant kept).
      const sprId = arachnophobiaMode2D && SPIDER_SPRITE_IDS_2D.has(rs.def) ? 'googly-roomba' : rs.def;
      rs.spr = getSprite('critter', sprId, box, frame, this._critterOpts);
      rs.sprFrame = frame;
      rs.sprShiny = c.shiny;
      rs.sprBox = box;
    }
    const sprite = rs.spr;
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
    this.stamped++;

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
    this._towerOpts.variant = t.branch ? 'ascend' : '';
    this._towerOpts.tier = t.tier;
    const sprite = getSprite('tower', t.def, TOWER_BOX, 0, this._towerOpts);
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
    this.stamped++;
    if (down) ctx.globalAlpha = 1;
    // morale sparkle
    if (t.moraleT > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * sy);
      this.orbitStars(ctx, drawPx * 0.4, drawPx, 3, 0xfff0a0);
    }
  }

  // ---- aura fields -------------------------------------------------------
  /**
   * Aura-kind towers (`def.attack === 'aura'`: Coldfather, DJ Decibel, Eau de NO, Old Stinky,
   * Stick Rick, Lux, Vroomba, Herr Tick-Tock, the firefly/queen-ant jars) emit no sim events, so
   * without this they showed zero field presence. Draw a subtle picture-book field: a faint radial
   * fill + dashed rim in the tower's damage-type color, breathing at ~0.5 Hz off the frame clock.
   * The disc is a cached sprite per (type,range) (never a per-frame gradient); breathing is pure
   * globalAlpha/scale modulation at stamp time. Drawn under critters/towers so it reads as a field
   * painted on the floor.
   */
  private drawAuras(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    const view = this._view;
    const dpr = this.dpr;
    for (const t of state.towers.values()) {
      if (t.carried) continue;                       // offline in the Hand — no field
      const def = this.content.towers[t.def];
      if (!def || def.attack !== 'aura') continue;
      const range = auraRange(def, t);
      // cull: skip if the whole field is off-screen (center +/- range outside the padded view)
      if (t.pos.x + range < view.minX || t.pos.x - range > view.maxX ||
          t.pos.z + range < view.minZ || t.pos.z - range > view.maxZ) continue;

      const sprite = this.getAuraSprite(def.dmgType, range);
      if (!sprite) continue;
      // ~0.5 Hz breathe (period 2s) with a per-tower phase offset so a cluster doesn't pulse in lockstep
      const breath = Math.sin(this.time * Math.PI + t.id * 1.7);
      const scaleB = 1 + breath * 0.02;
      const alphaB = 0.72 + 0.28 * (0.5 + 0.5 * breath);
      const down = t.downed || t.disabled > 0;
      const diaPx = range * 2 * cam.scale * scaleB;
      const half = diaPx / 2;
      const sx = cam.worldToScreenX(t.pos.x);
      const sy = cam.worldToScreenY(t.pos.z);
      ctx.globalAlpha = (down ? 0.4 : 1) * alphaB;
      ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * sy);
      ctx.drawImage(sprite, -half, -half, diaPx, diaPx);
    }
    ctx.globalAlpha = 1;
  }

  /** Cached aura disc for a (dmgType, range). Texture size scales with range so the baked dashed rim
   *  keeps a constant on-screen dash density and rim weight across every aura tower once stamped. */
  private getAuraSprite(dmgType: DamageType, range: number): HTMLCanvasElement | null {
    const bucket = Math.round(range * 10);
    const key = dmgType + '|' + bucket;
    const cached = this.auraCache.get(key);
    if (cached) return cached;

    const tex = Math.max(96, Math.min(400, Math.round(range * 100)));
    const cv = document.createElement('canvas');
    cv.width = tex;
    cv.height = tex;
    const c = cv.getContext('2d');
    if (!c) return null;
    const col = dmgTypeColor(dmgType);
    const cx = tex / 2;
    const rimR = (tex / 2) * 0.94;      // leave a hair of margin for the rim stroke
    c.lineJoin = 'round';

    // faint radial fill — strongest at the emitter, fading to nothing at the rim (baked once)
    const g = c.createRadialGradient(cx, cx, rimR * 0.08, cx, cx, rimR);
    g.addColorStop(0, rgba(col, 0.17));
    g.addColorStop(0.65, rgba(col, 0.09));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cx, rimR, 0, Math.PI * 2);
    c.fill();

    // soft solid inner halo just inside the rim, then the dashed range boundary
    c.strokeStyle = rgba(col, 0.28);
    c.lineWidth = tex * 0.02;
    c.beginPath();
    c.arc(cx, cx, rimR * 0.9, 0, Math.PI * 2);
    c.stroke();

    c.setLineDash([tex * 0.05, tex * 0.038]);
    c.strokeStyle = rgba(col, 0.75);
    c.lineWidth = tex * 0.016;
    c.beginPath();
    c.arc(cx, cx, rimR, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    this.auraCache.set(key, cv);
    return cv;
  }

  // ---- shadows -----------------------------------------------------------
  /**
   * Every blob shadow (critters + towers) accumulates into ONE path and lands in a SINGLE fill —
   * 300 fill() calls collapse to 1. Overlapping shadows now read as a soft union (nonzero winding)
   * instead of compounding into hard dark clumps where critters pile up, which is the intended
   * softer look for a swarm. Off-screen critters are culled before touching the path.
   */
  private drawShadows(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    const view = this._view;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = rgba(0x1a120c, 0.22);
    ctx.beginPath();
    for (const rs of this.critters.values()) {
      if (rs.x < view.minX || rs.x > view.maxX || rs.z < view.minZ || rs.z > view.maxZ) continue;
      const def = this.content.critters[rs.def];
      if (!def) continue;
      const footprint = rs.boss ? def.size * 1.9 + 0.7 : 0.72 + def.size * 1.5;
      const px = footprint * cam.scale * rs.scale;
      const sx = cam.worldToScreenX(rs.x);
      const sy = cam.worldToScreenY(rs.z) + px * 0.06;
      const flyShrink = rs.c.flying ? 0.6 : 1;
      const rx = px * 0.34 * flyShrink;
      const ry = px * 0.16 * flyShrink;
      ctx.moveTo(sx + rx, sy);            // start subpath at the ellipse's rightmost point (no join line)
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    }
    for (const t of state.towers.values()) {
      const px = (1.15 + t.tier * 0.08) * cam.scale;
      const sx = cam.worldToScreenX(t.pos.x);
      const sy = cam.worldToScreenY(t.pos.z) + px * 0.28;
      const rx = px * 0.34;
      const ry = px * 0.15;
      ctx.moveTo(sx + rx, sy);
      ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // ---- crumbs ------------------------------------------------------------
  private drawCrumbs(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    if (state.crumbEnts.size === 0) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
    const view = this._view;
    for (const cr of state.crumbEnts.values()) {
      if (cr.pos.x < view.minX || cr.pos.x > view.maxX || cr.pos.z < view.minZ || cr.pos.z > view.maxZ) continue;
      this.stamped++;
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
    const view = this._view;
    for (const p of state.projectiles) {
      if (p.pos.x < view.minX || p.pos.x > view.maxX || p.pos.z < view.minZ || p.pos.z > view.maxZ) continue;
      this.stamped++;
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

/** Effective aura range in tiles: tier range with the tower's branch `rangePct` applied (mirrors the
 *  sim's towerStats; Infestation runMods are omitted — this is a render-only field-presence ring). */
function auraRange(def: TowerDef, t: Tower): number {
  let r = def.tiers[t.tier - 1].range;
  if (t.branch) {
    const br = def.branches.find((b) => b.id === t.branch);
    const pct = br?.mod.rangePct;
    if (typeof pct === 'number') r *= 1 + pct;
  }
  return r;
}

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
