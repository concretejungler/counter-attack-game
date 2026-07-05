/**
 * PAINTER - Termite (id 'termite'). Pale wood chewer.
 * A soft pale segmented body and oversized cocoa mandibles sell the wall-eater
 * job immediately while staying cartoon-friendly.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('termite', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(mix(PAL.cakeSponge, PAL.moth, 0.45));
  // contrast armor (QA P4): keep the pale wood-chewer body, but give it a saturated
  // amber head so it holds on light kitchen/attic floors instead of pale-on-pale.
  const head = warm(mix(PAL.cakeSponge, PAL.antBullet, 0.6));
  const leg = darken(head, 0.4);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.05 + i * size * 0.11; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.11, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.05 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.24, y + size * 0.05 + kick, size * 0.014, 0, Math.PI * 2); ctx.fill(); } }

  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.14, size * 0.17, size * 0.24, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.04, cy + size * 0.1, size * 0.06, size * 0.16, -0.15, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(body, 0.32), 0.55); ctx.fill();
  ctx.strokeStyle = rgba(darken(body, 0.24), 0.74); ctx.lineWidth = size * 0.022; for (const dy of [0, 0.1, 0.2, 0.29]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.145, size * 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.16, size * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = hex(head); ctx.fill(); stroke();

  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.044; ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.07, cy - size * 0.27); ctx.quadraticCurveTo(cx + sgn * size * 0.21, cy - size * 0.36, cx + sgn * size * 0.11, cy - size * 0.45); ctx.stroke(); }
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.19; ctx.beginPath(); ctx.arc(ex, ey, size * 0.043, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.011, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.01, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});