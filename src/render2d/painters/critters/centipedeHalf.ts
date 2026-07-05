/**
 * PAINTER - Centipede Half (id 'centipede-half'). Medium split crawler.
 * Five rounded body beads and a blunt patched tail sell that this is the broken
 * middle form, without any gore.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, belly as bellyGrad } from '../../paint';

registerCritterPainter('centipede-half', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.01;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.slug, PAL.roach, 0.2));
  const r3 = ramp(base);
  const tail = warm(mix(PAL.moth, base, 0.55));
  const leg = mix(r3.shadow, 0x000000, 0.1);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.14, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.028; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 6; i++) { const y = cy - size * 0.19 + i * size * 0.078; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.028; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.1, y); ctx.lineTo(cx + sgn * size * 0.21, y + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.21, y + kick, size * 0.013, 0, Math.PI * 2); ctx.fill(); } }
  // V2: per-bead celCrescents read as spheres; ONE belly on the head bead.
  for (let i = 4; i >= 0; i--) {
    const y = cy - size * 0.19 + i * size * 0.09;
    const rx = size * 0.125;
    const ry = size * 0.065;
    const beadCol = i === 4 ? tail : mix(base, i & 1 ? PAL.stinkbug : PAL.slug, 0.18);
    ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = hex(beadCol); ctx.fill(); stroke(size * 0.032);
    if (i === 0) bellyGrad(ctx, cx, y, rx, ry, ramp(beadCol), 0.5);
    celCrescent(ctx, cx, y, rx, ry, ramp(beadCol).shadow, 0.45, 0.55);
  }
  ctx.strokeStyle = rgba(PAL.woodDark, 0.75); ctx.lineWidth = size * 0.018; ctx.beginPath(); ctx.moveTo(cx - size * 0.065, cy + size * 0.18); ctx.lineTo(cx + size * 0.065, cy + size * 0.23); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + size * 0.065, cy + size * 0.18); ctx.lineTo(cx - size * 0.065, cy + size * 0.23); ctx.stroke();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.05, cy - size * 0.195, size * 0.043, sgn);
});
