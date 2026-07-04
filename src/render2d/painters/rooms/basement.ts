/**
 * BASEMENT (DARK): lifted stone flagstones, bare-bulb glow pools, stacked boxes, cobweb corners.
 * Same legibility discipline as the bedroom — floor albedo lifted, bulb pools re-brighten the middle.
 */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  stoneFloor, moodWash, vignette, lightPool, slab, cobweb,
  rgba, lighten, darken,
} from './shared';

const BOX_COLORS = [0x8a6a45, 0x6e4e2c, 0x9c7748];

const basement: RoomTreatment = {
  floor(rc: RoomCtx): void {
    stoneFloor(rc, lighten(rc.pal.floorTileA, 0.15), rc.pal.groutAlpha);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0x101418, 0.18);
    vignette(rc, 0x040506, 0.34, 0.4);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const { x, y, w, h } = rc.floorRect;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // bare-bulb light pools (the only light down here)
    lightPool(rc, wx(0.35), wy(0.45), s * 3.2, rc.pal.practicalColor, 0.24);
    lightPool(rc, wx(0.68), wy(0.6), s * 3.0, rc.pal.practicalColor, 0.22);
    // bulb dots + cords
    const ctx = rc.ctx;
    for (const fx of [0.35, 0.68]) {
      ctx.strokeStyle = rgba(0x000000, 0.4);
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(wx(fx), y);
      ctx.lineTo(wx(fx), wy(fx === 0.35 ? 0.45 : 0.6));
      ctx.stroke();
      ctx.fillStyle = rgba(0xffe9a8, 0.95);
      ctx.beginPath();
      ctx.arc(wx(fx), wy(fx === 0.35 ? 0.45 : 0.6), s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    // stacked cardboard boxes in a corner
    const boxes: [number, number, number][] = [[0.1, 0.82, 0], [0.2, 0.82, 1], [0.14, 0.66, 2]];
    for (const [fx, fz, ci] of boxes) {
      slab(rc, wx(fx) - s * 0.55, wy(fz) - s * 0.55, s * 1.1, s * 1.1, s * 0.06, BOX_COLORS[ci], 0.6);
      ctx.strokeStyle = rgba(darken(BOX_COLORS[ci], 0.4), 0.5);
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(wx(fx), wy(fz) - s * 0.55);
      ctx.lineTo(wx(fx), wy(fz) + s * 0.55);
      ctx.stroke();
    }
    // cobwebs in the corners
    const R = s * 1.7;
    cobweb(rc, x, y, R, 0, Math.PI / 2, 0.22);
    cobweb(rc, x + w, y, R, Math.PI / 2, Math.PI, 0.22);
    cobweb(rc, x, y + h, R, -Math.PI / 2, 0, 0.18);
    cobweb(rc, x + w, y + h, R, Math.PI, Math.PI * 1.5, 0.18);
  },
  surfaceColor(surf: SurfaceDef, pal): number | null {
    return surf.kind === 'floor' ? null : lighten(pal.counterTop, 0.16);
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    if (spawn.kind !== 'door') return false;
    const ctx = rc.ctx;
    // stairs down: descending step bands into a dark doorway
    rc.roundRect(cx - s * 0.42, cy - s * 0.46, s * 0.84, s * 0.92, s * 0.06);
    ctx.fillStyle = rgba(0x120f0c, 0.9);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.strokeStyle = rgba(darken(rc.pal.wood, 0.2), 0.9);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const yy = cy - s * 0.3 + i * s * 0.2;
      ctx.strokeStyle = rgba(lighten(rc.pal.wood, 0.1 + i * 0.08), 0.7);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.34 + i * s * 0.04, yy);
      ctx.lineTo(cx + s * 0.34 - i * s * 0.04, yy);
      ctx.stroke();
    }
    return true;
  },
};

registerRoom('basement', basement);
