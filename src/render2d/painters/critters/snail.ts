/**
 * PAINTER - Snail (id 'snail'). Shell-first armored slug.
 * A huge spiral shell dominates the silhouette, with a tiny slug head and eye
 * stalks peeking forward so the armor reads before the body.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, belly as bellyGrad, specStreak } from '../../paint';

registerCritterPainter('snail', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(PAL.slug);
  const bodyR = ramp(body);
  const shell = warm(PAL.snailShell);
  const shellR = ramp(shell);
  const stalk = mix(bodyR.shadow, 0x000000, 0.05);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const wobble = frame ? 1 : -1;

  ctx.lineCap = 'round';
  ctx.strokeStyle = hex(stalk);
  ctx.lineWidth = size * 0.028;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.17);
    ctx.quadraticCurveTo(cx + sgn * size * 0.1, cy - size * 0.33, cx + sgn * size * (0.16 + wobble * 0.008), cy - size * 0.38);
    ctx.stroke();
  }

  // foot + head (cel-shaded sub-forms under the shell)
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.18, size * 0.2, size * 0.15, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy + size * 0.18, size * 0.2, size * 0.15, bodyR.shadow, 0.45, 0.5);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.11, size * 0.16, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(body, 0.04)); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.11, size * 0.16, size * 0.13, bodyR.shadow, 0.42, 0.5);

  // the shell IS the sprite — belly volume, cel lens, ONE spec streak (polish).
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.25, size * 0.27, 0, 0, Math.PI * 2); ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  bellyGrad(ctx, cx, cy + size * 0.06, size * 0.24, size * 0.26, shellR, 0.55);
  celCrescent(ctx, cx, cy + size * 0.06, size * 0.25, size * 0.27, shellR.shadow, 0.45, 0.5);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.24, size * 0.26, 0, 0, Math.PI * 2); ctx.clip();
  specStreak(ctx, cx - size * 0.08, cy - size * 0.05, size * 0.22, size * 0.05, 0.32);
  ctx.restore();
  ctx.strokeStyle = COCOA_CSS;
  ctx.lineWidth = size * 0.028;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.03, cy + size * 0.05);
  ctx.bezierCurveTo(cx + size * 0.13, cy, cx + size * 0.08, cy - size * 0.16, cx - size * 0.04, cy - size * 0.13);
  ctx.bezierCurveTo(cx - size * 0.17, cy - size * 0.1, cx - size * 0.17, cy + size * 0.1, cx, cy + size * 0.14);
  ctx.bezierCurveTo(cx + size * 0.15, cy + size * 0.18, cx + size * 0.22, cy, cx + size * 0.12, cy - size * 0.1);
  ctx.stroke();

  const eyeR = size * 0.043;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * (0.16 + wobble * 0.008);
    const ey = cy - size * 0.39;
    ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012);
    ctx.beginPath(); ctx.arc(ex + sgn * eyeR * 0.12, ey + eyeR * 0.22, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.23, ey - eyeR * 0.23, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
