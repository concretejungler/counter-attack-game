/**
 * PAINTER - Snail Shaman (id 'snail-shaman'). Magical shell healer. (V2 elite.)
 * It keeps the big spiral shell, then adds a tiny leaf hood and one glowing shell
 * rune so the support role reads without sparkles or status effects. V2: the
 * shell is a belly-lit dome with a rim, the spiral is an inner-ink line, and the
 * rune sits in a small mint glow (haloBehind).
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten } from '../../colors';
import { ramp, celCrescent, celCrescentPath, belly, rim, haloBehind, innerInk } from '../../paint';

registerCritterPainter('snail-shaman', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(PAL.slug);
  const bodyR = ramp(body);
  const shell = warm(PAL.snailShell);
  const shellR = ramp(shell);
  const hood = warm(mix(PAL.stinkbug, PAL.slug, 0.45));
  const hoodR = ramp(hood);
  const glow = warm(PAL.mint);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const wobble = frame ? 1 : -1;

  // --- eyestalks ---
  ctx.lineCap = 'round';
  ctx.strokeStyle = innerInk(body); ctx.lineWidth = size * 0.027;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.16); ctx.quadraticCurveTo(cx + sgn * size * 0.1, cy - size * 0.32, cx + sgn * size * (0.15 + wobble * 0.008), cy - size * 0.37); ctx.stroke(); }

  // --- foot + head bump ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.18, size * 0.2, size * 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy + size * 0.18, size * 0.2, size * 0.15, bodyR.shadow, 0.45, 0.45);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.11, size * 0.16, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(body, 0.04)); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.11, size * 0.16, size * 0.13, bodyR.shadow, 0.42, 0.45);

  // --- leaf hood ---
  const hoodTrace = () => { ctx.moveTo(cx - size * 0.14, cy - size * 0.19); ctx.quadraticCurveTo(cx, cy - size * 0.34, cx + size * 0.14, cy - size * 0.19); ctx.quadraticCurveTo(cx, cy - size * 0.13, cx - size * 0.14, cy - size * 0.19); ctx.closePath(); };
  ctx.beginPath(); hoodTrace(); ctx.fillStyle = hex(hood); ctx.fill(); stroke(size * 0.024);
  celCrescentPath(ctx, hoodTrace, cx, cy - size * 0.22, size * 0.14, size * 0.08, hoodR.shadow, 0.4, 0.5);

  // --- spiral shell (dominant mass): belly + cel + rim ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.25, size * 0.27, 0, 0, Math.PI * 2); ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  belly(ctx, cx, cy + size * 0.06, size * 0.24, size * 0.26, shellR, 0.5);
  ctx.strokeStyle = innerInk(shell); ctx.lineWidth = size * 0.027; ctx.beginPath(); ctx.moveTo(cx + size * 0.03, cy + size * 0.05); ctx.bezierCurveTo(cx + size * 0.13, cy, cx + size * 0.08, cy - size * 0.16, cx - size * 0.04, cy - size * 0.13); ctx.bezierCurveTo(cx - size * 0.17, cy - size * 0.1, cx - size * 0.17, cy + size * 0.1, cx, cy + size * 0.14); ctx.stroke();
  celCrescent(ctx, cx, cy + size * 0.06, size * 0.25, size * 0.27, shellR.shadow, 0.45, 0.45);
  rim(ctx, cx, cy + size * 0.06, size * 0.25, size * 0.27, shellR.light, size * 0.024, 0.5);

  // --- glowing rune (small halo) ---
  haloBehind(ctx, cx + size * 0.11, cy - size * 0.02, size * 0.11, glow, 0.3);
  ctx.beginPath(); ctx.arc(cx + size * 0.11, cy - size * 0.02, size * 0.048, 0, Math.PI * 2); ctx.fillStyle = rgba(glow, 0.82); ctx.fill(); stroke(size * 0.012);
  ctx.strokeStyle = rgba(lighten(glow, 0.35), 0.95); ctx.lineWidth = size * 0.012; ctx.beginPath(); ctx.moveTo(cx + size * 0.11, cy - size * 0.055); ctx.lineTo(cx + size * 0.085, cy - size * 0.005); ctx.lineTo(cx + size * 0.13, cy - size * 0.005); ctx.stroke();

  // --- eyes on the stalks ---
  const eyeR = size * 0.042;
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * (0.15 + wobble * 0.008); const ey = cy - size * 0.38; ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012); ctx.beginPath(); ctx.arc(ex + sgn * eyeR * 0.12, ey + eyeR * 0.22, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - eyeR * 0.23, ey - eyeR * 0.23, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
