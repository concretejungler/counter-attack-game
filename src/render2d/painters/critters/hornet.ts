/**
 * PAINTER - Hornet (id 'hornet'). Armored striped flier.
 * The huge amber head, tight armor bands, and long cocoa stinger make it read
 * as a wasp that found a helmet, with buzzing wings and no baked shadow.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('hornet', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const amber = warm(mix(PAL.butter, PAL.flame, 0.42));
  const dark = warm(darken(PAL.roach, 0.05));
  const wing = PAL.flyWing;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const thoraxY = cy - size * 0.04;

  const spread = frame ? 0.57 : 0.45;
  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.12;
    const wy = thoraxY - size * 0.02;
    const tipX = wx + sgn * size * spread;
    const tipY = wy - size * 0.27;
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * (0.86 + (frame ? 0.14 : 0))); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.22, size * 0.09, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.28 : 0.18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * 0.75); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.2, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, 0.62); ctx.fill(); stroke(size * 0.018); ctx.strokeStyle = rgba(PAL.flyBody, 0.45); ctx.lineWidth = size * 0.011; ctx.beginPath(); ctx.moveTo(-size * 0.16, 0); ctx.lineTo(size * 0.16, -size * 0.005); ctx.stroke(); ctx.restore();
  }

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.022; ctx.strokeStyle = hex(darken(dark, 0.15));
  for (let i = 0; i < 3; i++) { const ly = thoraxY + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.028; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, ly); ctx.lineTo(cx + sgn * size * 0.2, ly + size * 0.04 + kick); ctx.stroke(); } }

  ctx.beginPath(); ctx.moveTo(cx - size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx + size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.31, cx - size * 0.1, cy + size * 0.18); ctx.fillStyle = hex(dark); ctx.fill(); stroke(size * 0.028);
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.12, size * 0.15, size * 0.23, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  ctx.strokeStyle = hex(dark); ctx.lineWidth = size * 0.04; for (const dy of [0.01, 0.11, 0.21]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.13, size * 0.022, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, thoraxY, size * 0.13, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(dark); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.04, thoraxY - size * 0.03, size * 0.055, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(dark, 0.32), 0.45); ctx.fill();

  const eyeY = cy - size * 0.21;
  ctx.beginPath(); ctx.ellipse(cx, eyeY, size * 0.14, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.065;
    ctx.beginPath(); ctx.ellipse(ex, eyeY, size * 0.066, size * 0.076, sgn * 0.1, 0, Math.PI * 2); ctx.fillStyle = hex(mix(PAL.cherry, dark, 0.35)); ctx.fill(); stroke(size * 0.02);
    ctx.beginPath(); ctx.arc(ex - sgn * size * 0.018, eyeY - size * 0.025, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
