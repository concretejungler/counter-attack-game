/**
 * Tiny color helpers for the Canvas 2D view. The palette source of truth is
 * `src/render/palette.ts` (0xRRGGBB numbers) — these turn those numbers into CSS
 * strings and do cheap lerp/lighten/darken so board/entities/fallback painters
 * can share one warm-domestic look. Pure functions; precompute strings outside
 * hot loops (they allocate a string each call).
 */

/** 0xRRGGBB -> "#rrggbb". */
export function hex(n: number): string {
  return '#' + (n & 0xffffff).toString(16).padStart(6, '0');
}

/** 0xRRGGBB + alpha -> "rgba(r,g,b,a)". */
export function rgba(n: number, a: number): string {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** Linear blend of two 0xRRGGBB colors, t in [0,1]. Returns a number. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Toward white by amt in [0,1]. */
export function lighten(n: number, amt: number): number {
  return mix(n, 0xffffff, amt);
}

/** Toward black by amt in [0,1]. */
export function darken(n: number, amt: number): number {
  return mix(n, 0x000000, amt);
}

/** Warm dark-cocoa outline used on every sprite/prop (the picture-book ink line). */
export const COCOA = 0x33211a;
export const COCOA_CSS = hex(COCOA);

/** Deterministic 32-bit hash of a string — for stable per-id color derivation. */
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** HSL -> 0xRRGGBB. h in [0,360), s/l in [0,1]. */
export function hsl(h: number, s: number, l: number): number {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
}
