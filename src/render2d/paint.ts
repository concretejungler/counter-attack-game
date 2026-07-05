/**
 * paint.ts — the shared shading/texture toolkit for the mobile-store art revamp
 * (plan: docs/superpowers/plans/2026-07-05-mobile-store-revamp.md §B — READ IT
 * before painting; painters/GUIDE.md holds the per-sprite recipes).
 *
 * THE ONE-LIGHT DOCTRINE. Every sprite in the game is lit from the UPPER-LEFT
 * by a warm key light with a cool ambient. All shadow shapes, highlights, rim
 * bands and hue shifts derive from that single direction — shared lighting is
 * what makes flat code-drawn sprites read as one art-directed set.
 *
 * Tone rules (locked by research — see plan §B1):
 *  - shadows are HUE-SHIFTED toward blue-violet, never merely darker;
 *  - highlights shift toward the warm key (yellow), slightly desaturated;
 *  - exterior silhouettes keep the chunky COCOA brand line; INTERIOR lines use
 *    that region's own fill darkened ~50% (innerInk), thinner;
 *  - one soft belly gradient per sprite max (the dominant round mass); hard
 *    cel shapes for everything else — gradients wash out below ~28px on-screen;
 *  - ≤6-8 texture marks per sprite, every mark ≥1.5 display px, light-aligned.
 *
 * Painters run once per cache key, so none of this is hot-path — favor
 * readability of the recipe over micro-optimization.
 */

import { hex, rgba, mix } from './colors';

/** Global light direction (normalized-ish, upper-left). Shadow side is +x,+y. */
export const LIGHT = { x: -0.6, y: -0.8 };

// ---------------------------------------------------------------------------
// color space
// ---------------------------------------------------------------------------

