/**
 * PAINTER - Moth (id 'moth'). Powdery lamp-chaser flier.
 * The huge soft triangular wings and fuzzy round face dominate the silhouette,
 * with gentle eye spots and no baked shadow.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('moth', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const wing = warm(PAL.moth);
  const body = warm(mix(PAL.moth, PAL.roach, 0.22));
  const spot = warm(mix(PAL.butter, PAL.moth, 0.25));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const flutter = frame ? 1 : -1;

  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.06, cy - size * 0.14); ctx.quadraticCurveTo(cx + sgn * size * (0.42 + flutter * 0.02), cy - size * 0.32, cx + sgn * size * 0.43, cy + size * 0.03); ctx.quadraticCurveTo(cx + sgn * size * 0.29, cy + size * 0.32, cx + sgn * size * 0.08, cy + size * 0.15); ctx.closePath(); ctx.fillStyle = hex(wing); ctx.fill(); stroke(size * 0.028);
    ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.25, cy - size * 0.03, size * 0.07, size * 0.09, sgn * 0.25, 0, Math.PI * 2); ctx.fillStyle = rgba(spot, 0.7); ctx.fill(); stroke(size * 0.013);
    ctx.strokeStyle = rgba(darken(wing, 0.24), 0.55); ctx.lineWidth = size * 0.012; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, cy - size * 0.1); ctx.lineTo(cx + sgn * size * 0.34, cy - size * 0.18); ctx.moveTo(cx + sgn * size * 0.09, cy + size * 0.04); ctx.lineTo(cx + sgn * size * 0.33, cy + size * 0.17); ctx.stroke();
  }

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(darken(body, 0.28)); ctx.lineWidth = size * 0.017;
  for (let i = 0; i < 3; i++) { const ly = cy - size * 0.04 + i * size * 0.07; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.02; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, ly); ctx.lineTo(cx + sgn * size * 0.14, ly + size * 0.035 + kick); ctx.stroke(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.09, size * 0.105, size * 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.strokeStyle = rgba(darken(body, 0.26), 0.65); ctx.lineWidth = size * 0.018; for (const dy of [0, 0.1, 0.2]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.085, size * 0.014, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.13, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(body, 0.08)); ctx.fill(); stroke();

  for (const sgn of [-1, 1]) {
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.018; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.045, cy - size * 0.27); ctx.quadraticCurveTo(cx + sgn * size * 0.13, cy - size * 0.39, cx + sgn * size * 0.08, cy - size * 0.45); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.08, cy - size * 0.45, size * 0.022, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.18;
    ctx.beginPath(); ctx.arc(ex, ey, size * 0.044, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.014);
    ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.011, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.012, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
