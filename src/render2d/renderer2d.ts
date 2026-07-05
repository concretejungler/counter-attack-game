/**
 * Renderer2D — the Canvas 2D GameView (plan §3.1/§3.2), the DEFAULT renderer.
 *
 * Ties the 2D view together: canvas + DPR management, the top-down camera, the
 * per-frame draw order, picking, placement ghosts, and the extension-point wiring.
 * Implements the §3.1 `GameView` contract (compiler-enforced via `implements`), the
 * same seam the three.js `GameRenderer` satisfies — so `game.ts` talks to either
 * backend through one interface and `?renderer=3d` stays a working debug fallback.
 *
 * It does NOT import three.js and touches `src/render/**` only for read-only types
 * (`GameView`) and `palette.ts` (the color source of truth).
 *
 * Draw order (plan §2): background -> board (floor, platform islands sorted by
 * height, clutter, cake, entries/exits) -> path chevrons -> placement ghost/range
 * -> crumbs -> entity shadows -> ground critters (by z) -> towers (by z) -> fliers
 * (by z) -> projectiles -> death poofs -> VFX -> hand cursor -> (retro post).
 *
 * The three painters barrels (painters/<kind>/index.ts) and the vfx/hand stubs are
 * imported ONCE here so later packets only add files inside their own folders.
 */

import type {
  LevelDef, ContentDB, SimState, TileRef, SimEvent, SurfaceDef, Vec3,
} from '../sim/types';
import type { GameView, RendererKind, SurfacePick, DemoPose, HandPose } from '../render/view';
import { themePalette } from '../render/palette';
import { dprCap } from '../core/device';
import { hex } from './colors';
import { Camera2D, boardBox } from './camera2d';
import { BoardLayer } from './board';
import { EntityLayer } from './entities';
import { registerFallbackPainters } from './fallback';
import { clearSpriteCache } from './spriteCache';
import { Vfx2D } from './vfx2d';
import { Hand2D, type HandPose as Hand2DPose } from './hand2d';

// Import the extension-point barrels ONCE so their painters self-register. They are
// empty registries today (fallbacks cover everything); art packets fill them in.
import './painters/critters/index';
import './painters/towers/index';
import './painters/rooms/index';

const PICK_TOWER_PX = 44;
const PICK_CRITTER_PX = 30;

/** Local rounded-rect path (kept off the board/entities modules so the ghost overlay is self-contained). */
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

export class Renderer2D implements GameView {
  readonly kind: RendererKind = '2d';

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

  // enemy-path preview — world-space polylines pushed by game.ts (setPathPolylines). No auto-trace:
  // the 2D board no longer holds the sim Grid, so game.ts is the single source of the routes.
  private pathPolylines: readonly (readonly Vec3[])[] = [];

  // latest sim state (syncTick/syncProjectiles feed it; frame(dt) + picking read it).
  private lastState: SimState | null = null;

  // placement ghost + range circle (set by game.ts each frame during placement, drawn in frame()).
  private ghostCells: readonly Vec3[] | null = null;
  private ghostValid = true;
  private rangeCircle: { x: number; z: number; r: number } | null = null;

  // screen-shake juice
  private shakeT = 0;
  private shakeDur = 0.001;
  private shakeMag = 0;

  // accessibility (§23): 0..1 multipliers scaling shake + flash, matching the 3D renderer.
  private shakeMult = 1;
  private flashMult = 1;

  // pinch baseline zoom, snapshotted by beginPinch().
  private pinchBaseZoom = 1;

  // Konami retro post (§20.1) — pixelate the finished frame via a low-res offscreen blit.
  private retroOn = false;
  private retroBuf: HTMLCanvasElement | null = null;

  /** Render CPU spent in the last frame() (ms) — surfaced to tools/perf2d.mjs via a debug hook. */
  lastFrameMs = 0;

  /** Fired for full-screen flash moments (cake bites, big hits); UI owns the DOM overlay. */
  onFlashPulse: ((strength: number) => void) | null = null;

