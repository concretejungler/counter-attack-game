/**
 * PAINTER - The Possum Phantom (id 'possum-phantom'). Theatrical undead possum boss.
 * A giant pale possum with a mask, stage-cape wisps, crown collar, and curled
 * tail sells repeated play-dead drama without gore.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 1201.4) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('possum-phantom', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fur = warm(lighten(PAL.mouse, 0.22));
  const mask = warm(darken(PAL.mouse, 0.35));
  const pink = warm(PAL.mousePink);
  const cape = warm(mix(PAL.denim, PAL.cherry, 0.38));
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.beginPath(); ctx.moveTo(cx - size * 0.32, cy + size * 0.32); ctx.quadraticCurveTo(cx - size * 0.46, cy - size * 0.07, cx - size * 0.16, cy - size * 0.34); ctx.quadraticCurveTo(cx, cy - size * 0.2, cx + size * 0.16, cy - size * 0.34); ctx.quadraticCurveTo(cx + size * 0.46, cy - size * 0.07, cx + size * 0.32, cy + size * 0.32); ctx.quadraticCurveTo(cx + size * 0.12, cy + size * 0.23, cx, cy + size * 0.37); ctx.quadraticCurveTo(cx - size * 0.12, cy + size * 0.23, cx - size * 0.32, cy + size * 0.32); ctx.closePath(); ctx.fillStyle = rgba(cape, 0.9); ctx.fill(); stroke(size * 0.028);
  ctx.lineCap = 'round'; ctx.strokeStyle = hex(pink); ctx.lineWidth = size * 0.035; ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.29); ctx.quadraticCurveTo(cx + size * 0.35, cy + size * 0.42, cx + size * 0.13, cy + size * 0.49 + wobble * size * 0.008); ctx.stroke();
  ctx.strokeStyle = hex(mask); ctx.fillStyle = hex(mask); ctx.lineWidth = size * 0.032;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.02 + i * size * 0.13; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.022; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.23, y); ctx.lineTo(cx + sgn * size * 0.38, y + size * 0.05 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.38, y + size * 0.05 + kick, size * 0.016, 0, Math.PI * 2); ctx.fill(); } }
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.19, cy - size * 0.3, size * 0.12, size * 0.16, sgn * 0.32, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(size * 0.026); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.19, cy - size * 0.3, size * 0.065, size * 0.095, sgn * 0.32, 0, Math.PI * 2); ctx.fillStyle = rgba(pink, 0.7); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.05, size * 0.32, size * 0.38, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.12, size * 0.19, size * 0.22, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(fur, 0.26), 0.65); ctx.fill();
  for (let i = 0; i < 16; i++) { const a = rnd(i) * Math.PI * 2; const r = rnd(i + 40) * size * 0.25; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.1, size * (0.007 + rnd(i + 80) * 0.01), 0, Math.PI * 2); ctx.fillStyle = rgba(rnd(i) > 0.5 ? lighten(fur, 0.24) : darken(fur, 0.2), 0.55); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.21, size * 0.22, size * 0.17, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.085, cy - size * 0.22, size * 0.08, size * 0.1, sgn * 0.25, 0, Math.PI * 2); ctx.fillStyle = hex(mask); ctx.fill(); }
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.085; const ey = cy - size * 0.22; ctx.beginPath(); ctx.arc(ex, ey, size * 0.058, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.018); ctx.beginPath(); ctx.arc(ex + wobble * size * 0.007, ey + size * 0.015, size * 0.029, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.014, ey - size * 0.014, size * 0.011, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.024; ctx.beginPath(); ctx.moveTo(ex - sgn * size * 0.07, ey - size * 0.07); ctx.lineTo(ex + sgn * size * 0.06, ey - size * 0.04); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.34, size * 0.045, size * 0.028, 0, 0, Math.PI * 2); ctx.fillStyle = hex(pink); ctx.fill(); stroke(size * 0.014);
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.08, size * 0.1, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.024; ctx.stroke();
});
