/**
 * PAINTER - Snappy & Sons (id 'snappy-and-sons'). Classic MOUSETRAP family business.
 * A wooden base plank, a thick U spring-bar snapper held at HALF-COCK by its hold-bar,
 * a cheese wedge on the trigger pedal — plus one tiny BABY trap beside it (the "& Sons"
 * gag). Eager family face; damage accent = its swat type; tier pips mark upgrades.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { ramp, belly, celCrescentPath, rim, aoUnder, specStreak, woodGrain, rivets, innerInk } from '../../paint';

registerTowerPainter('snappy-and-sons', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('swat'));
  const wood = warm(PAL.wood);
  const metal = warm(PAL.metal);
  const cheese = warm(PAL.butter);
  const woodR = ramp(wood);
  const metalR = ramp(metal);
  const cheeseR = ramp(cheese);

  const strokeInk = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
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
  const drawFace = (fx: number, fy: number, spread: number, eyeR: number) => {
    for (const sgn of [-1, 1]) {
      const ex = fx + sgn * spread;
      ctx.beginPath(); ctx.arc(ex, fy, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); strokeInk(size * 0.015);
      ctx.beginPath(); ctx.arc(ex + eyeR * 0.2, fy + eyeR * 0.12, eyeR * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
      ctx.beginPath(); ctx.arc(ex - eyeR * 0.24, fy - eyeR * 0.28, eyeR * 0.18, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      // eager raised brows
      ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022;
      ctx.beginPath();
      ctx.arc(ex, fy - eyeR * 1.5, eyeR * 0.9, 1.05 * Math.PI, 1.95 * Math.PI);
      ctx.stroke();
    }
    // big eager grin
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.arc(fx, fy + eyeR * 1.1, spread * 0.55, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  };
  const drawPips = (py: number) => {
    const pr = size * 0.028;
    const gap = pr * 2.8;
    const px0 = cx - ((tier - 1) * gap) / 2;
    for (let i = 0; i < tier; i++) {
      ctx.beginPath(); ctx.arc(px0 + i * gap, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = hex(PAL.butter); ctx.fill(); strokeInk(size * 0.014);
    }
  };
  const drawSparkles = (cyc: number) => {
    ctx.fillStyle = 'rgba(255,240,170,0.95)';
    for (const [dx, dy] of [[-0.32, 0.0], [0.34, 0.14], [0.22, -0.24]] as [number, number][]) {
      const sxp = cx + size * dx; const syp = cyc + size * dy;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.lineTo(sxp + Math.cos(a) * size * 0.03, syp + Math.sin(a) * size * 0.03);
        ctx.lineTo(sxp + Math.cos(a + 0.39) * size * 0.012, syp + Math.sin(a + 0.39) * size * 0.012);
      }
      ctx.closePath(); ctx.fill();
    }
  };

  // --- tiny BABY trap beside it (the "& Sons") — drawn first, sits lower-east ---
  const babyX = cx + size * 0.18, babyY = size * 0.62, babyW = size * 0.22, babyH = size * 0.14;
  aoUnder(ctx, cx - size * 0.11, size * 0.79, size * 0.35, size * 0.045, 0.2);
  roundRect(babyX, babyY, babyW, babyH, size * 0.03);
  ctx.fillStyle = hex(woodR.shadow); ctx.fill(); strokeInk(size * 0.03);
  ctx.save(); roundRect(babyX, babyY, babyW, babyH, size * 0.03); ctx.clip(); woodGrain(ctx, babyX, babyY, babyW, babyH, woodR.shadow, 31, 2); ctx.restore();
  ctx.strokeStyle = hex(metal); ctx.lineWidth = size * 0.028; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(babyX + size * 0.03, babyY + size * 0.03);
  ctx.quadraticCurveTo(babyX + babyW * 0.5, babyY - size * 0.08, babyX + babyW * 0.85, babyY + size * 0.05);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(babyX + size * 0.03, babyY + size * 0.03, size * 0.018, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.metalDark); ctx.fill();

  // --- main wooden base plank ---
  const px = cx - size * 0.4, py = size * 0.48, pw = size * 0.56, ph = size * 0.28;
  roundRect(px, py, pw, ph, size * 0.045);
  ctx.fillStyle = hex(wood); ctx.fill(); strokeInk();
  ctx.save();
  roundRect(px, py, pw, ph, size * 0.045);
  ctx.clip();
  belly(ctx, px + pw * 0.5, py + ph * 0.5, pw * 0.46, ph * 0.46, woodR, 0.28);
  woodGrain(ctx, px + size * 0.02, py + size * 0.02, pw - size * 0.04, ph - size * 0.04, woodR.shadow, 32, 3);
  ctx.restore();
  celCrescentPath(ctx, () => roundRect(px, py, pw, ph, size * 0.045), px + pw * 0.5, py + ph * 0.5, pw * 0.5, ph * 0.5, woodR.shadow, 0.45, 0.32);
  rim(ctx, px + pw * 0.5, py + ph * 0.5, pw * 0.5, ph * 0.5, woodR.light, size * 0.022, 0.42);

  // --- spring coil hinge at the back-west corner ---
  const coilX = px + size * 0.06, coilY = py + size * 0.04;
  for (const rr of [size * 0.045, size * 0.026]) { ctx.beginPath(); ctx.arc(coilX, coilY, rr, 0, Math.PI * 2); ctx.strokeStyle = hex(PAL.metalDark); ctx.lineWidth = size * 0.02; ctx.stroke(); }

  // --- thick U spring-bar snapper, HALF-COCK (raised, arcing back-west over toward east) ---
  ctx.strokeStyle = hex(metal); ctx.lineWidth = size * 0.055; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(coilX, coilY);
  ctx.quadraticCurveTo(cx - size * 0.12, size * 0.2, cx + size * 0.02, size * 0.34);
  ctx.lineTo(cx + size * 0.12, size * 0.46);
  ctx.stroke();
  // kill cross-bar at the business end (makes the "U")
  specStreak(ctx, cx - size * 0.07, size * 0.28, size * 0.18, size * 0.032, 0.36);
  ctx.strokeStyle = hex(metalR.shadow); ctx.lineWidth = size * 0.045;
  ctx.beginPath(); ctx.moveTo(cx + size * 0.05, size * 0.4); ctx.lineTo(cx + size * 0.17, size * 0.52); ctx.stroke();
  // metal sheen on the snapper
  ctx.strokeStyle = rgba(metalR.light, 0.6); ctx.lineWidth = size * 0.016;
  ctx.beginPath();
  ctx.moveTo(coilX, coilY - size * 0.01);
  ctx.quadraticCurveTo(cx - size * 0.12, size * 0.19, cx + size * 0.01, size * 0.33);
  ctx.stroke();

  // --- hold-bar pinning the snapper to the trigger (thin), reads as "set" ---
  ctx.strokeStyle = hex(PAL.metalDark); ctx.lineWidth = size * 0.014;
  ctx.beginPath(); ctx.moveTo(cx + size * 0.01, size * 0.33); ctx.lineTo(cx + size * 0.04, size * 0.6); ctx.stroke();

  // --- cheese wedge on the trigger pedal ---
  const chX = cx - size * 0.02, chY = size * 0.6;
  ctx.beginPath();
  ctx.moveTo(chX, chY - size * 0.09);
  ctx.lineTo(chX + size * 0.12, chY + size * 0.02);
  ctx.lineTo(chX - size * 0.05, chY + size * 0.05);
  ctx.closePath();
  ctx.fillStyle = hex(cheese); ctx.fill(); strokeInk(size * 0.02);
  celCrescentPath(ctx, () => { ctx.moveTo(chX, chY - size * 0.09); ctx.lineTo(chX + size * 0.12, chY + size * 0.02); ctx.lineTo(chX - size * 0.05, chY + size * 0.05); ctx.closePath(); }, chX + size * 0.03, chY, size * 0.09, size * 0.07, cheeseR.shadow, 0.35, 0.35);
  rivets(ctx, [{ x: coilX, y: coilY }], size * 0.013, innerInk(metal));
  ctx.fillStyle = rgba(cheeseR.shadow, 0.8);
  ctx.beginPath(); ctx.arc(chX + size * 0.03, chY - size * 0.005, size * 0.014, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chX + size * 0.005, chY + size * 0.03, size * 0.011, 0, Math.PI * 2); ctx.fill();

  // --- eager family face on the plank front + tier pips ---
  drawFace(cx - size * 0.26, py + ph * 0.5, size * 0.062, size * 0.03);
  drawPips(size * 0.9);

  if (ascended) {
    roundRect(px - ink, size * 0.14, size * 0.86, size * 0.66, size * 0.13);
    ctx.strokeStyle = hex(PAL.butter); ctx.lineWidth = size * 0.03; ctx.stroke();
    drawSparkles(size * 0.46);
  }
});