/** 0xRRGGBB -> [h (0-360), s (0-1), l (0-1)]. */
export function rgbToHsl(n: number): [number, number, number] {
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

/** h (deg), s/l (0-1) -> 0xRRGGBB. (Duplicated from colors.hsl with clamping.) */
export function hslToRgb(h: number, s: number, l: number): number {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
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

/** The 3-tone ramp every material derives from. */
export interface Ramp { shadow: number; base: number; light: number }

/**
 * ramp(base) — shadow rotates ~25° toward blue-violet (darker, a touch more
 * saturated); light rotates ~18° toward the warm key (lighter, softer). The
 * "never plain darker" rule lives here — use ramp().shadow, not darken().
 */
export function ramp(base: number): Ramp {
  const [h, s, l] = rgbToHsl(base);
  // Rotate toward 265° (blue-violet) by the short way, capped at 25°.
  const toViolet = h > 85 && h < 265 ? 25 : -25;
  const shadow = hslToRgb(h + toViolet, Math.min(1, s * 1.05 + 0.03), l * 0.62);
  const light = hslToRgb(h + (h > 60 && h < 240 ? -18 : 18), s * 0.85, Math.min(0.97, l * 1.18 + 0.06));
  return { shadow, base, light };
}

/** Interior detail line color: the region's own fill, ~50% darker + hue-shifted. */
export function innerInk(base: number): string {
  const [h, s, l] = rgbToHsl(base);
  const toViolet = h > 85 && h < 265 ? 18 : -18;
  return hex(hslToRgb(h + toViolet, Math.min(1, s * 1.02), l * 0.42));
}

// ---------------------------------------------------------------------------
// form & shading primitives
// ---------------------------------------------------------------------------

/**
 * celCrescent — the 2-tone cel shadow for an elliptical form. Call AFTER the
 * base fill + outline. Clips to the ellipse and lays the ramp shadow as an
 * offset lens on the away-from-light side, leaving a base sliver at the rim
 * (the "turning edge" — the pro cel-shading tell). alpha ~0.85 keeps the
 * shadow living in the same material family as the base.
 */
export function celCrescent(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number,
  shadowTone: number,
  k = 0.45,          // offset strength (fraction of radius)
  alpha = 0.8,
): void {
  ctx.save();
  ctx.beginPath();
  // Turning edge: the clip ellipse is ~94% of the form so a base sliver
  // survives between the shadow lens and the outline.
  ctx.ellipse(x, y, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(x - LIGHT.x * rx * k, y - LIGHT.y * ry * k, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(shadowTone, alpha);
  ctx.fill();
  ctx.restore();
}

/**
 * belly — ONE soft radial gradient for the sprite's dominant round mass:
 * light core offset ~30% toward the light, falling to the base at the rim.
 * Use at most once per sprite; hard cel for sub-forms.
 */
export function belly(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number,
  r3: Ramp,
  alpha = 0.9,
): void {
  const gx = x + LIGHT.x * rx * 0.3;
  const gy = y + LIGHT.y * ry * 0.3;
  const g = ctx.createRadialGradient(gx, gy, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry));
  g.addColorStop(0, rgba(r3.light, alpha));
  g.addColorStop(0.55, rgba(r3.base, alpha));
  g.addColorStop(1, rgba(r3.shadow, alpha * 0.9));
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

/**
 * rim — bright edge band on the toward-light rim (upper-left arc) of an
 * elliptical form. Elites/towers/bosses only; invisible under ~34px on-screen.
 */
export function rim(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number,
  lightTone: number,
  width: number,
  alpha = 0.7,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  // Upper-left arc: from ~150° to ~330° in canvas angle terms puts the band
  // toward LIGHT; inset slightly so the cocoa outline stays crisp outside it.
  ctx.ellipse(x, y, rx - width * 0.6, ry - width * 0.6, 0, Math.PI * 0.78, Math.PI * 1.62);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(lightTone, alpha);
  ctx.stroke();
  ctx.restore();
}

/** aoUnder — soft multiply ellipse; grounds a part against the one below it. */
export function aoUnder(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number,
  alpha = 0.22,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(30,16,40,${alpha})`); // cool violet-brown, not black
  g.addColorStop(1, 'rgba(30,16,40,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// material marks (≤6-8 per sprite; clip to the part before calling)
// ---------------------------------------------------------------------------

/** Deterministic jitter in [-1,1] — seeded, painters must stay Math.random-free. */
export function jit(seed: number, i: number): number {
  const t = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return (t - Math.floor(t)) * 2 - 1;
}

/** glossDot — the single ceramic/wet/glossy highlight: small hard dot + soft haze. */
export function glossDot(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  alpha = 0.85,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.72, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.9, y + r * 1.1, r * 0.45, r * 0.35, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
  ctx.fill();
}

/** specStreak — ONE bright diagonal bar across the upper third = "hard shiny". */
export function specStreak(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, len: number, w: number,
  alpha = 0.4,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(-LIGHT.x, LIGHT.y)); // perpendicular-ish to light
  const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,252,240,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-len / 2, -w / 2, len, w);
  ctx.restore();
}

/** woodGrain — 2-4 curved multiply strokes along the plank + one light streak. */
export function woodGrain(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tone: number, seed: number,
  n = 3,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = rgba(tone, 0.2);
  ctx.lineWidth = Math.max(1.5, h * 0.045);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const gy = y + h * ((i + 0.7) / (n + 0.8)) + jit(seed, i) * h * 0.05;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, gy);
    ctx.quadraticCurveTo(x + w * 0.5, gy + jit(seed, i + 9) * h * 0.08, x + w * 0.92, gy);
    ctx.stroke();
  }
  ctx.restore();
  // one light streak
  ctx.strokeStyle = 'rgba(255,248,225,0.28)';
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  const ly = y + h * 0.28;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, ly);
  ctx.quadraticCurveTo(x + w * 0.5, ly - h * 0.05, x + w * 0.8, ly);
  ctx.stroke();
}

/** rivets — 2-4 hard-material fastener dots (dark ring + light glint). */
export function rivets(
  ctx: CanvasRenderingContext2D,
  pts: readonly { x: number; y: number }[],
  r: number,
  inkCss: string,
): void {
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = inkCss;
    ctx.lineWidth = Math.max(1.2, r * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x + LIGHT.x * r * 0.35, p.y + LIGHT.y * r * 0.35, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,252,240,0.8)';
    ctx.fill();
  }
}

/** fabricTicks — 3-6 short perpendicular dashes along a hem/seam. */
export function fabricTicks(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  tone: number, n = 4, len = 4,
): void {
  const dx = x2 - x1, dy = y2 - y1;
  const dl = Math.hypot(dx, dy) || 1;
  const px = -dy / dl, py = dx / dl; // perpendicular
  ctx.strokeStyle = rgba(tone, 0.55);
  ctx.lineWidth = Math.max(1.4, len * 0.32);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const mx = x1 + dx * t, my = y1 + dy * t;
    ctx.beginPath();
    ctx.moveTo(mx - px * len * 0.5, my - py * len * 0.5);
    ctx.lineTo(mx + px * len * 0.5, my + py * len * 0.5);
    ctx.stroke();
  }
}

/**
 * furEdgePath — a scalloped ellipse Path (fur/fluff silhouettes). Fur lives in
 * the OUTLINE bumps, never as interior hatching (interior hatching = mud at
 * gameplay sizes). Use as: const p = furEdgePath(...); fill p; stroke p.
 */
export function furEdgePath(
  x: number, y: number, rx: number, ry: number,
  bumps: number, depth: number, seed: number,
): Path2D {
  const p = new Path2D();
  const steps = bumps * 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const scallop = Math.abs(Math.sin(a * bumps * 0.5));
    const wob = 1 + jit(seed, i >> 3) * 0.02;
    const r = 1 - depth + depth * scallop;
    const px = x + Math.cos(a) * rx * r * wob;
    const py = y + Math.sin(a) * ry * r * wob;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
  return p;
}

/** haloBehind — additive glow disc for bosses/specials (draw before the body). */
export function haloBehind(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  tone: number, alpha = 0.35,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, rgba(tone, alpha));
  g.addColorStop(1, rgba(tone, 0));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** Convenience: complementary accent of a base color (for the face/read-target pop). */
export function accentOf(base: number): number {
  const [h, s, l] = rgbToHsl(base);
  return hslToRgb(h + 180, Math.min(1, s * 1.1 + 0.15), Math.min(0.85, l * 1.05 + 0.08));
}

/** Convenience: mix helper re-export so painters can import everything from paint.ts. */
export { mix };
