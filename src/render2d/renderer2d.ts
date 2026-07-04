/**
 * Renderer2D — the Canvas 2D GameView (plan §3.1/§3.2).
 *
 * Ties the 2D view together: canvas + DPR management, the top-down camera, the
 * per-frame draw order, picking, and the extension-point wiring. Implements the
 * §3.1 GameView contract STRUCTURALLY (matching method names/shapes). It does NOT
 * import from src/render/** (P1-A owns that tree; exact signatures are reconciled
 * by P2-I) — the sole exception is `src/render/palette.ts`, imported read-only as
 * the color source of truth.
 *
 * Draw order (plan §2): background -> board (floor, platform islands sorted by
 * height, clutter, cake, entries/exits) -> path chevrons -> crumbs -> entity
 * shadows -> ground critters (by z) -> towers (by z) -> fliers (by z) ->
 * projectiles -> death poofs -> VFX -> hand cursor.
 *
 * The three painters barrels (painters/<kind>/index.ts) and the vfx/hand stubs are
 * imported ONCE here so later packets only add files inside their own folders.
 */

import type { LevelDef, ContentDB, SimState, TileRef, SimEvent, SurfaceDef } from '../sim/types';
import type { Grid } from '../sim/grid';
import { themePalette } from '../render/palette';
import { dprCap } from '../core/device';
import { hex } from './colors';
import { Camera2D, boardBox } from './camera2d';
import { BoardLayer } from './board';
import { EntityLayer } from './entities';
import { registerFallbackPainters } from './fallback';
import { clearSpriteCache } from './spriteCache';
import { Vfx2D } from './vfx2d';
import { Hand2D } from './hand2d';

// Import the extension-point barrels ONCE so their painters self-register. They are
// empty registries today (fallbacks cover everything); art packets fill them in.
import './painters/critters/index';
import './painters/towers/index';
import './painters/rooms/index';

/** The subset of a `Sim` the view reads (structural — avoids coupling to the Sim class). */
export interface SimView {
  readonly state: SimState;
  readonly grid: Grid;
}

/** Result of a surface pick: world point + the surface it belongs to + the tile it lands on. */
export interface PickPoint {
  surface: number;
  x: number;
  z: number;
  tile: TileRef | null;
}

const PICK_TOWER_PX = 44;
const PICK_CRITTER_PX = 30;

export class Renderer2D {
  readonly kind = '2d' as const;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = dprCap();

  private cam = new Camera2D();
  private board = new BoardLayer();
  private entities = new EntityLayer();
  private vfx = new Vfx2D();
  private hand = new Hand2D();

  private level: LevelDef | null = null;
  private content: ContentDB | null = null;
  private surfaces: SurfaceDef[] = [];
  private bgCss = '#20160f';

  private time = 0;
  private manualMoved = false;

  // path preview
  private pathPolylines: TileRef[][] = [];
  private pathsExternal = false;
  private lastPathVersion = -1;

  // last sim seen (picking uses the most recent frame's state/grid)
  private lastSim: SimView | null = null;

