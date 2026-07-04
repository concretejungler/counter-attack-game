/**
 * PAINTER - Pillbug (id 'pillbug'). Rolling armored marble bug.
 * A near-circle stack of cocoa-rimmed plates and little tucked feet exaggerate
 * the roll-up silhouette.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('pillbug', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const shell = warm(mix(PAL.stinkbug, PAL.flyBody, 0.38));
  const plate = warm(lighten(shell, 0.14));
  const leg = darken(shell, 0.36);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.04 + i * size * 0.12; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.025; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.18, y); ctx.lineTo(cx + sgn * size * 0.26, y + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.27, y + kick, size * 0.018, 0, Math.PI * 2); ctx.fill(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.25, size * 0.31, 0, 0, Math.PI * 2); ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.06, cy - size * 0.04, size * 0.1, size * 0.17, -0.2, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(shell, 0.35), 0.45); ctx.fill();
  ctx.strokeStyle = rgba(darken(shell, 0.32), 0.8); ctx.lineWidth = size * 0.026;
  for (const dy of [-0.15, -0.05, 0.05, 0.15, 0.25]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * (0.2 - Math.abs(dy) * 0.18), size * 0.022, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.22, size * 0.16, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = hex(plate); ctx.fill(); stroke();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.06; const ey = cy - size * 0.22; ctx.beginPath(); ctx.arc(ex, ey, size * 0.043, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.004, ey + size * 0.011, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
