/**
 * PAINTER - The Rat King (id 'rat-king'). Three-rats-in-a-coat boss (V2).
 * Three stacked rat heads in a patched royal coat, bottle-cap medals, and many
 * tails. V2: the coat is the dominant mass (belly + cel + rim + a ticked hem),
 * each of the three heads is cel-shaded, the crown gets a specStreak glint, and
 * a cool denim halo sits behind.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, specStreak, fabricTicks, glossDot } from '../../paint';

registerCritterPainter('rat-king', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fur = warm(darken(PAL.mouse, 0.1));
  const furR = ramp(fur);
  const pink = warm(PAL.mousePink);
  const coat = warm(darken(PAL.denim, 0.16));
  const c3 = ramp(coat);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- cool denim halo behind ---
  haloBehind(ctx, cx, cy + size * 0.05, size * 0.45, coat, 0.22);

  // tails
  ctx.lineCap = 'round'; ctx.strokeStyle = hex(pink); ctx.lineWidth = size * 0.024;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.1, cy + size * 0.33); ctx.quadraticCurveTo(cx + sgn * size * 0.36, cy + size * 0.45, cx + sgn * size * 0.22, cy + size * 0.5 + wobble * size * 0.006); ctx.stroke(); }
  // legs
  ctx.strokeStyle = hex(darken(fur, 0.35)); ctx.fillStyle = hex(darken(fur, 0.35)); ctx.lineWidth = size * 0.03;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.03 + i * size * 0.13; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.022; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.24, y); ctx.lineTo(cx + sgn * size * 0.38, y + size * 0.05 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.38, y + size * 0.05 + kick, size * 0.015, 0, Math.PI * 2); ctx.fill(); } }

  // --- royal coat (dominant mass) ---
  const traceCoat = () => {
    ctx.moveTo(cx - size * 0.3, cy - size * 0.22); ctx.quadraticCurveTo(cx, cy - size * 0.36, cx + size * 0.3, cy - size * 0.22);
    ctx.lineTo(cx + size * 0.31, cy + size * 0.36); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx - size * 0.31, cy + size * 0.36); ctx.closePath();
  };
  ctx.beginPath(); traceCoat(); ctx.fillStyle = hex(coat); ctx.fill(); stroke();
  ctx.save(); ctx.beginPath(); traceCoat(); ctx.clip();
  belly(ctx, cx, cy + size * 0.07, size * 0.3, size * 0.34, c3, 0.5);
  celCrescent(ctx, cx, cy + size * 0.07, size * 0.31, size * 0.35, c3.shadow, 0.42, 0.5);
  rim(ctx, cx, cy + size * 0.07, size * 0.31, size * 0.35, c3.light, size * 0.03, 0.45);
  ctx.restore();
  // lapel V (interior identity line → innerInk from the highlight fill)
  ctx.beginPath(); ctx.moveTo(cx - size * 0.11, cy - size * 0.2); ctx.lineTo(cx, cy + size * 0.02); ctx.lineTo(cx + size * 0.11, cy - size * 0.2); ctx.strokeStyle = rgba(c3.light, 0.55); ctx.lineWidth = size * 0.02; ctx.stroke();
  // ticked hem
  fabricTicks(ctx, cx - size * 0.24, cy + size * 0.39, cx + size * 0.24, cy + size * 0.39, c3.light, 6, size * 0.05);
  // brass button medals with glints
  for (const dx of [-0.09, 0.09]) { ctx.beginPath(); ctx.arc(cx + size * dx, cy + size * 0.02, size * 0.035, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.butter); ctx.fill(); stroke(size * 0.012); glossDot(ctx, cx + size * dx - size * 0.012, cy + size * 0.008, size * 0.012, 0.7); }

  // --- three rat heads, each cel-shaded ---
  const heads = [{ x: -0.13, y: -0.24 }, { x: 0.13, y: -0.24 }, { x: 0, y: -0.36 }];
  for (let h = 0; h < heads.length; h++) {
    const hx = cx + size * heads[h].x; const hy = cy + size * heads[h].y + wobble * size * (h === 2 ? 0.006 : 0);
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + sgn * size * 0.07, hy - size * 0.05, size * 0.045, size * 0.052, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(size * 0.016); ctx.beginPath(); ctx.ellipse(hx + sgn * size * 0.07, hy - size * 0.05, size * 0.025, size * 0.03, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = rgba(pink, 0.7); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(hx, hy, size * 0.09, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(size * 0.02);
    celCrescent(ctx, hx, hy, size * 0.09, size * 0.08, furR.shadow, 0.42, 0.5);
    ctx.beginPath(); ctx.ellipse(hx, hy - size * 0.07, size * 0.022, size * 0.015, 0, 0, Math.PI * 2); ctx.fillStyle = hex(pink); ctx.fill();
    for (const sgn of [-1, 1]) { const ex = hx + sgn * size * 0.035; ctx.beginPath(); ctx.arc(ex, hy - size * 0.005, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.008); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.003, hy + size * 0.002, size * 0.012, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); }
  }
  // --- crown with a specStreak glint ---
  const traceCrown = () => { ctx.moveTo(cx - size * 0.08, cy - size * 0.47); ctx.lineTo(cx - size * 0.03, cy - size * 0.39); ctx.lineTo(cx, cy - size * 0.5); ctx.lineTo(cx + size * 0.03, cy - size * 0.39); ctx.lineTo(cx + size * 0.08, cy - size * 0.47); ctx.lineTo(cx + size * 0.07, cy - size * 0.39); ctx.lineTo(cx - size * 0.07, cy - size * 0.39); ctx.closePath(); };
  ctx.beginPath(); traceCrown(); ctx.fillStyle = hex(PAL.butter); ctx.fill(); stroke(size * 0.018);
  ctx.save(); ctx.beginPath(); traceCrown(); ctx.clip(); specStreak(ctx, cx - size * 0.01, cy - size * 0.44, size * 0.14, size * 0.022, 0.6); ctx.restore();
});
