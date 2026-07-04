/** BATHROOM: pale hex-tile floor, a tub, bath mat, mirror strip, chrome shower drains. */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  hexFloor, moodWash, vignette, slab,
  hex, rgba, lighten, darken,
} from './shared';

const bathroom: RoomTreatment = {
  floor(rc: RoomCtx): void {
    hexFloor(rc, rc.pal.floorTileA, rc.pal.floorTileB, rc.pal.groutAlpha);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0xdff4ff, 0.04);
    vignette(rc, 0x18343a, 0.09);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // clawfoot-ish tub in the far corner: porcelain shell + blue water
    const tx = wx(0.86) - s * 1.9;
    const ty = wy(0.8) - s * 1.2;
    slab(rc, tx, ty, s * 3.6, s * 2.4, s * 0.7, rc.pal.counterTop, 0.5);
    ctx.fillStyle = rgba(0x8fd0e0, 0.55);
    rc.roundRect(tx + s * 0.32, ty + s * 0.32, s * 2.96, s * 1.76, s * 0.5);
    ctx.fill();
    ctx.strokeStyle = rgba(0xffffff, 0.4);
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.stroke();
    // bath mat near the tub
    slab(rc, wx(0.4) - s * 1.1, wy(0.78) - s * 0.7, s * 2.2, s * 1.4, s * 0.18, lighten(0x8fbcc4, 0.2), 0.3);
    // mirror strip along the top wall
    slab(rc, wx(0.14), wy(0.01), s * 2.2, s * 0.7, s * 0.08, lighten(rc.pal.metal, 0.15), 0.4);
    ctx.fillStyle = rgba(0xffffff, 0.25);
    ctx.fillRect(wx(0.14) + s * 0.2, wy(0.01) + s * 0.12, s * 0.5, s * 0.46);
  },
  platformTop(rc: RoomCtx, _surf: SurfaceDef, rect: ScreenRect): void {
    // porcelain sheen: a soft top-left highlight band
    const ctx = rc.ctx;
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, rgba(0xffffff, 0.28));
    g.addColorStop(0.4, rgba(0xffffff, 0));
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    if (spawn.kind !== 'drain') return false;
    const ctx = rc.ctx;
    // square chrome shower drain: tiled plate + slotted grille
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.strokeStyle = rgba(darken(rc.pal.metalDark, 0.2), 0.9);
    rc.roundRect(cx - s * 0.4, cy - s * 0.4, s * 0.8, s * 0.8, s * 0.08);
    ctx.fillStyle = hex(lighten(rc.pal.metal, 0.05));
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rgba(rc.pal.metalDark, 0.8);
    ctx.lineWidth = Math.max(1, s * 0.04);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.28, cy + i * s * 0.13);
      ctx.lineTo(cx + s * 0.28, cy + i * s * 0.13);
      ctx.stroke();
    }
    return true;
  },
};

registerRoom('bathroom', bathroom);
