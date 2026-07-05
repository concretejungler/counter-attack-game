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

// Painters and cache are nested by (kind -> id -> variant -> packedNum) so the per-frame `getSprite`
// hot path allocates NOTHING: no key-string is built, every lookup is a Map.get on a value that
// already exists (kind literal, id/variant strings owned by the caller, a packed integer). The old
// `${kind}|${id}|${variant}|${tier}|${shiny}|${frame}|${size}` template key allocated a string on
// every call (hundreds/frame). `packKey` folds (size,frame,shiny,tier) into one 32-bit int.
type VariantMap = Map<string, Map<number, HTMLCanvasElement>>;
const painters = new Map<SpriteKind, Map<string, SpritePainter>>();
const cache = new Map<SpriteKind, Map<string, VariantMap>>();

/** Pack the cheap discriminants into one int: size[0..4095] | frame<<12 | shiny<<14 | tier<<15. */
function packKey(size: number, frame: number, shiny: number, tier: number): number {
  return (size & 0xfff) | (frame << 12) | (shiny << 14) | (tier << 15);
}

function painterMap(kind: SpriteKind): Map<string, SpritePainter> {
  let m = painters.get(kind);
  if (!m) { m = new Map(); painters.set(kind, m); }
  return m;
}

/** Register a painter for a (kind,id). Later registrations win (real art overrides fallback). */
export function registerPainter(kind: SpriteKind, id: string, fn: SpritePainter): void {
  painterMap(kind).set(id, fn);
  // Invalidate any cached frames for this id (id may be re-registered with real art).
  cache.get(kind)?.delete(id);
}

/** Sugar the extension-point barrels use (plan §3.2: `registerCritterPainter('worker-ant', fn)`). */
export const registerCritterPainter = (id: string, fn: SpritePainter) => registerPainter('critter', id, fn);
export const registerTowerPainter = (id: string, fn: SpritePainter) => registerPainter('tower', id, fn);
export const registerPropPainter = (id: string, fn: SpritePainter) => registerPainter('prop', id, fn);
export const registerRoomPainter = (id: string, fn: SpritePainter) => registerPainter('room', id, fn);

export function hasPainter(kind: SpriteKind, id: string): boolean {
  return painters.get(kind)?.has(id) ?? false;
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
  const painter = painters.get(kind)?.get(id);
  if (!painter) return null;
  const variant = opts.variant ?? '';
  const tier = opts.tier ?? 0;
  const shiny = opts.shiny ? 1 : 0;
  const packed = packKey(size, frame, shiny, tier);

  let byId = cache.get(kind);
  if (!byId) { byId = new Map(); cache.set(kind, byId); }
  let byVariant = byId.get(id);
  if (!byVariant) { byVariant = new Map(); byId.set(id, byVariant); }
  let byPacked = byVariant.get(variant);
  if (!byPacked) { byPacked = new Map(); byVariant.set(variant, byPacked); }
  const existing = byPacked.get(packed);
  if (existing) return existing;

  const dpr = dprCap();
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(size * dpr));
  cv.height = Math.max(1, Math.ceil(size * dpr));
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    painter(ctx, size, frame, opts);
  }
  byPacked.set(packed, cv);
  return cv;
}

/** Drop every cached canvas (e.g. on dispose / device-pixel-ratio change). Painters stay registered. */
export function clearSpriteCache(): void {
  cache.clear();
}

/** Diagnostics: how many canvases are currently cached. */
export function spriteCacheSize(): number {
  let n = 0;
  for (const byId of cache.values())
    for (const byVariant of byId.values())
      for (const byPacked of byVariant.values()) n += byPacked.size;
  return n;
}
