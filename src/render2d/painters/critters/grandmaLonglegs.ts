/**
 * PAINTER - Grandma Longlegs (id 'grandma-longlegs'). Web-knitting spider boss.
 * Giant round grandma body with absurdly long legs, tiny bonnet, knitting
 * needles, and a cozy-menacing face so the silhouette reads as "long legs".
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 771.9) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('grandma-longlegs', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(mix(PAL.roach, PAL.mouse, 0.52));
  const belly = warm(lighten(body, 0.2));
  const bonnet = warm(mix(PAL.moth, PAL.flyWing, 0.25));
  const yarn = warm(PAL.flyWing);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.028;
  ctx.strokeStyle = hex(darken(body, 0.38));
  ctx.fillStyle = hex(darken(body, 0.38));
  for (let i = 0; i < 4; i++) {
    const ly = cy - size * 0.22 + i * size * 0.14;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.025;
    for (const sgn of [-1, 1]) {
      const kneeX = cx + sgn * size * (0.38 + i * 0.025);
      const footX = cx + sgn * size * (0.48 - i * 0.015);
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.22, ly); ctx.lineTo(kneeX, ly + size * 0.04); ctx.lineTo(footX, ly + size * 0.13 + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(footX, ly + size * 0.13 + kick, size * 0.015, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.beginPath(); ctx.moveTo(cx - size * 0.22, cy - size * 0.34); ctx.quadraticCurveTo(cx, cy - size * 0.5, cx + size * 0.22, cy - size * 0.34); ctx.lineTo(cx + size * 0.16, cy - size * 0.22); ctx.quadraticCurveTo(cx, cy - size * 0.3, cx - size * 0.16, cy - size * 0.22); ctx.closePath(); ctx.fillStyle = hex(bonnet); ctx.fill(); stroke(size * 0.026);
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sgn * size * 0.14, cy - size * 0.29, size * 0.024, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.butter); ctx.fill(); stroke(size * 0.012); }

  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.04, size * 0.34, size * 0.39, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.11, size * 0.23, size * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(belly, 0.65); ctx.fill();
  for (let i = 0; i < 22; i++) { const a = rnd(i) * Math.PI * 2; const r = rnd(i + 20) * size * 0.27; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.05, size * (0.006 + rnd(i + 50) * 0.01), 0, Math.PI * 2); ctx.fillStyle = rgba(rnd(i + 70) > 0.5 ? lighten(body, 0.24) : darken(body, 0.25), 0.65); ctx.fill(); }

  ctx.strokeStyle = rgba(yarn, 0.75); ctx.lineWidth = size * 0.012;
  for (const dx of [-0.22, -0.11, 0, 0.11, 0.22]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy - size * 0.31); ctx.quadraticCurveTo(cx, cy, cx + size * (dx * 0.55), cy + size * 0.32); ctx.stroke(); }
  ctx.strokeStyle = hex(PAL.metal); ctx.lineWidth = size * 0.018;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy + size * 0.09); ctx.lineTo(cx + sgn * size * 0.25, cy - size * 0.06 + wobble * size * 0.01); ctx.stroke(); }

  const eyeY = cy - size * 0.09;
  const eyeR = size * 0.066;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.11;
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.02);
    ctx.beginPath(); ctx.arc(ex + wobble * eyeR * 0.1, eyeY + eyeR * 0.22, eyeR * 0.47, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.27, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.026; ctx.beginPath(); ctx.moveTo(ex - sgn * eyeR * 1.1, eyeY - eyeR * 1.2); ctx.lineTo(ex + sgn * eyeR, eyeY - eyeR * 0.7); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy + size * 0.07, size * 0.1, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.023; ctx.stroke();
});
