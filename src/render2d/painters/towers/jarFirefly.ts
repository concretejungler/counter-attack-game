/**
 * PAINTER - Firefly Lantern (id 'jar-firefly'). Mason jar reveal lantern.
 * A capped glass jar holds warm firefly glow and small wing shapes.
 * The jar itself gets a soft nightlight face and curious brows.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { aoUnder, belly, celCrescent, celCrescentPath, glossDot, ramp, rim, specStreak } from '../../paint';

registerTowerPainter('jar-firefly', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('light'));

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

  const glass = warm(0xbfe3f7);
  const glow = warm(dmgTypeColor('light'));
  const glassR = ramp(glass);
  const glowR = ramp(glow);
  const capR = ramp(PAL.metalDark);
  const x = cx - size * 0.23;
  const y = size * 0.23;
  const w = size * 0.46;
  const h = size * 0.5;
  aoUnder(ctx, cx, y + h + size * 0.025, w * 0.45, size * 0.035, 0.22);
  roundRect(cx - size * 0.2, y - size * 0.06, size * 0.4, size * 0.09, size * 0.025);
  ctx.fillStyle = hex(PAL.metalDark);
  ctx.fill();
  strokeInk(size * 0.026);
  celCrescentPath(ctx, () => roundRect(cx - size * 0.2, y - size * 0.06, size * 0.4, size * 0.09, size * 0.025), cx, y - size * 0.015, size * 0.2, size * 0.05, capR.shadow, 0.5, 0.45);
  roundRect(x, y, w, h, size * 0.1);
  ctx.fillStyle = rgba(glass, 0.55);
  ctx.fill();
  strokeInk();
  ctx.save();
  roundRect(x, y, w, h, size * 0.1);
  ctx.clip();
  belly(ctx, cx, y + h * 0.5, w * 0.5, h * 0.5, glassR, 0.2);
  specStreak(ctx, cx - size * 0.07, y + h * 0.2, size * 0.22, size * 0.024, 0.42);
  rim(ctx, cx, y + h * 0.5, w * 0.5, h * 0.5, glassR.light, size * 0.024, 0.5);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.46, size * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = rgba(glow, 0.72);
  ctx.fill();
  celCrescent(ctx, cx, y + h * 0.46, size * 0.16, size * 0.16, glowR.shadow, 0.42, 0.35);
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.055, y + h * 0.41, size * 0.06, size * 0.035, -0.5, 0, Math.PI * 2);
  ctx.ellipse(cx + size * 0.055, y + h * 0.41, size * 0.06, size * 0.035, 0.5, 0, Math.PI * 2);
  ctx.fillStyle = rgba(0xffffff, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.1, y + h * 0.46, size * 0.035, h * 0.34, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(0xffffff, 0.42);
  ctx.fill();
  glossDot(ctx, cx - size * 0.1, y + h * 0.22, size * 0.018, 0.6);
  drawFace(cx, y + h * 0.63, size * 0.085, size * 0.04, 0.25);
  drawPips(y + h + size * 0.065);
  if (ascended) {
    roundRect(x - ink, y - size * 0.08, w + ink * 2, h + size * 0.1, size * 0.14);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(y + h * 0.5);
  }
});
