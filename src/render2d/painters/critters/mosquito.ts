/**
 * PAINTER - Mosquito (id 'mosquito'). Needle-nosed healer flier.
 * The oversized proboscis, lanky legs, and translucent buzz wings make the tiny
 * flying silhouette read instantly, without any baked shadow.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('mosquito', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(mix(PAL.flyBody, PAL.slug, 0.28));
  const belly = warm(lighten(body, 0.12));
  const wing = PAL.flyWing;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const thoraxY = cy - size * 0.04;

  const spread = frame ? 0.55 : 0.43;
  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.09; const wy = thoraxY - size * 0.02; const tipX = wx + sgn * size * spread; const tipY = wy - size * 0.29;
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * (0.82 + (frame ? 0.15 : 0))); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.2, size * 0.07, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.28 : 0.18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * 0.72); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.18, size * 0.065, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, 0.6); ctx.fill(); stroke(size * 0.017); ctx.restore();
  }

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(darken(body, 0.35)); ctx.lineWidth = size * 0.016;
  for (let i = 0; i < 3; i++) { const ly = thoraxY + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.06, ly); ctx.lineTo(cx + sgn * size * 0.2, ly + size * 0.04 + kick); ctx.lineTo(cx + sgn * size * 0.26, ly + size * 0.09 + kick); ctx.stroke(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.13, size * 0.09, size * 0.2, 0, 0, Math.PI * 2); ctx.fillStyle = hex(belly); ctx.fill(); stroke();
  ctx.strokeStyle = rgba(darken(belly, 0.28), 0.75); ctx.lineWidth = size * 0.018; for (const dy of [0.04, 0.13, 0.22]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.075, size * 0.014, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, thoraxY, size * 0.095, size * 0.105, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.22); ctx.lineTo(cx, cy - size * 0.47); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.025; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.48, size * 0.018, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.cherry); ctx.fill(); stroke(size * 0.011);

  const eyeY = cy - size * 0.2;
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.055; ctx.beginPath(); ctx.ellipse(ex, eyeY, size * 0.06, size * 0.07, sgn * 0.1, 0, Math.PI * 2); ctx.fillStyle = hex(mix(PAL.cherry, PAL.flyBody, 0.25)); ctx.fill(); stroke(size * 0.018); ctx.beginPath(); ctx.arc(ex - sgn * size * 0.018, eyeY - size * 0.023, size * 0.019, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
