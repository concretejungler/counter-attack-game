/**
 * PAINTER - Possum Jr. (id 'possum-jr'). Dramatic fainting baby possum.
 * Big ears, mask patches, curled tail, and little acting paws carry the possum
 * silhouette while the walk frame wiggles the feet.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('possum-jr', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fur = warm(lighten(PAL.mouse, 0.08));
  const mask = warm(darken(PAL.mouse, 0.32));
  const pink = warm(PAL.mousePink);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(pink); ctx.lineWidth = size * 0.032; ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.24); ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.39, cx - size * 0.11, cy + size * 0.47); ctx.stroke();
  ctx.strokeStyle = hex(mask); ctx.fillStyle = hex(mask); ctx.lineWidth = size * 0.04;
  for (let i = 0; i < 2; i++) { const y = cy + size * (0.04 + i * 0.16); const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.13, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.06 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.24, y + size * 0.06 + kick, size * 0.02, 0, Math.PI * 2); ctx.fill(); } }
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.15, cy - size * 0.23, size * 0.095, size * 0.12, sgn * 0.3, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.15, cy - size * 0.23, size * 0.052, size * 0.07, sgn * 0.3, 0, Math.PI * 2); ctx.fillStyle = rgba(pink, 0.75); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.19, size * 0.27, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.11, size * 0.11, size * 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(fur, 0.24), 0.7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.15, size * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.058, cy - size * 0.2, size * 0.055, size * 0.07, sgn * 0.25, 0, Math.PI * 2); ctx.fillStyle = hex(mask); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.29, size * 0.036, size * 0.024, 0, 0, Math.PI * 2); ctx.fillStyle = hex(pink); ctx.fill(); stroke(size * 0.012);
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.058; const ey = cy - size * 0.2; ctx.beginPath(); ctx.arc(ex, ey, size * 0.041, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
