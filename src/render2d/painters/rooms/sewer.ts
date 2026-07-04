/**
 * SEWER (DARK, green): lifted running-bond brick + a water channel, wall pipes, eerie drip glows,
 * a manhole. Legibility: brick albedo lifted above the murky palette, the green wash is moderate,
 * and the drain/drip glow-pools keep the walkway readable — sprites read against a lit-brick floor.
 */
import { registerRoom, type RoomCtx, type RoomTreatment, type ScreenRect } from './registry';
import type { SurfaceDef, SpawnDef } from '../../../sim/types';
import {
  brickFloor, moodWash, vignette, lightPool, slab,
  hex, rgba, lighten, darken,
} from './shared';

const sewer: RoomTreatment = {
  floor(rc: RoomCtx): void {
    brickFloor(rc, lighten(rc.pal.floorTileA, 0.17), rc.pal.groutAlpha);
    // water channel running along the lower third
    const { x, y, w, h } = rc.floorRect;
    const ctx = rc.ctx;
    const chY = y + h * 0.66;
    const chH = h * 0.22;
    ctx.fillStyle = rgba(0x123024, 0.5);
    ctx.fillRect(x, chY, w, chH);
    // sheen ripples
    ctx.strokeStyle = rgba(0x6fc890, 0.18);
    ctx.lineWidth = Math.max(1, rc.scale * 0.03);
    for (let i = 0; i < 3; i++) {
      const yy = chY + chH * (0.3 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(0x040806, 0.6);
    ctx.lineWidth = Math.max(1.5, rc.scale * 0.05);
    ctx.beginPath(); ctx.moveTo(x, chY); ctx.lineTo(x + w, chY);
    ctx.moveTo(x, chY + chH); ctx.lineTo(x + w, chY + chH); ctx.stroke();
  },
  tint(rc: RoomCtx): void {
    moodWash(rc, 0x0c2016, 0.13);
    vignette(rc, 0x020604, 0.3, 0.42);
  },
  decor(rc: RoomCtx): void {
    const f = rc.floor;
    const s = rc.scale;
    const ctx = rc.ctx;
    const wx = (fx: number) => rc.cam.worldToScreenX(f.origin.x + f.cols * fx);
    const wy = (fz: number) => rc.cam.worldToScreenY(f.origin.z + f.rows * fz);
    // eerie drain-glow pools (the "light" down here)
    lightPool(rc, wx(0.5), wy(0.4), s * 3.4, rc.pal.practicalColor, 0.16);
    lightPool(rc, wx(0.16), wy(0.72), s * 2.4, rc.pal.keyColor, 0.14);
    // fat pipes running along the top wall
    for (let i = 0; i < 3; i++) {
      const py = wy(0.02) + i * s * 0.55;
      slab(rc, rc.floorRect.x, py, rc.floorRect.w, s * 0.44, s * 0.22, rc.pal.metal, 0.5);
      ctx.fillStyle = rgba(0xffffff, 0.14);
      ctx.fillRect(rc.floorRect.x, py + s * 0.06, rc.floorRect.w, s * 0.08);
    }
    // a couple of algae patches
    for (const [fx, fz, rr] of [[0.34, 0.55, 1.0], [0.62, 0.5, 0.7]] as [number, number, number][]) {
      ctx.beginPath();
      ctx.ellipse(wx(fx), wy(fz), s * rr, s * rr * 0.6, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0x2f6a3c, 0.3);
      ctx.fill();
    }
  },
  surfaceColor(surf: SurfaceDef, pal): number | null {
    return surf.kind === 'floor' ? null : lighten(pal.counterTop, 0.1);
  },
  platformTop(rc: RoomCtx, _surf: SurfaceDef, rect: ScreenRect): void {
    // wet-stone sheen
    const ctx = rc.ctx;
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, rgba(0x9fe8c0, 0.14));
    g.addColorStop(0.5, rgba(0x9fe8c0, 0));
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  },
  marker(rc: RoomCtx, spawn: SpawnDef, cx: number, cy: number, s: number): boolean {
    const ctx = rc.ctx;
    if (spawn.kind === 'drain') {
      // heavy round manhole cover: radial spokes + concentric rings + pick holes
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.44, 0, Math.PI * 2);
      ctx.fillStyle = hex(darken(rc.pal.metalDark, 0.05));
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.strokeStyle = rgba(0x040806, 0.9);
      ctx.stroke();
      ctx.strokeStyle = rgba(lighten(rc.pal.metal, 0.05), 0.7);
      ctx.lineWidth = Math.max(1, s * 0.03);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.14, cy + Math.sin(a) * s * 0.14);
        ctx.lineTo(cx + Math.cos(a) * s * 0.38, cy + Math.sin(a) * s * 0.38);
        ctx.stroke();
      }
      for (const rr of [0.34, 0.2]) {
        ctx.beginPath();
        ctx.arc(cx, cy, s * rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      return true;
    }
    if (spawn.kind === 'vent') {
      // pipe mouth: ring with a dark bore + green ooze glow
      lightPool(rc, cx, cy, s * 0.9, rc.pal.practicalColor, 0.22);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = hex(rc.pal.metal);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.strokeStyle = rgba(0x040806, 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = hex(0x08140c);
      ctx.fill();
      return true;
    }
    if (spawn.kind === 'crack') {
      // barred storm grate
      rc.roundRect(cx - s * 0.4, cy - s * 0.32, s * 0.8, s * 0.64, s * 0.05);
      ctx.fillStyle = hex(darken(rc.pal.metalDark, 0.1));
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.strokeStyle = rgba(0x040806, 0.9);
      ctx.stroke();
      ctx.strokeStyle = rgba(lighten(rc.pal.metal, 0.08), 0.7);
      ctx.lineWidth = Math.max(1, s * 0.05);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * s * 0.15, cy - s * 0.28);
        ctx.lineTo(cx + i * s * 0.15, cy + s * 0.28);
        ctx.stroke();
      }
      return true;
    }
    return false;
  },
};

registerRoom('sewer', sewer);
