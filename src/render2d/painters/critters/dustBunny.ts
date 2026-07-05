/**
 * PAINTER - Dust Bunny (id 'dust-bunny'). Big under-couch fluffball.
 * A lumpy cloud body, rabbit-ear dust tufts, and stubby shuffling feet make the
 * split-prone dust creature read instantly.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, belly as bellyGrad, furEdgePath } from '../../paint';

registerCritterPainter('dust-bunny', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fluff = warm(PAL.dustBunny);
  const r3 = ramp(fluff);
  const cool = warm(mix(PAL.dustBunny, PAL.flyWing, 0.2));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.14, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  // feet (behind the fluff)
  ctx.lineCap = 'round'; ctx.strokeStyle = rgba(r3.shadow, 0.7); ctx.lineWidth = size * 0.034;
  for (const sgn of [-1, 1]) { const kick = (frame ? 1 : -1) * size * 0.03; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.09, cy + size * 0.14); ctx.lineTo(cx + sgn * size * 0.18, cy + size * 0.25 + kick); ctx.stroke(); }
  // ear tufts (behind, tucked under the fluff base)
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.075, cy - size * 0.23, size * 0.055, size * 0.14, sgn * 0.24, 0, Math.PI * 2); ctx.fillStyle = hex(cool); ctx.fill(); stroke(size * 0.024); }

  // V2: the silhouette is a SCALLOPED fur edge (not a smooth blob), filled +
  // stroked as one Path2D; belly + cel give it volume, a cool lump adds lint.
  const fur = furEdgePath(cx, cy + size * 0.01, size * 0.24, size * 0.235, 11, 0.22, 7);
  ctx.fillStyle = hex(fluff); ctx.fill(fur);
  ctx.lineWidth = ink; ctx.strokeStyle = COCOA_CSS; ctx.stroke(fur);
  ctx.save();
  ctx.clip(fur);
  bellyGrad(ctx, cx, cy + size * 0.01, size * 0.21, size * 0.205, r3, 0.5);
  celCrescent(ctx, cx, cy + size * 0.01, size * 0.24, size * 0.235, r3.shadow, 0.42, 0.5);
  ctx.beginPath(); ctx.ellipse(cx + size * 0.09, cy - size * 0.01, size * 0.11, size * 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(cool, 0.5); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.07, cy - size * 0.05, size * 0.09, size * 0.06, -0.3, 0, Math.PI * 2); ctx.fillStyle = rgba(r3.light, 0.55); ctx.fill();
  ctx.restore();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.065, cy - size * 0.06, size * 0.05, sgn);
});
