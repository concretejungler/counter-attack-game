/**
 * PAINTER - Mouse Thief (id 'mouse-thief'). Cake-snatching mouse.
 * Big round ears, long tail, and an oversized stolen cheese/cake wedge clutched
 * to the belly make the thief readable at small size.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('mouse-thief', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fur = warm(PAL.mouse);
  const belly = warm(lighten(PAL.mouse, 0.2));
  const pink = warm(PAL.mousePink);
  const cake = warm(PAL.cakeSponge);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(pink); ctx.lineWidth = size * 0.034; ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.22); ctx.quadraticCurveTo(cx + size * 0.28, cy + size * 0.36, cx + size * 0.11, cy + size * 0.47); ctx.stroke();
  ctx.strokeStyle = hex(darken(fur, 0.28)); ctx.fillStyle = hex(darken(fur, 0.28)); ctx.lineWidth = size * 0.04;
  for (let i = 0; i < 2; i++) { const y = cy + size * (0.05 + i * 0.16); const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.035; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.12, y); ctx.lineTo(cx + sgn * size * 0.22, y + size * 0.05 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.22, y + size * 0.05 + kick, size * 0.02, 0, Math.PI * 2); ctx.fill(); } }
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.14, cy - size * 0.23, size * 0.095, size * 0.105, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.14, cy - size * 0.23, size * 0.052, size * 0.062, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = rgba(pink, 0.75); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.18, size * 0.26, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.11, size * 0.1, size * 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(belly, 0.7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.15, size * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.13, cy + size * 0.06); ctx.lineTo(cx + size * 0.11, cy - size * 0.01); ctx.lineTo(cx + size * 0.08, cy + size * 0.17); ctx.closePath(); ctx.fillStyle = hex(cake); ctx.fill(); stroke(size * 0.024);
  ctx.beginPath(); ctx.arc(cx + size * 0.02, cy + size * 0.05, size * 0.022, 0, Math.PI * 2); ctx.fillStyle = rgba(darken(cake, 0.28), 0.55); ctx.fill(); ctx.beginPath(); ctx.arc(cx - size * 0.06, cy + size * 0.08, size * 0.016, 0, Math.PI * 2); ctx.fill();

  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.2; ctx.beginPath(); ctx.arc(ex, ey, size * 0.046, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.014); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.023, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.011, ey - size * 0.012, size * 0.009, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.29, size * 0.032, size * 0.022, 0, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.011; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.02, cy - size * 0.27); ctx.lineTo(cx + sgn * size * 0.15, cy - size * 0.28); ctx.stroke(); }
});
