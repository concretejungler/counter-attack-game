/** ATTIC: warm dusty plank floor, golden shafts, rafter shadows, an old trunk, a round vent window. */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  plankFloor, moodWash, vignette, beamWedge, lightPool, slab, forFloorTiles, noise2,
  hex, rgba, lighten, darken,
} from './shared';

const attic: RoomTreatment = {
  floor(rc: RoomCtx): void {
    plankFloor(rc, rc.pal.floorTileA, 1);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, rc.pal.sunbeam, 0.08);
    vignette(rc, 0x2a1e10, 0.2);
    // rafter shadow bands overhead (subtle parallel diagonals)
    const { x, y, w, h } = rc.floorRect;
    const ctx = rc.ctx;
    ctx.fillStyle = rgba(0x1c130a, 0.06);
    const bw = rc.scale * 0.5;
    for (let bx = x - h; bx < x + w; bx += rc.scale * 2.4) {
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + bw, y);
      ctx.lineTo(bx + bw + h * 0.5, y + h);
      ctx.lineTo(bx + h * 0.5, y + h);
      ctx.closePath();
      ctx.fill();
    }
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // twin golden dust shafts from the round window
    beamWedge(rc, wx(0.42), wy(-0.02), -f.cols * 0.14 * s, f.rows * 0.85 * s, s * 1.8, rc.pal.sunbeam, 0.16);
    beamWedge(rc, wx(0.5), wy(-0.02), -f.cols * 0.02 * s, f.rows * 0.9 * s, s * 1.4, rc.pal.sunbeam, 0.14);
    lightPool(rc, wx(0.45), wy(0.1), s * 2.4, rc.pal.sunbeam, 0.12);
    // floating dust specks caught in the light
    ctx.fillStyle = rgba(0xfff0c0, 0.5);
    forFloorTiles(rc, (c, r, sx, sy, sc) => {
      if (noise2(c, r, 71) < 0.86) return;
      ctx.beginPath();
      ctx.arc(sx + noise2(c, r, 72) * sc, sy + noise2(c, r, 73) * sc, Math.max(1, sc * 0.03), 0, Math.PI * 2);
      ctx.fill();
    });
    // old steamer trunk in a corner
    const tx = wx(0.84) - s * 1.1;
    const ty = wy(0.82) - s * 0.8;
    slab(rc, tx, ty, s * 2.2, s * 1.6, s * 0.14, rc.pal.woodDark, 0.6);
    ctx.strokeStyle = rgba(lighten(rc.pal.metal, 0.1), 0.7);
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    for (const fx of [0.28, 0.72]) {
      ctx.beginPath();
      ctx.moveTo(tx + s * 2.2 * fx, ty);
      ctx.lineTo(tx + s * 2.2 * fx, ty + s * 1.6);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(lighten(rc.pal.metal, 0.1), 0.5);
    ctx.beginPath();
    ctx.moveTo(tx, ty + s * 0.8);
    ctx.lineTo(tx + s * 2.2, ty + s * 0.8);
    ctx.stroke();
  },
  platformTop(rc: RoomCtx, _surf: SurfaceDef, rect: ScreenRect): void {
    // crate slat grain
    const ctx = rc.ctx;
    ctx.strokeStyle = rgba(darken(rc.pal.counterTop, 0.35), 0.35);
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    const cols = Math.max(2, Math.round(rect.w / (rc.scale * 0.7)));
    for (let c = 1; c < cols; c++) {
      const xx = rect.x + (rect.w * c) / cols;
      ctx.beginPath();
      ctx.moveTo(xx, rect.y + rect.h * 0.06);
      ctx.lineTo(xx, rect.y + rect.h * 0.94);
      ctx.stroke();
    }
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    if (spawn.kind !== 'window') return false;
    const ctx = rc.ctx;
    // round attic vent window: golden glass, ring frame, cross muntins
    lightPool(rc, cx, cy, s * 1.4, rc.pal.sunbeam, 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = hex(lighten(rc.pal.windowSky, 0.08));
    ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.strokeStyle = rgba(darken(rc.pal.woodDark, 0.1), 0.9);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.42, cy); ctx.lineTo(cx + s * 0.42, cy);
    ctx.moveTo(cx, cy - s * 0.42); ctx.lineTo(cx, cy + s * 0.42);
    ctx.stroke();
    return true;
  },
};

registerRoom('attic', attic);
