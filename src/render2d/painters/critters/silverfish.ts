/**
 * PAINTER - Silverfish (id 'silverfish'). Sleek silver taper.
 * The quick wedge body, metallic rib marks, and three tail bristles give it a
 * bookmark-fast silhouette even at tiny scale.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('silverfish', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(mix(PAL.metal, PAL.flyWing, 0.38));
  const edge = darken(body, 0.22);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round';
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.021;
  for (const dx of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.moveTo(cx + size * dx * 0.5, cy + size * 0.33); ctx.quadraticCurveTo(cx + size * dx, cy + size * 0.47, cx + size * dx * 1.45, cy + size * 0.52); ctx.stroke(); }
  ctx.strokeStyle = hex(edge); ctx.fillStyle = hex(edge); ctx.lineWidth = size * 0.024;
  for (let i = 0; i < 4; i++) { const y = cy - size * 0.04 + i * size * 0.09; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.026; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.11, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.05 + kick); ctx.stroke(); } }

  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.33);
  ctx.quadraticCurveTo(cx + size * 0.19, cy - size * 0.16, cx + size * 0.13, cy + size * 0.24);
  ctx.quadraticCurveTo(cx + size * 0.05, cy + size * 0.36, cx, cy + size * 0.34);
  ctx.quadraticCurveTo(cx - size * 0.05, cy + size * 0.36, cx - size * 0.13, cy + size * 0.24);
  ctx.quadraticCurveTo(cx - size * 0.19, cy - size * 0.16, cx, cy - size * 0.33);
  ctx.closePath();
  ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.05, cy - size * 0.03, size * 0.06, size * 0.24, -0.08, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(body, 0.32), 0.58); ctx.fill();
  ctx.strokeStyle = rgba(edge, 0.75); ctx.lineWidth = size * 0.018;
  for (const dy of [-0.15, -0.05, 0.05, 0.15, 0.25]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.105, size * 0.015, 0, 0, Math.PI * 2); ctx.stroke(); }

  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.052; const ey = cy - size * 0.23; ctx.beginPath(); ctx.arc(ex, ey, size * 0.037, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.011); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.004, ey + size * 0.009, size * 0.017, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.008, ey - size * 0.008, size * 0.007, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});