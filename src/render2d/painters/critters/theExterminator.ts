/**
 * PAINTER - The Exterminator (id 'the-exterminator'). Human finale boss (V2).
 * A looming top-down gas-mask human with a backpack tank and sprayer wand,
 * strictly cartoon. V2: the hazmat suit reads as glossy PLASTIC (belly + cel +
 * rim + a plastic highlight), the tank is cel-lit metal, the mask lenses get
 * glossDot glints; a toxic-green halo sits behind.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, darken, lighten } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, specStreak, glossDot, aoUnder } from '../../paint';

registerCritterPainter('the-exterminator', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const suit = warm(mix(PAL.metal, PAL.moth, 0.42));
  const s3 = ramp(suit);
  const mask = warm(PAL.metalDark);
  const m3 = ramp(mask);
  const tank = warm(mix(PAL.goo, PAL.metal, 0.38));
  const t3 = ramp(tank);
  const glove = warm(PAL.butter);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- toxic-green halo behind ---
  haloBehind(ctx, cx, cy + size * 0.02, size * 0.46, PAL.goo, 0.24);

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // backpack tank: cel-lit metal + rim + a bottom glint
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.19, size * 0.18, size * 0.33, 0, 0, Math.PI * 2); ctx.fillStyle = hex(tank); ctx.fill(); stroke(size * 0.032);
  celCrescent(ctx, cx, cy + size * 0.19, size * 0.18, size * 0.33, t3.shadow, 0.4, 0.5);
  rim(ctx, cx, cy + size * 0.19, size * 0.18, size * 0.33, t3.light, size * 0.03, 0.45);
  glossDot(ctx, cx - size * 0.05, cy + size * 0.42, size * 0.022, 0.7);
  ctx.strokeStyle = rgba(PAL.flyWing, 0.75); ctx.lineWidth = size * 0.016; for (const dx of [-0.06, 0.06]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy - size * 0.08); ctx.lineTo(cx + size * dx, cy + size * 0.43); ctx.stroke(); }

  // arms + gloves
  ctx.strokeStyle = hex(suit); ctx.lineWidth = size * 0.09;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.2, cy - size * 0.04); ctx.quadraticCurveTo(cx + sgn * size * 0.38, cy + size * 0.03, cx + sgn * size * 0.31, cy + size * 0.25 + wobble * size * 0.01); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.31, cy + size * 0.25 + wobble * size * 0.01, size * 0.052, 0, Math.PI * 2); ctx.fillStyle = hex(glove); ctx.fill(); stroke(size * 0.02); glossDot(ctx, cx + sgn * size * 0.31 - size * 0.018, cy + size * 0.23 + wobble * size * 0.01, size * 0.016, 0.7); }

  aoUnder(ctx, cx, cy + size * 0.4, size * 0.24, size * 0.05, 0.2);

  // --- hazmat suit torso: glossy plastic (belly + cel + rim + highlight) ---
  const traceSuit = () => { ctx.moveTo(cx - size * 0.28, cy - size * 0.15); ctx.quadraticCurveTo(cx, cy - size * 0.28, cx + size * 0.28, cy - size * 0.15); ctx.lineTo(cx + size * 0.24, cy + size * 0.35); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx - size * 0.24, cy + size * 0.35); ctx.closePath(); };
  ctx.beginPath(); traceSuit(); ctx.fillStyle = hex(suit); ctx.fill(); stroke();
  ctx.save(); ctx.beginPath(); traceSuit(); ctx.clip();
  belly(ctx, cx, cy + size * 0.08, size * 0.26, size * 0.3, s3, 0.5);
  celCrescent(ctx, cx, cy + size * 0.08, size * 0.28, size * 0.32, s3.shadow, 0.42, 0.5);
  // vertical plastic highlight (wet gloss)
  ctx.beginPath(); ctx.ellipse(cx - size * 0.12, cy + size * 0.06, size * 0.035, size * 0.24, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.32)'; ctx.fill();
  rim(ctx, cx, cy + size * 0.08, size * 0.28, size * 0.32, s3.light, size * 0.03, 0.5);
  ctx.restore();
  glossDot(ctx, cx - size * 0.13, cy - size * 0.09, size * 0.026, 0.6);
  // apron seams (interior identity lines)
  ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.14); ctx.lineTo(cx - size * 0.08, cy + size * 0.35); ctx.moveTo(cx, cy - size * 0.14); ctx.lineTo(cx + size * 0.08, cy + size * 0.35); ctx.strokeStyle = rgba(darken(suit, 0.25), 0.7); ctx.lineWidth = size * 0.023; ctx.stroke();

  // sprayer wand + nozzle
  ctx.strokeStyle = hex(PAL.metalDark); ctx.lineWidth = size * 0.026;
  ctx.beginPath(); ctx.moveTo(cx - size * 0.25, cy + size * 0.17); ctx.quadraticCurveTo(cx - size * 0.46, cy + size * 0.05, cx - size * 0.42, cy - size * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.42, cy - size * 0.1); ctx.lineTo(cx - size * 0.24, cy - size * 0.23); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx - size * 0.22, cy - size * 0.24, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = rgba(PAL.goo, 0.9); ctx.fill(); stroke(size * 0.01);

  // --- gas-mask head: cel-lit + lens glints ---
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.29, size * 0.19, size * 0.17, 0, 0, Math.PI * 2); ctx.fillStyle = hex(mask); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.29, size * 0.19, size * 0.17, m3.shadow, 0.42, 0.5);
  rim(ctx, cx, cy - size * 0.29, size * 0.19, size * 0.17, m3.light, size * 0.028, 0.45);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.17, size * 0.075, size * 0.085, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(mask, 0.28)); ctx.fill(); stroke(size * 0.018);
  ctx.strokeStyle = rgba(PAL.flyWing, 0.5); ctx.lineWidth = size * 0.012; for (const dx of [-0.025, 0, 0.025]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy - size * 0.22); ctx.lineTo(cx + size * dx, cy - size * 0.12); ctx.stroke(); }
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.075; const ey = cy - size * 0.31;
    ctx.beginPath(); ctx.arc(ex, ey, size * 0.06, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.flyWing); ctx.fill(); stroke(size * 0.018);
    ctx.beginPath(); ctx.arc(ex + wobble * size * 0.004, ey + size * 0.012, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    glossDot(ctx, ex - size * 0.018, ey - size * 0.018, size * 0.016, 0.85);
  }
});
