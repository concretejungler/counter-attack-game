/**
 * PAINTER - Cockroach (id 'roach'). Flattened pantry survivor.
 * Long oval body, antennae, spiky legs, and a dark shield plate make the roach
 * read as tough and scuttly.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('roach', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(PAL.roach);
  const shell = warm(lighten(PAL.roach, 0.08));
  const leg = darken(body, 0.33);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.24); ctx.quadraticCurveTo(cx + sgn * size * 0.2, cy - size * 0.42, cx + sgn * size * 0.13, cy - size * 0.49); ctx.stroke(); }
  ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.038;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.06 + i * size * 0.12; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.035; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.13, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.025); ctx.lineTo(cx + sgn * size * 0.31, y + size * 0.08 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.31, y + size * 0.08 + kick, size * 0.018, 0, Math.PI * 2); ctx.fill(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.09, size * 0.2, size * 0.32, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.145, size * 0.26, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(shell, 0.64); ctx.fill();
  ctx.strokeStyle = rgba(darken(body, 0.33), 0.8); ctx.lineWidth = size * 0.024; ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.18); ctx.lineTo(cx, cy + size * 0.34); ctx.stroke(); for (const dy of [-0.02, 0.1, 0.22]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.16, size * 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.22, size * 0.14, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(body, 0.12)); ctx.fill(); stroke();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.058; const ey = cy - size * 0.23; ctx.beginPath(); ctx.arc(ex, ey, size * 0.043, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