  // screen-shake juice
  private shakeT = 0;
  private shakeDur = 0.001;
  private shakeMag = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('render2d: 2D context unavailable');
    this.ctx = ctx;
  }

  // ---- lifecycle ---------------------------------------------------------
  loadLevel(level: LevelDef, content: ContentDB): void {
    this.level = level;
    this.content = content;
    this.surfaces = level.surfaces;
    this.bgCss = hex(themePalette(level.theme).bgColor);

    registerFallbackPainters(content);
    this.board.build(level, content);
    this.entities.build(content);
    this.entities.reset();
    this.cam.setBoard(boardBox(level.surfaces));
    this.vfx.reset();
    this.hand.reset();

    this.pathsExternal = false;
    this.pathPolylines = [];
    this.lastPathVersion = -1;
    this.manualMoved = false;

    this.resize();
    this.cam.fit();
  }

  resize(): void {
    const cssW = this.canvas.clientWidth || this.canvas.width || window.innerWidth;
    const cssH = this.canvas.clientHeight || this.canvas.height || window.innerHeight;
    this.dpr = dprCap();
    this.canvas.width = Math.max(1, Math.round(cssW * this.dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * this.dpr));
    this.cam.setViewport(cssW, cssH);
    this.board.resize(cssW, cssH);
    if (!this.manualMoved) this.cam.fit();
  }

  /**
   * Advance + draw one frame. `dtMs` is wall-clock ms since the last frame; `sim`
   * exposes {state, grid}. `alpha` (0..1 fixed-step remainder) is accepted for
   * future reconciliation, but motion is driven by exponential smoothing toward
   * the latest sim position (mirroring the 3D renderer), so it is currently unused.
   */
  frame(dtMs: number, sim: SimView, _alpha?: number, uiState?: unknown): void {
    if (!this.level || !this.content) return;
    const dt = Math.min(0.05, Math.max(0, dtMs / 1000));
    this.time += dt;
    this.lastSim = sim;
    const state = sim.state;
    const grid = sim.grid;

    // shake decay
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeT / this.shakeDur);
      this.cam.shakeWX = (Math.random() - 0.5) * m / this.cam.scale;
      this.cam.shakeWZ = (Math.random() - 0.5) * m / this.cam.scale;
    } else {
      this.cam.shakeWX = 0;
      this.cam.shakeWZ = 0;
    }

    // path preview refresh when the route changes
    if (!this.pathsExternal && grid.pathVersion !== this.lastPathVersion) {
      this.refreshPaths(grid);
      this.lastPathVersion = grid.pathVersion;
    }

    const ctx = this.ctx;
    // clear + backdrop (fills the fit margins so they aren't transparent)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.bgCss;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // static board (cached; re-rendered only on camera/board change) + blit
    this.board.sync(this.cam, state, grid);
    this.board.blit(ctx);

    // path chevrons (below entities)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.pathPolylines.length) this.board.drawPathChevrons(ctx, this.cam, this.pathPolylines, this.time);

    // dynamic entities (crumbs, shadows, critters, towers, fliers, projectiles, poofs)
    this.entities.frame(ctx, this.cam, state, dt);

    // VFX pass then hand cursor (stubs today)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.vfx.frame(ctx, this.cam, dt, this.time);
    this.vfx.vignette(ctx, this.cam.viewW, this.cam.viewH, state.scent);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hand.frame(ctx, this.cam, dt, this.time, state);
    void uiState;
  }

  dispose(): void {
    this.lastSim = null;
    this.level = null;
    this.content = null;
    clearSpriteCache();
  }

  // ---- picking -----------------------------------------------------------
  private ndcToScreen(ndcX: number, ndcY: number): { x: number; y: number } {
    return {
      x: (ndcX * 0.5 + 0.5) * this.cam.viewW,
      y: (1 - (ndcY * 0.5 + 0.5)) * this.cam.viewH,
    };
  }

  /** Topmost surface + world point + tile under an NDC pointer. */
  pickSurfacePoint(ndcX: number, ndcY: number): PickPoint {
    const p = this.ndcToScreen(ndcX, ndcY);
    const wx = this.cam.screenToWorldX(p.x);
    const wz = this.cam.screenToWorldZ(p.y);
    const grid = this.lastSim?.grid;
    let best = -1;
    let bestY = -Infinity;
    let bestTile: TileRef | null = null;
    if (grid) {
      for (let i = 0; i < this.surfaces.length; i++) {
        const tile = grid.tileOfWorld(i, wx, wz);
        if (tile && this.surfaces[i].origin.y > bestY) {
          best = i;
          bestY = this.surfaces[i].origin.y;
          bestTile = tile;
        }
      }
    }
    if (best < 0) {
      best = 0;
      bestTile = grid ? grid.tileOfWorld(0, wx, wz) : null;
    }
    return { surface: best, x: wx, z: wz, tile: bestTile };
  }

  /** Tile under an NDC pointer (clutter placement / inspection). */
  pickClutterTile(ndcX: number, ndcY: number): TileRef | null {
    return this.pickSurfacePoint(ndcX, ndcY).tile;
  }

  /** Nearest tower to an NDC pointer within a finger-sized screen radius. */
  pickTower(ndcX: number, ndcY: number): number | null {
    const state = this.lastSim?.state;
    if (!state) return null;
    const p = this.ndcToScreen(ndcX, ndcY);
    let best: number | null = null;
    let bd = PICK_TOWER_PX * PICK_TOWER_PX;
    for (const t of state.towers.values()) {
      const dx = this.cam.worldToScreenX(t.pos.x) - p.x;
      const dy = this.cam.worldToScreenY(t.pos.z) - p.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = t.id; }
    }
    return best;
  }

  /** Nearest critter to an NDC pointer within a finger-sized screen radius. */
  pickCritter(ndcX: number, ndcY: number): number | null {
    const state = this.lastSim?.state;
    if (!state) return null;
    const p = this.ndcToScreen(ndcX, ndcY);
    let best: number | null = null;
    let bd = PICK_CRITTER_PX * PICK_CRITTER_PX;
    for (const c of state.critters.values()) {
      if (c.hidden) continue;
      const dx = this.cam.worldToScreenX(c.pos.x) - p.x;
      const dy = this.cam.worldToScreenY(c.pos.z) - p.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c.id; }
    }
    return best;
  }

  /** Easter-egg props aren't in sim state yet — stubs for the egg/VFX packets (P3). */
  pickBalloon(_ndcX: number, _ndcY: number): number | null { return null; }
  pickSunflower(_ndcX: number, _ndcY: number): number | null { return null; }

  // ---- camera intents ----------------------------------------------------
  panBy(dxPx: number, dyPx: number): void {
    this.cam.panByScreen(dxPx, dyPx);
    this.noteCameraMovedManually();
  }
  zoomBy(factor: number): void {
    this.cam.zoomBy(factor);
    this.noteCameraMovedManually();
  }
  pinchZoom(factor: number, centerXpx?: number, centerYpx?: number): void {
    this.cam.zoomBy(factor, centerXpx, centerYpx);
    this.noteCameraMovedManually();
  }
  fitBoard(): void {
    this.cam.fit();
    this.manualMoved = false;
    this.board.markDirty();
  }
  noteCameraMovedManually(): void {
    this.manualMoved = true;
  }
  /** 2D "top-down" == the fit-whole-board framing (there is no perspective to toggle). */
  isTopDownActive(): boolean {
    return this.cam.isAtFit();
  }
  toggleTopDown(): void {
    if (this.cam.isAtFit()) {
      this.cam.zoomBy(1.8);
      this.manualMoved = true;
    } else {
      this.fitBoard();
    }
  }
  /** Demo/QA camera poses — fit the board for now; P2-I adapts specific demo scenes. */
  poseForDemo(_name?: string): void {
    this.fitBoard();
  }

  // ---- juice hooks -------------------------------------------------------
  shake(magnitudePx = 8, durationSec = 0.35): void {
    this.shakeMag = Math.max(this.shakeMag, magnitudePx);
    this.shakeDur = durationSec;
    this.shakeT = durationSec;
  }
  punch(magnitudePx = 5): void {
    this.shake(magnitudePx, 0.18);
  }
  bossIntro(): void {
    this.shake(12, 0.6);
  }

  // ---- world<->screen (UI anchoring, damage floaters) --------------------
  worldToScreen(x: number, _y: number, z: number): { x: number; y: number } {
    return { x: this.cam.worldToScreenX(x), y: this.cam.worldToScreenY(z) };
  }

  // ---- features ----------------------------------------------------------
  /**
   * Supply explicit path polylines (tile sequences). Passing a non-empty array
   * switches off the auto-trace; pass an empty array to hand control back to the
   * grid-driven preview.
   */
  setPathPolylines(polylines: TileRef[][]): void {
    if (polylines.length) {
      this.pathPolylines = polylines;
      this.pathsExternal = true;
    } else {
      this.pathsExternal = false;
      this.lastPathVersion = -1; // force a re-trace next frame
    }
  }

  /** Forward a tick's events to the VFX layer (and could drive precise poofs later). */
  handleEvents(events: SimEvent[]): void {
    this.vfx.handleEvents(events);
  }

  /** Explicit death poof at a world point (integrator can drive from `die` events). */
  spawnDeathPoof(x: number, z: number): void {
    this.entities.spawnDeathPoof(x, z);
  }

  /** PNG data URL of the current frame (photo mode). */
  snapPhoto(): string {
    return this.canvas.toDataURL('image/png');
  }

  // ---- internals ---------------------------------------------------------
  private refreshPaths(grid: Grid): void {
    this.pathPolylines.length = 0;
    if (!this.level) return;
    for (const sp of this.level.spawns) {
      const line = grid.pathTo(sp.tile);
      if (line.length > 1) this.pathPolylines.push(line);
    }
  }
}
