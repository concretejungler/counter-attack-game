/**
 * Stateless canvas primitives for the 2D VFX layer (OWNED BY: P3-V).
 *
 * Every function draws in the CURRENT transform (the renderer hands vfx2d the dpr
 * base transform, coords are CSS px). Picture-book house style: chunky cocoa
 * outlines, flat bright fills, soft translucency. No allocations, no state — the
 * caller owns pooling. Colors arrive as 0xRRGGBB numbers.
 */

import { hex, rgba, COCOA_CSS } from '../colors';

/** Deterministic [0,1) from an integer seed — stable jitter across an effect's life. */
export function srand(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Five-pointed impact star, filled + optional outline. Centered at (cx,cy). */
export function star5(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot: number, fill: string, outline?: string): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.44;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

/** Four-point sparkle (lens glint / shiny twinkle). */
export function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.18;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/** Blobby cloud puff (gas/dust) — a few overlapping circles from a stable seed. */
export function puff(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, seed: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = srand(seed + i) * Math.PI * 2;
    const d = r * 0.42 * srand(seed + i * 3 + 1);
    const rr = r * (0.55 + srand(seed + i * 7) * 0.4);
    ctx.moveTo(cx + Math.cos(a) * d + rr, cy + Math.sin(a) * d);
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** Jagged lightning polyline between two points (chain zap / static crackle). */
export function jagged(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  segs: number, jitter: number, seed: number, width: number, color: string, glow: string,
): void {
  const dx = x1 - x0, dy = y1 - y0;
  const nx = -dy, ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const build = (): void => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const off = (srand(seed + i * 13) - 0.5) * jitter;
      ctx.lineTo(x0 + dx * t + (nx / len) * off, y0 + dy * t + (ny / len) * off);
    }
    ctx.lineTo(x1, y1);
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  build();
  ctx.strokeStyle = glow;
  ctx.lineWidth = width * 2.4;
  ctx.stroke();
  build();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Filled cone/spray wedge from an apex, aimed along `ang`, half-width `half`. */
export function coneWedge(
  ctx: CanvasRenderingContext2D, ax: number, ay: number, ang: number, half: number, radius: number, color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.arc(ax, ay, radius, ang - half, ang + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Radiating translucent god-ray wedges (MOOOOM / boss). */
export function godRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, count: number, len: number, rot: number, color: string): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rot + (i / count) * Math.PI * 2;
    const w = 0.13;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len);
    ctx.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
}

/** Cuckoo-clock face + sweeping hand (Five-Second Rule). */
export function clockFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, handAng: number, alpha: number): void {
  ctx.strokeStyle = rgba(0xcfe8ff, alpha);
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgba(0xffffff, alpha * 0.9);
  ctx.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
    ctx.lineTo(cx + Math.cos(a) * r * 0.96, cy + Math.sin(a) * r * 0.96);
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(0xffffff, alpha);
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(handAng) * r * 0.7, cy + Math.sin(handAng) * r * 0.7);
  ctx.stroke();
}

/**
 * Giant slipper silhouette, top-down, centered at origin; caller sets transform.
 * `w` = sole length in px (points "down" = +y, i.e. down the lane).
 */
export function slipper(ctx: CanvasRenderingContext2D, w: number): void {
  const halfW = w * 0.28;
  const halfL = w * 0.5;
  // soft ground shadow
  ctx.fillStyle = 'rgba(20,14,10,0.28)';
  ctx.beginPath();
  ctx.ellipse(halfW * 0.35, halfL * 0.16, halfW * 1.25, halfL * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  // sole (foot-shaped: wider at toe = +y)
  ctx.beginPath();
  ctx.ellipse(0, halfL * 0.28, halfW * 1.02, halfL * 0.78, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(0xd84a6a);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -halfL * 0.42, halfW * 0.82, halfL * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(0xd84a6a);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, w * 0.03);
  ctx.strokeStyle = COCOA_CSS;
  ctx.beginPath();
  ctx.ellipse(0, halfL * 0.28, halfW * 1.02, halfL * 0.78, 0, 0, Math.PI * 2);
  ctx.stroke();
  // toe-strap (V)
  ctx.strokeStyle = hex(0xb83a55);
  ctx.lineWidth = Math.max(4, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, halfL * 0.05);
  ctx.lineTo(-halfW * 0.7, halfL * 0.62);
  ctx.moveTo(0, halfL * 0.05);
  ctx.lineTo(halfW * 0.7, halfL * 0.62);
  ctx.stroke();
  // sole highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(-halfW * 0.3, halfL * 0.12, halfW * 0.4, halfL * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Giant MOM hand silhouette, top-down palm with fingers pointing "down" (+y).
 * `w` = palm width in px. Caller sets transform (position/scale/shadow already sized).
 */
export function momHand(ctx: CanvasRenderingContext2D, w: number): void {
  const skin = hex(0xf0c8a0);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, w * 0.03);
  ctx.strokeStyle = COCOA_CSS;
  // fingers (4) pointing +y
  const fingerW = w * 0.19;
  for (let i = 0; i < 4; i++) {
    const fx = -w * 0.34 + i * (w * 0.225);
    const len = w * (0.62 + (i === 1 || i === 2 ? 0.12 : 0));
    roundBar(ctx, fx, w * 0.1, fingerW, len, skin);
  }
  // thumb (left)
  roundBar2(ctx, -w * 0.52, -w * 0.02, fingerW, w * 0.5, -0.5, skin);
  // palm
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.28, w * 0.52, w * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();
  // palm shading
  ctx.fillStyle = 'rgba(180,120,90,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.2, w * 0.34, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function roundBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r, y + h - r);
  ctx.arc(x, y + h - r, r, Math.PI, 0, true);
  ctx.lineTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function roundBar2(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ang: number, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  roundBar(ctx, 0, 0, w, h, fill);
  ctx.restore();
}

/** A tupperware tub with a lid popping off (Mystery Leftovers). `t` 0..1 pop progress. */
export function tupperware(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, t: number): void {
  const h = w * 0.7;
  // tub
  ctx.fillStyle = rgba(0xbfe3f7, 0.55);
  ctx.strokeStyle = COCOA_CSS;
  ctx.lineWidth = Math.max(2, w * 0.04);
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - h * 0.2, w, h * 0.7);
  ctx.fill();
  ctx.stroke();
  // suspicious green contents
  ctx.fillStyle = rgba(0xa8c83c, 0.85);
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.1, w * 0.32, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // lid, flipping up
  const lidY = cy - h * (0.28 + t * 0.9);
  ctx.save();
  ctx.translate(cx, lidY);
  ctx.rotate(t * 0.8);
  ctx.fillStyle = hex(0xe8504f);
  ctx.strokeStyle = COCOA_CSS;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.6, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A carpenter's-hammer glyph (Insurance Claim sparkle). */
export function hammerGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, rot: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = hex(0xb8c0c8);
  ctx.strokeStyle = COCOA_CSS;
  ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.beginPath();
  ctx.rect(-s * 0.55, -s * 0.5, s * 1.1, s * 0.42);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hex(0x8a5a36);
  ctx.beginPath();
  ctx.rect(-s * 0.12, -s * 0.08, s * 0.24, s * 0.9);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
