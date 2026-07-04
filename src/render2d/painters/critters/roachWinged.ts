/**
 * PAINTER - Winged Roach (id 'roach-winged'). Betrayal flier roach.
 * It keeps the roach oval and antennae, but the unfolded translucent wings
 * become the dominant shape; no baked shadow.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('roach-winged', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(PAL.roach);
  const shell = warm(lighten(PAL.roach, 0.1));
  const wing = PAL.flyWing;
  const leg = darken(body, 0.34);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const spread = frame ? 0.62 : 0.52;

  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.11;
    const wy = cy - size * 0.02;
    ctx.save(); ctx.translate(wx + sgn * size * spread * 0.32, wy - size * 0.08); ctx.rotate(sgn * 0.58);
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.23, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.55 : 0.46); ctx.fill(); stroke(size * 0.018);
    ctx.strokeStyle = rgba(PAL.flyBody, 0.42); ctx.lineWidth = size * 0.011; ctx.beginPath(); ctx.moveTo(-size * 0.17, 0); ctx.lineTo(size * 0.17, -size * 0.01); ctx.stroke();
    ctx.restore();
  }

  ctx.lineCap = 'round'; ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.24); ctx.quadraticCurveTo(cx + sgn * size * 0.2, cy - size * 0.42, cx + sgn * size * 0.13, cy - size * 0.49); ctx.stroke(); }
  ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.033;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.05 + i * size * 0.11; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.12, y); ctx.lineTo(cx + sgn * size * 0.27, y + size * 0.06 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.27, y + size * 0.06 + kick, size * 0.014, 0, Math.PI * 2); ctx.fill(); } }

  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.1, size * 0.18, size * 0.31, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.04, size * 0.12, size * 0.23, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(shell, 0.62); ctx.fill();
  ctx.strokeStyle = rgba(darken(body, 0.34), 0.78); ctx.lineWidth = size * 0.022; ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.16); ctx.lineTo(cx, cy + size * 0.34); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.22, size * 0.13, size * 0.11, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(body, 0.1)); ctx.fill(); stroke();

  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.23; ctx.beginPath(); ctx.arc(ex, ey, size * 0.043, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});