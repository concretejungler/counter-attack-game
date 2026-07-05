/**
 * BEDROOM ("Lights Out", DARK): lifted-indigo carpet, warm lamp pools + cool moonlight pools.
 * Legibility rule (BUILDLOG "dark albedo + dim light = invisible game"): the carpet albedo is
 * LIFTED well above the near-black palette floor, the mood wash is only moderate, and the lamp/
 * moon light-pools are drawn AFTER the wash so they re-brighten the play area for sprites.
 */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  carpetFloor, moodWash, vignette, lightPool, beamWedge, slab,
  hex, rgba, lighten,
} from './shared';

const bedroom: RoomTreatment = {
  floor(rc: RoomCtx): void {
    // lift the near-black palette carpet so a critter over unlit carpet still reads
    carpetFloor(rc, lighten(rc.pal.floorTileA, 0.18));
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0x1e2648, 0.16);
    vignette(rc, 0x05040e, 0.32, 0.4);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // cool moonbeam from the window (top) + a moon pool
    beamWedge(rc, wx(0.5), wy(-0.02), -f.cols * 0.06 * s, f.rows * 0.7 * s, s * 3, rc.pal.sunbeam, 0.12);
    lightPool(rc, wx(0.5), wy(0.12), s * 3, 0xaebcff, 0.16);
    // warm lamp pools — the main light source; these keep the play area readable
    lightPool(rc, wx(0.24), wy(0.34), s * 3.2, rc.pal.practicalColor, 0.26);
    lightPool(rc, wx(0.78), wy(0.72), s * 3.2, rc.pal.practicalColor, 0.26);
    // bed silhouette along the left wall: frame + mattress + pillow
    const bx = wx(0.03);
    const by = wy(0.4);
    slab(rc, bx, by, s * 3.0, s * 4.2, s * 0.18, rc.pal.woodDark, 0.6);
    slab(rc, bx + s * 0.25, by + s * 0.25, s * 2.5, s * 3.7, s * 0.14, lighten(rc.pal.cabinet, 0.05), 0.4, false);
    slab(rc, bx + s * 0.5, by + s * 0.45, s * 2.0, s * 0.9, s * 0.16, lighten(rc.pal.counterTop, 0.22), 0.3, false);
    // little rug catching the moon
    ctx.beginPath();
    ctx.ellipse(wx(0.55), wy(0.6), s * 1.8, s * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0x3a3f66, 0.5);
    ctx.fill();
    ctx.strokeStyle = rgba(0x8f9cff, 0.28);
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.stroke();
  },
  surfaceColor(surf: SurfaceDef, pal): number | null {
    // lift dresser/nightstand tops so placed towers sit on a readable slab
    return surf.kind === 'floor' ? null : lighten(pal.counterTop, 0.14);
  },
  platformTop(rc: RoomCtx, _surf: SurfaceDef, rect: ScreenRect): void {
    // drawer pulls on the dresser top
    const ctx = rc.ctx;
    ctx.fillStyle = rgba(0xffe0a0, 0.5);
    const n = Math.max(1, Math.round(rect.w / (rc.scale * 1.4)));
    for (let i = 0; i < n; i++) {
      const px = rect.x + (rect.w * (i + 0.5)) / n;
      ctx.beginPath();
      ctx.arc(px, rect.y + rect.h * 0.5, Math.max(1.5, rc.scale * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    if (spawn.kind !== 'window') return false;
    const ctx = rc.ctx;
    // moonlit window: cool glass, muntins, a pale moon disc + glow
    lightPool(rc, cx, cy, s * 1.4, 0xaebcff, 0.3);
    rc.roundRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84, s * 0.06);
    ctx.fillStyle = hex(lighten(rc.pal.windowSky, 0.1));
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.strokeStyle = rgba(0xcfd8ff, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + s * 0.14, cy - s * 0.12, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0xf4f4ff, 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.42); ctx.lineTo(cx, cy + s * 0.42);
    ctx.moveTo(cx - s * 0.42, cy); ctx.lineTo(cx + s * 0.42, cy);
    ctx.strokeStyle = rgba(0xcfd8ff, 0.6);
    ctx.stroke();
    return true;
  },
};

registerRoom('bedroom', bedroom);
