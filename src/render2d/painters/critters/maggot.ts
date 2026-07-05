/**
 * PAINTER - Maggot (id 'maggot'). Squishy rice-grain larva.
 * A pale segmented bean body, tiny face end, and dotted nubs make the simple
 * silhouette read as a larva instead of a worm.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('maggot', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(mix(PAL.moth, PAL.cakeSponge, 0.42));
  const head = warm(mix(PAL.moth, PAL.flame, 0.18));
  // contrast armor (QA P4): dusty-rose segment shadows give the pale rice-grain
  // larva readable creases on light floors while staying species-true (soft/pink).
  const crease = warm(darken(mix(PAL.cakeFrosting, PAL.roach, 0.3), 0.06));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(crease); ctx.fillStyle = hex(crease); ctx.lineWidth = size * 0.026;
  for (let i = 0; i < 4; i++) { const y = cy - size * 0.04 + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.018; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sgn * size * 0.17, y + kick, size * 0.017, 0, Math.PI * 2); ctx.fill(); } }

  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.07, size * 0.19, size * 0.31, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.05, cy - size * 0.03, size * 0.08, size * 0.18, -0.15, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(body, 0.34), 0.55); ctx.fill();
  ctx.strokeStyle = rgba(crease, 0.78); ctx.lineWidth = size * 0.025;
  for (const dy of [-0.09, 0.01, 0.11, 0.21]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.165, size * 0.021, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.24, size * 0.14, size * 0.11, 0, 0, Math.PI * 2); ctx.fillStyle = hex(head); ctx.fill(); stroke();

  const eyeR = size * 0.038;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.047;
    const ey = cy - size * 0.25;
    ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012);
    ctx.beginPath(); ctx.arc(ex + sgn * eyeR * 0.1, ey + eyeR * 0.25, eyeR * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.22, ey - eyeR * 0.22, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.2, size * 0.045, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.018; ctx.stroke();
});
