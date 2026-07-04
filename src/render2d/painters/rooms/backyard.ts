/** BACKYARD (exterior, bright): sunlit grass, stepping-stone path, flowers, a picnic blanket, a gate. */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  grassFloor, moodWash, vignette, lightPool, slab,
  hex, rgba, lighten, darken,
} from './shared';

const FLOWER_COLORS = [0xe8504f, 0xffd97a, 0xffffff, 0xe89ad0];

const backyard: RoomTreatment = {
  floor(rc: RoomCtx): void {
    grassFloor(rc, rc.pal.floorTileA, rc.pal.floorTileB);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0xfff2c8, 0.05);
    vignette(rc, 0x2a4a1c, 0.08);
    lightPool(rc, rc.floorRect.x + rc.floorRect.w * 0.72, rc.floorRect.y + rc.floorRect.h * 0.15, rc.scale * 4, 0xfff2c8, 0.1);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // stepping-stone path across the lawn
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      ctx.beginPath();
      ctx.ellipse(wx(0.12 + t * 0.72), wy(0.85 - t * 0.6), s * 0.55, s * 0.4, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0x9a9488, 0.7);
      ctx.fill();
      ctx.strokeStyle = rgba(0x5c5850, 0.5);
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.stroke();
    }
    // red-checked picnic blanket
    const bx = wx(0.2) - s * 1.6;
    const by = wy(0.32) - s * 1.2;
    slab(rc, bx, by, s * 3.2, s * 2.4, s * 0.1, 0xd8504a, 0.4);
    ctx.fillStyle = rgba(0xffffff, 0.3);
    const cells = 4;
    for (let cx = 0; cx < cells; cx++) {
      for (let cy = 0; cy < cells; cy++) {
        if (((cx + cy) & 1) === 0) continue;
        ctx.fillRect(bx + (s * 3.2 * cx) / cells, by + (s * 2.4 * cy) / cells, (s * 3.2) / cells, (s * 2.4) / cells);
      }
    }
    // flower cluster in a corner
    for (let i = 0; i < 6; i++) {
      const fx = wx(0.9) + (i % 3) * s * 0.34 - s * 0.34;
      const fy = wy(0.9) + Math.floor(i / 3) * s * 0.34 - s * 0.2;
      ctx.strokeStyle = rgba(0x4a7a34, 0.8);
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + s * 0.35);
      ctx.stroke();
      ctx.fillStyle = rgba(FLOWER_COLORS[i % FLOWER_COLORS.length], 0.85);
      ctx.beginPath();
      ctx.arc(fx, fy, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  platformTop(rc: RoomCtx, _surf: SurfaceDef, rect: ScreenRect): void {
    // picnic-table planks with a center gap
    const ctx = rc.ctx;
    ctx.strokeStyle = rgba(darken(rc.pal.counterTop, 0.35), 0.4);
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    const rows = Math.max(2, Math.round(rect.h / (rc.scale * 0.6)));
    for (let r = 1; r < rows; r++) {
      const yy = rect.y + (rect.h * r) / rows;
      ctx.beginPath();
      ctx.moveTo(rect.x, yy);
      ctx.lineTo(rect.x + rect.w, yy);
      ctx.stroke();
    }
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    const ctx = rc.ctx;
    if (spawn.kind === 'door') {
      // wooden picket gate
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.strokeStyle = rgba(darken(rc.pal.wallTrim, 0.2), 0.9);
      rc.roundRect(cx - s * 0.44, cy - s * 0.4, s * 0.88, s * 0.8, s * 0.05);
      ctx.fillStyle = hex(lighten(rc.pal.wallTrim, 0.12));
      ctx.fill();
      ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * s * 0.18, cy - s * 0.36);
        ctx.lineTo(cx + i * s * 0.18, cy + s * 0.36);
        ctx.stroke();
      }
      ctx.beginPath(); // cross rail
      ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx + s * 0.4, cy);
      ctx.stroke();
      return true;
    }
    if (spawn.kind === 'drain') {
      // garden spigot + coiled hose
      ctx.strokeStyle = rgba(0x2f6a3c, 0.8);
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, 0.3, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = hex(lighten(rc.pal.metal, 0.05));
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.strokeStyle = rgba(darken(rc.pal.metalDark, 0.1), 0.9);
      ctx.stroke();
      return true;
    }
    return false;
  },
};

registerRoom('backyard', backyard);
