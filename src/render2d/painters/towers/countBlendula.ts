/**
 * PAINTER - Count Blendula (id 'count-blendula'). Countertop blender shredder.
 * A glass jar full of smoothie menace sits over a heavy metal base.
 * Tiny fangs and sharp brows sell the vampire appliance joke.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerTowerPainter('count-blendula', (ctx, size, _frame, opts) => {
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

  const glass = warm(0xbfe3f7);
  const base = warm(PAL.metal);

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.18, size * 0.18);
  ctx.lineTo(cx + size * 0.17, size * 0.18);
  ctx.lineTo(cx + size * 0.22, size * 0.5);
  ctx.quadraticCurveTo(cx, size * 0.56, cx - size * 0.22, size * 0.5);
  ctx.closePath();
  ctx.fillStyle = rgba(glass, 0.62);
  ctx.fill();
  strokeInk();
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, size * 0.38);
  ctx.quadraticCurveTo(cx, size * 0.32, cx + size * 0.22, size * 0.39);
  ctx.lineTo(cx + size * 0.22, size * 0.55);
  ctx.lineTo(cx - size * 0.22, size * 0.55);
  ctx.closePath();
  ctx.fillStyle = rgba(lighten(accent, 0.08), 0.78);
  ctx.fill();
  ctx.restore();
  roundRect(cx - size * 0.2, size * 0.13, size * 0.38, size * 0.075, size * 0.025);
  ctx.fillStyle = hex(darken(PAL.metal, 0.08));
  ctx.fill();
  strokeInk(size * 0.026);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, size * 0.47);
    ctx.lineTo(cx + Math.cos(a - 0.35) * size * 0.13, size * 0.47 + Math.sin(a - 0.35) * size * 0.05);
    ctx.lineTo(cx + Math.cos(a + 0.35) * size * 0.13, size * 0.47 + Math.sin(a + 0.35) * size * 0.05);
    ctx.closePath();
    ctx.fillStyle = hex(PAL.metalDark);
    ctx.fill();
  }

  const x = cx - size * 0.25;
  const y = size * 0.52;
  const w = size * 0.5;
  const h = size * 0.23;
  roundRect(x, y, w, h, size * 0.06);
  ctx.fillStyle = hex(base);
  ctx.fill();
  strokeInk();
  roundRect(x + size * 0.05, y + size * 0.045, w - size * 0.1, size * 0.07, size * 0.03);
  ctx.fillStyle = hex(darken(base, 0.12));
  ctx.fill();
  drawFace(cx, y + size * 0.07, size * 0.085, size * 0.038, -0.35);
  ctx.fillStyle = '#fff7dd';
  for (const dx of [-0.035, 0.035]) {
    ctx.beginPath();
    ctx.moveTo(cx + size * dx, y + size * 0.135);
    ctx.lineTo(cx + size * (dx + 0.02), y + size * 0.18);
    ctx.lineTo(cx + size * (dx - 0.02), y + size * 0.18);
    ctx.closePath();
    ctx.fill();
  }
  drawPips(y + h + size * 0.055);
  if (ascended) {
    roundRect(x - ink, size * 0.13, w + ink * 2, size * 0.63, size * 0.13);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(size * 0.43);
  }
});
