/**
 * PAINTER - Herr Tick-Tock (id 'herr-tick-tock'). Cuckoo clock rewind tower.
 * A wooden clock house with roof peak, pendulum, and little side weights.
 * The clock face has punctual tyrant brows and a chime-ready mouth.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, mix } from '../../colors';
import { aoUnder, belly, celCrescent, celCrescentPath, ramp, rim, woodGrain } from '../../paint';

registerTowerPainter('herr-tick-tock', (ctx, size, _frame, opts) => {
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

  const wood = warm(PAL.wood);
  const woodR = ramp(wood);
  const faceR = ramp(PAL.butter);
  const accentR = ramp(accent);
  const x = cx - size * 0.25;
  const y = size * 0.27;
  const w = size * 0.5;
  const h = size * 0.39;
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.13);
  ctx.lineTo(x - size * 0.04, y + size * 0.05);
  ctx.lineTo(x + w + size * 0.04, y + size * 0.05);
  ctx.closePath();
  ctx.fillStyle = hex(mix(wood, woodR.shadow, 0.35));
  ctx.fill();
  strokeInk();
  celCrescentPath(ctx, () => { ctx.moveTo(cx, size * 0.13); ctx.lineTo(x - size * 0.04, y + size * 0.05); ctx.lineTo(x + w + size * 0.04, y + size * 0.05); ctx.closePath(); }, cx, size * 0.22, w * 0.52, size * 0.12, woodR.shadow, 0.45, 0.38);
  aoUnder(ctx, cx, y + h + size * 0.2, w * 0.42, size * 0.035, 0.2);
  roundRect(x, y, w, h, size * 0.04);
  ctx.fillStyle = hex(wood);
  ctx.fill();
  strokeInk();
  ctx.save();
  roundRect(x, y, w, h, size * 0.04);
  ctx.clip();
  belly(ctx, cx, y + h * 0.52, w * 0.5, h * 0.52, woodR, 0.34);
  celCrescentPath(ctx, () => roundRect(x, y, w, h, size * 0.04), cx, y + h * 0.52, w * 0.5, h * 0.52, woodR.shadow, 0.5, 0.38);
  rim(ctx, cx, y + h * 0.52, w * 0.5, h * 0.52, woodR.light, size * 0.023, 0.48);
  woodGrain(ctx, x + size * 0.05, y + size * 0.07, w - size * 0.1, h * 0.28, woodR.shadow, 41, 3);
  ctx.restore();
  roundRect(cx - size * 0.09, y - size * 0.01, size * 0.18, size * 0.11, size * 0.025);
  ctx.fillStyle = hex(mix(wood, woodR.shadow, 0.6));
  ctx.fill();
  strokeInk(size * 0.02);
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.55, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = hex(faceR.light);
  ctx.fill();
  strokeInk(size * 0.028);
  celCrescent(ctx, cx, y + h * 0.55, size * 0.15, size * 0.15, faceR.shadow, 0.42, 0.32);
  ctx.beginPath();
  ctx.moveTo(cx, y + h + size * 0.02);
  ctx.lineTo(cx, y + h + size * 0.16);
  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = COCOA_CSS;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, y + h + size * 0.18, size * 0.055, size * 0.035, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(accent);
  ctx.fill();
  strokeInk(size * 0.02);
  celCrescent(ctx, cx, y + h + size * 0.18, size * 0.055, size * 0.035, accentR.shadow, 0.42, 0.45);
  drawFace(cx, y + h * 0.5, size * 0.06, size * 0.034, -0.45);
  drawPips(size * 0.88);
  if (ascended) {
    roundRect(x - ink, size * 0.13, w + ink * 2, size * 0.67, size * 0.12);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(size * 0.47);
  }
});
