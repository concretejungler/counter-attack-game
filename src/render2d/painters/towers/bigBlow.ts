/**
 * PAINTER - Big Blow (id 'big-blow'). Desk fan pushback tower.
 * A round cage, three chunky blades, and a sturdy stand fill the tower box.
 * The hub carries bright eyes and wind-boss brows.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { aoUnder, belly, celCrescent, celCrescentPath, ramp, rim, rivets, specStreak } from '../../paint';

registerTowerPainter('big-blow', (ctx, size, _frame, opts) => {
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

  const metal = warm(PAL.metal);
  const dark = warm(PAL.metalDark);
  const metalR = ramp(metal);
  const darkR = ramp(dark);
  const accentR = ramp(accent);
  const fanY = size * 0.37;
  const fanR = size * 0.28;

  aoUnder(ctx, cx, size * 0.79, size * 0.22, size * 0.035, 0.22);
  roundRect(cx - size * 0.045, fanY + fanR * 0.8, size * 0.09, size * 0.22, size * 0.03);
  ctx.fillStyle = hex(dark);
  ctx.fill();
  strokeInk(size * 0.026);
  celCrescentPath(ctx, () => roundRect(cx - size * 0.045, fanY + fanR * 0.8, size * 0.09, size * 0.22, size * 0.03), cx, fanY + fanR * 0.92, size * 0.06, size * 0.12, darkR.shadow, 0.5, 0.45);
  roundRect(cx - size * 0.22, size * 0.72, size * 0.44, size * 0.09, size * 0.045);
  ctx.fillStyle = hex(metal);
  ctx.fill();
  strokeInk(size * 0.028);
  celCrescentPath(ctx, () => roundRect(cx - size * 0.22, size * 0.72, size * 0.44, size * 0.09, size * 0.045), cx, size * 0.765, size * 0.22, size * 0.06, metalR.shadow, 0.5, 0.4);
  specStreak(ctx, cx - size * 0.02, size * 0.745, size * 0.28, size * 0.018, 0.45);

  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * size * 0.105, fanY + Math.sin(a) * size * 0.105, size * 0.075, size * 0.18, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fillStyle = rgba(accentR.light, 0.82);
    ctx.fill();
    strokeInk(size * 0.02);
    celCrescent(ctx, cx + Math.cos(a) * size * 0.105, fanY + Math.sin(a) * size * 0.105, size * 0.075, size * 0.18, accentR.shadow, 0.43, 0.32);
  }
  ctx.beginPath();
  ctx.arc(cx, fanY, fanR, 0, Math.PI * 2);
  ctx.fillStyle = rgba(metalR.light, 0.36);
  ctx.fill();
  strokeInk();
  belly(ctx, cx, fanY, fanR * 0.95, fanR * 0.95, metalR, 0.24);
  rim(ctx, cx, fanY, fanR, fanR, metalR.light, size * 0.03, 0.5);
  for (const r of [0.17, 0.23]) {
    ctx.beginPath();
    ctx.arc(cx, fanY, size * r, 0, Math.PI * 2);
    strokeInk(size * 0.014);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, fanY);
    ctx.lineTo(cx + Math.cos(a) * fanR, fanY + Math.sin(a) * fanR);
    strokeInk(size * 0.011);
  }
  ctx.beginPath();
  ctx.arc(cx, fanY, size * 0.13, 0, Math.PI * 2);
  ctx.fillStyle = hex(metalR.light);
  ctx.fill();
  strokeInk(size * 0.03);
  celCrescent(ctx, cx, fanY, size * 0.13, size * 0.13, metalR.shadow, 0.44, 0.42);
  rivets(ctx, [{ x: cx - size * 0.085, y: fanY - size * 0.085 }, { x: cx + size * 0.085, y: fanY + size * 0.085 }], size * 0.012, COCOA_CSS);

  drawFace(cx, fanY - size * 0.015, size * 0.055, size * 0.037, 0.2);
  drawPips(size * 0.86);
  if (ascended) {
    ctx.beginPath();
    ctx.arc(cx, fanY, fanR + ink, 0, Math.PI * 2);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(fanY);
  }
});
