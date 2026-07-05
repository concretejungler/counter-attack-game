/**
 * PAINTER - Pillbug (id 'pillbug'). Rolling armored marble bug. (V2 elite.)
 * A near-circle stack of cocoa-rimmed plates and little tucked feet exaggerate
 * the roll-up silhouette. V2: belly-lit dome with a rim and one spec streak;
 * every plate seam gets a toward-light catch so the shell reads as stacked armor.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten } from '../../colors';
import { ramp, celCrescent, belly, rim, specStreak, innerInk } from '../../paint';

registerCritterPainter('pillbug', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const shell = warm(mix(PAL.stinkbug, PAL.flyBody, 0.38));
  const shellR = ramp(shell);
  const plate = warm(lighten(shell, 0.14));
  const plateR = ramp(plate);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- tucked feet ---
  ctx.lineCap = 'round'; ctx.strokeStyle = innerInk(shell); ctx.fillStyle = innerInk(shell); ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.04 + i * size * 0.12; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.025; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.18, y); ctx.lineTo(cx + sgn * size * 0.26, y + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.27, y + kick, size * 0.018, 0, Math.PI * 2); ctx.fill(); } }

  // --- armored dome (dominant mass): belly + spec + stacked plates + cel + rim ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.25, size * 0.31, 0, 0, Math.PI * 2); ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  belly(ctx, cx, cy + size * 0.06, size * 0.24, size * 0.3, shellR, 0.5);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.245, size * 0.305, 0, 0, Math.PI * 2); ctx.clip();
  specStreak(ctx, cx - size * 0.07, cy - size * 0.1, size * 0.24, size * 0.05, 0.34);
  // per-plate: dark seam + a toward-light catch line above it = stacked armor
  for (const dy of [-0.15, -0.05, 0.05, 0.15, 0.25]) {
    const prx = size * (0.2 - Math.abs(dy) * 0.18);
    ctx.strokeStyle = rgba(shellR.shadow, 0.85); ctx.lineWidth = size * 0.026;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, prx, size * 0.022, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(shellR.light, 0.6); ctx.lineWidth = size * 0.013;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * (dy - 0.028), prx * 0.92, size * 0.018, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  ctx.restore();
  celCrescent(ctx, cx, cy + size * 0.06, size * 0.25, size * 0.31, shellR.shadow, 0.45, 0.45);
  rim(ctx, cx, cy + size * 0.06, size * 0.25, size * 0.31, shellR.light, size * 0.024, 0.5);

  // --- head plate ---
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.22, size * 0.16, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = hex(plate); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.22, size * 0.16, size * 0.12, plateR.shadow, 0.42, 0.5);
  // warm cheeks (accent against the cool shell)
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.115, cy - size * 0.2, size * 0.028, size * 0.02, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(warm(PAL.cherry), 0.32); ctx.fill(); }

  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.06; const ey = cy - size * 0.22; ctx.beginPath(); ctx.arc(ex, ey, size * 0.043, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.004, ey + size * 0.011, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
