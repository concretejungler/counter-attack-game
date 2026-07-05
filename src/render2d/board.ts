/**
 * The static board layer (plan §2): floor, raised-surface platform "islands",
 * clutter blocks, the birthday cake (slices visually deplete), entries/exits
 * (door/vent/drain markers), and the on-board path-preview chevrons.
 *
 * Everything except the animated chevrons is rendered ONCE into an offscreen
 * canvas and re-rendered only when the camera moves or a cheap board signature
 * (clutter count, clutter hp, cake slices) changes. Each frame the renderer just
 * blits that canvas — this is the core perf move that keeps the hot loop for the
 * platforms/floor at a single drawImage.
 *
 * Coordinate math matches the sim's world space exactly: a surface's world
 * footprint is x in [origin.x, origin.x+cols], z in [origin.z, origin.z+rows]
 * (see grid.ts worldOf/tileOfWorld).
 */

import type { LevelDef, SimState, SurfaceDef, TileRef, Vec3, ContentDB } from '../sim/types';
import type { ThemePalette } from '../render/palette';
import { themePalette } from '../render/palette';
import { dprCap } from '../core/device';
import type { Camera2D } from './camera2d';
import { COCOA_CSS, hex, rgba, lighten, darken, mix } from './colors';
import { aoUnder } from './paint';
import { getRoomTreatment, type RoomTreatment, type RoomCtx } from './painters/rooms/index';

