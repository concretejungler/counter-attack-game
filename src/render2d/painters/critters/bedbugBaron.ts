/**
 * PAINTER - The Bedbug Baron (id 'bedbug-baron'). Fancy stealth boss.
 * The boss fills the 128 box as a huge quilted bedbug oval, with a tiny hat,
 * velvet collar, heavy brows, and deterministic fabric flecks for scale.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 611.3) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('bedbug-baron', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.045;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.roach, PAL.cherry, 0.35));
  const dark = warm(darken(base, 0.2));
  const velvet = warm(darken(PAL.cherry, 0.22));
  const gold = warm(PAL.butter);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.035; ctx.strokeStyle = hex(darken(base, 0.34)); ctx.fillStyle = hex(darken(base, 0.34));
  for (let i = 0; i < 5; i++) {
    const ly = cy - size * 0.22 + i * size * 0.1;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.02;
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.28, ly); ctx.lineTo(cx + sgn * size * 0.39, ly + kick); ctx.lineTo(cx + sgn * size * 0.43, ly + size * 0.04 + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sgn * size * 0.43, ly + size * 0.04 + kick, size * 0.016, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.beginPath(); ctx.moveTo(cx - size * 0.28, cy - size * 0.29); ctx.quadraticCurveTo(cx, cy - size * 0.44, cx + size * 0.28, cy - size * 0.29); ctx.lineTo(cx + size * 0.22, cy - size * 0.13); ctx.quadraticCurveTo(cx, cy - size * 0.21, cx - size * 0.22, cy - size * 0.13); ctx.closePath(); ctx.fillStyle = hex(velvet); ctx.fill(); stroke(size * 0.028);
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sgn * size * 0.16, cy - size * 0.22, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = hex(gold); ctx.fill(); stroke(size * 0.012); }
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.36, size * 0.42, 0, 0, Math.PI * 2); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  ctx.strokeStyle = rgba(dark, 0.85); ctx.lineWidth = size * 0.028;
  for (const dy of [-0.2, -0.09, 0.02, 0.13, 0.24]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * (0.29 - Math.abs(dy) * 0.32), size * 0.024, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = rgba(darken(base, 0.3), 0.65); ctx.lineWidth = size * 0.018;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.04, cy - size * 0.31); ctx.quadraticCurveTo(cx + sgn * size * 0.16, cy, cx + sgn * size * 0.07, cy + size * 0.32); ctx.stroke(); }
  for (let i = 0; i < 26; i++) { const a = rnd(i) * Math.PI * 2; const rad = rnd(i + 20) * size * 0.28; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 1.18, size * (0.006 + rnd(i + 40) * 0.011), 0, Math.PI * 2); ctx.fillStyle = rgba(rnd(i + 60) > 0.5 ? lighten(base, 0.28) : darken(base, 0.25), 0.65); ctx.fill(); }

  const eyeY = cy - size * 0.08;
  const eyeR = size * 0.072;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.12;
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.021);
    ctx.beginPath(); ctx.arc(ex + wobble * eyeR * 0.12, eyeY + eyeR * 0.2, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.28, eyeR * 0.21, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.03; ctx.beginPath(); ctx.moveTo(ex - sgn * eyeR * 1.1, eyeY - eyeR * 1.25); ctx.lineTo(ex + sgn * eyeR * 1.05, eyeY - eyeR * 0.75); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy + size * 0.11, size * 0.12, 0.12 * Math.PI, 0.88 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.025; ctx.stroke();
  const hatY = cy - size * 0.45 + wobble * size * 0.004;
  ctx.beginPath(); ctx.ellipse(cx, hatY + size * 0.035, size * 0.15, size * 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(PAL.denim, 0.35)); ctx.fill(); stroke(size * 0.022);
  ctx.beginPath(); ctx.rect(cx - size * 0.075, hatY - size * 0.055, size * 0.15, size * 0.1); ctx.fillStyle = hex(darken(PAL.denim, 0.25)); ctx.fill(); stroke(size * 0.022);
  ctx.beginPath(); ctx.rect(cx - size * 0.075, hatY + size * 0.005, size * 0.15, size * 0.025); ctx.fillStyle = hex(gold); ctx.fill();
});
