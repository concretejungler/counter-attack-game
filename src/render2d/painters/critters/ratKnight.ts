/**
 * PAINTER - Rat Knight (id 'rat-knight'). Armored pantry rat. (V2 elite shading.)
 * A broad bottle-cap shield, tiny lance, helmet ears, and whisker snout define
 * the knight silhouette. V2: the shield reads as hammered metal (spec streak +
 * two rivets), the helmet gets a cel crescent + streak, fur belly + rim.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten } from '../../colors';
import { ramp, celCrescent, celCrescentPath, belly, rim, specStreak, rivets, innerInk } from '../../paint';

registerCritterPainter('rat-knight', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fur = warm(mix(PAL.mouse, 0x000000, 0.08));
  const furR = ramp(fur);
  const pink = warm(PAL.mousePink);
  const metal = warm(PAL.metal);
  const metalR = ramp(metal);
  const shield = warm(mix(PAL.metal, PAL.denim, 0.35));
  const shieldR = ramp(shield);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- tail ---
  ctx.lineCap = 'round'; ctx.strokeStyle = hex(pink); ctx.lineWidth = size * 0.03; ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.25); ctx.quadraticCurveTo(cx + size * 0.28, cy + size * 0.38, cx + size * 0.11, cy + size * 0.47); ctx.stroke();

  // --- feet ---
  ctx.strokeStyle = innerInk(fur); ctx.fillStyle = innerInk(fur); ctx.lineWidth = size * 0.038;
  for (let i = 0; i < 2; i++) { const y = cy + size * (0.03 + i * 0.16); const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.13, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.06 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.24, y + size * 0.06 + kick, size * 0.019, 0, Math.PI * 2); ctx.fill(); } }

  // --- lance ---
  ctx.beginPath(); ctx.moveTo(cx - size * 0.17, cy - size * 0.05); ctx.lineTo(cx + size * 0.24, cy - size * 0.28); ctx.strokeStyle = hex(PAL.woodDark); ctx.lineWidth = size * 0.026; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + size * 0.24, cy - size * 0.28); ctx.lineTo(cx + size * 0.31, cy - size * 0.31); ctx.lineTo(cx + size * 0.27, cy - size * 0.23); ctx.closePath(); ctx.fillStyle = hex(metal); ctx.fill(); stroke(size * 0.013);

  // --- helmet ears ---
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.14, cy - size * 0.21, size * 0.08, size * 0.095, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.14, cy - size * 0.21, size * 0.043, size * 0.055, sgn * 0.2, 0, Math.PI * 2); ctx.fillStyle = rgba(pink, 0.7); ctx.fill(); }

  // --- fur body (dominant mass): belly + cel + rim ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.18, size * 0.27, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  belly(ctx, cx, cy + size * 0.08, size * 0.17, size * 0.26, furR, 0.5);
  celCrescent(ctx, cx, cy + size * 0.08, size * 0.18, size * 0.27, furR.shadow, 0.45, 0.5);
  rim(ctx, cx, cy + size * 0.08, size * 0.18, size * 0.27, furR.light, size * 0.022, 0.45);

  // --- chest plate (metal) ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.12, size * 0.19, 0, 0, Math.PI * 2); ctx.fillStyle = hex(metal); ctx.fill(); stroke(size * 0.024);
  celCrescent(ctx, cx, cy + size * 0.06, size * 0.12, size * 0.19, metalR.shadow, 0.45, 0.45);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.115, size * 0.185, 0, 0, Math.PI * 2); ctx.clip(); specStreak(ctx, cx - size * 0.03, cy - size * 0.02, size * 0.14, size * 0.03, 0.4); ctx.restore();

  // --- bottle-cap shield: hammered metal (spec streak + rivets) ---
  const sx = cx - size * 0.16, sy = cy + size * 0.05;
  const shieldTrace = () => { ctx.ellipse(sx, sy, size * 0.12, size * 0.17, -0.25, 0, Math.PI * 2); };
  ctx.beginPath(); shieldTrace(); ctx.fillStyle = hex(shield); ctx.fill(); stroke();
  celCrescentPath(ctx, shieldTrace, sx, sy, size * 0.12, size * 0.17, shieldR.shadow, 0.45, 0.5);
  ctx.save(); ctx.beginPath(); shieldTrace(); ctx.clip(); specStreak(ctx, sx - size * 0.03, sy - size * 0.05, size * 0.16, size * 0.035, 0.45); ctx.restore();
  ctx.strokeStyle = rgba(shieldR.shadow, 0.85); ctx.lineWidth = size * 0.018; ctx.beginPath(); ctx.arc(sx, sy, size * 0.07, 0, Math.PI * 2); ctx.stroke();
  rivets(ctx, [{ x: sx - size * 0.02, y: sy - size * 0.11 }, { x: sx + size * 0.03, y: sy + size * 0.11 }], size * 0.017, innerInk(shield));

  // --- head + helmet ---
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.15, size * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.18, size * 0.15, size * 0.14, furR.shadow, 0.42, 0.45);
  const helmTrace = () => { ctx.arc(cx, cy - size * 0.24, size * 0.14, Math.PI, 0); ctx.lineTo(cx + size * 0.14, cy - size * 0.17); ctx.lineTo(cx - size * 0.14, cy - size * 0.17); ctx.closePath(); };
  ctx.beginPath(); helmTrace(); ctx.fillStyle = hex(metal); ctx.fill(); stroke(size * 0.024);
  celCrescentPath(ctx, helmTrace, cx, cy - size * 0.225, size * 0.14, size * 0.09, metalR.shadow, 0.4, 0.5);
  ctx.save(); ctx.beginPath(); helmTrace(); ctx.clip(); specStreak(ctx, cx - size * 0.03, cy - size * 0.27, size * 0.16, size * 0.03, 0.5); ctx.restore();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.29, size * 0.034, size * 0.022, 0, 0, Math.PI * 2); ctx.fillStyle = hex(pink); ctx.fill(); stroke(size * 0.012);

  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.055; const ey = cy - size * 0.2; ctx.beginPath(); ctx.arc(ex, ey, size * 0.041, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.012); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.01, ey - size * 0.011, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
