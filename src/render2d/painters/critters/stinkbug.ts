/**
 * PAINTER - Stink Bug (id 'stinkbug'). Shield-shaped gas bug.
 * The pentagonal shield back is the read, with baked-in tiny wisps as body
 * detail only, not a status cloud or gameplay tint.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('stinkbug', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(PAL.stinkbug);
  const plate = warm(lighten(PAL.stinkbug, 0.12));
  const leg = darken(body, 0.34);
  const gas = warm(lighten(PAL.goo, 0.16));
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round';
  ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 3; i++) {
    const y = cy - size * 0.09 + i * size * 0.12;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.032;
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.13, y); ctx.lineTo(cx + sgn * size * 0.28, y + size * 0.05 + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sgn * size * 0.28, y + size * 0.05 + kick, size * 0.016, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.29);
  ctx.lineTo(cx + size * 0.23, cy - size * 0.14);
  ctx.lineTo(cx + size * 0.19, cy + size * 0.2);
  ctx.lineTo(cx, cy + size * 0.36);
  ctx.lineTo(cx - size * 0.19, cy + size * 0.2);
  ctx.lineTo(cx - size * 0.23, cy - size * 0.14);
  ctx.closePath();
  ctx.fillStyle = hex(body);
  ctx.fill();
  stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.22); ctx.lineTo(cx + size * 0.14, cy - size * 0.1); ctx.lineTo(cx, cy + size * 0.28); ctx.lineTo(cx - size * 0.14, cy - size * 0.1); ctx.closePath(); ctx.fillStyle = rgba(plate, 0.7); ctx.fill();
  ctx.strokeStyle = rgba(darken(body, 0.3), 0.8); ctx.lineWidth = size * 0.022; ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.24); ctx.lineTo(cx, cy + size * 0.29); ctx.stroke();
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.07, cy + size * 0.1); ctx.quadraticCurveTo(cx + sgn * size * 0.18, cy + size * 0.07, cx + sgn * size * 0.14, cy - size * 0.03); ctx.stroke(); }
  ctx.strokeStyle = rgba(gas, 0.62); ctx.lineWidth = size * 0.015;
  for (const x of [-0.1, 0.1]) { ctx.beginPath(); ctx.moveTo(cx + size * x, cy + size * 0.08); ctx.quadraticCurveTo(cx + size * (x + 0.04), cy, cx + size * x, cy - size * 0.07); ctx.stroke(); }

  const eyeR = size * 0.046;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.07; const ey = cy - size * 0.16;
    ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013);
    ctx.beginPath(); ctx.arc(ex + sgn * eyeR * 0.1, ey + eyeR * 0.25, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.25, ey - eyeR * 0.24, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});