/**
 * PAINTER - Queen Ant Jar (id 'jar-queen-ant'). Mason jar colony banker.
 * A household object silhouette with a clear face and personality brows.
 * Damage accent comes from its content damage type and tier pips mark upgrades.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerTowerPainter('jar-queen-ant', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('gas'));

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

  const glass = warm(0xbfe3f7);
  const ant = warm(PAL.antSoldier);
  const x = cx - size * 0.23, y = size * 0.23, w = size * 0.46, h = size * 0.5;
  masonJar(x, y, w, h, glass);
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.43, size * 0.13, size * 0.17, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(ant);
  ctx.fill();
  strokeInk(size * 0.026);
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.24, size * 0.074, 0, Math.PI * 2);
  ctx.fillStyle = hex(lighten(ant, 0.08));
  ctx.fill();
  strokeInk(size * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.09, y + h * 0.15);
  ctx.quadraticCurveTo(cx, y + h * 0.03, cx + size * 0.09, y + h * 0.15);
  ctx.lineTo(cx + size * 0.055, y + h * 0.2);
  ctx.lineTo(cx, y + h * 0.14);
  ctx.lineTo(cx - size * 0.055, y + h * 0.2);
  ctx.closePath();
  ctx.fillStyle = hex(PAL.butter);
  ctx.fill();
  strokeInk(size * 0.014);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * size * 0.08, y + h * 0.38);
    ctx.lineTo(cx + sx * size * 0.17, y + h * 0.34);
    ctx.moveTo(cx + sx * size * 0.08, y + h * 0.47);
    ctx.lineTo(cx + sx * size * 0.17, y + h * 0.49);
    ctx.strokeStyle = hex(darken(ant, 0.35));
    ctx.lineWidth = size * 0.014;
    ctx.stroke();
  }
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + sx * size * 0.11, y + h * 0.67, size * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = hex(accent);
    ctx.fill();
    strokeInk(size * 0.012);
  }
  jarGlint(x, y, h);
  drawFace(cx, y + h * 0.66, size * 0.085, size * 0.04, 0.32, 'smile');
  drawPips(y + h + size * 0.065);
  ascendJar(x, y, w, h);

});
