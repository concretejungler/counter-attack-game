/**
 * PAINTER - Slug (id 'slug'). Glossy teardrop crawler.
 * The long soft drop, eye stalks, and pale slime sheen make the slow body read
 * clearly at small size without relying on any status effect.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescentPath, belly as bellyGrad, glossDot } from '../../paint';

registerCritterPainter('slug', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(PAL.slug);
  const r3 = ramp(body);
  const footBelly = warm(lighten(PAL.slug, 0.16));
  const slime = warm(lighten(PAL.goo, 0.28));
  const stalk = mix(r3.shadow, 0x000000, 0.05);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const wiggle = frame ? 1 : -1;

  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(slime, 0.55);
  ctx.lineWidth = size * 0.026;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, cy + size * 0.34);
  ctx.quadraticCurveTo(cx, cy + size * 0.4, cx + size * 0.16, cy + size * 0.34);
  ctx.stroke();

  ctx.strokeStyle = hex(stalk);
  ctx.lineWidth = size * 0.033;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * size * 0.06, cy - size * 0.21);
    ctx.quadraticCurveTo(cx + sgn * size * 0.09, cy - size * 0.36, cx + sgn * size * (0.15 + wiggle * 0.01), cy - size * 0.42);
    ctx.stroke();
  }

  const tracer = () => {
    ctx.moveTo(cx, cy - size * 0.29);
    ctx.quadraticCurveTo(cx + size * 0.24, cy - size * 0.18, cx + size * 0.2, cy + size * 0.18);
    ctx.quadraticCurveTo(cx + size * 0.16, cy + size * 0.36, cx, cy + size * 0.36);
    ctx.quadraticCurveTo(cx - size * 0.16, cy + size * 0.36, cx - size * 0.2, cy + size * 0.18);
    ctx.quadraticCurveTo(cx - size * 0.24, cy - size * 0.18, cx, cy - size * 0.29);
    ctx.closePath();
  };
  ctx.beginPath(); tracer(); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  // V2: belly for the soft round volume, cel shadow along the away flank, then
  // ONE glossDot as the wet-slime sheen (this species' earned material mark).
  ctx.save(); ctx.beginPath(); tracer(); ctx.clip();
  bellyGrad(ctx, cx, cy + size * 0.04, size * 0.2, size * 0.32, r3, 0.55);
  ctx.restore();
  celCrescentPath(ctx, tracer, cx, cy + size * 0.06, size * 0.2, size * 0.3, r3.shadow, 0.45, 0.5);
  glossDot(ctx, cx - size * 0.08, cy - size * 0.08, size * 0.032, 0.55);
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.22, size * 0.14, size * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(footBelly, 0.72);
  ctx.fill();

  const eyeR = size * 0.045;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * (0.15 + wiggle * 0.01);
    const ey = cy - size * 0.43;
    ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012);
    ctx.beginPath(); ctx.arc(ex + sgn * eyeR * 0.12, ey + eyeR * 0.22, eyeR * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.24, ey - eyeR * 0.24, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
