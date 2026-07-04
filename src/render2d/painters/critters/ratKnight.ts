/**
 * PAINTER - Rat Knight (id 'rat-knight'). Armored pantry rat.
 * A broad bottle-cap shield, tiny lance, helmet ears, and whisker snout define
 * the knight silhouette.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('rat-knight', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fur = warm(darken(PAL.mouse, 0.08));
  const pink = warm(PAL.mousePink);
  const metal = warm(PAL.metal);
  const shield = warm(mix(PAL.metal, PAL.denim, 0.35));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(pink); ctx.lineWidth = size * 0.03; ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.25); ctx.quadraticCurveTo(cx + size * 0.28, cy + size * 0.38, cx + size * 0.11, cy + size * 0.47); ctx.stroke();
  ctx.strokeStyle = hex(darken(fur, 0.35)); ctx.fillStyle = hex(darken(fur, 0.35)); ctx.lineWidth = size * 0.038;
  for (let i = 0; i < 2; i++) { const y = cy + size * (0.03 + i * 0.16); const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.13, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.06 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.24, y + size * 0.06 + kick, size * 0.019, 0, Math.PI * 2); ctx.fill(); } }
  ctx.beginPath(); ctx.moveTo(cx - size * 0.17, cy - size * 0.05); ctx.lineTo(cx + size * 0.24, cy - size * 0.28); ctx.strokeStyle = hex(PAL.woodDark); ctx.lineWidth = size * 0.026; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + size * 0.24, cy - size * 0.28); ctx.lineTo(cx + size * 0.31, cy - size * 0.31); ctx.lineTo(cx + size * 0.27, cy - size * 0.23); ctx.closePath(); ctx.fillStyle = hex(PAL.metal); ctx.fill(); stroke(size * 0.013);
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.14, cy - size * 0.21, size * 0.08, size * 0.095, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.14, cy - size * 0.21, size * 0.043, size * 0.055, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = rgba(pink, 0.7); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.18, size * 0.27, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.12, size * 0.19, 0, 0, Math.PI * 2); ctx.fillStyle = hex(metal); ctx.fill(); stroke(size * 0.024);
  ctx.beginPath(); ctx.ellipse(cx - size * 0.16, cy + size * 0.05, size * 0.12, size * 0.17, -0.25, 0, Math.PI * 2); ctx.fillStyle = hex(shield); ctx.fill(); stroke(); ctx.strokeStyle = rgba(darken(shield, 0.3), 0.8); ctx.lineWidth = size * 0.018; ctx.beginPath(); ctx.arc(cx - size * 0.16, cy + size * 0.05, size * 0.07, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.15, size * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.24, size * 0.14, Math.PI, 0); ctx.lineTo(cx + size * 0.14, cy - size * 0.17); ctx.lineTo(cx - size * 0.14, cy - size * 0.17); ctx.closePath(); ctx.fillStyle = hex(metal); ctx.fill(); stroke(size * 0.024);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.29, size * 0.034, size * 0.022, 0, 0, Math.PI * 2); ctx.fillStyle = hex(pink); ctx.fill(); stroke(size * 0.012);
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.2; ctx.beginPath(); ctx.arc(ex, ey, size * 0.041, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
