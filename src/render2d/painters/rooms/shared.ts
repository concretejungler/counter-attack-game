/**
 * Shared floor-material / light / prop draw helpers for the room treatments (P3-R).
 *
 * Everything here draws into the CACHED board canvas, so patterns MUST be
 * deterministic in WORLD space (keyed off tile/world coords, never Math.random and
 * never screen coords) — otherwise speckle/blades would shimmer every time the
 * board re-caches on a pan/zoom. Keep alphas low: this is dressing under gameplay.
 */

import type { RoomCtx } from './registry';
import { hex, rgba, lighten, darken, mix } from '../../colors';

// ---- deterministic per-cell noise (stable across redraws) -------------------
/** 0..1 hash of two integer coords (+salt). No allocation, no Math.random. */
export function noise2(c: number, r: number, salt = 0): number {
  let h = (Math.imul(c | 0, 374761393) + Math.imul(r | 0, 668265263) + Math.imul(salt | 0, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h >>> 8) & 0xffff) / 0x10000;
}

// ---- geometry iteration ------------------------------------------------------
/** Visit every floor tile with its top-left screen position + the world tile index. */
export function forFloorTiles(rc: RoomCtx, cb: (c: number, r: number, sx: number, sy: number, s: number) => void): void {
  const f = rc.floor;
  const s = rc.scale;
  for (let c = 0; c < f.cols; c++) {
    const sx = rc.cam.worldToScreenX(f.origin.x + c);
    for (let r = 0; r < f.rows; r++) {
      const sy = rc.cam.worldToScreenY(f.origin.z + r);
      cb(c, r, sx, sy, s);
    }
  }
}

// ---- floor materials ---------------------------------------------------------
export function fillFloor(rc: RoomCtx, color: number): void {
  const { x, y, w, h } = rc.floorRect;
  rc.ctx.fillStyle = hex(color);
  rc.ctx.fillRect(x, y, w, h);
}

/** Classic 2-color checker aligned to world tiles (kitchen). */
export function checkerFloor(rc: RoomCtx, aCol: number, bCol: number, grout?: string): void {
  fillFloor(rc, bCol);
  const a = hex(aCol);
  const b = hex(bCol);
  const ctx = rc.ctx;
  forFloorTiles(rc, (c, r, sx, sy, s) => {
    if (((c + r) & 1) === 0) return;
    ctx.fillStyle = ((c + r) & 2) === 0 ? a : b;
    ctx.fillRect(sx, sy, s + 0.6, s + 0.6);
  });
  if (grout) {
    ctx.strokeStyle = grout;
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    forFloorTiles(rc, (_c, _r, sx, sy, s) => ctx.strokeRect(sx, sy, s, s));
  }
}

