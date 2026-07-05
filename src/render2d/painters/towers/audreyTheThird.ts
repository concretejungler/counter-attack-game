/**
 * PAINTER - Audrey the Third (id 'audrey-the-third'). Sweet houseplant bite tower.
 * A ceramic pot supports a leafy chomper with a red snap bloom.
 * The pot wears the face while the plant silhouette does the threatening.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { aoUnder, belly, celCrescent, celCrescentPath, glossDot, ramp, rim } from '../../paint';

registerTowerPainter('audrey-the-third', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('swat'));

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

  const leaf = warm(PAL.stinkbug);
  const pot = warm(0xc67654);
  const leafR = ramp(leaf);
  const potR = ramp(pot);
  const accentR = ramp(accent);
  const potX = cx - size * 0.24;
  const potY = size * 0.5;
  const potW = size * 0.48;
  const potH = size * 0.25;

  aoUnder(ctx, cx, potY + potH + size * 0.02, potW * 0.46, size * 0.035, 0.22);
  for (const [dx, dy, rx, ry, rot] of [[-0.2, 0.42, 0.16, 0.07, -0.75], [0.2, 0.43, 0.16, 0.07, 0.75], [0, 0.48, 0.14, 0.06, 0]] as [number, number, number, number, number][]) {
    ctx.beginPath();
    ctx.ellipse(cx + size * dx, size * dy, size * rx, size * ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = hex(dx < 0 ? mix(leaf, leafR.shadow, 0.18) : leafR.light);
    ctx.fill();
    strokeInk(size * 0.026);
    celCrescent(ctx, cx + size * dx, size * dy, size * rx, size * ry, leafR.shadow, 0.45, 0.45);
  }
  ctx.beginPath();
  ctx.moveTo(cx, potY + size * 0.03);
  ctx.quadraticCurveTo(cx - size * 0.04, size * 0.39, cx + size * 0.02, size * 0.29);
  ctx.lineWidth = size * 0.055;
  ctx.strokeStyle = hex(leafR.shadow);
  ctx.stroke();
  aoUnder(ctx, cx, potY + size * 0.015, potW * 0.32, size * 0.035, 0.18);

  ctx.beginPath();
  ctx.ellipse(cx + size * 0.03, size * 0.27, size * 0.2, size * 0.14, 0.08, 0, Math.PI * 2);
  ctx.fillStyle = hex(accentR.light);
  ctx.fill();
  strokeInk();
  celCrescent(ctx, cx + size * 0.03, size * 0.27, size * 0.2, size * 0.14, accentR.shadow, 0.44, 0.42);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.11, size * 0.27);
  ctx.quadraticCurveTo(cx + size * 0.04, size * 0.19, cx + size * 0.18, size * 0.26);
  ctx.quadraticCurveTo(cx + size * 0.03, size * 0.32, cx - size * 0.11, size * 0.27);
  ctx.fillStyle = hex(mix(accent, accentR.shadow, 0.5));
  ctx.fill();
  strokeInk(size * 0.026);

  roundRect(potX, potY, potW, potH, size * 0.055);
  ctx.fillStyle = hex(pot);
  ctx.fill();
  strokeInk();
  ctx.save();
  roundRect(potX, potY, potW, potH, size * 0.055);
  ctx.clip();
  belly(ctx, cx, potY + potH * 0.52, potW * 0.5, potH * 0.58, potR, 0.55);
  celCrescentPath(ctx, () => roundRect(potX, potY, potW, potH, size * 0.055), cx, potY + potH * 0.52, potW * 0.5, potH * 0.58, potR.shadow, 0.48, 0.34);
  rim(ctx, cx, potY + potH * 0.52, potW * 0.5, potH * 0.58, potR.light, size * 0.024, 0.48);
  ctx.restore();
  roundRect(potX - size * 0.035, potY - size * 0.055, potW + size * 0.07, size * 0.09, size * 0.04);
  ctx.fillStyle = hex(potR.light);
  ctx.fill();
  strokeInk(size * 0.03);
  glossDot(ctx, cx - size * 0.1, potY + size * 0.08, size * 0.022, 0.62);

  drawFace(cx, potY + size * 0.105, size * 0.095, size * 0.045, 0.35);
  drawPips(potY + potH + size * 0.055);
  if (ascended) {
    roundRect(potX - ink, size * 0.17, potW + ink * 2, size * 0.59, size * 0.13);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(size * 0.45);
  }
});
