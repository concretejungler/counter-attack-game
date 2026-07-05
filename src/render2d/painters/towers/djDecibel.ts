/**
 * PAINTER - DJ Decibel (id 'dj-decibel'). Boombox support aura tower.
 * Twin speakers, a handle, and beat bars make a compact rectangle.
 * The center panel gets hype brows and a showman grin.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { aoUnder, belly, celCrescent, celCrescentPath, ramp, rim, rivets, specStreak } from '../../paint';

registerTowerPainter('dj-decibel', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('sonic'));

  const strokeInk = (w = ink) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  };
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };
  const drawFace = (fx: number, fy: number, spread: number, eyeR: number, mood: number) => {
    for (const sgn of [-1, 1]) {
      const ex = fx + sgn * spread;
      ctx.beginPath();
      ctx.arc(ex, fy, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      strokeInk(size * 0.015);
      ctx.beginPath();
      ctx.arc(ex + eyeR * 0.18, fy + eyeR * 0.1, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = COCOA_CSS;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex - eyeR * 0.23, fy - eyeR * 0.27, eyeR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = COCOA_CSS;
      ctx.lineWidth = size * 0.025;
      ctx.beginPath();
      ctx.moveTo(ex - sgn * eyeR, fy - eyeR * (1.14 - mood * 0.08));
      ctx.lineTo(ex + sgn * eyeR, fy - eyeR * (0.96 + mood * 0.16));
      ctx.stroke();
    }
    ctx.strokeStyle = COCOA_CSS;
    ctx.lineWidth = size * 0.019;
    ctx.beginPath();
    if (mood < -0.2) {
      ctx.moveTo(fx - spread * 0.48, fy + eyeR * 1.65);
      ctx.lineTo(fx + spread * 0.5, fy + eyeR * 1.52);
    } else {
      ctx.arc(fx, fy + eyeR * 1.15, spread * 0.48, 0.12 * Math.PI, 0.88 * Math.PI);
    }
    ctx.stroke();
  };
  const drawPips = (py: number) => {
    const pr = size * 0.028;
    const gap = pr * 2.8;
    const px0 = cx - ((tier - 1) * gap) / 2;
    for (let i = 0; i < tier; i++) {
      ctx.beginPath();
      ctx.arc(px0 + i * gap, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = hex(PAL.butter);
      ctx.fill();
      strokeInk(size * 0.014);
    }
  };
  const drawSparkles = (cy: number) => {
    ctx.fillStyle = 'rgba(255,240,170,0.95)';
    for (const [dx, dy] of [[-0.3, 0.0], [0.3, 0.16], [0.2, -0.2]] as [number, number][]) {
      const sxp = cx + size * dx;
      const syp = cy + size * dy;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.lineTo(sxp + Math.cos(a) * size * 0.03, syp + Math.sin(a) * size * 0.03);
        ctx.lineTo(sxp + Math.cos(a + 0.39) * size * 0.012, syp + Math.sin(a + 0.39) * size * 0.012);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  const shell = warm(0x55616f);
  const shellR = ramp(shell);
  const accentR = ramp(accent);
  const x = cx - size * 0.33;
  const y = size * 0.31;
  const w = size * 0.66;
  const h = size * 0.35;
  ctx.beginPath();
  ctx.arc(cx, y, size * 0.2, Math.PI, 0);
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = hex(PAL.metalDark);
  ctx.stroke();
  aoUnder(ctx, cx, y + h + size * 0.03, w * 0.46, size * 0.035, 0.22);
  roundRect(x, y, w, h, size * 0.06);
  ctx.fillStyle = hex(shell);
  ctx.fill();
  strokeInk();
  ctx.save();
  roundRect(x, y, w, h, size * 0.06);
  ctx.clip();
  belly(ctx, cx, y + h * 0.5, w * 0.48, h * 0.58, shellR, 0.38);
  celCrescentPath(ctx, () => roundRect(x, y, w, h, size * 0.06), cx, y + h * 0.5, w * 0.5, h * 0.6, shellR.shadow, 0.5, 0.42);
  rim(ctx, cx, y + h * 0.5, w * 0.5, h * 0.6, shellR.light, size * 0.024, 0.5);
  ctx.restore();
  specStreak(ctx, cx - size * 0.04, y + size * 0.06, size * 0.32, size * 0.022, 0.4);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + sgn * size * 0.21, y + h * 0.55, size * 0.105, 0, Math.PI * 2);
    ctx.fillStyle = hex(shellR.shadow);
    ctx.fill();
    strokeInk(size * 0.026);
    ctx.beginPath();
    ctx.arc(cx + sgn * size * 0.21, y + h * 0.55, size * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = hex(accent);
    ctx.fill();
    strokeInk(size * 0.016);
    celCrescent(ctx, cx + sgn * size * 0.21, y + h * 0.55, size * 0.05, size * 0.05, accentR.shadow, 0.42, 0.5);
  }
  for (let i = 0; i < 5; i++) {
    roundRect(cx - size * 0.1 + i * size * 0.05, y + size * (0.08 + (i % 2) * 0.035), size * 0.026, size * (0.08 + (i % 3) * 0.018), size * 0.01);
    ctx.fillStyle = hex(accentR.light);
    ctx.fill();
  }
  rivets(ctx, [{ x: x + size * 0.04, y: y + size * 0.05 }, { x: x + w - size * 0.04, y: y + size * 0.05 }], size * 0.012, COCOA_CSS);
  drawFace(cx, y + h * 0.52, size * 0.065, size * 0.035, 0.45);
  drawPips(y + h + size * 0.08);
  if (ascended) {
    roundRect(x - ink, y - size * 0.07, w + ink * 2, h + size * 0.1, size * 0.1);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(y + h * 0.45);
  }
});
