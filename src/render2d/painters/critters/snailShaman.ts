/**
 * PAINTER - Snail Shaman (id 'snail-shaman'). Magical shell healer.
 * It keeps the big spiral shell, then adds a tiny leaf hood and one glowing
 * shell rune so the support role reads without sparkles or status effects.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('snail-shaman', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(PAL.slug);
  const shell = warm(PAL.snailShell);
  const hood = warm(mix(PAL.stinkbug, PAL.slug, 0.45));
  const glow = warm(PAL.mint);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const wobble = frame ? 1 : -1;

  ctx.lineCap = 'round';
  ctx.strokeStyle = hex(darken(body, 0.3)); ctx.lineWidth = size * 0.027;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.16); ctx.quadraticCurveTo(cx + sgn * size * 0.1, cy - size * 0.32, cx + sgn * size * (0.15 + wobble * 0.008), cy - size * 0.37); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.18, size * 0.2, size * 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.11, size * 0.16, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(body, 0.04)); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.14, cy - size * 0.19); ctx.quadraticCurveTo(cx, cy - size * 0.34, cx + size * 0.14, cy - size * 0.19); ctx.quadraticCurveTo(cx, cy - size * 0.13, cx - size * 0.14, cy - size * 0.19); ctx.fillStyle = hex(hood); ctx.fill(); stroke(size * 0.024);

  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.25, size * 0.27, 0, 0, Math.PI * 2); ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.07, cy - size * 0.02, size * 0.11, size * 0.13, -0.25, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(shell, 0.25), 0.65); ctx.fill();
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.027; ctx.beginPath(); ctx.moveTo(cx + size * 0.03, cy + size * 0.05); ctx.bezierCurveTo(cx + size * 0.13, cy, cx + size * 0.08, cy - size * 0.16, cx - size * 0.04, cy - size * 0.13); ctx.bezierCurveTo(cx - size * 0.17, cy - size * 0.1, cx - size * 0.17, cy + size * 0.1, cx, cy + size * 0.14); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + size * 0.11, cy - size * 0.02, size * 0.048, 0, Math.PI * 2); ctx.fillStyle = rgba(glow, 0.78); ctx.fill(); stroke(size * 0.012);
  ctx.strokeStyle = rgba(lighten(glow, 0.3), 0.9); ctx.lineWidth = size * 0.012; ctx.beginPath(); ctx.moveTo(cx + size * 0.11, cy - size * 0.055); ctx.lineTo(cx + size * 0.085, cy - size * 0.005); ctx.lineTo(cx + size * 0.13, cy - size * 0.005); ctx.stroke();

  const eyeR = size * 0.042;
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * (0.15 + wobble * 0.008); const ey = cy - size * 0.38; ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012); ctx.beginPath(); ctx.arc(ex + sgn * eyeR * 0.12, ey + eyeR * 0.22, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - eyeR * 0.23, ey - eyeR * 0.23, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});