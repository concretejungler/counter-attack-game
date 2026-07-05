/**
 * PAINTER - Saltimus Prime (id 'saltimus-prime'). sodium cone commander.
 * A household object silhouette with a clear face and personality brows.
 * Damage accent comes from its content damage type and tier pips mark upgrades.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { ramp, belly, celCrescentPath, rim, aoUnder, glossDot, specStreak, rivets, innerInk } from '../../paint';

registerTowerPainter('saltimus-prime', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('gas'));
  const glass = warm(0xf6f8f2);
  const glassR = ramp(glass);
  const metal = warm(PAL.metal);
  const metalR = ramp(metal);
  const accentR = ramp(accent);

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
  const drawFace = (fx: number, fy: number, spread: number, eyeR: number, mood: number, mouth: 'smile' | 'flat' | 'frown' | 'smirk') => {
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
    if (mouth === 'flat') {
      ctx.moveTo(fx - spread * 0.48, fy + eyeR * 1.48);
      ctx.lineTo(fx + spread * 0.48, fy + eyeR * 1.48);
    } else if (mouth === 'frown') {
      ctx.arc(fx, fy + eyeR * 1.55, spread * 0.38, Math.PI, 0);
    } else if (mouth === 'smirk') {
      ctx.moveTo(fx - spread * 0.38, fy + eyeR * 1.38);
      ctx.quadraticCurveTo(fx + spread * 0.1, fy + eyeR * 1.67, fx + spread * 0.5, fy + eyeR * 1.27);
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
  const ascendRect = (x: number, y: number, w: number, h: number, r: number, cy: number) => {
    if (!ascended) return;
    roundRect(x, y, w, h, r);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(cy);
  };
  const masonJar = (x: number, y: number, w: number, h: number, glass: number) => {
    roundRect(cx - size * 0.2, y - size * 0.06, size * 0.4, size * 0.09, size * 0.025);
    ctx.fillStyle = hex(PAL.metalDark);
    ctx.fill();
    strokeInk(size * 0.026);
    roundRect(x, y, w, h, size * 0.1);
    ctx.fillStyle = rgba(glass, 0.5);
    ctx.fill();
    strokeInk();
  };
  const jarGlint = (x: number, y: number, h: number) => {
    ctx.beginPath();
    ctx.ellipse(x + size * 0.13, y + h * 0.46, size * 0.035, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0xffffff, 0.42);
    ctx.fill();
  };
  const ascendJar = (x: number, y: number, w: number, h: number) => {
    ascendRect(x - ink, y - size * 0.08, w + ink * 2, h + size * 0.1, size * 0.14, y + h * 0.5);
  };

  const x = cx - size * 0.19, y = size * 0.19, w = size * 0.38, h = size * 0.55;
  aoUnder(ctx, cx, y + h + size * 0.025, w * 0.48, size * 0.04, 0.18);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.08, y + size * 0.18);
  ctx.lineTo(x - size * 0.2, y + h * 0.68);
  ctx.lineTo(x + size * 0.02, y + h * 0.56);
  ctx.closePath();
  ctx.fillStyle = rgba(accent, 0.72);
  ctx.fill();
  strokeInk(size * 0.021);
  roundRect(x + size * 0.03, y, w - size * 0.06, size * 0.14, size * 0.04);
  ctx.fillStyle = hex(metal);
  ctx.fill();
  strokeInk(size * 0.027);
  celCrescentPath(ctx, () => roundRect(x + size * 0.03, y, w - size * 0.06, size * 0.14, size * 0.04), cx, y + size * 0.07, w * 0.44, size * 0.08, metalR.shadow, 0.45, 0.42);
  ctx.save();
  roundRect(x + size * 0.03, y, w - size * 0.06, size * 0.14, size * 0.04);
  ctx.clip();
  specStreak(ctx, cx - size * 0.03, y + size * 0.045, size * 0.2, size * 0.025, 0.38);
  ctx.restore();
  rivets(ctx, [{ x: x + w * 0.32, y: y + size * 0.07 }, { x: x + w * 0.68, y: y + size * 0.07 }], size * 0.011, innerInk(metal));
  roundRect(x, y + size * 0.12, w, h, size * 0.11);
  ctx.fillStyle = rgba(glass, 0.72);
  ctx.fill();
  strokeInk();
  ctx.save();
  roundRect(x, y + size * 0.12, w, h, size * 0.11);
  ctx.clip();
  belly(ctx, cx, y + h * 0.54, w * 0.46, h * 0.48, glassR, 0.28);
  specStreak(ctx, cx - size * 0.04, y + h * 0.32, size * 0.19, size * 0.028, 0.3);
  glossDot(ctx, x + w * 0.3, y + h * 0.31, size * 0.023, 0.62);
  ctx.restore();
  celCrescentPath(ctx, () => roundRect(x, y + size * 0.12, w, h, size * 0.11), cx, y + h * 0.56, w * 0.5, h * 0.5, glassR.shadow, 0.45, 0.28);
  rim(ctx, cx, y + h * 0.56, w * 0.5, h * 0.5, glassR.light, size * 0.022, 0.42);
  ctx.fillStyle = rgba(0xffffff, 0.86);
  for (let i = 0; i < 4; i++) {
    const rx = x + w * (0.28 + ((i * 37) % 44) / 100);
    const ry = y + h * (0.38 + ((i * 29) % 26) / 100);
    ctx.beginPath();
    ctx.arc(rx, ry, size * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  roundRect(x + size * 0.04, y + h * 0.56, w - size * 0.08, size * 0.12, size * 0.03);
  ctx.fillStyle = rgba(accentR.light, 0.3);
  ctx.fill();
  strokeInk(size * 0.014);
  drawFace(cx, y + h * 0.47, size * 0.072, size * 0.037, -0.25, 'flat');
  drawPips(size * 0.86);
  ascendRect(x - ink, y - ink * 0.4, w + ink * 2, h + size * 0.05, size * 0.14, y + h * 0.5);

});
