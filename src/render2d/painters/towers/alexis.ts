/**
 * PAINTER - A.L.E.X.I.S. (id 'alexis'). Smart speaker cardboard commander.
 * A squat fabric cylinder with a glowing assistant ring and little delivery boxes.
 * The face sits in the grille with calm managerial brows.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerTowerPainter('alexis', (ctx, size, _frame, opts) => {
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

  const body = warm(0x5e6b75);
  const fabric = warm(darken(PAL.denim, 0.18));
  const x = cx - size * 0.25;
  const y = size * 0.2;
  const w = size * 0.5;
  const h = size * 0.56;

  for (const sgn of [-1, 1]) {
    roundRect(cx + sgn * size * 0.2 - size * 0.09, y + size * 0.32, size * 0.18, size * 0.16, size * 0.025);
    ctx.fillStyle = hex(warm(0xcaa36d));
    ctx.fill();
    strokeInk(size * 0.024);
  }
  roundRect(x, y, w, h, size * 0.16);
  ctx.fillStyle = hex(body);
  ctx.fill();
  strokeInk();
  roundRect(x + size * 0.045, y + size * 0.1, w - size * 0.09, h - size * 0.16, size * 0.11);
  ctx.fillStyle = hex(fabric);
  ctx.fill();
  strokeInk(size * 0.026);

  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.12, size * 0.17, size * 0.045, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lighten(accent, 0.2), 0.86);
  ctx.fill();
  strokeInk(size * 0.018);
  ctx.fillStyle = rgba(lighten(PAL.metal, 0.1), 0.65);
  for (let row = 0; row < 3; row++) {
    for (let col = -2; col <= 2; col++) {
      ctx.beginPath();
      ctx.arc(cx + col * size * 0.055, y + size * (0.28 + row * 0.075), size * 0.011, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawFace(cx, y + size * 0.34, size * 0.1, size * 0.052, 0.2);
  drawPips(y + h + size * 0.06);
  if (ascended) {
    roundRect(x - ink, y - size * 0.02, w + ink * 2, h + size * 0.04, size * 0.19);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(y + h * 0.5);
  }
});