/** Horizontal plank floorboards with seams + occasional knot (living / attic). */
export function plankFloor(rc: RoomCtx, base: number, plankRows = 1): void {
  const { x, y, w, h } = rc.floorRect;
  const ctx = rc.ctx;
  const f = rc.floor;
  const ph = rc.scale * plankRows;
  // per-plank tone variation
  let idx = 0;
  for (let yy = y; yy < y + h; yy += ph, idx++) {
    const t = (noise2(idx, 7) - 0.5) * 0.12;
    ctx.fillStyle = hex(t < 0 ? darken(base, -t) : lighten(base, t));
    ctx.fillRect(x, yy, w, Math.min(ph, y + h - yy));
    // seam line
    ctx.strokeStyle = rgba(darken(base, 0.5), 0.4);
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    ctx.beginPath();
    ctx.moveTo(x, yy + 0.5);
    ctx.lineTo(x + w, yy + 0.5);
    ctx.stroke();
    // stagger a few vertical butt-joints + knots along this plank
    for (let c = 0; c < f.cols; c += 2) {
      const n = noise2(c, idx, 3);
      const jx = rc.cam.worldToScreenX(f.origin.x + c + n);
      ctx.strokeStyle = rgba(darken(base, 0.45), 0.28);
      ctx.beginPath();
      ctx.moveTo(jx, yy + 1);
      ctx.lineTo(jx, yy + ph - 1);
      ctx.stroke();
      if (noise2(c, idx, 9) > 0.86) {
        ctx.fillStyle = rgba(darken(base, 0.4), 0.35);
        ctx.beginPath();
        ctx.ellipse(jx + rc.scale * 0.4, yy + ph * 0.5, rc.scale * 0.08, rc.scale * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Running-bond brick (sewer). */
export function brickFloor(rc: RoomCtx, base: number, mortar: string): void {
  fillFloor(rc, base);
  const { x, y, w, h } = rc.floorRect;
  const ctx = rc.ctx;
  const bh = rc.scale * 0.5;
  const bw = rc.scale * 1.0;
  ctx.strokeStyle = mortar;
  ctx.lineWidth = Math.max(1, rc.scale * 0.03);
  let row = 0;
  for (let yy = y; yy < y + h + bh; yy += bh, row++) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    const off = row % 2 ? bw * 0.5 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      // subtle per-brick tone
      if (noise2(Math.round(xx), row, 5) > 0.7) {
        ctx.fillStyle = rgba(darken(base, 0.25), 0.25);
        ctx.fillRect(xx + 1, yy + 1, bw - 2, bh - 2);
      }
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, Math.min(yy + bh, y + h));
      ctx.stroke();
    }
  }
}

/** Small pointy-top hex tiling (bathroom). Faint outlines only. */
export function hexFloor(rc: RoomCtx, base: number, alt: number, edge: string): void {
  fillFloor(rc, base);
  const { x, y, w, h } = rc.floorRect;
  const ctx = rc.ctx;
  const R = Math.max(6, rc.scale * 0.42);
  const hstep = R * 1.5;
  const vstep = R * Math.sqrt(3);
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, rc.scale * 0.025);
  let col = 0;
  let guard = 0;
  for (let cx = x; cx < x + w + R && guard < 4000; cx += hstep, col++) {
    const yoff = col % 2 ? vstep * 0.5 : 0;
    for (let cy = y + yoff; cy < y + h + R && guard < 4000; cy += vstep) {
      guard++;
      if (noise2(col, Math.round(cy / vstep), 2) > 0.82) {
        hexPath(ctx, cx, cy, R * 0.98);
        ctx.fillStyle = rgba(alt, 0.5);
        ctx.fill();
      }
      hexPath(ctx, cx, cy, R * 0.98);
      ctx.stroke();
    }
  }
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = cx + Math.cos(a) * R;
    const py = cy + Math.sin(a) * R;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Irregular flagstones on a tile grid, tone-jittered + mortar (basement). */
export function stoneFloor(rc: RoomCtx, base: number, mortar: string): void {
  fillFloor(rc, base);
  const ctx = rc.ctx;
  forFloorTiles(rc, (c, r, sx, sy, s) => {
    const n = noise2(c, r, 11);
    const tone = (n - 0.5) * 0.24;
    ctx.fillStyle = hex(tone < 0 ? darken(base, -tone) : lighten(base, tone));
    const inset = s * (0.04 + noise2(c, r, 13) * 0.04);
    ctx.fillRect(sx + inset, sy + inset, s - inset * 2, s - inset * 2);
    ctx.strokeStyle = mortar;
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.strokeRect(sx + inset, sy + inset, s - inset * 2, s - inset * 2);
  });
}

/** Bare concrete: large panel joints + fine speckle (garage). */
export function concreteFloor(rc: RoomCtx, base: number): void {
  fillFloor(rc, base);
  const { x, y, w, h } = rc.floorRect;
  const ctx = rc.ctx;
  // speckle
  ctx.fillStyle = rgba(darken(base, 0.3), 0.18);
  forFloorTiles(rc, (c, r, sx, sy, s) => {
    for (let i = 0; i < 3; i++) {
      const nx = noise2(c, r, i + 20);
      const ny = noise2(c, r, i + 40);
      ctx.fillRect(sx + nx * s, sy + ny * s, Math.max(1, s * 0.04), Math.max(1, s * 0.04));
    }
  });
  // expansion joints every ~5 world units
  ctx.strokeStyle = rgba(darken(base, 0.5), 0.5);
  ctx.lineWidth = Math.max(1.5, rc.scale * 0.05);
  const f = rc.floor;
  for (let c = 0; c <= f.cols; c += 5) {
    const jx = rc.cam.worldToScreenX(f.origin.x + c);
    ctx.beginPath(); ctx.moveTo(jx, y); ctx.lineTo(jx, y + h); ctx.stroke();
  }
  for (let r = 0; r <= f.rows; r += 5) {
    const jy = rc.cam.worldToScreenY(f.origin.z + r);
    ctx.beginPath(); ctx.moveTo(x, jy); ctx.lineTo(x + w, jy); ctx.stroke();
  }
}

/** Soft carpet: base fill + fine fleck weave (bedroom). Lift `base` before calling on dark themes. */
export function carpetFloor(rc: RoomCtx, base: number): void {
  fillFloor(rc, base);
  const ctx = rc.ctx;
  forFloorTiles(rc, (c, r, sx, sy, s) => {
    for (let i = 0; i < 4; i++) {
      const nx = noise2(c, r, i + 60);
      const ny = noise2(c, r, i + 80);
      const up = noise2(c, r, i + 90) > 0.5;
      ctx.fillStyle = up ? rgba(lighten(base, 0.14), 0.3) : rgba(darken(base, 0.18), 0.3);
      ctx.fillRect(sx + nx * s, sy + ny * s, Math.max(1, s * 0.06), Math.max(1, s * 0.06));
    }
  });
}

/** Sunlit grass: base fill, patch mottle + blade flecks (backyard). */
export function grassFloor(rc: RoomCtx, base: number, dark: number): void {
  fillFloor(rc, base);
  const ctx = rc.ctx;
  forFloorTiles(rc, (c, r, sx, sy, s) => {
    // patch mottle
    const n = noise2(c, r, 31);
    if (n > 0.55) {
      ctx.fillStyle = rgba(n > 0.8 ? lighten(base, 0.12) : dark, 0.28);
      ctx.fillRect(sx, sy, s + 0.6, s + 0.6);
    }
    // blade flecks
    ctx.strokeStyle = rgba(darken(dark, 0.1), 0.4);
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = 0; i < 4; i++) {
      const bx = sx + noise2(c, r, i + 50) * s;
      const by = sy + noise2(c, r, i + 70) * s;
      const bl = s * (0.12 + noise2(c, r, i + 33) * 0.1);
      const lean = (noise2(c, r, i + 44) - 0.5) * s * 0.12;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + lean, by - bl);
      ctx.stroke();
    }
  });
}

