/**
 * Sprite painter registry + offscreen-canvas cache (plan §2/§3.2).
 *
 * Every critter/tower/prop is *painted by code* once into an offscreen canvas at
 * `dprCap()` resolution, cached, then stamped with `drawImage` in the hot loop.
 * Painters self-register by (kind,id); the renderer requests a cached canvas via
 * `getSprite(...)`. Status tints, hit-flash and squash are applied at STAMP time
 * (in entities.ts), NOT baked in — so the cache stays tiny (id x frame x tier x
 * variant), a handful of canvases per species.
 *
 * Locked painter signature (plan §3.2): draw centered in a `size`x`size` box,
 * transparent background, outlines included.
 */

import { dprCap } from '../core/device';

export type SpriteKind = 'critter' | 'tower' | 'prop' | 'room';

export interface PaintOpts {
  variant?: string;
  tier?: number;
  shiny?: boolean;
}

export type SpritePainter = (
  ctx: CanvasRenderingContext2D,
  size: number,
  frame: number,
  opts: PaintOpts,
) => void;

const painters = new Map<string, SpritePainter>();
const cache = new Map<string, HTMLCanvasElement>();

const pkey = (kind: SpriteKind, id: string) => kind + ':' + id;

/** Register a painter for a (kind,id). Later registrations win (real art overrides fallback). */
export function registerPainter(kind: SpriteKind, id: string, fn: SpritePainter): void {
  painters.set(pkey(kind, id), fn);
  // Invalidate any cached frames for this id (id may be re-registered with real art).
  for (const k of cache.keys()) {
    if (k.startsWith(kind + '|' + id + '|')) cache.delete(k);
  }
}

/** Sugar the extension-point barrels use (plan §3.2: `registerCritterPainter('worker-ant', fn)`). */
export const registerCritterPainter = (id: string, fn: SpritePainter) => registerPainter('critter', id, fn);
export const registerTowerPainter = (id: string, fn: SpritePainter) => registerPainter('tower', id, fn);
export const registerPropPainter = (id: string, fn: SpritePainter) => registerPainter('prop', id, fn);
export const registerRoomPainter = (id: string, fn: SpritePainter) => registerPainter('room', id, fn);

export function hasPainter(kind: SpriteKind, id: string): boolean {
  return painters.has(pkey(kind, id));
}

/**
 * Get a cached sprite canvas for (kind,id,variant,tier,shiny,frame) at logical
 * box `size`. The backing store is `size * dprCap()` physical px; the renderer
 * draws it at whatever on-board pixel size it wants (drawImage scales it).
 * Returns null only if no painter is registered (caller should have ensured a
 * fallback was registered in loadLevel).
 */
export function getSprite(
  kind: SpriteKind,
  id: string,
  size: number,
  frame: number,
  opts: PaintOpts,
): HTMLCanvasElement | null {
  const painter = painters.get(pkey(kind, id));
  if (!painter) return null;
  const variant = opts.variant ?? '';
  const tier = opts.tier ?? 0;
  const shiny = opts.shiny ? 1 : 0;
  const key = `${kind}|${id}|${variant}|${tier}|${shiny}|${frame}|${size}`;
  let cv = cache.get(key);
  if (cv) return cv;

  const dpr = dprCap();
  cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(size * dpr));
  cv.height = Math.max(1, Math.ceil(size * dpr));
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    painter(ctx, size, frame, opts);
  }
  cache.set(key, cv);
  return cv;
}

/** Drop every cached canvas (e.g. on dispose / device-pixel-ratio change). Painters stay registered. */
export function clearSpriteCache(): void {
  cache.clear();
}

/** Diagnostics: how many canvases are currently cached. */
export function spriteCacheSize(): number {
  return cache.size;
}