  // Self-driven viewport upkeep. The 3D renderer wires its own window listeners (renderer.ts);
  // the 2D renderer is the DEFAULT and game.ts never calls resize() for it, so we own that here —
  // this is what re-measures the HUD-bar insets and re-fits the board on resize/rotate.
  private readonly onWindowResize = (): void => this.resize();
  private readonly onOrientationChange = (): void => {
    this.resize();
    // iOS reports stale metrics right at the orientationchange edge; re-settle a beat later.
    setTimeout(() => this.resize(), 120);
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('render2d: 2D context unavailable');
    this.ctx = ctx;
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onWindowResize);
      window.addEventListener('orientationchange', this.onOrientationChange);
      window.visualViewport?.addEventListener('resize', this.onWindowResize);
    }
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

    this.pathPolylines = [];
    this.lastState = null;
    this.ghostCells = null;
    this.rangeCircle = null;
    this.manualMoved = false;
    this.shakeT = 0;
    this.shakeMag = 0;

    this.resize();
    this.cam.fit();
    // ui.showHud() mounts the HUD bars AFTER game.ts calls loadLevel(), so the measurement inside
    // resize() above sees no bars yet. Re-measure once they're laid out on the next frame(s).
    this.scheduleInsetRemeasure();
  }

  resize(): void {
    const cssW = this.canvas.clientWidth || this.canvas.width || window.innerWidth;
    const cssH = this.canvas.clientHeight || this.canvas.height || window.innerHeight;
    this.dpr = dprCap();
    this.canvas.width = Math.max(1, Math.round(cssW * this.dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * this.dpr));
    this.cam.setViewport(cssW, cssH);
    this.board.resize(cssW, cssH);
    this.measureViewInsets();
    if (!this.manualMoved) this.cam.fit();
  }

  /** Re-measure the HUD-bar insets on the next animation frame(s). The bars are appended just after
   *  loadLevel() returns; two rAFs let their (font-dependent) layout settle before we read it. */
  private scheduleInsetRemeasure(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => {
      this.resize();
      requestAnimationFrame(() => this.resize());
    });
  }

  /**
   * DOCUMENTED DOM READ (kept off the per-frame path — only load/resize/orientation): the Canvas
   * board must never sit under the always-visible HUD bars. We measure the real bars relative to
   * the canvas and hand their footprints to the camera as fit insets.
   *   top    = bottom edge of the `.hud-top` chip strip
   *   bottom = the persistent bottom bar: the `.dock` on mobile (the `.build-bar` there is a
   *            transient slide-up SHEET we deliberately never reserve for), else the desktop
   *            `.build-bar` strip. getBoundingClientRect() reflects the bar's real on-screen box
   *            including its scale(0.8) transform and safe-area padding.
   * Insets are clamped so they can never swallow more than ~40% of an edge (defensive).
   */
  private measureViewInsets(): void {
    if (typeof document === 'undefined') { this.cam.setViewInsets(0, 0, 0, 0); return; }
    const cRect = this.canvas.getBoundingClientRect();
    const ch = cRect.height || this.cam.viewH;
    let top = 0;
    let bottom = 0;

    const shown = (elm: Element | null): elm is HTMLElement =>
      !!elm && getComputedStyle(elm).display !== 'none' && (elm as HTMLElement).getBoundingClientRect().height > 0;

    const hudTop = document.querySelector('.hud-top');
    if (shown(hudTop)) {
      const r = hudTop.getBoundingClientRect();
      if (r.bottom > cRect.top) top = r.bottom - cRect.top;
    }

    const dock = document.querySelector('.dock');
    const bottomBar = shown(dock) ? dock : document.querySelector('.build-bar');
    if (shown(bottomBar)) {
      const r = bottomBar.getBoundingClientRect();
      // Only reserve the part that actually overlaps the canvas bottom (guards a sheet parked
      // off-screen via translateY, though the dock branch above already handles the mobile case).
      if (r.top < cRect.bottom && r.height > 0) bottom = cRect.bottom - r.top;
    }

    const cap = 0.4;
    this.cam.setViewInsets(
      Math.min(Math.max(0, top), ch * cap),
      Math.min(Math.max(0, bottom), ch * cap),
      0,
      0,
    );
  }

  /** Feed one sim tick: store state, forward events to the VFX layer, fire event-driven juice. */
  syncTick(state: SimState, events: SimEvent[]): void {
    this.lastState = state;
    this.vfx.handleEvents(events);
    if (events.length) this.applyEventJuice(events);
  }

  /** Projectiles are drawn straight from state each frame; just keep the latest reference. */
  syncProjectiles(state: SimState): void {
    this.lastState = state;
  }

  /** Interpolate + draw one animation frame. `dt` is real seconds since the last frame. */
  frame(dt: number): void {
    const t0 = performance.now();
    const state = this.lastState;
    if (!this.level || !this.content || !state) { this.lastFrameMs = 0; return; }
    const dtc = Math.min(0.05, Math.max(0, dt));
    this.time += dtc;

    // shake decay -> per-frame world-space camera jitter (Math.random is fine in the render layer)
    if (this.shakeT > 0) {
      this.shakeT -= dtc;
      const m = this.shakeMag * Math.max(0, this.shakeT / this.shakeDur);
      this.cam.shakeWX = ((Math.random() - 0.5) * m) / this.cam.scale;
      this.cam.shakeWZ = ((Math.random() - 0.5) * m) / this.cam.scale;
    } else {
      this.cam.shakeWX = 0;
      this.cam.shakeWZ = 0;
    }

    const ctx = this.ctx;
    // opaque backdrop fills the whole physical canvas (incl. the fit margins) — this doubles as the
    // frame clear, so no separate clearRect is needed (one fewer full-screen op per frame).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.bgCss;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // static board (cached; re-rendered only on camera/board change) + blit
    this.board.sync(this.cam, state);
    this.board.blit(ctx);

    // path chevrons (below entities)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.pathPolylines.length) this.board.drawPathChevrons(ctx, this.cam, this.pathPolylines, this.time);

    // placement ghost + range circle (on top of the board, below entities)
    if (this.ghostCells) this.drawGhost(ctx);
    if (this.rangeCircle) this.drawRange(ctx);

    // dynamic entities (crumbs, shadows, critters, towers, fliers, projectiles, poofs)
    this.entities.frame(ctx, this.cam, state, dtc);

    // VFX pass then hand cursor (stubs today — owned by P3-V / P3-H)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.vfx.frame(ctx, this.cam, dtc, this.time);
    this.vfx.vignette(ctx, this.cam.viewW, this.cam.viewH, state.scent);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hand.frame(ctx, this.cam, dtc, this.time, state);

    if (this.retroOn) this.applyRetro();
    this.lastFrameMs = performance.now() - t0;
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
      window.removeEventListener('orientationchange', this.onOrientationChange);
      window.visualViewport?.removeEventListener('resize', this.onWindowResize);
    }
    this.lastState = null;
    this.level = null;
    this.content = null;
    clearSpriteCache();
  }

  // ---- settings / visual modes -------------------------------------------
  setAccessibilitySettings(shakeIntensity: number, flashIntensity: number): void {
    this.shakeMult = shakeIntensity;
    this.flashMult = flashIntensity;
  }

  setRetroMode(on: boolean): void {
    this.retroOn = on;
  }

  // ---- picking -----------------------------------------------------------
  private ndcToScreen(ndcX: number, ndcY: number): { x: number; y: number } {
    return {
      x: (ndcX * 0.5 + 0.5) * this.cam.viewW,
      y: (1 - (ndcY * 0.5 + 0.5)) * this.cam.viewH,
    };
  }

  /** Local tileOfWorld (pure function of the surfaces — mirrors sim/grid.ts, no live Grid needed). */
  private tileOfWorld(s: number, wx: number, wz: number): TileRef | null {
    const surf = this.surfaces[s];
    if (!surf) return null;
    const c = Math.floor(wx - surf.origin.x);
    const r = Math.floor(wz - surf.origin.z);
    if (c < 0 || r < 0 || c >= surf.cols || r >= surf.rows) return null;
    return { s, c, r };
  }

  /** Topmost surface tile under a world point (highest origin.y whose footprint contains it). */
  private topTileAt(wx: number, wz: number): TileRef | null {
    let best: TileRef | null = null;
    let bestY = -Infinity;
    for (let i = 0; i < this.surfaces.length; i++) {
      const t = this.tileOfWorld(i, wx, wz);
      if (t && this.surfaces[i].origin.y > bestY) {
        best = t;
        bestY = this.surfaces[i].origin.y;
      }
    }
    return best;
  }

  /** Topmost surface + world point under an NDC pointer (game.ts resolves the tile itself). */
  pickSurfacePoint(ndcX: number, ndcY: number): SurfacePick | null {
    const p = this.ndcToScreen(ndcX, ndcY);
    const wx = this.cam.screenToWorldX(p.x);
    const wz = this.cam.screenToWorldZ(p.y);
    const t = this.topTileAt(wx, wz);
    if (!t) return null;
    return { surface: t.s, x: wx, z: wz };
  }

  /** Tile of the clutter block under the cursor (top-down: the tile itself, if occupied), else null. */
  pickClutterTile(ndcX: number, ndcY: number): TileRef | null {
    const state = this.lastState;
    if (!state) return null;
    const p = this.ndcToScreen(ndcX, ndcY);
    const wx = this.cam.screenToWorldX(p.x);
    const wz = this.cam.screenToWorldZ(p.y);
    const t = this.topTileAt(wx, wz);
    if (!t) return null;
    for (const piece of state.clutter.values()) {
      for (const cell of piece.cells) {
        if (cell.s === t.s && cell.c === t.c && cell.r === t.r) return t;
      }
    }
    return null;
  }

  /** Nearest tower to an NDC pointer within a finger-sized screen radius. */
  pickTower(ndcX: number, ndcY: number, state: SimState): number | null {
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

  /** Nearest (non-hidden) critter to an NDC pointer within a finger-sized screen radius. */
  pickCritter(ndcX: number, ndcY: number, state: SimState): number | null {
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

  /** Easter-egg props (P3-H) — hit-test against the drifting balloon / windowsill sunflower. */
  pickBalloon(ndcX: number, ndcY: number): boolean {
    const p = this.ndcToScreen(ndcX, ndcY);
    return this.hand.pickBalloon(p.x, p.y, this.cam);
  }
  pickSunflower(ndcX: number, ndcY: number): boolean {
    const p = this.ndcToScreen(ndcX, ndcY);
    return this.hand.pickSunflower(p.x, p.y, this.cam);
  }

  // ---- placement ghosts --------------------------------------------------
  showGhost(cells: readonly Vec3[], valid: boolean): void {
    this.ghostCells = cells;
    this.ghostValid = valid;
    // mirror the 3D renderer: (re)showing a ghost drops the stale range ring; the tower branch of
    // game.ts's updateGhost re-issues showRange right after, clutter placement leaves it hidden.
    this.rangeCircle = null;
  }

  showRange(x: number, _y: number, z: number, range: number): void {
    this.rangeCircle = { x, z, r: range };
  }

  hideGhost(): void {
    this.ghostCells = null;
    this.rangeCircle = null;
  }

  private drawGhost(ctx: CanvasRenderingContext2D): void {
    const cells = this.ghostCells;
    if (!cells) return;
    const cam = this.cam;
    const s = cam.scale;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.lineJoin = 'round';
    ctx.fillStyle = this.ghostValid ? 'rgba(110,232,122,0.32)' : 'rgba(232,80,80,0.34)';
    ctx.strokeStyle = this.ghostValid ? 'rgba(120,255,140,0.9)' : 'rgba(255,110,110,0.92)';
    ctx.lineWidth = Math.max(2, s * 0.06);
    for (const cell of cells) {
      // ghost cells arrive as tile CENTERS (game.ts uses grid.worldOf) — draw the unit tile square.
      const x = cam.worldToScreenX(cell.x - 0.5);
      const y = cam.worldToScreenY(cell.z - 0.5);
      roundRect(ctx, x + 1, y + 1, s - 2, s - 2, s * 0.14);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawRange(ctx: CanvasRenderingContext2D): void {
    const rc = this.rangeCircle;
    if (!rc) return;
    const cam = this.cam;
    const cx = cam.worldToScreenX(rc.x);
    const cy = cam.worldToScreenY(rc.z);
    const rad = rc.r * cam.scale;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.setLineDash([Math.max(4, cam.scale * 0.2), Math.max(3, cam.scale * 0.13)]);
    ctx.lineWidth = Math.max(1.5, cam.scale * 0.05);
    ctx.strokeStyle = 'rgba(255,226,122,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---- hand cursor (routed to the Hand2D hook API; visible hand arrives with P3-H) ----
  private mapHandPose(p: HandPose): Hand2DPose {
    switch (p) {
      case 'open': return 'carry';
      case 'fist': return 'press';
      case 'flick': return 'flick';
      case 'sweep': return 'sweep';
      case 'point': return 'point';
      default: return 'point';
    }
  }
  setHandPose(pose: HandPose): void {
    this.hand.setPose(this.mapHandPose(pose));
  }
  setHandTarget(x: number, _y: number, z: number, _surfaceY: number): void {
    this.hand.setWorldTarget(x, z);
  }
  handPress(): void {
    this.hand.press();
  }

  // ---- enemy-path preview ------------------------------------------------
  setPathPolylines(paths: readonly (readonly Vec3[])[]): void {
    this.pathPolylines = paths;
  }

  // ---- camera intents ----------------------------------------------------
  panBy(dxPx: number, dyPx: number): void {
    this.cam.panByScreen(dxPx, dyPx);
    this.noteCameraMovedManually();
  }
  /** Wheel/step zoom by a signed delta (positive = out). */
  zoomBy(deltaY: number): void {
    this.cam.zoomBy(Math.exp(-deltaY * 0.0015));
    this.noteCameraMovedManually();
  }
  /** Snapshot the current zoom as the pinch baseline; call once at pinch-gesture start. */
  beginPinch(): void {
    this.pinchBaseZoom = this.cam.zoom;
  }
  /** Pinch zoom relative to the beginPinch() baseline. `spanRatio` = current/start finger span. */
  pinchZoom(spanRatio: number): void {
    const target = this.pinchBaseZoom * (spanRatio || 1);
    this.cam.zoomBy(target / Math.max(1e-4, this.cam.zoom));
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
  toggleTopDown(): boolean {
    if (this.cam.isAtFit()) {
      this.cam.zoomBy(1.8);
      this.manualMoved = true;
      this.board.markDirty();
      return false;
    }
    this.fitBoard();
    return true;
  }
  /** 2D has no orbit — Photo Mode's free-orbit relaxation is a no-op. */
  setFreeOrbit(_on: boolean): void { /* no-op (2D) */ }

  /** Stage a fixed camera pose for a demo/screenshot scene. 2D ignores yaw/pitch; dist -> zoom,
   *  target -> centre. Produces a stable, repeatable framing for the screenshot harness. */
  poseForDemo(pose: DemoPose): void {
    this.manualMoved = true; // don't let a harness resize re-fit away from the staged framing
    this.cam.fit();
    this.cam.setZoom(Math.max(1, Math.min(2.5, 12 / Math.max(2, pose.dist))));
    this.cam.centerOn(pose.target.x, pose.target.z);
    this.board.markDirty();
  }

  // ---- juice hooks -------------------------------------------------------
  private shake(magnitudePx: number, durationSec: number): void {
    const m = magnitudePx * this.shakeMult;
    if (m <= 0.01) return;
    this.shakeMag = this.shakeT > 0 ? Math.max(this.shakeMag, m) : m;
    this.shakeDur = Math.max(0.001, durationSec);
    this.shakeT = this.shakeDur;
  }
  private punch(magnitudePx = 5): void {
    this.shake(magnitudePx, 0.18);
  }
  private bossIntro(): void {
    this.shake(12, 0.6);
  }
  private flashPulse(strength: number): void {
    const s = strength * this.flashMult;
    if (s <= 0.001) return;
    this.onFlashPulse?.(s);
  }

  /** Camera-shake / full-screen-flash / hand-press juice, fired on the same events the 3D renderer
   *  reacts to (see renderer.ts handleEvent). Pure VFX visuals are owned by the P3-V vfx2d layer. */
  private applyEventJuice(events: SimEvent[]): void {
    for (const ev of events) {
      switch (ev.t) {
        case 'cakeBite': this.shake(6, 0.25); this.flashPulse(0.35); break;
        case 'sliceStolen': this.shake(9, 0.3); this.flashPulse(0.5); break;
        case 'squash': this.handPress(); this.shake(6, 0.2); break;
        case 'towerGone': this.shake(11, 0.3); break;
        case 'petSwat': this.shake(5, 0.2); break;
        case 'petBark': this.shake(4, 0.15); break;
        case 'petPounce': this.shake(12, 0.35); break;
        case 'waveStart': this.punch(); break;
        case 'spawn':
          if (this.content?.critters[ev.def]?.boss) { this.bossIntro(); this.flashPulse(0.4); }
          break;
        case 'spellCast': {
          const s = ev.spell;
          if (s.includes('moooom') || s.includes('mom')) { this.shake(10, 0.5); this.flashPulse(0.6); }
          else if (s.includes('slipper')) { this.shake(8, 0.4); }
          break;
        }
        case 'lost': this.shake(18, 0.8); this.flashPulse(0.7); break;
        default: break;
      }
    }
  }

  // ---- world<->screen (UI anchoring, damage floaters) --------------------
  worldToScreen(x: number, _y: number, z: number): { x: number; y: number } | null {
    return { x: this.cam.worldToScreenX(x), y: this.cam.worldToScreenY(z) };
  }

  // ---- photo mode --------------------------------------------------------
  /** Tilt-shift is a 3D-only post effect; the 2D view has no depth to blur. */
  setPhotoFocusY(_v: number): void { /* no-op (2D) */ }
  setPhotoBlurStrength(_v: number): void { /* no-op (2D) */ }

  /** Render one synchronous frame and read it back as a PNG blob (Photo Mode snap). */
  snapPhoto(): Promise<Blob | null> {
    this.frame(0);
    return new Promise((resolve) => {
      if (typeof this.canvas.toBlob === 'function') this.canvas.toBlob((b) => resolve(b), 'image/png');
      else resolve(null);
    });
  }

  // ---- easter-egg decor (§20) — routed to the Hand2D "& friends" props layer (P3-H) ----
  maybeSpawnBalloon(chance?: number): void { this.hand.maybeSpawnBalloon(chance); }
  spawnCampfire(at: Vec3): void { this.hand.spawnCampfire({ x: at.x, z: at.z }); }
  clearCampfire(): void { this.hand.clearCampfire(); }
  get campfireActive(): boolean { return this.hand.campfireActive; }
  eggsSwaySunflower(): void { this.hand.swaySunflower(); }
  drapeTowelsOnTowers(): void { this.hand.drapeTowels(); }
  clearTowels(): void { this.hand.clearTowels(); }

  // ---- debug / QA --------------------------------------------------------
  drawCallCount(): number {
    return this.entities.drawCount();
  }

  // ---- retro post (§20.1) ------------------------------------------------
  /** Chunky-pixel Konami mode: downscale the finished frame into a ~170px-tall buffer, then blit it
   *  back nearest-neighbor. Cheap self-post; no extra render pass. */
  private applyRetro(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const f = Math.max(2, Math.round(h / 170));
    const lw = Math.max(1, Math.round(w / f));
    const lh = Math.max(1, Math.round(h / f));
    if (!this.retroBuf) this.retroBuf = document.createElement('canvas');
    if (this.retroBuf.width !== lw || this.retroBuf.height !== lh) {
      this.retroBuf.width = lw;
      this.retroBuf.height = lh;
    }
    const bctx = this.retroBuf.getContext('2d');
    if (!bctx) return;
    bctx.imageSmoothingEnabled = false;
    bctx.clearRect(0, 0, lw, lh);
    bctx.drawImage(this.canvas, 0, 0, lw, lh);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.retroBuf, 0, 0, lw, lh, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }
}
