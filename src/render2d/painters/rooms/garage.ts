/** GARAGE: bare concrete + oil stains, a car silhouette, workbench, hanging-bulb cones. */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  concreteFloor, moodWash, vignette, lightPool, slab,
  hex, rgba, lighten, darken,
} from './shared';

const garage: RoomTreatment = {
  floor(rc: RoomCtx): void {
    concreteFloor(rc, rc.pal.floorTileA);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0x2a2e34, 0.08);
    vignette(rc, 0x0e0e10, 0.2);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // oil stains
    for (const [fx, fz, rr] of [[0.42, 0.5, 1.4], [0.55, 0.62, 0.8]] as [number, number, number][]) {
      ctx.beginPath();
      ctx.ellipse(wx(fx), wy(fz), s * rr, s * rr * 0.7, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0x14100e, 0.5);
      ctx.fill();
    }
    // hanging-bulb light cones
    lightPool(rc, wx(0.3), wy(0.4), s * 3.2, rc.pal.practicalColor, 0.16);
    lightPool(rc, wx(0.72), wy(0.5), s * 3.2, rc.pal.practicalColor, 0.16);
    // parked car nosing in from the right edge
    const carX = wx(0.78);
    const carY = wy(0.68);
    const carW = s * 5.5;
    const carH = s * 2.6;
    slab(rc, carX - carW * 0.5, carY - carH * 0.5, carW, carH, s * 0.7, 0x3a5f8a, 0.6);
    // cabin
    slab(rc, carX - carW * 0.18, carY - carH * 0.42, carW * 0.5, carH * 0.5, s * 0.35, lighten(0x3a5f8a, 0.18), 0.4);
    // windshield glint
    ctx.fillStyle = rgba(0xcfe6f4, 0.4);
    rc.roundRect(carX - carW * 0.14, carY - carH * 0.36, carW * 0.42, carH * 0.36, s * 0.2);
    ctx.fill();
    // wheels
    ctx.fillStyle = hex(0x18181a);
    for (const wxo of [-carW * 0.3, carW * 0.28]) {
      ctx.beginPath();
      ctx.arc(carX + wxo, carY + carH * 0.5, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // headlight
    ctx.fillStyle = rgba(0xfff2c8, 0.8);
    ctx.beginPath();
    ctx.arc(carX - carW * 0.48, carY, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  },
  platformTop(rc: RoomCtx, surf: SurfaceDef, rect: ScreenRect): void {
    const ctx = rc.ctx;
    if (surf.kind === 'shelf') {
      // metal shelving: diamond-plate hint (small bolts at corners)
      ctx.fillStyle = rgba(0x2a2c2e, 0.6);
      for (const [fx, fy] of [[0.1, 0.2], [0.9, 0.2], [0.1, 0.8], [0.9, 0.8]] as [number, number][]) {
        ctx.beginPath();
        ctx.arc(rect.x + rect.w * fx, rect.y + rect.h * fy, Math.max(1.5, rc.scale * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    // workbench: pegboard holes + wood-grain scratches
    ctx.strokeStyle = rgba(darken(rc.pal.counterTop, 0.4), 0.35);
    ctx.lineWidth = Math.max(1, rc.scale * 0.025);
    const rows = Math.max(2, Math.round(rect.h / (rc.scale * 0.5)));
    for (let r = 1; r < rows; r++) {
      const yy = rect.y + (rect.h * r) / rows;
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w * 0.05, yy);
      ctx.lineTo(rect.x + rect.w * 0.95, yy);
      ctx.stroke();
    }
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    if (spawn.kind !== 'door') return false;
    const ctx = rc.ctx;
    // segmented roll-up garage door
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.strokeStyle = rgba(darken(rc.pal.metalDark, 0.2), 0.9);
    rc.roundRect(cx - s * 0.46, cy - s * 0.5, s * 0.92, s, s * 0.06);
    ctx.fillStyle = hex(lighten(rc.pal.metal, 0.08));
    ctx.fill();
    ctx.stroke();
    for (let i = -1; i <= 2; i++) {
      const yy = cy + i * s * 0.25;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.44, yy);
      ctx.lineTo(cx + s * 0.44, yy);
      ctx.stroke();
    }
    // handle
    ctx.fillStyle = hex(0x3a3c40);
    ctx.fillRect(cx - s * 0.12, cy + s * 0.34, s * 0.24, s * 0.08);
    return true;
  },
};

registerRoom('garage', garage);
