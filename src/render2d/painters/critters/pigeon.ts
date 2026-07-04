/**
 * PAINTER - Pigeon (id 'pigeon'). Huge city-bird flier.
 * A chunky gray body, neck sheen, big staring city eyes, and broad wing flaps
 * make the oversized flying threat read clearly with no baked shadow.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('pigeon', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const gray = warm(mix(PAL.mouse, PAL.flyBody, 0.25));
  const wing = warm(darken(gray, 0.12));
  const neck = warm(mix(PAL.mint, PAL.denim, 0.38));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const flap = frame ? 1 : -1;

  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.09, cy - size * 0.05); ctx.quadraticCurveTo(cx + sgn * size * 0.46, cy - size * (0.28 + flap * 0.03), cx + sgn * size * 0.42, cy + size * 0.18); ctx.quadraticCurveTo(cx + sgn * size * 0.27, cy + size * 0.34, cx + sgn * size * 0.1, cy + size * 0.14); ctx.closePath(); ctx.fillStyle = hex(wing); ctx.fill(); stroke(size * 0.03);
    ctx.strokeStyle = rgba(darken(wing, 0.28), 0.65); ctx.lineWidth = size * 0.018; for (const t of [0.14, 0.24, 0.34]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.13, cy + size * 0.02); ctx.lineTo(cx + sgn * size * t, cy + size * 0.23); ctx.stroke(); }
  }

  ctx.strokeStyle = hex(darken(gray, 0.35)); ctx.lineWidth = size * 0.033; ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) { const kick = (frame ? 1 : -1) * size * 0.025; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy + size * 0.28); ctx.lineTo(cx + sgn * size * 0.1, cy + size * 0.39 + kick); ctx.lineTo(cx + sgn * size * 0.16, cy + size * 0.39 + kick); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.1, size * 0.22, size * 0.31, 0, 0, Math.PI * 2); ctx.fillStyle = hex(gray); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.06, cy, size * 0.11, size * 0.18, -0.2, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(gray, 0.34), 0.45); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.16, size * 0.14, size * 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = hex(neck); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.3, size * 0.15, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(gray); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.035, cy - size * 0.4); ctx.lineTo(cx, cy - size * 0.5); ctx.lineTo(cx + size * 0.035, cy - size * 0.4); ctx.closePath(); ctx.fillStyle = hex(PAL.flame); ctx.fill(); stroke(size * 0.02);
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.062; const ey = cy - size * 0.31; ctx.beginPath(); ctx.arc(ex, ey, size * 0.047, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.014); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.006, ey + size * 0.012, size * 0.024, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.012, ey - size * 0.013, size * 0.009, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