// ---- light + mood ------------------------------------------------------------
/** Flat translucent color wash over the whole floor rect (mood/day-night). */
export function moodWash(rc: RoomCtx, color: number, alpha: number): void {
  const { x, y, w, h } = rc.floorRect;
  rc.ctx.fillStyle = rgba(color, alpha);
  rc.ctx.fillRect(x, y, w, h);
}

/** Radial edge-darkening across the floor rect (keeps the center bright). */
export function vignette(rc: RoomCtx, edge: number, alpha: number, innerFrac = 0.45): void {
  const { x, y, w, h } = rc.floorRect;
  const ctx = rc.ctx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(cx, cy, R * innerFrac, cx, cy, R);
  g.addColorStop(0, rgba(edge, 0));
  g.addColorStop(1, rgba(edge, alpha));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Soft round light-pool (lamp / bulb / drain glow). Lifts local floor luminance. */
export function lightPool(rc: RoomCtx, cx: number, cy: number, radius: number, color: number, alpha: number): void {
  const ctx = rc.ctx;
  const g = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.6, rgba(color, alpha * 0.4));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** A soft-edged translucent light wedge (sunbeam / moonbeam) from a screen point. */
export function beamWedge(rc: RoomCtx, ox: number, oy: number, dx: number, dy: number, spread: number, color: number, alpha: number): void {
  const ctx = rc.ctx;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux; // perpendicular
  const ex = ox + dx, ey = oy + dy;
  const g = ctx.createLinearGradient(ox, oy, ex, ey);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ox - px * spread * 0.25, oy - py * spread * 0.25);
  ctx.lineTo(ox + px * spread * 0.25, oy + py * spread * 0.25);
  ctx.lineTo(ex + px * spread, ey + py * spread);
  ctx.lineTo(ex - px * spread, ey - py * spread);
  ctx.closePath();
  ctx.fill();
}

// ---- prop primitives ---------------------------------------------------------
/** Outlined rounded slab prop (furniture silhouette). */
export function slab(rc: RoomCtx, x: number, y: number, w: number, h: number, r: number, fill: number, outlineAlpha = 0.5): void {
  const ctx = rc.ctx;
  rc.roundRect(x, y, w, h, r);
  ctx.fillStyle = hex(fill);
  ctx.fill();
  if (outlineAlpha > 0) {
    ctx.lineWidth = Math.max(1.5, rc.scale * 0.04);
    ctx.strokeStyle = rgba(darken(fill, 0.55), outlineAlpha);
    ctx.stroke();
  }
}

/** Cobweb in a corner: radial spokes + a couple of arcs (basement). */
export function cobweb(rc: RoomCtx, cx: number, cy: number, R: number, a0: number, a1: number, alpha: number): void {
  const ctx = rc.ctx;
  ctx.strokeStyle = rgba(0xdfe6df, alpha);
  ctx.lineWidth = Math.max(1, rc.scale * 0.02);
  for (let i = 0; i <= 5; i++) {
    const a = a0 + ((a1 - a0) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }
  for (let rr = R * 0.28; rr < R; rr += R * 0.26) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr, a0, a1);
    ctx.stroke();
  }
}

export { hex, rgba, lighten, darken, mix };