interface WorldRect { minX: number; minZ: number; maxX: number; maxZ: number; }

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export class BoardLayer {
  private level!: LevelDef;
  private content!: ContentDB;
  private pal!: ThemePalette;
  private surfaces: SurfaceDef[] = [];
  /** Per-theme room treatment (P3-R): re-skins the cached board layer. null = generic look. */
  private treatment: RoomTreatment | null = null;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = dprCap();
  private cssW = 1;
  private cssH = 1;

  private dirty = true;
  private lastScale = -1;
  private lastEyeX = NaN;
  private lastEyeZ = NaN;
  private lastSig = '';

  /** Latest walk-route polylines (world space), captured from drawPathChevrons so the cached layer can
   *  bake a subtle path-emphasis ground track from them. A new reference (route changed on a reroute)
   *  flips `dirty` so the next sync() re-bakes the track — zero per-frame cost while the route holds. */
  private pathPolylines: readonly (readonly Vec3[])[] = [];

  build(level: LevelDef, content: ContentDB): void {
    this.level = level;
    this.content = content;
    this.surfaces = level.surfaces;
    this.pal = themePalette(level.theme);
    this.treatment = getRoomTreatment(level.theme);
    this.pathPolylines = [];
    this.dirty = true;
    this.lastSig = '';
  }

  markDirty(): void {
    this.dirty = true;
  }

  resize(cssW: number, cssH: number): void {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    this.dpr = dprCap();
    if (!this.canvas) this.canvas = document.createElement('canvas');
    this.canvas.width = Math.ceil(this.cssW * this.dpr);
    this.canvas.height = Math.ceil(this.cssH * this.dpr);
    this.ctx = this.canvas.getContext('2d');
    this.dirty = true;
  }

  /** Center of a tile in world coordinates (mirrors sim/grid.ts worldOf — a pure function of the
   *  level surfaces, so the 2D board never needs the live sim `Grid`). */
  private worldOf(t: TileRef): Vec3 {
    const o = this.surfaces[t.s].origin;
    return { x: o.x + t.c + 0.5, y: o.y, z: o.z + t.r + 0.5 };
  }

  /** Re-render the static board into the offscreen canvas iff the camera moved or board changed. */
  sync(cam: Camera2D, state: SimState): void {
    const sig = `${state.clutter.size}:${state.cakeSlices}:${this.clutterHpSum(state)}`;
    const moved =
      cam.scale !== this.lastScale ||
      cam.eyeX !== this.lastEyeX ||
      cam.eyeZ !== this.lastEyeZ;
    if (!this.dirty && !moved && sig === this.lastSig) return;
    this.lastScale = cam.scale;
    this.lastEyeX = cam.eyeX;
    this.lastEyeZ = cam.eyeZ;
    this.lastSig = sig;
    this.dirty = false;
    this.redraw(cam, state);
  }

  /** Blit the cached board onto the visible context (identity transform: physical->physical). */
  blit(ctx: CanvasRenderingContext2D): void {
    if (this.canvas) ctx.drawImage(this.canvas, 0, 0);
  }

  private clutterHpSum(state: SimState): number {
    let s = 0;
    for (const c of state.clutter.values()) s += c.hp;
    return s;
  }

  private surfaceRect(s: SurfaceDef): WorldRect {
    return { minX: s.origin.x, minZ: s.origin.z, maxX: s.origin.x + s.cols, maxZ: s.origin.z + s.rows };
  }

  private redraw(cam: Camera2D, state: SimState): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // P3-R additive hook: a themed treatment re-skins floor/tint/decor/platforms/markers into this
    // same cached layer, all UNDER gameplay entities. `rc` is null (generic fallback) for any theme
    // without a registered treatment. Draw order: floor -> mood tint -> decor props -> platforms ->
    // spawn markers -> clutter -> cake (tint sits below decor light-pools so dark themes stay legible).
    const rc = (this.treatment && this.surfaces[0]) ? this.makeRoomCtx(ctx, cam, state) : null;

    this.drawFloor(ctx, cam, rc);
    if (rc && this.treatment?.tint) this.withFloorClip(ctx, cam, () => this.treatment!.tint!(rc));
    // path emphasis sits ON the mood tint (re-brightens the walk route so it stays legible in dark
    // rooms) but UNDER the decor props, so a rug/light-pool still layers over it naturally.
    this.drawPathTrack(ctx, cam);
    if (rc && this.treatment?.decor) this.withFloorClip(ctx, cam, () => this.treatment!.decor!(rc));
    this.drawPlatforms(ctx, cam, rc);
    this.drawSpawns(ctx, cam, rc);
    this.drawClutter(ctx, cam, state);
    this.drawCake(ctx, cam, state);
  }

  /** Screen-space rect (CSS px) of the floor island footprint + its corner radius. */
  private floorScreenRect(cam: Camera2D): { x: number; y: number; w: number; h: number; rad: number } | null {
    const floor = this.surfaces[0];
    if (!floor) return null;
    const r = this.surfaceRect(floor);
    const x = cam.worldToScreenX(r.minX);
    const y = cam.worldToScreenY(r.minZ);
    const w = (r.maxX - r.minX) * cam.scale;
    const h = (r.maxZ - r.minZ) * cam.scale;
    return { x, y, w, h, rad: Math.min(w, h) * 0.03 };
  }

  /** Run `fn` clipped to the floor island (so decor/tint never bleed into the transparent margin). */
  private withFloorClip(ctx: CanvasRenderingContext2D, cam: Camera2D, fn: () => void): void {
    const fr = this.floorScreenRect(cam);
    if (!fr) return;
    ctx.save();
    roundRectPath(ctx, fr.x, fr.y, fr.w, fr.h, fr.rad);
    ctx.clip();
    fn();
    ctx.restore();
  }

  /** Assemble the treatment context once per redraw (only called when a treatment + floor exist). */
  private makeRoomCtx(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): RoomCtx {
    const floor = this.surfaces[0];
    const fr = this.floorScreenRect(cam)!;
    return {
      ctx, cam, pal: this.pal, level: this.level, surfaces: this.surfaces, state,
      floor, floorRect: { x: fr.x, y: fr.y, w: fr.w, h: fr.h }, scale: cam.scale,
      roundRect: (a, b, c, d, e) => roundRectPath(ctx, a, b, c, d, e),
    };
  }

  // ---- floor -------------------------------------------------------------
  private drawFloor(ctx: CanvasRenderingContext2D, cam: Camera2D, rc: RoomCtx | null): void {
    const floor = this.surfaces[0];
    if (!floor) return;
    const r = this.surfaceRect(floor);
    const x = cam.worldToScreenX(r.minX);
    const y = cam.worldToScreenY(r.minZ);
    const w = (r.maxX - r.minX) * cam.scale;
    const h = (r.maxZ - r.minZ) * cam.scale;
    const rad = Math.min(w, h) * 0.03;

    ctx.save();
    roundRectPath(ctx, x, y, w, h, rad);
    ctx.fillStyle = hex(this.pal.floorTileB);
    ctx.fill();
    ctx.clip();

    if (rc && this.treatment?.floor) {
      // themed floor material (checker/plank/hex/brick/stone/concrete/carpet/grass...)
      this.treatment.floor(rc);
    } else {
      // generic checker tiles (only if the count is sane; else leave the flat fill)
      const cols = floor.cols, rows = floor.rows;
      if (cols * rows <= 600) {
        const a = hex(this.pal.floorTileA);
        const b = hex(this.pal.floorTileB);
        for (let c = 0; c < cols; c++) {
          for (let rr = 0; rr < rows; rr++) {
            if (((c + rr) & 1) === 0) continue;
            const tx = cam.worldToScreenX(floor.origin.x + c);
            const ty = cam.worldToScreenY(floor.origin.z + rr);
            ctx.fillStyle = ((c + rr) & 2) === 0 ? a : b;
            ctx.fillRect(tx, ty, cam.scale + 0.6, cam.scale + 0.6);
          }
        }
      }
    }
    // statically-blocked floor tiles (footprints under furniture / walls) read as shadowed insets
    if (floor.blocked) {
      ctx.fillStyle = rgba(darken(this.pal.floorTileB, 0.35), 0.5);
      for (const [c, rr] of floor.blocked) {
        const tx = cam.worldToScreenX(floor.origin.x + c);
        const ty = cam.worldToScreenY(floor.origin.z + rr);
        ctx.fillRect(tx, ty, cam.scale + 0.6, cam.scale + 0.6);
      }
    }

    // WALL-FOOT AO: two feathered multiply bands hugging the INSIDE of the floor edge (the clip keeps
    // only their inner halves) — the floor reads as meeting room walls, grounding the whole board.
    // Deepens edges only; the bright walk-route (path track) and interior stay readable on dark themes.
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(34,22,16,0.16)';
    ctx.lineWidth = Math.max(6, cam.scale * 0.7);
    roundRectPath(ctx, x, y, w, h, rad);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(34,22,16,0.12)';
    ctx.lineWidth = Math.max(3, cam.scale * 0.32);
    roundRectPath(ctx, x, y, w, h, rad);
    ctx.stroke();
    ctx.restore();

    // outer edge
    roundRectPath(ctx, x, y, w, h, rad);
    ctx.lineWidth = Math.max(2, cam.scale * 0.06);
    ctx.strokeStyle = rgba(darken(this.pal.floorTileB, 0.4), 0.6);
    ctx.stroke();
  }

  // ---- raised surfaces (platform islands) --------------------------------
  private drawPlatforms(ctx: CanvasRenderingContext2D, cam: Camera2D, rc: RoomCtx | null): void {
    const raised = this.surfaces
      .map((s, i) => ({ s, i }))
      .filter((e) => e.i > 0 || e.s.kind !== 'floor')
      .filter((e) => e.s.kind !== 'floor')
      .sort((a, b) => a.s.origin.y - b.s.origin.y);

    for (const { s, i } of raised) {
      const r = this.surfaceRect(s);
      const x = cam.worldToScreenX(r.minX);
      const y = cam.worldToScreenY(r.minZ);
      const w = (r.maxX - r.minX) * cam.scale;
      const h = (r.maxZ - r.minZ) * cam.scale;
      const rad = Math.min(w, h) * 0.14;
      // elevation-scaled shadow offset (higher surfaces float more)
      const lift = Math.min(10, 3 + s.origin.y * 1.4);

      // soft baked AO penumbra pooling at the island's base — grounds the raised surface with a
      // gentle spread the crisp offset drop shadow below can't give on its own.
      aoUnder(ctx, x + w / 2 + lift * 0.5, y + h + lift * 0.4, w * 0.6, h * 0.34 + lift, 0.24);

      // drop shadow (tighter contact edge, sits on top of the soft AO)
      roundRectPath(ctx, x + lift * 0.6, y + lift, w, h, rad);
      ctx.fillStyle = rgba(0x1a120c, 0.3);
      ctx.fill();

      // slab (treatment may re-tint the top per surface kind)
      const themed = rc && this.treatment?.surfaceColor ? this.treatment.surfaceColor(s, this.pal) : null;
      const surfCol = themed ?? this.surfaceColor(s);
      roundRectPath(ctx, x, y, w, h, rad);
      ctx.fillStyle = hex(surfCol);
      ctx.fill();
      ctx.lineWidth = Math.max(2, cam.scale * 0.07);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();

      // rim highlight on the top/left edges
      ctx.save();
      roundRectPath(ctx, x, y, w, h, rad);
      ctx.clip();
      ctx.lineWidth = Math.max(2, cam.scale * 0.09);
      ctx.strokeStyle = rgba(lighten(surfCol, 0.4), 0.85);
      ctx.beginPath();
      ctx.moveTo(x + rad, y + ctx.lineWidth * 0.5);
      ctx.lineTo(x + w - rad, y + ctx.lineWidth * 0.5);
      ctx.moveTo(x + ctx.lineWidth * 0.5, y + rad);
      ctx.lineTo(x + ctx.lineWidth * 0.5, y + h - rad);
      ctx.stroke();
      ctx.restore();

      // themed surface dressing (counter grain, table cloth, workbench, washer top...), clipped to slab
      if (rc && this.treatment?.platformTop) {
        ctx.save();
        roundRectPath(ctx, x, y, w, h, rad);
        ctx.clip();
        this.treatment.platformTop(rc, s, { x, y, w, h }, rad);
        ctx.restore();
      }

      // blocked cells (sink / stove / appliances) as darker metal insets
      if (s.blocked) {
        ctx.fillStyle = rgba(this.pal.metalDark, 0.7);
        for (const [c, rr] of s.blocked) {
          const tx = cam.worldToScreenX(s.origin.x + c) + 1;
          const ty = cam.worldToScreenY(s.origin.z + rr) + 1;
          roundRectPath(ctx, tx, ty, cam.scale - 2, cam.scale - 2, cam.scale * 0.15);
          ctx.fill();
        }
      }
      void i;
    }
  }

  private surfaceColor(s: SurfaceDef): number {
    switch (s.kind) {
      case 'counter': return lighten(this.pal.counterTop, 0.04);
      case 'table': return this.pal.wood;
      case 'shelf': return lighten(this.pal.wood, 0.1);
      case 'sink': return this.pal.metal;
      case 'stove': return this.pal.metalDark;
      default: return this.pal.counterTop;
    }
  }

  // ---- clutter blocks ----------------------------------------------------
  private drawClutter(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    for (const piece of state.clutter.values()) {
      const shape = this.content.shapes[piece.shape];
      const base = clutterColor(shape?.look ?? '', this.pal);
      const dark = darken(base, 0.28);
      const top = lighten(base, 0.18);
      const lift = Math.max(3, cam.scale * 0.14);

      // soft baked AO under the whole footprint (grounds the block; the per-cell rects below keep the
      // crisp contact edge). One soft pool over the piece's screen-space bounds.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const cell of piece.cells) {
        const x = cam.worldToScreenX(this.surfaces[cell.s].origin.x + cell.c);
        const y = cam.worldToScreenY(this.surfaces[cell.s].origin.z + cell.r);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + cam.scale > maxX) maxX = x + cam.scale;
        if (y + cam.scale > maxY) maxY = y + cam.scale;
      }
      aoUnder(ctx, (minX + maxX) / 2, (minY + maxY) / 2 + (maxY - minY) * 0.22 + lift * 0.5,
        (maxX - minX) * 0.6, (maxY - minY) * 0.5, 0.2);

      // shadow (union of cell rects, offset)
      ctx.fillStyle = rgba(0x1a120c, 0.28);
      for (const cell of piece.cells) {
        const x = cam.worldToScreenX(this.surfaces[cell.s].origin.x + cell.c) + lift * 0.5;
        const y = cam.worldToScreenY(this.surfaces[cell.s].origin.z + cell.r) + lift;
        roundRectPath(ctx, x, y, cam.scale, cam.scale, cam.scale * 0.16);
        ctx.fill();
      }
      // side bevel (darker, drawn slightly lower)
      ctx.fillStyle = hex(dark);
      for (const cell of piece.cells) {
        const x = cam.worldToScreenX(this.surfaces[cell.s].origin.x + cell.c);
        const y = cam.worldToScreenY(this.surfaces[cell.s].origin.z + cell.r) + lift * 0.4;
        roundRectPath(ctx, x, y, cam.scale, cam.scale, cam.scale * 0.16);
        ctx.fill();
      }
      // top face + outline per cell
      for (const cell of piece.cells) {
        const x = cam.worldToScreenX(this.surfaces[cell.s].origin.x + cell.c);
        const y = cam.worldToScreenY(this.surfaces[cell.s].origin.z + cell.r);
        roundRectPath(ctx, x + 1, y + 1, cam.scale - 2, cam.scale - 2, cam.scale * 0.16);
        ctx.fillStyle = hex(base);
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, cam.scale * 0.05);
        ctx.strokeStyle = COCOA_CSS;
        ctx.stroke();
        // top glint
        roundRectPath(ctx, x + cam.scale * 0.16, y + cam.scale * 0.12, cam.scale * 0.68, cam.scale * 0.22, cam.scale * 0.1);
        ctx.fillStyle = rgba(top, 0.7);
        ctx.fill();
      }
      // chew damage: crack overlay as hp drops
      const hpPct = piece.maxHp > 0 ? piece.hp / piece.maxHp : 1;
      if (hpPct < 0.66 && piece.cells.length) {
        const c0 = piece.cells[0];
        const cxs = cam.worldToScreenX(this.surfaces[c0.s].origin.x + c0.c + 0.5);
        const cys = cam.worldToScreenY(this.surfaces[c0.s].origin.z + c0.r + 0.5);
        ctx.strokeStyle = rgba(0x1a120c, 0.6);
        ctx.lineWidth = Math.max(1, cam.scale * 0.04);
        ctx.beginPath();
        ctx.moveTo(cxs - cam.scale * 0.2, cys - cam.scale * 0.25);
        ctx.lineTo(cxs, cys);
        ctx.lineTo(cxs - cam.scale * 0.12, cys + cam.scale * 0.18);
        ctx.moveTo(cxs, cys);
        ctx.lineTo(cxs + cam.scale * 0.22, cys + cam.scale * 0.08);
        ctx.stroke();
      }
    }
  }

  // ---- cake --------------------------------------------------------------
  private drawCake(ctx: CanvasRenderingContext2D, cam: Camera2D, state: SimState): void {
    const t = this.level.cakeTile;
    const w = this.worldOf(t);
    const cx = cam.worldToScreenX(w.x);
    const cy = cam.worldToScreenY(w.z);
    const R = cam.scale * 0.62;
    const max = Math.max(1, state.cakeMax);
    const left = Math.max(0, Math.min(max, state.cakeSlices));

    // plate
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * 1.35, R * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0xf3ece0, 0.95);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, cam.scale * 0.04);
    ctx.strokeStyle = rgba(0x9a8a72, 0.7);
    ctx.stroke();

    // slices as frosted wedges; eaten slices reveal the plate
    const step = (Math.PI * 2) / max;
    for (let i = 0; i < left; i++) {
      const a0 = -Math.PI / 2 + i * step;
      const a1 = a0 + step;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = hex(mix(0xf9b8c8, 0xf7d9a8, (i % 2) * 0.5)); // frosting/sponge alternation
      ctx.fill();
      ctx.lineWidth = Math.max(1, cam.scale * 0.03);
      ctx.strokeStyle = rgba(0xc8697e, 0.8);
      ctx.stroke();
    }
    // cake rim + outline of the remaining wedge block
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, cam.scale * 0.05);
    ctx.strokeStyle = COCOA_CSS;
    ctx.globalAlpha = left > 0 ? 0.9 : 0.25;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // cherry + candles when cake still has some slices
    if (left > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = hex(0xd8344f);
      ctx.fill();
      ctx.lineWidth = Math.max(1, cam.scale * 0.02);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
      const candles = Math.min(5, left);
      for (let i = 0; i < candles; i++) {
        const ang = -Math.PI / 2 + (i / candles) * Math.PI * 2;
        const px = cx + Math.cos(ang) * R * 0.55;
        const py = cy + Math.sin(ang) * R * 0.55;
        ctx.strokeStyle = hex(0x9fd8e8);
        ctx.lineWidth = Math.max(1.5, cam.scale * 0.05);
        ctx.beginPath();
        ctx.moveTo(px, py + cam.scale * 0.05);
        ctx.lineTo(px, py - cam.scale * 0.14);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(px, py - cam.scale * 0.18, cam.scale * 0.04, cam.scale * 0.07, 0, 0, Math.PI * 2);
        ctx.fillStyle = hex(0xffb347);
        ctx.fill();
      }
    }
  }

  // ---- entries / exits ---------------------------------------------------
  private drawSpawns(ctx: CanvasRenderingContext2D, cam: Camera2D, rc: RoomCtx | null): void {
    for (const sp of this.level.spawns) {
      const w = this.worldOf(sp.tile);
      const cx = cam.worldToScreenX(w.x);
      const cy = cam.worldToScreenY(w.z);
      const s = cam.scale;
      // themed marker first (shower drain, manhole, garage door...); fall back to the generic set
      const themed = !!(rc && this.treatment?.marker && this.treatment.marker(rc, sp, cx, cy, s));
      if (!themed) {
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.strokeStyle = COCOA_CSS;
      switch (sp.kind) {
        case 'door': {
          roundRectPath(ctx, cx - s * 0.34, cy - s * 0.44, s * 0.68, s * 0.88, s * 0.28);
          ctx.fillStyle = hex(0x8a5a36);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + s * 0.16, cy, s * 0.06, 0, Math.PI * 2);
          ctx.fillStyle = hex(0xffd97a);
          ctx.fill();
          break;
        }
        case 'window': {
          roundRectPath(ctx, cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, s * 0.08);
          ctx.fillStyle = rgba(this.pal.windowSky, 0.9);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy - s * 0.4); ctx.lineTo(cx, cy + s * 0.4);
          ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx + s * 0.4, cy);
          ctx.stroke();
          break;
        }
        case 'vent': {
          roundRectPath(ctx, cx - s * 0.4, cy - s * 0.3, s * 0.8, s * 0.6, s * 0.08);
          ctx.fillStyle = hex(this.pal.metal);
          ctx.fill();
          ctx.stroke();
          ctx.lineWidth = Math.max(1, s * 0.04);
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s * 0.3, cy + i * s * 0.11);
            ctx.lineTo(cx + s * 0.3, cy + i * s * 0.11);
            ctx.stroke();
          }
          break;
        }
        case 'drain': {
          ctx.beginPath();
          ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = hex(this.pal.metalDark);
          ctx.fill();
          ctx.stroke();
          for (const rr of [0.28, 0.16]) {
            ctx.beginPath();
            ctx.arc(cx, cy, s * rr, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
        case 'crack': {
          ctx.fillStyle = rgba(0x120c08, 0.85);
          ctx.beginPath();
          ctx.moveTo(cx - s * 0.35, cy - s * 0.3);
          ctx.lineTo(cx - s * 0.05, cy - s * 0.05);
          ctx.lineTo(cx - s * 0.15, cy + s * 0.05);
          ctx.lineTo(cx + s * 0.3, cy + s * 0.32);
          ctx.lineTo(cx + s * 0.02, cy + s * 0.02);
          ctx.lineTo(cx + s * 0.12, cy - s * 0.08);
          ctx.closePath();
          ctx.fill();
          break;
        }
        default: { // couch and any future kinds
          roundRectPath(ctx, cx - s * 0.44, cy - s * 0.28, s * 0.88, s * 0.56, s * 0.16);
          ctx.fillStyle = hex(this.pal.cabinet);
          ctx.fill();
          ctx.stroke();
        }
      }
      } // end generic-marker fallback

      // "in" arrow hint (drawn for every spawn, themed or generic)
      ctx.fillStyle = rgba(0x2e2620, 0.55);
      ctx.font = `700 ${Math.round(s * 0.24)}px "Comic Sans MS", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼', cx, cy + s * 0.62);
    }
  }

  // ---- path emphasis track (baked into the cached layer, under the live chevrons) ----
  /**
   * A subtle ground treatment beneath the walk route: a warm, slightly-lighter track centre with
   * soft AO-darkened edges, derived from the same polylines the chevrons use. Baked into the cached
   * board (zero per-frame cost) and clipped to the floor. Three feathered passes on ONE traced path:
   * a wide multiply band (the scuffed trough / darkened edges) then two narrowing warm cores (the
   * lit centre that keeps the route readable even on the dark themes).
   */
  private drawPathTrack(ctx: CanvasRenderingContext2D, cam: Camera2D): void {
    const lines = this.pathPolylines;
    if (!lines.length) return;
    const s = cam.scale;
    this.withFloorClip(ctx, cam, () => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // trace every route once; the three passes re-stroke the same path at different widths
      ctx.beginPath();
      for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
          const x = cam.worldToScreenX(line[i].x);
          const y = cam.worldToScreenY(line[i].z);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
      }
      // darkened soft edges (multiply, widest band)
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = 'rgba(46,30,22,0.14)';
      ctx.lineWidth = Math.max(4, s * 1.02);
      ctx.stroke();
      ctx.restore();
      // warm mid band
      ctx.strokeStyle = 'rgba(255,226,170,0.08)';
      ctx.lineWidth = Math.max(3, s * 0.62);
      ctx.stroke();
      // warm-light centre core (keeps the walk route the brightest ground in a dark room)
      ctx.strokeStyle = 'rgba(255,238,200,0.1)';
      ctx.lineWidth = Math.max(2, s * 0.32);
      ctx.stroke();
    });
  }

  // ---- path preview chevrons (dynamic; called each frame by the renderer) ----
  // `polylines` are WORLD-space point sequences (game.ts pushes them via setPathPolylines from the
  // sim's own flow field) — the 2D board no longer traces the grid itself.
  drawPathChevrons(ctx: CanvasRenderingContext2D, cam: Camera2D, polylines: readonly (readonly Vec3[])[], timeSec: number): void {
    // Capture the route so the cached layer can bake the path-emphasis ground track from it. game.ts
    // hands us a fresh array only when the flow field reroutes, so a reference change is the signal to
    // re-bake (dirty flips -> next sync() redraws). Static play never re-bakes.
    if (polylines !== this.pathPolylines) {
      this.pathPolylines = polylines;
      this.dirty = true;
    }
    if (!polylines.length) return;
    const s = cam.scale;
    // soft base line
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.strokeStyle = rgba(0xffe27a, 0.22);
    ctx.beginPath();
    for (const line of polylines) {
      for (let i = 0; i < line.length; i++) {
        const x = cam.worldToScreenX(line[i].x);
        const y = cam.worldToScreenY(line[i].z);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // scrolling chevrons pointing toward the cake
    const scroll = (timeSec * 1.5) % 1;
    ctx.strokeStyle = rgba(0xffcf5a, 0.8);
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath();
    for (const line of polylines) {
      for (let i = 0; i + 1 < line.length; i++) {
        const a = line[i];
        const b = line[i + 1];
        const ax = cam.worldToScreenX(a.x), ay = cam.worldToScreenY(a.z);
        const bx = cam.worldToScreenX(b.x), by = cam.worldToScreenY(b.z);
        const t = scroll;
        const mx = ax + (bx - ax) * t;
        const my = ay + (by - ay) * t;
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const wing = s * 0.16;
        // ">" shape opening backward from the direction of travel
        ctx.moveTo(mx - ux * wing - uy * wing, my - uy * wing + ux * wing);
        ctx.lineTo(mx, my);
        ctx.lineTo(mx - ux * wing + uy * wing, my - uy * wing - ux * wing);
      }
    }
    ctx.stroke();
  }
}

/** Clutter fill color from the shape's `look` hint + room palette. */
function clutterColor(look: string, pal: ThemePalette): number {
  if (look.includes('soap') || look.includes('sponge')) return lighten(pal.metal, 0.1);
  if (look.includes('wine') || look.includes('books')) return pal.wood;
  if (look.includes('tool') || look.includes('metal')) return pal.metal;
  if (look.includes('flower')) return mix(pal.wood, 0x6fa652, 0.4);
  if (look.includes('cereal') || look.includes('pasta')) return mix(pal.cabinet, 0xd8a44c, 0.4);
  return pal.cabinet;
}
