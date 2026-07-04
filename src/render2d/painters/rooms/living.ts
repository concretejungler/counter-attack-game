/** LIVING ROOM: warm hardwood floorboards, big area rug, TV glow, a wall of books. */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef } from '../../../sim/types';
import {
  plankFloor, moodWash, vignette, lightPool, slab,
  rgba, darken, mix,
} from './shared';

const BOOK_COLORS = [0xe8504f, 0x3f5d7d, 0x9fd8c0, 0xffd97a, 0x8a5a36, 0x6b4423];

const living: RoomTreatment = {
  floor(rc: RoomCtx): void {
    plankFloor(rc, mix(rc.pal.floorTileA, rc.pal.floorTileB, 0.4), 1);
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0xffb870, 0.06);
    vignette(rc, 0x2a1a0e, 0.18);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // big round area rug in the middle of the room
    ctx.beginPath();
    ctx.ellipse(wx(0.42), wy(0.55), s * 3.2, s * 2.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0xb83c46, 0.4);
    ctx.fill();
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.strokeStyle = rgba(0xf0d0a0, 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(wx(0.42), wy(0.55), s * 2.4, s * 1.7, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(0x7a2830, 0.4);
    ctx.stroke();
    // TV against the right wall with a cool screen glow
    lightPool(rc, wx(0.9), wy(0.3), s * 2.6, rc.pal.practicalColor, 0.16);
    slab(rc, wx(0.9) - s * 1.1, wy(0.3) - s * 0.75, s * 2.2, s * 1.5, s * 0.12, 0x1a1a20, 0.6);
    ctx.fillStyle = rgba(rc.pal.practicalColor, 0.6);
    ctx.fillRect(wx(0.9) - s * 0.9, wy(0.3) - s * 0.55, s * 1.8, s * 1.1);
    // bookshelf spines along the top edge
    const shelfY = wy(0.02);
    let x = wx(0.05);
    let i = 0;
    while (x < wx(0.42)) {
      const bh = s * (0.9 + (i % 3) * 0.18);
      const bw = s * (0.24 + (i % 2) * 0.08);
      slab(rc, x, shelfY, bw, bh, s * 0.03, BOOK_COLORS[i % BOOK_COLORS.length], 0.35);
      x += bw + s * 0.05;
      i++;
    }
  },
  surfaceColor(surf: SurfaceDef): number | null {
    return surf.kind === 'table' ? 0x9c6b3e : null;
  },
  platformTop(rc: RoomCtx, surf: SurfaceDef, rect: ScreenRect): void {
    const ctx = rc.ctx;
    if (surf.kind === 'table') {
      // a runner cloth down the middle of the coffee/side table
      ctx.fillStyle = rgba(0xe8d4b0, 0.5);
      ctx.fillRect(rect.x + rect.w * 0.28, rect.y, rect.w * 0.44, rect.h);
      ctx.strokeStyle = rgba(0xb83c46, 0.4);
      ctx.lineWidth = Math.max(1, rc.scale * 0.03);
      ctx.strokeRect(rect.x + rect.w * 0.28, rect.y, rect.w * 0.44, rect.h);
      return;
    }
    // shelf/counter wood grain
    ctx.strokeStyle = rgba(darken(surf.kind === 'shelf' ? rc.pal.wood : rc.pal.counterTop, 0.4), 0.35);
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    const rows = Math.max(2, Math.round(rect.h / (rc.scale * 0.5)));
    for (let r = 1; r < rows; r++) {
      const yy = rect.y + (rect.h * r) / rows;
      ctx.beginPath();
      ctx.moveTo(rect.x + rect.w * 0.05, yy);
      ctx.lineTo(rect.x + rect.w * 0.95, yy);
      ctx.stroke();
    }
  },
};

registerRoom('living', living);
