/**
 * ROOM TREATMENT registry + shared context type (P3-R).
 *
 * A `RoomTreatment` re-skins the CACHED static board layer (board.ts) per
 * `LevelDef.theme` so each world reads as a real PLACE in 2D — floor material,
 * platform-surface dressing, themed spawn markers, a day/night mood tint, and a
 * couple of charming non-gameplay props. board.ts looks a treatment up once in
 * build() and delegates to it from its (cached) redraw, falling back to the
 * generic palette-driven look when a theme has no registered treatment.
 *
 * This lives in its OWN module (not the barrel) so theme files — which call
 * `registerRoom(...)` at import time — never hit a circular-import TDZ on the
 * registry map. index.ts imports the theme files for their side effects and
 * re-exports the public bindings below.
 *
 * Drawing law (all methods draw into the cached board canvas, UNDER gameplay
 * entities): keep contrast LOW. Critters, towers and path chevrons are stamped
 * live on top at full brightness — dressing must never fight their legibility.
 * On the dark themes (bedroom "Lights Out", basement, sewer) heed the BUILDLOG
 * lesson "dark albedo + dim light = invisible game": lift the floor albedo and
 * let decor light-pools punch brightness back into the play area, rather than
 * relying on a heavy darkening wash.
 */

import type { LevelDef, SurfaceDef, SpawnDef, SimState, RoomTheme } from '../../../sim/types';
import type { ThemePalette } from '../../../render/palette';
import type { Camera2D } from '../../camera2d';

/** Screen-space rectangle (CSS px). */
export interface ScreenRect { x: number; y: number; w: number; h: number; }

/** Everything a treatment needs, assembled once per board redraw by board.ts. */
export interface RoomCtx {
  ctx: CanvasRenderingContext2D;
  cam: Camera2D;
  pal: ThemePalette;
  level: LevelDef;
  surfaces: SurfaceDef[];
  state: SimState;
  /** surfaces[0] — the walkable floor. */
  floor: SurfaceDef;
  /** Screen rect of the floor footprint (CSS px). */
  floorRect: ScreenRect;
  /** px per world unit (cam.scale). */
  scale: number;
  /** The exact rounded-rect path helper board.ts uses (keeps slab/floor radii identical). */
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
}

export interface RoomTreatment {
  /** Fill + pattern the floor interior. Called with the floor rounded-rect ALREADY clipped, over a
   *  flat `pal.floorTileB` base — must cover the whole floorRect. Omit for the generic checker. */
  floor?(rc: RoomCtx): void;
  /** Day/night mood tint (+ optional vignette), clipped to the floor rounded-rect, drawn between the
   *  floor and the decor so decor light-pools sit ON TOP and keep the play area bright. Keep dark
   *  themes legible — the floor beneath must stay bright enough for sprites to read against. */
  tint?(rc: RoomCtx): void;
  /** 2-3 charming non-gameplay props (+ light-pools), clipped to the floor rounded-rect, drawn under
   *  the platform islands / clutter / cake / entities. Flat slabs with outlines, no text. */
  decor?(rc: RoomCtx): void;
  /** Override a raised surface's top-slab fill color (keyed off surf.kind). Return null to defer to
   *  board's generic surfaceColor(). */
  surfaceColor?(surf: SurfaceDef, pal: ThemePalette): number | null;
  /** Dressing painted on a platform slab (counter grain, table cloth, washer top...), clipped to the
   *  slab rounded-rect. Keyed off surf.kind / size, never hardcoded per level. */
  platformTop?(rc: RoomCtx, surf: SurfaceDef, rect: ScreenRect, radius: number): void;
  /** Themed spawn marker (shower drain, manhole, garage door...). Return true if drawn; false to fall
   *  back to board's generic marker. The "▼ in" hint is always drawn by board afterward. */
  marker?(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean;
}

const REGISTRY = new Map<RoomTheme, RoomTreatment>();

/** Register a treatment for one theme (a treatment object may be shared across themes). */
export function registerRoom(theme: RoomTheme, treatment: RoomTreatment): void {
  REGISTRY.set(theme, treatment);
}

/** Look up the treatment for a theme, or null (board falls back to the generic look). */
export function getRoomTreatment(theme: RoomTheme | string): RoomTreatment | null {
  return REGISTRY.get(theme as RoomTheme) ?? null;
}
