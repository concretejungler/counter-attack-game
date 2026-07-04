/**
 * PAINTER - Dust Bunny (id 'dust-bunny'). Big under-couch fluffball.
 * A lumpy cloud body, rabbit-ear dust tufts, and stubby shuffling feet make the
 * split-prone dust creature read instantly.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('dust-bunny', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fluff = warm(PAL.dustBunny);
  const cool = warm(mix(PAL.dustBunny, PAL.flyWing, 0.2));
  const dark = darken(PAL.dustBunny, 0.24);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const puff = (x: number, y: number, r: number, fill: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(size * 0.027); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.14, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = rgba(dark, 0.7); ctx.lineWidth = size * 0.034;
  for (const sgn of [-1, 1]) { const kick = (frame ? 1 : -1) * size * 0.03; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.09, cy + size * 0.14); ctx.lineTo(cx + sgn * size * 0.18, cy + size * 0.25 + kick); ctx.stroke(); }
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.075, cy - size * 0.23, size * 0.055, size * 0.14, sgn * 0.24, 0, Math.PI * 2); ctx.fillStyle = hex(cool); ctx.fill(); stroke(size * 0.024); }
  puff(cx - size * 0.11, cy - size * 0.02, size * 0.14, cool);
  puff(cx + size * 0.12, cy - size * 0.01, size * 0.15, fluff);
  puff(cx, cy + size * 0.1, size * 0.19, fluff);
  puff(cx - size * 0.02, cy - size * 0.08, size * 0.15, lighten(fluff, 0.08));
  ctx.beginPath(); ctx.ellipse(cx - size * 0.07, cy - size * 0.04, size * 0.08, size * 0.055, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(fluff, 0.35), 0.45); ctx.fill();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.065, cy - size * 0.06, size * 0.05, sgn);
});
