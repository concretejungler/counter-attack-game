/**
 * PAINTER - Bandolero (id 'bandolero'). Rubber-band ballista sniper.
 * A wooden junk-drawer frame with fork arms and stretched bands points east.
 * The base carries a narrow-eyed drifter face and tiny wheels.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerTowerPainter('bandolero', (ctx, size, _frame, opts) => {
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

  const wood = warm(PAL.wood);
  const band = warm(darken(accent, 0.18));
  const baseX = cx - size * 0.29;
  const baseY = size * 0.47;
  const baseW = size * 0.5;
  const baseH = size * 0.18;

  ctx.strokeStyle = hex(darken(wood, 0.08));
  ctx.lineWidth = size * 0.07;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, baseY);
  ctx.lineTo(cx + size * 0.12, size * 0.27);
  ctx.moveTo(cx - size * 0.12, baseY + size * 0.15);
  ctx.lineTo(cx + size * 0.15, size * 0.35);
  ctx.stroke();
  ctx.strokeStyle = hex(band);
  ctx.lineWidth = size * 0.028;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.12, size * 0.27);
  ctx.quadraticCurveTo(cx + size * 0.28, size * 0.32, cx + size * 0.32, size * 0.31);
  ctx.quadraticCurveTo(cx + size * 0.27, size * 0.38, cx + size * 0.15, size * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, baseY + size * 0.08);
  ctx.lineTo(cx + size * 0.34, size * 0.31);
  ctx.lineWidth = size * 0.036;
  ctx.strokeStyle = hex(PAL.metalDark);
  ctx.stroke();

  roundRect(baseX, baseY, baseW, baseH, size * 0.05);
  ctx.fillStyle = hex(wood);
  ctx.fill();
  strokeInk();
  ctx.beginPath();
  ctx.moveTo(baseX + size * 0.05, baseY + baseH * 0.33);
  ctx.lineTo(baseX + baseW - size * 0.04, baseY + baseH * 0.25);
  ctx.strokeStyle = rgba(darken(wood, 0.35), 0.55);
  ctx.lineWidth = size * 0.018;
  ctx.stroke();
  for (const dx of [-0.17, 0.16]) {
    ctx.beginPath();
    ctx.arc(cx + size * dx, baseY + baseH + size * 0.035, size * 0.052, 0, Math.PI * 2);
    ctx.fillStyle = hex(darken(PAL.metal, 0.05));
    ctx.fill();
    strokeInk(size * 0.024);
  }

  drawFace(cx - size * 0.05, baseY + size * 0.075, size * 0.075, size * 0.038, -0.5);
  drawPips(size * 0.79);
  if (ascended) {
    roundRect(baseX - ink, size * 0.22, size * 0.68, size * 0.5, size * 0.11);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(size * 0.47);
  }
});
