/**
 * PAINTER - Fruit Fly (id 'fly-fruit'). Tiny banana-cloud flier.
 * It uses the flier convention: translucent buzzing wings, no baked shadow, and
 * huge red compound eyes on a small olive body.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('fly-fruit', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(PAL.fruitFly);
  const belly = warm(mix(PAL.fruitFly, PAL.butter, 0.32));
  const eyeCol = warm(mix(PAL.cherry, PAL.antBullet, 0.18));
  const wing = PAL.flyWing;
  const leg = darken(PAL.fruitFly, 0.36);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  const thoraxY = cy - size * 0.03;
  const spread = frame ? 0.49 : 0.39;
  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.1;
    const wy = thoraxY - size * 0.01;
    const tipX = wx + sgn * size * spread;
    const tipY = wy - size * 0.24;
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * (0.82 + (frame ? 0.14 : 0)));
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.19, size * 0.085, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.28 : 0.18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * 0.72);
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.17, size * 0.075, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, 0.64); ctx.fill(); stroke(size * 0.018);
    ctx.strokeStyle = rgba(PAL.flyBody, 0.45); ctx.lineWidth = size * 0.01; ctx.beginPath(); ctx.moveTo(-size * 0.13, 0); ctx.lineTo(size * 0.13, -size * 0.005); ctx.stroke(); ctx.restore();
  }
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.018; ctx.strokeStyle = hex(leg);
  for (let i = 0; i < 3; i++) { const ly = thoraxY + i * size * 0.065; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.025; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.06, ly); ctx.lineTo(cx + sgn * size * 0.15, ly + size * 0.04 + kick); ctx.stroke(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.14, size * 0.11, size * 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = hex(belly); ctx.fill(); stroke();
  ctx.strokeStyle = rgba(darken(belly, 0.28), 0.75); ctx.lineWidth = size * 0.018; for (const dy of [0.08, 0.16, 0.24]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.09, size * 0.014, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, thoraxY, size * 0.105, size * 0.105, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.035, thoraxY - size * 0.025, size * 0.045, size * 0.04, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(body, 0.35), 0.45); ctx.fill();
  const eyeY = cy - size * 0.19;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.07;
    ctx.beginPath(); ctx.ellipse(ex, eyeY, size * 0.082, size * 0.095, sgn * 0.12, 0, Math.PI * 2); ctx.fillStyle = hex(eyeCol); ctx.fill(); stroke(size * 0.024);
    ctx.beginPath(); ctx.ellipse(ex - sgn * size * 0.02, eyeY + size * 0.02, size * 0.04, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(PAL.flame, 0.38); ctx.fill();
    ctx.beginPath(); ctx.arc(ex - sgn * size * 0.025, eyeY - size * 0.035, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
