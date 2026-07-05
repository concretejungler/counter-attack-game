/**
 * PAINTER - Moth (id 'moth'). Powdery lamp-chaser flier.
 * The huge soft triangular wings and fuzzy round face dominate the silhouette,
 * with gentle eye spots and no baked shadow.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly as bellyGrad } from '../../paint';

registerCritterPainter('moth', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const wing = warm(PAL.moth);
  const wingR = ramp(wing);
  const body = warm(mix(PAL.moth, PAL.roach, 0.22));
  const bodyR = ramp(body);
  const spot = warm(mix(PAL.butter, PAL.moth, 0.25));
  const leg = mix(bodyR.shadow, 0x000000, 0.1);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const flutter = frame ? 1 : -1;

  for (const sgn of [-1, 1]) {
    const traceWing = () => {
      ctx.moveTo(cx + sgn * size * 0.06, cy - size * 0.14);
      ctx.quadraticCurveTo(cx + sgn * size * (0.42 + flutter * 0.02), cy - size * 0.32, cx + sgn * size * 0.43, cy + size * 0.03);
      ctx.quadraticCurveTo(cx + sgn * size * 0.29, cy + size * 0.32, cx + sgn * size * 0.08, cy + size * 0.15);
      ctx.closePath();
    };
    ctx.beginPath(); traceWing(); ctx.fillStyle = hex(wing); ctx.fill(); stroke(size * 0.028);
    // V2 flier: NO baked shadow — the wings get ONLY a soft belly for powdery
    // volume (clipped so the gradient rides inside the wing membrane).
    ctx.save(); ctx.beginPath(); traceWing(); ctx.clip();
    bellyGrad(ctx, cx + sgn * size * 0.24, cy - size * 0.02, size * 0.19, size * 0.2, wingR, 0.4);
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.25, cy - size * 0.03, size * 0.07, size * 0.09, sgn * 0.25, 0, Math.PI * 2); ctx.fillStyle = rgba(spot, 0.7); ctx.fill(); stroke(size * 0.013);
    ctx.strokeStyle = rgba(wingR.shadow, 0.5); ctx.lineWidth = size * 0.012; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, cy - size * 0.1); ctx.lineTo(cx + sgn * size * 0.34, cy - size * 0.18); ctx.moveTo(cx + sgn * size * 0.09, cy + size * 0.04); ctx.lineTo(cx + sgn * size * 0.33, cy + size * 0.17); ctx.stroke();
  }

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(leg); ctx.lineWidth = size * 0.017;
  for (let i = 0; i < 3; i++) { const ly = cy - size * 0.04 + i * size * 0.07; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.02; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, ly); ctx.lineTo(cx + sgn * size * 0.14, ly + size * 0.035 + kick); ctx.stroke(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.09, size * 0.105, size * 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.035, cy + size * 0.01, size * 0.045, size * 0.11, -0.12, 0, Math.PI * 2); ctx.fillStyle = rgba(bodyR.light, 0.4); ctx.fill();
  ctx.strokeStyle = rgba(bodyR.shadow, 0.6); ctx.lineWidth = size * 0.018; for (const dy of [0, 0.1, 0.2]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.085, size * 0.014, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.13, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(body, 0.08)); ctx.fill(); stroke();

  for (const sgn of [-1, 1]) {
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.018; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.045, cy - size * 0.27); ctx.quadraticCurveTo(cx + sgn * size * 0.13, cy - size * 0.39, cx + sgn * size * 0.08, cy - size * 0.45); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.08, cy - size * 0.45, size * 0.022, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.18;
    ctx.beginPath(); ctx.arc(ex, ey, size * 0.044, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.014);
    ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.011, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.012, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
