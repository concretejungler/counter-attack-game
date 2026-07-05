// The renderer seam. `game.ts` talks to the view layer ONLY through `GameView`; the concrete
// three.js `GameRenderer` (and, later, the Canvas-2D `Renderer2D` from packet P2-I) implement it.
// This module is types-only at runtime — every import here is `import type`, so a 2D renderer can
// `import type { GameView } from '../render/view'` without dragging three.js into its bundle.
//
// Derived from the ACTUAL call sites in game.ts (grep `this.renderer.*` / `rig.` / `hand.`), not
// from a wishlist: every method below is invoked by game.ts today, except the four lifecycle/util
// members explicitly mandated by the conversion plan §3.1 that game.ts does not yet call
// (`resize`, `dispose`, `fitBoard`, `worldToScreen`) — kept so the contract is complete for the
// renderer swap. Juice hooks (shake/punch/bossIntro) are deliberately NOT here: they are driven
// internally by each renderer off the events already handed to `syncTick`, never by game.ts.

import type { LevelDef, ContentDB, SimState, SimEvent, TileRef, Vec3 } from '../sim/types';
import type { HandPose } from './handView';

export type { HandPose };

/** Which view backend is live. `?renderer=` URL param selects it; default '3d' until P2-I lands. */
export type RendererKind = '2d' | '3d';

/** A surface pick result: which surface (0 = floor, higher = counters/shelves) + world x/z on it. */
export interface SurfacePick { surface: number; x: number; z: number }

/** A staged camera pose for demo/screenshot scenes. 3D reads all four fields; a 2D renderer honors
 *  `target` (centre) + `dist` (zoom) and ignores `yaw`/`pitch` (no orbit). */
export interface DemoPose { yaw: number; pitch: number; dist: number; target: Vec3 }

/** The view layer as game.ts sees it. Reads `sim.state`, never mutates it; input picks flow back
 *  through the `pick*` methods; camera control is expressed as renderer-agnostic INTENTS. */
export interface GameView {
  /** Discriminates the backend for any renderer-specific UI/tooling branch. */
  readonly kind: RendererKind;

  // ---------- lifecycle ----------
  loadLevel(level: LevelDef, content: ContentDB): void;
  /** Re-fit to the current viewport (3D drives this off window resize internally; here for parity). */
  resize(): void;
  /** Feed one sim tick: advance view bookkeeping + fire per-event VFX/juice. */
  syncTick(state: SimState, events: SimEvent[]): void;
  /** Refresh projectile instances straight from state (called once per update, off the tick loop). */
  syncProjectiles(state: SimState): void;
  /** Interpolate + draw one animation frame. `dt` is real seconds since the last frame. */
  frame(dt: number): void;
  /** Release GPU/DOM resources (used when swapping renderers). */
  dispose(): void;

  /** Fired for full-screen flash moments (cake bites, big hits); UI owns the DOM overlay. */
  onFlashPulse: ((strength: number) => void) | null;

  // ---------- settings / visual modes ----------
  setAccessibilitySettings(shakeIntensity: number, flashIntensity: number): void;
  setRetroMode(on: boolean): void;

  // ---------- picking (NDC in, world/id out) ----------
  pickSurfacePoint(ndcX: number, ndcY: number): SurfacePick | null;
  pickClutterTile(ndcX: number, ndcY: number): TileRef | null;
  pickCritter(ndcX: number, ndcY: number, state: SimState): number | null;
  pickTower(ndcX: number, ndcY: number, state: SimState): number | null;
  pickBalloon(ndcX: number, ndcY: number): boolean;
  pickSunflower(ndcX: number, ndcY: number): boolean;

  // ---------- placement ghosts ----------
  showGhost(cells: readonly Vec3[], valid: boolean): void;
  showRange(x: number, y: number, z: number, range: number): void;
  hideGhost(): void;

  // ---------- hand cursor ----------
  setHandPose(pose: HandPose): void;
  setHandTarget(x: number, y: number, z: number, surfaceY: number): void;
  handPress(): void;

  // ---------- enemy-path preview ----------
  setPathPolylines(paths: readonly (readonly Vec3[])[]): void;
  /** Addendum 2 §4: a SECOND, dashed alt-colour ghost ribbon = the hypothetical enemy route while a
   *  clutter block is being placed (grid.previewPathWith). Optional — only the 2D renderer draws it;
   *  pass [] to clear. */
  setGhostPathPolylines?(paths: readonly (readonly Vec3[])[]): void;

  // ---------- camera intents (agnostic; 3D orbits, 2D pans/zooms) ----------
  /** Drag-move the camera by a screen-space delta (3D: orbit; 2D: pan). */
  panBy(dx: number, dy: number): void;
  /** Wheel/step zoom by a signed delta (positive = out). */
  zoomBy(deltaY: number): void;
  /** Snapshot the current zoom as the pinch baseline; call once at pinch-gesture start. */
  beginPinch(): void;
  /** Pinch zoom relative to the `beginPinch()` baseline. `spanRatio` = current/start finger span. */
  pinchZoom(spanRatio: number): void;
  /** Fit the whole board into view at the default framing. */
  fitBoard(): void;
  /** Toggle the overhead "see everything" framing (2D: fit vs. zoomed). Returns the new active state. */
  toggleTopDown(): boolean;
  isTopDownActive(): boolean;
  /** A manual camera move invalidates the top-down snapshot; drop the active flag. */
  noteCameraMovedManually(): void;
  /** Photo Mode: relax orbit/zoom limits for free framing (2D: no-op). */
  setFreeOrbit(on: boolean): void;
  /** Stage a fixed camera pose for a demo/screenshot scene. */
  poseForDemo(pose: DemoPose): void;

  // ---------- world <-> screen ----------
  /** Project a world point to CSS-pixel screen coords, or null if off-screen/behind the camera. */
  worldToScreen(x: number, y: number, z: number): { x: number; y: number } | null;

  // ---------- photo mode ----------
  setPhotoFocusY(v: number): void;
  setPhotoBlurStrength(v: number): void;
  /** Render one synchronous frame and read it back as a PNG blob. */
  snapPhoto(): Promise<Blob | null>;

  // ---------- easter-egg decor (§20) ----------
  maybeSpawnBalloon(chance?: number): void;
  spawnCampfire(at: Vec3): void;
  clearCampfire(): void;
  readonly campfireActive: boolean;
  eggsSwaySunflower(): void;
  drapeTowelsOnTowers(): void;
  clearTowels(): void;

  // ---------- debug / QA ----------
  drawCallCount(): number;
}
