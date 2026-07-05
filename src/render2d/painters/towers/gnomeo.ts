/**
 * PAINTER - Gnomeo (id 'gnomeo'). Garden gnome decoy bomb.
 * A red hat, ceramic beard, and squat boots create a classic gnome silhouette.
 * The fixed smile and stern brows make him cheerfully unsettling.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, mix } from '../../colors';
import { aoUnder, belly, celCrescent, celCrescentPath, glossDot, ramp, rim } from '../../paint';

registerTowerPainter('gnomeo', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('heat'));

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

  const robe = warm(PAL.denim);
  const hat = warm(dmgTypeColor('heat'));
  const beard = warm(0xf3efe4);
  const robeR = ramp(robe);
  const hatR = ramp(hat);
  const beardR = ramp(beard);
  const skin = warm(0xf0c29c);
  const skinR = ramp(skin);
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.13);
  ctx.lineTo(cx - size * 0.22, size * 0.38);
  ctx.quadraticCurveTo(cx, size * 0.47, cx + size * 0.22, size * 0.38);
  ctx.closePath();
  ctx.fillStyle = hex(hat);
  ctx.fill();
  strokeInk();
  celCrescentPath(ctx, () => { ctx.moveTo(cx, size * 0.13); ctx.lineTo(cx - size * 0.22, size * 0.38); ctx.quadraticCurveTo(cx, size * 0.47, cx + size * 0.22, size * 0.38); ctx.closePath(); }, cx, size * 0.3, size * 0.22, size * 0.18, hatR.shadow, 0.45, 0.45);
  ctx.beginPath();
  ctx.arc(cx, size * 0.42, size * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = hex(skin);
  ctx.fill();
  strokeInk(size * 0.028);
  celCrescent(ctx, cx, size * 0.42, size * 0.16, size * 0.16, skinR.shadow, 0.42, 0.4);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.2, size * 0.45);
  ctx.quadraticCurveTo(cx, size * 0.73, cx + size * 0.2, size * 0.45);
  ctx.quadraticCurveTo(cx, size * 0.58, cx - size * 0.2, size * 0.45);
  ctx.fillStyle = hex(beard);
  ctx.fill();
  strokeInk(size * 0.028);
  celCrescentPath(ctx, () => { ctx.moveTo(cx - size * 0.2, size * 0.45); ctx.quadraticCurveTo(cx, size * 0.73, cx + size * 0.2, size * 0.45); ctx.quadraticCurveTo(cx, size * 0.58, cx - size * 0.2, size * 0.45); ctx.closePath(); }, cx, size * 0.56, size * 0.2, size * 0.18, beardR.shadow, 0.5, 0.32);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.18, size * 0.6);
  ctx.lineTo(cx - size * 0.24, size * 0.75);
  ctx.lineTo(cx + size * 0.24, size * 0.75);
  ctx.lineTo(cx + size * 0.18, size * 0.6);
  ctx.closePath();
  aoUnder(ctx, cx, size * 0.76, size * 0.24, size * 0.035, 0.22);
  ctx.fillStyle = hex(robe);
  ctx.fill();
  strokeInk();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.18, size * 0.6);
  ctx.lineTo(cx - size * 0.24, size * 0.75);
  ctx.lineTo(cx + size * 0.24, size * 0.75);
  ctx.lineTo(cx + size * 0.18, size * 0.6);
  ctx.closePath();
  ctx.clip();
  belly(ctx, cx, size * 0.68, size * 0.24, size * 0.12, robeR, 0.45);
  celCrescentPath(ctx, () => { ctx.moveTo(cx - size * 0.18, size * 0.6); ctx.lineTo(cx - size * 0.24, size * 0.75); ctx.lineTo(cx + size * 0.24, size * 0.75); ctx.lineTo(cx + size * 0.18, size * 0.6); ctx.closePath(); }, cx, size * 0.68, size * 0.24, size * 0.12, robeR.shadow, 0.5, 0.38);
  rim(ctx, cx, size * 0.68, size * 0.24, size * 0.12, robeR.light, size * 0.02, 0.48);
  ctx.restore();
  glossDot(ctx, cx - size * 0.08, size * 0.62, size * 0.018, 0.62);
  for (const sgn of [-1, 1]) {
    roundRect(cx + sgn * size * 0.05 - size * 0.09, size * 0.72, size * 0.18, size * 0.06, size * 0.025);
    ctx.fillStyle = hex(ramp(PAL.woodDark).base);
    ctx.fill();
    strokeInk(size * 0.02);
  }
  drawFace(cx, size * 0.39, size * 0.075, size * 0.038, -0.2);
  drawPips(size * 0.84);
  if (ascended) {
    roundRect(cx - size * 0.26, size * 0.11, size * 0.52, size * 0.67, size * 0.15);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    drawSparkles(size * 0.46);
  }
});
