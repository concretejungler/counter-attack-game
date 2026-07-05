/**
 * PAINTER - Dust Bunnette (id 'dust-bunnette'). Small angry dust puff.
 * A tiny lint cloud with two ear tufts keeps the split-child form readable and
 * cute next to the larger dust bunny.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('dust-bunnette', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  // QA P4: tell her apart from Dust Bunny — a slightly pinker fluff tint + a red bow.
  const fluff = warm(mix(PAL.dustBunny, PAL.mousePink, 0.22));
  const cool = warm(mix(fluff, PAL.flyWing, 0.22));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const puff = (x: number, y: number, r: number, fill: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(size * 0.026); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.12, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = rgba(darken(fluff, 0.25), 0.7); ctx.lineWidth = size * 0.03;
  for (const sgn of [-1, 1]) { const kick = (frame ? 1 : -1) * size * 0.025; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.07, cy + size * 0.11); ctx.lineTo(cx + sgn * size * 0.16, cy + size * 0.19 + kick); ctx.stroke(); }
  puff(cx - size * 0.08, cy - size * 0.02, size * 0.105, cool);
  puff(cx + size * 0.08, cy, size * 0.11, fluff);
  puff(cx, cy + size * 0.08, size * 0.13, fluff);
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.065, cy - size * 0.18, size * 0.04, size * 0.105, sgn * 0.25, 0, Math.PI * 2); ctx.fillStyle = hex(cool); ctx.fill(); stroke(size * 0.022); }
  // little red hair-bow between the ear tufts (readable at 24px = the distinguishing cue)
  const bowY = cy - size * 0.235;
  ctx.fillStyle = hex(PAL.cherry);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, bowY);
    ctx.lineTo(cx + sgn * size * 0.1, bowY - size * 0.06);
    ctx.lineTo(cx + sgn * size * 0.1, bowY + size * 0.06);
    ctx.closePath();
    ctx.fill(); stroke(size * 0.018);
  }
  ctx.beginPath(); ctx.arc(cx, bowY, size * 0.032, 0, Math.PI * 2); ctx.fillStyle = hex(darken(PAL.cherry, 0.14)); ctx.fill(); stroke(size * 0.016);
  ctx.beginPath(); ctx.ellipse(cx - size * 0.045, cy + size * 0.015, size * 0.06, size * 0.04, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(fluff, 0.35), 0.45); ctx.fill();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.055, cy - size * 0.015, size * 0.043, sgn);
});
