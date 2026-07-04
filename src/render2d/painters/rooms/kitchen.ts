/** KITCHEN (also 'secret'): warm checker-tile floor, sunbeam, counter laminate, tea-towel rug. */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef } from '../../../sim/types';
import {
  checkerFloor, moodWash, vignette, beamWedge, lightPool, slab,
  rgba, darken,
} from './shared';

const kitchen: RoomTreatment = {
  floor(rc: RoomCtx): void {
    checkerFloor(rc, rc.pal.floorTileA, rc.pal.floorTileB, rc.pal.groutAlpha);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, rc.pal.sunbeam, 0.05);
    vignette(rc, 0x2a1c10, 0.14);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // golden window sunbeam raking across the floor
    beamWedge(rc, wx(0.66), wy(-0.02), -f.cols * 0.28 * s, f.rows * 0.5 * s, s * 2.4, rc.pal.sunbeam, 0.12);
    lightPool(rc, wx(0.62), wy(0.04), s * 2.2, rc.pal.sunbeam, 0.1);
    // round tea-towel rug near the entry
    const ctx = rc.ctx;
    ctx.beginPath();
    ctx.ellipse(wx(0.28), wy(0.72), s * 1.7, s * 1.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0xe8607a, 0.42);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.strokeStyle = rgba(0xffffff, 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(wx(0.28), wy(0.72), s * 1.15, s * 0.82, 0, 0, Math.PI * 2);
    ctx.stroke();
    // little potted herb in the corner
    slab(rc, wx(0.9) - s * 0.35, wy(0.86) - s * 0.35, s * 0.7, s * 0.7, s * 0.16, 0xc06a3c, 0.5);
    ctx.fillStyle = rgba(0x5a9a44, 0.7);
    ctx.beginPath();
    ctx.arc(wx(0.9), wy(0.86) - s * 0.18, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
  },
  platformTop(rc: RoomCtx, surf: SurfaceDef, rect: ScreenRect): void {
    if (surf.kind === 'stove') return; // burners handled by board's blocked insets
    const ctx = rc.ctx;
    // laminate sheen streaks + a darker front lip
    ctx.strokeStyle = rgba(0xffffff, 0.14);
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    const rows = Math.max(2, Math.round(rect.h / (rc.scale * 0.6)));
    for (let i = 1; i < rows; i++) {
      const yy = rect.y + (rect.h * i) / rows;
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w * 0.06, yy);
      ctx.lineTo(rect.x + rect.w * 0.94, yy);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(darken(rc.pal.counterTop, 0.3), 0.4);
    ctx.fillRect(rect.x, rect.y + rect.h - Math.max(2, rc.scale * 0.12), rect.w, Math.max(2, rc.scale * 0.12));
  },
};

registerRoom('kitchen', kitchen);
registerRoom('secret', kitchen); // secret renders via the kitchen/dessert treatment (BUILDLOG P4)
